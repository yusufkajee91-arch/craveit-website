/* CraveIt — progressive enhancement for craveit.co.za.
   The pages are complete without this file. Each feature is wrapped so that one failure
   cannot break another, and interactive demo controls ship disabled until wired here.
   prefers-reduced-motion: no auto-cycling, no reveal transforms, no progress animation. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function safe(name, fn) {
    try { fn(); } catch (err) { if (window.console) console.warn('[craveit] ' + name + ' disabled:', err); }
  }

  /* 1. Reveal on scroll. Content is only hidden while the "js" class is present. */
  root.classList.add('js');
  try {
    var targets = all('[data-reveal], [data-grow]');
    var show = function (el) { el.classList.add('is-in'); };
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(show);
    } else {
      all('[data-reveal]').forEach(function (el) {
        var d = parseInt(el.getAttribute('data-reveal'), 10) || 0;
        if (d) el.style.transitionDelay = d + 'ms';
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      targets.forEach(function (el) { io.observe(el); });
    }
  } catch (err) {
    try { all('[data-reveal], [data-grow]').forEach(function (el) { el.classList.add('is-in'); }); }
    catch (e2) { root.classList.remove('js'); }
  }

  /* 2. Header: solid pill once the page has scrolled. */
  safe('header', function () {
    var hdr = doc.querySelector('.hdr');
    if (!hdr) return;
    var ticking = false;
    var update = function () { ticking = false; hdr.classList.toggle('is-scrolled', (window.pageYOffset || 0) > 24); };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });

  /* 3. Mobile menu (<= 900px): disclosure button, Escape closes, focus managed. */
  safe('menu', function () {
    var hdr = doc.querySelector('.hdr');
    var btn = hdr && hdr.querySelector('.menu-btn');
    var nav = doc.getElementById('site-nav');
    if (!btn || !nav) return;
    var isOpen = function () { return hdr.classList.contains('is-open'); };
    var setOpen = function (open, returnFocus) {
      hdr.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var first = nav.querySelector('a'); if (first) first.focus(); }
      else if (returnFocus) btn.focus();
    };
    btn.addEventListener('click', function () { setOpen(!isOpen(), false); });
    doc.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) { e.preventDefault(); setOpen(false, true); }
    });
    nav.addEventListener('click', function (e) { if (isOpen() && e.target.closest('a')) setOpen(false, false); });
    doc.addEventListener('click', function (e) { if (isOpen() && !hdr.contains(e.target)) setOpen(false, false); });
    hdr.addEventListener('focusout', function (e) {
      if (isOpen() && e.relatedTarget && !hdr.contains(e.relatedTarget)) setOpen(false, false);
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(max-width: 900px)');
      var onChange = function () { if (!mq.matches && isOpen()) setOpen(false, false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    hdr.classList.add('has-menu');
  });

  /* 4. Phase ring (illustrative): cycles through the four phases; a dot stops the cycle. */
  safe('ring', function () {
    var card = doc.querySelector('[data-ring]');
    if (!card) return;
    var PROGRESS = [0.14, 0.32, 0.5, 0.79];
    var COLORS = ['#BD5E8F', '#F8BBD9', '#963C86', '#5A0760'];
    var groups = [all('.ring__layer', card), all('.ring__label', card), all('.ring__seg', card)];
    var dots = all('.ring__dot', card);
    var marker = card.querySelector('.ring__marker');
    var current = 3, deg = PROGRESS[3] * 360, timer = null, hold = false;
    var set = function (i) {
      current = i;
      groups.concat([dots]).forEach(function (list) {
        list.forEach(function (el, j) { el.classList.toggle('is-on', j === i); });
      });
      dots.forEach(function (d, j) { d.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      var target = PROGRESS[i] * 360, now = ((deg % 360) + 360) % 360, diff = target - now;
      if (diff < 0) diff += 360;
      deg += diff; // always move forward round the ring
      if (marker) marker.style.transform = 'rotate(' + deg.toFixed(1) + 'deg)';
      card.style.setProperty('--ph', COLORS[i]);
    };
    dots.forEach(function (d, j) {
      d.disabled = false;
      d.addEventListener('click', function () { clearInterval(timer); timer = null; set(j); });
    });
    if (reduce) return;
    card.addEventListener('mouseenter', function () { hold = true; });
    card.addEventListener('mouseleave', function () { hold = false; });
    card.addEventListener('focusin', function () { hold = true; });
    card.addEventListener('focusout', function () { hold = false; });
    timer = setInterval(function () { if (!hold && !doc.hidden) set((current + 1) % 4); }, 3200);
  });

  /* 5. Craving chips (illustrative): one selected at a time; the note follows. */
  safe('crave', function () {
    var card = doc.querySelector('[data-crave]');
    if (!card) return;
    var note = card.querySelector('.crave__note');
    var chips = all('.chip', card);
    chips.forEach(function (chip) {
      chip.disabled = false;
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        if (note) note.textContent = chip.getAttribute('data-note') || '';
      });
    });
  });

  /* 6. Screens carousel: advances when the progress bar finishes (CSS animation), so
     pausing the bar (hover, keyboard focus, or the Pause button) also pauses the slides. */
  safe('screens', function () {
    var box = doc.querySelector('[data-screens]');
    if (!box) return;
    var tabs = all('.scr', box);
    var imgs = all('.scr-img', box);
    var toggle = box.querySelector('.scr-pause');
    var label = box.querySelector('.scr-pause__label');
    var current = 0;
    var set = function (i) {
      current = i;
      tabs.forEach(function (t, j) {
        t.classList.toggle('is-on', j === i);
        t.setAttribute('aria-pressed', j === i ? 'true' : 'false');
      });
      imgs.forEach(function (im, j) {
        im.classList.toggle('is-on', j === i);
        if (j === i) im.removeAttribute('aria-hidden'); else im.setAttribute('aria-hidden', 'true');
      });
      var fill = tabs[i].querySelector('.scr__fill');
      if (fill) { fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = ''; }
    };
    tabs.forEach(function (t, j) {
      t.disabled = false;
      t.addEventListener('click', function () { set(j); });
    });
    if (reduce || !toggle) return;
    box.addEventListener('animationend', function (e) {
      if (e.target.classList.contains('scr__fill') && !box.classList.contains('is-paused')) set((current + 1) % tabs.length);
    });
    toggle.addEventListener('click', function () {
      var paused = box.classList.toggle('is-paused');
      if (label) label.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
    });
    box.classList.add('is-auto');
  });
})();
