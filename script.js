(() => {
  /* portrait parallax (desktop) */
  const portrait = document.querySelector('.portrait'), hero = document.querySelector('.hero');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (portrait && hero && !reduced && !matchMedia('(max-width: 850px)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * 14; ty = ((e.clientY - r.top) / r.height - .5) * 10; });
    hero.addEventListener('pointerleave', () => { tx = ty = 0; });
    (function loop() { cx += (tx - cx) * .08; cy += (ty - cy) * .08; portrait.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
  }

  /* panels reveal + rail state */
  const rail = [...document.querySelectorAll('.rail a')];
  const set = id => rail.forEach(a => a.classList.toggle('on', a.dataset.s === id));
  set('perfil');
  if (!('IntersectionObserver' in window)) { document.querySelectorAll('.stage').forEach(s => s.classList.add('in')); return; }
  const secs = [...document.querySelectorAll('#perfil,[data-scene]')];
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); set(e.target.id); }
  }), { rootMargin: '-45% 0px -45% 0px' });
  secs.forEach(s => io.observe(s));
})();
