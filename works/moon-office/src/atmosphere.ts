export function makeAtmosphere(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let width = 1;
  let height = 1;
  let previous = 0;
  const motes = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), speed: 0.004 + Math.random() * 0.01, radius: 0.4 + Math.random(), phase: Math.random() * 6.28 }));
  const resize = () => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (time: number) => {
    const delta = Math.min((time - previous) / 1000, 0.05); previous = time;
    ctx.clearRect(0, 0, width, height);
    for (const mote of motes) {
      mote.y -= delta * mote.speed;
      if (mote.y < -0.02) mote.y = 1.02;
      const x = mote.x * width + Math.sin(time / 8000 + mote.phase) * 16;
      ctx.beginPath(); ctx.arc(x, mote.y * height, mote.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(238,214,161,${0.16 + (Math.sin(time / 1800 + mote.phase) + 1) * 0.13})`;
      ctx.fill();
    }
    frame = requestAnimationFrame(draw);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, width, height);
    if (!motion.matches && !document.hidden) { previous = performance.now(); frame = requestAnimationFrame(draw); }
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  document.addEventListener('visibilitychange', sync); motion.addEventListener('change', sync);
  resize(); sync();
  return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync); };
}
