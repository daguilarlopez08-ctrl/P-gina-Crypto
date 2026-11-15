/* Meridiano — indicadores técnicos calculados en JavaScript. Devuelven arreglos alineados con las velas (null = sin dato). */
(function () {
  const I = (window.MX.ind = {});
  const nulls = (n) => Array(n).fill(null);
  const skip = (fn) => (arr, n) => { const s = arr.findIndex((x) => x != null); if (s < 0) return arr.slice(); return nulls(s).concat(fn(arr.slice(s), n)); };

  const sma = (v, n) => { const o = nulls(v.length); let s = 0; for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= n) s -= v[i - n]; if (i >= n - 1) o[i] = s / n; } return o; };
  const ema = (v, n) => { const o = nulls(v.length); if (v.length < n) return o; const k = 2 / (n + 1); let e = 0; for (let i = 0; i < n; i++) e += v[i]; e /= n; o[n - 1] = e; for (let i = n; i < v.length; i++) { e = v[i] * k + e * (1 - k); o[i] = e; } return o; };
  I.sma = skip(sma); I.ema = skip(ema);

  I.rsi = (c, n = 14) => {
    const o = nulls(c.length); if (c.length <= n) return o; let g = 0, l = 0;
    for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; }
    g /= n; l /= n; o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
    return o;
  };
  I.macd = (c, f = 12, s = 26, g = 9) => {
    const a = I.ema(c, f), b = I.ema(c, s), macd = c.map((_, i) => (a[i] != null && b[i] != null ? a[i] - b[i] : null)), signal = I.ema(macd, g);
    return { macd, signal, hist: macd.map((m, i) => (m != null && signal[i] != null ? m - signal[i] : null)) };
  };
  I.stoch = (h, l, c, n = 14, ks = 3, ds = 3) => {
    const raw = nulls(c.length);
    for (let i = n - 1; i < c.length; i++) { let hh = -Infinity, ll = Infinity; for (let j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; } raw[i] = hh === ll ? 50 : ((c[i] - ll) / (hh - ll)) * 100; }
    const k = I.sma(raw, ks); return { k, d: I.sma(k, ds) };
  };
  I.bb = (c, n = 20, m = 2) => {
    const mid = I.sma(c, n), up = nulls(c.length), lo = nulls(c.length);
    for (let i = n - 1; i < c.length; i++) { let s = 0; for (let j = i - n + 1; j <= i; j++) s += (c[j] - mid[i]) ** 2; const sd = Math.sqrt(s / n); up[i] = mid[i] + m * sd; lo[i] = mid[i] - m * sd; }
    return { mid, up, lo };
  };
  I.atr = (h, l, c, n = 14) => {
    const o = nulls(c.length); if (c.length <= n) return o; const tr = (i) => Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
    let a = 0; for (let i = 1; i <= n; i++) a += tr(i); a /= n; o[n] = a;
    for (let i = n + 1; i < c.length; i++) { a = (a * (n - 1) + tr(i)) / n; o[i] = a; }
    return o;
  };
  I.obv = (c, v) => { const o = [0]; for (let i = 1; i < c.length; i++) o.push(o[i - 1] + (c[i] > c[i - 1] ? v[i] : c[i] < c[i - 1] ? -v[i] : 0)); return o; };
  /* VWAP: en intradía se reinicia cada día (UTC); en diario/semanal es móvil de 20 períodos. */
  I.vwap = (cd, intraday) => {
    const o = nulls(cd.length), tp = (x) => (x.high + x.low + x.close) / 3;
    if (intraday) { let pv = 0, vv = 0, day = null; cd.forEach((x, i) => { const d = Math.floor(x.time / 86400); if (d !== day) { day = d; pv = 0; vv = 0; } pv += tp(x) * x.volume; vv += x.volume; o[i] = vv > 0 ? pv / vv : null; }); return o; }
    const n = 20; for (let i = n - 1; i < cd.length; i++) { let pv = 0, vv = 0; for (let j = i - n + 1; j <= i; j++) { pv += tp(cd[j]) * cd[j].volume; vv += cd[j].volume; } o[i] = vv > 0 ? pv / vv : null; }
    return o;
  };
  I.pivots = (h, l, L = 5, R = 5, from = 0) => {
    const hi = [], lo = [];
    for (let i = Math.max(L, from); i < h.length - R; i++) { let H = true, Lw = true; for (let j = i - L; j <= i + R; j++) { if (j === i) continue; if (h[j] > h[i]) H = false; if (l[j] < l[i]) Lw = false; } if (H) hi.push(i); if (Lw) lo.push(i); }
    return { hi, lo };
  };
})();
