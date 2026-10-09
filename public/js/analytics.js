// PAGE 3 — ANALYTICS Controller
const AnalyticsUI = {
  timeRange: 'today',

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const rangePicker = document.querySelector('.time-range-picker');
    if (rangePicker) {
      rangePicker.addEventListener('click', (e) => {
        const btn = e.target.closest('.time-btn');
        if (btn) {
          rangePicker.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.timeRange = btn.dataset.range;
          this.render();
        }
      });
    }
  },

  render() {
    const orders = this.getFilteredOrdersByTimeRange();

    // 1. Key Metrics Calculations
    const totalSales = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalOrdersCount = orders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;
    const completedOrdersCount = orders.filter(o => o.status === 'completed').length;

    const salesEl = document.getElementById('metric-total-sales');
    const countEl = document.getElementById('metric-total-orders');
    const avgEl = document.getElementById('metric-avg-value');
    const compEl = document.getElementById('metric-completed-count');

    if (salesEl) salesEl.textContent = `₹${totalSales.toLocaleString('en-IN')}`;
    if (countEl) countEl.textContent = totalOrdersCount.toString();
    if (avgEl) avgEl.textContent = `₹${avgOrderValue.toLocaleString('en-IN')}`;
    if (compEl) compEl.textContent = completedOrdersCount.toString();

    // 2. Render Sales Chart
    this.renderSalesChart(orders);

    // 3. Render Top Selling Items
    this.renderTopItems(orders);

    // 4. Render Category Performance
    this.renderCategoryPerformance(orders);
  },

  getFilteredOrdersByTimeRange() {
    const allOrders = Store.orders;
    const now = new Date();

    if (this.timeRange === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      return allOrders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === todayStr);
    } else if (this.timeRange === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return allOrders.filter(o => new Date(o.created_at) >= sevenDaysAgo);
    } else if (this.timeRange === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return allOrders.filter(o => new Date(o.created_at) >= thirtyDaysAgo);
    }
    return allOrders;
  },

  renderSalesChart(orders) {
    const container = document.getElementById('sales-chart-container');
    if (!container) return;

    // Group sales by time slot / date
    const slots = {};

    if (this.timeRange === 'today') {
      // Group by hour blocks (8 AM - 11 PM)
      for (let h = 8; h <= 23; h += 3) {
        const label = `${h}:00`;
        slots[label] = 0;
      }
      orders.forEach(o => {
        const date = new Date(o.created_at);
        const hour = date.getHours();
        const block = Math.floor(hour / 3) * 3;
        const label = `${block}:00`;
        slots[label] = (slots[label] || 0) + Number(o.total || 0);
      });
    } else {
      // Group by last 7 or 30 days
      const daysCount = this.timeRange === '7days' ? 7 : 14;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        slots[label] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.created_at);
        const label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        if (slots[label] !== undefined) {
          slots[label] += Number(o.total || 0);
        }
      });
    }

    const maxVal = Math.max(100, ...Object.values(slots));

    let html = '';
    Object.keys(slots).forEach(label => {
      const val = slots[label];
      const heightPct = Math.round((val / maxVal) * 100);
      html += `
        <div class="chart-bar-group">
          <span class="chart-bar-value">${val > 0 ? `₹${val}` : ''}</span>
          <div class="chart-bar" style="height: ${Math.max(4, heightPct)}%;"></div>
          <span class="chart-bar-label">${label}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  renderTopItems(orders) {
    const tbody = document.getElementById('top-items-tbody');
    if (!tbody) return;

    const itemMap = {};

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const name = item.item_name || item.name;
        const qty = Number(item.quantity || 1);
        const price = Number(item.unit_price || item.price || 0);
        const revenue = qty * price;

        if (!itemMap[name]) {
          itemMap[name] = { quantity: 0, revenue: 0 };
        }
        itemMap[name].quantity += qty;
        itemMap[name].revenue += revenue;
      });
    });

    const sortedItems = Object.keys(itemMap).map(name => ({
      name,
      quantity: itemMap[name].quantity,
      revenue: itemMap[name].revenue
    })).sort((a, b) => b.quantity - a.quantity);

    if (sortedItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748B;">No sales recorded yet</td></tr>`;
      return;
    }

    let html = '';
    sortedItems.slice(0, 7).forEach(item => {
      html += `
        <tr>
          <td style="font-weight: 700; color: #0F172A;">${item.name}</td>
          <td><strong style="color: #0A3663;">${item.quantity}</strong> sold</td>
          <td style="font-family: 'Outfit'; font-weight: 800; color: #0A3663;">₹${item.revenue.toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  renderCategoryPerformance(orders) {
    const grid = document.getElementById('category-performance-grid');
    if (!grid) return;

    // Build category map from Store.menuCategories
    const catRevenueMap = {};
    Store.menuCategories.forEach(c => {
      catRevenueMap[c.name] = 0;
    });

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const itemName = item.item_name || item.name;
        const qty = Number(item.quantity || 1);
        const price = Number(item.unit_price || item.price || 0);
        const revenue = qty * price;

        // Find matching category
        let foundCat = 'OTHERS';
        for (const cat of Store.menuCategories) {
          if (cat.items && cat.items.some(i => i.name === itemName)) {
            foundCat = cat.name;
            break;
          }
        }
        catRevenueMap[foundCat] = (catRevenueMap[foundCat] || 0) + revenue;
      });
    });

    let html = '';
    Object.keys(catRevenueMap).forEach(catName => {
      const revenue = catRevenueMap[catName];
      html += `
        <div class="cat-perf-card">
          <div class="cat-perf-name">${catName}</div>
          <div class="cat-perf-val">₹${revenue.toLocaleString('en-IN')}</div>
        </div>
      `;
    });

    grid.innerHTML = html;
  }
};

window.AnalyticsUI = AnalyticsUI;
