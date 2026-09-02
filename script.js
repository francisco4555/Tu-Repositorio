(() => {
  const portrait = document.querySelector('.portrait');
  const hero = document.querySelector('.hero');

  if (!portrait || !hero) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 850px)').matches;
  if (reduced || mobile) return;

  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    targetX = x * 14;
    targetY = y * 10;
  });

  hero.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
  });

  function animate() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    portrait.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
