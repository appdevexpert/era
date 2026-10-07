// Shared timeline helpers for the ERA explainer videos. Each composition defines
// window.PROMO = { FPS, DURATION, HITS, MUSIC } and calls Kit.start(renderFn).
(function () {
  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const easeInOut = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, x) => a + (b - a) * x;

  // opacity of a window [a,b] with short fades
  const win = (t, a, b, f = 0.25) => (t < a || t > b ? 0 : Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b)));

  function reveal(el, t, start, dur = 0.45, dist = 40) {
    const p = easeOut(prog(t, start, start + dur));
    el.style.opacity = p;
    el.style.transform = `translateY(${(1 - p) * dist}px)`;
  }

  // captions: [[t0, t1, id]] -> each .cap fades/slides
  function captions(t, list) {
    for (const [a, b, id] of list) {
      const el = $(id);
      const o = win(t, a, b, 0.35);
      el.style.opacity = o;
      el.style.transform = `translateY(${(1 - easeOut(prog(t, a, a + 0.5))) * 30}px)`;
    }
  }

  // views inside the phone: [[t0, t1, id, transition]] transition: 'fade' | 'push' | 'up'.
  // An id may appear in several windows; the active window wins.
  function views(t, list) {
    const seen = new Set();
    for (const [, , id] of list) { if (!seen.has(id)) { $(id).style.opacity = 0; $(id).style.zIndex = 0; seen.add(id); } }
    for (const [a, b, id, tr = 'fade'] of list) {
      if (t < a || t > b + 0.4) continue;
      const el = $(id);
      const inP = easeInOut(prog(t, a, a + 0.4));
      el.style.opacity = tr === 'fade' ? Math.min(inP, 1 - prog(t, b, b + 0.4)) : (t > b ? 1 - prog(t, b, b + 0.4) : 1);
      el.style.zIndex = Math.round(a * 10) + 1;
      if (tr === 'push') el.style.transform = `translateX(${(1 - inP) * 393}px)`;
      else if (tr === 'up') el.style.transform = `translateY(${(1 - inP) * 852}px)`;
      else el.style.transform = '';
    }
  }

  // tap ripples: [[time, x, y]] in screen points
  function taps(t, list, layer) {
    while (layer.children.length < list.length) { const d = document.createElement('div'); d.className = 'tap'; layer.appendChild(d); }
    list.forEach(([at, x, y], i) => {
      const el = layer.children[i];
      const d = t - at;
      // finger arrives 0.25s before, ripple expands after
      if (d < -0.3 || d > 0.5) { el.style.opacity = 0; return; }
      el.style.left = x + 'px'; el.style.top = y + 'px';
      if (d < 0) { el.style.opacity = prog(d, -0.3, -0.1) * 0.9; el.style.transform = 'scale(1)'; }
      else { const p = prog(d, 0, 0.5); el.style.opacity = 0.9 * (1 - p); el.style.transform = `scale(${1 - 0.25 * Math.sin(Math.min(p * 6, Math.PI)) + p * 0.8})`; }
    });
  }

  // vertical scroll of a container: [[t0, t1, fromY, toY]]
  function scroll(el, t, list) {
    let y = list.length ? list[0][2] : 0;
    for (const [a, b, from, to] of list) { if (t >= a) y = lerp(from, to, easeInOut(prog(t, a, b))); }
    el.style.transform = `translateY(${-y}px)`;
  }

  function count(t, a, b, from, to, dec = 0) { return lerp(from, to, easeOut(prog(t, a, b))).toFixed(dec); }

  function start(render) {
    const { DURATION } = window.PROMO;
    window.render = t => {
      render(t);
      const pr = $('progress'); if (pr) pr.style.width = `${(t / DURATION) * 100}%`;
      const st = $('stage'); if (st) st.style.opacity = Math.min(prog(t, 0, 0.3), 1 - prog(t, DURATION - 0.4, DURATION));
    };
    if (!navigator.webdriver) {
      const t0 = performance.now();
      (function loop() { window.render(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); })();
    }
  }

  // phone scale/position for the stage (scale 1.6 => 629x1363 on canvas)
  function phone(t, scale = 1.6, y = 470, dx = 0) {
    $('phone').style.transform = `translateX(-50%) translateX(${dx}px) scale(${scale})`;
    $('phone').style.top = y + 'px';
  }

  window.Kit = { $, clamp, prog, easeOut, easeInOut, easeOutBack, lerp, win, reveal, captions, views, taps, scroll, count, start, phone };
})();
