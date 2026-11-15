/* Meridiano — módulos del activo: ficha, resumen técnico, escenarios, noticias, fundamental, dónde y cuándo comprar */
(function () {
  const MX = window.MX, api = MX.api, h = MX.h, V = MX.views;
  const $ = (id) => document.getElementById(id);
  const last = (a) => a[a.length - 1];
  const TFS = [['1h', '1h'], ['4h', '4h'], ['1D', '1D'], ['1S', '1S']];
  const TF_NAME = { '1h': 'velas de 1 hora', '4h': 'velas de 4 horas', '1D': 'velas diarias', '1S': 'velas semanales' };

  function head(sub) {
    const a = MX.state.asset;
    return `<div class="asset-head"><div class="asset-id"><span id="ah-logo">${MX.logo(a)}</span><div><h2>${h(a.name)} <span class="badge">${h(a.symbol)}</span> <span class="badge acc">${a.type === 'crypto' ? 'Cripto' : 'Acción'}</span></h2><div class="muted small">${sub}</div></div></div>
      <div class="row"><div class="asset-price"><div class="p num" id="ah-price"><span class="sk" style="width:150px;height:30px"></span></div><div id="ah-chg" class="small muted">&nbsp;</div></div>
      <button class="star ${MX.watch.has(a) ? 'on' : ''}" id="ah-star" title="Guardar en watchlist" aria-label="Guardar en watchlist"><svg viewBox="0 0 24 24">${MX.icons.star}</svg></button></div></div>`;
  }
  async function fillHead(token) {
    const a = MX.state.asset, star = $('ah-star');
    star.onclick = () => { const on = MX.watch.toggle(a); star.classList.toggle('on', on); MX.toast(on ? `${a.symbol} guardado en tu watchlist` : `${a.symbol} quitado de tu watchlist`, 2500); };
    let q = await api.quote(a);
    if (!q.data) { const k = await api.klines(a, '1D'); q = { ...k, data: { price: last(k.data).close, chg: null }, reason: k.sample ? k.reason : 'último cierre diario' }; }
    if (!token.ok() || !$('ah-price')) return;
    MX.countTo($('ah-price'), q.data.price, (v) => MX.money(v));
    $('ah-chg').innerHTML = (MX.isNum(q.data.chg) ? `<b class="${MX.cls(q.data.chg)}">${MX.pct(q.data.chg)}</b> en 24h` : '') + MX.srcTag(q);
    if (q.data.image) $('ah-logo').innerHTML = MX.logo(a, q.data.image);
    else if (a.type === 'crypto') { const m = api.lastMarkets.find((c) => c.id === a.id); if (m && m.image) $('ah-logo').innerHTML = MX.logo(a, m.image); }
  }
  const tfSeg = () => `<div class="seg" id="tfSeg">${TFS.map((t) => `<button data-tf="${t[0]}" class="${MX.state.tf === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`;
  function bindTf() { const s = $('tfSeg'); if (s) s.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; MX.state.tf = b.dataset.tf; MX.store.set('tf', MX.state.tf); MX.render(); }; }
  const sampleNote = (res) => (res.sample ? `<div class="note" style="margin-bottom:12px"><span class="badge sample">DATOS DE EJEMPLO</span> Las velas y todos los cálculos de esta pantalla son simulados (${h(res.reason)}). No representan el precio real.</div>` : '');
  const few = '<div class="note">No hay suficientes velas para calcular los indicadores de este activo en esta temporalidad. Prueba con otra.</div>';

  /* ---------- 3. Ficha del activo ---------- */
  const INDS = [['vol', 'Volumen', 'vol'], ['ema', 'EMA 20/50/200', 'ema'], ['cross', 'Cruces', 'cross'], ['bb', 'Bollinger', 'bb'], ['vwap', 'VWAP', 'vwap'], ['sr', 'Soportes / Resistencias', 'sr'], ['fib', 'Fibonacci', 'fib'], ['div', 'Divergencias', 'div'], ['rsi', 'RSI', 'rsi'], ['macd', 'MACD', 'macd'], ['stoch', 'Estocástico', 'stoch'], ['atr', 'ATR', 'atr'], ['obv', 'OBV', 'obv']];
  V.activo = {
    async render(token) {
      const el = $('view-activo'), st = MX.state;
      el.innerHTML = head('Ficha del activo · ' + TF_NAME[st.tf]) + `
        <div class="card"><div class="card-h">${tfSeg()}<span class="small muted">Activa o desactiva indicadores. Toca <b>?</b> para aprender qué es cada uno.</span></div>
          <div class="toggle-group" id="indT" style="margin-bottom:12px">${INDS.map((i) => `<span class="chip ${st.ind[i[0]] ? 'on' : ''}" data-k="${i[0]}">${i[1]} ${MX.learn(i[2])}</span>`).join('')}</div>
          <div id="chartNote"></div><div class="chart-box" id="chart"><span class="sk box" style="height:100%"></span></div><div class="chart-legend" id="legend"></div><div id="chartSrc"></div></div>
        <div class="grid g-3 mt" id="under"></div>`;
      bindTf(); fillHead(token);
      const { res, a } = await MX.loadAsset(st.asset, st.tf);
      if (!token.ok()) return;
      $('chartNote').innerHTML = sampleNote(res); $('chartSrc').innerHTML = MX.srcTag(res, `${res.data.length} ${TF_NAME[st.tf]} · precios en ${MX.curLabel()}`);
      if (!a) { $('chart').innerHTML = few; $('chart').style.height = 'auto'; return; }
      const draw = () => {
        MX.chart.render($('chart'), res.data, a, st.ind, st.tf);
        const C = MX.chart.COL, lg = [];
        if (st.ind.ema) lg.push([C.e20, 'EMA 20'], [C.e50, 'EMA 50'], [C.e200, 'EMA 200']);
        if (st.ind.bb) lg.push([C.bb, 'Bollinger']); if (st.ind.vwap && a.vwap) lg.push([C.vwap, 'VWAP ' + a.vwapMode]);
        if (st.ind.sr) lg.push([C.up, 'Soportes (S)'], [C.down, 'Resistencias (R)']); if (st.ind.fib) lg.push(['#f5c451', 'Fibonacci']);
        $('legend').innerHTML = lg.map((x) => `<span><i style="background:${x[0]}"></i>${x[1]}</span>`).join('') + (!a.hasVol ? '<span>Volumen, OBV y VWAP no disponibles para esta fuente.</span>' : '');
      };
      draw();
      $('indT').onclick = (e) => { if (e.target.closest('.learn')) return; const c = e.target.closest('.chip'); if (!c) return; st.ind[c.dataset.k] = !st.ind[c.dataset.k]; c.classList.toggle('on'); MX.store.set('ind', st.ind); draw(); };
      const lc = last(a.crosses), ld = last(a.divs), ago = (i) => `hace ${a.n - 1 - i} velas`;
      const lvRow = (x, t, c) => `<div style="--c:${c}"><span>${t} <span class="muted small">· ${x.touches} toque(s)</span></span><b class="num">${MX.money(x.price)} <span class="small ${MX.cls(x.price - a.price)}">${MX.pct(((x.price - a.price) / a.price) * 100, 1)}</span></b></div>`;
      $('under').innerHTML = `
        <div class="card tilt"><div class="card-h"><h3>Lectura rápida ${MX.learn('score')}</h3>${MX.badge(a.score / 100)}</div>
          <div class="pop"><div class="result-big">${a.label} <span class="muted small">(${a.score > 0 ? '+' : ''}${a.score} de ±100)</span></div>
          <p class="muted small" style="margin-top:6px">Combina ${a.signals.filter((s) => s.s != null).length} indicadores en ${TF_NAME[st.tf]}. Es una foto del momento, no una recomendación.</p></div>
          <div class="row mt"><a class="btn sm" href="#tecnico">Ver resumen técnico</a><a class="btn sm ghost" href="#escenarios">Ver escenarios</a></div></div>
        <div class="card"><div class="card-h"><h3>Soportes y resistencias ${MX.learn('sr')}</h3></div>
          <div class="ladder">${a.resistances.slice(0, 3).reverse().map((x, i, arr) => lvRow(x, 'R' + (arr.length - i), 'var(--down)')).join('')}<div class="now"><span>Precio actual</span><b class="num">${MX.money(a.price)}</b></div>${a.supports.slice(0, 3).map((x, i) => lvRow(x, 'S' + (i + 1), 'var(--up)')).join('')}</div>
          ${!a.supports.length && !a.resistances.length ? '<p class="muted small mt">No se detectaron niveles claros en esta temporalidad.</p>' : ''}</div>
        <div class="card"><div class="card-h"><h3>Señales detectadas</h3></div><ul class="clean">
          <li><b>Cruces EMA 50/200</b> ${MX.learn('cross')}<br><span class="muted">${lc ? (lc.type === 'golden' ? 'Último: golden cross (alcista) ' : 'Último: death cross (bajista) ') + ago(lc.i) : last(a.ema200) == null ? 'No hay suficientes velas para la EMA 200.' : 'Sin cruces en las últimas 300 velas.'}</span></li>
          <li><b>Divergencias RSI</b> ${MX.learn('div')}<br><span class="muted">${ld ? (ld.type === 'bull' ? 'Última: alcista ' : 'Última: bajista ') + ago(ld.i) + (a.n - 1 - ld.i > 15 ? ' (ya antigua)' : '') : 'Ninguna detectada recientemente.'}</span></li>
          <li><b>Fibonacci</b> ${MX.learn('fib')}<br><span class="muted">Último tramo ${a.fib.up ? 'alcista' : 'bajista'}: ${MX.money(a.fib.lo)} → ${MX.money(a.fib.hi)}. Nivel 61,8%: ${MX.money(a.fib.levels[4].price)}</span></li>
          <li><b>Volatilidad (ATR)</b> ${MX.learn('atr')}<br><span class="muted">${MX.money(a.atrLast)} por vela (${MX.num((a.atrLast / a.price) * 100, 2)}%)</span></li></ul></div>`;
    },
  };

  /* ---------- 4. Resumen técnico ---------- */
  V.tecnico = {
    async render(token) {
      const el = $('view-tecnico'), st = MX.state;
      el.innerHTML = head('Resumen técnico con puntaje · ' + TF_NAME[st.tf]) + `<div class="row between" style="margin-bottom:14px">${tfSeg()}<span class="small muted">El puntaje cambia según la temporalidad: corto plazo (1h) y largo plazo (1S) pueden decir cosas distintas.</span></div><div id="tecBody"><div class="card">${MX.sk(5)}</div></div>`;
      bindTf(); fillHead(token);
      const { res, a } = await MX.loadAsset(st.asset, st.tf);
      if (!token.ok()) return;
      if (!a) { $('tecBody').innerHTML = few; return; }
      const bull = a.signals.filter((s) => s.s > 0.15).length, bear = a.signals.filter((s) => s.s < -0.15).length, neu = a.signals.filter((s) => s.s != null).length - bull - bear;
      $('tecBody').innerHTML = sampleNote(res) + `<div class="grid g-side" style="grid-template-columns:minmax(260px,340px) minmax(0,1fr)">
        <div class="card tilt"><div class="card-h"><h3>Medidor técnico ${MX.learn('score')}</h3></div>
          <div class="gauge-wrap pop">${MX.gauge((a.score + 100) / 200, 'tec')}<div class="gauge-val ${a.score >= 20 ? 'up' : a.score <= -20 ? 'down' : 'warn'}">${a.label}</div><div class="muted small">Puntaje ${a.score > 0 ? '+' : ''}${a.score} (de −100 venta fuerte a +100 compra fuerte)</div></div>
          <div class="row mt" style="justify-content:center"><span class="badge up">${bull} alcistas</span><span class="badge neu">${neu} neutrales</span><span class="badge down">${bear} bajistas</span></div>
          <p class="small muted mt">Cómo se calcula: cada indicador aporta entre −1 y +1 y se promedian con pesos (la tendencia pesa más). El medidor resume lo que dicen los indicadores <b>hoy</b>; no predice el precio y puede cambiar rápido.</p>${MX.srcTag(res)}</div>
        <div class="card"><div class="card-h"><h3>Qué dice cada indicador</h3></div><div class="tbl-wrap"><table><thead><tr><th>Indicador</th><th>Valor</th><th>Señal</th><th style="text-align:left">En simple</th></tr></thead><tbody>
          ${a.signals.map((s) => `<tr><td><span class="row" style="gap:6px;flex-wrap:nowrap"><b>${s.name}</b> ${MX.learn(s.key)}</span></td><td class="num">${s.value}</td><td>${s.s == null ? '<span class="badge">Informativo</span>' : MX.badge(s.s)}</td><td class="wrap">${s.text}</td></tr>`).join('')}
        </tbody></table></div></div></div>`;
      MX.animateGauges(el);
    },
  };

  /* ---------- 5. Escenarios ---------- */
  V.escenarios = {
    async render(token) {
      const el = $('view-escenarios'), st = MX.state;
      el.innerHTML = head('¿Hasta dónde podría caer o subir? · ' + TF_NAME[st.tf]) + `<div class="row between" style="margin-bottom:14px">${tfSeg()}</div>
        <div class="note info" style="margin-bottom:14px"><b>Son escenarios posibles, no predicciones.</b> Cada nivel sale de soportes, resistencias, Fibonacci y volatilidad (ATR) calculados con datos pasados, y solo tiene sentido si se cumplen sus condiciones. El precio puede hacer algo distinto a los tres.</div><div id="scBody"><div class="card">${MX.sk(5)}</div></div>`;
      bindTf(); fillHead(token);
      const { res, a } = await MX.loadAsset(st.asset, st.tf);
      if (!token.ok()) return;
      if (!a) { $('scBody').innerHTML = few; return; }
      const sc = MX.scenarios(a);
      const card = (s, range) => `<div class="card scn tilt" style="--c:${s.color}"><div class="pop2"><span class="small muted">${s.tag}</span><h3 style="font-size:17px;margin:2px 0 12px;color:${s.color}">${s.title}</h3></div>
        <div class="pop">${range ? `<div class="big num">${MX.money(s.levels[0].price)} – ${MX.money(s.levels[1].price)}</div><div class="small muted">${MX.pct(s.levels[0].pct, 1)} a ${MX.pct(s.levels[1].pct, 1)} desde el precio actual</div>`
          : s.levels.map((l, i) => `<div style="margin-bottom:10px"><div class="small muted">${i === 0 ? 'Primer nivel posible' : 'Si el movimiento se extiende'}</div><div class="big num">${MX.money(l.price)} <span class="small ${MX.cls(l.pct)}">${MX.pct(l.pct, 1)}</span></div><div class="small muted">Base: ${l.basis}</div></div>`).join('')}</div>
        ${range ? `<div class="small muted" style="margin-top:8px">Base: ${s.levels[0].basis}; ${s.levels[1].basis}</div>` : ''}
        <h3 class="mt" style="margin-bottom:8px">¿Qué tendría que pasar?</h3><ul class="clean">${s.conds.map((c) => `<li>${c}</li>`).join('')}</ul></div>`;
      const rows = a.resistances.map((x, i) => ({ p: x.price, t: 'Resistencia R' + (i + 1), c: 'var(--down)' })).concat(a.supports.map((x, i) => ({ p: x.price, t: 'Soporte S' + (i + 1), c: 'var(--up)' })), a.fib.levels.map((f) => ({ p: f.price, t: 'Fibonacci ' + (f.r * 100).toFixed(1).replace('.', ',') + '%', c: 'var(--warn)' })), [{ p: a.price, t: 'Precio actual', now: 1 }, { p: a.price + a.atrLast, t: '+1 ATR', c: 'var(--stroke2)' }, { p: a.price - a.atrLast, t: '−1 ATR', c: 'var(--stroke2)' }]).sort((x, y) => y.p - x.p);
      $('scBody').innerHTML = sampleNote(res) + `<div class="grid g-3">${card(sc.bear)}${card(sc.base, true)}${card(sc.bull)}</div>
        <div class="grid g-2 mt"><div class="card"><div class="card-h"><h3>Mapa de niveles ${MX.learn('sr')}</h3><span class="small muted">De arriba hacia abajo</span></div><div class="ladder">${rows.map((r) => `<div class="${r.now ? 'now' : ''}" style="--c:${r.c || ''}"><span>${r.t}</span><b class="num">${MX.money(r.p)} ${r.now ? '' : `<span class="small ${MX.cls(r.p - a.price)}">${MX.pct(((r.p - a.price) / a.price) * 100, 1)}</span>`}</b></div>`).join('')}</div></div>
        <div class="card"><div class="card-h"><h3>Contexto actual</h3>${MX.badge(a.score / 100)}</div><ul class="clean">
          <li>Los indicadores hoy se inclinan a <b>${a.label.toLowerCase()}</b> (puntaje ${a.score}). Esto describe el presente, no garantiza cuál escenario ocurrirá.</li>
          <li>Volatilidad: el precio se mueve en promedio <b>${MX.money(a.atrLast)}</b> por vela (${MX.num((a.atrLast / a.price) * 100, 2)}%). ${MX.learn('atr')}</li>
          <li>Los niveles cambian con cada vela nueva y según la temporalidad elegida (${TF_NAME[st.tf]}).</li>
          <li>Eventos como reuniones de la Fed, datos de inflación o resultados pueden invalidar cualquier nivel técnico. Revisa <a href="#noticias">Noticias y eventos</a>.</li></ul>${MX.srcTag(res)}</div></div>`;
    },
  };

  /* ---------- 6. Noticias y sentimiento ---------- */
  const MACRO = [
    ['2026-12-09', 'Decisión de tasas de la Fed (FOMC)', 'Si la Fed sube o mantiene tasas altas, suele pesar sobre acciones y cripto; si las baja, suele favorecerlas.', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'],
    ['2026-12-10', 'Inflación de EE.UU. (IPC)', 'Una inflación mayor a la esperada hace más probable tasas altas (negativo para activos de riesgo); una menor, lo contrario.', 'https://www.bls.gov/schedule/news_release/cpi.htm'],
    ['2027-01-27', 'Decisión de tasas de la Fed (FOMC) · fecha tentativa', 'Primera reunión del año: marca el tono de la política monetaria.', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'],
    ['2027-03-17', 'Decisión de tasas de la Fed (FOMC) · fecha tentativa', 'Incluye proyecciones económicas actualizadas de la Fed.', 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'],
  ];
  const evt = (date, title, why, extra) => { const d = new Date(date + 'T12:00:00'); return `<div class="event"><div class="d"><b>${d.getDate()}</b>${d.toLocaleDateString('es-CL', { month: 'short' })}</div><div><b>${title}</b> ${extra || ''}<div class="small muted">${why}</div></div></div>`; };
  V.noticias = {
    async render(token) {
      const el = $('view-noticias'), a = MX.state.asset;
      el.innerHTML = head('Noticias, sentimiento y calendario de eventos') + `<div class="grid g-side"><div class="card"><div class="card-h"><h3>Noticias de ${h(a.name)}</h3><span id="newsSum" class="row"></span></div><div id="newsList">${MX.sk(6)}</div></div>
        <div class="stack"><div class="card"><div class="card-h"><h3>Eventos macro</h3><span class="badge verify">verificar en la fuente oficial</span></div><div id="macro"></div></div>
        <div class="card"><div class="card-h"><h3>Resultados trimestrales próximos</h3></div><div id="earn">${MX.sk(3)}</div></div></div></div>`;
      fillHead(token);
      const today = new Date().toISOString().slice(0, 10), up = MACRO.filter((m) => m[0] >= today);
      $('macro').innerHTML = (up.length ? up.map((m) => evt(m[0], m[1], m[2], `<a class="small" href="${m[3]}" target="_blank" rel="noopener">calendario oficial ↗</a>`)).join('') : '<p class="muted small">Sin fechas cargadas.</p>') +
        `<p class="small muted mt">Calendario referencial cargado a mano: las fechas pueden cambiar. Fechas de IPC posteriores: ${MX.NA} aquí; revisa <a href="https://www.bls.gov/schedule/news_release/cpi.htm" target="_blank" rel="noopener">bls.gov ↗</a>.</p>`;
      api.news(a).then((r) => {
        if (!token.ok()) return;
        const items = r.data.map((n) => ({ n, c: api.classify(n.headline, n.summary) })), cnt = (l) => items.filter((x) => x.c.label === l).length;
        const cls = { alcista: 'up', bajista: 'down', neutral: 'neu' };
        $('newsSum').innerHTML = `<span class="badge up">${cnt('alcista')} alcistas</span><span class="badge neu">${cnt('neutral')} neutrales</span><span class="badge down">${cnt('bajista')} bajistas</span>`;
        $('newsList').innerHTML = (r.general ? `<div class="note">No hay noticias recientes que mencionen a ${h(a.name)}. Se muestran noticias generales del mercado cripto.</div>` : '') +
          (items.length ? items.map(({ n, c }) => `<div class="news"><div class="row" style="gap:8px"><span class="badge ${cls[c.label]}">${c.label}</span><span class="small muted">${h(n.source || '')} · ${MX.date(n.datetime * 1000)}</span></div><a href="${MX.safeUrl(n.url)}" target="_blank" rel="noopener noreferrer">${h(n.headline)}</a><div class="why"><b>Por qué puede mover el precio:</b> ${c.why}</div></div>`).join('') : `<p class="muted">Sin noticias recientes: ${MX.NA}.</p>`) +
          `<p class="small muted mt">La clasificación alcista / bajista / neutral es automática (palabras clave del titular) y puede equivocarse. Lee la noticia completa antes de sacar conclusiones.</p>` + MX.srcTag(r);
      });
      api.earnings().then((r) => {
        if (!token.ok()) return;
        $('earn').innerHTML = (r.data ? (r.data.length ? r.data.slice(0, 12).map((e) => evt(e.date, h(e.symbol), 'Los resultados suelen provocar movimientos bruscos: el precio reacciona a si la empresa supera o no lo esperado.' + (MX.isNum(e.epsEstimate) ? ` EPS esperado: ${MX.num(e.epsEstimate, 2)}.` : ''))).join('') : '<p class="muted small">Ninguna empresa de tu lista reporta en las próximas 3 semanas.</p>') : '') + MX.srcTag(r);
      });
    },
  };

  /* ---------- 7. Fundamental ---------- */
  const kv = (k, v, learn) => `<div><div class="k">${k} ${learn ? MX.learn(learn) : ''}</div><div class="v num">${v}</div></div>`;
  V.fundamental = {
    async render(token) {
      const el = $('view-fundamental'), a = MX.state.asset;
      el.innerHTML = head('Análisis fundamental') + `<div id="fBody"><div class="card">${MX.sk(6)}</div></div>`;
      fillHead(token);
      if (a.type === 'crypto') {
        const r = await api.coin(a); if (!token.ok()) return; const d = r.data;
        if (!d) { $('fBody').innerHTML = `<div class="card"><p class="muted">Datos fundamentales: ${MX.NA}.</p>${MX.srcTag(r)}</div>`; return; }
        const pctSup = MX.isNum(d.max) && d.max > 0 && MX.isNum(d.circ) ? (d.circ / d.max) * 100 : null;
        $('fBody').innerHTML = `<div class="card"><div class="card-h"><h3>Tamaño y liquidez</h3></div><div class="kv">
            ${kv('Ranking', MX.isNum(d.rank) ? '#' + d.rank : MX.NA)}${kv('Capitalización', MX.money(d.mcap, { compact: true }), 'mcap')}${kv('Volumen 24h', MX.money(d.vol, { compact: true }), 'vol')}
            ${kv('Volumen / Capitalización', MX.isNum(d.vol) && d.mcap ? MX.num((d.vol / d.mcap) * 100, 2) + '%' : MX.NA)}${kv('Valoración diluida (FDV)', MX.money(d.fdv, { compact: true }), 'supply')}</div></div>
          <div class="grid g-2 mt"><div class="card"><div class="card-h"><h3>Oferta ${MX.learn('supply')}</h3></div><div class="kv">${kv('Circulante', MX.compact(d.circ))}${kv('Máxima', MX.isNum(d.max) ? MX.compact(d.max) : 'sin tope definido')}</div>
            ${pctSup != null ? `<div class="mt small muted">Ya circula el <b class="num" style="color:var(--text)">${MX.num(pctSup, 1)}%</b> de la oferta máxima</div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, pctSup)}%"></i></div><p class="small muted mt">Mientras más cerca del 100%, menos monedas nuevas quedan por emitir (menos presión de venta por emisión).</p>` : '<p class="small muted mt">Sin oferta máxima definida: pueden seguir emitiéndose monedas, lo que diluye a los tenedores si la demanda no acompaña.</p>'}</div>
          <div class="card"><div class="card-h"><h3>Máximo histórico ${MX.learn('ath')}</h3></div><div class="kv">${kv('Máximo histórico (ATH)', MX.money(d.ath))}${kv('Distancia al ATH', `<span class="${MX.cls(d.athChg)}">${MX.pct(d.athChg, 1)}</span>`)}${kv('Fecha del ATH', d.athDate ? MX.date(d.athDate) : MX.NA)}</div>
            <div class="kv mt">${kv('7 días', `<span class="${MX.cls(d.chg7)}">${MX.pct(d.chg7, 1)}</span>`)}${kv('30 días', `<span class="${MX.cls(d.chg30)}">${MX.pct(d.chg30, 1)}</span>`)}${kv('1 año', `<span class="${MX.cls(d.chg1y)}">${MX.pct(d.chg1y, 1)}</span>`)}</div></div></div>
          <div class="card mt">${MX.srcTag(r)}</div>`;
        return;
      }
      const r = await api.stock(a); if (!token.ok()) return;
      if (!r.data) { $('fBody').innerHTML = `<div class="card"><p>Fundamentales de ${h(a.symbol)}: <b>${MX.NA}</b>.</p><p class="muted small mt">${h(r.reason)}</p><a class="btn sm mt" href="#config">Ir a Configuración</a></div>`; return; }
      const m = r.data.metric, p = r.data.profile, P = (v) => (MX.isNum(v) ? MX.num(v, 2) + '%' : MX.NA);
      const rev = MX.isNum(m.revenuePerShareTTM) && MX.isNum(p.shareOutstanding) ? m.revenuePerShareTTM * p.shareOutstanding * 1e6 : null;
      const cap = MX.isNum(m.marketCapitalization) ? m.marketCapitalization * 1e6 : MX.isNum(p.marketCapitalization) ? p.marketCapitalization * 1e6 : null;
      if (p.logo) $('ah-logo').innerHTML = MX.logo(a, p.logo);
      $('fBody').innerHTML = `<div class="card"><div class="card-h"><h3>Valoración y resultados</h3><span class="small muted">${h(p.finnhubIndustry || '')} ${p.exchange ? '· ' + h(p.exchange) : ''}</span></div><div class="kv">
          ${kv('Capitalización', MX.money(cap, { compact: true }), 'mcap')}${kv('P/E (precio / utilidad)', MX.num(MX.isNum(m.peTTM) ? m.peTTM : m.peBasicExclExtraTTM, 1), 'pe')}${kv('EPS (utilidad por acción, 12m)', MX.usd(m.epsTTM), 'eps')}
          ${kv('Ingresos 12m (estimado)', MX.money(rev, { compact: true }), 'revenue')}${kv('Crecimiento de ingresos (anual)', `<span class="${MX.cls(m.revenueGrowthTTMYoy)}">${MX.pct(m.revenueGrowthTTMYoy, 1)}</span>`)}${kv('Próximos resultados', r.data.nextEarnings ? MX.date(r.data.nextEarnings + 'T12:00:00') : MX.NA)}</div></div>
        <div class="grid g-2 mt"><div class="card"><div class="card-h"><h3>Márgenes ${MX.learn('margin')}</h3></div><div class="kv">${kv('Margen bruto', P(m.grossMarginTTM))}${kv('Margen operacional', P(m.operatingMarginTTM))}${kv('Margen neto', P(m.netProfitMarginTTM))}</div></div>
        <div class="card"><div class="card-h"><h3>Deuda y dividendos</h3></div><div class="kv">${kv('Deuda / Patrimonio', MX.num(m['totalDebt/totalEquityQuarterly'], 2), 'debt')}${kv('Dividendo anual por acción', MX.usd(m.dividendPerShareAnnual), 'dividend')}${kv('Rentabilidad por dividendo', P(m.dividendYieldIndicatedAnnual))}</div>
          <div class="kv mt">${kv('Máximo 52 semanas', MX.money(m['52WeekHigh']))}${kv('Mínimo 52 semanas', MX.money(m['52WeekLow']))}${kv('Beta', MX.num(m.beta, 2), 'volat')}</div></div></div>
        <div class="card mt"><span class="small muted">"Ingresos 12m" se estima como ingreso por acción × acciones en circulación. Confirma las cifras en los reportes oficiales de la empresa.</span>${MX.srcTag(r)}</div>`;
    },
  };

  /* ---------- 11. Dónde y cuándo comprar ---------- */
  const VERIFY = '<span class="badge verify">verificar en el sitio oficial</span>';
  const EXCH = [
    ['Buda.com', 'https://www.buda.com', 'Exchange de origen chileno', 'Maker/taker escalonadas según tu volumen mensual', 'Transferencia bancaria en CLP', 'Empresa chilena; revisa su estado en el registro de la CMF (Ley Fintec)', 'Autenticación en dos pasos (2FA); custodia a cargo de la plataforma'],
    ['Orionx', 'https://www.orionx.com', 'Exchange chileno', 'Maker/taker escalonadas según volumen', 'Transferencia bancaria en CLP', 'Empresa chilena; revisa su estado en el registro de la CMF (Ley Fintec)', '2FA; custodia a cargo de la plataforma'],
    ['CryptoMKT', 'https://www.cryptomkt.com', 'Exchange de origen chileno con presencia regional', 'Comisión por operación según tipo de orden', 'Transferencia bancaria en CLP', 'Revisa su estado en el registro de la CMF (Ley Fintec)', '2FA; custodia a cargo de la plataforma'],
    ['Binance', 'https://www.binance.com', 'Exchange global, mayor variedad de monedas', 'Spot en torno a 0,1% por operación (referencial); P2P con condiciones propias', 'P2P en CLP y tarjeta; los medios directos en CLP cambian con frecuencia', 'Entidad internacional, no es una empresa chilena; revisa qué protección aplica en Chile', '2FA, lista blanca de retiros, fondo de protección propio (SAFU)'],
  ];
  const BROK = [
    ['Racional', 'https://www.racional.cl', 'App chilena para acciones y ETF de EE.UU.', 'Revisa comisión por operación y por tipo de cambio CLP→USD', 'Transferencia bancaria en CLP', 'Revisa su inscripción en la CMF y con qué custodio en EE.UU. opera', 'Activos en custodio estadounidense; consulta la cobertura SIPC'],
    ['Fintual', 'https://fintual.cl', 'Administradora chilena: fondos y, según disponibilidad, acciones de EE.UU.', 'Comisión anual sobre el saldo en fondos; revisa condiciones para acciones', 'Transferencia bancaria en CLP', 'Administradora General de Fondos regulada por la CMF', 'Fondos regulados; patrimonio separado de la administradora'],
    ['Interactive Brokers', 'https://www.interactivebrokers.com', 'Broker internacional con acceso a casi todos los mercados', 'Comisiones bajas por operación; revisa mínimos y costos de datos', 'Transferencia internacional en USD (tu banco cobra el envío y el cambio)', 'Regulado en EE.UU. (SEC / FINRA); no es una entidad chilena', 'Cobertura SIPC sobre valores, con sus límites'],
    ['Corredoras tradicionales chilenas', 'https://www.cmfchile.cl', 'Corredoras de bolsa locales y de bancos con acceso a mercados internacionales', 'Suelen ser más altas (comisión + custodia); pide el tarifario', 'Cuenta en CLP con la misma institución', 'Corredoras de bolsa fiscalizadas por la CMF', 'Custodia local regulada'],
  ];
  const plat = (p) => `<div class="card plat tilt"><div class="card-h pop2"><h3><a href="${p[1]}" target="_blank" rel="noopener">${p[0]} ↗</a></h3>${VERIFY}</div><p class="small muted">${p[2]}</p><dl><dt>Comisiones</dt><dd>${p[3]}</dd><dt>Pago en CLP</dt><dd>${p[4]}</dd><dt>Regulación</dt><dd>${p[5]}</dd><dt>Seguridad</dt><dd>${p[6]}</dd></dl></div>`;
  V.comprar = {
    async render(token) {
      const el = $('view-comprar'), a = MX.state.asset, list = a.type === 'crypto' ? EXCH : BROK;
      el.innerHTML = head('Dónde y cuándo comprar · zonas técnicas en velas diarias') + `
        <div class="card"><div class="card-h"><h3>¿Cuándo? Zonas de interés técnico</h3><span class="small muted">Zonas donde el precio tuvo reacción antes. No son órdenes de compra.</span></div><div id="zBody">${MX.sk(4)}</div></div>
        <div class="page-h mt"><div><h2>¿Dónde? ${a.type === 'crypto' ? 'Exchanges cripto' : 'Brokers de acciones'} desde Chile</h2><p>Comparativa referencial. Comisiones, medios de pago y regulación cambian: confirma siempre en el sitio oficial antes de depositar.</p></div>${VERIFY}</div>
        <div class="grid g-2">${list.map(plat).join('')}</div>
        <div class="card mt"><div class="card-h"><h3>${a.type === 'crypto' ? 'También: brokers de acciones' : 'También: exchanges cripto'}</h3>${VERIFY}</div><div class="row">${(a.type === 'crypto' ? BROK : EXCH).map((p) => `<a class="chip" href="${p[1]}" target="_blank" rel="noopener">${p[0]} ↗</a>`).join('')}</div>
          <h3 class="mt" style="margin-bottom:8px">Antes de elegir plataforma</h3><ul class="clean"><li>Busca la empresa en el registro público de la <a href="https://www.cmfchile.cl" target="_blank" rel="noopener">CMF ↗</a> y desconfía de quien prometa rentabilidad garantizada.</li><li>Suma todos los costos: comisión por operación, diferencia de precio (spread), tipo de cambio y costo de retiro.</li><li>Activa siempre la autenticación en dos pasos y prueba primero con un monto pequeño, incluido un retiro.</li><li>En cripto, si no controlas las claves, dependes de la plataforma. Infórmate sobre billeteras propias para montos grandes.</li></ul></div>`;
      fillHead(token);
      const { res, a: an } = await MX.loadAsset(a, '1D');
      if (!token.ok()) return;
      if (!an) { $('zBody').innerHTML = few; return; }
      const z = MX.zones(an), rc = { Bajo: 'up', Medio: 'neu', Alto: 'down' };
      $('zBody').innerHTML = sampleNote(res) + `<div class="note info" style="margin-bottom:12px">RSI diario: <b>${MX.num(z.rsi, 1)}</b> ${z.oversold ? '— en <b>sobreventa</b> (bajo 30): históricamente zona de interés, aunque puede seguir cayendo.' : '— no está en sobreventa.'} Tendencia de largo plazo: ${z.trendUp == null ? MX.NA : z.trendUp ? '<b class="up">alcista</b> (precio sobre la EMA 200)' : '<b class="down">bajista</b> (precio bajo la EMA 200): comprar aquí es ir contra la tendencia y sube el riesgo'}. ${MX.learn('rsi')}</div>` +
        (z.zones.length ? `<div class="tbl-wrap"><table><thead><tr><th>Zona</th><th>Rango de precio</th><th>Distancia</th><th>Riesgo</th><th>La idea deja de valer bajo</th><th style="text-align:left">Por qué interesa</th></tr></thead><tbody>${z.zones.map((x) => `<tr><td><b>${x.name}</b></td><td class="num">${MX.money(x.lo)} – ${MX.money(x.hi)}</td><td class="num ${MX.cls(x.dist)}">${MX.pct(x.dist, 1)}</td><td><span class="badge ${rc[x.risk]}">${x.risk}</span></td><td class="num">${MX.money(x.inval)}</td><td class="wrap">${x.why}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No se detectaron zonas de soporte claras bajo el precio actual en velas diarias.</p>') +
        `<p class="small muted mt">Una alternativa a "adivinar el piso" es comprar por partes en fechas fijas (DCA). Pruébalo en <a href="#riesgo">Riesgo y DCA</a>, donde también puedes calcular el tamaño de tu posición y tu stop.</p>` + MX.srcTag(res);
    },
  };
})();
