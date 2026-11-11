/* Canonical public-site navigation and footer. Loaded before main.js to preserve menu and newsletter bindings. */
(()=>{
 'use strict';
 if(window.__aeSiteShellReady)return;
 window.__aeSiteShellReady=true;
 const affiliateTracking=document.createElement("script");affiliateTracking.src="/assets/js/affiliate-tracking.js?v=click-tracking-20261111";affiliateTracking.defer=true;document.head.appendChild(affiliateTracking);
 const header="<header class=\"site-header\">\n  <div class=\"top-strip\"><div class=\"container\"><span>Author · Speaker · Educator · Entrepreneur</span><a href=\"contact.html\">Chicago, IL · Connect with Andre →</a></div></div>\n  <div class=\"container nav\">\n    <a class=\"brand\" href=\"index.html\" aria-label=\"Andre Erving home\"><img class=\"ae-official-site-logo\" src=\"https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo.png\" alt=\"Andre Erving Growth Strategy Education\"></a>\n    <nav class=\"nav-links\" aria-label=\"Primary navigation\">\n      <div class=\"nav-group\"><button type=\"button\">Work With Andre</button><div class=\"dropdown\"><a href=\"speaking.html\">Speaking</a><a href=\"coaching.html\">Coaching</a><a href=\"consulting.html\">Consulting</a><a href=\"mentorship.html\">Mentorship</a><a href=\"photography.html\">Photography</a></div></div>\n      <div class=\"nav-group\"><button type=\"button\">Courses</button><div class=\"dropdown\"><a href=\"courses.html\">All Courses</a><a href=\"trucking-pro.html\">Trucking Pro</a><a href=\"freight-broker-training.html\">Freight Broker Training</a><a href=\"dispatcher-training.html\">Dispatcher Training</a><a href=\"time-management.html\">Time Management</a></div></div>\n      <div class=\"nav-group\"><button type=\"button\">Resources</button><div class=\"dropdown\"><a href=\"about.html\">About Andre</a><a href=\"ebooks.html\">eBooks</a><a href=\"worksheets.html\">Worksheets</a><a href=\"blog.html\">Blog</a><a href=\"podcast.html\">Podcast</a><a href=\"affiliate.html\">Affiliate Registration</a></div></div>\n            <a href=\"contact.html\">Contact</a>\n      <a class=\"mobile-sign-in\" href=\"https://app.andreerving.com/\">Sign In</a>\n    </nav>\n    <div class=\"nav-actions\"><a class=\"btn btn-ghost\" href=\"https://app.andreerving.com/\">Sign In</a><button class=\"menu-toggle\" type=\"button\" aria-expanded=\"false\" aria-label=\"Open navigation\">Menu</button></div>\n  </div>\n</header>";
 const footer="<footer class=\"site-footer\"><div class=\"container footer-grid\">\n  <div class=\"footer-brand\"><a class=\"brand footer-logo-link\" href=\"index.html\" aria-label=\"Andre Erving home\"><img class=\"footer-logo2\" src=\"https://gnfyidajbectlppsekzj.supabase.co/storage/v1/object/public/Andre%20Erving%20Public/logos/logo.png\" alt=\"Andre Erving — Growth, Strategy, Education\" loading=\"lazy\"></a><p>Practical education, leadership development, transportation training, strategy, and creative services for people ready to build what comes next.</p></div>\n  <div><div class=\"footer-title\">Work With Andre</div><div class=\"footer-links\"><a href=\"speaking.html\">Speaking</a><a href=\"coaching.html\">Coaching</a><a href=\"consulting.html\">Consulting</a><a href=\"mentorship.html\">Mentorship</a></div></div>\n  <div><div class=\"footer-title\">Explore</div><div class=\"footer-links\"><a href=\"courses.html\">Courses</a><a href=\"resources.html\">Resources</a><a href=\"blog.html\">Blog</a><a href=\"photography.html\">Photography</a><a href=\"contact.html\">Contact</a></div></div>\n  <div><div class=\"footer-title\">Stay Connected</div><p>Fresh ideas, new resources, and program updates.</p><div class=\"footer-newsletter-block\"><form class=\"newsletter demo-form\"><input type=\"email\" aria-label=\"Email\" placeholder=\"Email address\" required><button type=\"submit\">Join</button></form></div></div>\n</div><div class=\"container footer-newsletter-row\" aria-label=\"Newsletter subscription\"></div><div class=\"container footer-bottom\"><span>© 2026 Andre Erving, LLC.</span><span><a href=\"privacy-policy.html\">Privacy</a> · <a href=\"terms-of-service.html\">Terms</a> · <a href=\"accessibility.html\">Accessibility</a></span></div></footer>";
 const favicon=document.querySelector('link[rel="icon"]')||document.createElement('link');favicon.rel='icon';favicon.type='image/png';favicon.href='/images/fav.png';if(!favicon.isConnected)document.head.append(favicon);
 const density=document.querySelector('link[data-ae-density]')||document.createElement('link');density.rel='stylesheet';density.dataset.aeDensity='true';density.href='/assets/css/site-density.css?v=20261107d';if(!density.isConnected)document.head.append(density);
 const mobile=document.querySelector('link[data-ae-mobile]')||document.createElement('link');mobile.rel='stylesheet';mobile.dataset.aeMobile='true';mobile.href='/assets/css/mobile-refinement.css?v=20261107v6';if(!mobile.isConnected)document.head.append(mobile);
 const oldHeader=document.querySelector('header.site-header');
 const oldFooter=document.querySelector('footer.site-footer');
 if(oldHeader){oldHeader.outerHTML=header;}else{document.body.insertAdjacentHTML('afterbegin',header);}
 if(oldFooter){oldFooter.outerHTML=footer;}else{document.body.insertAdjacentHTML('beforeend',footer);}
 const footerRoot=document.querySelector('footer.site-footer');
 const footerColumns=footerRoot?.querySelector('.footer-grid');
 const newsletterHost=footerRoot?.querySelector('.footer-newsletter-row');
 const newsletterBlock=footerColumns?.querySelector('.footer-newsletter-block');
 const newsletterColumn=footerColumns?.lastElementChild;
 if(footerColumns&&newsletterHost&&newsletterBlock&&newsletterColumn){
  const mobileFooter=window.matchMedia('(max-width:600px)');
  const arrangeNewsletter=()=>{
   if(mobileFooter.matches) newsletterHost.appendChild(newsletterBlock);
   else newsletterColumn.appendChild(newsletterBlock);
   newsletterHost.hidden=!mobileFooter.matches;
  };
  arrangeNewsletter();
  mobileFooter.addEventListener('change',arrangeNewsletter);
 }
 if(location.pathname.includes('/blog/'))document.querySelectorAll('header.site-header a[href],footer.site-footer a[href]').forEach(a=>{const href=a.getAttribute('href');if(href&&!/^(?:[a-z]+:|\/|#)/i.test(href))a.setAttribute('href','/'+href)});
 const current=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('.nav-group > button').forEach(button=>{
  const group=button.parentElement;
  button.setAttribute('aria-expanded','false');
  button.addEventListener('click',()=>{
   const next=!group.classList.contains('open');
   document.querySelectorAll('.nav-group.open').forEach(other=>{
    other.classList.remove('open');
    other.querySelector('button')?.setAttribute('aria-expanded','false');
   });
   group.classList.toggle('open',next);
   button.setAttribute('aria-expanded',String(next));
  });
 });
 document.addEventListener('click',event=>{
  if(event.target.closest('.nav-group'))return;
  document.querySelectorAll('.nav-group.open').forEach(group=>{
   group.classList.remove('open');
   group.querySelector('button')?.setAttribute('aria-expanded','false');
  });
 });
 const nav=document.querySelector('header.site-header .nav-links');
 if(nav){
  const active=[...nav.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===current);
  if(active){active.classList.add('active');active.setAttribute('aria-current','page');}
 }
})();
