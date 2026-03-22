import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();
    const resendKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendKey) {
      console.warn("No RESEND_API_KEY configured. Skipping email dispatch.");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const getEmail = async (id?: string) => {
      if (!id) return null;
      const { data } = await supabase.auth.admin.getUserById(id);
      return data?.user?.email;
    };

    let subject = "";
    let html = "";
    let toArray: string[] = [];
    
    switch (action) {
      case "bid_received":
        const clientMail = payload.clientEmail || await getEmail(payload.clientId);
        if (!clientMail) throw new Error("client missing");
        toArray = [clientMail];
        subject = "New Bid on your KYTE Project!";
        html = `<h2>You received a bid!</h2>
                <p>Developer <b>${payload.developerId || 'Anonymous'}</b> offered to build <b>${payload.projectTitle}</b> for $${payload.bidAmount} USD.</p>
                <p>Log in to your Client Dashboard to review and accept the bid.</p>`;
        break;
        
      case "bid_accepted":
        const devMail = payload.developerEmail || await getEmail(payload.developerId);
        if (!devMail) throw new Error("developer missing");
        toArray = [devMail];
        subject = "Your KYTE Bid was Accepted!";
        html = `<h2>Congratulations!</h2>
                <p>Your bid for <b>${payload.projectTitle}</b> was accepted.</p>
                <p>The client has locked $${payload.bidAmount} USD in Escrow. You can now start coding and submit your work!</p>`;
        break;
        
      case "audit_passed":
        const cMail = payload.clientEmail || await getEmail(payload.clientId);
        const dMail = payload.developerEmail || await getEmail(payload.developerId);
        
        if (!cMail && !dMail) throw new Error("No emails provided");
        if (cMail) toArray.push(cMail);
        if (dMail) toArray.push(dMail);
        
        subject = "AI Audit Passed & Funds Released!";
        html = `<h2>Audit Success! 🎉</h2>
                <p>The code submission for <b>${payload.projectTitle}</b> has <strong>PASSED</strong> the AI Audit with a score of ${payload.score}/100.</p>
                <p>The funds locked in Escrow have been marked for release to the developer.</p>`;
        break;
        
      default:
        return new Response(JSON.stringify({ error: "Invalid email action" }), { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'KYTE Platform <onboarding@resend.dev>', // Resend test sender
        to: toArray,
        subject,
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API Error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
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
