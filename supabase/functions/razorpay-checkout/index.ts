import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import crypto from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload: any;
    try { payload = await req.json(); } catch { return json({ error: "Invalid JSON payload" }, 400); }

    const { action, bidId, paymentId, orderId, signature } = payload;
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return json({ error: "Razorpay keys are not configured in edge function secrets." }, 500);
    }

    // ── CREATE ORDER ──────────────────────────────────────────
    if (action === 'create_order') {
      if (!bidId) return json({ error: "bidId is required." }, 400);

      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select(`
          *,
          project:project_id ( id, owner_id )
        `)
        .eq('id', bidId)
        .single();
        
      if (bidError || !bid) return json({ error: "Bid not found." }, 404);

      const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      
      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(Number(bid.bid_amount) * 100), // USD cents (or INR paise)
          currency: "USD",
          receipt: `kyte_bid_${bid.id}`
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error?.description || "Failed to create Razorpay Order");

      // Save order ID to the project for tracking
      await supabase.from('projects')
        .update({ razorpay_order_id: orderData.id })
        .eq('id', bid.project_id);

      return json({ 
        order_id: orderData.id, 
        amount: orderData.amount, 
        currency: orderData.currency, 
        key: razorpayKeyId 
      });
    }

    // ── VERIFY PAYMENT ──────────────────────────────────────────
    if (action === 'verify_payment') {
      if (!bidId || !paymentId || !orderId || !signature) {
        return json({ error: "Missing verification parameters." }, 400);
      }

      // 1. Verify HMAC Signature
      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expectedSignature !== signature) {
        return json({ error: "Invalid payment signature." }, 400);
      }

      // 2. Fetch the bid details
      const { data: bid, error: bidError } = await supabase
        .from('bids').select('*').eq('id', bidId).single();
      if (bidError || !bid) return json({ error: "Bid not found." }, 404);

      // 3. Mark Bid as ACCEPTED
      await supabase.from('bids').update({ status: 'ACCEPTED' }).eq('id', bidId);

      // 4. Update the Project to IN_PROGRESS, lock funds & assign developer
      await supabase.from('projects').update({
        status: 'IN_PROGRESS',
        developer_id: bid.developer_id,
        fiat_bounty_amount: bid.bid_amount,
        payment_status: 'LOCKED_IN_ESCROW',
        razorpay_payment_id: paymentId
      }).eq('id', bid.project_id);
      
      // 5. Trigger Email Notification
      const { data: proj } = await supabase.from('projects').select('title').eq('id', bid.project_id).single();
      if (proj) {
        supabase.functions.invoke('send-email', { body: {
          action: "bid_accepted",
          payload: { developerId: bid.developer_id, projectTitle: proj.title, bidAmount: bid.bid_amount }
        }});
      }

      return json({ success: true, message: "Escrow Locked!" });
    }

    return json({ error: "Invalid action." }, 400);
  } catch (error: any) {
    return json({ error: error.message }, 500);
  }
});
