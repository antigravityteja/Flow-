import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env
const localEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfdkktkjznkurabqfwkm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZGtrdGtqem5rdXJhYnFmd2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTUxMjQ1OSwiZXhwIjoyMTA3MDg4NDU5fQ.ozaQk7BWZYE5ETQJTBTlUJyA6K9nPbeEjToDNAAaUmo';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZGtrdGtqem5rdXJhYnFmd2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTI0NTksImV4cCI6MjEwNzA4ODQ1OX0.zjoyH18CH34CtgmkXGMB_Ep_6g5pDTDAVajaQ5wlDTg';

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

// Helper: Dynamically generate next unique order number from DB
async function generateNextOrderNumber() {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('orders')
        .select('order_number');

      if (data && data.length > 0) {
        let maxNum = 0;
        data.forEach(o => {
          if (o.order_number) {
            const num = parseInt(o.order_number.replace(/\D/g, ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        return `FLOW-${String(maxNum + 1).padStart(3, '0')}`;
      }
    } catch (e) {
      console.warn('Error fetching order max num:', e.message);
    }
  }
  return `FLOW-001`;
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

// Endpoint: Get existing orders with item aggregation
app.get('/api/orders', async (req, res) => {
  if (!supabase) {
    return res.json({ orders: [] });
  }

  try {
    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (oErr || !orders) {
      return res.json({ orders: [] });
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*');

    const combined = orders.map(o => ({
      ...o,
      items: (items || []).filter(i => i.order_id === o.id)
    }));

    res.json({ orders: combined });
  } catch (err) {
    res.json({ orders: [] });
  }
});

// Endpoint: Create Order with Transactional RPC & Performance Instrumentation
app.post('/api/orders', async (req, res) => {
  const startTime = Date.now();
  try {
    const { customer_name, customer_phone, order_type, items, discount = 0, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    if (supabase) {
      try {
        // 1-Step Transactional PostgreSQL RPC Call
        const { data: rpcOrder, error: rpcErr } = await supabase.rpc('create_flow_order', {
          p_customer_name: customer_name || 'Walk-in Customer',
          p_customer_phone: customer_phone || null,
          p_order_type: order_type || 'walk_in',
          p_discount: Number(discount) || 0,
          p_notes: notes || null,
          p_items: items
        });

        if (!rpcErr && rpcOrder) {
          const latencyMs = Date.now() - startTime;
          return res.status(201).json({
            success: true,
            latencyMs,
            order: rpcOrder
          });
        } else if (rpcErr) {
          console.warn('RPC create_flow_order fallback:', rpcErr.message);
        }
      } catch (rpcEx) {
        console.warn('RPC exception, using atomic table fallback:', rpcEx.message);
      }
    }

    // Fallback DB insert if RPC function not yet executed
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const total = Math.max(0, subtotal - Number(discount));
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
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (!orderErr && newOrder) {
        const orderItemsPayload = items.map(item => ({
          order_id: newOrder.id,
          menu_item_id: (item.id && String(item.id).length === 36) ? item.id : null,
          item_name: item.name,
          unit_price: Number(item.price),
          quantity: Number(item.quantity),
          line_total: Number(item.price) * Number(item.quantity),
          item_status: 'pending'
        }));

        await supabase.from('order_items').insert(orderItemsPayload);

        const latencyMs = Date.now() - startTime;
        return res.status(201).json({
          success: true,
          latencyMs,
          order: {
            ...newOrder,
            items: orderItemsPayload
          }
        });
      }
    }

    // Local Fallback
    const latencyMs = Date.now() - startTime;
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

    return res.status(201).json({
      success: true,
      latencyMs,
      order: fallbackOrder
    });
  } catch (topErr) {
    res.status(500).json({ error: topErr.message });
  }
});

// Endpoint: Update Order Status & Item Checklist
app.patch('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, items } = req.body;

  try {
    if (supabase) {
      if (status) {
        await supabase
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);
      }

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.id) {
            await supabase
              .from('order_items')
              .update({ item_status: item.item_status || 'pending' })
              .eq('id', item.id);
          }
        }
      }
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Export app for Vercel Serverless Function compatibility
export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 FLOW POS server running on http://localhost:${PORT}`);
  });
}
