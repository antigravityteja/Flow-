import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env first, fallback to Radeon backend .env if local is missing
const localEnvPath = path.join(__dirname, '.env');
const radeonEnvPath = 'D:/Radeon/backend/.env';

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(radeonEnvPath)) {
  dotenv.config({ path: radeonEnvPath });
} else {
  dotenv.config();
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Full default FLOW menu dataset matching official menu image
const MENU_DATA = [
  {
    name: 'BURGERS',
    display_order: 1,
    items: [
      { name: 'Classic Veg Burger', price: 120, description: null },
      { name: 'Veg Cheese Burger', price: 150, description: null },
      { name: 'Crispy Chicken Patty Burger', price: 150, description: null },
      { name: 'Chicken Cheese Burger', price: 180, description: null }
    ]
  },
  {
    name: 'FRENCH FRIES',
    display_order: 2,
    items: [
      { name: 'Regular', price: 120, description: null },
      { name: 'Loaded Fries (Veg)', price: 150, description: null },
      { name: 'Loaded Fries (Chicken)', price: 200, description: null }
    ]
  },
  {
    name: 'MOMOS',
    display_order: 3,
    items: [
      { name: 'Veg Steamed Momos', price: 120, description: null },
      { name: 'Paneer Steamed Momos', price: 140, description: null },
      { name: 'Chicken Steamed Momos', price: 140, description: null },
      { name: 'Veg Fried Momos', price: 140, description: null },
      { name: 'Paneer Fried Momos', price: 160, description: null },
      { name: 'Chicken Fried Momos', price: 160, description: null },
      { name: 'Veg Kurkure Momos', price: 160, description: null },
      { name: 'Paneer Kurkure Momos', price: 180, description: null },
      { name: 'Chicken Kurkure Momos', price: 180, description: null }
    ]
  },
  {
    name: 'FRIED CHICKEN QUICK BITES',
    display_order: 4,
    items: [
      { name: 'Chicken Popcorn (10 pcs)', price: 180, description: null },
      { name: 'Chicken Crunchy Bites (10 pcs)', price: 180, description: null },
      { name: 'Chicken Boneless Strips (5 pcs)', price: 180, description: null },
      { name: 'Chicken Wings (4 pcs)', price: 180, description: null },
      { name: 'Chicken Drumsticks (2 pcs)', price: 180, description: null },
      { name: 'Chicken Nuggets (6 pcs)', price: 180, description: null }
    ]
  },
  {
    name: 'ROLLS N WRAPS',
    display_order: 5,
    items: [
      { name: 'Veg Roll', price: 120, description: null },
      { name: 'Paneer Grilled Roll', price: 150, description: null },
      { name: 'Chicken Tikka Grilled Roll', price: 180, description: null }
    ]
  },
  {
    name: 'VEG QUICK BITES',
    display_order: 6,
    items: [
      { name: 'Veg Cheese Balls (6 pcs)', price: 150, description: null },
      { name: 'Veg Cheese Nuggets (6 pcs)', price: 150, description: null },
      { name: 'Veg Nuggets (10 pcs)', price: 150, description: null },
      { name: 'Potato Smiles (10 pcs)', price: 150, description: null }
    ]
  },
  {
    name: 'SHAWARMAS',
    display_order: 7,
    items: [
      { name: 'Chicken Shawarma with Salad', price: 150, description: null },
      { name: 'Chicken Stuffed Flow Special Shawarma', price: 180, description: null }
    ]
  },
  {
    name: 'MOJITOS',
    display_order: 8,
    items: [
      { name: 'Ocean Blue Mojito', price: 100, description: null },
      { name: 'Green Lemon & Mint Mojito', price: 100, description: null },
      { name: 'Virgin Mojito', price: 100, description: null }
    ]
  },
  {
    name: 'DESSERTS',
    display_order: 9,
    items: [
      { name: 'Maska Bun', price: 100, description: null },
      { name: 'Chocolate Donut', price: 80, description: null },
      { name: 'Plain Donut', price: 50, description: null },
      { name: 'Flow Special Cakes', price: 150, description: '(based on availability)' }
    ]
  }
];

// Helper: Dynamically generate next unique order number from DB or memory
async function generateNextOrderNumber() {
  if (supabase) {
    try {
      const { data: latest } = await supabase
        .from('orders')
        .select('order_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (latest && latest.length > 0 && latest[0].order_number) {
        const parts = latest[0].order_number.split('-');
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          return `FLOW-${String(lastNum + 1).padStart(3, '0')}`;
        }
      }

      // Fallback count check
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const nextNum = (count || 0) + 1;
      return `FLOW-${String(nextNum).padStart(3, '0')}`;
    } catch (e) {
      console.warn('Error fetching order count:', e.message);
    }
  }
  return `FLOW-${String(Date.now()).slice(-3)}`;
}

// Endpoint: Safe config for frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });
});

// Endpoint: Menu items
app.get('/api/menu', async (req, res) => {
  if (!supabase) {
    return res.json({ categories: MENU_DATA });
  }

  try {
    const { data: catData, error: catErr } = await supabase
      .from('menu_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (catErr || !catData || catData.length === 0) {
      return res.json({ categories: MENU_DATA });
    }

    const { data: itemData, error: itemErr } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('display_order', { ascending: true });

    if (itemErr || !itemData) {
      return res.json({ categories: MENU_DATA });
    }

    const grouped = catData.map(c => ({
      id: c.id,
      name: c.name,
      display_order: c.display_order,
      items: itemData
        .filter(i => i.category_id === c.id)
        .map(i => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          description: i.description
        }))
    }));

    res.json({ categories: grouped });
  } catch (err) {
    res.json({ categories: MENU_DATA });
  }
});

// Endpoint: Get existing orders
app.get('/api/orders', async (req, res) => {
  if (!supabase) {
    return res.json({ orders: [] });
  }

  try {
    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (oErr) {
      return res.status(500).json({ error: oErr.message });
    }

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Create Order
app.post('/api/orders', async (req, res) => {
  const { customer_name, customer_phone, order_type, items, discount = 0, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty' });
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const total = Math.max(0, subtotal - Number(discount));

  // Generate unique incrementing order number
  const order_number = await generateNextOrderNumber();

  const orderPayload = {
    order_number,
    customer_name: customer_name || 'Walk-in Customer',
    customer_phone: customer_phone || null,
    order_type: order_type || 'walk_in',
    status: 'pending',
    subtotal,
    discount: Number(discount),
    total,
    notes: notes || null,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      // Insert into orders table
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (!orderErr && newOrder) {
        const orderItemsPayload = items.map(item => ({
          order_id: newOrder.id,
          menu_item_id: item.id || null,
          item_name: item.name,
          unit_price: Number(item.price),
          quantity: Number(item.quantity),
          line_total: Number(item.price) * Number(item.quantity),
          item_status: 'pending'
        }));

        await supabase.from('order_items').insert(orderItemsPayload);

        return res.status(201).json({
          success: true,
          order: {
            ...newOrder,
            items: orderItemsPayload
          }
        });
      }
    } catch (e) {
      console.warn('Supabase DB write fallback used:', e.message);
    }
  }

  // Local fallback response if DB is initializing
  const fallbackOrder = {
    id: `loc-${Date.now()}`,
    ...orderPayload,
    items: items.map((item, idx) => ({
      id: `loc-item-${Date.now()}-${idx}`,
      item_name: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      line_total: Number(item.price) * Number(item.quantity),
      item_status: 'pending'
    }))
  };

  res.status(201).json({
    success: true,
    order: fallbackOrder
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FLOW POS server running on http://localhost:${PORT}`);
});
