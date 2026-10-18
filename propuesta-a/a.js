(() => {
  if (!window.THREE) return;
  const T = THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INK = 0x0b0b0b, OR = 0xff5729;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- reveal ---------- */
  const rv = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    rv.forEach(e => io.observe(e));
  } else rv.forEach(e => e.classList.add('in'));

  /* ---------- helpers ---------- */
  const lineM = new T.LineBasicMaterial({ color: INK });
  const lcache = {}, mcache = {};
  const lam = (c) => mcache[c] || (mcache[c] = new T.MeshLambertMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  function eb(w, h, d, color, x, y, z, parent, edges = true) {
    const k = [w, h, d].join();
    const c = lcache[k] || (lcache[k] = { g: new T.BoxGeometry(w, h, d), e: new T.EdgesGeometry(new T.BoxGeometry(w, h, d)) });
    const m = new T.Mesh(c.g, lam(color));
    if (edges) m.add(new T.LineSegments(c.e, lineM));
    m.position.set(x, y, z); parent && parent.add(m); return m;
  }
  function cyl(rt, rb, h, color, x, y, z, parent, seg = 10, edges = false) {
    const g = new T.CylinderGeometry(rt, rb, h, seg), m = new T.Mesh(g, lam(color));
    if (edges) m.add(new T.LineSegments(new T.EdgesGeometry(g), lineM));
    m.position.set(x, y, z); parent && parent.add(m); return m;
  }
  function lines(pairs, color = INK) {
    const g = new T.BufferGeometry().setFromPoints(pairs);
    return new T.LineSegments(g, new T.LineBasicMaterial({ color }));
  }

  /* generic orthographic stage */
  function stage(canvas, { size, target = [0, 0, 0], cam = [1, 0.85, 1], build, update, onFrame, sway = 0.25, spin = 0 }) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const scene = new T.Scene();
    scene.add(new T.AmbientLight(0xffffff, 0.78));
    const dl = new T.DirectionalLight(0xffffff, 0.55); dl.position.set(-30, 60, 40); scene.add(dl);
    const g = new T.Group(); scene.add(g);
    const camera = new T.OrthographicCamera(-1, 1, 1, -1, -500, 800);
    camera.position.set(cam[0] * 120, cam[1] * 120, cam[2] * 120);
    camera.lookAt(new T.Vector3(...target));
    const ctx = { scene, group: g, camera, renderer: r, canvas };
    build(g, ctx);
    let mx = 0, my = 0, cx = 0, t = 0, run = true, last = performance.now();
    const hostEl = canvas.closest('.model, .cell') || canvas;
    hostEl.addEventListener('pointermove', e => { const b = hostEl.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width - 0.5; });
    hostEl.addEventListener('pointerleave', () => { mx = 0; });
    function resize() {
      const b = canvas.getBoundingClientRect(), w = Math.max(1, b.width), h = Math.max(1, b.height);
      r.setSize(w, h, false);
      const half = size / 2, a = w / h;
      camera.left = -half; camera.right = half; camera.top = half / a; camera.bottom = -half / a;
      camera.updateProjectionMatrix();
    }
    function draw(dt) {
      t += dt; cx += (mx - cx) * 0.06;
      g.rotation.y = spin * t + cx * sway + (spin ? 0 : Math.sin(t * 0.25) * 0.05);
      update && update(dt, t, ctx);
      r.render(scene, camera);
      onFrame && onFrame(ctx);
    }
    function loop(now) {
      if (!run) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; draw(reduced ? 0 : dt); requestAnimationFrame(loop);
    }
    new ResizeObserver(() => { resize(); draw(0); }).observe(canvas);
    resize(); draw(0);
    if (!reduced) {
      new IntersectionObserver(es => {
        if (es[0].isIntersecting && !run) { run = true; last = performance.now(); requestAnimationFrame(loop); }
        else if (!es[0].isIntersecting) run = false;
      }).observe(canvas);
      requestAnimationFrame(loop);
    }
    return ctx;
  }

  /* ---------- models ---------- */
  function truck(color = OR) {
    const g = new T.Group(), wheels = [];
    eb(10.5, 3.9, 3.2, 0xffffff, -2.2, 3.3, 0, g);
    eb(10.6, 0.5, 3.25, INK, -2.2, 1.55, 0, g);
    eb(3.6, 3.1, 3.2, color, 4.6, 2.55, 0, g);
    eb(0.2, 1.2, 2.6, INK, 6.45, 3.1, 0, g, false);
    eb(11.5, 0.5, 2, 0x2b2b2b, -0.7, 0.95, 0, g, false);
    [[4.6], [-1], [-3.4], [-5.8]].forEach(([x]) => [-1.65, 1.65].forEach(z => {
      const w = cyl(0.85, 0.85, 0.7, INK, x, 0.85, z, g, 14); w.rotation.x = Math.PI / 2; wheels.push(w);
    }));
    g.userData.wheels = wheels; return g;
  }
  function bus() {
    const g = new T.Group(), wheels = [];
    eb(12.5, 3.8, 3.2, 0xffffff, 0, 2.7, 0, g);
    eb(12.6, 0.6, 3.25, OR, 0, 1.4, 0, g, false);
    eb(11.4, 1.0, 3.3, INK, -0.2, 3.3, 0, g, false);
    [-4, 4].forEach(x => [-1.5, 1.5].forEach(z => { const w = cyl(0.8, 0.8, 0.6, INK, x, 0.8, z, g, 12); w.rotation.x = Math.PI / 2; wheels.push(w); }));
    g.userData.wheels = wheels; return g;
  }
  function taxi() {
    const g = new T.Group(), wheels = [];
    eb(5.2, 1.3, 2.4, OR, 0, 1.2, 0, g);
    eb(2.8, 1.0, 2.2, 0xffffff, -0.3, 2.3, 0, g);
    eb(0.8, 0.35, 0.6, INK, -0.3, 3.0, 0, g, false);
    [-1.7, 1.7].forEach(x => [-1.2, 1.2].forEach(z => { const w = cyl(0.55, 0.55, 0.4, INK, x, 0.55, z, g, 10); w.rotation.x = Math.PI / 2; wheels.push(w); }));
    g.userData.wheels = wheels; return g;
  }
  function moto() {
    const g = new T.Group(), wheels = [];
    eb(2.2, 0.6, 0.6, OR, 0, 1.0, 0, g, false); eb(0.7, 1.3, 0.7, INK, -0.2, 1.9, 0, g, false);
    [-1, 1].forEach(x => { const w = cyl(0.55, 0.55, 0.3, INK, x, 0.55, 0, g, 10); w.rotation.x = Math.PI / 2; wheels.push(w); });
    g.userData.wheels = wheels; return g;
  }
  function person() {
    const g = new T.Group();
    cyl(0.4, 0.4, 2.2, INK, 0, 1.1, 0, g, 6); const h = new T.Mesh(new T.SphereGeometry(0.45, 8, 6), lam(Math.random() > 0.7 ? OR : 0x2b2b2b)); h.position.y = 2.6; g.add(h);
    return g;
  }
  function turbine(h) {
    const g = new T.Group();
    cyl(0.25, 0.5, h, 0xffffff, 0, h / 2, 0, g, 8, true);
    const rotor = new T.Group(); rotor.position.set(0.9, h, 0); g.add(rotor);
    for (let i = 0; i < 3; i++) {
      const arm = new T.Group(); arm.rotation.x = i * Math.PI * 2 / 3;
      eb(0.12, h * 0.46, 0.5, 0xffffff, 0, h * 0.23 + 0.3, 0, arm); rotor.add(arm);
    }
    eb(1.4, 0.9, 0.9, OR, 0.2, h, 0, g, false);
    g.userData.rotor = rotor; return g;
  }
  function pylonGeo(h = 26) {
    const P = [], v = (x, y, z) => new T.Vector3(x, y, z);
    const levels = [[0, 4.2], [h * 0.35, 2.4], [h * 0.7, 1.2], [h * 0.9, 0.7]];
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let l = 0; l < levels.length - 1; l++) for (let i = 0; i < 4; i++) {
      const a = cs[i], b = cs[(i + 1) % 4], [y0, w0] = levels[l], [y1, w1] = levels[l + 1];
      P.push(v(a[0] * w0, y0, a[1] * w0), v(a[0] * w1, y1, a[1] * w1));
      P.push(v(a[0] * w0, y0, a[1] * w0), v(b[0] * w1, y1, b[1] * w1));
      P.push(v(a[0] * w1, y1, a[1] * w1), v(b[0] * w1, y1, b[1] * w1));
    }
    levels.forEach(([y, w]) => { for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; P.push(v(a[0] * w, y, a[1] * w), v(b[0] * w, y, b[1] * w)); } });
    [[h * 0.9, 9], [h * 0.7, 6.5]].forEach(([y, L]) => P.push(v(0, y, -L), v(0, y, L)));
    return lines(P);
  }

  /* ---------- MAIN MAQUETTE ---------- */
  const mq = document.getElementById('maquette');
  if (mq) {
    const tags = [...document.querySelectorAll('.model .tag')];
    let curve, len, actors = [], turbines = [], anchors = [];
    const at = (u, off) => { const p = curve.getPointAt(u), t = curve.getTangentAt(u); return { x: p.x + t.z * off, z: p.z - t.x * off, ang: Math.atan2(t.z, t.x) }; };
    function ribbon(a, b, y, color, g) {
      const S = 140, pos = [], idx = [], nrm = [];
      for (let i = 0; i <= S; i++) {
        const u = i / S, p = curve.getPointAt(u), t = curve.getTangentAt(u);
        pos.push(p.x + t.z * a, y, p.z - t.x * a, p.x + t.z * b, y, p.z - t.x * b); nrm.push(0, 1, 0, 0, 1, 0);
        if (i < S) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); geo.setIndex(idx);
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color, side: T.DoubleSide })); g.add(m); return m;
    }
    const place = (o, u, off, yaw = 0, y = 0) => { const q = at(u, off); o.position.set(q.x, y, q.z); o.rotation.y = -q.ang + yaw; return q; };

    stage(mq, {
      size: 158, target: [0, 6, 0], cam: [1, 0.78, 1],
      build(g) {
        curve = new T.CatmullRomCurve3([[-78, 10], [-46, -6], [-12, 14], [26, -8], [78, 6]].map(([x, z]) => new T.Vector3(x, 0, z)));
        curve.arcLengthDivisions = 800; len = curve.getLength();
        eb(160, 5, 100, 0xffffff, 0, -2.5, 0, g);
        eb(152, 0.4, 92, 0xeeebe3, 0, 0.2, 0, g, false);
        ribbon(-5, 5, 0.5, 0xcfcdc6, g);
        ribbon(-5.3, -4.9, 0.55, INK, g); ribbon(4.9, 5.3, 0.55, INK, g);
        ribbon(5.3, 8.2, 0.6, 0xf8f6f0, g); ribbon(-8.2, -5.3, 0.6, 0xf8f6f0, g);
        const dg = new T.PlaneGeometry(2.4, 0.4), dm = new T.MeshBasicMaterial({ color: OR });
        for (let i = 0; i < 50; i++) { const u = (i + 0.5) / 50, p = curve.getPointAt(u), t = curve.getTangentAt(u); const d = new T.Mesh(dg, dm); d.rotation.x = -Math.PI / 2; d.rotation.z = Math.atan2(t.z, t.x); d.position.set(p.x, 0.62, p.z); g.add(d); }
        // movilidad: warehouses
        [0.06, 0.2].forEach((u, i) => { const w = new T.Group(); eb(15, 6, 9, 0xffffff, 0, 3, 0, w); eb(15.2, 0.9, 9.2, OR, 0, 5.4, 0, w, false); place(w, u, 18 + i * 4, 0, 0.4); g.add(w); });
        // energia: turbines + pylons + solar
        [[0.36, 22], [0.44, 28], [0.52, 20], [0.58, 30]].forEach(([u, off]) => { const t = turbine(rnd(20, 26)); place(t, u, off, Math.PI / 2, 0.4); g.add(t); turbines.push(t); });
        const pyl = []; [0.32, 0.45, 0.58].forEach(u => { const p = pylonGeo(18); p.scale.setScalar(0.62); place(p, u, 13, 0, 0.4); g.add(p); pyl.push(p); });
        g.updateMatrixWorld(true);
        for (let i = 0; i < pyl.length - 1; i++) [[16.2, -5.6], [16.2, 5.6], [12.6, -4]].forEach(([y, z]) => {
          const a = pyl[i].localToWorld(new T.Vector3(0, y * 0.62 * 1.0, z * 0.62 / 0.62 * 0.62)), b = pyl[i + 1].localToWorld(new T.Vector3(0, y * 0.62, z * 0.62)), pts = [];
          for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new T.Vector3(a.x + (b.x - a.x) * t, a.y - 3.2 * 4 * t * (1 - t), a.z + (b.z - a.z) * t)); }
          g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), lineM));
        });
        for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const s = eb(4.2, 0.2, 2.4, 0x2b2b2b, 0, 1.2, 0, new T.Group(), false); const gg = s.parent; s.rotation.x = -0.5; eb(0.2, 1.2, 0.2, INK, 0, 0.6, 0, gg, false); place(gg, 0.34 + i * 0.024, -14 - r * 4, 0, 0.4); g.add(gg); }
        // territorio: buildings
        for (let i = 0; i < 13; i++) { const u = 0.62 + i * 0.03, h = rnd(8, 30), w = rnd(5, 8), d = rnd(5, 8), b = new T.Group(); eb(w, h, d, i % 5 === 2 ? 0xf4cfc3 : 0xffffff, 0, h / 2, 0, b); if (i % 4 === 1) eb(w * 0.5, 1, d * 0.5, OR, 0, h + 0.5, 0, b, false); place(b, u, rnd(13, 17), 0, 0.4); g.add(b); }
        for (let i = 0; i < 9; i++) { const u = 0.64 + i * 0.04, b = new T.Group(); eb(rnd(5, 7), rnd(3, 5), rnd(5, 6), 0xffffff, 0, 2, 0, b); place(b, u, -rnd(13, 15), 0, 0.4); g.add(b); }
        // trees
        for (let i = 0; i < 26; i++) { const t = new T.Group(); const cg = new T.ConeGeometry(2, 5, 6), c = new T.Mesh(cg, lam(0xffffff)); c.add(new T.LineSegments(new T.EdgesGeometry(cg), lineM)); c.position.y = 3.5; t.add(c); cyl(0.3, 0.3, 1.2, INK, 0, 0.6, 0, t, 5); place(t, (i + 0.5) / 26, (i % 2 ? 1 : -1) * rnd(10, 11.5), 0, 0.4); g.add(t); }
        // traffic
        const mk = [[truck, 7, 4], [bus, 8, 2], [taxi, 11, 4], [moto, 13, 2]];
        mk.forEach(([f, sp, n]) => { for (let i = 0; i < n; i++) { const o = f(); o.scale.setScalar(f === truck || f === bus ? 0.78 : 0.9); g.add(o); const dir = i % 2 ? 1 : -1; actors.push({ o, ped: false, dir, u: rnd(0, 1), sp: sp * rnd(0.85, 1.15), lane: dir * 2.5 }); } });
        for (let i = 0; i < 14; i++) { const o = person(); o.scale.setScalar(0.9); g.add(o); actors.push({ o, ped: true, home: rnd(0.6, 0.98), amp: rnd(0.01, 0.03), sph: rnd(0.4, 0.8), ph: rnd(0, 6), lane: (i % 2 ? 1 : -1) * rnd(6, 7.4), u: 0, dir: 1 }); }
        anchors = [at(0.12, 20), at(0.46, 26), at(0.82, 16)].map((q, i) => new T.Vector3(q.x, [8, 18, 22][i], q.z));
      },
      update(dt, t) {
        turbines.forEach(tb => { tb.userData.rotor.rotation.x += dt * 1.3; });
        actors.forEach(a => {
          if (a.ped) { const p = t * a.sph + a.ph; a.u = a.home + a.amp * Math.sin(p); a.dir = Math.cos(p) >= 0 ? 1 : -1; }
          else { a.u += a.dir * a.sp * dt / len; a.o.userData.wheels.forEach(w => { w.rotation.y -= a.sp * dt / 0.7 * a.dir * 0; }); }
          const u = ((a.u % 1) + 1) % 1, q = at(u, a.lane);
          a.o.position.set(q.x, a.ped ? 0.6 + Math.abs(Math.sin(t * 8 + a.lane)) * 0.15 : 0.6, q.z);
          a.o.rotation.y = -q.ang + (a.dir < 0 ? Math.PI : 0);
        });
      },
      onFrame(ctx) {
        const b = mq.getBoundingClientRect(), v = new T.Vector3();
        anchors.forEach((p, i) => { v.copy(p).applyMatrix4(ctx.group.matrixWorld).project(ctx.camera); tags[i].style.left = ((v.x + 1) / 2 * b.width) + 'px'; tags[i].style.top = ((1 - v.y) / 2 * b.height) + 'px'; });
      },
    });
  }

  /* ---------- MINI SCENES ---------- */
  document.querySelectorAll('canvas.mini').forEach(cv => {
    const kind = cv.dataset.m;
    if (kind === 'truck') stage(cv, {
      size: 40, target: [0, 3, 0], cam: [1, 0.7, 1], spin: reduced ? 0 : 0.35, sway: 0,
      build(g) { const t = truck(); t.position.x = 0; g.add(t); const gh = new T.GridHelper(60, 12, INK, 0xcfcdc6); gh.position.y = 0; g.add(gh); },
      update(dt, t, c) { c.group.children[0].userData.wheels.forEach(w => { w.rotation.y += dt * 4; }); },
    });
    if (kind === 'pylon') stage(cv, {
      size: 46, target: [0, 12, 0], cam: [1, 0.55, 1], spin: reduced ? 0 : 0.3, sway: 0,
      build(g) {
        g.add(pylonGeo(26)); const gh = new T.GridHelper(40, 10, INK, 0xcfcdc6); g.add(gh);
        const a = new T.Vector3(0, 23.4, 9), pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(new T.Vector3(0, 23.4 - 3 * 4 * t * (1 - t) - 1.5 * t, 9 + 20 * t)); }
        g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: OR })));
        const pts2 = pts.map(p => new T.Vector3(p.x, p.y, -(p.z))); g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts2), new T.LineBasicMaterial({ color: OR })));
      },
    });
    if (kind === 'terrain') stage(cv, {
      size: 52, target: [0, 0, 0], cam: [1, 0.6, 1], spin: reduced ? 0 : 0.12, sway: 0,
      build(g) {
        const H = (x, z) => 3.4 * Math.sin(x * 0.22) * Math.cos(z * 0.2) + 2.2 * Math.sin((x + z) * 0.11) + 0.05 * (x * x + z * z) * 0.05;
        const geo = new T.PlaneGeometry(44, 44, 36, 36); geo.rotateX(-Math.PI / 2);
        const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i)));
        geo.computeVertexNormals();
        g.add(new T.Mesh(geo, lam(0xffffff)));
        g.add(new T.LineSegments(new T.WireframeGeometry(geo), new T.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.55 })));
        const pts = []; for (let k = 0; k <= 60; k++) { const x = -20 + k * 40 / 60, z = 8 * Math.sin(x * 0.17); pts.push(new T.Vector3(x, H(x, z) + 0.4, z)); }
        g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: OR })));
        pts.filter((_, i) => i % 15 === 0).forEach(q => { const m = new T.Mesh(new T.SphereGeometry(0.6, 8, 6), new T.MeshBasicMaterial({ color: OR })); m.position.copy(q); g.add(m); });
      },
    });
  });
})();
