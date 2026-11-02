/* Pour Poa — cinematic scroll (GSAP + ScrollTrigger + Lenis)
 *
 * Device-aware by design:
 *  - Lenis smooth scroll only for a fine pointer (mouse / trackpad). Touch scrolls natively.
 *  - Everything else lives inside gsap.matchMedia(), so rotating a phone or resizing a window
 *    rebuilds the right set of effects instead of leaving stale pins and tweens behind.
 *  - Reveals play once. Scrolling back up never hides content again.
 *  - Only transform and opacity are animated.
 */
(function () {
  "use strict";

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    return;
  }

  window.__pourKinetic = true;
  document.documentElement.classList.add("kinetic-on");
  gsap.registerPlugin(ScrollTrigger);

  // The mobile URL bar showing and hiding resizes the viewport; do not rebuild every trigger for it.
  ScrollTrigger.config({ ignoreMobileResize: true });

  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Smooth scroll (mouse and trackpad only) ---------- */
  var lenis = null;
  if (finePointer && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // main.js calls these while the feedback sheet or the phone menu is open
    window.__pourScroll = {
      lock: function () { lenis.stop(); },
      unlock: function () { lenis.start(); },
    };
  }

  /* ---------- In-page anchors ---------- */
  function focusTarget(el) {
    if (!el) return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id === "#" || !lenis) return; // touch: the browser's own anchor jump + CSS scroll-padding
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 72;
      lenis.scrollTo(target, {
        offset: -pad,
        onComplete: function () { focusTarget(target); },
      });
      try { history.replaceState(null, "", id); } catch (err) { /* file:// or sandboxed */ }
    });
  });

  /* ---------- Progress bar ---------- */
  var bar = document.getElementById("k-scroll");
  if (bar) {
    gsap.set(bar, { scaleX: 0, transformOrigin: "0% 50%" });
    var setBar = gsap.quickSetter(bar, "scaleX");
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) { setBar(self.progress); },
    });
  }

  /* ---------- Heading helpers ---------- */
  function splitWords(el) {
    if (!el || el.dataset.split === "1") return;
    var text = el.textContent.trim();
    if (!text) return;
    el.dataset.split = "1";
    el.classList.add("k-split");
    var words = text.split(/(\s+)/);
    el.textContent = "";
    var line = document.createElement("span");
    line.className = "k-line";
    words.forEach(function (w) {
      if (/^\s+$/.test(w)) {
        line.appendChild(document.createTextNode(w));
        return;
      }
      var span = document.createElement("span");
      span.className = "k-word";
      span.textContent = w;
      line.appendChild(span);
    });
    el.appendChild(line);
  }

  function revealHeading(el, trigger, start) {
    if (!el) return;
    splitWords(el);
    var words = el.querySelectorAll(".k-word");
    if (!words.length) return;
    gsap.fromTo(
      words,
      { yPercent: 115, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.045,
        scrollTrigger: { trigger: trigger || el, start: start || "top 86%", once: true },
        onComplete: function () { el.classList.add("is-revealed"); },
      }
    );
  }

  /* ---------- Everything that depends on the viewport ---------- */
  var mm = gsap.matchMedia();

  mm.add(
    {
      desktop: "(min-width: 900px)",
      phone: "(max-width: 899px)",
    },
    function (ctx) {
      var desktop = ctx.conditions.desktop;
      var cleanups = [];

      /* Hero: the entrance is CSS. Desktop adds a scroll-away drift. */
      var hero = document.querySelector(".hero");
      var heroContent = document.querySelector(".hero-content");
      if (desktop && hero && heroContent) {
        gsap.to(heroContent, {
          y: -90,
          opacity: 0.15,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
      }

      /* Chapter dots (wide screens only; CSS hides them below 1100px) */
      if (window.innerWidth >= 1100) {
        var host = document.createElement("div");
        host.className = "k-chapter";
        host.setAttribute("aria-hidden", "true");
        ["hero", "reel", "difference", "service", "occasions", "menu", "contact"].forEach(function (id) {
          var sec = document.getElementById(id);
          if (!sec) return;
          var dot = document.createElement("span");
          host.appendChild(dot);
          ScrollTrigger.create({
            trigger: sec,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: function (self) {
              if (!self.isActive) return;
              [].forEach.call(host.children, function (d) {
                d.classList.toggle("is-on", d === dot);
              });
            },
          });
        });
        if (host.children.length) {
          document.body.appendChild(host);
          cleanups.push(function () { host.remove(); });
        }
      }

      /* Reel */
      var pin = document.querySelector(".k-pin");
      var track = document.getElementById("k-track");
      var rail = document.getElementById("k-rail-fill");
      var pinTitle = document.querySelector(".k-pin-title");

      if (pin && track) {
        var cards = [].slice.call(track.querySelectorAll(".k-card"));

        if (desktop) {
          revealHeading(pinTitle, pin, "top 80%");

          var imgs = cards.map(function (c) { return c.querySelector("img"); });
          var setScale = imgs.map(function (img) { return img ? gsap.quickSetter(img, "scale") : null; });
          var setRail = rail ? gsap.quickSetter(rail, "scaleX") : null;
          gsap.set(imgs.filter(Boolean), { scale: 1.22 });

          var travel = function () {
            return Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
          };

          gsap.to(track, {
            x: function () { return -travel(); },
            ease: "none",
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              end: function () { return "+=" + (travel() + window.innerHeight * 0.55); },
              pin: true,
              scrub: 0.65,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: function (self) {
                if (setRail) setRail(self.progress);
                var n = cards.length;
                for (var i = 0; i < n; i++) {
                  if (!setScale[i]) continue;
                  var center = (i + 0.5) / n;
                  var near = 1 - Math.min(1, Math.abs(self.progress - center) * n * 0.85);
                  setScale[i](1.22 - near * 0.17);
                }
              },
            },
          });
        } else {
          revealHeading(pinTitle, pin, "top 86%");
          // stacked cards: each one rises as it arrives
          gsap.set(cards, { y: 32, opacity: 0 });
          ScrollTrigger.batch(cards, {
            start: "top 90%",
            once: true,
            onEnter: function (batch) {
              gsap.to(batch, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out", overwrite: true });
            },
          });
        }
      }

      /* Section headings */
      document.querySelectorAll(".editorial-head h2").forEach(function (h) {
        revealHeading(h, h, desktop ? "top 84%" : "top 88%");
      });

      /* Generic [data-anim] rise (one gentle move, no scale) */
      var handledElsewhere = ".craft-card, .mx-card, .flow-item, #promise, .menu-panel";
      gsap.utils.toArray("[data-anim]").forEach(function (el) {
        if (el.matches(handledElsewhere)) return;
        if (el.querySelector(".k-word")) return;
        gsap.fromTo(
          el,
          { y: desktop ? 42 : 26, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: desktop ? 1.05 : 0.8,
            ease: "power3.out",
            delay: parseFloat(el.style.getPropertyValue("--d")) || 0,
            scrollTrigger: { trigger: el, start: desktop ? "top 88%" : "top 92%", once: true },
            onStart: function () { el.classList.add("is-in"); },
          }
        );
      });

      /* Image parallax inside media frames: mouse and trackpad desktops only */
      if (desktop && finePointer) {
        gsap.utils
          .toArray(".craft-figure img, .service-banner img, .occ-figure img, .media img")
          .forEach(function (img) {
            gsap.fromTo(
              img,
              { yPercent: -8, scale: 1.16 },
              {
                yPercent: 8,
                scale: 1.05,
                ease: "none",
                scrollTrigger: {
                  trigger: img.closest(".media, figure") || img,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );
          });
      }

      /* Craft cards */
      var craftCards = gsap.utils.toArray(".craft-card");
      if (craftCards.length) {
        if (desktop) {
          craftCards.forEach(function (card, i) {
            gsap.fromTo(
              card,
              { y: 64, opacity: 0, rotateX: 10, transformPerspective: 900, transformOrigin: "50% 100%" },
              {
                y: 0,
                opacity: 1,
                rotateX: 0,
                duration: 1.15,
                ease: "power3.out",
                delay: i * 0.08,
                scrollTrigger: { trigger: card, start: "top 90%", once: true },
                onStart: function () { card.classList.add("is-in"); },
              }
            );
          });
        } else {
          // phone: one swipeable row, so one trigger for the whole row
          gsap.fromTo(
            craftCards,
            { y: 32, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.08,
              ease: "power2.out",
              scrollTrigger: { trigger: craftCards[0].parentElement, start: "top 88%", once: true },
              onStart: function () {
                craftCards.forEach(function (c) { c.classList.add("is-in"); });
              },
            }
          );
        }
      }

      /* Service flow */
      var flowItems = gsap.utils.toArray(".flow-item");
      if (flowItems.length) {
        gsap.from(flowItems, {
          x: desktop ? -24 : 0,
          y: desktop ? 0 : 20,
          opacity: 0,
          duration: 0.9,
          stagger: 0.14,
          ease: "power3.out",
          scrollTrigger: { trigger: flowItems[0].parentElement, start: "top 78%", once: true },
        });
      }

      /* Promise panel */
      var promise = document.getElementById("promise");
      if (promise) {
        gsap.fromTo(
          promise,
          { scale: 0.94, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: promise, start: "top 84%", once: true },
          }
        );
      }

      /* Menu cards: cascade in when the section arrives, and again whenever a tab opens a new panel */
      var cascade = function (cards) {
        gsap.fromTo(
          cards,
          { y: desktop ? 48 : 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            stagger: 0.07,
            ease: "power3.out",
            overwrite: "auto",
            onStart: function () {
              [].forEach.call(cards, function (c) { c.classList.add("is-in"); });
            },
          }
        );
      };

      var activePanel = document.querySelector(".menu-panel.active");
      var firstShow = null;
      if (activePanel) {
        var firstCards = activePanel.querySelectorAll(".mx-card");
        if (firstCards.length) {
          gsap.set(firstCards, { y: desktop ? 48 : 28, opacity: 0 });
          firstShow = ScrollTrigger.create({
            trigger: activePanel,
            start: "top 85%",
            once: true,
            onEnter: function () { cascade(firstCards); },
          });
        }
      }

      var onPanel = function (e) {
        var panel = e.detail && e.detail.panel;
        if (!panel) return;
        if (firstShow) { firstShow.kill(); firstShow = null; }
        var cards = panel.querySelectorAll(".mx-card");
        if (cards.length) cascade(cards);
        // panels differ in height; every trigger below this section must re-measure
        gsap.delayedCall(0.05, function () { ScrollTrigger.refresh(); });
      };
      document.addEventListener("pour:panelchange", onPanel);
      cleanups.push(function () { document.removeEventListener("pour:panelchange", onPanel); });

      /* Footer */
      var footer = document.querySelector(".footer");
      if (footer) {
        gsap.from(footer.children, {
          y: 24,
          opacity: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: { trigger: footer, start: "top 94%", once: true },
        });
      }

      return function () {
        cleanups.forEach(function (fn) { fn(); });
      };
    }
  );

  /* ---------- Re-measure once things that change layout have settled ---------- */
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  setTimeout(function () { ScrollTrigger.refresh(); }, 1600);
})();
