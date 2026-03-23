import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ugesrwzveiybyoidimvo.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZXNyd3p2ZWl5YnlvaWRpbXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzMxNjIsImV4cCI6MjA4OTY0OTE2Mn0.5r1ECxh6nQwf5UQ9gyk0kmgnhOUwIcPyz1KlTPIL5K0";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log("Fetching bids...");
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
