-- ============================================
-- SUPABASE DATABASE SCHEMA
-- Execute in: SQL Editor at https://app.supabase.com
-- ============================================

-- ENABLE RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE public.products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  image TEXT,
  button_text TEXT DEFAULT 'ADD TO CART',
  stock INT DEFAULT 999,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to view products"
  ON public.products FOR SELECT
  USING (active = TRUE);

-- ============================================
-- CART ITEMS TABLE
-- ============================================
CREATE TABLE public.cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image TEXT,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cart"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own cart"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own cart"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, confirmed, paid, shipped, delivered, failed
  payment_method TEXT, -- stripe, paypal, etc
  payment_id TEXT,
  
  -- Customer Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Shipping Address
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT DEFAULT 'United States',
  
  -- Order Items (JSON)
  items JSONB NOT NULL,
  
  -- Calculations
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  shipping DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  
  -- Metadata
  notes TEXT,
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  carrier TEXT,
  tracking_number TEXT,
  tracking_status TEXT,
  tracking_history JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'email' IN ('admin@eaudeplay.com')
  );

-- ============================================
-- PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE public.payment_methods (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT,
  card_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment methods"
  ON public.payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create payment methods"
  ON public.payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their payment methods"
  ON public.payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- USERS PROFILE TABLE
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- MESSAGES TABLE (Contact Form)
-- ============================================
CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- new, read, resolved
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anyone to submit messages"
  ON public.messages FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'email' IN ('admin@eaudeplay.com')
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_cart_user ON public.cart_items(user_id);
CREATE INDEX idx_cart_product ON public.cart_items(product_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at);
CREATE INDEX idx_payment_methods_user ON public.payment_methods(user_id);
CREATE INDEX idx_messages_email ON public.messages(email);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- ============================================
-- SAMPLE DATA
-- ============================================
INSERT INTO public.products (name, description, price, category, button_text) VALUES
('Premium DJ Services', 'Professional DJ services for events', 500.00, 'service', 'BOOK'),
('Photography & Videography', 'Professional photography and videography packages', 800.00, 'service', 'BOOK'),
('Event Planning', 'Complete event planning and coordination', 1200.00, 'service', 'BOOK'),
('Sports Solutions', 'Sports event management and coverage', 600.00, 'service', 'BOOK'),
('Eau de Kack T-Shirt', 'Premium cotton t-shirt with logo', 25.00, 'merchandise', 'ADD TO CART'),
('Eau de Kack Hat', 'Classic baseball cap with embroidered logo', 35.00, 'merchandise', 'ADD TO CART'),
('Eau de Kack Hoodie', 'Comfortable hoodie with front and back print', 65.00, 'merchandise', 'ADD TO CART');

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Create via Supabase Console:
-- 1. Storage → New Bucket → "products" (Public)
-- 2. Storage → New Bucket → "avatars" (Public)
-- 3. Storage → New Bucket → "orders" (Private)

-- ============================================
-- END OF SCHEMA
-- ============================================
