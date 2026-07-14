// ============================================
// SUPABASE EDGE FUNCTION - PayPal Booking Updates
// Deploy to: supabase/functions/payments/index.ts
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

// The storefront uses PayPal redirects for all bookings and orders.
// Legacy Stripe/Flutterwave helpers are intentionally disabled.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (path === '/functions/v1/payments/webhook' && req.method === 'POST') {
    try {
      const body = await req.json();
      const paymentStatus = body?.status || body?.paymentStatus || body?.event || null;
      const bookingId = body?.bookingId || body?.booking_id || null;

      if (bookingId && ['paid', 'confirmed', 'success', 'successful'].includes(String(paymentStatus || '').toLowerCase())) {
        await supabase.from('bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', bookingId);
      }
    } catch (err) {
      console.error('PayPal webhook processing error', err);
    }

    return new Response(JSON.stringify({ success: true, message: 'PayPal-only webhook handled.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
});
