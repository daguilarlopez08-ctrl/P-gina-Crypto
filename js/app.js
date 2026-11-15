/* Meridiano — arranque: navegación, buscador, moneda, efecto tilt, ayuda "?" y alertas */
(function () {
  const MX = window.MX, api = MX.api, h = MX.h;
  const $ = (id) => document.getElementById(id);
  const NAV = [['panorama', 'Panorama'], ['activo', 'Ficha del activo'], ['tecnico', 'Resumen técnico'], ['escenarios', 'Escenarios de precio'], ['noticias', 'Noticias y eventos'], ['fundamental', 'Análisis fundamental'], ['comprar', 'Dónde y cuándo comprar'], null, ['screener', 'Screener'], ['comparador', 'Comparador'], ['watchlist', 'Watchlist y alertas'], ['riesgo', 'Riesgo y DCA'], null, ['aprender', 'Modo aprendizaje'], ['config', 'Configuración']];
  const ASSET_VIEWS = ['activo', 'tecnico', 'escenarios', 'noticias', 'fundamental', 'comprar'];

  document.documentElement.dataset.accent = MX.settings.accent;
  $('nav').innerHTML = NAV.map((n) => (n ? `<a href="#${n[0]}" data-view="${n[0]}"><svg viewBox="0 0 24 24">${MX.icons[n[0]]}</svg><span>${n[1]}</span></a>` : '<div class="sep"></div>')).join('');

  /* ---------- router ---------- */
  let renderId = 0, token = { ok: () => false };
  MX.render = () => {
    const id = ++renderId, view = MX.state.view; token = { ok: () => id === renderId && MX.state.view === view };
    try { const r = MX.views[view].render(token); if (r && r.catch) r.catch((e) => console.error(e)); } catch (e) { console.error(e); }
  };
  function route() {
    const v = location.hash.slice(1); MX.state.view = MX.views[v] ? v : 'panorama';
    document.querySelectorAll('.view').forEach((s) => { const on = s.id === 'view-' + MX.state.view; s.classList.toggle('active', on); if (!on && s.id !== 'view-panorama') s.innerHTML = ''; /* evita ids duplicados entre vistas */ });
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === MX.state.view));
    closeMenu(); $('popover').hidden = true; window.scrollTo(0, 0); MX.render();
    if (MX.state.view === 'panorama' && MX.hero.resize) MX.hero.resize();
  }
  MX.open = (asset, view = 'activo') => {
    MX.state.asset = { type: asset.type, id: asset.id, symbol: asset.symbol, name: asset.name }; MX.store.set('asset', MX.state.asset);
    if (location.hash.slice(1) === view) route(); else location.hash = view;
  };
  window.addEventListener('hashchange', route);

  /* ---------- menú móvil ---------- */
  const closeMenu = () => { $('sidebar').classList.remove('open'); $('scrim').classList.remove('open'); };
  $('menuBtn').onclick = () => { $('sidebar').classList.toggle('open'); $('scrim').classList.toggle('open'); };
  $('scrim').onclick = closeMenu;

  /* ---------- buscador con autocompletado ---------- */
  MX.attachSearch = (input, drop, onPick) => {
    let items = [], sel = 0, t, seq = 0, pending = false;
    const show = () => {
      drop.hidden = false;
      drop.innerHTML = (items.length ? items.map((a, i) => `<div class="dd-item ${i === sel ? 'sel' : ''}" data-i="${i}">${MX.logo(a, a.image)}<span class="nm"><b>${h(a.symbol)}</b> <span class="muted">${h(a.name)}</span></span><span class="badge ${a.type === 'crypto' ? 'acc' : ''}">${a.type === 'crypto' ? 'Cripto' : 'Acción'}</span></div>`).join('') : `<div class="dd-empty">${pending ? 'Buscando…' : 'Sin resultados.'}</div>`) +
        (!MX.settings.finnhub ? '<div class="dd-empty small">Para buscar cualquier acción agrega tu clave de Finnhub en Configuración. Sin clave se muestran las más conocidas.</div>' : '');
    };
    const pick = (a) => { if (!a) return; input.value = ''; drop.hidden = true; input.blur(); onPick({ type: a.type, id: a.id, symbol: a.symbol, name: a.name }); };
    input.addEventListener('input', () => {
      const q = input.value.trim(); clearTimeout(t); const my = ++seq;
      if (!q) { drop.hidden = true; return; }
      items = api.searchLocal(q); sel = 0; pending = true; show();
      t = setTimeout(async () => {
        const r = await api.searchRemote(q); if (my !== seq) return; pending = false;
        const seen = new Set(); items = items.concat(r).filter((x) => { const k = MX.assetKey(x); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12); show();
      }, 300);
    });
    input.addEventListener('keydown', (e) => {
      if (drop.hidden) return;
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); show(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); show(); e.preventDefault(); }
      else if (e.key === 'Enter') { pick(items[sel]); e.preventDefault(); }
      else if (e.key === 'Escape') { drop.hidden = true; input.blur(); }
    });
    drop.addEventListener('mousedown', (e) => { const it = e.target.closest('.dd-item'); if (it) { e.preventDefault(); pick(items[+it.dataset.i]); } });
    input.addEventListener('blur', () => setTimeout(() => (drop.hidden = true), 160));
    input.addEventListener('focus', () => { if (input.value.trim() && items.length) show(); });
  };
  MX.attachSearch($('searchInput'), $('searchDrop'), (a) => MX.open(a));
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('searchInput').focus(); } });

  /* ---------- moneda USD / CLP ---------- */
  const paintCur = () => { document.querySelectorAll('#curSeg button').forEach((b) => b.classList.toggle('on', b.dataset.cur === MX.curLabel())); $('fxNote').textContent = MX.fx.CLP ? `1 USD = ${MX.num(MX.fx.CLP, 2)} CLP · ${MX.fx.source} · ${MX.time(MX.fx.ts)}` : ''; };
  async function loadFx() { const r = await api.fx(); if (r.data) { MX.fx = { CLP: r.data, source: r.source, ts: r.ts }; } return !!r.data; }
  $('curSeg').onclick = async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.cur === 'CLP' && !MX.fx.CLP && !(await loadFx())) return MX.toast('Tipo de cambio USD/CLP no disponible en este momento. Se mantienen los precios en USD.');
    MX.settings.currency = b.dataset.cur; MX.saveSettings(); paintCur(); MX.render();
  };

  /* ---------- tarjetas con inclinación 3D ---------- */
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let cur = null;
    const reset = () => { if (cur) { cur.classList.remove('tilting'); cur.style.setProperty('--rx', '0deg'); cur.style.setProperty('--ry', '0deg'); cur = null; } };
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.tilt'); if (c !== cur) reset(); if (!c) return; cur = c;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.classList.add('tilting'); c.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg'); c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    }, { passive: true });
    document.addEventListener('pointerleave', reset);
  }

  /* ---------- ayuda "?" ---------- */
  document.addEventListener('click', (e) => {
    const pop = $('popover'), b = e.target.closest('.learn');
    if (!b) { if (!e.target.closest('#popover')) pop.hidden = true; return; }
    e.preventDefault(); e.stopPropagation();
    const g = MX.glossary[b.dataset.learn]; if (!g) return;
    pop.innerHTML = `<h4>${g[0]}</h4><p><b>Qué es.</b> ${g[1]}</p><p><b>Cómo se lee.</b> ${g[2]}</p>`; pop.hidden = false;
    const r = b.getBoundingClientRect(), w = pop.offsetWidth, ph = pop.offsetHeight;
    pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left - 20)) + scrollX + 'px';
    pop.style.top = (r.bottom + ph + 16 > innerHeight && r.top - ph - 10 > 0 ? r.top - ph - 10 : r.bottom + 10) + scrollY + 'px';
  });

  /* ---------- alertas ---------- */
  MX.checkAlerts = async () => {
    for (const al of MX.alerts.list.filter((a) => !a.fired)) {
      try {
        let v = null;
        if (al.type.startsWith('price')) { const q = await api.quote(al.asset); v = q.data && q.data.price; }
        else { const k = await api.klines(al.asset, '1D', 120); if (!k.sample) { const r = MX.ind.rsi(k.data.map((c) => c.close)); v = r[r.length - 1]; } }
        if (!MX.isNum(v)) continue;
        if (al.type.endsWith('above') ? v >= al.value : v <= al.value) {
          al.fired = Date.now(); al.firedVal = v; MX.alerts.save();
          const msg = `Alerta ${al.asset.symbol}: ${al.type.startsWith('rsi') ? 'RSI' : 'precio'} ${al.type.endsWith('above') ? 'sobre' : 'bajo'} ${al.value} (ahora ${MX.num(v, 4)})`;
          MX.toast('🔔 ' + msg, 12000);
          if ('Notification' in window && Notification.permission === 'granted') try { new Notification('Meridiano', { body: msg }); } catch (e) {}
          if (MX._drawAlerts) MX._drawAlerts();
        }
      } catch (e) {}
    }
  };
  setInterval(() => { if (!document.hidden) MX.checkAlerts(); }, 60000);
  /* refresco de datos del panorama y precios */
  setInterval(() => { if (document.hidden) return; if (MX.state.view === 'panorama' || MX.state.view === 'watchlist') MX.render(); }, 120000);

  /* ---------- inicio ---------- */
  paintCur();
  (MX.settings.currency === 'CLP' ? loadFx() : Promise.resolve()).then(() => { paintCur(); route(); MX.checkAlerts(); if (MX.settings.currency !== 'CLP') loadFx().then(paintCur); });
})();
