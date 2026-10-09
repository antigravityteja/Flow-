// State Management & DB Sync Store
const Store = {
  cart: [],
  customerName: '',
  customerPhone: '',
  orderType: 'walk_in',
  discount: 0,
  orderNotes: '',

  orders: [],
  menuCategories: INITIAL_MENU_CATEGORIES,
  orderSeq: 1,

  listeners: [],
  isCreatingOrder: false,
  lastOrderLatencyMs: 0,

  init() {
    this.loadFromLocalStorage();
    this.fetchMenu();
    this.fetchOrders();
  },

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.calculateNextSeq();
    this.saveToLocalStorage();
    this.listeners.forEach(fn => fn(this));
  },

  calculateNextSeq() {
    let maxNum = 0;
    (this.orders || []).forEach(o => {
      if (o.order_number && o.order_number.startsWith('FLOW-')) {
        const parts = o.order_number.split('-');
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    this.orderSeq = maxNum + 1;
  },

  loadFromLocalStorage() {
    try {
      const savedOrders = localStorage.getItem('flow_pos_orders');
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders);
      }
      this.calculateNextSeq();
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  },

  saveToLocalStorage() {
    try {
      localStorage.setItem('flow_pos_orders', JSON.stringify(this.orders));
      localStorage.setItem('flow_pos_order_seq', this.orderSeq.toString());
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  },

  async fetchMenu() {
    try {
      const res = await fetch('/api/menu');
      const data = await res.json();
      if (data && data.categories && data.categories.length > 0) {
        this.menuCategories = data.categories;
      }
    } catch (e) {
      console.log('Using static menu fallback');
    }
    this.notify();
  },

  async fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        this.orders = data.orders;
      }
    } catch (e) {
      console.log('Using local orders fallback');
    }
    this.notify();
  },

  getNextOrderNumber() {
    this.calculateNextSeq();
    const num = String(this.orderSeq).padStart(3, '0');
    return `FLOW-${num}`;
  },

  // Cart Management
  addToCart(item) {
    const existingIndex = this.cart.findIndex(c => c.name === item.name);
    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += 1;
    } else {
      this.cart.push({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: item.name,
        price: Number(item.price),
        quantity: 1
      });
    }
    this.notify();
  },

  decreaseCartQuantity(name) {
    const index = this.cart.findIndex(c => c.name === name);
    if (index > -1) {
      if (this.cart[index].quantity > 1) {
        this.cart[index].quantity -= 1;
      } else {
        this.cart.splice(index, 1);
      }
      this.notify();
    }
  },

  removeFromCart(name) {
    this.cart = this.cart.filter(c => c.name !== name);
    this.notify();
  },

  clearCart() {
    this.cart = [];
    this.customerName = '';
    this.customerPhone = '';
    this.discount = 0;
    this.orderNotes = '';
    this.orderType = 'walk_in';
    this.notify();
  },

  getCartSubtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getCartTotal() {
    const subtotal = this.getCartSubtotal();
    return Math.max(0, subtotal - Number(this.discount));
  },

  // Item Status Checklist Handler (Fixes Store.toggleItemStatus is not a function)
  async toggleItemStatus(orderId, itemIdx, isChecked) {
    const order = this.orders.find(o => String(o.id) === String(orderId));
    if (!order || !order.items || !order.items[itemIdx]) return;

    const newStatus = isChecked ? 'completed' : 'pending';
    order.items[itemIdx].item_status = newStatus;

    // Auto-update order status if all items completed
    const allCompleted = order.items.length > 0 && order.items.every(i => i.item_status === 'completed');
    if (allCompleted && order.status !== 'completed' && order.status !== 'cancelled') {
      order.status = 'completed';
    } else if (!allCompleted && isChecked && order.status === 'pending') {
      order.status = 'preparing';
    }

    this.saveToLocalStorage();
    this.notify();

    // Async DB Sync
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          items: order.items
        })
      });
    } catch (e) {
      console.warn('DB item status sync fallback:', e);
    }
  },

  // Order Status Selector Handler (Fixes Store.updateOrderStatus)
  async updateOrderStatus(orderId, newStatus) {
    const order = this.orders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    order.status = newStatus;
    this.saveToLocalStorage();
    this.notify();

    // Async DB Sync
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.warn('DB order status sync fallback:', e);
    }
  },

  // High-performance Instrumented Transactional Order Creation
  async createOrder() {
    if (this.isCreatingOrder) return null;
    if (this.cart.length === 0) {
      alert('Cannot create order: Cart is empty!');
      return null;
    }

    const tStart = performance.now();
    this.isCreatingOrder = true;
    let createdOrder = null;

    try {
      const tempNum = this.getNextOrderNumber();

      const orderPayload = {
        order_number: tempNum,
        customer_name: this.customerName.trim() || 'Walk-in Customer',
        customer_phone: this.customerPhone.trim() || null,
        order_type: this.orderType,
        items: this.cart.map(c => ({
          id: c.id,
          name: c.name,
          price: c.price,
          quantity: c.quantity
        })),
        discount: Number(this.discount),
        notes: this.orderNotes.trim() || null
      };

      // 1. Try Express API Endpoint
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.order) {
            createdOrder = data.order;
          }
        }
      } catch (e) {
        console.warn('Backend API slow or unreachable, attempting direct Supabase RPC:', e.message);
      }

      // 2. Direct Supabase Client RPC Fallback (Instant Client Connection)
      if (!createdOrder && window.supabase && typeof window.supabase.createClient === 'function') {
        try {
          const client = window.supabase.createClient(
            'https://qfdkktkjznkurabqfwkm.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZGtrdGtqem5rdXJhYnFmd2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTI0NTksImV4cCI6MjEwNzA4ODQ1OX0.zjoyH18CH34CtgmkXGMB_Ep_6g5pDTDAVajaQ5wlDTg'
          );

          const { data: rpcRes, error: rpcErr } = await client.rpc('create_flow_order', {
            p_customer_name: orderPayload.customer_name,
            p_customer_phone: orderPayload.customer_phone,
            p_order_type: orderPayload.order_type,
            p_discount: orderPayload.discount,
            p_notes: orderPayload.notes,
            p_items: orderPayload.items
          });

          if (!rpcErr && rpcRes) {
            createdOrder = rpcRes;
          } else if (rpcErr) {
            console.warn('Direct Supabase RPC error:', rpcErr.message);
          }
        } catch (directErr) {
          console.warn('Direct client RPC exception:', directErr.message);
        }
      }

      // 3. Fallback order creation if all network routes fail
      if (!createdOrder) {
        const subtotal = this.getCartSubtotal();
        const total = this.getCartTotal();
        createdOrder = {
          id: `loc-${Date.now()}`,
          order_number: tempNum,
          customer_name: orderPayload.customer_name,
          customer_phone: orderPayload.customer_phone,
          order_type: orderPayload.order_type,
          status: 'pending',
          subtotal,
          discount: Number(this.discount),
          total,
          notes: orderPayload.notes,
          created_at: new Date().toISOString(),
          items: this.cart.map((item, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            item_name: item.name,
            unit_price: Number(item.price),
            quantity: Number(item.quantity),
            line_total: Number(item.price) * Number(item.quantity),
            item_status: 'pending'
          }))
        };
      }

      const tEnd = performance.now();
      this.lastOrderLatencyMs = Math.round(tEnd - tStart);
      console.log(`⏱️ Order Creation Completed in ${this.lastOrderLatencyMs}ms (Order #${createdOrder.order_number})`);

      // Prepend order to local store
      this.orders.unshift(createdOrder);

      // Recalculate sequence
      this.calculateNextSeq();

      // Reset cart state
      this.clearCart();
    } catch (err) {
      console.error('Fatal order submission error:', err);
    } finally {
      this.isCreatingOrder = false;
    }

    return createdOrder;
  }
};

window.Store = Store;
