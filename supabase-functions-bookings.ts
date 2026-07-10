// ============================================
// SUPABASE EDGE FUNCTION - Bookings Management
// Deploy to: supabase/functions/bookings/index.ts
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/bookings?id=<bookingId> - Fetch single booking
// GET /api/bookings?userEmail=<email> - Fetch all bookings for user
async function handleGetBooking(req) {
  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get('id');
    const userEmail = url.searchParams.get('userEmail');

    if (bookingId) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, booking: data }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (userEmail) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_email', userEmail)
        .order('start_date', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, bookings: data || [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Missing id or userEmail parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/bookings - Create new booking
async function handleCreateBooking(req) {
  try {
    const payload = await req.json();
    const { serviceId, serviceName, where, start, total, payment, userEmail } = payload;

    if (!serviceName || !where || !start || !total || !payment) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify payment was successful if Flutterwave
    if (payment.system === 'flutterwave' && payment.transaction_id) {
      const FLW_SECRET = Deno.env.get('FLW_SECRET_KEY') || Deno.env.get('VITE_FLW_SECRET_KEY');
      if (!FLW_SECRET) {
        return new Response(JSON.stringify({ error: 'Payment verification not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const verifyRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(payment.transaction_id)}/verify`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FLW_SECRET}`,
          },
        }
      );

      if (!verifyRes.ok) {
        return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const verification = await verifyRes.json();
      if (!verification.data || verification.data.status !== 'successful') {
        return new Response(JSON.stringify({ error: 'Payment not successful' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Create booking in database
    const bookingId = `bk-${Date.now()}`;
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          id: bookingId,
          service_id: serviceId || null,
          service_name: serviceName,
          location: where,
          start_date: start,
          total: parseFloat(total),
          payment_system: payment.system,
          transaction_id: payment.transaction_id || null,
          user_email: userEmail || null,
          status: 'confirmed',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, booking: data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Route requests
  if (path.includes('/functions/v1/bookings') || path.includes('/api/bookings')) {
    if (req.method === 'GET') {
      return handleGetBooking(req);
    }
    if (req.method === 'POST') {
      return handleCreateBooking(req);
    }
  }

  return new Response('Not found', { status: 404 });
});
