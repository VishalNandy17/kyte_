import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  // We'll fetch all bids first to get a valid project ID
  const { data: allBids, error: bidsErr } = await supabase.from("bids").select("project_id").limit(1);
  if (bidsErr) {
      console.error("COULD NOT FETCH ANY BIDS:", bidsErr);
      return;
  }
  if (!allBids || allBids.length === 0) {
      console.log("NO BIDS FOUND IN DATABASE.");
      return;
  }
  
  const projectId = allBids[0].project_id;
  console.log("Testing query for project:", projectId);
  
  // Test the problematic query
  const { data, error } = await supabase
    .from("bids")
    .select(`
      *,
      developer:developer_id (
        display_name,
        wallet_address
      )
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("QUERY ERROR:", error);
  } else {
    console.log("DATA LENGTH:", data.length);
    console.log("DATA SAMPLE:", JSON.stringify(data[0], null, 2));
  }
}

testQuery();
