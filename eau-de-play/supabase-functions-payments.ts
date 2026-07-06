// ============================================
// SUPABASE EDGE FUNCTION - Payment Processing
// Deploy to: supabase/functions/payments/index.ts
// ============================================

import Stripe from 'https://esm.sh/stripe@14.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function handlePaymentIntent(req) {
  const { amount, metadata } = await req.json();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSetupIntent(req) {
  const { metadata } = await req.json();

  try {
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      metadata,
    });

    return new Response(
      JSON.stringify({ clientSecret: setupIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleWebhook(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Handle payment intent succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    // Update order in Supabase
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) console.error('Error updating order:', error);
  }

  // Handle payment intent failed
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    // Update order in Supabase
    await supabase
      .from('orders')
      .update({
        status: 'failed',
        payment_id: paymentIntent.id,
      })
      .eq('id', orderId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
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
