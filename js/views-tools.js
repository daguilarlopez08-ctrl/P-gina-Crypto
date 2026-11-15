/* Meridiano — screener, comparador, watchlist y alertas, riesgo y DCA, modo aprendizaje, configuración */
(function () {
  const MX = window.MX, api = MX.api, h = MX.h, V = MX.views, I = MX.ind;
  const $ = (id) => document.getElementById(id);
  const last = (a) => a[a.length - 1];
  const cell = (a, img) => `<div class="asset-cell">${MX.logo(a, img)}<div><b>${h(a.symbol)}</b> <span>${h(a.name)}</span></div></div>`;
  const STABLE = new Set(['usdt', 'usdc', 'dai', 'fdusd', 'usde', 'usds', 'pyusd', 'tusd', 'busd', 'usd1', 'usdd', 'wbtc', 'steth', 'wsteth', 'weth', 'weeth', 'cbbtc', 'wbeth', 'susde', 'leo']);
  async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); }
  const pageH = (t, p, extra = '') => `<div class="page-h"><div><h2>${t}</h2><p>${p}</p></div>${extra}</div>`;

  /* ---------- 8. Screener ---------- */
  const FILTERS = [['rsiLow', 'RSI bajo 30 (sobreventa)', 'rsi'], ['rsiHigh', 'RSI sobre 70 (sobrecompra)', 'rsi'], ['golden', 'Golden cross reciente', 'cross'], ['death', 'Death cross reciente', 'cross'], ['volHigh', 'Volumen inusual (2× promedio)', 'vol'], ['nearSup', 'Precio cerca de un soporte', 'sr'], ['weekDrop', 'Mayor caída de la semana', null]];
  const scr = { on: new Set(MX.store.get('scr', ['rsiLow'])), rows: null, ts: 0, anySample: false };
  V.screener = {
    async render(token) {
      const el = $('view-screener');
      el.innerHTML = pageH('Screener de oportunidades', 'Filtra activos por señales técnicas en velas diarias. Un filtro que se cumple es un punto de partida para investigar, no una señal de compra.') +
        `<div class="card"><div class="toggle-group" id="scrF">${FILTERS.map((f) => `<span class="chip ${scr.on.has(f[0]) ? 'on' : ''}" data-k="${f[0]}">${f[1]} ${f[2] ? MX.learn(f[2]) : ''}</span>`).join('')}</div>
        <div class="row between mt"><span class="small muted" id="scrInfo">Universo: 40 mayores criptomonedas + acciones de tu watchlist (requieren clave de datos).</span><button class="btn sm ghost" id="scrRun">Actualizar</button></div><div class="bar mt" id="scrBar" hidden><i style="width:0"></i></div><div id="scrBody" class="mt">${MX.sk(5)}</div></div>`;
      const draw = () => {
        if (!scr.rows) return; let rows = scr.rows.slice(); const on = scr.on;
        if (on.has('rsiLow')) rows = rows.filter((r) => r.rsi < 30); if (on.has('rsiHigh')) rows = rows.filter((r) => r.rsi > 70);
        if (on.has('golden')) rows = rows.filter((r) => r.cross === 'golden'); if (on.has('death')) rows = rows.filter((r) => r.cross === 'death');
        if (on.has('volHigh')) rows = rows.filter((r) => r.volRel >= 2); if (on.has('nearSup')) rows = rows.filter((r) => r.supDist != null && r.supDist <= 3);
        if (on.has('weekDrop')) rows = rows.filter((r) => r.chg7 < 0).sort((a, b) => a.chg7 - b.chg7).slice(0, 10); else rows.sort((a, b) => a.rsi - b.rsi);
        $('scrBody').innerHTML = (scr.anySample ? '<div class="note" style="margin-bottom:10px"><span class="badge sample">DATOS DE EJEMPLO</span> Algunas filas usan velas simuladas porque la fuente no respondió. Están marcadas.</div>' : '') +
          (rows.length ? `<div class="tbl-wrap"><table><thead><tr><th>Activo</th><th>Precio</th><th>1 día</th><th>7 días</th><th>RSI</th><th>Tendencia</th><th>Vol. relativo</th><th>Dist. a soporte</th><th>Puntaje</th></tr></thead><tbody>${rows.map((r) => `<tr class="click" data-k="${h(MX.assetKey(r.asset))}"><td>${cell(r.asset, r.img)} ${r.sample ? '<span class="badge sample">EJEMPLO</span>' : ''}</td><td class="num">${MX.money(r.price)}</td><td class="num ${MX.cls(r.chg1)}">${MX.pct(r.chg1, 1)}</td><td class="num ${MX.cls(r.chg7)}">${MX.pct(r.chg7, 1)}</td><td class="num ${r.rsi < 30 ? 'up' : r.rsi > 70 ? 'down' : ''}">${MX.num(r.rsi, 1)}</td><td>${r.trend == null ? '<span class="muted">' + MX.NA + '</span>' : r.trend ? '<span class="badge up">Alcista</span>' : '<span class="badge down">Bajista</span>'}${r.cross ? ` <span class="badge acc">${r.cross === 'golden' ? 'Golden' : 'Death'} cross</span>` : ''}</td><td class="num">${r.volRel != null ? MX.num(r.volRel, 2) + '×' : MX.NA}</td><td class="num">${r.supDist != null ? MX.num(r.supDist, 1) + '%' : MX.NA}</td><td class="num ${MX.cls(r.score)}">${r.score > 0 ? '+' : ''}${r.score}</td></tr>`).join('')}</tbody></table></div>`
            : `<p class="muted">Ningún activo cumple ${on.size > 1 ? 'todos los filtros a la vez' : 'este filtro'} ahora. Prueba quitando alguno.</p>`) +
          `<span class="src">${rows.length} de ${scr.rows.length} activos · Fuente: Binance / CoinGecko / fuente de acciones configurada · ${MX.time(scr.ts)} · tendencia = precio vs EMA 200 · cruces de los últimos 10 días</span>`;
        $('scrBody').querySelectorAll('tr.click').forEach((tr) => (tr.onclick = () => MX.open(scr.rows.find((r) => MX.assetKey(r.asset) === tr.dataset.k).asset)));
      };
      const run = async (force) => {
        if (scr.rows && !force && Date.now() - scr.ts < 300000) return draw();
        const mk = await api.markets(); if (!token.ok()) return;
        const uni = mk.data.filter((c) => !STABLE.has(c.symbol.toLowerCase())).slice(0, 40).map((c) => ({ asset: { type: 'crypto', id: c.id, symbol: c.symbol.toUpperCase(), name: c.name }, img: c.image }));
        if (MX.settings.twelve || MX.settings.alpha) MX.watch.list.filter((w) => w.type === 'stock').slice(0, 6).forEach((w) => uni.push({ asset: w }));
        const rows = [], bar = $('scrBar'); let done = 0; if (bar) bar.hidden = false; scr.anySample = false;
        await pool(uni, 5, async (u) => {
          try {
            const res = await api.klines(u.asset, '1D', 300), cd = res.data; if (cd.length < 60) return;
            const a = MX.analyze(cd, '1D'), n = a.n, lc = last(a.crosses), e200 = last(a.ema200), s1 = a.supports[0];
            if (res.sample) scr.anySample = true;
            rows.push({ asset: u.asset, img: u.img, sample: res.sample, price: a.price, chg1: (a.c[n - 1] / a.c[n - 2] - 1) * 100, chg7: n > 8 ? (a.c[n - 1] / a.c[n - 8] - 1) * 100 : null, rsi: last(a.rsi), trend: e200 == null ? null : a.price > e200, cross: lc && n - 1 - lc.i <= 10 ? lc.type : null, volRel: a.volRel == null ? null : a.volRel, supDist: s1 ? ((a.price - s1.price) / a.price) * 100 : null, score: a.score });
          } catch (e) {}
          done++; if (token.ok() && $('scrBar')) $('scrBar').firstElementChild.style.width = (done / uni.length) * 100 + '%';
        });
        if (!token.ok()) return; scr.rows = rows; scr.ts = Date.now(); if ($('scrBar')) $('scrBar').hidden = true; draw();
      };
      $('scrF').onclick = (e) => { if (e.target.closest('.learn')) return; const c = e.target.closest('.chip'); if (!c) return; const k = c.dataset.k; scr.on.has(k) ? scr.on.delete(k) : scr.on.add(k); c.classList.toggle('on'); MX.store.set('scr', [...scr.on]); draw(); };
      $('scrRun').onclick = () => { $('scrBody').innerHTML = MX.sk(5); run(true); };
      run(false);
    },
  };

  /* ---------- 9. Comparador ---------- */
  const CMP_COL = ['#8b5cf6', '#4cc9f0', '#f5c451', '#f472b6'];
  let cmp = MX.store.get('cmp', [{ type: 'crypto', id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }, { type: 'crypto', id: 'ethereum', symbol: 'ETH', name: 'Ethereum' }]);
  const perf = (cd, days) => { const t = last(cd).time - days * 86400; let b = null; for (let i = cd.length - 1; i >= 0; i--) if (cd[i].time <= t) { b = cd[i]; break; } return b ? (last(cd).close / b.close - 1) * 100 : null; };
  V.comparador = {
    async render(token) {
      const el = $('view-comparador');
      el.innerHTML = pageH('Comparador', 'Compara de 2 a 4 activos lado a lado: rendimiento, volatilidad e indicadores en velas diarias.') +
        `<div class="card"><div class="row"><div class="chips" id="cmpChips">${cmp.map((a, i) => `<span class="chip on" style="border-color:${CMP_COL[i]}"><i style="width:8px;height:8px;border-radius:50%;background:${CMP_COL[i]};display:inline-block"></i>${h(a.symbol)} <span class="x" data-i="${i}">✕</span></span>`).join('')}</div>
          ${cmp.length < 4 ? `<div class="search" style="max-width:280px"><input id="cmpIn" type="search" placeholder="Agregar activo…" style="height:36px;padding-left:14px" autocomplete="off"><div class="dropdown" id="cmpDrop" hidden></div></div>` : ''}
          <button class="btn sm ghost" id="cmpCur">+ ${h(MX.state.asset.symbol)} (activo actual)</button></div></div><div id="cmpBody" class="mt"><div class="card">${MX.sk(5)}</div></div>`;
      const save = () => { MX.store.set('cmp', cmp); MX.render(); };
      const add = (a) => { if (cmp.length >= 4) return MX.toast('Máximo 4 activos'); if (cmp.some((x) => MX.assetKey(x) === MX.assetKey(a))) return; cmp.push(a); save(); };
      $('cmpChips').onclick = (e) => { const x = e.target.closest('.x'); if (x) { cmp.splice(+x.dataset.i, 1); save(); } };
      $('cmpCur').onclick = () => add({ ...MX.state.asset });
      if ($('cmpIn')) MX.attachSearch($('cmpIn'), $('cmpDrop'), add);
      if (cmp.length < 2) { $('cmpBody').innerHTML = '<div class="card"><p class="muted">Agrega al menos 2 activos para comparar.</p></div>'; return; }
      const data = await Promise.all(cmp.map((a) => MX.loadAsset(a, '1D'))); if (!token.ok()) return;
      const col = (fn) => data.map((d, i) => `<td class="num">${d.a ? fn(d.a, d.res.data, cmp[i]) : MX.NA}</td>`).join('');
      const pc = (v) => `<span class="${MX.cls(v)}">${MX.pct(v, 1)}</span>`;
      const vol = (a, cd, as) => { const r = []; for (let i = Math.max(1, a.n - 90); i < a.n; i++) r.push(Math.log(a.c[i] / a.c[i - 1])); const m = r.reduce((x, y) => x + y, 0) / r.length, sd = Math.sqrt(r.reduce((x, y) => x + (y - m) ** 2, 0) / r.length); return sd * Math.sqrt(as.type === 'crypto' ? 365 : 252) * 100; };
      const dd = (a) => { let pk = -Infinity, m = 0; for (let i = Math.max(0, a.n - 90); i < a.n; i++) { pk = Math.max(pk, a.c[i]); m = Math.min(m, (a.c[i] / pk - 1) * 100); } return m; };
      $('cmpBody').innerHTML = (data.some((d) => d.res.sample) ? '<div class="note" style="margin-bottom:12px"><span class="badge sample">DATOS DE EJEMPLO</span> Al menos un activo usa velas simuladas (marcado en la tabla).</div>' : '') +
        `<div class="card"><div class="card-h"><h3>Rendimiento relativo (base 100, últimos 90 días)</h3></div><div class="chart-box" id="cmpChart" style="height:320px"></div></div>
        <div class="card mt"><div class="tbl-wrap"><table><thead><tr><th>Métrica</th>${cmp.map((a, i) => `<th style="color:${CMP_COL[i]}">${h(a.symbol)} ${data[i].res.sample ? '<span class="badge sample">EJEMPLO</span>' : ''}</th>`).join('')}</tr></thead><tbody>
          <tr><td>Precio</td>${col((a) => MX.money(a.price))}</tr>
          <tr><td>Rendimiento 7 días</td>${col((a, cd) => pc(perf(cd, 7)))}</tr><tr><td>Rendimiento 30 días</td>${col((a, cd) => pc(perf(cd, 30)))}</tr><tr><td>Rendimiento 90 días</td>${col((a, cd) => pc(perf(cd, 90)))}</tr>
          <tr><td><span class="row" style="gap:6px">Volatilidad anualizada ${MX.learn('volat')}</span></td>${col((a, cd, as) => MX.num(vol(a, cd, as), 1) + '%')}</tr>
          <tr><td>Peor caída desde un máximo (90 días)</td>${col((a) => pc(dd(a)))}</tr>
          <tr><td><span class="row" style="gap:6px">RSI (14) ${MX.learn('rsi')}</span></td>${col((a) => MX.num(last(a.rsi), 1))}</tr>
          <tr><td><span class="row" style="gap:6px">Precio vs EMA 200 ${MX.learn('ema')}</span></td>${col((a) => (last(a.ema200) == null ? MX.NA : pc((a.price / last(a.ema200) - 1) * 100)))}</tr>
          <tr><td><span class="row" style="gap:6px">ATR diario ${MX.learn('atr')}</span></td>${col((a) => MX.num((a.atrLast / a.price) * 100, 2) + '%')}</tr>
          <tr><td><span class="row" style="gap:6px">Puntaje técnico ${MX.learn('score')}</span></td>${col((a) => `<span class="${MX.cls(a.score)}">${a.score > 0 ? '+' : ''}${a.score} · ${a.label}</span>`)}</tr>
        </tbody></table></div><span class="src">Fuentes: ${[...new Set(data.map((d) => d.res.source))].map(h).join(' · ')} · ${MX.time(Date.now())} · rendimientos pasados no garantizan resultados futuros</span></div>`;
      MX.chart.lines($('cmpChart'), data.map((d, i) => { const cd = d.res.data.filter((x) => x.time >= last(d.res.data).time - 90 * 86400), b = cd[0].close; return { title: cmp[i].symbol, color: CMP_COL[i], data: cd.map((x) => ({ time: x.time, value: (x.close / b) * 100 })) }; }), { fmt: (v) => v.toFixed(1) });
    },
  };

  /* ---------- 10. Watchlist y alertas ---------- */
  const AL_TYPES = { price_above: 'Precio sube sobre', price_below: 'Precio baja de', rsi_above: 'RSI diario sube sobre', rsi_below: 'RSI diario baja de' };
  V.watchlist = {
    async render(token) {
      const el = $('view-watchlist'), wl = MX.watch.list, opts = [MX.state.asset].concat(wl.filter((w) => MX.assetKey(w) !== MX.assetKey(MX.state.asset)));
      const notif = 'Notification' in window ? Notification.permission : 'unsupported';
      el.innerHTML = pageH('Watchlist y alertas', 'Tus favoritos y alertas se guardan solo en este navegador. Las alertas se revisan cada minuto mientras esta página esté abierta.') +
        `<div class="grid g-side"><div class="card"><div class="card-h"><h3>Mis favoritos</h3><span class="small muted">Agrega con la ★ en la ficha de un activo</span></div><div id="wlBody">${wl.length ? MX.sk(3) : `<p class="muted">Aún no tienes favoritos. Busca un activo y toca la estrella ★.</p>`}</div></div>
        <div class="card"><div class="card-h"><h3>Alertas</h3>${notif === 'default' ? '<button class="btn sm ghost" id="alNotif">Activar notificaciones</button>' : notif === 'granted' ? '<span class="badge up">Notificaciones activas</span>' : ''}</div>
          <div class="form"><label class="field">Activo<select id="alA">${opts.map((a, i) => `<option value="${i}">${h(a.symbol)} · ${h(a.name)}</option>`).join('')}</select></label>
          <label class="field">Condición<select id="alT">${Object.entries(AL_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field"><span id="alLbl">Valor (US$)</span><input id="alV" type="number" step="any" min="0" inputmode="decimal"></label><button class="btn" id="alAdd">Crear alerta</button></div>
          <div id="alList" class="mt"></div><p class="small muted mt">Las alertas de precio se evalúan en USD. Las de acciones necesitan una clave de datos en Configuración.</p></div></div>`;
      const drawAl = () => { $('alList').innerHTML = MX.alerts.list.length ? MX.alerts.list.map((al) => `<div class="mover" style="cursor:default"><div><b>${h(al.asset.symbol)}</b> <span class="muted">${AL_TYPES[al.type]}</span> <b class="num">${al.type.startsWith('rsi') ? MX.num(al.value, 1) : MX.usd(al.value)}</b><div class="small ${al.fired ? 'warn' : 'muted'}">${al.fired ? `Se cumplió a las ${MX.time(al.fired)} (valor ${MX.num(al.firedVal, 4)})` : 'Activa · esperando condición'}</div></div><button class="btn sm ghost" data-del="${al.id}">Eliminar</button></div>`).join('') : '<p class="muted small">Sin alertas creadas.</p>'; };
      drawAl(); MX._drawAlerts = () => $('alList') && drawAl();
      $('alT').onchange = () => ($('alLbl').textContent = $('alT').value.startsWith('rsi') ? 'Valor de RSI (0 a 100)' : 'Valor (US$)');
      $('alAdd').onclick = () => { const v = parseFloat($('alV').value), t = $('alT').value; if (!MX.isNum(v) || v <= 0 || (t.startsWith('rsi') && v >= 100)) return MX.toast('Ingresa un valor válido'); const a = opts[+$('alA').value]; MX.alerts.add({ asset: { type: a.type, id: a.id, symbol: a.symbol, name: a.name }, type: t, value: v }); $('alV').value = ''; drawAl(); MX.toast('Alerta creada', 2500); MX.checkAlerts(); };
      $('alList').onclick = (e) => { const b = e.target.closest('[data-del]'); if (b) { MX.alerts.remove(b.dataset.del); drawAl(); } };
      if ($('alNotif')) $('alNotif').onclick = () => Notification.requestPermission().then(() => MX.render());
      if (!wl.length) return;
      const qs = await Promise.all(wl.map((a) => api.quote(a))); if (!token.ok()) return;
      $('wlBody').innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Activo</th><th>Precio</th><th>24h</th><th>Fuente</th><th></th></tr></thead><tbody>${wl.map((a, i) => { const q = qs[i].data; return `<tr class="click" data-i="${i}"><td>${cell(a, q && q.image)}</td><td class="num">${q ? MX.money(q.price) : MX.NA}</td><td class="num ${q ? MX.cls(q.chg) : 'muted'}">${q ? MX.pct(q.chg) : MX.NA}</td><td class="small muted">${q ? h(qs[i].source) + ' · ' + MX.time(qs[i].ts) : '—'}</td><td><button class="btn sm ghost" data-rm="${i}">Quitar</button></td></tr>`; }).join('')}</tbody></table></div>`;
      $('wlBody').onclick = (e) => { const rm = e.target.closest('[data-rm]'); if (rm) { MX.watch.toggle(wl[+rm.dataset.rm]); return MX.render(); } const tr = e.target.closest('tr.click'); if (tr) MX.open(wl[+tr.dataset.i]); };
    },
  };

  /* ---------- 12. Herramientas de riesgo ---------- */
  V.riesgo = {
    async render(token) {
      const el = $('view-riesgo'), a = MX.state.asset, cur = MX.curLabel(), k = MX.scale(), raw = (v) => MX.money(v / k);
      el.innerHTML = pageH('Herramientas de riesgo', `Decide cuánto arriesgar antes de comprar. Activo actual: <b>${h(a.name)} (${h(a.symbol)})</b>.`) +
        `<div class="grid g-2"><div class="card"><div class="card-h"><h3>Tamaño de posición, stop y take profit ${MX.learn('possize')}</h3><span class="badge">Para compras (largos) · ${cur}</span></div>
          <div class="form"><label class="field">Capital total (${cur})<input id="rkCap" type="number" step="any" value="${MX.store.get('rkCap', k === 1 ? 1000 : 1000000)}"></label><label class="field">Riesgo por operación (%)<input id="rkPct" type="number" step="0.1" value="${MX.store.get('rkPct', 1)}"></label>
          <label class="field">Precio de entrada<input id="rkIn" type="number" step="any"></label><label class="field"><span>Stop loss ${MX.learn('rr')}</span><input id="rkSl" type="number" step="any"></label><label class="field">Take profit<input id="rkTp" type="number" step="any"></label>
          <button class="btn ghost" id="rkAtr" disabled>Sugerir con ATR</button></div><div id="rkOut" class="mt"></div></div>
        <div class="card"><div class="card-h"><h3>Simulador DCA ${MX.learn('dca')}</h3><span class="badge">Histórico · USD</span></div>
          <div class="form"><label class="field">Monto mensual (US$)<input id="dcaAmt" type="number" step="any" value="${MX.store.get('dcaAmt', 100)}"></label><label class="field">Período<select id="dcaN">${[[12, '1 año'], [24, '2 años'], [36, '3 años'], [60, '5 años']].map((x) => `<option value="${x[0]}" ${x[0] === 36 ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></label><button class="btn" id="dcaRun">Simular</button></div>
          <div id="dcaOut" class="mt"><p class="muted small">Simula haber comprado ${h(a.symbol)} por un monto fijo al inicio de cada mes.</p></div></div></div>`;
      const calc = () => {
        const cap = +$('rkCap').value, pct = +$('rkPct').value, en = +$('rkIn').value, sl = +$('rkSl').value, tp = +$('rkTp').value, out = $('rkOut');
        MX.store.set('rkCap', cap); MX.store.set('rkPct', pct);
        if (!(cap > 0 && pct > 0 && en > 0 && sl > 0)) return (out.innerHTML = '<p class="muted small">Completa capital, riesgo, entrada y stop.</p>');
        if (sl >= en) return (out.innerHTML = '<div class="note">En una compra, el stop loss debe estar <b>bajo</b> el precio de entrada.</div>');
        const risk = (cap * pct) / 100, per = en - sl, units = risk / per, val = units * en, rr = tp > en ? (tp - en) / per : null;
        out.innerHTML = `<div class="kv"><div><div class="k">Arriesgas como máximo</div><div class="v num down">${raw(risk)}</div></div><div><div class="k">Tamaño de la posición</div><div class="v num">${MX.num(units, units < 1 ? 6 : 3)} ${h(a.symbol)}</div></div><div><div class="k">Valor de la posición</div><div class="v num">${raw(val)}</div></div>
          <div><div class="k">Distancia al stop</div><div class="v num">${MX.num((per / en) * 100, 2)}%</div></div><div><div class="k">Riesgo / beneficio</div><div class="v num ${rr == null ? '' : rr >= 2 ? 'up' : rr < 1 ? 'down' : 'warn'}">${rr == null ? MX.NA : '1 : ' + MX.num(rr, 2)}</div></div><div><div class="k">Ganancia si llega al objetivo</div><div class="v num up">${rr == null ? MX.NA : raw(units * (tp - en))}</div></div></div>
          ${val > cap ? `<div class="note mt">La posición (${raw(val)}) supera tu capital. Con un stop tan cercano necesitarías apalancamiento, que multiplica el riesgo. Considera alejar el stop o reducir el riesgo.</div>` : `<p class="small muted mt">Usarías el ${MX.num((val / cap) * 100, 1)}% de tu capital. Si el precio toca el stop pierdes ${raw(risk)} (${MX.num(pct, 1)}% del capital), sin contar comisiones ni saltos de precio.</p>`}
          ${rr != null ? `<p class="small muted">Con una relación 1 : ${MX.num(rr, 2)} necesitas acertar más del <b>${MX.num(100 / (1 + rr), 0)}%</b> de las veces para no perder dinero a la larga.</p>` : tp ? '<div class="note mt">El take profit debe estar sobre el precio de entrada.</div>' : ''}`;
      };
      ['rkCap', 'rkPct', 'rkIn', 'rkSl', 'rkTp'].forEach((id) => ($(id).oninput = calc)); calc();
      MX.loadAsset(a, '1D').then(({ res, a: an }) => {
        if (!token.ok() || !an || res.sample) { if (token.ok() && res.sample) $('rkOut').insertAdjacentHTML('afterbegin', '<p class="small muted">Sin precio real para prellenar: ingresa los valores a mano.</p>'); return; }
        const d = MX.decimals(an.price * k), r = (v) => +(v * k).toFixed(d), fill = () => { $('rkIn').value = r(an.price); $('rkSl').value = r(an.price - 1.5 * an.atrLast); $('rkTp').value = r(an.price + 3 * an.atrLast); calc(); };
        $('rkAtr').disabled = false; $('rkAtr').onclick = fill; $('rkAtr').title = 'Stop a 1,5 × ATR y objetivo a 3 × ATR del último cierre'; fill();
      });
      $('dcaRun').onclick = async () => {
        const amt = +$('dcaAmt').value, n = +$('dcaN').value, out = $('dcaOut'); if (!(amt > 0)) return MX.toast('Ingresa un monto válido');
        MX.store.set('dcaAmt', amt); out.innerHTML = MX.sk(4);
        const res = await api.klines(a, '1M', n + 1); if (!token.ok()) return;
        const cd = res.data.slice(-n); if (cd.length < 3) return (out.innerHTML = `<p class="muted">Historial mensual ${MX.NA} para este activo.</p>`);
        let units = 0, inv = 0; const sInv = [], sVal = [];
        cd.forEach((c) => { units += amt / c.open; inv += amt; sInv.push({ time: c.time, value: inv }); sVal.push({ time: c.time, value: units * c.close }); });
        const val = units * last(cd).close, gain = (val / inv - 1) * 100, lump = (inv / cd[0].open) * last(cd).close;
        out.innerHTML = (res.sample ? '<div class="note" style="margin-bottom:10px"><span class="badge sample">DATOS DE EJEMPLO</span> Historial simulado: el resultado no es real.</div>' : '') +
          `<div class="kv"><div><div class="k">Invertido en ${cd.length} meses</div><div class="v num">${MX.usd(inv)}</div></div><div><div class="k">Valor hoy</div><div class="v num ${MX.cls(gain)}">${MX.usd(val)}</div></div><div><div class="k">Resultado</div><div class="v num ${MX.cls(gain)}">${MX.pct(gain, 1)}</div></div>
          <div><div class="k">Precio promedio de compra</div><div class="v num">${MX.usd(inv / units)}</div></div><div><div class="k">Si hubieras invertido todo al inicio</div><div class="v num">${MX.usd(lump)}</div></div></div>
          <div class="chart-box mt" id="dcaChart" style="height:240px"></div><div class="chart-legend"><span><i style="background:#8b5cf6"></i>Valor de tu inversión</span><span><i style="background:#8a8fa3"></i>Total aportado</span></div>
          <p class="small muted mt">${cd.length < n ? `Solo hay ${cd.length} meses de historial disponibles. ` : ''}Compra simulada al precio de apertura de cada mes, sin comisiones. Es un resultado histórico: rendimientos pasados no garantizan resultados futuros.</p>${MX.srcTag(res)}`;
        MX.chart.lines($('dcaChart'), [{ color: '#8b5cf6', area: true, data: sVal }, { color: '#8a8fa3', dash: true, data: sInv }], { fmt: (v) => 'US$ ' + MX.compact(v) });
      };
    },
  };

  /* ---------- 13. Modo aprendizaje ---------- */
  MX.glossary = {
    rsi: ['RSI (Índice de Fuerza Relativa)', 'Mide qué tan rápido y fuerte subió o bajó el precio en las últimas 14 velas. Va de 0 a 100.', '<b>Bajo 30</b>: sobreventa (cayó mucho, puede rebotar). <b>Sobre 70</b>: sobrecompra (subió mucho, puede corregir). En tendencias fuertes puede quedarse en esas zonas largo tiempo.', 'Indicadores'],
    macd: ['MACD', 'Compara dos medias móviles (12 y 26) para medir el impulso de la tendencia. Tiene una línea MACD, una línea de señal y un histograma.', 'MACD <b>sobre</b> la señal: impulso alcista. <b>Bajo</b> la señal: impulso bajista. Barras del histograma creciendo = el impulso gana fuerza.', 'Indicadores'],
    stoch: ['Estocástico', 'Indica dónde cerró el precio dentro de su rango de las últimas 14 velas, de 0 a 100.', '<b>Bajo 20</b>: cerca de mínimos recientes (sobreventa). <b>Sobre 80</b>: cerca de máximos (sobrecompra). Los cruces de sus dos líneas en esas zonas son las señales más usadas.', 'Indicadores'],
    ema: ['Medias móviles EMA 20 / 50 / 200', 'Promedio del precio que da más peso a lo reciente. La de 20 muestra el corto plazo, la de 50 el mediano y la de 200 el largo plazo.', 'Precio <b>sobre</b> la media: tendencia alcista en ese plazo. <b>Bajo</b>: bajista. Suelen actuar como soporte o resistencia dinámica.', 'Indicadores'],
    cross: ['Golden cross y death cross', 'Cruces entre la media de 50 y la de 200 períodos.', '<b>Golden cross</b>: la de 50 cruza hacia arriba la de 200 (señal alcista de largo plazo). <b>Death cross</b>: la cruza hacia abajo (bajista). Son señales lentas: confirman tendencias, no las anticipan.', 'Indicadores'],
    bb: ['Bandas de Bollinger', 'Una media de 20 períodos con dos bandas a 2 desviaciones estándar. Se abren cuando sube la volatilidad y se cierran cuando baja.', 'Precio tocando la banda <b>superior</b>: está caro respecto a su promedio reciente; la <b>inferior</b>: barato. Bandas muy angostas suelen anticipar un movimiento fuerte (sin decir hacia dónde).', 'Indicadores'],
    atr: ['ATR (rango verdadero promedio)', 'Cuánto se mueve el precio en promedio por vela. Mide volatilidad, no dirección.', 'ATR alto = movimientos grandes (más riesgo y más oportunidad). Se usa para ubicar el stop loss: por ejemplo, a 1,5 × ATR del precio de entrada.', 'Indicadores'],
    vol: ['Volumen', 'Cantidad negociada en cada vela.', 'Un movimiento con volumen <b>alto</b> tiene más participación y es más confiable. Rupturas con volumen bajo fallan más seguido.', 'Indicadores'],
    obv: ['OBV (On-Balance Volume)', 'Suma el volumen de las velas que suben y resta el de las que bajan.', 'OBV <b>subiendo</b>: entra dinero (acumulación). <b>Bajando</b>: sale dinero (distribución). Si el precio sube y el OBV no, la subida es débil.', 'Indicadores'],
    vwap: ['VWAP', 'Precio promedio ponderado por volumen: el precio "justo" al que se negoció en promedio.', 'Precio <b>sobre</b> el VWAP: compradores recientes van ganando (fortaleza). <b>Bajo</b>: van perdiendo (debilidad). En intradía se reinicia cada día.', 'Indicadores'],
    sr: ['Soportes y resistencias', '<b>Soporte</b>: zona donde antes aparecieron compradores y el precio rebotó. <b>Resistencia</b>: zona donde aparecieron vendedores y el precio se frenó.', 'Mientras más toques tenga un nivel, más relevante. Si un soporte se rompe, suele transformarse en resistencia, y viceversa. Aquí se detectan automáticamente con máximos y mínimos locales.', 'Niveles'],
    fib: ['Retrocesos de Fibonacci', 'Niveles (23,6%, 38,2%, 50%, 61,8%, 78,6%) que dividen el último gran movimiento del precio.', 'Tras una subida, muchos operadores esperan que la corrección se detenga en 38,2%, 50% o 61,8%. Funcionan porque mucha gente los mira, no por magia.', 'Niveles'],
    div: ['Divergencias', 'Ocurren cuando el precio y el RSI se contradicen.', '<b>Alcista</b>: el precio hace un mínimo más bajo pero el RSI uno más alto (la caída pierde fuerza). <b>Bajista</b>: precio con máximo más alto y RSI con máximo más bajo. Son avisos tempranos; conviene esperar confirmación.', 'Niveles'],
    score: ['Puntaje técnico', 'Un resumen que combina todos los indicadores en un número de −100 (venta fuerte) a +100 (compra fuerte).', 'Describe lo que dicen los indicadores <b>ahora</b> en la temporalidad elegida. No es una recomendación ni una predicción: puede cambiar en pocas velas.', 'Niveles'],
    fng: ['Índice Fear & Greed', 'Mide el ánimo del mercado cripto de 0 (miedo extremo) a 100 (codicia extrema), usando volatilidad, volumen, redes sociales y más.', '<b>Miedo extremo</b> suele coincidir con precios deprimidos; <b>codicia extrema</b>, con euforia y mayor riesgo de corrección. Es contexto, no señal exacta.', 'Mercado'],
    mcap: ['Capitalización de mercado', 'Precio × cantidad de monedas o acciones en circulación. Es el "tamaño" del activo.', 'Activos grandes suelen ser más estables y líquidos; los pequeños se mueven más fuerte, en ambas direcciones.', 'Mercado'],
    dom: ['Dominancia de Bitcoin', 'Porcentaje del valor total del mercado cripto que corresponde a Bitcoin.', 'Dominancia <b>subiendo</b>: el dinero se refugia en BTC. <b>Bajando</b>: fluye hacia otras monedas (altcoins), lo que suele pasar en fases de más apetito por riesgo.', 'Mercado'],
    heatmap: ['Heatmap', 'Mapa donde cada recuadro es un activo: el tamaño indica su capitalización y el color su variación del día.', 'Mucho verde = subida generalizada; mucho rojo = caída generalizada. Sirve para ver de un vistazo si un movimiento es de todo el mercado o de un activo.', 'Mercado'],
    volat: ['Volatilidad y beta', 'La volatilidad mide cuánto varía el precio. La beta compara los movimientos de una acción con los del mercado.', 'Más volatilidad = más riesgo y posiciones más pequeñas. Beta sobre 1: se mueve más que el mercado; bajo 1: menos.', 'Mercado'],
    pe: ['P/E (precio / utilidad)', 'Cuántos dólares paga el mercado por cada dólar de utilidad anual de la empresa.', 'P/E alto: se espera mucho crecimiento (o está cara). P/E bajo: está barata (o el mercado ve problemas). Compáralo con empresas del mismo sector.', 'Fundamental'],
    eps: ['EPS (utilidad por acción)', 'Utilidad de la empresa dividida por el número de acciones.', 'Lo importante es su tendencia: EPS creciendo año a año es buena señal. En cada reporte se compara con lo que esperaban los analistas.', 'Fundamental'],
    revenue: ['Ingresos', 'Todo lo que vendió la empresa en un período, antes de descontar costos.', 'Ingresos creciendo indican que el negocio se expande. Sin crecimiento de ingresos, las utilidades solo pueden subir recortando costos.', 'Fundamental'],
    margin: ['Márgenes', 'Qué porcentaje de las ventas queda como ganancia: bruto (tras costos directos), operacional (tras gastos del negocio) y neto (tras todo).', 'Márgenes altos y estables muestran un negocio con ventajas. Márgenes cayendo son una alerta aunque las ventas suban.', 'Fundamental'],
    debt: ['Deuda / Patrimonio', 'Cuánta deuda tiene la empresa por cada dólar de capital propio.', 'Sobre 1–2 suele considerarse alta (depende del sector). Mucha deuda hace a la empresa más frágil cuando suben las tasas o caen las ventas.', 'Fundamental'],
    dividend: ['Dividendos', 'Parte de las utilidades que la empresa reparte en efectivo a sus accionistas.', 'La rentabilidad por dividendo es el dividendo anual dividido por el precio. Una cifra muy alta puede indicar que el precio cayó por problemas.', 'Fundamental'],
    supply: ['Oferta circulante, máxima y FDV', 'Circulante: monedas que ya existen. Máxima: tope que existirá. FDV: capitalización si ya existieran todas.', 'Si falta mucho por emitir, las nuevas monedas pueden presionar el precio a la baja. Un FDV muy superior a la capitalización es una señal de dilución futura.', 'Fundamental'],
    ath: ['Máximo histórico (ATH)', 'El precio más alto que ha alcanzado el activo.', 'La distancia al ATH muestra cuánto ha caído desde su mejor momento. Estar lejos no significa que "tiene que volver": muchos activos nunca recuperan su máximo.', 'Fundamental'],
    possize: ['Tamaño de posición', 'Cuánto comprar para que, si salta el stop, pierdas solo un porcentaje pequeño y definido de tu capital.', 'Regla común: arriesgar entre 0,5% y 2% del capital por operación. Tamaño = (capital × % riesgo) ÷ (entrada − stop).', 'Riesgo'],
    rr: ['Stop loss, take profit y riesgo/beneficio', 'Stop loss: precio al que vendes para limitar la pérdida. Take profit: precio al que tomas la ganancia. La relación compara ambos.', 'Con 1 : 2 ganas el doble de lo que arriesgas, y te basta acertar 1 de cada 3 veces para no perder. Bajo 1 : 1 necesitas acertar casi siempre.', 'Riesgo'],
    dca: ['DCA (compras periódicas)', 'Invertir un monto fijo cada cierto tiempo (por ejemplo, cada mes) sin importar el precio.', 'Compras más unidades cuando está barato y menos cuando está caro, promediando el precio. Reduce el riesgo de entrar en el peor momento, pero no elimina el riesgo de que el activo caiga.', 'Riesgo'],
  };
  V.aprender = {
    render() {
      const groups = {}; Object.entries(MX.glossary).forEach(([k, g]) => (groups[g[3]] = groups[g[3]] || []).push(g));
      $('view-aprender').innerHTML = pageH('Modo aprendizaje', 'Cada indicador explicado en simple: qué es y cómo se lee. En toda la app, toca el ícono <b>?</b> junto a un indicador para ver su explicación sin salir de la pantalla.') +
        Object.entries(groups).map(([name, list]) => `<h3 class="eyebrow" style="margin:22px 0 10px">${name}</h3><div class="grid g-3">${list.map((g) => `<div class="card tilt"><h3 class="pop2" style="margin-bottom:8px">${g[0]}</h3><p class="small"><b style="color:var(--accent)">Qué es.</b> ${g[1]}</p><p class="small muted" style="margin-top:8px"><b style="color:var(--text)">Cómo se lee.</b> ${g[2]}</p></div>`).join('')}</div>`).join('') +
        `<div class="note info mt">Ningún indicador acierta siempre. Los profesionales combinan varios, respetan la tendencia y, sobre todo, controlan cuánto pueden perder en cada operación.</div>`;
    },
  };

  /* ---------- Configuración ---------- */
  const KEYS = [['finnhub', 'Finnhub', 'Cotizaciones e índices, fundamentales, noticias y calendario de resultados.', 'https://finnhub.io/register'], ['twelve', 'Twelve Data', 'Velas históricas de acciones (1h, 4h, diario, semanal, mensual).', 'https://twelvedata.com/pricing'], ['alpha', 'Alpha Vantage', 'Alternativa para velas de acciones (diario, semanal, mensual).', 'https://www.alphavantage.co/support/#api-key'], ['coingecko', 'CoinGecko (opcional)', 'Clave demo para un límite de consultas más alto. Sin clave también funciona.', 'https://www.coingecko.com/en/api/pricing']];
  V.config = {
    render() {
      const s = MX.settings;
      $('view-config').innerHTML = pageH('Configuración', 'Tus claves se guardan solo en este navegador (localStorage) y se envían únicamente al proveedor correspondiente.') +
        `<div class="grid g-2"><div class="card"><div class="card-h"><h3>Claves de API gratuitas</h3></div><div class="stack">${KEYS.map((k) => `<label class="field"><span><b style="color:var(--text)">${k[1]}</b> — ${k[2]} <a href="${k[3]}" target="_blank" rel="noopener">Obtener clave ↗</a></span><input type="password" id="k-${k[0]}" value="${h(s[k[0]])}" placeholder="Pega aquí tu clave" autocomplete="off" spellcheck="false"></label>`).join('')}
          <div class="row"><button class="btn" id="cfgSave">Guardar claves</button><span class="small muted" id="cfgState">${KEYS.filter((k) => s[k[0]]).length} de ${KEYS.length} claves guardadas</span></div></div></div>
        <div class="stack"><div class="card"><div class="card-h"><h3>Apariencia</h3></div><div class="field">Color de acento</div><div class="chips" id="cfgAcc" style="margin-top:8px">${[['violet', 'Violeta', '#8b5cf6'], ['neon', 'Verde neón', '#39ff88'], ['gold', 'Dorado', '#f5c451']].map((a) => `<span class="chip ${s.accent === a[0] ? 'on' : ''}" data-a="${a[0]}"><i style="width:10px;height:10px;border-radius:50%;background:${a[2]};display:inline-block"></i>${a[1]}</span>`).join('')}</div>
          <div class="field mt">Moneda</div><p class="small muted">Cámbiala con el selector USD / CLP de la barra superior. ${MX.fx.CLP ? `Tipo de cambio actual: 1 USD = ${MX.num(MX.fx.CLP, 2)} CLP (${h(MX.fx.source)}, ${MX.time(MX.fx.ts)}).` : 'Tipo de cambio: ' + MX.NA + ' todavía.'}</p></div>
        <div class="card"><div class="card-h"><h3>Fuentes de datos</h3></div><ul class="clean"><li><b>Cripto:</b> CoinGecko (mercado, fichas) y API pública de Binance (velas y precios). Sin clave.</li><li><b>Sentimiento:</b> Alternative.me (Fear &amp; Greed). Sin clave.</li><li><b>Acciones y noticias:</b> Finnhub + Twelve Data o Alpha Vantage. Requieren clave gratuita.</li><li><b>USD/CLP:</b> open.er-api.com.</li><li>Si una fuente falla verás la insignia <span class="badge sample">DATOS DE EJEMPLO</span> o el texto "${MX.NA}". Los planes gratuitos tienen límites por minuto.</li></ul></div>
        <div class="card"><div class="card-h"><h3>Datos locales</h3></div><p class="small muted">Borra watchlist, alertas, claves y preferencias guardadas en este navegador.</p><button class="btn ghost sm mt" id="cfgClear">Borrar todo</button></div></div></div>`;
      $('cfgSave').onclick = () => { KEYS.forEach((k) => (s[k[0]] = $('k-' + k[0]).value.trim())); MX.saveSettings(); MX.toast('Claves guardadas. Los datos se actualizarán al navegar.', 3000); MX.render(); };
      $('cfgAcc').onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; s.accent = c.dataset.a; MX.saveSettings(); document.documentElement.dataset.accent = s.accent; MX.hero.setMood(MX._mood); MX.render(); };
      $('cfgClear').onclick = () => { if (confirm('¿Borrar watchlist, alertas, claves y preferencias de este navegador?')) { MX.store.clear(); location.reload(); } };
    },
  };
})();
