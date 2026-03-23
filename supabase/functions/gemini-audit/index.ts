import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── GitHub recursive fetcher ────────────────────────────────
async function fetchRepoContent(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/ ?#]+)/);
  if (!match) return "Could not parse GitHub URL.";
  const owner = match[1];
  const repo = match[2].replace(".git", "");

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'Kyte-Auditor' }
    });
    if (!repoRes.ok) return `Failed to fetch repo info (${repoRes.status})`;
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Kyte-Auditor' } }
    );
    if (!treeRes.ok) return `Failed to fetch repo tree (${treeRes.status})`;

    const treeData = await treeRes.json();
    const relevantFiles = (treeData.tree || []).filter((f: any) =>
      f.type === 'blob' && (
        f.path.endsWith('.py') || f.path.endsWith('.teal') ||
        f.path.endsWith('.sol') || f.path.endsWith('.js') ||
        f.path.endsWith('.ts') || f.path.endsWith('.jsx') ||
        f.path.endsWith('.tsx')
      )
    ).slice(0, 20);

    if (relevantFiles.length === 0)
      return "No relevant source code files found in the repository.";

    let combinedCode = "";
    for (const file of relevantFiles) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
      const res = await fetch(rawUrl);
      if (res.ok) combinedCode += `\n--- File: ${file.path} ---\n${await res.text()}\n`;
    }
    return combinedCode || "Found files but could not fetch their contents.";
  } catch (e: any) {
    return `Error fetching repository: ${e.message}`;
  }
}

// ── JSON response helper ────────────────────────────────────
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Service-role client (full access, bypasses RLS for writes)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let payload: any;
    try { payload = await req.json(); }
    catch { return json({ error: "Invalid JSON payload." }, 400); }

    const { action, geminiApiKey, data } = payload;

    // ── Health check ──────────────────────────────────────────
    if (action === 'test') {
      return json({ status: "ok", message: "Edge function is reachable and working." });
    }

    // ── get_submissions — client fetches submissions for ONE project ──
    if (action === 'get_submissions') {
      const { projectId } = data || {};
      if (!projectId) return json({ error: "projectId is required." }, 400);

      const { data: subs, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return json(subs);
    }

    // ── get_my_submissions — developer fetches their own submissions ──
    if (action === 'get_my_submissions') {
      const { developerId } = data || {};
      if (!developerId) return json({ error: "developerId is required." }, 400);

      const { data: subs, error } = await supabase
        .from('submissions')
        .select('*, projects(id, title, status)')
        .eq('developer_id', developerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return json(subs);
    }

    // ── Everything below requires a Gemini API key ────────────
    if (!geminiApiKey) return json({ error: "geminiApiKey is required." }, 400);

    // ── create — client creates a new project ────────────────
    if (action === 'create') {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: data.title,
          description: data.description,
          requirements: data.requirements,
          payment_algo: data.payment_algo || 0,
          fiat_bounty_amount: data.fiat_bounty_amount || 0,
          score_threshold: data.score_threshold,
          wallet_address: data.wallet_address,
          owner_id: data.owner_id ?? null,
          app_id: data.app_id ?? null,
          status: 'OPEN',
          submission_count: 0,
          best_score: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return json(project);
    }

    // ── submit — developer submits work for AI audit ──────────
    if (action === 'submit') {
      const { projectId, githubUrl, developerId, developerEmail } = data || {};

      if (!projectId || !githubUrl) {
        return json({ error: "projectId and githubUrl are required." }, 400);
      }

      // Fetch project (requirements + threshold)
      const { data: project, error: fetchErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (fetchErr) throw fetchErr;

      // Mark as IN_REVIEW
      await supabase
        .from('projects')
        .update({ status: 'IN_REVIEW', github_url: githubUrl })
        .eq('id', projectId);

      // Choose Gemini model
      let modelName = "gemini-2.5-flash";
      if (geminiApiKey !== "dummy") {
        const modelsRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
        );
        const modelsData = await modelsRes.json();
        if (!modelsRes.ok) throw new Error(modelsData.error?.message || "Failed to list Gemini models.");
        const flash =
          modelsData.models?.find((m: any) => m.name.includes("gemini-2.5-flash")) ||
          modelsData.models?.find((m: any) => m.name.includes("gemini-1.5-flash")) ||
          modelsData.models?.[0];
        modelName = flash ? flash.name.split("/")[1] : "gemini-2.5-flash";
      }

      // Fetch repo source code
      const repoContent = await fetchRepoContent(githubUrl);
      const requirementsStr = (project.requirements || []).join("\n- ");

      // AI Evaluation
      let evaluationResult: any;

      if (geminiApiKey !== "dummy") {
        const prompt = `You are a professional code security auditor. Audit the following GitHub repository code against the requirements below.

REPOSITORY CODE:
${repoContent}

REQUIREMENTS TO CHECK:
- ${requirementsStr}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "overall_score": <number 0-100>,
  "results": [
    {
      "requirement": "<exact requirement text>",
      "met": <true|false>,
      "score": <number 0-100>,
      "reason": "<brief explanation>"
    }
  ],
  "gap_report": "<what is missing or should be improved>"
}

Include an entry in "results" for EVERY requirement listed above.`;

        const genRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        );
        const genData = await genRes.json();
        if (!genRes.ok) throw new Error(genData.error?.message || "Gemini generation failed.");

        const raw = genData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        try {
          evaluationResult = JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch {
          evaluationResult = {
            overall_score: 0,
            results: (project.requirements || []).map((r: string) => ({
              requirement: r, met: false, score: 0, reason: "Failed to parse AI output"
            })),
            gap_report: "AI output could not be parsed: " + raw
          };
        }
      } else {
        // Mock for testing
        evaluationResult = {
          overall_score: 95,
          results: (project.requirements || []).map((r: string) => ({
            requirement: r, met: true, score: 95, reason: "Mock pass for testing."
          })),
          gap_report: "This is a mock evaluation."
        };
      }

      const score: number = evaluationResult.overall_score ?? 0;
      const passed: boolean = score >= (project.score_threshold ?? 80);
      const finalStatus = passed ? 'COMPLETED' : 'IN_PROGRESS'; // keep IN_PROGRESS for revision if failed

      // ── Insert into submissions table ──────────────────────
      const { data: submission, error: subErr } = await supabase
        .from('submissions')
        .insert({
          project_id: projectId,
          developer_id: developerId ?? '00000000-0000-0000-0000-000000000000',
          developer_email: developerEmail ?? null,
          github_url: githubUrl,
          score,
          passed,
          evaluation_result: evaluationResult,
        })
        .select()
        .single();

      if (subErr) {
        console.error("Submissions insert error:", subErr);
        // Non-fatal — still update the project with results
      }

      // ── Update project with latest result + counters ───────
      const { data: updatedProject, error: updateErr } = await supabase
        .from('projects')
        .update({
          status: finalStatus,
          payment_status: passed ? 'RELEASED_TO_DEV' : project.payment_status,
          evaluation_result: evaluationResult,
          github_url: githubUrl,
          developer_id: developerId ?? null,
          developer_email: developerEmail ?? null,
          submission_count: (project.submission_count ?? 0) + 1,
          best_score: Math.max(project.best_score ?? 0, score),
        })
        .eq('id', projectId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // ── Fire Email Notification if Passed ──────────────────
      if (passed) {
        supabase.functions.invoke('send-email', { body: {
          action: "audit_passed",
          payload: { 
            clientId: project.owner_id, 
            developerId: developerId,
            projectTitle: project.title,
            score
          }
        }});
      }

      return json({
        project: updatedProject,
        submission: submission ?? null,
        evaluation_result: evaluationResult,
        score,
        passed,
      });
    }

    return json({ error: "Invalid action." }, 400);

  } catch (err: any) {
    console.error('Edge Function Error:', err.message, err.stack);
    return json({ error: err.message || 'Internal Server Error' });
  }
});
