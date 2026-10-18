(() => {
  const canvas = document.getElementById('road3d');
  if (!canvas || !window.THREE) return;
  const T = THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 700px)').matches;

  const renderer = new T.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: mobile ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 1, 700);

  scene.add(new T.HemisphereLight(0x8fa6ff, 0x2a2438, 0.75));
  const sun = new T.DirectionalLight(0xffa86b, 0.9);
  sun.position.set(-70, 28, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const C = { orange: 0xff5729, blue: 0x1763ff, navy: 0x0f2a6b, ink: 0x141414, cream: 0xf3f0e8,
              taxi: 0xf6b800, white: 0xf4f4f1, glass: 0x0d1621, chrome: 0xc9ced4, red: 0xd8232a };

  // ---------- helpers ----------
  const mcache = {}, gcache = {};
  function mat(c, rough = 0.5, metal = 0.12) {
    const k = c + '_' + rough + '_' + metal;
    return mcache[k] || (mcache[k] = new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }));
  }
  const paint = (c) => mat(c, 0.38, 0.28);
  const glassM = () => mat(C.glass, 0.12, 0.6);
  const lamp = (c) => new T.MeshBasicMaterial({ color: c });

  function rgeo(w, h, d, r) {
    const k = [w, h, d, r].join();
    if (gcache[k]) return gcache[k];
    const b = Math.min(0.1, d / 4, r * 0.6);
    const rr = Math.max(0.02, Math.min(r, w / 2 - b - 0.001, h / 2 - b - 0.001));
    const iw = w - 2 * b, ih = h - 2 * b, x = -iw / 2, y = -ih / 2, s = new T.Shape();
    s.moveTo(x + rr, y); s.lineTo(x + iw - rr, y); s.quadraticCurveTo(x + iw, y, x + iw, y + rr);
    s.lineTo(x + iw, y + ih - rr); s.quadraticCurveTo(x + iw, y + ih, x + iw - rr, y + ih);
    s.lineTo(x + rr, y + ih); s.quadraticCurveTo(x, y + ih, x, y + ih - rr);
    s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b,
      bevelSegments: 3, curveSegments: 6 });
    g.center();
    return (gcache[k] = g);
  }
  function rbox(w, h, d, r, m, x, y, z, parent) {
    const o = new T.Mesh(rgeo(w, h, d, r), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    parent && parent.add(o);
    return o;
  }
  function box(w, h, d, m, x, y, z, parent) {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    parent && parent.add(o);
    return o;
  }
  function cyl(rt, rb, h, m, x, y, z, parent, seg = 14) {
    const o = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m);
    o.position.set(x, y, z); o.castShadow = true;
    parent && parent.add(o);
    return o;
  }
  const tireM = mat(0x161616, 0.9, 0.0), rimM = mat(0xcfd3d8, 0.3, 0.8);
  function wheel(x, z, r, parent, wheels) {
    const g = new T.Group(); g.position.set(x, r, z);
    const t = cyl(r, r, r * 0.62, tireM, 0, 0, 0, g, 18); t.rotation.x = Math.PI / 2;
    const rim = cyl(r * 0.6, r * 0.6, r * 0.66, rimM, 0, 0, 0, g, 14); rim.rotation.x = Math.PI / 2;
    box(r * 1.1, r * 0.14, r * 0.7, mat(0x555a60), 0, 0, 0, g);
    parent.add(g); wheels.push({ g, r });
  }
  function headlights(g, fx, w, y, rx) {
    [-1, 1].forEach(s => {
      const f = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.42), lamp(0xfff6c9)); f.position.set(fx, y, s * (w / 2 - 0.35)); g.add(f);
      const b = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.36), lamp(C.red)); b.position.set(rx, y, s * (w / 2 - 0.3)); g.add(b);
      sprite(glowTex, 2.2, fx + 0.2, y, s * (w / 2 - 0.35), g);
      sprite(redTex, 1.6, rx - 0.1, y, s * (w / 2 - 0.3), g);
    });
    const cone = new T.Mesh(new T.PlaneGeometry(9, w * 1.5), new T.MeshBasicMaterial({ map: beamTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    cone.rotation.x = -Math.PI / 2; cone.position.set(fx + 4.6, 0.1, 0); g.add(cone);
  }

  // ---------- glow ----------
  function radial(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  const glowTex = radial([[0, 'rgba(255,230,170,1)'], [0.3, 'rgba(255,190,100,.45)'], [1, 'rgba(255,160,60,0)']]);
  const redTex = radial([[0, 'rgba(255,70,60,1)'], [0.35, 'rgba(255,40,40,.4)'], [1, 'rgba(255,0,0,0)']]);
  const beamTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,236,180,.75)'); g.addColorStop(1, 'rgba(255,220,140,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 44); x.lineTo(256, 0); x.lineTo(256, 128); x.lineTo(0, 84); x.closePath(); x.fill();
    return new T.CanvasTexture(c);
  })();
  function sprite(tex, size, x, y, z, parent) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.scale.set(size, size, 1); sp.position.set(x, y, z); parent.add(sp); return sp;
  }

  // ---------- vehicles (forward = +X) ----------
  function makeTaxi() {
    const g = new T.Group(), wheels = [];
    rbox(4.4, 0.9, 1.85, 0.3, paint(C.taxi), 0, 0.85, 0, g);
    rbox(2.4, 0.72, 1.62, 0.34, glassM(), -0.25, 1.52, 0, g);
    rbox(2.1, 0.14, 1.52, 0.1, paint(C.taxi), -0.25, 1.92, 0, g);
    box(4.42, 0.1, 1.87, mat(C.ink), 0, 0.95, 0, g);
    rbox(0.7, 0.24, 0.42, 0.06, lamp(0xffffff), -0.25, 2.1, 0, g);
    rbox(0.12, 0.3, 1.7, 0.05, mat(C.ink), 2.22, 0.58, 0, g);
    rbox(0.12, 0.3, 1.7, 0.05, mat(C.ink), -2.22, 0.58, 0, g);
    [-1.4, 1.4].forEach(x => [-0.9, 0.9].forEach(z => wheel(x, z, 0.4, g, wheels)));
    headlights(g, 2.2, 1.85, 0.95, -2.2);
    g.userData = { len: 4.4, wheels };
    return g;
  }
  function makeBus() {
    const g = new T.Group(), wheels = [];
    rbox(10.8, 2.9, 2.5, 0.45, paint(C.white), 0, 1.95, 0, g);
    box(10.82, 0.55, 2.52, paint(C.blue), 0, 0.95, 0, g);
    rbox(10.3, 1.0, 2.54, 0.25, glassM(), -0.1, 2.55, 0, g);
    for (let i = -4; i <= 4; i++) box(0.1, 1.04, 2.56, paint(C.white), i * 1.12, 2.55, 0, g);
    rbox(0.16, 1.5, 2.3, 0.1, glassM(), 5.42, 2.35, 0, g);
    rbox(1.3, 0.5, 2.0, 0.12, lamp(C.orange), 5.0, 3.5, 0, g);
    rbox(2.2, 0.3, 1.6, 0.12, mat(0xbfc4ca), -2.5, 3.5, 0, g);
    rbox(2.2, 0.3, 1.6, 0.12, mat(0xbfc4ca), 0.5, 3.5, 0, g);
    box(1.0, 1.9, 0.06, mat(0x20303f, 0.2, 0.4), 3.4, 1.55, 1.26, g);
    [-3.6, 3.5].forEach(x => [-1.3, 1.3].forEach(z => wheel(x, z, 0.58, g, wheels)));
    headlights(g, 5.42, 2.5, 0.95, -5.42);
    g.userData = { len: 10.8, wheels };
    return g;
  }
  let logoTex;
  function logo() {
    if (logoTex) return logoTex;
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f1'; x.fillRect(0, 0, 512, 160);
    x.fillStyle = '#0f2a6b'; x.fillRect(0, 118, 512, 42);
    x.fillStyle = '#ff5729'; x.fillRect(0, 104, 512, 10);
    x.fillStyle = '#0a0a0a'; x.font = '800 78px Arial,Helvetica,sans-serif'; x.textBaseline = 'middle';
    x.fillText('JFR', 150, 52);
    x.fillStyle = '#ff5729'; x.fillText('.', 290, 52);
    x.fillStyle = '#0a0a0a'; x.font = '700 18px Arial'; x.fillText('LOGÍSTICA · TERRITORIO', 150, 92);
    logoTex = new T.CanvasTexture(c); logoTex.anisotropy = 4;
    return logoTex;
  }
  function makeTruck(cabColor) {
    const g = new T.Group(), wheels = [];
    const chassis = mat(0x1d1f22, 0.7, 0.3);
    box(11.6, 0.35, 1.6, chassis, -0.1, 0.95, 0, g);
    rbox(2.5, 2.6, 2.4, 0.35, paint(cabColor), 5.2, 2.15, 0, g);
    rbox(1.3, 1.5, 2.4, 0.3, paint(cabColor), 4.1, 2.75, 0, g);
    rbox(0.14, 1.0, 2.1, 0.1, glassM(), 6.42, 2.65, 0, g);
    rbox(0.14, 0.9, 0.08, 0.1, glassM(), 5.5, 2.6, 1.22, g);
    rbox(0.14, 0.9, 0.08, 0.1, glassM(), 5.5, 2.6, -1.22, g);
    rbox(0.2, 0.9, 1.7, 0.1, mat(C.chrome, 0.25, 0.9), 6.45, 1.35, 0, g);
    rbox(0.3, 0.35, 2.5, 0.1, mat(C.chrome, 0.3, 0.8), 6.5, 0.8, 0, g);
    rbox(1.0, 0.25, 2.3, 0.1, paint(C.orange), 5.2, 3.55, 0, g);
    [-0.95, 0.95].forEach(z => cyl(0.12, 0.12, 2.6, mat(C.chrome, 0.25, 0.9), 3.55, 3.4, z * 1.12, g, 8));
    [-1, 1].forEach(s => { cyl(0.42, 0.42, 1.6, mat(0xaeb4ba, 0.35, 0.8), 3.9, 1.0, s * 1.25, g, 12).rotation.z = Math.PI / 2; });
    rbox(10.4, 3.4, 2.55, 0.12, mat(0xf4f4f1, 0.5, 0.05), -1.2, 2.95, 0, g);
    box(10.45, 0.22, 2.6, paint(C.navy), -1.2, 1.4, 0, g);
    [-1, 1].forEach(s => {
      const p = new T.Mesh(new T.PlaneGeometry(6.2, 1.9), new T.MeshBasicMaterial({ map: logo() }));
      p.position.set(-1.2, 3.1, s * 1.285); if (s < 0) p.rotation.y = Math.PI;
      g.add(p);
    });
    for (let i = -4; i <= 4; i++) box(0.05, 3.2, 2.58, mat(0xdcdcd6), -1.2 + i * 1.12, 2.95, 0, g);
    box(10.46, 0.12, 2.58, paint(C.orange), -1.2, 4.62, 0, g);
    wheel(5.5, -1.1, 0.62, g, wheels); wheel(5.5, 1.1, 0.62, g, wheels);
    [2.6, 1.5, -3.4, -4.6, -5.8].forEach(x => [-1.12, 1.12].forEach(z => wheel(x, z, 0.62, g, wheels)));
    headlights(g, 6.5, 2.4, 0.85, -6.4);
    g.userData = { len: 12.8, wheels };
    return g;
  }
  function makePerson() {
    const g = new T.Group();
    const shirt = [C.orange, C.blue, 0x2f8f5b, 0x8a4fd1, 0x2b2b2b, 0xe0a800, 0xd94a6a][Math.random() * 7 | 0];
    const pants = [0x222a3a, 0x3b3b3b, 0x5a4636, 0x1f3a5c][Math.random() * 4 | 0];
    const skin = [0xf0c8a0, 0xc68e63, 0x8d5a3b, 0xe2b48b][Math.random() * 4 | 0];
    const s = 1.55 + Math.random() * 0.25;
    const legs = [], arms = [];
    [-0.15, 0.15].forEach(z => {
      const p = new T.Group(); p.position.set(0, 0.95, z);
      cyl(0.1, 0.085, 0.95, mat(pants, 0.8, 0), 0, -0.47, 0, p, 8);
      box(0.3, 0.1, 0.16, mat(0x1b1b1b), 0.06, -0.95, 0, p);
      g.add(p); legs.push(p);
    });
    rbox(0.36, 0.72, 0.62, 0.16, mat(shirt, 0.7, 0), 0, 1.33, 0, g);
    [-0.37, 0.37].forEach(z => {
      const a = new T.Group(); a.position.set(0, 1.62, z);
      cyl(0.07, 0.06, 0.62, mat(shirt, 0.7, 0), 0, -0.3, 0, a, 8);
      g.add(a); arms.push(a);
    });
    const head = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), mat(skin, 0.7, 0)); head.position.set(0, 1.9, 0); head.castShadow = true; g.add(head);
    const hair = new T.Mesh(new T.SphereGeometry(0.205, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat([0x1a1410, 0x3b2a1c, 0x6b6b6b][Math.random() * 3 | 0], 0.9, 0));
    hair.position.set(-0.01, 1.92, 0); g.add(hair);
    if (Math.random() > 0.5) rbox(0.16, 0.34, 0.26, 0.05, mat(0x6b4a2a, 0.8, 0), -0.22, 1.1, 0.5, g);
    g.scale.setScalar(s);
    g.userData = { legs, arms, phase: Math.random() * 6.28 };
    return g;
  }
  function makeMoto() {
    const g = new T.Group(), wheels = [];
    rbox(1.6, 0.4, 0.4, 0.15, paint(C.ink), 0, 0.75, 0, g);
    rbox(0.8, 0.55, 0.5, 0.2, paint(C.orange), 0.3, 1.05, 0, g);
    rbox(0.42, 0.85, 0.42, 0.18, mat(C.blue, 0.7, 0), -0.2, 1.5, 0, g);
    const h = new T.Mesh(new T.SphereGeometry(0.23, 14, 12), mat(C.white, 0.3, 0.2)); h.position.set(-0.2, 2.05, 0); h.castShadow = true; g.add(h);
    box(0.08, 0.08, 0.8, mat(C.ink), 0.75, 1.35, 0, g);
    wheel(0.78, 0, 0.4, g, wheels); wheel(-0.78, 0, 0.4, g, wheels);
    g.userData = { len: 1.9, wheels };
    return g;
  }

  // ---------- scenery textures ----------
  function facade(dark) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = dark ? '#161d2e' : '#1f2638'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.fillStyle = Math.random() > (dark ? 0.45 : 0.6) ? '#ffc874' : '#2d3c5a';
      x.fillRect(i * 32 + 5, j * 32 + 6, 22, 20);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
    return t;
  }
  const facadeTex = [facade(false), facade(true)];

  // ---------- road ----------
  let curve, curveLen = 100, roadGroup, W = 110, built = false;
  const actors = [];

  function ribbon(c, a, b, y, material, samples) {
    const pos = [], idx = [], nrm = [];
    for (let i = 0; i <= samples; i++) {
      const u = i / samples, p = c.getPointAt(u), t = c.getTangentAt(u);
      const nx = t.z, nz = -t.x;
      pos.push(p.x + nx * a, y, p.z + nz * a, p.x + nx * b, y, p.z + nz * b);
      nrm.push(0, 1, 0, 0, 1, 0);
      if (i < samples) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    const m = new T.Mesh(geo, material);
    m.receiveShadow = true;
    return m;
  }
  const flat = (c) => new T.MeshLambertMaterial({ color: c, side: T.DoubleSide });

  function build() {
    if (roadGroup) scene.remove(roadGroup);
    actors.length = 0;
    roadGroup = new T.Group();
    scene.add(roadGroup);

    const span = W * 0.85, A = Math.min(7, W * 0.07);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = -span + (2 * span) * i / 40;
      pts.push(new T.Vector3(x, 0, A * Math.sin(x * 0.075 + 0.6) + A * 0.45 * Math.sin(x * 0.19 + 1.2) + 2));
    }
    curve = new T.CatmullRomCurve3(pts);
    curveLen = curve.getLength();
    const S = 240;

    const ground = new T.Mesh(new T.PlaneGeometry(W * 2.4, 140), new T.ShadowMaterial({ opacity: 0.4 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
    roadGroup.add(ground);

    roadGroup.add(ribbon(curve, -6.2, 6.2, 0.0, flat(0x2a2c36), S));
    roadGroup.add(ribbon(curve, -4.4, 4.4, 0.03, flat(0x34363f), S));
    roadGroup.add(ribbon(curve, -4.25, -4.1, 0.05, flat(0xbfc3cc), S));
    roadGroup.add(ribbon(curve, 4.1, 4.25, 0.05, flat(0xbfc3cc), S));
    roadGroup.add(ribbon(curve, -6.0, -4.4, 0.14, flat(0x6d7080), S));
    roadGroup.add(ribbon(curve, 4.4, 6.0, 0.14, flat(0x6d7080), S));
    roadGroup.add(ribbon(curve, -4.5, -4.4, 0.145, flat(0x8a8d9c), S));
    roadGroup.add(ribbon(curve, 4.4, 4.5, 0.145, flat(0x8a8d9c), S));

    const dashes = Math.floor(curveLen / 3.4);
    const dashM = new T.MeshBasicMaterial({ color: 0xf6d35b });
    for (let i = 0; i < dashes; i++) {
      const u = (i + 0.5) / dashes, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      const d = new T.Mesh(new T.PlaneGeometry(1.8, 0.18), dashM);
      d.rotation.x = -Math.PI / 2; d.rotation.z = Math.atan2(t.z, t.x);
      d.position.set(p.x, 0.055, p.z);
      roadGroup.add(d);
    }
    const zebra = new T.MeshBasicMaterial({ color: 0xcfd3dc });
    [0.3, 0.72].forEach(u => {
      const p = curve.getPointAt(u), t = curve.getTangentAt(u), ang = Math.atan2(t.z, t.x);
      for (let k = -3; k <= 3; k++) {
        const bar = new T.Mesh(new T.PlaneGeometry(0.5, 7.8), zebra);
        bar.rotation.x = -Math.PI / 2; bar.rotation.z = ang;
        bar.position.set(p.x + t.x * k * 0.95, 0.06, p.z + t.z * k * 0.95);
        roadGroup.add(bar);
      }
    });

    // ---- scenery ----
    const at = (u, off) => {
      const p = curve.getPointAt(u), t = curve.getTangentAt(u);
      return { x: p.x + t.z * off, z: p.z - t.x * off, ang: Math.atan2(t.z, t.x) };
    };
    for (let i = 0; i < 12; i++) {
      const u = 0.03 + (i / 12) * 0.95, q = at(u, 11.5 + Math.random() * 3);
      const w = 4 + Math.random() * 2.2, d = 4 + Math.random() * 2, h = 3.5 + Math.random() * 6;
      const dark = Math.random() > 0.55;
      const tex = facadeTex[dark ? 1 : 0].clone(); tex.needsUpdate = true; tex.repeat.set(w / 4, h / 4);
      const side = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6, metalness: 0.1 });
      const roof = mat(0x3a4053, 0.8, 0);
      const b = new T.Group();
      const body = new T.Mesh(new T.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
      body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; b.add(body);
      box(w + 0.25, 0.25, d + 0.25, mat(C.ink), 0, h + 0.12, 0, b);
      if (Math.random() > 0.5) box(w * 0.4, 0.8, d * 0.4, mat(0xbfc4ca), w * 0.15, h + 0.65, 0, b);
      b.position.set(q.x, 0, q.z); b.rotation.y = -q.ang;
      roadGroup.add(b);
    }
    const greens = [0x2f8a52, 0x3a9d5f, 0x56ad6a];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1, q = at((i + 0.5) / 16, side * (7.4 + Math.random() * 0.8));
      const tr = new T.Group();
      cyl(0.16, 0.22, 1.8, mat(0x6b4a2a, 0.9, 0), 0, 0.9, 0, tr, 8);
      for (let k = 0; k < 3; k++) {
        const s = new T.Mesh(new T.IcosahedronGeometry(1.0 + Math.random() * 0.4, 1), mat(greens[(i + k) % 3], 0.85, 0));
        s.position.set((Math.random() - 0.5) * 0.7, 2.3 + k * 0.55, (Math.random() - 0.5) * 0.7);
        s.castShadow = true; tr.add(s);
      }
      tr.position.set(q.x, 0, q.z); tr.rotation.y = Math.random() * 6;
      roadGroup.add(tr);
    }
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1, q = at((i + 0.3) / 8, side * 5.6);
      const lp = new T.Group();
      cyl(0.08, 0.13, 4.6, mat(0x2a2d31, 0.5, 0.6), 0, 2.3, 0, lp, 8);
      box(1.4, 0.12, 0.16, mat(0x2a2d31, 0.5, 0.6), -side * 0.65, 4.6, 0, lp);
      box(0.5, 0.12, 0.3, lamp(0xffe3a0), -side * 1.3, 4.52, 0, lp);
      sprite(glowTex, 7, -side * 1.3, 4.4, 0, lp);
      lp.position.set(q.x, 0.14, q.z); lp.rotation.y = -q.ang;
      roadGroup.add(lp);
    }
    [0.25, 0.8].forEach(u => {
      const q = at(u, 8.4), py = new T.Group(), steel = mat(0xe6e2d8, 0.5, 0.5);
      [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([x, z]) => {
        const leg = cyl(0.07, 0.2, 9.4, steel, x * 0.55, 4.7, z * 0.55, py, 6);
        leg.rotation.z = -x * 0.06; leg.rotation.x = z * 0.06;
      });
      [4.5, 7.0].forEach(y => box(1.7, 0.1, 1.7, steel, 0, y, 0, py));
      box(8, 0.2, 0.2, steel, 0, 9.0, 0, py); box(5.4, 0.2, 0.2, steel, 0, 7.8, 0, py);
      [-3.8, 3.8].forEach(x => { cyl(0.12, 0.12, 0.7, mat(0xdfe6ee, 0.2, 0.2), x, 8.6, 0, py, 8); sprite(redTex, 2.4, x, 9.4, 0, py); });
      py.position.set(q.x, 0, q.z); py.rotation.y = -q.ang;
      roadGroup.add(py);
    });

    // ---- traffic ----
    const k = 160 / curveLen;
    const vs = [
      [() => makeTruck(C.blue), 1, 0.05, 0.020],
      [() => makeTaxi(), 1, 0.27, 0.034],
      [() => makeBus(), 1, 0.50, 0.025],
      [() => makeTaxi(), 1, 0.74, 0.030],
      [() => makeTruck(C.orange), 1, 0.90, 0.021],
      [() => makeBus(), -1, 0.12, 0.024],
      [() => makeTaxi(), -1, 0.36, 0.036],
      [() => makeTruck(C.navy), -1, 0.58, 0.019],
      [() => makeTaxi(), -1, 0.82, 0.032],
      [() => makeMoto(), 1, 0.15, 0.045],
      [() => makeMoto(), -1, 0.95, 0.042],
    ];
    vs.forEach(([mk, dir, u0, sp]) => {
      const g = mk(); roadGroup.add(g);
      actors.push({ type: 'car', g, dir, u: u0, sp: sp * k, lane: dir * 2.2 });
    });
    for (let i = 0; i < 16; i++) {
      const g = makePerson(); roadGroup.add(g);
      const side = i % 2 ? 1 : -1;
      actors.push({ type: 'ped', g, dir: Math.random() > 0.5 ? 1 : -1, u: Math.random(),
        sp: (0.0042 + Math.random() * 0.003) * k, lane: side * (5.0 + Math.random() * 0.6) });
    }
    sun.shadow.camera.left = -W * 0.8; sun.shadow.camera.right = W * 0.8;
    sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
    sun.shadow.camera.far = 220; sun.shadow.camera.updateProjectionMatrix();
    built = true;
  }

  function place(a) {
    const u = ((a.u % 1) + 1) % 1;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    a.g.position.set(p.x + t.z * a.lane, a.type === 'ped' ? 0.14 : 0.04, p.z - t.x * a.lane);
    a.g.rotation.y = -Math.atan2(t.z, t.x) + (a.dir < 0 ? Math.PI : 0);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    W = w < 560 ? 70 : w < 1000 ? 105 : 125;
    const d = W / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const el = T.MathUtils.degToRad(40);
    camera.userData.base = new T.Vector3(0, d * Math.sin(el), d * Math.cos(el));
    camera.updateProjectionMatrix();
    build();
    draw(0);
  }

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
    camera.position.set(b.x + cx * 8, b.y + cy * 3, b.z);
    camera.lookAt(0, 0, 0);
    actors.forEach(a => {
      a.u += a.dir * a.sp * dt;
      place(a);
      const ud = a.g.userData;
      if (a.type === 'ped') {
        const s = Math.sin(clock * 7 + ud.phase) * 0.65;
        ud.legs[0].rotation.z = s; ud.legs[1].rotation.z = -s;
        ud.arms[0].rotation.z = -s * 0.8; ud.arms[1].rotation.z = s * 0.8;
        a.g.position.y = 0.14 + Math.abs(Math.sin(clock * 7 + ud.phase)) * 0.05;
      } else {
        const dist = a.sp * curveLen * dt;
        ud.wheels.forEach(w => { w.g.rotation.z -= dist / w.r; });
        a.g.position.y += Math.sin(clock * 9 + a.u * 40) * 0.012;
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
