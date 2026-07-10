// Simple Node script to fetch bookings from Supabase REST API
// Usage: SUPABASE_URL=... SUPABASE_KEY=... node scripts/test-fetch-bookings.js user@example.com

const email = process.argv[2];
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_API_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!email) {
  console.error('Usage: node scripts/test-fetch-bookings.js user@example.com');
  process.exit(2);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required.');
  console.error('Set them like:');
  console.error('  set SUPABASE_URL=your_supabase_url');
  console.error('  set SUPABASE_KEY=your_anon_or_service_key');
  process.exit(3);
}

(async () => {
  try {
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/bookings?user_email=eq.${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Request failed:', res.status, res.statusText, text);
      process.exit(4);
    }

    const data = await res.json();
    console.log('Fetched bookings:', data.length);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message || err);
    process.exit(5);
  }
})();
