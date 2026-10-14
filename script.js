(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Footer year ---------- */
  const yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Nav background + scroll progress ---------- */
  const nav = $('#nav');
  const bar = $('.progress span');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (nav) nav.classList.toggle('is-solid', y > 24);
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Refined Medium-Sized Cursor (Fine pointer only) ---------- */
  const cursor = $('.cursor');
  if (cursor && finePointer && !reduce) {
    document.documentElement.classList.add('has-cursor');
    const ring = $('.cursor__ring', cursor);
    const dot = $('.cursor__dot', cursor);
    let mx = -100, my = -100, rx = -100, ry = -100;

    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; 
      my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });

    (function loop() {
      // Smooth lerp trailing
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    })();

    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .bento-card, .comparison-card'));
    });
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  }

  /* ---------- Live Demo: Ambulance approaching a vehicle ---------- */
  const demo = $('[data-demo]');
  if (demo) {
    const route = $('#route', demo);
    const amb = $('#ambMarker', demo);
    const veh = $('#vehMarker', demo);
    const distEl = $('[data-dist]', demo);
    const bannerEl = $('[data-banner]', demo);
    const bannerDist = $('[data-banner-dist]', demo);
    const barEl = $('[data-bar]', demo);

    const btnRestart = $('#btnRestartSim');
    const btnAlert = $('#btnTriggerAlert');

    const total = route.getTotalLength();
    const vehLen = total * 0.76;      // where the vehicle sits on the route
    const endLen = vehLen * 0.9;      // ambulance approaches close to vehicle
    const START_KM = 2.4;             // distance at loop start
    const ALERT_KM = 1.0;             // alert threshold
    const DURATION = 9000;
    const HOLD = 1800;

    route.style.setProperty('--len', total);
    const vp = route.getPointAtLength(vehLen);
    veh.setAttribute('transform', `translate(${vp.x} ${vp.y})`);

    function fmt(km) {
      const m = km * 1000;
      if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
      return Math.max(50, Math.round(m / 50) * 50) + ' m';
    }

    let alertOn = false;
    function render(pos) {
      const p = route.getPointAtLength(pos);
      amb.setAttribute('transform', `translate(${p.x} ${p.y})`);
      const km = Math.max(0, (vehLen - pos) / vehLen * START_KM);
      const text = fmt(km);
      if (distEl && distEl.textContent !== text) {
        distEl.textContent = text;
      }
      if (bannerDist && bannerDist.textContent !== text) {
        bannerDist.textContent = text;
      }
      if (barEl) {
        barEl.style.transform = 'scaleX(' + Math.min(1, 1 - km / START_KM) + ')';
      }
      if (!alertOn && km <= ALERT_KM) {
        alertOn = true;
        if (bannerEl) bannerEl.classList.add('is-on');
      } else if (alertOn && km > ALERT_KM + 0.15) {
        alertOn = false;
        if (bannerEl) bannerEl.classList.remove('is-on');
      }
    }

    let running = false, raf = 0, t0 = null;
    function frame(t) {
      if (!running) return;
      if (t0 === null) t0 = t;
      let el = t - t0;
      if (el > DURATION + HOLD) { 
        t0 = t; 
        el = 0; 
      }
      render(Math.min(1, el / DURATION) * endLen);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running) return;
      running = true;
      t0 = null;
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    if (reduce) {
      render(vehLen * 0.6);
      demo.classList.add('is-drawn');
    } else {
      render(0);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              demo.classList.add('is-drawn');
              start();
            } else {
              stop();
            }
          });
        }, { threshold: 0.25 }).observe(demo);
      } else {
        demo.classList.add('is-drawn');
        start();
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
      });
    }

    // Interactive button controls
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        t0 = null;
        if (bannerEl) bannerEl.classList.remove('is-on');
        alertOn = false;
        render(0);
        if (!running) start();
      });
    }

    if (btnAlert) {
      btnAlert.addEventListener('click', () => {
        if (bannerEl) {
          bannerEl.classList.toggle('is-on');
        }
      });
    }

    /* Gentle 3D tilt on phone frame (mouse only) */
    if (finePointer && !reduce) {
      const zone = demo.parentElement;
      let tx = 0, ty = 0, cx = 0, cy = 0, active = false;
      zone.addEventListener('pointermove', (e) => {
        const r = zone.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 10;
        ty = -((e.clientY - r.top) / r.height - 0.5) * 8;
        if (!active) { 
          active = true; 
          tick(); 
        }
      });
      zone.addEventListener('pointerleave', () => { 
        tx = 0; 
        ty = 0; 
      });

      function tick() {
        cx += (tx - cx) * 0.1;
        cy += (ty - cy) * 0.1;
        demo.style.setProperty('--ry', cx.toFixed(2) + 'deg');
        demo.style.setProperty('--rx', cy.toFixed(2) + 'deg');
        if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
          requestAnimationFrame(tick);
        } else {
          active = false;
        }
      }
    }
  }

  /* ---------- Hero route runner: remove for reduced motion ---------- */
  if (reduce) {
    const r = $('.hero__runner');
    if (r) r.remove();
  }

  /* ---------- APK Download Handler ---------- */
  const apkLinks = $$('[data-apk]');
  const apkHref = apkLinks[0] ? apkLinks[0].getAttribute('href') : 'ResQ-Route.apk';
  const sizeEl = $('[data-apk-size]');
  const warnEl = $('[data-apk-warn]');

  // Display size
  if (location.protocol.startsWith('http')) {
    fetch(apkHref, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('missing');
        const len = Number(r.headers.get('content-length'));
        sizeEl.textContent = len ? (len / 1048576).toFixed(1) + ' MB' : 'Ready (210 MB)';
      })
      .catch(() => {
        if (sizeEl) sizeEl.textContent = 'Ready (210 MB)';
        if (warnEl) warnEl.hidden = true; // In development/offline keep quiet
      });
  } else if (sizeEl) {
    sizeEl.textContent = 'Ready to download';
  }

  const mainBtn = $('.card [data-apk]');
  const label = $('[data-apk-label]');
  const steps = $$('[data-steps] li');

  apkLinks.forEach((a) => {
    a.addEventListener('click', () => {
      if (!mainBtn || !label) return;
      mainBtn.classList.remove('is-done');
      mainBtn.classList.add('is-busy');
      label.textContent = 'Downloading…';
      steps.forEach((s, i) => {
        setTimeout(() => s.classList.add('is-lit'), 350 + i * 600);
      });
      setTimeout(() => {
        mainBtn.classList.remove('is-busy');
        mainBtn.classList.add('is-done');
        label.textContent = 'Download Started!';
      }, reduce ? 200 : 1600);
      setTimeout(() => {
        mainBtn.classList.remove('is-done');
        label.textContent = 'Download ResQ-Route.apk';
      }, 6000);
    });
  });
})();