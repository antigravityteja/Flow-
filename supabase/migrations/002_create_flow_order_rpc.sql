-- ================================================================
-- FLOW — Flavours on Wheels Transactional RPC & Sequence Migration
-- File: supabase/migrations/002_create_flow_order_rpc.sql
-- ================================================================

-- 1. SEQUENCE FOR ATOMIC ORDER NUMBERS
CREATE SEQUENCE IF NOT EXISTS flow_order_number_seq START WITH 1 INCREMENT BY 1;

-- Sync sequence with highest existing order number
DO $$
DECLARE
  max_seq INT;
BEGIN
  SELECT MAX(NULLIF(regexp_replace(order_number, '\D', '', 'g'), '')::INT)
  INTO max_seq
  FROM orders
  WHERE order_number LIKE 'FLOW-%';

  IF max_seq IS NOT NULL AND max_seq > 0 THEN
    PERFORM setval('flow_order_number_seq', max_seq);
  END IF;
END $$;

-- 2. DATA REPAIR SCRIPT (Fix duplicate order numbers if any exist)
DO $$
DECLARE
  rec RECORD;
  new_num TEXT;
  seq_counter INT;
BEGIN
  FOR rec IN 
    SELECT id, order_number, created_at,
           ROW_NUMBER() OVER (PARTITION BY order_number ORDER BY created_at ASC) as rn
    FROM orders
  LOOP
    IF rec.rn > 1 THEN
      SELECT nextval('flow_order_number_seq') INTO seq_counter;
      new_num := 'FLOW-' || LPAD(seq_counter::TEXT, 3, '0');
      UPDATE orders SET order_number = new_num WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- Ensure UNIQUE constraint on order_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

-- 3. ATOMIC TRANSACTIONAL RPC FUNCTION FOR ORDER CREATION
CREATE OR REPLACE FUNCTION create_flow_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_order_type TEXT,
  p_discount NUMERIC,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_seq_val INT;
  v_order_number TEXT;
  v_order_id UUID;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_item_name TEXT;
  v_unit_price NUMERIC;
  v_quantity INT;
  v_line_total NUMERIC;
  v_menu_item_id UUID;
  v_created_at TIMESTAMPTZ := NOW();
  v_result JSONB;
BEGIN
  -- Validate items input
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart items cannot be empty';
  END IF;

  -- Atomic increment of sequence
  SELECT nextval('flow_order_number_seq') INTO v_seq_val;
  v_order_number := 'FLOW-' || LPAD(v_seq_val::TEXT, 3, '0');

  -- Calculate subtotal & total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_unit_price := (v_item->>'price')::NUMERIC;
    v_quantity := (v_item->>'quantity')::INT;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  v_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));

  -- Insert order atomically
  INSERT INTO orders (
    order_number,
    customer_name,
    customer_phone,
    order_type,
    status,
    subtotal,
    discount,
    total,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    v_order_number,
    COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Walk-in Customer'),
    NULLIF(TRIM(p_customer_phone), ''),
    COALESCE(p_order_type, 'walk_in'),
    'pending',
    v_subtotal,
    COALESCE(p_discount, 0),
    v_total,
    NULLIF(TRIM(p_notes), ''),
    v_created_at,
    v_created_at
  )
  RETURNING id INTO v_order_id;

  -- Insert order items atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_name := v_item->>'name';
    v_unit_price := (v_item->>'price')::NUMERIC;
    v_quantity := (v_item->>'quantity')::INT;
    v_line_total := v_unit_price * v_quantity;
    v_menu_item_id := NULL;
    
    IF v_item->>'id' IS NOT NULL AND (v_item->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_menu_item_id := (v_item->>'id')::UUID;
    END IF;

    INSERT INTO order_items (
      order_id,
      menu_item_id,
      item_name,
      unit_price,
      quantity,
      line_total,
      item_status,
      created_at
    )
    VALUES (
      v_order_id,
      v_menu_item_id,
      v_item_name,
      v_unit_price,
      v_quantity,
      v_line_total,
      'pending',
      v_created_at
    );
  END LOOP;

  -- Return complete created order JSONB response
  SELECT jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'order_type', o.order_type,
    'status', o.status,
    'subtotal', o.subtotal,
    'discount', o.discount,
    'total', o.total,
    'notes', o.notes,
    'created_at', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'order_id', oi.order_id,
        'menu_item_id', oi.menu_item_id,
        'item_name', oi.item_name,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'line_total', oi.line_total,
        'item_status', oi.item_status,
        'created_at', oi.created_at
      ))
      FROM order_items oi
      WHERE oi.order_id = v_order_id
    ), '[]'::JSONB)
  ) INTO v_result
  FROM orders o
  WHERE o.id = v_order_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 4. GRANT PERMISSIONS FOR RPC & TABLES
GRANT EXECUTE ON FUNCTION create_flow_order TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE flow_order_number_seq TO anon, authenticated, service_role;
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;
GRANT ALL ON TABLE order_items TO anon, authenticated, service_role;

