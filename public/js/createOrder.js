// PAGE 1 — CREATE ORDER POS Controller
const CreateOrderUI = {
  activeCategory: 'ALL',
  searchQuery: '',

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // Menu search
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderMenuGrid();
      });
    }

    // Order Type Selector
    const orderTypeContainer = document.getElementById('order-type-selector');
    if (orderTypeContainer) {
      orderTypeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.type-btn');
        if (btn) {
          orderTypeContainer.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Store.orderType = btn.dataset.type;
        }
      });
    }

    // Customer Name & Phone
    const nameInput = document.getElementById('customer-name');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        Store.customerName = e.target.value;
      });
    }

    const phoneInput = document.getElementById('customer-phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        Store.customerPhone = e.target.value;
      });
    }

    // Discount & Notes
    const discountInput = document.getElementById('cart-discount-input');
    if (discountInput) {
      discountInput.addEventListener('input', (e) => {
        Store.discount = Math.max(0, Number(e.target.value) || 0);
        this.updateBillSummary();
      });
    }

    const notesInput = document.getElementById('order-notes');
    if (notesInput) {
      notesInput.addEventListener('input', (e) => {
        Store.orderNotes = e.target.value;
      });
    }

    // Clear & Create Order Buttons
    const btnClear = document.getElementById('btn-clear-cart');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (Store.cart.length > 0 && confirm('Are you sure you want to clear the current order?')) {
          Store.clearCart();
        }
      });
    }

    const btnCreate = document.getElementById('btn-create-order');
    if (btnCreate) {
      btnCreate.addEventListener('click', async () => {
        const newOrder = await Store.createOrder();
        if (newOrder) {
          this.showOrderSuccessModal(newOrder);
        }
      });
    }

    // Modal New Order Button
    const btnModalNew = document.getElementById('btn-modal-new-order');
    if (btnModalNew) {
      btnModalNew.addEventListener('click', () => {
        const modal = document.getElementById('order-success-modal');
        if (modal) modal.classList.remove('active');
      });
    }
  },

  render() {
    this.renderCategoryPills();
    this.renderMenuGrid();
    this.renderCart();
  },

  renderCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    let html = `<button class="cat-pill ${this.activeCategory === 'ALL' ? 'active' : ''}" data-cat="ALL">ALL ITEMS</button>`;

    Store.menuCategories.forEach(cat => {
      const isActive = this.activeCategory === cat.name;
      html += `<button class="cat-pill ${isActive ? 'active' : ''}" data-cat="${cat.name}">${cat.name}</button>`;
    });

    container.innerHTML = html;

    // Attach pill click events
    container.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.activeCategory = pill.dataset.cat;
        this.renderCategoryPills();
        this.renderMenuGrid();
      });
    });
  },

  renderMenuGrid() {
    const container = document.getElementById('menu-grid-container');
    if (!container) return;

    let categoriesToRender = Store.menuCategories;
    if (this.activeCategory !== 'ALL') {
      categoriesToRender = categoriesToRender.filter(c => c.name === this.activeCategory);
    }

    let html = '';

    categoriesToRender.forEach(cat => {
      let filteredItems = cat.items || [];
      if (this.searchQuery) {
        filteredItems = filteredItems.filter(item => item.name.toLowerCase().includes(this.searchQuery));
      }

      if (filteredItems.length === 0) return;

      html += `
        <div class="category-block">
          <h3 class="category-block-title"><i class="fa-solid fa-utensils"></i> ${cat.name}</h3>
          <div class="items-grid">
      `;

      filteredItems.forEach(item => {
        // Check if item is in cart to display quantity badge
        const cartItem = Store.cart.find(c => c.name === item.name);
        const qtyBadge = cartItem ? `<div class="card-qty-badge">${cartItem.quantity}</div>` : '';

        html += `
          <div class="item-card">
            ${qtyBadge}
            <div>
              <h4 class="item-card-title">${item.name}</h4>
              ${item.description ? `<p class="item-card-desc">${item.description}</p>` : ''}
            </div>
            <div class="item-card-bottom">
              <span class="item-price">₹${item.price}</span>
              <button class="btn-add-item" data-name="${item.name}" data-price="${item.price}">
                <i class="fa-solid fa-plus"></i> ADD
              </button>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    if (!html) {
      html = `<div class="empty-cart-state"><i class="fa-solid fa-magnifying-glass"></i><p>No items found matching "${this.searchQuery}"</p></div>`;
    }

    container.innerHTML = html;

    // Attach Add to Cart click events
    container.querySelectorAll('.btn-add-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = btn.dataset.name;
        const price = Number(btn.dataset.price);
        Store.addToCart({ name, price });
      });
    });
  },

  renderCart() {
    const previewNum = document.getElementById('preview-order-number');
    if (previewNum) {
      previewNum.textContent = Store.getNextOrderNumber();
    }

    // Input fields sync
    const nameInput = document.getElementById('customer-name');
    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = Store.customerName;
    }

    const phoneInput = document.getElementById('customer-phone');
    if (phoneInput && document.activeElement !== phoneInput) {
      phoneInput.value = Store.customerPhone;
    }

    const notesInput = document.getElementById('order-notes');
    if (notesInput && document.activeElement !== notesInput) {
      notesInput.value = Store.orderNotes;
    }

    const discountInput = document.getElementById('cart-discount-input');
    if (discountInput && document.activeElement !== discountInput) {
      discountInput.value = Store.discount || '';
    }

    // Cart Items Container
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    if (Store.cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state">
          <i class="fa-solid fa-basket-shopping"></i>
          <p>Your cart is empty</p>
          <span>Click items from the menu to build an order</span>
        </div>
      `;
    } else {
      let html = '';
      Store.cart.forEach(item => {
        const lineTotal = item.price * item.quantity;
        html += `
          <div class="cart-item-row">
            <div class="cart-item-info">
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-unitprice">₹${item.price} each</div>
            </div>
            <div class="cart-qty-controls">
              <button class="qty-btn btn-dec" data-name="${item.name}"><i class="fa-solid fa-minus"></i></button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn btn-inc" data-name="${item.name}" data-price="${item.price}"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div class="cart-item-linetotal">₹${lineTotal}</div>
            <button class="btn-remove-item" data-name="${item.name}"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `;
      });
      container.innerHTML = html;

      // Event listeners for cart item buttons
      container.querySelectorAll('.btn-dec').forEach(btn => {
        btn.addEventListener('click', () => Store.decreaseCartQuantity(btn.dataset.name));
      });

      container.querySelectorAll('.btn-inc').forEach(btn => {
        btn.addEventListener('click', () => {
          Store.addToCart({ name: btn.dataset.name, price: Number(btn.dataset.price) });
        });
      });

      container.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', () => Store.removeFromCart(btn.dataset.name));
      });
    }

    this.updateBillSummary();
    this.updateMobileBar();
  },

  updateBillSummary() {
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    const subtotal = Store.getCartSubtotal();
    const total = Store.getCartTotal();

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    if (totalEl) totalEl.textContent = `₹${total}`;
  },

  updateMobileBar() {
    const countEl = document.getElementById('mobile-cart-item-count');
    const totalEl = document.getElementById('mobile-cart-total');

    const totalQty = Store.cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = Store.getCartTotal();

    if (countEl) countEl.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
    if (totalEl) totalEl.textContent = `₹${total}`;
  },

  showOrderSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    const numBadge = document.getElementById('modal-order-number');
    const totalEl = document.getElementById('modal-order-total');

    if (numBadge) numBadge.textContent = order.order_number;
    if (totalEl) totalEl.textContent = `₹${order.total}`;

    if (modal) {
      modal.classList.add('active');
    }
  }
};

window.CreateOrderUI = CreateOrderUI;
