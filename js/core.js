/* Meridiano — núcleo: estado, formato, utilidades de interfaz */
(function () {
  const MX = (window.MX = {});
  const LS = 'mx_';
  MX.NA = 'no disponible';

  MX.store = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} },
    clear() { try { Object.keys(localStorage).filter(k => k.startsWith(LS)).forEach(k => localStorage.removeItem(k)); } catch (e) {} },
  };

  MX.settings = Object.assign({ finnhub: '', twelve: '', alpha: '', coingecko: '', currency: 'USD', accent: 'violet' }, MX.store.get('settings', {}));
  MX.saveSettings = () => MX.store.set('settings', MX.settings);

  MX.state = {
    asset: MX.store.get('asset', { type: 'crypto', id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' }),
    tf: MX.store.get('tf', '1D'),
    ind: Object.assign({ vol: true, ema: true, sr: true, rsi: true, bb: false, vwap: false, fib: false, cross: true, div: true, macd: false, stoch: false, atr: false, obv: false }, MX.store.get('ind', {})),
    view: 'panorama',
  };
  MX.fx = { CLP: null, source: null, ts: null };

  /* ---------- formato ---------- */
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  MX.isNum = isNum;
  MX.scale = () => (MX.settings.currency === 'CLP' && MX.fx.CLP ? MX.fx.CLP : 1);
  MX.curLabel = () => (MX.scale() !== 1 ? 'CLP' : 'USD');
  MX.decimals = (v) => { const a = Math.abs(v); if (a >= 1e6) return 0; if (a >= 1) return 2; if (a >= 0.01) return 4; if (a >= 0.0001) return 6; return 8; };
  const nf = (v, min, max) => v.toLocaleString('es-CL', { minimumFractionDigits: min, maximumFractionDigits: max });
  MX.money = (usd, opt = {}) => {
    if (!isNum(usd)) return MX.NA;
    const clp = MX.scale() !== 1, v = usd * MX.scale(), pre = clp ? 'CLP$' : 'US$';
    if (opt.compact && Math.abs(v) >= 1e6) return pre + ' ' + new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
    const d = clp && Math.abs(v) >= 100 ? 0 : MX.decimals(v);
    return pre + ' ' + nf(v, Math.min(d, 2), d);
  };
  MX.usd = (v) => (isNum(v) ? 'US$ ' + nf(v, 2, MX.decimals(v)) : MX.NA);
  MX.pct = (v, d = 2) => (isNum(v) ? (v > 0 ? '+' : '') + nf(v, d, d) + '%' : MX.NA);
  MX.num = (v, d = 2) => (isNum(v) ? nf(v, 0, d) : MX.NA);
  MX.compact = (v) => (isNum(v) ? new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 2 }).format(v) : MX.NA);
  MX.cls = (v) => (isNum(v) ? (v > 0 ? 'up' : v < 0 ? 'down' : '') : 'muted');
  MX.time = (ts) => new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  MX.date = (d) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  MX.h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MX.safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? MX.h(u) : '#');
  MX.assetKey = (a) => a.type + ':' + a.id;

  /* ---------- fragmentos de interfaz ---------- */
  MX.srcTag = (res, extra) => {
    if (!res) return '';
    const s = res.sample ? '<span class="badge sample">DATOS DE EJEMPLO</span> ' : '';
    const why = res.reason ? ' · ' + MX.h(res.reason) : '';
    if (!res.sample && !res.source) return `<span class="src">${MX.h(res.reason || 'Dato ' + MX.NA)}</span>`;
    if (res.sample) return `<span class="src">${s}No son datos reales${why}</span>`;
    return `<span class="src">Fuente: ${MX.h(res.source)}${extra ? ' · ' + MX.h(extra) : ''} · ${MX.time(res.ts)}${why}</span>`;
  };
  MX.learn = (key) => `<button class="learn" data-learn="${key}" aria-label="¿Qué es esto?" type="button">?</button>`;
  MX.sk = (n = 3) => '<span class="sk h1"></span>' + '<span class="sk l"></span>'.repeat(n);
  MX.logo = (a, img) => (img ? `<img src="${MX.safeUrl(img)}" alt="" loading="lazy">` : `<span class="ph">${MX.h((a.symbol || '?').slice(0, 3).toUpperCase())}</span>`);
  MX.badge = (s) => (s > 0.15 ? '<span class="badge up">Alcista</span>' : s < -0.15 ? '<span class="badge down">Bajista</span>' : '<span class="badge neu">Neutral</span>');

  MX.gauge = (t, id = 'g') => {
    t = Math.max(0, Math.min(1, t));
    return `<svg viewBox="0 0 200 122" class="gauge" role="img"><defs><linearGradient id="gg-${id}" x1="0" x2="1"><stop offset="0" stop-color="#ff4d6d"/><stop offset=".5" stop-color="#f5c451"/><stop offset="1" stop-color="#22e39a"/></linearGradient></defs>
      <path d="M20 105 A80 80 0 0 1 180 105" stroke="rgba(255,255,255,.07)" stroke-width="14"/>
      <path d="M20 105 A80 80 0 0 1 180 105" stroke="url(#gg-${id})" stroke-width="10"/>
      <g class="needle" data-ang="${-90 + 180 * t}" style="transform:rotate(-90deg);transform-origin:100px 105px"><path d="M100 105 L100 40" stroke="#fff" stroke-width="3"/></g>
      <circle cx="100" cy="105" r="6" fill="#fff" stroke="none"/></svg>`;
  };
  MX.animateGauges = (root) => requestAnimationFrame(() => setTimeout(() => (root || document).querySelectorAll('.needle[data-ang]').forEach((n) => (n.style.transform = `rotate(${n.dataset.ang}deg)`)), 60));

  MX.countTo = (el, to, fmt) => {
    if (!el) return;
    if (!isNum(to)) { el.textContent = MX.NA; return; }
    const from = isNum(el._v) ? el._v : to * 0.9, t0 = performance.now(), dur = 750;
    if (isNum(el._v) && el._v !== to) { el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth; el.classList.add(to > el._v ? 'flash-up' : 'flash-down'); }
    el._v = to;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1 && el._v === to) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  MX.toast = (msg, ms = 5000) => {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.getElementById('toasts').appendChild(t); setTimeout(() => t.remove(), ms);
  };

  /* ---------- watchlist y alertas ---------- */
  MX.watch = {
    list: MX.store.get('watch', []),
    has(a) { return this.list.some((x) => MX.assetKey(x) === MX.assetKey(a)); },
    toggle(a) {
      if (this.has(a)) this.list = this.list.filter((x) => MX.assetKey(x) !== MX.assetKey(a));
      else this.list.push({ type: a.type, id: a.id, symbol: a.symbol, name: a.name });
      MX.store.set('watch', this.list); return this.has(a);
    },
  };
  MX.alerts = {
    list: MX.store.get('alerts', []),
    save() { MX.store.set('alerts', this.list); },
    add(al) { al.id = Date.now() + '' + Math.floor(Math.random() * 1000); this.list.push(al); this.save(); },
    remove(id) { this.list = this.list.filter((a) => a.id !== id); this.save(); },
  };

  MX.icons = {
    panorama: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    activo: '<path d="M7 4v4M7 16v4M17 3v3M17 14v6"/><rect x="5" y="8" width="4" height="8" rx="1"/><rect x="15" y="6" width="4" height="8" rx="1"/>',
    tecnico: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-7"/>',
    escenarios: '<path d="M3 12h6l4-7h8M9 12l4 7h8M9 12h12"/>',
    noticias: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    fundamental: '<path d="M5 20V10M11 20V4M17 20v-8M22 20H2"/>',
    screener: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
    comparador: '<path d="M4 18l5-6 4 3 7-9"/><path d="M4 12l4-3 5 5 7-3" opacity=".5"/>',
    watchlist: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    comprar: '<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    riesgo: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    aprender: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
    config: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  };
  MX.views = {};
})();
