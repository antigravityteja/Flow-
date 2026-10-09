// PAGE 2 — EXISTING ORDERS Controller
const ExistingOrdersUI = {
  statusFilter: 'ALL',
  timeframeFilter: 'today',
  searchQuery: '',

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Status Filter Tabs
    const statusTabsContainer = document.getElementById('status-filters');
    if (statusTabsContainer) {
      statusTabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.status-tab');
        if (tab) {
          statusTabsContainer.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.statusFilter = tab.dataset.status;
          this.render();
        }
      });
    }

    // Timeframe Filter Buttons
    const timeframeContainer = document.querySelector('.orders-filter-bar');
    if (timeframeContainer) {
      timeframeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (btn && btn.dataset.timeframe) {
          timeframeContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.timeframeFilter = btn.dataset.timeframe;
          this.render();
        }
      });
    }

    // Search Input
    const searchInput = document.getElementById('orders-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }
  },

  render() {
    const container = document.getElementById('orders-grid-container');
    const badgeEl = document.getElementById('pending-orders-badge');

    if (!container) return;

    // Filter orders
    let filtered = Store.orders;

    // 1. Timeframe filter
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.timeframeFilter === 'today') {
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        return orderDate === todayStr;
      });
    }

    // 2. Status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(o => o.status === this.statusFilter);
    }

    // 3. Search query
    if (this.searchQuery) {
      filtered = filtered.filter(o => {
        const matchNum = (o.order_number || '').toLowerCase().includes(this.searchQuery);
        const matchName = (o.customer_name || '').toLowerCase().includes(this.searchQuery);
        const matchPhone = (o.customer_phone || '').toLowerCase().includes(this.searchQuery);
        return matchNum || matchName || matchPhone;
      });
    }

    // Update pending count badge
    const activeCount = Store.orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    if (badgeEl) badgeEl.textContent = activeCount.toString();

    // Priority Sorting:
    // 1. Incomplete / active orders first (status != 'completed' and status != 'cancelled')
    // 2. Older orders first (earlier created_at timestamp)
    filtered.sort((a, b) => {
      const aCompleted = (a.status === 'completed' || a.status === 'cancelled');
      const bCompleted = (b.status === 'completed' || b.status === 'cancelled');

      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      return new Date(a.created_at) - new Date(b.created_at);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state" style="grid-column: 1 / -1; padding: 3rem;">
          <i class="fa-solid fa-receipt"></i>
          <p>No orders found</p>
          <span>Try adjusting your search or filters</span>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(order => {
      const formattedTime = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const orderTypeLabel = (order.order_type || 'walk_in').replace('_', ' ').toUpperCase();

      // Item checklist HTML - Wrapped in label for full row clickability
      let itemsChecklistHtml = '';
      (order.items || []).forEach((item, idx) => {
        const isDone = item.item_status === 'completed';
        itemsChecklistHtml += `
          <label class="order-item-checklist-row">
            <input type="checkbox" class="order-item-checkbox" data-order-id="${order.id}" data-item-idx="${idx}" ${isDone ? 'checked' : ''} />
            <span class="order-item-label ${isDone ? 'completed' : ''}">
              ${item.item_name || item.name} × ${item.quantity}
            </span>
            <span class="cart-item-unitprice">₹${(item.unit_price || item.price) * item.quantity}</span>
          </label>
        `;
      });

      html += `
        <div class="order-card" data-order-id="${order.id}">
          <div class="order-card-header">
            <div>
              <span class="order-card-num">${order.order_number}</span>
              <span class="order-card-time">• ${formattedTime}</span>
            </div>
            <span class="status-badge ${order.status}">${order.status}</span>
          </div>

          <div class="order-card-customer">
            <span class="cust-name"><i class="fa-solid fa-user"></i> ${order.customer_name || 'Walk-in Customer'}</span>
            ${order.customer_phone ? `<span class="cust-phone"><i class="fa-solid fa-phone"></i> ${order.customer_phone}</span>` : ''}
            <span class="order-type-chip">${orderTypeLabel}</span>
          </div>

          <div class="order-card-items-preview">
            ${itemsChecklistHtml}
          </div>

          ${order.notes ? `<div style="font-size: 0.78rem; font-style: italic; color: #64748B;"><i class="fa-solid fa-note-sticky"></i> ${order.notes}</div>` : ''}

          <div class="order-card-footer">
            <div class="order-card-total">₹${order.total}</div>

            <select class="status-select" data-order-id="${order.id}">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>PENDING</option>
              <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>PREPARING</option>
              <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>READY</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>COMPLETED</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>CANCELLED</option>
            </select>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach Event Listeners for Checkboxes & Status Select
    container.querySelectorAll('.order-item-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const orderId = chk.dataset.orderId;
        const itemIdx = parseInt(chk.dataset.itemIdx, 10);
        Store.toggleItemStatus(orderId, itemIdx, chk.checked);
      });
    });

    container.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const orderId = sel.dataset.orderId;
        Store.updateOrderStatus(orderId, sel.value);
      });
    });
  }
};

window.ExistingOrdersUI = ExistingOrdersUI;
