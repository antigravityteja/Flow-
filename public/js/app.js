// FLOW POS Main Application Bootstrap & Router
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Store
  Store.init();

  // 2. Initialize Controllers
  CreateOrderUI.init();
  ExistingOrdersUI.init();
  AnalyticsUI.init();

  // 3. Subscribe Store Changes
  Store.subscribe(() => {
    CreateOrderUI.render();
    ExistingOrdersUI.render();
    AnalyticsUI.render();
  });

  // 4. Tab Navigation Router
  const navButtons = document.querySelectorAll('.app-nav .nav-btn');
  const pages = document.querySelectorAll('.page-view');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pageTarget = btn.dataset.page;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      pages.forEach(page => {
        if (page.id === `page-${pageTarget}`) {
          page.classList.add('active');
        } else {
          page.classList.remove('active');
        }
      });

      // Refresh page specific views
      if (pageTarget === 'existing-orders') {
        ExistingOrdersUI.render();
      } else if (pageTarget === 'analytics') {
        AnalyticsUI.render();
      } else if (pageTarget === 'create-order') {
        CreateOrderUI.render();
      }
    });
  });

  // 5. Mobile Cart Drawer Toggle
  const btnToggleMobileCart = document.getElementById('btn-toggle-mobile-cart');
  const cartPanel = document.getElementById('pos-cart-panel');

  if (btnToggleMobileCart && cartPanel) {
    btnToggleMobileCart.addEventListener('click', () => {
      cartPanel.classList.toggle('mobile-visible');
      const isVisible = cartPanel.classList.contains('mobile-visible');
      btnToggleMobileCart.innerHTML = isVisible
        ? `<i class="fa-solid fa-chevron-down"></i> Close Cart`
        : `<i class="fa-solid fa-cart-shopping"></i> View Cart`;
    });
  }

  // 6. Close Success Modal Backdrop
  const successModal = document.getElementById('order-success-modal');
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.classList.remove('active');
      }
    });
  }
});
