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

  init() {
    this.loadFromLocalStorage();
    this.fetchMenu();
    this.fetchOrders();
  },

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.saveToLocalStorage();
    this.listeners.forEach(fn => fn(this));
  },

  loadFromLocalStorage() {
    try {
      const savedOrders = localStorage.getItem('flow_pos_orders');
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders);
      }
      const savedSeq = localStorage.getItem('flow_pos_order_seq');
      if (savedSeq) {
        this.orderSeq = parseInt(savedSeq, 10);
      }
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
    // If backend or Supabase orders exist, sync them
    this.notify();
  },

  getNextOrderNumber() {
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

  // Create Order Submission
  async createOrder() {
    if (this.isCreatingOrder) return null;
    if (this.cart.length === 0) {
      alert('Cannot create order: Cart is empty!');
      return null;
    }

    this.isCreatingOrder = true;
    const orderNum = this.getNextOrderNumber();

    const orderPayload = {
      order_number: orderNum,
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

    let createdOrder = null;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();
      if (data && data.success && data.order) {
        createdOrder = data.order;
      }
    } catch (e) {
      console.warn('API submit error, using local fallback:', e);
    }

    // Fallback order creation if backend network error
    if (!createdOrder) {
      const subtotal = this.getCartSubtotal();
      const total = this.getCartTotal();
      createdOrder = {
        id: `loc-${Date.now()}`,
        order_number: orderNum,
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

    // Increment order sequence
    this.orderSeq += 1;

    // Prepend order to local store
    this.orders.unshift(createdOrder);

    // Reset cart state
    this.clearCart();

    this.isCreatingOrder = false;
    this.notify();

    return createdOrder;
  },

  // Update Order Status
  updateOrderStatus(orderId, newStatus) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      order.updated_at = new Date().toISOString();
      this.notify();
    }
  },

  // Update Individual Item Completion Status
  toggleItemStatus(orderId, itemIndex, isCompleted) {
    const order = this.orders.find(o => o.id === orderId);
    if (order && order.items && order.items[itemIndex]) {
      order.items[itemIndex].item_status = isCompleted ? 'completed' : 'pending';

      // Check if ALL items in order are now completed
      const allDone = order.items.every(item => item.item_status === 'completed');
      if (allDone) {
        order.status = 'completed';
      } else if (order.status === 'completed' && !allDone) {
        order.status = 'preparing';
      }
      this.notify();
    }
  }
};

window.Store = Store;
