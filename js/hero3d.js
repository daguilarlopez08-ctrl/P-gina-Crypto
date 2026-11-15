/* Meridiano — hero 3D: globo de partículas + red que reacciona al mouse y cambia de color según el mercado */
(function () {
  const MX = window.MX, hero = (MX.hero = { setMood() {} });
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !window.THREE) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, 2, 0.1, 100);
  cam.position.set(0, 0, 7.2);
  const group = new THREE.Group(); scene.add(group);

  const accent = () => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6');
  let target = accent(); const color = target.clone();

  /* globo: esfera de Fibonacci */
  const N = 2200, R = 2.2, pos = new Float32Array(N * 3), pts = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * Math.PI * (3 - Math.sqrt(5)); const v = new THREE.Vector3(Math.cos(t) * r * R, y * R, Math.sin(t) * r * R); pts.push(v); pos.set([v.x, v.y, v.z], i * 3); }
  const gGeo = new THREE.BufferGeometry(); gGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const gMat = new THREE.PointsMaterial({ size: 0.028, color, transparent: true, opacity: 0.85, depthWrite: false });
  group.add(new THREE.Points(gGeo, gMat));

  /* red: nodos elevados conectados con sus vecinos */
  const nodes = []; for (let i = 0; i < 70; i++) nodes.push(pts[Math.floor((i * 31.7) % N)].clone().multiplyScalar(1.12 + ((i * 7) % 5) * 0.03));
  const seg = []; nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && a.distanceTo(b) < 1.25) seg.push(a.x, a.y, a.z, b.x, b.y, b.z); }));
  const lGeo = new THREE.BufferGeometry(); lGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const lMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 });
  group.add(new THREE.LineSegments(lGeo, lMat));
  const nGeo = new THREE.BufferGeometry().setFromPoints(nodes), nMat = new THREE.PointsMaterial({ size: 0.075, color: 0xffffff, transparent: true, opacity: 0.9 });
  group.add(new THREE.Points(nGeo, nMat));

  /* polvo exterior */
  const D = 500, dp = new Float32Array(D * 3); for (let i = 0; i < D; i++) { const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12543.123, c = Math.sin(i * 39.425) * 9631.77; dp.set([((a % 1) * 16), ((b % 1) * 7), ((c % 1) * 6) - 2], i * 3); }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dMat = new THREE.PointsMaterial({ size: 0.02, color, transparent: true, opacity: 0.4 });
  const dust = new THREE.Points(dGeo, dMat); scene.add(dust);

  const mouse = { x: 0, y: 0 }; let visible = true, raf = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    group.position.x = w > 760 ? 2.9 : 0; group.scale.setScalar(w > 760 ? 1 : 0.8); gMat.opacity = w > 760 ? 0.85 : 0.4;
  }
  function frame(t) {
    raf = 0; if (!visible) return;
    color.lerp(target, 0.04); gMat.color.copy(color); lMat.color.copy(color); dMat.color.copy(color);
    group.rotation.y += reduce ? 0 : 0.0018;
    group.rotation.x += (mouse.y * 0.45 - group.rotation.x) * 0.05;
    group.rotation.z += (-mouse.x * 0.12 - group.rotation.z) * 0.05;
    group.rotation.y += mouse.x * 0.004;
    dust.rotation.y = t * 0.00003; dust.position.x = -mouse.x * 0.3; dust.position.y = mouse.y * 0.2;
    lMat.opacity = 0.22 + Math.sin(t * 0.0012) * 0.08;
    renderer.render(scene, cam);
    if (!reduce || color.getHex() !== target.getHex()) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  window.addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; kick(); }, { passive: true });
  window.addEventListener('resize', () => { size(); kick(); });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) { size(); kick(); } }).observe(canvas);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden && canvas.offsetParent !== null; kick(); });

  /* chg: variación 24h del mercado. Verde si sube, rojo si baja, acento si no hay dato. */
  hero.setMood = (chg) => { MX._mood = chg; target = !MX.isNum(chg) ? accent() : new THREE.Color(chg >= 0 ? '#22e39a' : '#ff4d6d'); kick(); };
  hero.resize = () => { size(); kick(); };
  size(); kick();
})();
