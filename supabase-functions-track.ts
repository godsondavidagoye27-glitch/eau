// Supabase Edge Function (Deno) - Track Order
// Deploy this as an Edge Function. It accepts POST { orderId } and will attempt
// to fetch tracking status from a configured provider and update the `orders` table.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TRACKING_PROVIDER = Deno.env.get('TRACKING_PROVIDER') || 'aftership';
const AFTERSHIP_API_KEY = Deno.env.get('AFTERSHIP_API_KEY');
const SHIPENGINE_API_KEY = Deno.env.get('SHIPENGINE_API_KEY');

async function updateOrderTracking(orderId, updates) {
  const url = `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updates)
  });
  return res.json();
}

async function fetchTrackingFromAfterShip(carrier, trackingNumber) {
  // AfterShip response parser — maps to common shape { status, checkpoints[] }
  // API docs: https://developers.aftership.com/
  const slug = carrier ? carrier.toLowerCase() : 'generic';
  const url = `https://api.aftership.com/v4/trackings/${slug}/${trackingNumber}`;
  const res = await fetch(url, { headers: { 'aftership-api-key': AFTERSHIP_API_KEY, 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('AfterShip lookup failed: ' + txt);
  }
  const body = await res.json();
  const tracking = body?.data?.tracking || null;
  const status = tracking?.tag || tracking?.checkpoint_status || 'unknown';
  const checkpoints = (tracking?.checkpoints || []).map(cp => ({
    location: (cp?.location && (cp.location.city || cp.location.country_name)) || cp.location || '',
    status: cp?.tag || cp?.checkpoint_status || cp?.status || '',
    created_at: cp?.checkpoint_time || cp?.created_at || cp?.created_at || '',
    message: cp?.message || cp?.details || ''
  }));

  return { status, checkpoints };
}

async function fetchTrackingFromShipEngine(carrierCode, trackingNumber) {
  // ShipEngine API parsing
  const url = `https://api.shipengine.com/v1/tracking?carrier_code=${encodeURIComponent(carrierCode)}&tracking_number=${encodeURIComponent(trackingNumber)}`;
  const res = await fetch(url, { headers: { 'API-Key': SHIPENGINE_API_KEY, 'Content-Type': 'application/json' } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('ShipEngine lookup failed: ' + txt);
  }
  const data = await res.json();
  // ShipEngine returns tracking_status and events
  const status = data?.status_code || data?.tracking_status?.status || 'unknown';
  const events = data?.events || [];
  const checkpoints = events.map(ev => ({
    location: (ev?.location && (ev.location.city || ev.location.country_name)) || ev?.location || '',
    status: ev?.status || ev?.description || '',
    created_at: ev?.occurred_at || ev?.timestamp || '',
    message: ev?.description || ''
  }));

  return { status, checkpoints };
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await req.json();
    const { orderId, carrier, tracking_number } = body;
    if (!orderId) return new Response('orderId required', { status: 400 });

    let trackingResult = { status: 'unknown', checkpoints: [] };
    if (TRACKING_PROVIDER === 'shipengine' && SHIPENGINE_API_KEY && carrier && tracking_number) {
      trackingResult = await fetchTrackingFromShipEngine(carrier, tracking_number);
    } else if (AFTERSHIP_API_KEY && carrier && tracking_number) {
      trackingResult = await fetchTrackingFromAfterShip(carrier, tracking_number);
    } else {
      // No external provider configured; return basic status
      trackingResult = { status: 'shipped', checkpoints: [] };
    }

    // Update orders table with latest status and tracking_history
    const updates = {
      tracking_status: trackingResult.status,
      tracking_history: trackingResult.checkpoints,
      updated_at: new Date().toISOString()
    };

    await updateOrderTracking(orderId, updates);

    return new Response(JSON.stringify({ success: true, tracking: trackingResult }), { status: 200 });
  } catch (err) {
    console.error('Tracking function error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
