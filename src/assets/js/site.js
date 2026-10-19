(function () {
  'use strict';
  var safeStore = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} }
  };

  /* Desktop submenus: separate toggle buttons, keyboard + touch + pointer */
  var toggles = document.querySelectorAll('.sub-toggle');
  function closeAll(except) {
    toggles.forEach(function (t) {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      var m = document.getElementById(t.getAttribute('aria-controls'));
      if (m) m.classList.remove('open');
    });
  }
  toggles.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = t.getAttribute('aria-expanded') === 'true';
      closeAll(t);
      t.setAttribute('aria-expanded', String(!open));
      document.getElementById(t.getAttribute('aria-controls')).classList.toggle('open', !open);
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav-item')) closeAll(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openT = document.querySelector('.sub-toggle[aria-expanded="true"]');
    if (openT) { closeAll(); openT.focus(); }
    if (menuBtn && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });

  /* Mobile menu */
  var menuBtn = document.querySelector('.menu-btn');
  var mobileNav = document.getElementById('mobile-nav');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    mobileNav.classList.toggle('open', open);
    menuBtn.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
  }
  if (menuBtn && mobileNav) menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });

  /* Mobile action bar steps aside while someone is typing, so it never covers inputs */
  var bar = document.getElementById('action-bar');
  if (bar) {
    document.addEventListener('focusin', function (e) { if (e.target.matches('input,select,textarea')) bar.classList.add('hidden'); });
    document.addEventListener('focusout', function (e) { if (e.target.matches('input,select,textarea')) bar.classList.remove('hidden'); });
  }

  /* First-touch attribution, kept in the session only, sent with a lead, never to analytics */
  if (!safeStore.get('sessionStorage', 'ng_src')) {
    var q = new URLSearchParams(location.search);
    var src = { landing: location.pathname, ref: document.referrer ? new URL(document.referrer).hostname : '' };
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) { if (q.get(k)) src[k] = q.get(k).slice(0, 120); });
    safeStore.set('sessionStorage', 'ng_src', JSON.stringify(src));
  }

  /* Analytics hook. No tool is installed; events go to dataLayer only if one is added with consent. Never include PII. */
  function track(name, params) { if (window.dataLayer) window.dataLayer.push(Object.assign({ event: name }, params || {})); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    if (a.href.indexOf('tel:') === 0) track('phone_link_click', { page: location.pathname });
    else if (a.getAttribute('href') && a.getAttribute('href').indexOf('/contact-us/') !== -1) track('consultation_cta_click', { page: location.pathname });
  });

  /* Portfolio: category filter chips + lightbox. Without JS every photo shows and links to the full image. */
  var chips = document.querySelectorAll('.pf-chip');
  if (chips.length) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.pf-grid .pf-item'));
    var pfStatus = document.getElementById('pf-status');
    var pfCta = document.getElementById('pf-cta');
    var interestFor = { motorized: 'motorized-shades', shutters: 'shutters', 'solar-shades': 'roller-solar', zebra: 'zebra', 'faux-wood': 'blinds', drapery: 'drapery' };
    var applyFilter = function (cat, chip) {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      var shown = 0;
      items.forEach(function (li) { var on = cat === 'all' || li.getAttribute('data-cat') === cat; li.hidden = !on; if (on) shown++; });
      if (pfStatus) pfStatus.textContent = 'Showing ' + shown + ' photos' + (cat === 'all' ? '' : ' of ' + chip.firstChild.textContent.trim());
      if (pfCta) pfCta.setAttribute('href', pfCta.getAttribute('href').split('?')[0] + (interestFor[cat] ? '?interest=' + interestFor[cat] : ''));
    };
    var selectChip = function (c) {
      if (c.getAttribute('aria-pressed') === 'true') return;
      var cat = c.getAttribute('data-filter');
      applyFilter(cat, c);
      try { history.replaceState(null, '', cat === 'all' ? location.pathname : '?cat=' + cat); } catch (e) {}
    };
    // Mouse users switch tabs by hovering. A short delay stops tabs flickering as the pointer passes over them.
    // Touch and keyboard still use tap/click.
    var hoverTimer = null;
    chips.forEach(function (c) {
      c.addEventListener('click', function () { clearTimeout(hoverTimer); selectChip(c); });
      c.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { selectChip(c); }, 120);
      });
      c.addEventListener('pointerleave', function () { clearTimeout(hoverTimer); });
    });
    var startCat = new URLSearchParams(location.search).get('cat');
    var startChip = startCat && document.querySelector('.pf-chip[data-filter="' + CSS.escape(startCat) + '"]');
    if (startChip) applyFilter(startCat, startChip);

    var box = document.getElementById('pf-lightbox');
    if (box && typeof box.showModal === 'function') {
      var boxImg = box.querySelector('img'), boxCap = box.querySelector('figcaption'), current = -1;
      var visible = function () { return items.filter(function (li) { return !li.hidden; }); };
      var show = function (li) {
        var a = li.querySelector('a'), img = li.querySelector('img');
        boxImg.src = a.href; boxImg.alt = img.alt;
        boxCap.textContent = a.getAttribute('data-caption') + ': ' + img.alt;
        current = visible().indexOf(li);
      };
      var step = function (d) { var v = visible(); if (v.length) show(v[(current + d + v.length) % v.length]); };
      items.forEach(function (li) {
        li.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); show(li); box.showModal(); });
      });
      box.querySelector('.pf-close').addEventListener('click', function () { box.close(); });
      box.querySelector('.pf-prev').addEventListener('click', function () { step(-1); });
      box.querySelector('.pf-next').addEventListener('click', function () { step(1); });
      box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
      box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });
    }
  }

  /* Ad landing pages: ?area=avenir swaps the city into the headline. Only keys from the built-in list are accepted. */
  var areaEl = document.querySelector('[data-area]');
  if (areaEl) {
    var areaKey = (new URLSearchParams(location.search).get('area') || '').toLowerCase().replace(/[^a-z-]/g, '');
    var areas = {};
    try { areas = JSON.parse(areaEl.getAttribute('data-areas') || '{}'); } catch (e) {}
    if (areaKey && Object.prototype.hasOwnProperty.call(areas, areaKey)) {
      areaEl.textContent = areas[areaKey];
      document.title = document.title.replace('Palm Beach County', areas[areaKey]);
    }
  }

  /* Lead form */
  var form = document.getElementById('lead-form');
  if (!form) return;

  var params = new URLSearchParams(location.search);
  var interest = params.get('interest');
  if (interest) {
    var opt = form.querySelector('select[name="interest"] option[value="' + CSS.escape(interest) + '"]');
    if (opt) { opt.selected = true; var od = document.getElementById('optional-details'); if (od) od.open = true; }
  }

  var methodInputs = form.querySelectorAll('input[name="contact_method"]');
  var phoneWrap = document.getElementById('f-phone-wrap');
  var emailWrap = document.getElementById('f-email-wrap');
  function syncMethod() {
    var m = (form.querySelector('input[name="contact_method"]:checked') || {}).value || 'phone';
    var phone = form.elements.phone, email = form.elements.email;
    phone.required = m !== 'email'; email.required = m === 'email';
    phoneWrap.querySelector('.req-label').textContent = phone.required ? '' : ' (optional)';
    emailWrap.querySelector('.req-label').textContent = email.required ? '' : ' (optional)';
    phoneWrap.classList.remove('has-error'); emailWrap.classList.remove('has-error');
    phone.removeAttribute('aria-invalid'); email.removeAttribute('aria-invalid');
  }
  methodInputs.forEach(function (i) { i.addEventListener('change', syncMethod); });
  syncMethod();

  var started = false;
  form.addEventListener('input', function () { if (!started) { started = true; track('lead_form_start', { page: location.pathname }); } });

  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Enter your name.'; },
    zip: function (v) { return /^\d{5}$/.test(v.trim()) ? '' : 'Enter a 5-digit ZIP code.'; },
    phone: function (v, el) {
      if (!el.required && !v.trim()) return '';
      return v.replace(/\D/g, '').replace(/^1/, '').length === 10 ? '' : 'Enter a 10-digit phone number.';
    },
    email: function (v, el) {
      if (!el.required && !v.trim()) return '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com.';
    }
  };
  var labels = { name: 'Name', zip: 'ZIP code', phone: 'Phone', email: 'Email' };

  function validate() {
    var errors = [];
    Object.keys(rules).forEach(function (k) {
      var el = form.elements[k];
      var msg = rules[k](el.value, el);
      var wrap = el.closest('.field');
      wrap.classList.toggle('has-error', !!msg);
      wrap.querySelector('.error').textContent = msg;
      if (msg) { el.setAttribute('aria-invalid', 'true'); errors.push({ id: el.id, label: labels[k], msg: msg }); }
      else el.removeAttribute('aria-invalid');
    });
    return errors;
  }

  var summary = document.getElementById('form-summary');
  var status = document.getElementById('form-status');
  var submit = form.querySelector('button[type="submit"]');
  var submitLabel = submit.querySelector('.label');
  var idemKey = null;
  var leadRef = null;

  function setStatus(kind, html) {
    status.className = 'form-status' + (kind ? ' show ' + kind : '');
    status.innerHTML = html || '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('', '');
    var errors = validate();
    if (errors.length) {
      summary.innerHTML = '<strong>Please fix ' + errors.length + (errors.length > 1 ? ' fields' : ' field') + ':</strong><ul>' +
        errors.map(function (er) { return '<li><a href="#' + er.id + '">' + er.label + ': ' + er.msg + '</a></li>'; }).join('') + '</ul>';
      summary.classList.add('show');
      summary.focus();
      track('lead_form_error', { category: 'validation', count: errors.length });
      return;
    }
    summary.classList.remove('show');

    // Same key for retries of the same attempt, so double clicks and retries cannot create duplicates.
    if (!idemKey) idemKey = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    var base = document.documentElement.getAttribute('data-base') || '';
    var netlify = form.getAttribute('data-provider') === 'netlify';
    var srcRaw = safeStore.get('sessionStorage', 'ng_src') || '';
    if (!leadRef) leadRef = newRef();
    // Netlify adds form-name to the deployed HTML; add it here too so local tests and older builds match.
    if (netlify && !form.elements['form-name']) { var fn = document.createElement('input'); fn.type = 'hidden'; fn.name = 'form-name'; fn.value = form.getAttribute('name'); form.appendChild(fn); }
    setHidden('ref', leadRef);
    setHidden('page', location.pathname);
    setHidden('attribution', netlify ? readableSource(srcRaw) : srcRaw);
    var data = Object.fromEntries(new FormData(form).entries());

    submit.disabled = true; form.classList.add('is-submitting'); submitLabel.textContent = 'Sending your request…';
    setStatus('wait', 'Sending your request. Please keep this page open.');

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 15000);
    // Netlify Forms: a standard urlencoded post to "/". Netlify stores it and emails the notification.
    // API mode: JSON to /api/lead (the Cloudflare function), which returns its own reference.
    var request = netlify
      ? fetch(base + '/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(form)).toString(), signal: ctrl.signal })
      : fetch(form.getAttribute('data-api'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
          body: JSON.stringify(data), signal: ctrl.signal });
    request.then(function (res) {
      if (netlify) return { res: res, body: res.ok ? { accepted: true, id: leadRef } : { message: 'We could not send your request.' } };
      return res.json().catch(function () { return {}; }).then(function (body) { return { res: res, body: body }; });
    }).then(function (r) {
      clearTimeout(timer);
      if (r.res.ok && r.body && r.body.accepted && r.body.id) {
        // Only a durable server acceptance reaches the confirmation page.
        safeStore.set('sessionStorage', 'ng_lead', JSON.stringify({ id: r.body.id, method: data.contact_method, at: Date.now() }));
        location.assign(base + '/thank-you/?ref=' + encodeURIComponent(r.body.id));
        return;
      }
      var msg = (r.body && r.body.message) || 'We could not send your request.';
      if (r.res.status === 422 && r.body.fields) {
        Object.keys(r.body.fields).forEach(function (k) {
          var el = form.elements[k]; if (!el) return;
          var w = el.closest('.field'); w.classList.add('has-error'); w.querySelector('.error').textContent = r.body.fields[k]; el.setAttribute('aria-invalid', 'true');
        });
      }
      fail(msg, r.res.status);
    }).catch(function () {
      clearTimeout(timer);
      fail('We could not reach our server. Your details are still here.', 0);
    });
  });

  // Reference shown to the customer and included in the lead email, e.g. NG-261018-4F2A9C. Reused on retries.
  function newRef() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    var rand = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(3)), function (b) { return b.toString(16).padStart(2, '0'); }).join('').toUpperCase();
    return 'NG-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + rand;
  }
  function setHidden(name, value) { var el = form.elements[name]; if (el) el.value = value; }
  // Turns the stored campaign tags into one readable line for the lead email.
  function readableSource(raw) {
    var s = {}; try { s = JSON.parse(raw || '{}'); } catch (e) {}
    var parts = [];
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) { if (s[k]) parts.push(k.replace('utm_', '') + ': ' + s[k]); });
    if (s.landing) parts.push('first page: ' + s.landing);
    if (s.ref) parts.push('referrer: ' + s.ref);
    return parts.join(' | ') || 'direct';
  }

  function fail(msg, code) {
    submit.disabled = false; form.classList.remove('is-submitting'); submitLabel.textContent = 'Try Again';
    setStatus('err', '<strong>' + msg + '</strong> You can try again, or call us at <a href="tel:' + form.dataset.phoneE164 + '">' + form.dataset.phone + '</a>.');
    status.focus();
    track('lead_form_error', { category: code ? 'server_' + code : 'network' });
    if (code === 422) idemKey = null;
  }
})();
