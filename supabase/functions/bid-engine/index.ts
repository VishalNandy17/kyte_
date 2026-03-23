import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, data } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "test") {
      return new Response(JSON.stringify({ status: "ok", message: "Bid engine is reachable" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === "submit_bid") {
      const { projectId, developerId, bidAmount, proposalText } = data;

      // 1. Record the bid
      const { data: bid, error: bidErr } = await supabase
        .from("bids")
        .insert({
          project_id: projectId,
          developer_id: developerId,
          bid_amount: parseFloat(bidAmount),
          proposal_text: proposalText,
          status: 'PENDING'
        })
        .select(`
          *,
          projects:project_id (title, owner_id)
        `)
        .single();

      if (bidErr) {
        console.error("Bid recording failed:", bidErr);
        throw bidErr;
      }

      // 2. Fetch Client Email (optional, or let send-email handle it by ID)
      // 3. Trigger notification via send-email function
      try {
        const projectData = bid.projects || bid.project; // Compatibility with both join syntaxes
        await supabase.functions.invoke("send-email", {
          body: {
            action: "bid_received",
            payload: {
              clientId: projectData.owner_id,
              developerId: developerId,
              projectTitle: projectData.title,
              bidAmount: bidAmount
            }
          }
        });
      } catch (emailErr) {
        console.warn("Notification trigger failed, but bid was recorded:", emailErr);
      }

      return new Response(JSON.stringify(bid), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
