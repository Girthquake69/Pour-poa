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

/* Hero slideshow (phones only): crossfade, swipe, tappable progress segments, pause control */
(function () {
  var root = document.getElementById('hero-slides'), ui = document.getElementById('hero-slides-ui');
  if (!root || !ui) return;
  var mq = window.matchMedia('(max-width: 47.99rem)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var slides = [].slice.call(root.querySelectorAll('.hero-slide'));
  var hero = document.getElementById('hero');
  var idx = 0, userPaused = reduce.matches, offscreen = false;

  var dots = slides.map(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'hero-dot';
    b.setAttribute('aria-label', 'Show cocktail ' + (i + 1) + ' of ' + slides.length);
    b.appendChild(document.createElement('i'));
    b.addEventListener('click', function () { go(i); });
    ui.appendChild(b); return b;
  });
  var pause = document.createElement('button');
  pause.type = 'button'; pause.className = 'hero-pause';
  pause.appendChild(document.createElement('span'));
  pause.addEventListener('click', function () { userPaused = !userPaused; sync(); });
  ui.appendChild(pause);

  function sync() {
    ui.classList.toggle('is-paused', userPaused || offscreen || document.hidden);
    ui.classList.toggle('is-static', reduce.matches);
    pause.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
    root.setAttribute('aria-live', userPaused || reduce.matches ? 'polite' : 'off');
  }
  function go(n) {
    idx = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      s.classList.toggle('is-active', i === idx);
      s.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
    });
    dots.forEach(function (d, i) {
      d.classList.remove('is-active', 'is-done');
      if (i < idx) d.classList.add('is-done');
      d.setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
    void ui.offsetWidth;                       /* restart the progress animation */
    dots[idx].classList.add('is-active');
  }
  ui.addEventListener('animationend', function (e) {
    if (e.target.parentNode === dots[idx] && !reduce.matches) go(idx + 1);
  });

  /* swipe: horizontal intent only, so vertical page scroll is never hijacked */
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
    new IntersectionObserver(function (en) { offscreen = en[0].intersectionRatio < 0.25; sync(); }, { threshold: [0, 0.25, 1] }).observe(hero);
  }
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener && reduce.addEventListener('change', function () { userPaused = reduce.matches; sync(); });

  go(0); sync();
})();
