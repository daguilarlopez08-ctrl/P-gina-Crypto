/* Meridiano — módulo 1: Panorama del mercado */
(function () {
  const MX = window.MX, api = MX.api, h = MX.h;
  const FNG_ES = { 'Extreme Fear': 'Miedo extremo', Fear: 'Miedo', Neutral: 'Neutral', Greed: 'Codicia', 'Extreme Greed': 'Codicia extrema' };
  const coinAsset = (c) => ({ type: 'crypto', id: c.id, symbol: c.symbol.toUpperCase(), name: c.name });

  function treemap(items, W, H) {
    const out = [], total = items.reduce((s, i) => s + i.v, 0); let rest = items.map((i) => ({ ...i, a: (i.v / total) * W * H })), x = 0, y = 0, w = W, hh = H;
    while (rest.length) {
      const short = Math.min(w, hh), worst = (r) => { const s = r.reduce((p, b) => p + b.a, 0), mx = Math.max(...r.map((b) => b.a)), mn = Math.min(...r.map((b) => b.a)); return Math.max((short * short * mx) / (s * s), (s * s) / (short * short * mn)); };
      let row = [rest[0]], i = 1;
      while (i < rest.length && worst([...row, rest[i]]) <= worst(row)) row.push(rest[i++]);
      const s = row.reduce((p, b) => p + b.a, 0);
      if (w >= hh) { const rw = s / hh; let cy = y; row.forEach((b) => { const bh = b.a / rw; out.push({ ...b, x, y: cy, w: rw, h: bh }); cy += bh; }); x += rw; w -= rw; }
      else { const rh = s / w; let cx = x; row.forEach((b) => { const bw = b.a / rh; out.push({ ...b, x: cx, y, w: bw, h: rh }); cx += bw; }); y += rh; hh -= rh; }
      rest = rest.slice(i);
    }
    return out;
  }
  const heatColor = (chg) => { const t = Math.min(1, Math.abs(chg || 0) / 8); return (chg >= 0 ? 'rgba(34,227,154,' : 'rgba(255,77,109,') + (0.14 + 0.62 * t).toFixed(2) + ')'; };

  function drawHeat(box, coins) {
    const W = box.clientWidth || 800, H = box.clientHeight || 420;
    const cells = treemap(coins.slice(0, 36).map((c) => ({ c, v: Math.sqrt(c.market_cap || 1) })), W, H);
    box.innerHTML = cells.map((b, i) => { const ch = b.c.price_change_percentage_24h; const big = b.w > 54 && b.h > 34;
      return `<div class="cell" data-i="${i}" title="${h(b.c.name)} · ${MX.pct(ch)}" style="left:${(b.x / W) * 100}%;top:${(b.y / H) * 100}%;width:${(b.w / W) * 100}%;height:${(b.h / H) * 100}%;background:${heatColor(ch)}">${big ? `<b>${h(b.c.symbol.toUpperCase())}</b><span>${MX.pct(ch, 1)}</span>` : ''}</div>`; }).join('');
    box.onclick = (e) => { const el = e.target.closest('.cell'); if (el) MX.open(coinAsset(cells[+el.dataset.i].c)); };
  }

  const moverRow = (c) => `<div class="mover" data-id="${h(c.id)}"><div class="asset-cell">${MX.logo(c, c.image)}<div><b>${h(c.symbol.toUpperCase())}</b> <span>${h(c.name)}</span></div></div><div class="row" style="gap:14px"><span class="num muted">${MX.money(c.current_price)}</span><b class="num ${MX.cls(c.price_change_percentage_24h)}" style="min-width:70px;text-align:right">${MX.pct(c.price_change_percentage_24h)}</b></div></div>`;

  MX.views.panorama = {
    async render(token) {
      const el = document.getElementById('panoramaBody');
      const stat = (id, lbl, learn) => `<div class="card stat tilt" id="${id}"><div class="lbl pop2">${lbl} ${learn ? MX.learn(learn) : ''}</div><div class="body pop">${MX.sk(2)}</div></div>`;
      if (!el.dataset.ready) el.innerHTML = `
        <div class="grid g-stats">${stat('st-mcap', 'Capitalización cripto', 'mcap')}${stat('st-dom', 'Dominancia BTC', 'dom')}${stat('st-fng', 'Fear &amp; Greed', 'fng')}${stat('st-i0', 'S&amp;P 500')}${stat('st-i1', 'Nasdaq 100')}${stat('st-i2', 'Dow Jones')}</div>
        <div class="grid g-2 mt">
          <div class="card"><div class="card-h"><h3><span class="up">▲</span> Mayores alzas del día</h3><span class="badge">Cripto · top 100</span></div><div id="gainers"><span class="sk row"></span><span class="sk row"></span><span class="sk row"></span><span class="sk row"></span></div></div>
          <div class="card"><div class="card-h"><h3><span class="down">▼</span> Mayores caídas del día</h3><span class="badge">Cripto · top 100</span></div><div id="losers"><span class="sk row"></span><span class="sk row"></span><span class="sk row"></span><span class="sk row"></span></div></div>
        </div>
        <div class="card mt"><div class="card-h"><h3>Heatmap del mercado cripto ${MX.learn('heatmap')}</h3><span class="small muted">Color = variación 24h · tamaño ∝ √capitalización</span></div><div class="heat" id="heat"><span class="sk box" style="height:100%"></span></div><div id="heatSrc"></div></div>`;
      el.dataset.ready = 1;
      const body = (id) => el.querySelector('#' + id + ' .body');
      const chips = document.getElementById('heroChips');
      chips.innerHTML = [['crypto', 'bitcoin', 'BTC', 'Bitcoin'], ['crypto', 'ethereum', 'ETH', 'Ethereum'], ['crypto', 'solana', 'SOL', 'Solana'], ['stock', 'AAPL', 'AAPL', 'Apple'], ['stock', 'NVDA', 'NVDA', 'NVIDIA'], ['stock', 'TSLA', 'TSLA', 'Tesla']].map((a, i) => `<span class="chip" data-i="${i}">${a[2]}</span>`).join('');
      chips.onclick = (e) => { const c = e.target.closest('.chip'); if (!c) return; const a = [['crypto', 'bitcoin', 'BTC', 'Bitcoin'], ['crypto', 'ethereum', 'ETH', 'Ethereum'], ['crypto', 'solana', 'SOL', 'Solana'], ['stock', 'AAPL', 'AAPL', 'Apple'], ['stock', 'NVDA', 'NVDA', 'NVIDIA'], ['stock', 'TSLA', 'TSLA', 'Tesla']][+c.dataset.i]; MX.open({ type: a[0], id: a[1], symbol: a[2], name: a[3] }); };

      api.global().then((r) => {
        if (!token.ok()) return; const d = r.data;
        body('st-mcap').innerHTML = `<div class="val" id="v-mcap"></div><div class="sub ${MX.cls(d.chg)}">${MX.pct(d.chg)} <span class="muted">en 24h</span></div>${MX.srcTag(r)}`;
        MX.countTo(document.getElementById('v-mcap'), d.mcap, (v) => MX.money(v, { compact: true }));
        body('st-dom').innerHTML = `<div class="val" id="v-dom"></div><div class="bar" style="margin-top:10px"><i style="width:${Math.min(100, d.btcDom)}%"></i></div>${MX.srcTag(r)}`;
        MX.countTo(document.getElementById('v-dom'), d.btcDom, (v) => MX.num(v, 1) + '%');
        document.getElementById('heroTitle').innerHTML = r.sample ? 'Mercado cripto <span class="muted">(sin conexión a datos reales)</span>' : `El mercado cripto ${d.chg >= 0 ? 'sube' : 'baja'} <span class="${MX.cls(d.chg)}">${MX.pct(d.chg)}</span> hoy`;
        document.getElementById('heroSub').textContent = r.sample ? 'Se muestran datos de ejemplo para que veas el diseño. Revisa tu conexión o las claves en Configuración.' : `Capitalización total ${MX.money(d.mcap, { compact: true })} · Bitcoin representa ${MX.num(d.btcDom, 1)}% del mercado.`;
        MX.hero.setMood(r.sample ? null : d.chg);
      });
      api.fng().then((r) => {
        if (!token.ok()) return; const d = r.data;
        body('st-fng').innerHTML = `<div class="gauge-wrap">${MX.gauge(d.value / 100, 'fng')}<div class="gauge-val">${d.value}</div><div class="sub muted">${h(FNG_ES[d.cls] || d.cls)}</div></div>${MX.srcTag(r)}`;
        MX.animateGauges(el);
      });
      api.indices().then((r) => {
        if (!token.ok()) return;
        r.data.forEach((ix, i) => { body('st-i' + i).innerHTML = `<div class="val" id="v-i${i}"></div><div class="sub ${MX.cls(ix.chg)}">${MX.pct(ix.chg)} <span class="muted">hoy</span></div>${MX.srcTag(r, 'vía ETF ' + ix.proxy)}`; MX.countTo(document.getElementById('v-i' + i), ix.price, (v) => MX.money(v)); });
      });
      api.markets().then((r) => {
        if (!token.ok()) return;
        const sorted = r.data.filter((c) => MX.isNum(c.price_change_percentage_24h)).sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
        const fill = (id, list) => { const box = document.getElementById(id); box.innerHTML = list.map(moverRow).join('') + MX.srcTag(r); box.onclick = (e) => { const m = e.target.closest('.mover'); if (m) MX.open(coinAsset(r.data.find((c) => c.id === m.dataset.id))); }; };
        fill('gainers', sorted.slice(0, 6)); fill('losers', sorted.slice(-6).reverse());
        const heat = document.getElementById('heat'); drawHeat(heat, r.data);
        document.getElementById('heatSrc').innerHTML = MX.srcTag(r);
        clearTimeout(MX._heatT); window.onresize = () => { clearTimeout(MX._heatT); MX._heatT = setTimeout(() => { if (MX.state.view === 'panorama' && document.getElementById('heat')) drawHeat(document.getElementById('heat'), r.data); }, 200); };
      });
    },
  };
})();
