(() => {
  const canvas = document.getElementById('road3d');
  if (!canvas || !window.THREE) return;
  const T = THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1, 1, 600);

  scene.add(new T.HemisphereLight(0xffffff, 0xcfc8b8, 0.95));
  const sun = new T.DirectionalLight(0xffffff, 0.8);
  sun.position.set(-20, 40, 25);
  scene.add(sun);

  const C = { orange: 0xff5729, blue: 0x1763ff, ink: 0x0a0a0a, cream: 0xf3f0e8,
              taxi: 0xffc21a, white: 0xf5f5f2, glass: 0x1b2330 };
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c }));
  const basic = (c, o) => new T.MeshBasicMaterial({ color: c, ...(o || {}) });

  function box(w, h, d, c, x, y, z, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    parent && parent.add(m);
    return m;
  }
  const wheelGeo = new T.CylinderGeometry(0.5, 0.5, 0.4, 14);
  function wheel(x, z, r, parent) {
    const m = new T.Mesh(wheelGeo, mat(C.ink));
    m.rotation.x = Math.PI / 2;
    m.scale.set(r / 0.5, 1, r / 0.5);
    m.position.set(x, r, z);
    parent.add(m);
  }
  function shadow(len, wid, parent) {
    const m = new T.Mesh(new T.PlaneGeometry(len * 1.05, wid * 1.15), basic(0x000000, { transparent: true, opacity: 0.16 }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    parent.add(m);
  }
  function lights(g, front, w, y) {
    box(0.12, 0.22, 0.4, 0xfff2b0, front, y, w / 2 - 0.35, g);
    box(0.12, 0.22, 0.4, 0xfff2b0, front, y, -w / 2 + 0.35, g);
  }

  // Forward axis = +X
  function makeTaxi() {
    const g = new T.Group();
    box(4.3, 0.8, 1.9, C.taxi, 0, 0.75, 0, g);
    box(2.3, 0.75, 1.7, C.taxi, -0.2, 1.5, 0, g);
    box(2.0, 0.5, 1.74, C.glass, -0.2, 1.52, 0, g);
    box(0.7, 0.22, 0.4, C.ink, -0.2, 2.0, 0, g);
    box(4.32, 0.18, 1.92, C.ink, 0, 0.62, 0, g);
    [-1.4, 1.4].forEach(x => [-0.95, 0.95].forEach(z => wheel(x, z, 0.38, g)));
    lights(g, 2.16, 1.9, 0.8);
    shadow(4.4, 1.9, g);
    g.userData = { len: 4.3 };
    return g;
  }
  function makeBus() {
    const g = new T.Group();
    box(10.5, 2.6, 2.5, C.blue, 0, 1.75, 0, g);
    box(10.52, 0.12, 2.52, C.white, 0, 1.0, 0, g);
    box(10.0, 0.9, 2.54, C.glass, 0, 2.4, 0, g);
    for (let i = -4; i <= 4; i++) box(0.12, 0.95, 2.56, C.blue, i * 1.1, 2.4, 0, g);
    box(10.4, 0.1, 2.3, C.white, 0, 3.1, 0, g);
    box(1.2, 0.5, 2.0, C.orange, 4.2, 3.2, 0, g);
    [-3.6, 3.4].forEach(x => [-1.3, 1.3].forEach(z => wheel(x, z, 0.55, g)));
    lights(g, 5.26, 2.5, 1.0);
    shadow(10.6, 2.6, g);
    g.userData = { len: 10.5 };
    return g;
  }
  function makeTruck(trailerColor) {
    const g = new T.Group();
    // cab
    box(2.6, 2.6, 2.5, C.orange, 5.4, 1.9, 0, g);
    box(0.9, 1.0, 2.52, C.glass, 6.3, 2.5, 0, g);
    box(2.8, 0.4, 2.6, C.ink, 5.4, 0.7, 0, g);
    box(0.5, 2.0, 0.3, C.ink, 4.3, 3.0, 1.0, g);
    box(0.5, 2.0, 0.3, C.ink, 4.3, 3.0, -1.0, g);
    // chassis + trailer
    box(10.5, 0.4, 2.3, C.ink, -0.2, 0.9, 0, g);
    box(10.2, 3.3, 2.6, trailerColor, -0.6, 2.75, 0, g);
    box(10.22, 0.18, 2.62, C.ink, -0.6, 1.2, 0, g);
    box(10.24, 0.18, 2.64, C.orange, -0.6, 3.2, 0, g);
    [[4.9], [-2.2], [-3.5], [-4.8]].forEach(([x]) => [-1.15, 1.15].forEach(z => wheel(x, z, 0.62, g)));
    lights(g, 6.72, 2.5, 1.2);
    shadow(12.5, 2.8, g);
    g.userData = { len: 12.5 };
    return g;
  }
  function makeMoto() {
    const g = new T.Group();
    box(1.6, 0.35, 0.4, C.ink, 0, 0.7, 0, g);
    box(0.7, 0.5, 0.5, C.orange, 0.3, 1.0, 0, g);
    box(0.4, 0.8, 0.4, C.blue, -0.2, 1.45, 0, g);
    const h = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), mat(C.white)); h.position.set(-0.2, 2.0, 0); g.add(h);
    wheel(0.75, 0, 0.38, g); wheel(-0.75, 0, 0.38, g);
    shadow(1.9, 0.8, g); g.userData = { len: 1.9 };
    return g;
  }
  function makePerson() {
    const g = new T.Group();
    const shirt = [C.orange, C.blue, 0x2f8f5b, 0x8a4fd1, C.ink, 0xd9a400][Math.random() * 6 | 0];
    const pants = [0x222a3a, 0x3b3b3b, 0x5a4636][Math.random() * 3 | 0];
    const skin = [0xf0c8a0, 0xc68e63, 0x8d5a3b][Math.random() * 3 | 0];
    const s = 1.55 + Math.random() * 0.3;
    const legs = [];
    [-0.17, 0.17].forEach(z => {
      const p = new T.Group(); p.position.set(0, 0.95, z);
      box(0.22, 0.95, 0.24, pants, 0, -0.47, 0, p);
      g.add(p); legs.push(p);
    });
    box(0.36, 0.7, 0.8, shirt, 0, 1.3, 0, g);
    const head = new T.Mesh(new T.SphereGeometry(0.22, 12, 10), mat(skin));
    head.position.set(0, 1.9, 0); g.add(head);
    box(0.2, 0.12, 0.44, C.ink, 0, 2.03, 0, g).visible = Math.random() > 0.4;
    if (Math.random() > 0.5) box(0.2, 0.4, 0.3, C.cream === shirt ? C.ink : 0x6b4a2a, -0.25, 1.1, 0.5, g);
    g.scale.setScalar(s);
    g.userData = { legs, phase: Math.random() * 6.28 };
    return g;
  }

  // ---------- road ----------
  let curve, roadGroup, W = 90, built = false;
  const actors = [];

  function ribbon(c, a, b, y, color, samples) {
    const pos = [], idx = [];
    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const p = c.getPointAt(u), t = c.getTangentAt(u);
      const nx = t.z, nz = -t.x;
      pos.push(p.x + nx * a, y, p.z + nz * a, p.x + nx * b, y, p.z + nz * b);
      if (i < samples) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color, side: T.DoubleSide }));
    return m;
  }

  function build() {
    if (roadGroup) scene.remove(roadGroup);
    actors.length = 0;
    roadGroup = new T.Group();
    scene.add(roadGroup);

    const span = W * 0.85, A = Math.min(7, W * 0.075);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = -span + (2 * span) * i / 40;
      pts.push(new T.Vector3(x, 0, A * Math.sin(x * 0.075 + 0.6) + A * 0.45 * Math.sin(x * 0.19 + 1.2) + 2));
    }
    curve = new T.CatmullRomCurve3(pts);
    const len = curve.getLength(), S = 220;

    roadGroup.add(ribbon(curve, -5.9, 5.9, 0.0, 0xe9e5da, S));          // sidewalks base
    roadGroup.add(ribbon(curve, -4.1, 4.1, 0.02, 0xdbd9d1, S));         // asphalt
    roadGroup.add(ribbon(curve, -4.15, -3.95, 0.04, C.ink, S));         // edge lines
    roadGroup.add(ribbon(curve, 3.95, 4.15, 0.04, C.ink, S));
    roadGroup.add(ribbon(curve, -5.9, -5.8, 0.03, 0xb9b5aa, S));
    roadGroup.add(ribbon(curve, 5.8, 5.9, 0.03, 0xb9b5aa, S));
    // dashed centre line
    const dashes = Math.floor(len / 3.2);
    for (let i = 0; i < dashes; i++) {
      const u = (i + 0.5) / dashes;
      const p = curve.getPointAt(u), t = curve.getTangentAt(u);
      const d = new T.Mesh(new T.PlaneGeometry(1.7, 0.2), basic(C.blue));
      d.rotation.x = -Math.PI / 2;
      d.rotation.z = Math.atan2(t.z, t.x);
      d.position.set(p.x, 0.05, p.z);
      roadGroup.add(d);
    }
    // crosswalk bars
    [0.3, 0.72].forEach(u => {
      const p = curve.getPointAt(u), t = curve.getTangentAt(u), ang = Math.atan2(t.z, t.x);
      for (let k = -3; k <= 3; k++) {
        const bar = new T.Mesh(new T.PlaneGeometry(0.5, 7.6), basic(0xffffff));
        bar.rotation.x = -Math.PI / 2;
        bar.rotation.z = ang;
        bar.position.set(p.x + t.x * k * 0.9, 0.045, p.z + t.z * k * 0.9);
        roadGroup.add(bar);
      }
    });

    // ---- scenery: buildings, trees, lamp posts, pylons ----
    const pal = [0xe4dfd2, 0xd2cdc0, 0x1b1b1b, C.blue, C.orange, 0xf7f4ec];
    const at = (u, off) => {
      const p = curve.getPointAt(u), t = curve.getTangentAt(u);
      return { x: p.x + t.z * off, z: p.z - t.x * off, ang: Math.atan2(t.z, t.x) };
    };
    for (let i = 0; i < 26; i++) {
      const u = 0.02 + (i / 26) * 0.96, q = at(u, 10.5 + Math.random() * 3);
      const w = 4 + Math.random() * 3, d = 4 + Math.random() * 2.5, h = 3 + Math.random() * 5.5;
      const b = new T.Group();
      box(w, h, d, pal[Math.random() * pal.length | 0], 0, h / 2, 0, b);
      box(w + 0.3, 0.3, d + 0.3, C.ink, 0, h + 0.15, 0, b);
      for (let r = 1; r < h - 0.8; r += 1.3) box(w + 0.05, 0.3, d + 0.05, 0x9fb0c4, 0, r + 0.4, 0, b);
      b.position.set(q.x, 0, q.z); b.rotation.y = -q.ang;
      roadGroup.add(b);
    }
    for (let i = 0; i < 34; i++) {
      const side = i % 2 ? 1 : -1, q = at((i + 0.5) / 34, side * (7.2 + Math.random() * 0.8));
      const tr = new T.Group();
      box(0.3, 1.6, 0.3, 0x6b4a2a, 0, 0.8, 0, tr);
      const k = new T.Mesh(new T.IcosahedronGeometry(1.3 + Math.random() * 0.5, 0), mat([0x2f8f5b, 0x3fa56a, 0x5bb36e][i % 3]));
      k.position.y = 2.7; tr.add(k);
      tr.position.set(q.x, 0, q.z);
      roadGroup.add(tr);
    }
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1, q = at((i + 0.3) / 12, side * 5.3);
      const lp = new T.Group();
      box(0.18, 4.2, 0.18, C.ink, 0, 2.1, 0, lp);
      box(1.3, 0.16, 0.2, C.ink, -side * 0.6, 4.2, 0, lp);
      box(0.4, 0.15, 0.3, 0xfff2b0, -side * 1.2, 4.1, 0, lp);
      lp.position.set(q.x, 0, q.z); lp.rotation.y = -q.ang;
      roadGroup.add(lp);
    }
    [0.18, 0.5, 0.84].forEach(u => {
      const q = at(u, 8.2), py = new T.Group();
      box(0.35, 9, 0.35, C.orange, -0.8, 4.5, -0.8, py); box(0.35, 9, 0.35, C.orange, 0.8, 4.5, -0.8, py);
      box(0.35, 9, 0.35, C.orange, -0.8, 4.5, 0.8, py); box(0.35, 9, 0.35, C.orange, 0.8, 4.5, 0.8, py);
      box(7, 0.3, 0.3, C.ink, 0, 8.6, 0, py); box(5, 0.3, 0.3, C.ink, 0, 7.2, 0, py);
      box(1.8, 0.2, 1.8, C.ink, 0, 4.5, 0, py);
      py.position.set(q.x, 0, q.z); py.rotation.y = -q.ang;
      roadGroup.add(py);
    });

    // vehicles: [maker, lane(+1 forward / -1 back), u0, speed(u/sec)]
    const vs = [
      [() => makeTruck(C.white), 1, 0.05, 0.020],
      [() => makeTaxi(), 1, 0.26, 0.034],
      [() => makeBus(), 1, 0.50, 0.025],
      [() => makeTaxi(), 1, 0.74, 0.030],
      [() => makeTruck(C.blue), 1, 0.90, 0.021],
      [() => makeBus(), -1, 0.12, 0.024],
      [() => makeTaxi(), -1, 0.36, 0.036],
      [() => makeTruck(C.cream), -1, 0.58, 0.019],
      [() => makeTaxi(), -1, 0.82, 0.032],
      [() => makeMoto(), 1, 0.15, 0.045],
      [() => makeMoto(), -1, 0.95, 0.042],
    ];
    vs.forEach(([mk, dir, u0, sp]) => {
      const g = mk(); roadGroup.add(g);
      actors.push({ type: 'car', g, dir, u: u0, sp: sp * (len > 0 ? 160 / len : 1), lane: dir * 2.05 });
    });
    // pedestrians on both sidewalks
    for (let i = 0; i < 16; i++) {
      const g = makePerson(); roadGroup.add(g);
      const side = i % 2 ? 1 : -1;
      actors.push({ type: 'ped', g, dir: Math.random() > 0.5 ? 1 : -1, u: Math.random(),
        sp: (0.0042 + Math.random() * 0.003) * (160 / len), lane: side * (4.6 + Math.random() * 0.8) });
    }
    built = true;
  }

  function place(a) {
    const u = ((a.u % 1) + 1) % 1;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const nx = t.z, nz = -t.x;
    a.g.position.set(p.x + nx * a.lane, a.type === 'ped' ? 0.03 : 0.02, p.z + nz * a.lane);
    const ang = Math.atan2(t.z, t.x);
    a.g.rotation.y = -ang + (a.dir < 0 ? Math.PI : 0) + (a.type === 'ped' ? Math.PI / 2 : 0);
    // pedestrians: model faces +X by default for cars; people walk along local +X too
    if (a.type === 'ped') a.g.rotation.y = -ang + (a.dir < 0 ? Math.PI : 0);
  }

  // ---------- sizing ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    W = w < 560 ? 55 : w < 1000 ? 75 : 95;
    const d = W / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const el = T.MathUtils.degToRad(46);
    camera.userData.base = new T.Vector3(0, d * Math.sin(el), d * Math.cos(el));
    camera.position.copy(camera.userData.base);
    camera.lookAt(0, 0, 0);
    build();
    draw(0);
  }

  // ---------- loop ----------
  let mx = 0, my = 0, cx = 0, cy = 0, last = performance.now(), running = true, clock = 0;
  const hero = document.querySelector('.hero');
  hero && hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5;
    my = (e.clientY - r.top) / r.height - 0.5;
  });

  function draw(dt) {
    if (!built) return;
    clock += dt;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    const b = camera.userData.base;
    camera.position.set(b.x + cx * 6, b.y + cy * 3, b.z);
    camera.lookAt(0, 0, 0);
    actors.forEach(a => {
      a.u += a.dir * a.sp * dt;
      place(a);
      if (a.type === 'ped') {
        const s = Math.sin(clock * 7 + a.g.userData.phase) * 0.6;
        a.g.userData.legs[0].rotation.z = s;
        a.g.userData.legs[1].rotation.z = -s;
        a.g.position.y = 0.03 + Math.abs(Math.sin(clock * 7 + a.g.userData.phase)) * 0.05;
      }
    });
    renderer.render(scene, camera);
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    draw(dt);
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (reduced) { draw(0); return; }
  new IntersectionObserver(es => {
    const vis = es[0].isIntersecting;
    if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!vis) running = false;
  }).observe(canvas);
  requestAnimationFrame(frame);
})();
