-- ================================================================
-- FLOW — Flavours on Wheels POS & Order Management Migration
-- File: supabase/migrations/001_flow_pos.sql
-- ================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MENU CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS menu_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,
  display_order INTEGER,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  price         NUMERIC(10, 2) NOT NULL,
  image_url     TEXT,
  display_order INTEGER,
  is_available  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS TABLE (Extending if table pre-existed)
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number    TEXT UNIQUE NOT NULL,
  customer_name   TEXT,
  customer_phone  TEXT,
  order_type      TEXT DEFAULT 'walk_in',
  status          TEXT DEFAULT 'pending',
  subtotal        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount        NUMERIC(10, 2) DEFAULT 0,
  total           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure required columns exist on orders table if it pre-existed
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'walk_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. ORDER ITEMS TABLE (Extending if table pre-existed)
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name     TEXT NOT NULL,
  unit_price    NUMERIC(10, 2) NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity >= 1),
  line_total    NUMERIC(10, 2) NOT NULL,
  item_status   TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'pending';

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);

-- 6. ORDER NUMBER SEQUENCE & RPC FUNCTION
CREATE SEQUENCE IF NOT EXISTS flow_order_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_flow_order_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INT;
BEGIN
  SELECT nextval('flow_order_number_seq') INTO seq_val;
  RETURN 'FLOW-' || LPAD(seq_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 7. DISABLE RLS OR ADD PERMISSIVE POLICIES FOR POS OPERATION
ALTER TABLE menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 8. SEED CATEGORIES & MENU ITEMS IDEMPOTENTLY
DO $$
DECLARE
  c_burgers UUID;
  c_fries UUID;
  c_momos UUID;
  c_chicken UUID;
  c_rolls UUID;
  c_veg_bites UUID;
  c_shawarma UUID;
  c_mojitos UUID;
  c_desserts UUID;
BEGIN
  -- Insert Categories
  INSERT INTO menu_categories (name, display_order) VALUES ('BURGERS', 1) ON CONFLICT (name) DO UPDATE SET display_order = 1 RETURNING id INTO c_burgers;
  INSERT INTO menu_categories (name, display_order) VALUES ('FRENCH FRIES', 2) ON CONFLICT (name) DO UPDATE SET display_order = 2 RETURNING id INTO c_fries;
  INSERT INTO menu_categories (name, display_order) VALUES ('MOMOS', 3) ON CONFLICT (name) DO UPDATE SET display_order = 3 RETURNING id INTO c_momos;
  INSERT INTO menu_categories (name, display_order) VALUES ('FRIED CHICKEN QUICK BITES', 4) ON CONFLICT (name) DO UPDATE SET display_order = 4 RETURNING id INTO c_chicken;
  INSERT INTO menu_categories (name, display_order) VALUES ('ROLLS N WRAPS', 5) ON CONFLICT (name) DO UPDATE SET display_order = 5 RETURNING id INTO c_rolls;
  INSERT INTO menu_categories (name, display_order) VALUES ('VEG QUICK BITES', 6) ON CONFLICT (name) DO UPDATE SET display_order = 6 RETURNING id INTO c_veg_bites;
  INSERT INTO menu_categories (name, display_order) VALUES ('SHAWARMAS', 7) ON CONFLICT (name) DO UPDATE SET display_order = 7 RETURNING id INTO c_shawarma;
  INSERT INTO menu_categories (name, display_order) VALUES ('MOJITOS', 8) ON CONFLICT (name) DO UPDATE SET display_order = 8 RETURNING id INTO c_mojitos;
  INSERT INTO menu_categories (name, display_order) VALUES ('DESSERTS', 9) ON CONFLICT (name) DO UPDATE SET display_order = 9 RETURNING id INTO c_desserts;

  -- Burgers
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_burgers, 'Classic Veg Burger', 120.00, 1),
  (c_burgers, 'Veg Cheese Burger', 150.00, 2),
  (c_burgers, 'Crispy Chicken Patty Burger', 150.00, 3),
  (c_burgers, 'Chicken Cheese Burger', 180.00, 4)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- French Fries
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_fries, 'Regular', 120.00, 1),
  (c_fries, 'Loaded Fries (Veg)', 150.00, 2),
  (c_fries, 'Loaded Fries (Chicken)', 200.00, 3)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Momos
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_momos, 'Veg Steamed Momos', 120.00, 1),
  (c_momos, 'Paneer Steamed Momos', 140.00, 2),
  (c_momos, 'Chicken Steamed Momos', 140.00, 3),
  (c_momos, 'Veg Fried Momos', 140.00, 4),
  (c_momos, 'Paneer Fried Momos', 160.00, 5),
  (c_momos, 'Chicken Fried Momos', 160.00, 6),
  (c_momos, 'Veg Kurkure Momos', 160.00, 7),
  (c_momos, 'Paneer Kurkure Momos', 180.00, 8),
  (c_momos, 'Chicken Kurkure Momos', 180.00, 9)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Fried Chicken Quick Bites
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_chicken, 'Chicken Popcorn (10 pcs)', 180.00, 1),
  (c_chicken, 'Chicken Crunchy Bites (10 pcs)', 180.00, 2),
  (c_chicken, 'Chicken Boneless Strips (5 pcs)', 180.00, 3),
  (c_chicken, 'Chicken Wings (4 pcs)', 180.00, 4),
  (c_chicken, 'Chicken Drumsticks (2 pcs)', 180.00, 5),
  (c_chicken, 'Chicken Nuggets (6 pcs)', 180.00, 6)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Rolls N Wraps
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_rolls, 'Veg Roll', 120.00, 1),
  (c_rolls, 'Paneer Grilled Roll', 150.00, 2),
  (c_rolls, 'Chicken Tikka Grilled Roll', 180.00, 3)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Veg Quick Bites
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_veg_bites, 'Veg Cheese Balls (6 pcs)', 150.00, 1),
  (c_veg_bites, 'Veg Cheese Nuggets (6 pcs)', 150.00, 2),
  (c_veg_bites, 'Veg Nuggets (10 pcs)', 150.00, 3),
  (c_veg_bites, 'Potato Smiles (10 pcs)', 150.00, 4)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Shawarmas
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_shawarma, 'Chicken Shawarma with Salad', 150.00, 1),
  (c_shawarma, 'Chicken Stuffed Flow Special Shawarma', 180.00, 2)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Mojitos
  INSERT INTO menu_items (category_id, name, price, display_order) VALUES
  (c_mojitos, 'Ocean Blue Mojito', 100.00, 1),
  (c_mojitos, 'Green Lemon & Mint Mojito', 100.00, 2),
  (c_mojitos, 'Virgin Mojito', 100.00, 3)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

  -- Desserts
  INSERT INTO menu_items (category_id, name, price, description, display_order) VALUES
  (c_desserts, 'Maska Bun', 100.00, NULL, 1),
  (c_desserts, 'Chocolate Donut', 80.00, NULL, 2),
  (c_desserts, 'Plain Donut', 50.00, NULL, 3),
  (c_desserts, 'Flow Special Cakes', 150.00, '(based on availability)', 4)
  ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, description = EXCLUDED.description;

END $$;
