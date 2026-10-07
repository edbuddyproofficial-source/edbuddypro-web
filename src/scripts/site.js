/* ═══════════════════════════════════════════════════════════
   edBuddy Pro — site.js   (loaded on every page)

   1. EBP core     config read from <meta name="ebp:*">, toast
   2. Leads        every form[data-lead] and the call-back panel go
                   through EBP.submitLead() — the one place to wire
                   a backend (see README → "Connecting the forms")
   3. Consent      cookie banner; GA4 loads only after "Accept"
   4. Nav          menu, mega-menu filter, scroll state
   5. Bottom bar   sticky call-back bar and panel; any
                   [data-callback-open] button opens the panel
   ═══════════════════════════════════════════════════════════ */

/* ── 1. core ─────────────────────────────────────────────── */
var EBP = window.EBP = window.EBP || {};
(function () {
  'use strict';
  function meta(n) { var m = document.querySelector('meta[name="ebp:' + n + '"]'); return m ? m.content : ''; }
  EBP.config = { ga4: meta('ga4'), leadEndpoint: meta('lead-endpoint'), email: meta('email') || 'hello@edbuddypro.com' };

  EBP.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var toastEl, toastT;
  EBP.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ebp-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 4200);
  };
})();

/* ── 2. leads ────────────────────────────────────────────────
   EBP.submitLead(kind, data) → Promise
   · leadEndpoint set (site.config.json → leads.endpoint): POSTs JSON
     { kind, page, data, at } to it.
   · not set yet: opens the visitor's mail app with the details
     addressed to the site email, so no enquiry is ever dropped.   */
(function () {
  'use strict';
  EBP.submitLead = function (kind, data) {
    var payload = { kind: kind, page: location.pathname, data: data, at: new Date().toISOString() };
    if (EBP.config.leadEndpoint) {
      return fetch(EBP.config.leadEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        EBP.toast('Thanks. We’ll be in touch within one working day.');
      }).catch(function () {
        EBP.toast('That didn’t go through. Please email ' + EBP.config.email + '.');
        throw new Error('lead failed');
      });
    }
    var lines = Object.keys(data).filter(function (k) { return data[k]; })
      .map(function (k) { return k.charAt(0).toUpperCase() + k.slice(1) + ': ' + data[k]; });
    var subject = { callback: 'Call-back request', newsletter: 'Newsletter sign-up',
      business: 'Team training enquiry', enquiry: 'Course enquiry',
      enrol: 'Enrolment: AI for HR Professionals', waitlist: 'Waitlist' }[kind] || 'Enquiry';
    location.href = 'mailto:' + EBP.config.email + '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n') + '\n\nSent from ' + location.href);
    return Promise.resolve();
  };

  function fieldName(el) {
    return el.name || el.getAttribute('aria-label') || el.id ||
      (el.labels && el.labels[0] && el.labels[0].textContent) || el.placeholder || 'field';
  }
  function collect(form) {
    var out = {};
    [].forEach.call(form.elements, function (el) {
      if (!el.name && !el.id && !el.getAttribute('aria-label') && !(el.labels && el.labels.length)) return;
      if (/^(submit|button|reset)$/.test(el.type)) return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      var k = fieldName(el).replace(/\*$/, '').trim().toLowerCase();
      if (el.value) out[k] = el.value.trim();
    });
    return out;
  }

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-lead]');
    if (!form) return;
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    EBP.submitLead(form.dataset.lead, collect(form))
      .then(function () { form.reset(); })
      .catch(function () {})
      .then(function () { if (btn) btn.disabled = false; });
  });
})();

/* ── 3. consent ──────────────────────────────────────────────
   Vercel Analytics is cookieless and runs regardless. Anything that
   sets cookies (GA4) waits for "Accept all".                       */
(function () {
  'use strict';
  var KEY = 'ebp-consent';

  function loadGA() {
    var id = EBP.config.ga4;
    if (!id || window.gtag) return;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true });
  }

  function banner() {
    if (document.getElementById('ebpConsent')) return;
    var el = document.createElement('section');
    el.id = 'ebpConsent';
    el.className = 'ebp-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie preferences');
    el.innerHTML =
      '<p class="ebp-consent-t">Cookies, briefly.</p>' +
      '<p class="ebp-consent-d">We use essential cookies to run the site. With your OK we also measure ' +
      'which pages help people, so we can improve them. <a href="/legal/cookie-policy">Cookie policy</a></p>' +
      '<div class="ebp-consent-a">' +
      '<button type="button" class="ebp-btn ebp-btn--ghost" data-c="essential">Essential only</button>' +
      '<button type="button" class="ebp-btn" data-c="all">Accept all</button></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      EBP.store.set(KEY, b.dataset.c);
      if (b.dataset.c === 'all') loadGA();
      el.classList.remove('is-on');
      setTimeout(function () { el.remove(); }, 400);
    });
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-on'); });
  }

  EBP.openConsent = banner;
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-consent-open]')) { e.preventDefault(); banner(); }
  });

  var choice = EBP.store.get(KEY);
  if (choice === 'all') loadGA();
  else if (!choice) setTimeout(banner, 900);
})();

/* ── 4. nav ───────────────────────────────────────────────── */
(function () {
  var bar = document.getElementById('navbar');
  if (!bar) return;

  var toggle = bar.querySelector('.nav-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    var open = bar.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* mobile: Courses opens the card list in place */
  bar.querySelectorAll('[data-nm-acc]').forEach(function (btn) {
    var panel = btn.nextElementSibling;
    if (!panel) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  bar.querySelectorAll('.nav-dropdown-wrapper').forEach(function (w) {
    var t = w.querySelector('.nav-dropdown-trigger');
    if (t) t.addEventListener('click', function (e) {
      e.stopPropagation();
      w.classList.toggle('open');
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dropdown-wrapper'))
      bar.querySelectorAll('.nav-dropdown-wrapper.open')
         .forEach(function (w) { w.classList.remove('open'); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    bar.classList.remove('menu-open');
    bar.querySelectorAll('.nav-dropdown-wrapper.open')
       .forEach(function (w) { w.classList.remove('open'); });
  });

  // shrink/shadow the bar once the page scrolls
  var ticking = false;
  function onScroll() {
    bar.classList.toggle('scrolled', window.scrollY > 20);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  bar.querySelectorAll('.nav-mobile a').forEach(function (a) {
    a.addEventListener('click', function () { bar.classList.remove('menu-open'); });
  });


  /* courses menu — category filter */
  (function () {
    var menu = bar.querySelector('.mega-menu');
    if (!menu) return;
    var cats = [].slice.call(menu.querySelectorAll('.mn-cat')),
        cards = [].slice.call(menu.querySelectorAll('.mn-card'));
    cats.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var want = btn.dataset.cat;
        cats.forEach(function (b) { b.classList.toggle('on', b === btn); });
        cards.forEach(function (c) {
        var has = (' ' + (c.dataset.cat || '') + ' ').indexOf(' ' + want + ' ') > -1;
        c.hidden = !(want === 'all' || has);
      });
      });
    });
  })();

  // active link (clean URLs: /courses/ai-for-hr)
  var here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  bar.querySelectorAll('a[href^="/"]').forEach(function (a) {
    if (a.getAttribute('href').split('#')[0] === here) {
      a.setAttribute('aria-current', 'page');
      a.classList.add('is-current');
    }
  });
})();

/* ── 5. bottom bar ────────────────────────────────────────── */
(function () {
  var bar = document.querySelector('.cbar');
  if (!bar) return;

  var trig  = document.getElementById('cbTrigger'),
      panel = document.getElementById('cbPanel'),
      close = document.getElementById('cbClose'),
      form  = document.getElementById('cbForm'),
      err   = document.getElementById('cbErr'),
      chat  = null;

  function open(v) {
    if (!panel) return;
    panel.hidden = !v;
    if (trig) trig.setAttribute('aria-expanded', v ? 'true' : 'false');
    /* Focusing a field on open makes the phone keyboard leap up and cover the
       form. Move focus to the panel itself instead — keyboard users still land
       in the right place, and the keyboard appears only when a field is tapped. */
    if (v) {
      var coarse = window.matchMedia('(pointer: coarse)').matches;
      if (coarse) { panel.setAttribute('tabindex', '-1'); panel.focus({ preventScroll: true }); }
      else { var n = document.getElementById('cbName'); if (n) n.focus(); }
    }
  }

  if (trig)  trig.addEventListener('click', function () { open(panel.hidden); });
  if (close) close.addEventListener('click', function () { open(false); trig && trig.focus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel && !panel.hidden) { open(false); trig && trig.focus(); }
  });

  if (panel) panel.querySelectorAll('.cbp-seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      panel.querySelectorAll('.cbp-seg button').forEach(function (o) {
        o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
      });
    });
  });

  ['cbName', 'cbEmail', 'cbPhone', 'cbProgram', 'cbConsent'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el || !err) return;
    el.addEventListener('input',  function () { err.hidden = true; });
    el.addEventListener('change', function () { err.hidden = true; });
  });

  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (id) { var n = document.getElementById(id); return n ? n.value.trim() : ''; },
        ok = document.getElementById('cbConsent'), msg = '';
    if (!v('cbName')) msg = 'Enter your name.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('cbEmail'))) msg = 'Enter a valid email address.';
    else if (v('cbPhone').replace(/\D/g, '').length < 7) msg = 'Enter a valid phone number.';
    else if (!v('cbProgram')) msg = 'Choose a program.';
    else if (ok && !ok.checked) msg = 'Please accept the terms to continue.';
    if (err) {
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
    }
    var seg = panel.querySelector('.cbp-seg [aria-pressed="true"]');
    EBP.submitLead('callback', {
      name: v('cbName'), email: v('cbEmail'),
      phone: (panel.querySelector('.cbp-cc') || {}).value + ' ' + v('cbPhone'),
      program: v('cbProgram'), for: seg ? seg.textContent.trim() : ''
    }).then(function () { form.reset(); open(false); });
  });

  var ticking = false;
  function threshold() {
    var hero = document.querySelector('.sp-hero, .co-hero');
    return hero ? hero.offsetTop + hero.offsetHeight - 120
                : Math.round(window.innerHeight * 0.7);
  }
  var forced = false;
  EBP.openCallback = function () {
    forced = true; bar.classList.add('is-on'); open(true);
  };
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-callback-open]')) { e.preventDefault(); EBP.openCallback(); }
  });
  if (close) close.addEventListener('click', function () { forced = false; sync(); });

  function sync() {
    var on = forced || window.pageYOffset > threshold();
    bar.classList.toggle('is-on', on);
    if (!on && panel && !panel.hidden) open(false);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(sync); }
  }, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
})();
