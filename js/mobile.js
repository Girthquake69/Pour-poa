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

/* Hero slideshow (phones only): crossfade + swipe, 5.5s rotation */
(function () {
  var root = document.getElementById('hero-slides'), hero = document.getElementById('hero');
  if (!root || !hero) return;
  var mq = window.matchMedia('(max-width: 47.99rem)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var slides = [].slice.call(root.querySelectorAll('.hero-slide'));
  var idx = 0, offscreen = false, timer = null, SLIDE_MS = 5500;

  function go(n) {
    idx = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === idx);
      s.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
    });
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (reduce.matches || offscreen || document.hidden || !mq.matches) return;
    timer = setTimeout(function () { go(idx + 1); }, SLIDE_MS);
  }

  var sx = 0, sy = 0, tracking = false;
  hero.addEventListener('touchstart', function (e) {
    if (!mq.matches || e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    if (!tracking) return; tracking = false;
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { offscreen = en[0].intersectionRatio < 0.25; schedule(); }, { threshold: [0, 0.25, 1] }).observe(hero);
  }
  document.addEventListener('visibilitychange', schedule);
  mq.addEventListener && mq.addEventListener('change', schedule);

  go(0);
})();
