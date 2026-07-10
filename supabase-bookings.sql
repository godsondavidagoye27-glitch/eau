-- ============================================
-- SUPABASE MIGRATION - Bookings Table
-- ============================================

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  service_id INTEGER,
  service_name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_system TEXT,
  transaction_id TEXT,
  user_email TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user email queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON public.bookings(user_email);

-- Create index for start date queries
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON public.bookings(start_date);

-- Create index for transaction ID (for verifying payments)
CREATE INDEX IF NOT EXISTS idx_bookings_transaction_id ON public.bookings(transaction_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email OR user_email IS NULL);

-- Create RLS policy: authenticated users can insert bookings
CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policy: admins can update bookings
CREATE POLICY "Admins can update bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.jwt() ->> 'app_role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'app_role' = 'admin');
