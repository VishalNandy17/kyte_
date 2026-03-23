// Terminal test script for bid-engine Edge Function verification
async function test() {
  const supabaseUrl = "https://ugesrwzveiybyoidimvo.supabase.co";
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZXNyd3p2ZWl5YnlvaWRpbXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzMxNjIsImV4cCI6MjA4OTY0OTE2Mn0.5r1ECxh6nQwf5UQ9gyk0kmgnhOUwIcPyz1KlTPIL5K0";

  // Test 1: Health check
  const health = await fetch(`${supabaseUrl}/functions/v1/bid-engine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey
    },
    body: JSON.stringify({ action: 'test' })
  });
  console.log("=== Health Check ===");
  console.log("Status:", health.status);
  console.log("Response:", await health.text());
}

test();
