/* Pour Poa — phone helpers: keep the chosen tab in view inside its scroller */
(function () {
  document.addEventListener('click', function (e) {
    var tab = e.target.closest && e.target.closest('.occ-tab, .menu-tab');
    if (tab && tab.scrollIntoView) tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
})();

/* Hide the floating WhatsApp button while the hero (with its own CTAs) fills the screen */
(function () {
  var hero = document.getElementById('hero'), wa = document.querySelector('.wa-float');
  if (!hero || !wa || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (en) {
    wa.classList.toggle('is-away', en[0].intersectionRatio > 0.6);
  }, { threshold: [0, 0.6, 1] }).observe(hero);
})();
