/* Pour Poa — main interactions */

document.addEventListener('DOMContentLoaded', () => {
  const WA_NUMBER = '254708736114';

  // Year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Sticky header state (rAF-throttled)
  const header = document.querySelector('.header');
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.setAttribute('aria-expanded', 'false');
    const setOpen = open => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  }

  // Nav scrollspy
  const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const spyTargets = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && spyTargets.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyTargets.forEach(t => spy.observe(t));
  }

  // Menu tabs
  const tabs = document.querySelectorAll('.menu-tab');
  const panels = document.querySelectorAll('.menu-panel');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach(p => {
        p.classList.remove('active');
        if (p.id === 'panel-' + target) p.classList.add('active');
      });
    });
  });

  // Estimator
  const guestsInput = document.getElementById('guests');
  const hoursInput = document.getElementById('hours');
  const guestsVal = document.getElementById('guests-val');
  const hoursVal = document.getElementById('hours-val');
  const estimateEl = document.getElementById('estimate-range');

  const rates = {
    full: { base: 45000, perGuest: 1200, perHour: 8000 },
    cocktails: { base: 35000, perGuest: 950, perHour: 6500 },
    mocktails: { base: 28000, perGuest: 650, perHour: 5000 }
  };

  function formatKSh(n) {
    return 'KSh ' + Math.round(n).toLocaleString('en-KE');
  }

  function updateEstimate() {
    if (!guestsInput || !hoursInput) return;
    const guests = parseInt(guestsInput.value, 10);
    const hours = parseInt(hoursInput.value, 10);
    const pkg = document.querySelector('input[name="package"]:checked')?.value || 'full';
    const r = rates[pkg];
    const mid = r.base + guests * r.perGuest + hours * r.perHour;
    const low = mid * 0.85;
    const high = mid * 1.15;
    if (estimateEl) estimateEl.textContent = formatKSh(low) + ' – ' + formatKSh(high);
    if (guestsVal) guestsVal.textContent = guests;
    if (hoursVal) hoursVal.textContent = hours;
  }

  if (guestsInput) {
    guestsInput.addEventListener('input', updateEstimate);
    hoursInput.addEventListener('input', updateEstimate);
    document.querySelectorAll('input[name="package"]').forEach(r => {
      r.addEventListener('change', () => {
        document.querySelectorAll('.package-option').forEach(o => o.classList.remove('active'));
        r.closest('.package-option')?.classList.add('active');
        updateEstimate();
      });
    });
    updateEstimate();
  }

  // Quote form refs (used by the estimator hand-off and the submit flow)
  const enquiryForm = document.getElementById('enquiry-form');

  // Lock estimate → prefill enquiry. Values the visitor typed are never overwritten;
  // values we filled ourselves (data-auto) refresh if they lock a new estimate.
  const lockBtn = document.getElementById('lock-estimate');
  if (lockBtn && enquiryForm) {
    const chipMap = { full: 'Full Bar Service', cocktails: 'Cocktails Only', mocktails: 'Mocktails' };

    const autoFill = (field, value) => {
      if (!field || value === '') return;
      if (!field.value || field.dataset.auto === '1') {
        field.value = value;
        field.dataset.auto = '1';
        field.addEventListener('input', () => { delete field.dataset.auto; }, { once: true });
      }
    };

    lockBtn.addEventListener('click', () => {
      const guests = guestsInput?.value || '';
      const hours = hoursInput?.value || '';
      const pkg = document.querySelector('input[name="package"]:checked')?.value || '';
      const range = estimateEl?.textContent || '';

      autoFill(enquiryForm.querySelector('textarea[name="notes"]'),
        `Estimator: ${guests} guests, ${hours}h, package: ${pkg}. Range: ${range}`);
      autoFill(enquiryForm.querySelector('input[name="guests"]'), guests);
      autoFill(enquiryForm.querySelector('input[name="duration"]'), hours);

      const chips = enquiryForm.querySelectorAll('input[name="services"]');
      const chip = enquiryForm.querySelector(`input[name="services"][value="${chipMap[pkg]}"]`);
      if (chip && !Array.from(chips).some(c => c.checked)) chip.checked = true;

      // Land the visitor on the first thing left to fill (skipped on touch so the keyboard stays down)
      if (window.matchMedia('(pointer: fine)').matches) {
        setTimeout(() => {
          const next = Array.from(enquiryForm.querySelectorAll('[required]')).find(f => !f.value);
          if (next) next.focus({ preventScroll: true });
        }, 700);
      }
    });
  }

  // Feedback modal
  const modal = document.getElementById('feedback-modal');
  const openBtn = document.getElementById('open-feedback');
  const closeBtn = document.getElementById('close-feedback');
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackSuccess = document.getElementById('feedback-success');
  const ratings = {};
  let lastFocus = null;
  let closeTimer = null;

  function buildStars() {
    document.querySelectorAll('.stars').forEach(container => {
      const name = container.dataset.name;
      ratings[name] = 0;
      for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '★';
        btn.dataset.value = i;
        btn.setAttribute('aria-label', i + (i === 1 ? ' star' : ' stars'));
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => {
          ratings[name] = i;
          container.querySelectorAll('button').forEach((s, idx) => {
            s.classList.toggle('active', idx < i);
            s.setAttribute('aria-pressed', String(idx === i - 1));
          });
        });
        container.appendChild(btn);
      }
    });
  }
  buildStars();

  // Reopening always starts clean (previously the thank-you state stuck after the first submit)
  function resetFeedback() {
    if (!feedbackForm) return;
    feedbackForm.reset();
    feedbackForm.style.display = '';
    feedbackSuccess?.classList.remove('show');
    Object.keys(ratings).forEach(k => { ratings[k] = 0; });
    document.querySelectorAll('.stars button').forEach(s => {
      s.classList.remove('active');
      s.setAttribute('aria-pressed', 'false');
    });
  }

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    clearTimeout(closeTimer);
    resetFeedback();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeBtn?.focus());
  }

  function closeModal() {
    if (!modal) return;
    clearTimeout(closeTimer);
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
    // Escape closes; Tab stays inside the dialog
    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key !== 'Tab') return;
      const focusables = Array.from(modal.querySelectorAll('button, input, select, textarea, a[href]'))
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', e => {
      e.preventDefault();
      feedbackForm.style.display = 'none';
      feedbackSuccess.classList.add('show');
      closeTimer = setTimeout(closeModal, 2600);
    });
  }

  // Enquiry form → WhatsApp
  if (enquiryForm) {
    const DRAFT_KEY = 'pourpoa:enquiry-draft';
    const submitBtn = enquiryForm.querySelector('.q-submit');
    const submitLabel = enquiryForm.querySelector('.q-submit-label');
    const note = enquiryForm.querySelector('.q-note');
    const defaultLabel = submitLabel ? submitLabel.textContent : '';
    const defaultNote = note ? note.textContent : '';

    // No past dates
    const dateField = enquiryForm.querySelector('input[type="date"]');
    if (dateField) {
      const t = new Date();
      t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
      dateField.min = t.toISOString().slice(0, 10);
    }

    // Keep a draft for this tab so browsing the menu or estimator never costs them their answers
    const saveDraft = () => {
      try {
        const data = {};
        new FormData(enquiryForm).forEach((v, k) => { (data[k] = data[k] || []).push(v); });
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch (err) { /* storage unavailable: skip */ }
    };
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
      if (saved) {
        Object.keys(saved).forEach(name => {
          enquiryForm.querySelectorAll(`[name="${name}"]`).forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') el.checked = saved[name].indexOf(el.value) !== -1;
            else if (!el.value) el.value = saved[name][0];
          });
        });
      }
    } catch (err) { /* ignore */ }
    enquiryForm.addEventListener('input', saveDraft);
    enquiryForm.addEventListener('change', saveDraft);

    enquiryForm.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(enquiryForm);
      const services = fd.getAll('services').join(', ') || 'Not specified';
      const alcohol = fd.get('alcohol') || 'Undecided';
      const lines = [
        'Hi Pour Poa! I would like to request a quote for a mobile bar.',
        '',
        `Name: ${fd.get('name')}`,
        `Phone: ${fd.get('phone')}`,
        `Email: ${fd.get('email') || '—'}`,
        `Event date: ${fd.get('date')}`,
        `Location: ${fd.get('location')}`,
        `Guests: ${fd.get('guests')}`,
        `Duration: ${fd.get('duration') || '—'} hours`,
        `Services: ${services}`,
        `Client-provided alcohol: ${alcohol}`,
        `Notes / budget: ${fd.get('notes') || '—'}`
      ];
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;

      if (submitBtn) submitBtn.setAttribute('aria-busy', 'true');
      if (submitLabel) submitLabel.textContent = 'Opening WhatsApp…';

      const w = window.open(url, '_blank');
      if (w) w.opener = null;
      else window.location.href = url;   // popup blocked: continue in this tab

      if (note) note.textContent = 'WhatsApp should now be open with your request ready to send. If it did not open, tap the button again.';
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }

      setTimeout(() => {
        if (submitBtn) submitBtn.removeAttribute('aria-busy');
        if (submitLabel) submitLabel.textContent = defaultLabel;
        if (note) note.textContent = defaultNote;
      }, 4500);
    });
  }

  // Floating WhatsApp steps aside while the quote form is on screen
  const waFloat = document.querySelector('.wa-float');
  const contactSection = document.getElementById('contact');
  if (waFloat && contactSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const hide = entry.isIntersecting;
      waFloat.classList.toggle('is-hidden', hide);
      waFloat.tabIndex = hide ? -1 : 0;
      waFloat.setAttribute('aria-hidden', String(hide));
    }, { threshold: 0.15 }).observe(contactSection);
  }

  // Mobile: hide header on scroll down, show on scroll up
  (function () {
    const header = document.querySelector('.header');
    if (!header) return;
    let lastY = window.scrollY;
    let ticking = false;
    const mq = window.matchMedia('(max-width: 47.99rem)');
    const update = () => {
      const y = window.scrollY;
      if (!mq.matches) {
        header.classList.remove('header-hidden');
        lastY = y;
        ticking = false;
        return;
      }
      if (y > lastY + 8 && y > 80) {
        header.classList.add('header-hidden');
      } else if (y < lastY - 8) {
        header.classList.remove('header-hidden');
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
  })();

  // Mobile sticky-note FAB + popover
  (function () {
    const fab = document.getElementById('sticky-fab');
    const pop = document.getElementById('sticky-popover');
    const closeBtn = document.getElementById('sticky-popover-close');
    if (!fab || !pop) return;

    const open = () => {
      pop.hidden = false;
      fab.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => pop.classList.add('is-open'));
    };
    const close = () => {
      pop.classList.remove('is-open');
      fab.setAttribute('aria-expanded', 'false');
      setTimeout(() => { pop.hidden = true; }, 220);
    };

    fab.addEventListener('click', () => {
      if (pop.hidden) open();
      else close();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    pop.addEventListener('click', (e) => {
      if (e.target === pop) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) close();
    });
  })();

});
