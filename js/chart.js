/* Meridiano — gráfico de velas con indicadores y paneles (TradingView Lightweight Charts v5) */
(function () {
  const MX = window.MX, L = window.LightweightCharts, C = (MX.chart = {});
  const COL = { up: '#22e39a', down: '#ff4d6d', e20: '#f5c451', e50: '#4cc9f0', e200: '#f472b6', bb: 'rgba(160,170,255,.75)', vwap: '#ff9f43', grid: 'rgba(255,255,255,.045)', text: '#8a8fa3' };
  C.COL = COL;
  let chart = null;

  C.base = (el, opts = {}) => L.createChart(el, Object.assign({
    autoSize: true,
    layout: { background: { type: 'solid', color: 'transparent' }, textColor: COL.text, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, panes: { separatorColor: 'rgba(255,255,255,.1)', separatorHoverColor: 'rgba(139,92,246,.3)', enableResize: true }, attributionLogo: true },
    grid: { vertLines: { color: COL.grid }, horzLines: { color: COL.grid } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,.08)' },
    timeScale: { borderColor: 'rgba(255,255,255,.08)', timeVisible: true, secondsVisible: false },
    crosshair: { mode: 0, vertLine: { color: 'rgba(255,255,255,.25)', labelBackgroundColor: '#23233a' }, horzLine: { color: 'rgba(255,255,255,.25)', labelBackgroundColor: '#23233a' } },
    localization: { locale: 'es-CL' },
  }, opts));

  const lineOpts = (color, w = 1, extra = {}) => Object.assign({ color, lineWidth: w, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, extra);

  C.render = (el, cd, a, on, tf) => {
    if (chart) { try { chart.remove(); } catch (e) {} chart = null; }
    el.innerHTML = '';
    const k = MX.scale(), P = a.price * k, dec = MX.decimals(P), pf = { type: 'price', precision: dec, minMove: Math.pow(10, -dec) };
    const panes = ['rsi', 'macd', 'stoch', 'atr', 'obv'].filter((p) => on[p] && (p !== 'obv' || a.obv));
    el.style.height = (el.dataset.h ? +el.dataset.h : innerWidth < 860 ? 340 : 430) + panes.length * 120 + 'px';
    chart = C.base(el, { timeScale: { borderColor: 'rgba(255,255,255,.08)', timeVisible: tf === '1h' || tf === '4h', secondsVisible: false } });
    const data = (arr, mul = 1) => { const o = []; for (let i = 0; i < cd.length; i++) if (arr[i] != null) o.push({ time: cd[i].time, value: arr[i] * mul }); return o; };

    const candles = chart.addSeries(L.CandlestickSeries, { upColor: COL.up, downColor: COL.down, borderVisible: false, wickUpColor: COL.up, wickDownColor: COL.down, priceFormat: pf });
    candles.setData(cd.map((x) => ({ time: x.time, open: x.open * k, high: x.high * k, low: x.low * k, close: x.close * k })));

    if (on.vol && a.hasVol) {
      const vol = chart.addSeries(L.HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
      vol.setData(cd.map((x) => ({ time: x.time, value: x.volume, color: x.close >= x.open ? 'rgba(34,227,154,.3)' : 'rgba(255,77,109,.3)' })));
    }
    if (on.ema) [['ema20', COL.e20], ['ema50', COL.e50], ['ema200', COL.e200]].forEach(([key, col]) => chart.addSeries(L.LineSeries, lineOpts(col, key === 'ema200' ? 2 : 1, { priceFormat: pf })).setData(data(a[key], k)));
    if (on.bb) ['up', 'mid', 'lo'].forEach((key) => chart.addSeries(L.LineSeries, lineOpts(COL.bb, 1, { lineStyle: key === 'mid' ? 2 : 0, priceFormat: pf })).setData(data(a.bb[key], k)));
    if (on.vwap && a.vwap) chart.addSeries(L.LineSeries, lineOpts(COL.vwap, 2, { priceFormat: pf })).setData(data(a.vwap, k));
    if (on.sr) {
      a.supports.slice(0, 3).forEach((s, i) => candles.createPriceLine({ price: s.price * k, color: 'rgba(34,227,154,.75)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'S' + (i + 1) }));
      a.resistances.slice(0, 3).forEach((s, i) => candles.createPriceLine({ price: s.price * k, color: 'rgba(255,77,109,.75)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'R' + (i + 1) }));
    }
    if (on.fib) a.fib.levels.forEach((f) => candles.createPriceLine({ price: f.price * k, color: 'rgba(245,196,81,.6)', lineWidth: 1, lineStyle: 1, axisLabelVisible: false, title: 'Fib ' + (f.r * 100).toFixed(1) + '%' }));

    const marks = [];
    if (on.cross && on.ema) a.crosses.forEach((x) => marks.push({ time: cd[x.i].time, position: x.type === 'golden' ? 'belowBar' : 'aboveBar', color: x.type === 'golden' ? COL.e20 : '#c084fc', shape: x.type === 'golden' ? 'arrowUp' : 'arrowDown', text: x.type === 'golden' ? 'Golden cross' : 'Death cross' }));
    if (on.div) a.divs.forEach((x) => marks.push({ time: cd[x.i].time, position: x.type === 'bull' ? 'belowBar' : 'aboveBar', color: x.type === 'bull' ? COL.up : COL.down, shape: 'circle', text: x.type === 'bull' ? 'Div. alcista' : 'Div. bajista' }));
    if (marks.length) L.createSeriesMarkers(candles, marks.sort((x, y) => x.time - y.time));

    let pi = 0; const np = { precision: 2, minMove: 0.01, type: 'price' };
    const guide = (s, levels) => levels.forEach((p) => s.createPriceLine({ price: p, color: 'rgba(255,255,255,.22)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' }));
    panes.forEach((p) => {
      pi++;
      if (p === 'rsi') { const s = chart.addSeries(L.LineSeries, lineOpts('#a78bfa', 2, { priceFormat: np, lastValueVisible: true, title: 'RSI' }), pi); s.setData(data(a.rsi)); guide(s, [30, 70]); }
      if (p === 'macd') {
        const hs = chart.addSeries(L.HistogramSeries, { priceLineVisible: false, lastValueVisible: false, priceFormat: pf, title: 'MACD' }, pi);
        hs.setData(data(a.macd.hist, k).map((d) => ({ ...d, color: d.value >= 0 ? 'rgba(34,227,154,.55)' : 'rgba(255,77,109,.55)' })));
        chart.addSeries(L.LineSeries, lineOpts('#4cc9f0', 1, { priceFormat: pf }), pi).setData(data(a.macd.macd, k));
        chart.addSeries(L.LineSeries, lineOpts('#ff9f43', 1, { priceFormat: pf }), pi).setData(data(a.macd.signal, k));
      }
      if (p === 'stoch') { const s = chart.addSeries(L.LineSeries, lineOpts('#4cc9f0', 2, { priceFormat: np, lastValueVisible: true, title: 'Estocástico' }), pi); s.setData(data(a.stoch.k)); chart.addSeries(L.LineSeries, lineOpts('#ff9f43', 1, { priceFormat: np }), pi).setData(data(a.stoch.d)); guide(s, [20, 80]); }
      if (p === 'atr') chart.addSeries(L.LineSeries, lineOpts('#f472b6', 2, { priceFormat: pf, lastValueVisible: true, title: 'ATR' }), pi).setData(data(a.atr, k));
      if (p === 'obv') chart.addSeries(L.LineSeries, lineOpts('#22e39a', 2, { priceFormat: { type: 'volume' }, lastValueVisible: true, title: 'OBV' }), pi).setData(data(a.obv));
    });
    const mainH = el.clientHeight - panes.length * 120;
    try { chart.panes().forEach((pn, i) => pn.setStretchFactor(i === 0 ? mainH : 120)); } catch (e) {}
    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, cd.length - 140), to: cd.length + 4 });
    return chart;
  };

  /* gráfico simple de líneas (comparador, DCA) */
  C.lines = (el, series, opts = {}) => {
    if (el._chart) { try { el._chart.remove(); } catch (e) {} }
    el.innerHTML = '';
    const ch = (el._chart = C.base(el, { timeScale: { borderColor: 'rgba(255,255,255,.08)', timeVisible: false }, localization: { locale: 'es-CL', priceFormatter: opts.fmt } }));
    series.forEach((s) => ch.addSeries(s.area ? L.AreaSeries : L.LineSeries, Object.assign({ lineWidth: 2, priceLineVisible: false, title: s.title || '' }, s.area ? { lineColor: s.color, topColor: s.color + '55', bottomColor: s.color + '05' } : { color: s.color, lineStyle: s.dash ? 2 : 0 })).setData(s.data));
    ch.timeScale().fitContent(); return ch;
  };
})();
