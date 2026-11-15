/* Meridiano — análisis: señales, puntaje, soportes/resistencias, Fibonacci, divergencias, escenarios y zonas */
(function () {
  const MX = window.MX, I = MX.ind;
  const last = (a) => a[a.length - 1];

  MX.analyze = (cd, tf) => {
    const n = cd.length, c = cd.map((x) => x.close), h = cd.map((x) => x.high), l = cd.map((x) => x.low), v = cd.map((x) => x.volume);
    const hasVol = v.some((x) => x > 0), intraday = tf === '1h' || tf === '4h';
    const a = { n, c, h, l, v, hasVol, price: c[n - 1], ema20: I.ema(c, 20), ema50: I.ema(c, 50), ema200: I.ema(c, 200), rsi: I.rsi(c), macd: I.macd(c), stoch: I.stoch(h, l, c), bb: I.bb(c), atr: I.atr(h, l, c), obv: hasVol ? I.obv(c, v) : null, vwap: hasVol ? I.vwap(cd, intraday) : null, vwapMode: intraday ? 'diario' : 'móvil 20' };
    const P = a.price, atr = last(a.atr) || P * 0.02;
    a.atrLast = atr;

    /* soportes y resistencias: pivotes agrupados por cercanía */
    const from = Math.max(0, n - 260), pv = I.pivots(h, l, 5, 5, from), tol = Math.max(atr * 0.6, P * 0.004);
    const pts = pv.hi.map((i) => ({ p: h[i], i })).concat(pv.lo.map((i) => ({ p: l[i], i }))).sort((x, y) => x.p - y.p);
    const clusters = [];
    pts.forEach((pt) => { const k = last(clusters); if (k && pt.p - k.p <= tol) { k.p = (k.p * k.t + pt.p) / (k.t + 1); k.t++; k.i = Math.max(k.i, pt.i); } else clusters.push({ p: pt.p, t: 1, i: pt.i }); });
    const lv = clusters.map((k) => ({ price: k.p, touches: k.t, idx: k.i }));
    a.supports = lv.filter((x) => x.price < P - atr * 0.15).sort((x, y) => y.price - x.price).slice(0, 4);
    a.resistances = lv.filter((x) => x.price > P + atr * 0.15).sort((x, y) => x.price - y.price).slice(0, 4);

    /* Fibonacci sobre el último gran movimiento */
    const w = Math.min(n, 120), s0 = n - w; let hi = s0, lo = s0;
    for (let i = s0; i < n; i++) { if (h[i] > h[hi]) hi = i; if (l[i] < l[lo]) lo = i; }
    const up = lo < hi, range = h[hi] - l[lo];
    a.fib = { hi: h[hi], lo: l[lo], up, levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((r) => ({ r, price: up ? h[hi] - r * range : l[lo] + r * range })) };

    /* cruces de medias */
    a.crosses = [];
    const cross = (f, s, pair) => { for (let i = Math.max(1, n - 300); i < n; i++) { if (f[i] == null || s[i] == null || f[i - 1] == null || s[i - 1] == null) continue; if (f[i - 1] <= s[i - 1] && f[i] > s[i]) a.crosses.push({ i, type: 'golden', pair }); else if (f[i - 1] >= s[i - 1] && f[i] < s[i]) a.crosses.push({ i, type: 'death', pair }); } };
    cross(a.ema50, a.ema200, '50/200');

    /* divergencias RSI vs precio */
    a.divs = [];
    const p3 = I.pivots(h, l, 3, 3, Math.max(15, n - 160));
    for (let k = 1; k < p3.lo.length; k++) { const i = p3.lo[k - 1], j = p3.lo[k]; if (j - i <= 60 && l[j] < l[i] && a.rsi[j] > a.rsi[i] && a.rsi[i] < 45) a.divs.push({ i: j, type: 'bull' }); }
    for (let k = 1; k < p3.hi.length; k++) { const i = p3.hi[k - 1], j = p3.hi[k]; if (j - i <= 60 && h[j] > h[i] && a.rsi[j] < a.rsi[i] && a.rsi[i] > 55) a.divs.push({ i: j, type: 'bear' }); }
    a.divs.sort((x, y) => x.i - y.i);

    buildSignals(a);
    return a;
  };

  function buildSignals(a) {
    const S = [], P = a.price, n = a.n, f = (x, d = 1) => MX.num(x, d);
    const add = (key, name, value, s, w, text) => S.push({ key, name, value, s, w, text });
    const rsi = last(a.rsi);
    if (rsi != null) add('rsi', 'RSI (14)', f(rsi), rsi < 30 ? 1 : rsi > 70 ? -1 : rsi >= 50 ? 0.3 : -0.3, 1.5,
      rsi < 30 ? 'Sobreventa: el precio cayó mucho en poco tiempo. A veces antecede un rebote, pero en tendencias bajistas fuertes puede seguir así.' : rsi > 70 ? 'Sobrecompra: subió mucho en poco tiempo. Aumenta la probabilidad de una pausa o corrección, aunque en tendencias fuertes puede durar.' : rsi >= 50 ? 'Sobre 50: los compradores llevan una ventaja moderada.' : 'Bajo 50: los vendedores llevan una ventaja moderada.');
    const m = last(a.macd.macd), sg = last(a.macd.signal), hs = last(a.macd.hist), hp = a.macd.hist[n - 2];
    if (m != null && sg != null) add('macd', 'MACD (12, 26, 9)', m > sg ? 'sobre su señal' : 'bajo su señal', (m > sg ? 0.6 : -0.6) + (hp != null ? (hs > hp ? 0.4 : -0.4) : 0), 1.5,
      (m > sg ? 'La línea MACD está sobre su señal: el impulso favorece a los compradores' : 'La línea MACD está bajo su señal: el impulso favorece a los vendedores') + (hp != null ? (hs > hp ? ', y el impulso va ganando fuerza al alza.' : ', y el impulso se está debilitando o girando a la baja.') : '.'));
    const k = last(a.stoch.k), d = last(a.stoch.d);
    if (k != null && d != null) add('stoch', 'Estocástico (14, 3, 3)', f(k), k < 20 ? (k > d ? 1 : 0.7) : k > 80 ? (k < d ? -1 : -0.7) : k > d ? 0.3 : -0.3, 1,
      k < 20 ? 'Zona de sobreventa (bajo 20): el precio cierra cerca de sus mínimos recientes.' + (k > d ? ' Además empieza a girar hacia arriba.' : '') : k > 80 ? 'Zona de sobrecompra (sobre 80): el precio cierra cerca de sus máximos recientes.' + (k < d ? ' Además empieza a girar hacia abajo.' : '') : k > d ? 'En zona media y subiendo: impulso de corto plazo positivo.' : 'En zona media y bajando: impulso de corto plazo negativo.');
    const e20 = last(a.ema20), e50 = last(a.ema50), e200 = last(a.ema200), ems = [e20, e50, e200].filter((x) => x != null);
    if (ems.length) { const above = ems.filter((x) => P > x).length; add('ema', 'Medias EMA 20 / 50 / 200', `sobre ${above} de ${ems.length}`, (above / ems.length) * 2 - 1, 2,
      above === ems.length ? 'El precio está sobre todas sus medias: tendencia alcista en este marco de tiempo.' : above === 0 ? 'El precio está bajo todas sus medias: tendencia bajista en este marco de tiempo.' : 'El precio está entre sus medias: tendencia mixta o en transición.' + (e200 == null ? ' (No hay suficientes velas para la EMA 200.)' : '')); }
    if (e50 != null && e200 != null) { const lc = last(a.crosses), recent = lc && n - 1 - lc.i <= 20; add('cross', 'Cruce EMA 50 / 200', e50 > e200 ? 'EMA 50 sobre EMA 200' : 'EMA 50 bajo EMA 200', e50 > e200 ? (recent ? 1 : 0.6) : recent ? -1 : -0.6, 1.5,
      (e50 > e200 ? 'La media de 50 está sobre la de 200: estructura de largo plazo alcista.' : 'La media de 50 está bajo la de 200: estructura de largo plazo bajista.') + (recent ? (lc.type === 'golden' ? ' Hubo un golden cross hace ' : ' Hubo un death cross hace ') + (n - 1 - lc.i) + ' velas.' : '')); }
    const bu = last(a.bb.up), bl = last(a.bb.lo), bm = last(a.bb.mid);
    if (bu != null) { const pos = (P - bl) / (bu - bl || 1); add('bb', 'Bandas de Bollinger (20, 2)', `${f(pos * 100, 0)}% del rango`, P < bl ? 0.7 : P > bu ? -0.7 : pos < 0.2 ? 0.3 : pos > 0.8 ? -0.3 : 0, 1,
      P < bl ? 'El precio está bajo la banda inferior: movimiento extremo a la baja; suele volver hacia la media, pero no siempre de inmediato.' : P > bu ? 'El precio está sobre la banda superior: movimiento extremo al alza; suele enfriarse hacia la media.' : 'El precio está dentro de las bandas' + (P > bm ? ', en la mitad superior.' : ', en la mitad inferior.') + ' Bandas angostas anuncian que puede venir un movimiento fuerte.'); }
    if (a.obv) { const o = a.obv, o20 = I.sma(o, 20), up = last(o) > last(o20); add('obv', 'OBV (volumen acumulado)', up ? 'creciendo' : 'decreciendo', up ? 0.5 : -0.5, 1, up ? 'El volumen acompaña más a las subidas que a las bajadas: hay acumulación.' : 'El volumen acompaña más a las bajadas: hay distribución (ventas).'); }
    const vw = a.vwap && last(a.vwap);
    if (vw != null) add('vwap', `VWAP (${a.vwapMode})`, P > vw ? 'precio sobre VWAP' : 'precio bajo VWAP', P > vw ? 0.5 : -0.5, 1, P > vw ? 'El precio está sobre el precio promedio ponderado por volumen: quienes compraron recientemente van, en promedio, ganando.' : 'El precio está bajo el promedio ponderado por volumen: quienes compraron recientemente van, en promedio, perdiendo.');
    const dv = last(a.divs);
    if (dv && n - 1 - dv.i <= 15) add('div', 'Divergencia RSI', dv.type === 'bull' ? 'alcista reciente' : 'bajista reciente', dv.type === 'bull' ? 1 : -1, 1.5, dv.type === 'bull' ? 'El precio hizo un mínimo más bajo pero el RSI no: la caída pierde fuerza. Es una señal temprana, no una confirmación.' : 'El precio hizo un máximo más alto pero el RSI no: la subida pierde fuerza. Es una señal temprana, no una confirmación.');
    const atrP = (a.atrLast / P) * 100;
    add('atr', 'ATR (14) · volatilidad', f(atrP, 2) + '% por vela', null, 0, `En promedio el precio se mueve ${f(atrP, 2)}% por vela. No indica dirección: sirve para dimensionar el stop y el tamaño de la posición.`);
    if (a.hasVol && n > 21) { const avg = a.v.slice(-21, -1).reduce((x, y) => x + y, 0) / 20; a.volRel = avg > 0 ? a.v[n - 2] / avg : null; if (a.volRel != null) add('vol', 'Volumen relativo', f(a.volRel, 2) + '× el promedio', null, 0, a.volRel > 1.5 ? 'La última vela cerrada tuvo volumen muy superior al promedio: el movimiento tiene más participación y es más relevante.' : a.volRel < 0.6 ? 'Volumen bajo: los movimientos con poco volumen son menos confiables.' : 'Volumen dentro de lo normal.'); }

    let sw = 0, ww = 0; S.forEach((x) => { if (x.s != null) { x.s = Math.max(-1, Math.min(1, x.s)); sw += x.s * x.w; ww += x.w; } });
    a.signals = S; a.score = ww ? Math.round((sw / ww) * 100) : 0;
    a.label = a.score <= -60 ? 'Venta fuerte' : a.score <= -20 ? 'Venta' : a.score < 20 ? 'Neutral' : a.score < 60 ? 'Compra' : 'Compra fuerte';
  }

  /* Escenarios: niveles condicionales a partir de soportes, resistencias, Fibonacci y ATR. Nunca predicciones. */
  MX.scenarios = (a) => {
    const P = a.price, atr = a.atrLast, [s1, s2] = a.supports, [r1, r2] = a.resistances, m = MX.money;
    const fibNear = (p) => { const f = a.fib.levels.find((x) => Math.abs(x.price - p) <= atr * 0.6); return f ? `coincide con el retroceso de Fibonacci ${(f.r * 100).toFixed(1).replace('.', ',')}%` : null; };
    const lvl = (price, basis) => ({ price, pct: ((price - P) / P) * 100, basis: [basis, fibNear(price)].filter(Boolean).join(' · ') });
    const d1 = s1 ? lvl(s1.price, `soporte con ${s1.touches} toque(s)`) : lvl(P - 1.5 * atr, '1,5 × ATR bajo el precio (sin soporte cercano detectado)');
    const d2raw = s2 ? s2.price : d1.price - 1.5 * atr;
    const d2 = lvl(Math.max(d2raw, P * 0.05), s2 ? `soporte siguiente con ${s2.touches} toque(s)` : '1,5 × ATR bajo el primer nivel');
    const u1 = r1 ? lvl(r1.price, `resistencia con ${r1.touches} toque(s)`) : lvl(P + 1.5 * atr, '1,5 × ATR sobre el precio (sin resistencia cercana detectada)');
    const u2 = lvl(r2 ? r2.price : u1.price + 1.5 * atr, r2 ? `resistencia siguiente con ${r2.touches} toque(s)` : '1,5 × ATR sobre el primer nivel');
    const bl = lvl(Math.max(d1.price, P - atr), 'el mayor entre el soporte cercano y 1 × ATR'), bh = lvl(Math.min(u1.price, P + atr), 'el menor entre la resistencia cercana y 1 × ATR');
    const e50 = last(a.ema50);
    return {
      bear: { title: 'Escenario bajista', tag: '¿Hasta dónde podría caer?', color: 'var(--down)', levels: [d1, d2],
        conds: [`Que el precio cierre bajo ${m(d1.price)} y no lo recupere en las velas siguientes.`, 'Que la caída venga con volumen sobre el promedio (ventas con convicción).', 'Que el RSI se mantenga bajo 50 y el MACD bajo su línea de señal.', e50 != null && P > e50 ? `Que pierda la EMA 50 (${m(e50)}).` : 'Que malas noticias o un mercado general débil aumenten la presión vendedora.'] },
      base: { title: 'Escenario base', tag: 'Rango probable si nada cambia', color: 'var(--warn)', levels: [bl, bh],
        conds: [`Que el precio siga entre ${m(bl.price)} y ${m(bh.price)} sin rupturas con volumen.`, `Que la volatilidad se mantenga cerca de la actual (ATR ≈ ${m(atr)} por vela).`, 'Que no aparezcan noticias o datos macro que cambien el ánimo del mercado.'] },
      bull: { title: 'Escenario alcista', tag: '¿Hasta dónde podría subir?', color: 'var(--up)', levels: [u1, u2],
        conds: [`Que el precio cierre sobre ${m(u1.price)} y lo sostenga como nuevo piso.`, 'Que la subida venga con volumen sobre el promedio (compras con convicción).', 'Que el RSI se mantenga sobre 50 y el MACD sobre su línea de señal.', e50 != null && P < e50 ? `Que recupere la EMA 50 (${m(e50)}).` : 'Que el mercado general acompañe (apetito por riesgo).'] },
    };
  };

  /* Zonas de interés técnico para una posible entrada, con nivel de riesgo. */
  MX.zones = (a) => {
    const P = a.price, atr = a.atrLast, e200 = last(a.ema200), rsi = last(a.rsi), trendUp = e200 != null ? P > e200 : null, z = [];
    const risk = (base) => { const lv = ['Bajo', 'Medio', 'Alto']; let i = base; if (trendUp === false) i++; if (rsi != null && rsi < 30) i = Math.max(0, i); return lv[Math.max(0, Math.min(2, i))]; };
    a.supports.slice(0, 2).forEach((s, i) => z.push({ name: i === 0 ? 'Soporte cercano' : 'Soporte profundo', lo: s.price - atr * 0.25, hi: s.price + atr * 0.25, dist: ((s.price - P) / P) * 100, risk: risk(i === 0 ? 1 : 0), inval: s.price - atr,
      why: `Nivel donde el precio rebotó ${s.touches} vez/veces antes. ` + (i === 0 ? 'Es la zona técnica más cercana.' : 'Requiere una caída mayor: mejor precio, pero puede no llegar.') + (trendUp === false ? ' Ojo: el precio está bajo su EMA 200 (tendencia bajista), los soportes fallan más seguido.' : '') }));
    if (e200 != null && P > e200 && (P - e200) / P < 0.35) z.push({ name: 'Retroceso a la EMA 200', lo: e200 - atr * 0.3, hi: e200 + atr * 0.3, dist: ((e200 - P) / P) * 100, risk: 'Medio', inval: e200 - atr * 1.5, why: 'La media de 200 suele actuar como piso en tendencias alcistas. Si se pierde con fuerza, la tendencia de largo plazo queda en duda.' });
    const f618 = a.fib.up && a.fib.levels.find((x) => x.r === 0.618);
    if (f618 && f618.price < P) z.push({ name: 'Fibonacci 61,8%', lo: f618.price - atr * 0.25, hi: f618.price + atr * 0.25, dist: ((f618.price - P) / P) * 100, risk: risk(1), inval: a.fib.lo, why: 'Retroceso "dorado" del último tramo alcista: zona donde muchos operadores buscan compras. Bajo el origen del movimiento la idea deja de ser válida.' });
    return { zones: z.sort((x, y) => y.dist - x.dist), rsi, trendUp, oversold: rsi != null && rsi < 30 };
  };

  /* Carga compartida de velas + análisis */
  MX.loadAsset = async (asset, tf) => {
    const res = await MX.api.klines(asset, tf);
    return { res, a: res.data.length >= 35 ? MX.analyze(res.data, tf) : null };
  };
})();
