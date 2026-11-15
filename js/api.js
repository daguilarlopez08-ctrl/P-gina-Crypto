/* Meridiano — fuentes de datos con caché y respaldo de ejemplo claramente etiquetado */
(function () {
  const MX = window.MX, api = (MX.api = {});
  const cache = new Map(), inflight = new Map();
  const enc = encodeURIComponent;

  async function getJSON(url, ttl = 60000, timeout = 12000) {
    const c = cache.get(url);
    if (c && Date.now() - c.t < ttl) return c.v;
    if (inflight.has(url)) return inflight.get(url);
    const p = (async () => {
      const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), timeout);
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const v = await r.json(); cache.set(url, { t: Date.now(), v }); return v;
      } finally { clearTimeout(to); inflight.delete(url); }
    })();
    inflight.set(url, p); return p;
  }
  const ok = (data, source) => ({ data, source, ts: Date.now(), sample: false });
  const smp = (data, reason) => ({ data, source: 'generados localmente, no son reales', ts: Date.now(), sample: true, reason });
  const none = (reason) => ({ data: null, source: null, ts: Date.now(), sample: false, reason });

  const cg = (path) => 'https://api.coingecko.com/api/v3' + path + (MX.settings.coingecko ? (path.includes('?') ? '&' : '?') + 'x_cg_demo_api_key=' + enc(MX.settings.coingecko) : '');
  const fh = (path) => 'https://finnhub.io/api/v1' + path + (path.includes('?') ? '&' : '?') + 'token=' + enc(MX.settings.finnhub);
  const BIN = ['https://data-api.binance.vision', 'https://api.binance.com'];
  async function binance(path, ttl) { let err; for (const b of BIN) { try { return await getJSON(b + path, ttl); } catch (e) { err = e; } } throw err; }

  /* ---------- datos de ejemplo ---------- */
  const SAMPLE_COINS = [['bitcoin', 'btc', 'Bitcoin', 64000, 1.26e12, 1.2, 3.4], ['ethereum', 'eth', 'Ethereum', 3100, 3.7e11, -0.8, 2.1], ['binancecoin', 'bnb', 'BNB', 580, 8.5e10, 0.4, 1.0], ['solana', 'sol', 'Solana', 145, 6.7e10, 3.9, -4.2], ['ripple', 'xrp', 'XRP', 0.52, 2.9e10, -2.1, -5.5], ['dogecoin', 'doge', 'Dogecoin', 0.12, 1.7e10, 5.6, 9.3], ['cardano', 'ada', 'Cardano', 0.45, 1.6e10, -3.4, -8.1], ['avalanche-2', 'avax', 'Avalanche', 28, 1.1e10, -1.5, -2.2], ['polkadot', 'dot', 'Polkadot', 6.1, 8.6e9, -0.6, -3.0], ['chainlink', 'link', 'Chainlink', 14, 8.4e9, 2.2, 6.1], ['near', 'near', 'NEAR Protocol', 5.2, 5.7e9, 6.4, 12.0], ['litecoin', 'ltc', 'Litecoin', 72, 5.4e9, 0.9, 1.4], ['uniswap', 'uni', 'Uniswap', 7.4, 4.4e9, -4.6, -9.9], ['stellar', 'xlm', 'Stellar', 0.1, 2.9e9, -1.1, -0.4], ['cosmos', 'atom', 'Cosmos', 6.8, 2.6e9, 1.7, -1.9], ['aave', 'aave', 'Aave', 95, 1.4e9, -5.8, -11.2]]
    .map((c, i) => ({ id: c[0], symbol: c[1], name: c[2], current_price: c[3], market_cap: c[4], market_cap_rank: i + 1, price_change_percentage_24h: c[5], price_change_percentage_7d_in_currency: c[6], total_volume: c[4] * 0.04, image: null }));

  api.STOCKS = [['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'NVIDIA'], ['GOOGL', 'Alphabet (Google)'], ['AMZN', 'Amazon'], ['META', 'Meta Platforms'], ['TSLA', 'Tesla'], ['BRK.B', 'Berkshire Hathaway'], ['JPM', 'JPMorgan Chase'], ['V', 'Visa'], ['NFLX', 'Netflix'], ['AMD', 'Advanced Micro Devices'], ['INTC', 'Intel'], ['KO', 'Coca-Cola'], ['DIS', 'Walt Disney'], ['SQM', 'Sociedad Química y Minera de Chile'], ['BABA', 'Alibaba'], ['COIN', 'Coinbase'], ['MSTR', 'Strategy (MicroStrategy)'], ['PLTR', 'Palantir'], ['WMT', 'Walmart'], ['XOM', 'Exxon Mobil'], ['SPY', 'ETF S&P 500 (SPY)'], ['QQQ', 'ETF Nasdaq 100 (QQQ)'], ['DIA', 'ETF Dow Jones (DIA)']]
    .map((s) => ({ type: 'stock', id: s[0], symbol: s[0], name: s[1] }));

  function rng(str) { let h = 1779033703; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19)); return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
  const TF = { '1h': { b: '1h', t: '1h', s: 3600 }, '4h': { b: '4h', t: '4h', s: 14400 }, '1D': { b: '1d', t: '1day', s: 86400 }, '1S': { b: '1w', t: '1week', s: 604800 }, '1M': { b: '1M', t: '1month', s: 2629800 } };
  function sampleCandles(asset, tf, limit) {
    const T = TF[tf], rnd = rng(asset.symbol + tf), now = Math.floor(Date.now() / 1000), t0 = now - (now % T.s) - (limit - 1) * T.s;
    const v = Math.min(0.07, 0.006 * Math.sqrt(T.s / 3600)); let p = 1, drift = 0; const out = [];
    for (let i = 0; i < limit; i++) {
      if (i % 40 === 0) drift = (rnd() - 0.47) * v * 0.5;
      const o = p, c = o * (1 + drift + (rnd() - 0.5) * 2 * v), h = Math.max(o, c) * (1 + rnd() * v * 0.6), l = Math.min(o, c) * (1 - rnd() * v * 0.6);
      out.push({ time: t0 + i * T.s, open: o, high: h, low: l, close: c, volume: 1000 * (0.5 + rnd() * 1.5) * (1 + Math.abs(c - o) / o / v) }); p = c;
    }
    const sc = SAMPLE_COINS.find((x) => x.symbol === asset.symbol.toLowerCase()), k = (sc ? sc.current_price : 100) / p;
    return out.map((c) => ({ time: c.time, open: c.open * k, high: c.high * k, low: c.low * k, close: c.close * k, volume: c.volume }));
  }

  /* ---------- mercado ---------- */
  api.lastMarkets = [];
  api.markets = async () => {
    try {
      const r = await getJSON(cg('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d'), 120000);
      if (!Array.isArray(r) || !r.length) throw 0;
      api.lastMarkets = r; return ok(r, 'CoinGecko');
    } catch (e) { if (!api.lastMarkets.length) api.lastMarkets = SAMPLE_COINS; return smp(SAMPLE_COINS, 'CoinGecko no respondió'); }
  };
  api.global = async () => {
    try { const d = (await getJSON(cg('/global'), 120000)).data; return ok({ mcap: d.total_market_cap.usd, btcDom: d.market_cap_percentage.btc, chg: d.market_cap_change_percentage_24h_usd }, 'CoinGecko'); }
    catch (e) { return smp({ mcap: 2.31e12, btcDom: 54.2, chg: 1.1 }, 'CoinGecko no respondió'); }
  };
  api.fng = async () => {
    try { const d = (await getJSON('https://api.alternative.me/fng/?limit=30', 600000)).data; return ok({ value: +d[0].value, cls: d[0].value_classification, hist: d.map((x) => +x.value).reverse() }, 'Alternative.me'); }
    catch (e) { return smp({ value: 52, cls: 'Neutral', hist: [] }, 'Alternative.me no respondió'); }
  };
  api.indices = async () => {
    const defs = [['S&P 500', 'SPY'], ['Nasdaq 100', 'QQQ'], ['Dow Jones', 'DIA']];
    const sample = (why) => smp(defs.map((d, i) => ({ name: d[0], proxy: d[1], price: [520, 445, 390][i], chg: [0.4, 0.7, -0.2][i] })), why);
    if (!MX.settings.finnhub) return sample('agrega tu clave de Finnhub en Configuración');
    try {
      const qs = await Promise.all(defs.map((d) => getJSON(fh('/quote?symbol=' + d[1]), 60000)));
      if (qs.some((q) => !q || !q.c)) throw 0;
      return ok(defs.map((d, i) => ({ name: d[0], proxy: d[1], price: qs[i].c, chg: qs[i].dp })), 'Finnhub');
    } catch (e) { return sample('Finnhub no respondió'); }
  };
  api.fx = async () => {
    try { const r = await getJSON('https://open.er-api.com/v6/latest/USD', 3600000); if (r.rates && r.rates.CLP) return ok(r.rates.CLP, 'open.er-api.com'); throw 0; } catch (e) {}
    try { const r = await getJSON(cg('/simple/price?ids=tether&vs_currencies=usd,clp'), 3600000); if (r.tether && r.tether.clp) return ok(r.tether.clp / r.tether.usd, 'CoinGecko'); } catch (e) {}
    return none('Tipo de cambio USD/CLP ' + MX.NA);
  };

  /* ---------- velas ---------- */
  api.klines = async (asset, tf = '1D', limit = 500) => {
    const T = TF[tf];
    if (asset.type === 'crypto') {
      const sym = asset.symbol.toUpperCase() + 'USDT';
      try {
        const r = await binance(`/api/v3/klines?symbol=${enc(sym)}&interval=${T.b}&limit=${limit}`, tf === '1h' ? 60000 : 180000);
        if (Array.isArray(r) && r.length) return ok(r.map((k) => ({ time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] })), 'Binance · ' + sym);
      } catch (e) {}
      if (tf === '4h') {
        try {
          const r = await getJSON(cg(`/coins/${enc(asset.id)}/ohlc?vs_currency=usd&days=30`), 300000);
          if (Array.isArray(r) && r.length > 30) return ok(r.map((k) => ({ time: Math.floor(k[0] / 1000), open: k[1], high: k[2], low: k[3], close: k[4], volume: 0 })), 'CoinGecko (sin volumen)');
        } catch (e) {}
      }
      return smp(sampleCandles(asset, tf, Math.min(limit, 400)), 'sin velas reales para este activo y temporalidad');
    }
    const tw = MX.settings.twelve, av = MX.settings.alpha;
    if (tw) {
      try {
        const r = await getJSON(`https://api.twelvedata.com/time_series?symbol=${enc(asset.symbol)}&interval=${T.t}&outputsize=${limit}&order=ASC&apikey=${enc(tw)}`, 300000);
        if (r.values && r.values.length) return ok(r.values.map((v) => ({ time: Math.floor(Date.parse(v.datetime.length > 10 ? v.datetime.replace(' ', 'T') + 'Z' : v.datetime) / 1000), open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +v.volume || 0 })), 'Twelve Data');
      } catch (e) {}
    }
    if (av && ['1D', '1S', '1M'].includes(tf)) {
      try {
        const fn = { '1D': 'TIME_SERIES_DAILY', '1S': 'TIME_SERIES_WEEKLY', '1M': 'TIME_SERIES_MONTHLY' }[tf];
        const r = await getJSON(`https://www.alphavantage.co/query?function=${fn}&symbol=${enc(asset.symbol)}&apikey=${enc(av)}`, 900000);
        const key = Object.keys(r).find((k) => /Time Series/i.test(k));
        if (key) {
          const rows = Object.entries(r[key]).map(([d, v]) => ({ time: Math.floor(Date.parse(d) / 1000), open: +v['1. open'], high: +v['2. high'], low: +v['3. low'], close: +v['4. close'], volume: +v['5. volume'] || 0 })).sort((a, b) => a.time - b.time);
          if (rows.length) return ok(rows.slice(-limit), 'Alpha Vantage');
        }
      } catch (e) {}
    }
    return smp(sampleCandles(asset, tf, Math.min(limit, 400)), tw || av ? 'la fuente de acciones no respondió' : 'agrega una clave de Twelve Data o Alpha Vantage en Configuración para ver velas reales de acciones');
  };

  /* ---------- cotización ---------- */
  api.quote = async (asset) => {
    if (asset.type === 'crypto') {
      try { const r = await binance('/api/v3/ticker/24hr?symbol=' + enc(asset.symbol.toUpperCase() + 'USDT'), 30000); if (+r.lastPrice) return ok({ price: +r.lastPrice, chg: +r.priceChangePercent }, 'Binance'); } catch (e) {}
      const m = (await api.markets()); const row = m.data.find((x) => x.id === asset.id);
      if (row && !m.sample) return ok({ price: row.current_price, chg: row.price_change_percentage_24h, image: row.image }, 'CoinGecko');
      try { const r = await getJSON(cg(`/simple/price?ids=${enc(asset.id)}&vs_currencies=usd&include_24hr_change=true`), 60000); if (r[asset.id]) return ok({ price: r[asset.id].usd, chg: r[asset.id].usd_24h_change }, 'CoinGecko'); } catch (e) {}
      return none('Precio en vivo ' + MX.NA);
    }
    if (MX.settings.finnhub) { try { const q = await getJSON(fh('/quote?symbol=' + enc(asset.symbol)), 30000); if (q && q.c) return ok({ price: q.c, chg: q.dp }, 'Finnhub'); } catch (e) {} }
    if (MX.settings.twelve) { try { const q = await getJSON(`https://api.twelvedata.com/quote?symbol=${enc(asset.symbol)}&apikey=${enc(MX.settings.twelve)}`, 60000); if (q && q.close) return ok({ price: +q.close, chg: +q.percent_change }, 'Twelve Data'); } catch (e) {} }
    return none('Precio en vivo ' + MX.NA + ' (agrega tu clave de Finnhub en Configuración)');
  };

  /* ---------- fundamentales ---------- */
  api.coin = async (asset) => {
    try {
      const r = await getJSON(cg(`/coins/${enc(asset.id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`), 300000);
      const m = r.market_data;
      return ok({ image: r.image && r.image.small, rank: r.market_cap_rank, mcap: m.market_cap.usd, vol: m.total_volume.usd, circ: m.circulating_supply, max: m.max_supply, total: m.total_supply, ath: m.ath.usd, athChg: m.ath_change_percentage.usd, athDate: m.ath_date.usd, fdv: m.fully_diluted_valuation && m.fully_diluted_valuation.usd, chg7: m.price_change_percentage_7d, chg30: m.price_change_percentage_30d, chg1y: m.price_change_percentage_1y, price: m.current_price.usd }, 'CoinGecko');
    } catch (e) {}
    const mk = await api.markets(); const x = mk.data.find((c) => c.id === asset.id);
    if (x && !mk.sample) return ok({ image: x.image, rank: x.market_cap_rank, mcap: x.market_cap, vol: x.total_volume, circ: x.circulating_supply, max: x.max_supply, total: x.total_supply, ath: x.ath, athChg: x.ath_change_percentage, athDate: x.ath_date, fdv: x.fully_diluted_valuation, chg7: x.price_change_percentage_7d_in_currency, price: x.current_price }, 'CoinGecko');
    return none('CoinGecko no respondió: datos fundamentales no disponibles por ahora');
  };
  const iso = (d) => new Date(d).toISOString().slice(0, 10);
  api.stock = async (asset) => {
    if (!MX.settings.finnhub) return none('Agrega tu clave gratuita de Finnhub en Configuración para ver los fundamentales de acciones');
    try {
      const s = enc(asset.symbol), now = Date.now();
      const [p, m, e] = await Promise.all([getJSON(fh('/stock/profile2?symbol=' + s), 3600000), getJSON(fh('/stock/metric?metric=all&symbol=' + s), 3600000),
        getJSON(fh(`/calendar/earnings?symbol=${s}&from=${iso(now)}&to=${iso(now + 150 * 864e5)}`), 3600000).catch(() => null)]);
      const next = e && e.earningsCalendar && e.earningsCalendar.map((x) => x.date).sort()[0];
      return ok({ profile: p || {}, metric: (m && m.metric) || {}, nextEarnings: next || null }, 'Finnhub');
    } catch (e) { return none('Finnhub no respondió: fundamentales no disponibles por ahora'); }
  };

  /* ---------- noticias ---------- */
  const BULL = ['surge', 'soar', 'rally', 'rallies', 'jump', 'gain', 'rise', 'rises', 'record high', 'all-time high', 'beat', 'beats', 'upgrade', 'bullish', 'approval', 'approve', 'adopt', 'partnership', 'buyback', 'inflow', 'growth', 'profit', 'outperform', 'raises', 'breakthrough', 'wins', 'rebound', 'recover', 'tops', 'climb', 'boost', 'strong', 'sube', 'alza', 'récord', 'supera'];
  const BEAR = ['plunge', 'drop', 'fall', 'falls', 'slump', 'crash', 'tumble', 'sink', 'miss', 'misses', 'downgrade', 'bearish', 'lawsuit', 'sue', 'sues', 'hack', 'exploit', 'ban', 'probe', 'investigation', 'outflow', 'loss', 'layoff', 'cuts', 'warning', 'warns', 'fraud', 'bankruptcy', 'sell-off', 'selloff', 'liquidation', 'recall', 'fine', 'decline', 'fear', 'weak', 'slide', 'cae', 'baja', 'caída', 'pérdida'];
  const TOPICS = [
    [/earnings|revenue|eps|guidance|quarter|results|profit|resultados|ingresos/i, 'Los resultados y proyecciones cambian lo que el mercado cree que vale la empresa.'],
    [/sec\b|regulat|law|ban\b|court|lawsuit|sue|probe|fine|regulaci/i, 'La regulación y los juicios cambian el riesgo de operar o mantener el activo.'],
    [/hack|exploit|breach|stolen|fraud/i, 'Los hackeos y fraudes dañan la confianza y pueden forzar ventas.'],
    [/etf|inflow|outflow|institution|treasury|whale|fund/i, 'Los flujos de grandes inversionistas mueven la demanda de forma directa.'],
    [/fed\b|rate|inflation|cpi|tariff|jobs|recession|tasa|inflaci/i, 'Las tasas de interés y la macroeconomía afectan a todos los activos de riesgo.'],
    [/upgrade|downgrade|analyst|price target|rating/i, 'Las opiniones de analistas influyen en las decisiones de fondos e instituciones.'],
    [/partner|launch|adopt|product|deal|acquisition|acquire|merger|upgrade/i, 'Nuevos productos, alianzas o compras pueden cambiar los ingresos o el uso futuro.'],
  ];
  api.classify = (title, summary) => {
    const t = (' ' + title + ' ' + (summary || '') + ' ').toLowerCase(); let s = 0;
    const has = (w) => new RegExp('[^a-záéíóúñ]' + w.replace(/[-]/g, '\\-') + '[^a-záéíóúñ]').test(t);
    BULL.forEach((w) => has(w) && s++); BEAR.forEach((w) => has(w) && s--);
    const label = s > 0 ? 'alcista' : s < 0 ? 'bajista' : 'neutral';
    const topic = TOPICS.find((x) => x[0].test(t));
    const why = topic ? topic[1] : label === 'alcista' ? 'Titular de tono positivo: puede mejorar el ánimo comprador en el corto plazo.' : label === 'bajista' ? 'Titular de tono negativo: puede aumentar la presión vendedora en el corto plazo.' : 'Sin una señal clara de dirección en el titular.';
    return { label, why };
  };
  const SAMPLE_NEWS = [['Titular de ejemplo: la compañía supera las expectativas de ingresos del trimestre', 'alcista'], ['Titular de ejemplo: reguladores abren una investigación al sector', 'bajista'], ['Titular de ejemplo: el mercado espera la decisión de tasas de la Fed', 'neutral'], ['Titular de ejemplo: fondos institucionales registran entradas netas', 'alcista']];
  api.news = async (asset) => {
    const sample = (why) => smp(SAMPLE_NEWS.map((n, i) => ({ headline: n[0], source: 'Ejemplo', url: '#', datetime: Date.now() / 1000 - i * 5400, summary: '' })), why);
    if (!MX.settings.finnhub) return sample('agrega tu clave de Finnhub en Configuración para ver noticias reales');
    try {
      if (asset.type === 'stock') {
        const r = await getJSON(fh(`/company-news?symbol=${enc(asset.symbol)}&from=${iso(Date.now() - 10 * 864e5)}&to=${iso(Date.now())}`), 600000);
        return ok((r || []).slice(0, 25), 'Finnhub');
      }
      const r = await getJSON(fh('/news?category=crypto'), 600000);
      const re = new RegExp('\\b(' + [asset.name, asset.symbol].map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b', 'i');
      const mine = (r || []).filter((n) => re.test(n.headline + ' ' + n.summary));
      const res = ok((mine.length ? mine : r || []).slice(0, 25), 'Finnhub');
      if (!mine.length) res.general = true;
      return res;
    } catch (e) { return sample('Finnhub no respondió'); }
  };
  api.earnings = async () => {
    if (!MX.settings.finnhub) return none('Agrega tu clave de Finnhub para ver fechas de resultados trimestrales');
    try {
      const r = await getJSON(fh(`/calendar/earnings?from=${iso(Date.now())}&to=${iso(Date.now() + 21 * 864e5)}`), 3600000);
      const want = new Set(api.STOCKS.map((s) => s.symbol).concat(MX.watch.list.filter((w) => w.type === 'stock').map((w) => w.symbol)));
      return ok((r.earningsCalendar || []).filter((x) => want.has(x.symbol)).sort((a, b) => a.date.localeCompare(b.date)), 'Finnhub');
    } catch (e) { return none('Finnhub no respondió: resultados trimestrales no disponibles'); }
  };

  /* ---------- búsqueda ---------- */
  api.searchLocal = (q) => {
    q = q.trim().toLowerCase(); if (!q) return [];
    const hit = (a) => a.symbol.toLowerCase().startsWith(q) || a.name.toLowerCase().includes(q);
    const coins = api.lastMarkets.filter(hit).map((c) => ({ type: 'crypto', id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image }));
    return coins.concat(api.STOCKS.filter(hit)).sort((a, b) => (b.symbol.toLowerCase() === q) - (a.symbol.toLowerCase() === q)).slice(0, 10);
  };
  api.searchRemote = async (q) => {
    const out = [];
    const jobs = [getJSON(cg('/search?query=' + enc(q)), 300000).then((r) => (r.coins || []).slice(0, 7).forEach((c) => out.push({ type: 'crypto', id: c.id, symbol: (c.symbol || '').toUpperCase(), name: c.name, image: c.thumb }))).catch(() => {})];
    if (MX.settings.finnhub) jobs.push(getJSON(fh('/search?q=' + enc(q)), 300000).then((r) => (r.result || []).filter((x) => !/[.:]/.test(x.symbol) && ['Common Stock', 'ETP', 'ADR'].includes(x.type)).slice(0, 7).forEach((s) => out.push({ type: 'stock', id: s.symbol, symbol: s.symbol, name: s.description }))).catch(() => {}));
    await Promise.all(jobs); return out;
  };
})();
