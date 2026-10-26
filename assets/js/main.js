// Shared navigation and lightweight contact handling for the static website.
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
const groups = [...document.querySelectorAll('.nav-group')];
const closeMenus = () => {
  groups.forEach(group => {
    group.classList.remove('open');
    group.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
  });
};
groups.forEach(group => {
  const button = group.querySelector(':scope > button');
  const dropdown = group.querySelector(':scope > .dropdown');
  if (!button || !dropdown) return;
  const id = 'menu-' + groups.indexOf(group);
  dropdown.id = id;
  button.setAttribute('aria-controls', id);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'true');
  button.addEventListener('click', () => {
    const willOpen = !group.classList.contains('open');
    closeMenus();
    group.classList.toggle('open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
  });
});
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    if (!open) closeMenus();
  });
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeMenus();
  nav?.classList.remove('open');
  if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav-group')) closeMenus();
});
const path = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(link => {
  if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
});

// No pretend submissions: until a backend is configured, open the visitor's
// email app with the inquiry and clearly explain the handoff.
const recipient = 'support@andreerving.com';
document.querySelectorAll('form.demo-form').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const isContact = form.classList.contains('contact-form');
    const fields = new FormData(form);
    const subject = isContact ? 'Andre Erving website inquiry: ' + (fields.get('interest') || 'General') : 'Andre Erving newsletter signup request';
    const body = isContact
      ? ['Name: ' + (fields.get('name') || ''), 'Email: ' + (fields.get('email') || ''), 'Phone: ' + (fields.get('phone') || ''), 'Interest: ' + (fields.get('interest') || ''), '', String(fields.get('message') || '')].join('\n')
      : 'Please add this email to the newsletter list: ' + (fields.get('email') || form.querySelector('input[type=email]')?.value || '');
    const notice = document.querySelector('.toast');
    if (notice) {
      notice.textContent = 'Your email app will open with a prepared message. Please send it there to complete your request.';
      notice.classList.add('show');
      setTimeout(() => notice.classList.remove('show'), 6500);
    }
    window.location.href = 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
});
