// ============================================
// SUPABASE EDGE FUNCTION - Payment Processing
// Deploy to: supabase/functions/payments/index.ts
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

// For Flutterwave we provide minimal server-side helpers:
// - /functions/v1/payments/verify : verify a transaction_id with Flutterwave
// The previous Stripe PaymentIntent endpoints are intentionally deprecated.

async function handleVerify(req) {
  try {
    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'transaction_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const FLW_SECRET = Deno.env.get('FLW_SECRET_KEY') || Deno.env.get('VITE_FLW_SECRET_KEY');
    if (!FLW_SECRET) {
      return new Response(JSON.stringify({ error: 'FLW_SECRET_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transaction_id)}/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FLW_SECRET}`
      }
    });

    if (!verifyRes.ok) {
      const text = await verifyRes.text();
      return new Response(JSON.stringify({ error: 'Verification failed', details: text }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = await verifyRes.json();

    // If verification is successful and transaction is successful, update order
    try {
      const tx = payload.data;
      // tx.meta or tx.tx_ref may contain orderId depending on how the client set tx_ref.
      const tx_ref = tx.tx_ref || null;
      // attempt to extract order id from tx_ref if it contains 'order-<id>'
      let orderId = null;
      if (tx_ref) {
        const m = tx_ref.match(/order-(\d+)/);
        if (m) orderId = parseInt(m[1], 10);
      }

      if (tx.status === 'successful' && orderId) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'paid', payment_id: tx.id, paid_at: new Date().toISOString(), payment_method: 'flutterwave' })
          .eq('id', orderId);

        if (error) console.error('Error updating order after verification:', error);
      }

    } catch (err) {
      console.error('Error updating order during verification:', err);
    }

    return new Response(JSON.stringify({ success: true, data: payload.data }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Route requests
  if (path === '/functions/v1/payments/create-intent' && req.method === 'POST') {
    return handlePaymentIntent(req);
  }

  if (path === '/functions/v1/payments/setup-intent' && req.method === 'POST') {
    return handleSetupIntent(req);
  }

  if (path === '/functions/v1/payments/webhook' && req.method === 'POST') {
    return handleWebhook(req);
  }

  return new Response('Not Found', { status: 404 });
});
