const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const projectId = "9812309b-434e-4edc-8baa-1c4d4dbab441"; // Use a real project ID if known, or just check the schema response
  
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
