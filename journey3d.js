(() => {
  const canvas = document.getElementById('world');
  if (!canvas || !window.THREE) return;
  const T = THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skyEl = document.querySelector('.sky');

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xffb98a, 90, 400);
  const camera = new T.PerspectiveCamera(40, 1, 0.5, 900);

  const hemi = new T.HemisphereLight(0xffffff, 0x888888, 0.8);
  const sun = new T.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 320 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(hemi, sun, sun.target);

  const C = { orange: 0xff5729, blue: 0x1763ff, navy: 0x0f2a6b, ink: 0x141414,
              taxi: 0xf6b800, white: 0xf4f4f1, glass: 0x0d1621, chrome: 0xc9ced4, red: 0xd8232a };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.random() * arr.length | 0];
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

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
    const g = new T.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
    g.center();
    return (gcache[k] = g);
  }
  function rbox(w, h, d, r, m, x, y, z, parent) {
    const o = new T.Mesh(rgeo(w, h, d, r), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    parent && parent.add(o); return o;
  }
  const boxGeos = {};
  function box(w, h, d, m, x, y, z, parent) {
    const k = [w, h, d].join();
    const o = new T.Mesh(boxGeos[k] || (boxGeos[k] = new T.BoxGeometry(w, h, d)), m);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    parent && parent.add(o); return o;
  }
  function cyl(rt, rb, h, m, x, y, z, parent, seg = 14) {
    const k = ['c', rt, rb, h, seg].join();
    const o = new T.Mesh(boxGeos[k] || (boxGeos[k] = new T.CylinderGeometry(rt, rb, h, seg)), m);
    o.position.set(x, y, z); o.castShadow = true;
    parent && parent.add(o); return o;
  }
  const tireM = mat(0x161616, 0.9, 0), rimM = mat(0xcfd3d8, 0.3, 0.8);
  function wheel(x, z, r, parent, wheels) {
    const g = new T.Group(); g.position.set(x, r, z);
    cyl(r, r, r * 0.62, tireM, 0, 0, 0, g, 18).rotation.x = Math.PI / 2;
    cyl(r * 0.6, r * 0.6, r * 0.66, rimM, 0, 0, 0, g, 14).rotation.x = Math.PI / 2;
    box(r * 1.1, r * 0.14, r * 0.7, mat(0x555a60), 0, 0, 0, g);
    parent.add(g); wheels.push({ g, r });
  }

  // ---------- glow (night) ----------
  function radial(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  const addSprite = (map) => new T.SpriteMaterial({ map, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false });
  const glowMat = addSprite(radial([[0, 'rgba(255,230,170,1)'], [0.3, 'rgba(255,190,100,.45)'], [1, 'rgba(255,160,60,0)']]));
  const redMat = addSprite(radial([[0, 'rgba(255,70,60,1)'], [0.35, 'rgba(255,40,40,.4)'], [1, 'rgba(255,0,0,0)']]));
  const beamTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,236,180,.75)'); g.addColorStop(1, 'rgba(255,220,140,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 44); x.lineTo(256, 0); x.lineTo(256, 128); x.lineTo(0, 84); x.closePath(); x.fill();
    return new T.CanvasTexture(c);
  })();
  const beamMat = new T.MeshBasicMaterial({ map: beamTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false });
  function sprite(m, size, x, y, z, parent) {
    const sp = new T.Sprite(m); sp.scale.set(size, size, 1); sp.position.set(x, y, z); parent.add(sp); return sp;
  }
  function headlights(g, fx, w, y, rx) {
    [-1, 1].forEach(s => {
      const f = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.42), lamp(0xfff6c9)); f.position.set(fx, y, s * (w / 2 - 0.35)); g.add(f);
      const b = new T.Mesh(new T.BoxGeometry(0.1, 0.2, 0.36), lamp(C.red)); b.position.set(rx, y, s * (w / 2 - 0.3)); g.add(b);
      sprite(glowMat, 2.2, fx + 0.2, y, s * (w / 2 - 0.35), g);
      sprite(redMat, 1.6, rx - 0.1, y, s * (w / 2 - 0.3), g);
    });
    const cone = new T.Mesh(new T.PlaneGeometry(9, w * 1.5), beamMat);
    cone.rotation.x = -Math.PI / 2; cone.position.set(fx + 4.6, 0.1, 0); g.add(cone);
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
    g.userData = { wheels }; return g;
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
    g.userData = { wheels }; return g;
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
  const logoMat = () => new T.MeshBasicMaterial({ map: logo() });
  function makeTruck(cabColor) {
    const g = new T.Group(), wheels = [];
    box(11.6, 0.35, 1.6, mat(0x1d1f22, 0.7, 0.3), -0.1, 0.95, 0, g);
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
      const p = new T.Mesh(new T.PlaneGeometry(6.2, 1.9), logoMat());
      p.position.set(-1.2, 3.1, s * 1.285); if (s < 0) p.rotation.y = Math.PI; g.add(p);
    });
    for (let i = -4; i <= 4; i++) box(0.05, 3.2, 2.58, mat(0xdcdcd6), -1.2 + i * 1.12, 2.95, 0, g);
    box(10.46, 0.12, 2.58, paint(C.orange), -1.2, 4.62, 0, g);
    wheel(5.5, -1.1, 0.62, g, wheels); wheel(5.5, 1.1, 0.62, g, wheels);
    [2.6, 1.5, -3.4, -4.6, -5.8].forEach(x => [-1.12, 1.12].forEach(z => wheel(x, z, 0.62, g, wheels)));
    headlights(g, 6.5, 2.4, 0.85, -6.4);
    g.userData = { wheels }; return g;
  }
  function makeMoto() {
    const g = new T.Group(), wheels = [];
    rbox(1.6, 0.4, 0.4, 0.15, paint(C.ink), 0, 0.75, 0, g);
    rbox(0.8, 0.55, 0.5, 0.2, paint(C.orange), 0.3, 1.05, 0, g);
    rbox(0.42, 0.85, 0.42, 0.18, mat(C.blue, 0.7, 0), -0.2, 1.5, 0, g);
    const h = new T.Mesh(new T.SphereGeometry(0.23, 14, 12), mat(C.white, 0.3, 0.2)); h.position.set(-0.2, 2.05, 0); h.castShadow = true; g.add(h);
    box(0.08, 0.08, 0.8, mat(C.ink), 0.75, 1.35, 0, g);
    wheel(0.78, 0, 0.4, g, wheels); wheel(-0.78, 0, 0.4, g, wheels);
    g.userData = { wheels }; return g;
  }
  function makePerson() {
    const g = new T.Group();
    const shirt = pick([C.orange, C.blue, 0x2f8f5b, 0x8a4fd1, 0x2b2b2b, 0xe0a800, 0xd94a6a]);
    const pants = pick([0x222a3a, 0x3b3b3b, 0x5a4636, 0x1f3a5c]);
    const skin = pick([0xf0c8a0, 0xc68e63, 0x8d5a3b, 0xe2b48b]);
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
      cyl(0.07, 0.06, 0.62, mat(shirt, 0.7, 0), 0, -0.3, 0, a, 8); g.add(a); arms.push(a);
    });
    const head = new T.Mesh(new T.SphereGeometry(0.2, 12, 10), mat(skin, 0.7, 0)); head.position.set(0, 1.9, 0); head.castShadow = true; g.add(head);
    const hair = new T.Mesh(new T.SphereGeometry(0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(pick([0x1a1410, 0x3b2a1c, 0x6b6b6b]), 0.9, 0));
    hair.position.set(-0.01, 1.92, 0); g.add(hair);
    g.scale.setScalar(rnd(1.55, 1.8));
    g.userData = { legs, arms, phase: rnd(0, 6.28) }; return g;
  }

  // ---------- scenery pieces ----------
  const facadeMats = [];
  const FAC = [
    ['#d7dbe2', '#6e88a6'], ['#cdbfae', '#5d7088'], ['#3b4a63', '#8fb4d8'],
  ].map(([wall, win]) => {
    const lit = []; for (let i = 0; i < 16; i++) lit.push(Math.random() > 0.45);
    const mk = (emissive) => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); x.fillStyle = emissive ? '#000' : wall; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        if (emissive && !lit[i * 4 + j]) continue;
        x.fillStyle = emissive ? '#ffc874' : win; x.fillRect(i * 32 + 5, j * 32 + 6, 22, 20);
      }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
    };
    return [mk(false), mk(true)];
  });
  function makeBuilding(w, h, d, v) {
    const [m0, e0] = FAC[v % FAC.length], m = m0.clone(), e = e0.clone();
    m.needsUpdate = e.needsUpdate = true;
    m.repeat.set(w / 4, h / 4); e.repeat.set(w / 4, h / 4);
    const side = new T.MeshStandardMaterial({ map: m, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6, metalness: 0.1 });
    facadeMats.push(side);
    const roof = mat(0x6b7080, 0.8, 0);
    const b = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(w, h, d), [side, side, roof, roof, side, side]);
    body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true; b.add(body);
    box(w + 0.25, 0.25, d + 0.25, mat(C.ink), 0, h + 0.12, 0, b);
    if (Math.random() > 0.5) box(w * 0.4, 0.8, d * 0.4, mat(0xbfc4ca), w * 0.15, h + 0.65, 0, b);
    return b;
  }
  const icoGeo = new T.IcosahedronGeometry(1, 1);
  function makeTree(greens, s = 1) {
    const tr = new T.Group();
    cyl(0.16 * s, 0.22 * s, 1.8 * s, mat(0x6b4a2a, 0.9, 0), 0, 0.9 * s, 0, tr, 8);
    for (let k = 0; k < 3; k++) {
      const m = new T.Mesh(icoGeo, mat(greens[k % greens.length], 0.85, 0));
      const sc = (1.0 + Math.random() * 0.4) * s; m.scale.set(sc, sc, sc);
      m.position.set(rnd(-0.35, 0.35) * s, (2.3 + k * 0.55) * s, rnd(-0.35, 0.35) * s); m.castShadow = true; tr.add(m);
    }
    tr.rotation.y = rnd(0, 6); return tr;
  }
  function makeLamp(side) {
    const lp = new T.Group(), dark = mat(0x2a2d31, 0.5, 0.6);
    cyl(0.08, 0.13, 4.6, dark, 0, 2.3, 0, lp, 8);
    box(1.4, 0.12, 0.16, dark, -side * 0.65, 4.6, 0, lp);
    box(0.5, 0.12, 0.3, lamp(0xffe3a0), -side * 1.3, 4.52, 0, lp);
    sprite(glowMat, 7, -side * 1.3, 4.4, 0, lp);
    return lp;
  }
  function makePylon() {
    const py = new T.Group(), steel = mat(0xdedad0, 0.5, 0.5);
    [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([x, z]) => {
      const leg = cyl(0.07, 0.2, 12, steel, x * 0.5, 6, z * 0.5, py, 6);
      leg.rotation.z = -x * 0.05; leg.rotation.x = z * 0.05;
    });
    [5, 9].forEach(y => box(1.8, 0.1, 1.8, steel, 0, y, 0, py));
    box(0.2, 0.2, 8, steel, 0, 12, 0, py); box(0.2, 0.2, 6, steel, 0, 9.8, 0, py);
    [[12, -3.8], [12, 3.8], [9.8, -2.8], [9.8, 2.8]].forEach(([y, z]) => cyl(0.12, 0.12, 0.7, mat(0xdfe6ee, 0.2, 0.2), 0, y - 0.4, z, py, 8));
    sprite(redMat, 2.4, 0, 13, 0, py);
    return py;
  }
  function makeTurbine(h) {
    const g = new T.Group(), white = mat(0xf3f5f7, 0.45, 0.1);
    cyl(0.3, 0.6, h, white, 0, h / 2, 0, g, 14);
    box(2.2, 1.0, 1.0, white, 0.3, h + 0.2, 0, g);
    const rotor = new T.Group(); rotor.position.set(1.5, h + 0.2, 0); g.add(rotor);
    const hub = new T.Mesh(new T.SphereGeometry(0.55, 12, 10), white); rotor.add(hub);
    for (let i = 0; i < 3; i++) {
      const arm = new T.Group(); arm.rotation.x = i * Math.PI * 2 / 3;
      const bl = h * 0.5;
      const b = box(0.1, bl, 0.45, white, 0.2, bl / 2 + 0.3, 0, arm);
      b.scale.z = 1; rotor.add(arm);
    }
    g.userData = { rotor, spd: rnd(0.8, 1.4) };
    return g;
  }
  function boardTex(text, sub) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#0f2a6b'; x.fillRect(0, 0, 512, 256);
    x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(10, 10, 492, 236);
    x.fillStyle = '#fff'; x.font = '800 72px Arial'; x.textAlign = 'center'; x.fillText(text, 256, 120);
    x.fillStyle = '#ff8a5c'; x.font = '700 30px Arial'; x.fillText(sub, 256, 190);
    return new T.CanvasTexture(c);
  }
  function makeBoard(text, sub) {
    const g = new T.Group(), dark = mat(0x2a2d31, 0.5, 0.6);
    [-3.6, 3.6].forEach(x => cyl(0.14, 0.14, 7.5, dark, x, 3.75, 0, g, 8));
    const p = new T.Mesh(new T.PlaneGeometry(9, 4.5), new T.MeshBasicMaterial({ map: boardTex(text, sub) }));
    p.position.set(0, 6.0, 0.12); g.add(p);
    box(9.2, 4.7, 0.2, dark, 0, 6.0, 0, g);
    return g;
  }
  function makeWarehouse(w, h, d) {
    const g = new T.Group();
    box(w, h, d, mat(0xe9ecef, 0.6, 0.1), 0, h / 2, 0, g);
    box(w + 0.1, 0.9, d + 0.1, paint(C.blue), 0, h - 0.8, 0, g);
    box(w * 0.7, 0.35, 0.1, paint(C.orange), 0, h * 0.4, d / 2 + 0.06, g);
    for (let i = -1; i <= 1; i++) box(w * 0.2, h * 0.55, 0.1, mat(0x5a6270, 0.5, 0.3), i * w * 0.28, h * 0.3, d / 2 + 0.05, g);
    return g;
  }

  // ---------- world ----------
  let curve, curveLen = 1, world, built = false;
  const actors = [], turbines = [];
  const Z0 = [0.04, 0.35], Z1 = [0.35, 0.66], Z2 = [0.66, 0.97];

  function ribbon(c, a, b, y, material, u0, u1) {
    const S = Math.max(8, Math.round((u1 - u0) * curveLen / 2.2));
    const pos = [], idx = [], nrm = [];
    for (let i = 0; i <= S; i++) {
      const u = u0 + (u1 - u0) * i / S, p = c.getPointAt(u), t = c.getTangentAt(u);
      const nx = t.z, nz = -t.x;
      pos.push(p.x + nx * a, y, p.z + nz * a, p.x + nx * b, y, p.z + nz * b);
      nrm.push(0, 1, 0, 0, 1, 0);
      if (i < S) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
    geo.setIndex(idx);
    const m = new T.Mesh(geo, material); m.receiveShadow = true; return m;
  }
  const flat = (c) => new T.MeshLambertMaterial({ color: c, side: T.DoubleSide });
  const at = (u, off) => {
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    return { x: p.x + t.z * off, z: p.z - t.x * off, ang: Math.atan2(t.z, t.x) };
  };
  const put = (obj, u, off, yaw = 0, y = 0) => {
    const q = at(u, off); obj.position.set(q.x, y, q.z); obj.rotation.y = -q.ang + yaw; world.add(obj); return q;
  };
  const along = (u0, u1, step, fn) => { const n = Math.max(1, Math.round((u1 - u0) * curveLen / step)); for (let i = 0; i < n; i++) fn(u0 + (u1 - u0) * (i + 0.5) / n, i); };

  function build() {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const x = i * 10;
      pts.push(new T.Vector3(x, 0, 14 * Math.sin(x * 0.02 + 0.4) + 6 * Math.sin(x * 0.055 + 1.3)));
    }
    curve = new T.CatmullRomCurve3(pts); curve.arcLengthDivisions = 2500;
    curveLen = curve.getLength();
    world = new T.Group(); scene.add(world);

    // ground with zone colours
    const gg = new T.PlaneGeometry(900, 520, 90, 1);
    gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position, col = [], A = new T.Color(0x6fa05c), B = new T.Color(0xb2b56a), D = new T.Color(0x8a8d96), tmp = new T.Color();
    for (let i = 0; i < gp.count; i++) {
      const u = Math.min(1, Math.max(0, (gp.getX(i) + 320) / 640));
      tmp.copy(A).lerp(B, ss(0.30, 0.40, u)).lerp(D, ss(0.62, 0.70, u)); col.push(tmp.r, tmp.g, tmp.b);
    }
    gg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    const ground = new T.Mesh(gg, new T.MeshLambertMaterial({ vertexColors: true }));
    ground.position.set(320, -0.05, 0); ground.receiveShadow = true; world.add(ground);

    // road
    const U0 = 0, U1 = 1;
    world.add(ribbon(curve, -4.6, 4.6, 0.03, flat(0x3c3e46), U0, U1));
    world.add(ribbon(curve, -4.4, -4.25, 0.05, flat(0xd8dbe2), U0, U1));
    world.add(ribbon(curve, 4.25, 4.4, 0.05, flat(0xd8dbe2), U0, U1));
    world.add(ribbon(curve, -6.4, -4.6, 0.02, flat(0x9a9488), Z0[0] - 0.04, Z1[1]));
    world.add(ribbon(curve, 4.6, 6.4, 0.02, flat(0x9a9488), Z0[0] - 0.04, Z1[1]));
    [-1, 1].forEach(s => {
      world.add(ribbon(curve, s * 4.6, s * 6.4, 0.14, flat(0x8a8d98), Z2[0] - 0.02, 1));
      world.add(ribbon(curve, s * 4.6, s * 4.72, 0.145, flat(0x6d7080), Z2[0] - 0.02, 1));
      world.add(ribbon(curve, s * 5.0, s * 5.12, 0.45, flat(0xb8bcc6), Z0[0] - 0.04, Z1[1]));   // guard rails
    });
    const dashM = new T.MeshBasicMaterial({ color: 0xf6d35b });
    const dg = new T.PlaneGeometry(1.8, 0.18);
    along(0, 1, 3.4, (u) => {
      const t = curve.getTangentAt(u), p = curve.getPointAt(u);
      const d = new T.Mesh(dg, dashM); d.rotation.x = -Math.PI / 2; d.rotation.z = Math.atan2(t.z, t.x);
      d.position.set(p.x, 0.055, p.z); world.add(d);
    });
    const zebra = new T.MeshBasicMaterial({ color: 0xe8eaf0 }), zg = new T.PlaneGeometry(0.5, 8.4);
    [0.72, 0.8, 0.9].forEach(u => {
      const p = curve.getPointAt(u), t = curve.getTangentAt(u), ang = Math.atan2(t.z, t.x);
      for (let k = -3; k <= 3; k++) {
        const bar = new T.Mesh(zg, zebra); bar.rotation.x = -Math.PI / 2; bar.rotation.z = ang;
        bar.position.set(p.x + t.x * k * 0.95, 0.06, p.z + t.z * k * 0.95); world.add(bar);
      }
    });

    // ---- ZONE 0: movilidad (highway) ----
    const lush = [0x2f8a52, 0x3a9d5f, 0x56ad6a];
    along(0, Z1[1], 11, (u, i) => { if (Math.random() > 0.25) put(makeTree(lush, rnd(0.9, 1.3)), u, (i % 2 ? 1 : -1) * rnd(9, 22), 0); });
    along(Z0[0], Z0[1] + 0.02, 70, (u, i) => put(makeWarehouse(rnd(12, 18), rnd(5, 7), rnd(8, 11)), u, rnd(17, 24), 0));
    [0.10, 0.28].forEach((u, i) => put(makeBoard(i ? 'CARGA · RUTAS' : 'MOVILIDAD', i ? 'logística y transporte' : 'infraestructura vial'), u, 10.5, 0));
    along(0, Z1[1], 40, (u, i) => {
      const h = new T.Mesh(new T.SphereGeometry(1, 24, 14), mat(i % 3 ? 0x5e8f55 : 0x6a9a58, 0.95, 0));
      const r = rnd(18, 34); h.scale.set(r * 1.6, r * 0.38, r); h.receiveShadow = true; put(h, u, rnd(60, 120), 0, -r * 0.05);
    });
    // ---- ZONE 1: energia ----
    along(Z1[0] + 0.01, Z1[1] + 0.01, 38, (u, i) => {
      const t = makeTurbine(rnd(24, 30)); put(t, u, rnd(22, 70), Math.PI / 2 + rnd(-0.25, 0.25));
      turbines.push(t);
    });
    const pylons = [];
    along(Z1[0] - 0.03, Z1[1] + 0.05, 34, (u) => pylons.push(put(makePylon(), u, 13, 0)));
    world.updateMatrixWorld(true);
    const wm = new T.LineBasicMaterial({ color: 0x20232a });
    const pg = world.children.slice(-pylons.length);
    for (let i = 0; i < pg.length - 1; i++) {
      [[12, -3.8], [12, 3.8], [9.8, -2.8], [9.8, 2.8]].forEach(([y, z]) => {
        const a = pg[i].localToWorld(new T.Vector3(0, y - 0.7, z)), b = pg[i + 1].localToWorld(new T.Vector3(0, y - 0.7, z)), pp = [];
        for (let k = 0; k <= 10; k++) { const t = k / 10; pp.push(new T.Vector3(a.x + (b.x - a.x) * t, a.y - 2.2 * 4 * t * (1 - t), a.z + (b.z - a.z) * t)); }
        world.add(new T.Line(new T.BufferGeometry().setFromPoints(pp), wm));
      });
    }
    const panelM = mat(0x1d3c7a, 0.25, 0.7);
    for (let r = 0; r < 3; r++) along(Z1[0] + 0.05, Z1[0] + 0.2, 4.2, (u) => {
      const p = box(3.4, 0.12, 1.7, panelM, 0, 0.9, 0, new T.Group()); const g = p.parent;
      p.rotation.x = -0.45; box(0.12, 0.9, 0.12, mat(0x9aa0aa), 0, 0.45, 0, g); put(g, u, 12 + r * 3, 0);
    });
    along(Z1[0], Z1[1], 30, (u, i) => { if (i % 2) put(makeTree(lush, 0.9), u, -rnd(9, 14), 0); });
    // ---- ZONE 2: territorio ----
    along(Z2[0] - 0.02, 1, 9, (u, i) => put(makeBuilding(rnd(4, 6.5), rnd(5, 14), rnd(4, 6), i), u, rnd(11, 15), 0));
    along(Z2[0] - 0.02, 1, 12, (u, i) => put(makeBuilding(rnd(5, 8), rnd(14, 30), rnd(5, 8), i + 1), u, rnd(23, 32), 0));
    along(Z2[0], 1, 14, (u, i) => put(makeBuilding(rnd(4, 6), rnd(2.5, 4.5), rnd(4, 5), i + 2), u, -rnd(10, 12), 0));
    along(Z2[0] - 0.02, 1, 10, (u, i) => { const t = makeTree(lush, 0.8); put(t, u, (i % 2 ? 1 : -1) * 7.2, 0, 0.14); });
    put(makeBoard('TERRITORIO', 'ciudad y paisaje'), 0.70, 10.5, 0, 0);
    put(makeBoard('ENERGÍA', 'sistemas y transición'), 0.40, 10.5, 0, 0);
    along(0.0, 1, 24, (u, i) => { const side = i % 2 ? 1 : -1; if (u > Z1[0] && u < Z2[0]) return; put(makeLamp(side), u, side * 5.7, 0, u > Z2[0] ? 0.14 : 0); });

    // ---- traffic ----
    const mk = [
      [() => makeTruck(C.blue), 7.5], [() => makeTruck(C.orange), 7], [() => makeTruck(C.navy), 7.8],
      [() => makeBus(), 8.5], [() => makeTaxi(), 11], [() => makeMoto(), 13],
    ];
    const plan = [[0, 7], [1, 5], [2, 4], [3, 4], [4, 8], [5, 4]];
    plan.forEach(([k, n]) => {
      for (let i = 0; i < n; i++) {
        const g = mk[k][0](); world.add(g);
        const dir = i % 2 ? 1 : -1;
        actors.push({ g, ped: false, dir, u: rnd(0.02, 0.98), spd: mk[k][1] * rnd(0.85, 1.15), lane: dir * 2.2 });
      }
    });
    for (let i = 0; i < 26; i++) {
      const g = makePerson(); world.add(g);
      actors.push({ g, ped: true, home: rnd(Z2[0], 0.98), amp: rnd(0.006, 0.016), sp: rnd(0.25, 0.5), ph: rnd(0, 6.28), lane: (i % 2 ? 1 : -1) * rnd(5.0, 6.0), u: 0, dir: 1 });
    }
    built = true;
  }

  function place(a) {
    const u = ((a.u % 1) + 1) % 1;
    const p = curve.getPointAt(u), t = curve.getTangentAt(u);
    a.g.position.set(p.x + t.z * a.lane, a.ped ? 0.14 : 0.04, p.z - t.x * a.lane);
    a.g.rotation.y = -Math.atan2(t.z, t.x) + (a.dir < 0 ? Math.PI : 0);
  }

  // ---------- keyframes ----------
  const K = {
    skyTop: [0x1b2b5e, 0x4a90e2, 0x0e1530], skyHor: [0xffb98a, 0xcfe8ff, 0xe0643e],
    hemiS: [0xa8b8ff, 0xcfe6ff, 0x8fa6ff], hemiG: [0x5a4a5a, 0x9a9a7a, 0x2a2438],
    sunC: [0xffb27a, 0xfff6e8, 0xffa86b], hemiI: [0.6, 0.95, 0.7], sunI: [0.9, 1.05, 0.85],
  };
  const SUN = [new T.Vector3(-70, 22, 40), new T.Vector3(-25, 85, 30), new T.Vector3(-75, 26, 36)];
  const tc = new T.Color(), tc2 = new T.Color();
  function kc(arr, p, out) {
    const t = p < 0.5 ? p * 2 : (p - 0.5) * 2;
    return out.setHex(arr[p < 0.5 ? 0 : 1]).lerp(tc2.setHex(arr[p < 0.5 ? 1 : 2]), t);
  }
  const kn = (arr, p) => (p < 0.5 ? arr[0] + (arr[1] - arr[0]) * p * 2 : arr[1] + (arr[2] - arr[1]) * (p - 0.5) * 2);
  const camKey = [[0, 31, 14], [0.2, 30, 15], [0.5, 44, 24], [0.8, 32, 16], [1, 34, 17]];
  function camParams(p) {
    for (let i = 0; i < camKey.length - 1; i++) {
      const a = camKey[i], b = camKey[i + 1];
      if (p <= b[0]) { const t = ss(a[0], b[0], p); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
    }
    return [camKey[4][1], camKey[4][2]];
  }

  // ---------- loop ----------
  let target = 0, cur = 0, mx = 0, my = 0, cx = 0, cy = 0, clock = 0, last = performance.now();
  let night = 0, portrait = false;
  const root = document.documentElement;
  const readScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    target = Math.min(1, Math.max(0, scrollY / max));
  };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  const focus = new T.Vector3(), camP = new T.Vector3();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    if (built) {
      cur += (target - cur) * Math.min(1, dt * 4.5);
      const p = cur, u = 0.05 + p * 0.9;
      const P = curve.getPointAt(u), Tg = curve.getTangentAt(u), F = curve.getPointAt(Math.min(0.995, u + 0.03));
      let [off, hgt] = camParams(p);
      const ak = Math.min(1.5, Math.max(1, 1.7 / camera.aspect)); off *= ak; hgt *= ak;
      if (portrait) { off *= 1.1; hgt *= 1.1; }
      camP.set(P.x - Tg.z * off + cx * 6, hgt + cy * 2, P.z + Tg.x * off);
      camera.position.copy(camP);
      focus.set(F.x, 1.5, F.z); camera.lookAt(focus);

      kc(K.skyTop, p, tc); const top = '#' + tc.getHexString();
      kc(K.skyHor, p, tc); const hor = '#' + tc.getHexString();
      scene.fog.color.copy(tc);
      skyEl && (skyEl.style.background = `linear-gradient(${top}, ${hor} 82%)`);
      kc(K.hemiS, p, tc); hemi.color.copy(tc); kc(K.hemiG, p, tc); hemi.groundColor.copy(tc); hemi.intensity = kn(K.hemiI, p);
      kc(K.sunC, p, tc); sun.color.copy(tc); sun.intensity = kn(K.sunI, p);
      const s0 = p < 0.5 ? SUN[0] : SUN[1], s1 = p < 0.5 ? SUN[1] : SUN[2], st = p < 0.5 ? p * 2 : (p - 0.5) * 2;
      sun.target.position.copy(focus);
      sun.position.copy(focus).add(new T.Vector3().lerpVectors(s0, s1, st));
      night = Math.max(ss(0.6, 0.95, p), 0.7 * (1 - ss(0, 0.2, p)));
      glowMat.opacity = night; redMat.opacity = 0.2 + 0.8 * night; beamMat.opacity = night * 0.9;
      facadeMats.forEach(m => { m.emissiveIntensity = night * 0.95; });
      root.style.setProperty('--p', p.toFixed(4));

      if (!reduced) {
        turbines.forEach(t => { t.userData.rotor.rotation.x += dt * t.userData.spd; });
        const len = curveLen;
        actors.forEach(a => {
          if (a.ped) {
            const ph = clock * a.sp + a.ph;
            a.u = a.home + a.amp * Math.sin(ph); a.dir = Math.cos(ph) >= 0 ? 1 : -1;
          } else a.u += a.dir * a.spd * dt / len;
          place(a);
          if (Math.abs(a.u - u) * len > 170) return;
          const ud = a.g.userData;
          if (a.ped) {
            const s = Math.sin(clock * 7 + ud.phase) * 0.65;
            ud.legs[0].rotation.z = s; ud.legs[1].rotation.z = -s;
            ud.arms[0].rotation.z = -s * 0.8; ud.arms[1].rotation.z = s * 0.8;
            a.g.position.y = 0.14 + Math.abs(s) * 0.07;
          } else {
            const dist = a.spd * dt;
            ud.wheels.forEach(w => { w.g.rotation.z -= dist / w.r; });
          }
        });
      } else actors.forEach(place);
      cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; portrait = w / h < 0.9;
    camera.fov = portrait ? 58 : 40; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize(); build(); readScroll(); cur = target;
  requestAnimationFrame(frame);
})();
