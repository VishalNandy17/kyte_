import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { repoUrl, branch = 'main', githubHandles = [] } = await req.json();

    if (!repoUrl) {
      throw new Error("repoUrl is required");
    }

    // Parse https://github.com/Owner/Repo
    let owner = "";
    let repo = "";
    try {
      const parts = repoUrl.replace(/\/$/, '').split('/');
      repo = parts.pop()!;
      owner = parts.pop()!;
    } catch {
      throw new Error("Invalid GitHub URL format");
    }

    // GitHub API requires User-Agent
    const headers = { 'User-Agent': 'Kyte-Analytics-Edge-Function' };

    // Fetch commits
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=100`, { headers });
    
    if (!commitsRes.ok) {
        throw new Error(`GitHub API Error: ${commitsRes.statusText}`);
    }

    const commitsData = await commitsRes.json();
    
    // Process commits
    const processedCommits = commitsData.map((c: any) => {
        const authorLogin = c.author?.login || c.commit.author.name;
        return {
            sha: c.sha.substring(0, 7),
            message: c.commit.message,
            author: authorLogin,
            date: c.commit.author.date,
            url: c.html_url
        }
    });

    // Optionally filter by the handles provided if it's not empty
    const filteredCommits = githubHandles.length > 0 
        ? processedCommits.filter((c: any) => githubHandles.includes(c.author))
        : processedCommits;

    return new Response(JSON.stringify({ success: true, commits: filteredCommits }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
