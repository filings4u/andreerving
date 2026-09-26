(() => {
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-main-nav]');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-main-nav] a').forEach(a => {
    if ((a.getAttribute('href') || '') === path) a.classList.add('active');
  });
})();
