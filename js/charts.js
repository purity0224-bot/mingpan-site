/* =========================================================
 * 手刻 SVG 圖表：雷達、有向長條、三軌時間帶、九中心圖、迷你雷達、折線
 * 調色盤已通過 CVD／對比驗證（light surface #FBF7EE）
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});

  const COLORS = {
    bazi: '#B58325', west: '#3E8FC7', ziwei: '#D45A73',
    vedic: '#2E9B82', hd: '#7D6BE0', misc: '#C56A3F',
    good: '#3E9B6E', mid: '#B58325', low: '#C4506A',
    grid: 'rgba(45,38,74,.14)', label: 'rgba(45,38,74,.78)',
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- 雷達圖 ---------- */
  // series: [{name, values[], color}]；labels 對應軸
  function radar(labels, series, opts = {}) {
    const size = opts.size || 300;
    const cx = size / 2, cy = size / 2 + (opts.dy || 6);
    const R = size / 2 - (opts.pad || 52);
    const n = labels.length;
    let min = opts.min != null ? opts.min : 0;
    let max = opts.max != null ? opts.max : Math.max(...series.flatMap((s) => s.values), 1);
    if (max === min) max = min + 1;
    const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const pt = (i, v) => {
      const r = R * Math.max(0, Math.min(1, (v - min) / (max - min)));
      return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    };
    let g = '';
    // 環
    for (let ring = 1; ring <= 4; ring++) {
      const pts = labels.map((_, i) => {
        const r = (R * ring) / 4;
        return `${cx + r * Math.cos(ang(i))},${cy + r * Math.sin(ang(i))}`;
      }).join(' ');
      g += `<polygon points="${pts}" fill="none" stroke="${COLORS.grid}" stroke-width="1"/>`;
    }
    // 零環（有負值時）
    if (min < 0) {
      const zr = R * (0 - min) / (max - min);
      const pts = labels.map((_, i) => `${cx + zr * Math.cos(ang(i))},${cy + zr * Math.sin(ang(i))}`).join(' ');
      g += `<polygon points="${pts}" fill="none" stroke="rgba(45,38,74,.35)" stroke-width="1" stroke-dasharray="4 3"/>`;
    }
    // 軸與標籤
    labels.forEach((lb, i) => {
      const [x, y] = [cx + R * Math.cos(ang(i)), cy + R * Math.sin(ang(i))];
      g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1"/>`;
      const lx = cx + (R + 20) * Math.cos(ang(i)), ly = cy + (R + 20) * Math.sin(ang(i));
      const anchor = Math.abs(Math.cos(ang(i))) < 0.3 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end';
      g += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" font-size="${opts.labelSize || 12}" fill="${COLORS.label}">${esc(lb)}</text>`;
    });
    // 系列
    for (const s of series) {
      const pts = s.values.map((v, i) => pt(i, v));
      g += `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${s.color}" fill-opacity=".22" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
      pts.forEach((p, i) => {
        g += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.color}" stroke="#FFFFFF" stroke-width="1.5"><title>${esc(labels[i])}：${Math.round(s.values[i] * 10) / 10}${opts.unit || ''}</title></circle>`;
      });
      if (opts.valueLabels) {
        pts.forEach((p, i) => {
          g += `<text x="${p[0]}" y="${p[1] - 8}" text-anchor="middle" font-size="11" fill="${COLORS.label}">${Math.round(s.values[i])}${opts.unit || ''}</text>`;
        });
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(opts.title || '雷達圖')}">${g}</svg>`;
  }

  /* ---------- 水平量條組（百分比） ---------- */
  function meterGroup(items, opts = {}) {
    // items: [{label, pct, color, note}]
    let h = '<div class="meters">';
    for (const it of items) {
      h += `<div class="meter-row">
        <span class="meter-label">${esc(it.label)}</span>
        <span class="meter-track"><span class="meter-fill" style="width:${Math.min(100, it.pct).toFixed(1)}%;background:${it.color}"></span></span>
        <span class="meter-val">${it.pct.toFixed(0)}${opts.unit || '%'}</span>
      </div>`;
    }
    return h + '</div>';
  }

  /* ---------- 有向長條（正負，極性用雙色） ---------- */
  function signedBars(items, opts = {}) {
    // items: [{label, a, b?}]（a=D1, b=D9）
    const min = opts.min != null ? opts.min : -3, max = opts.max != null ? opts.max : 4;
    const span = max - min;
    let h = `<div class="sbars">`;
    for (const it of items) {
      const rows = [['a', it.a, it.aNote], ...(it.b != null ? [['b', it.b, it.bNote]] : [])];
      h += `<div class="sbar-group"><span class="sbar-label">${esc(it.label)}</span><div class="sbar-tracks">`;
      for (const [k, v, note] of rows) {
        const zeroPct = ((0 - min) / span) * 100;
        const wPct = (Math.abs(v) / span) * 100;
        const leftPct = v >= 0 ? zeroPct : zeroPct - wPct;
        const col = v >= 0 ? COLORS.good : COLORS.low;
        h += `<div class="sbar-track" title="${esc(it.label)} ${k === 'a' ? opts.aName || '' : opts.bName || ''}：${v}${note ? '（' + esc(note) + '）' : ''}">
          <span class="sbar-zero" style="left:${zeroPct}%"></span>
          <span class="sbar-fill ${k === 'b' ? 'sbar-b' : ''}" style="left:${leftPct}%;width:${wPct}%;background:${col}"></span>
          <span class="sbar-num">${v > 0 ? '+' + v : v}</span>
        </div>`;
      }
      h += '</div></div>';
    }
    h += '</div>';
    if (opts.aName) h += `<p class="chart-note">實心＝${esc(opts.aName)}${opts.bName ? '，細條＝' + esc(opts.bName) : ''}；綠＝加分、紅＝減分（極性雙色）</p>`;
    return h;
  }

  /* ---------- 三軌時間帶 ---------- */
  function timelineChart(tl, birthYear, opts = {}) {
    const yr0 = birthYear, yr1 = birthYear + 92;
    const W = opts.width || 980, rowH = 44, padL = 86, padT = 34, padB = 46;
    const H = padT + tl.tracks.length * rowH + padB;
    const X = (y) => padL + ((y - yr0) / (yr1 - yr0)) * (W - padL - 16);
    let g = '';
    // 年刻度（每10年）
    for (let y = yr0; y <= yr1; y += 10) {
      g += `<line x1="${X(y)}" y1="${padT - 8}" x2="${X(y)}" y2="${H - padB + 6}" stroke="${COLORS.grid}"/>`;
      g += `<text x="${X(y)}" y="${padT - 14}" text-anchor="middle" font-size="11" fill="${COLORS.label}">${y}</text>`;
      g += `<text x="${X(y)}" y="${H - padB + 20}" text-anchor="middle" font-size="10" fill="rgba(45,38,74,.55)">${y - yr0}歲</text>`;
    }
    // 現在
    const nowY = new Date().getFullYear() + new Date().getMonth() / 12;
    if (nowY > yr0 && nowY < yr1) {
      g += `<line x1="${X(nowY)}" y1="${padT - 4}" x2="${X(nowY)}" y2="${H - padB}" stroke="#2d264a" stroke-width="1.5" stroke-dasharray="2 3"/>
      <text x="${X(nowY)}" y="${H - padB + 34}" text-anchor="middle" font-size="11" fill="#2d264a">現在</text>`;
    }
    const toneCol = { good: COLORS.good, mid: COLORS.mid, low: COLORS.low };
    tl.tracks.forEach((t, ti) => {
      const y = padT + ti * rowH + 8;
      g += `<text x="${padL - 10}" y="${y + 15}" text-anchor="end" font-size="12" fill="${COLORS.label}">${esc(t.system)}</text>`;
      for (const s of t.spans) {
        const x1 = X(Math.max(s.from, yr0)), x2 = X(Math.min(s.to, yr1));
        if (x2 <= x1) continue;
        const toneWord = { good: '順風章節', mid: '中性章節', low: '逆風章節（宜防守）' };
        const tip = `${s.label}｜${s.from}–${s.to} 年（${s.from - yr0}–${s.to - yr0} 歲）｜${toneWord[s.tone]}｜${s.sub || ''}`;
        g += `<rect class="tl-span" data-tip="${esc(tip)}" x="${x1 + 1}" y="${y}" width="${x2 - x1 - 2}" height="22" rx="4" fill="${toneCol[s.tone]}" fill-opacity=".8"><title>${esc(tip)}</title></rect>`;
        if (x2 - x1 > 46) g += `<text x="${(x1 + x2) / 2}" y="${y + 15}" text-anchor="middle" font-size="10.5" fill="#0e0c18" font-weight="600" pointer-events="none">${esc(s.label)}</text>`;
      }
    });
    let html = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="三系統長波時間軸">${g}</svg>`;
    html += `<div class="tl-detail">☝ 點任一色塊，這裡會顯示該段章節的說明。</div>`;
    html += `<p class="chart-note">怎麼看：三條橫列＝三套系統各自把你的人生切成約十年一段的「章節」。色帶：<span class="lg" style="background:${COLORS.good}"></span>順風章節　<span class="lg" style="background:${COLORS.mid}"></span>中性　<span class="lg" style="background:${COLORS.low}"></span>逆風章節（宜防守）。虛線＝現在的位置。</p>`;
    return html;
  }

  /* ---------- 人類圖九中心 ---------- */
  function bodygraph(centerStates, channels) {
    // 簡化幾何布局（塔式）
    const pos = [
      [150, 40],   // 頭腦
      [150, 105],  // Ajna
      [150, 175],  // 喉嚨
      [150, 250],  // G
      [88, 305],   // 意志
      [150, 385],  // 薦骨
      [58, 385],   // 直覺
      [242, 385],  // 情緒
      [150, 460],  // 根部
    ];
    const shape = (i, cx, cy, st) => {
      const fill = st.state === 'defined' ? '#7D6BE0' : st.state === 'gated' ? 'rgba(125,107,224,.16)' : 'transparent';
      const stroke = st.state === 'open' ? 'rgba(45,38,74,.3)' : '#7D6BE0';
      const dash = st.state === 'gated' ? 'stroke-dasharray="4 3"' : '';
      const s = 30;
      let el;
      if (i === 0) el = `<polygon points="${cx},${cy - s} ${cx + s},${cy + s * 0.7} ${cx - s},${cy + s * 0.7}"`;
      else if (i === 1) el = `<polygon points="${cx},${cy + s} ${cx + s},${cy - s * 0.7} ${cx - s},${cy - s * 0.7}"`;
      else if (i === 3) el = `<rect x="${cx - s}" y="${cy - s}" width="${s * 2}" height="${s * 2}" rx="6" transform="rotate(45 ${cx} ${cy})"`;
      else if (i === 4 || i === 6 || i === 7) el = `<polygon points="${cx - s},${cy - s * 0.8} ${cx + s},${cy} ${cx - s},${cy + s * 0.8}" transform="rotate(${i === 4 ? 90 : i === 6 ? 0 : 180} ${cx} ${cy})"`;
      else el = `<rect x="${cx - s}" y="${cy - s * 0.75}" width="${s * 2}" height="${s * 1.5}" rx="7"`;
      return `${el} fill="${fill}" stroke="${stroke}" stroke-width="2" ${dash}><title>${esc(st.name)}：${st.state === 'defined' ? '有定義' : st.state === 'gated' ? '有閘門未定義' : '全開放'}（閘門 ${st.gates.join('、') || '無'}）</title>${i === 3 ? '</rect>' : el.startsWith('<rect') ? '</rect>' : '</polygon>'}`;
    };
    let g = '';
    // 已定義通道連線（僅畫中心對中心示意）
    const drawn = new Set();
    for (const ch of channels) {
      const key = ch.centers.slice().sort().join('-');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const [a, b] = ch.centers;
      g += `<line x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}" stroke="#7D6BE0" stroke-width="5" stroke-opacity=".5" stroke-linecap="round"><title>${esc(ch.a + '-' + ch.b + ' ' + ch.name)}</title></line>`;
    }
    centerStates.forEach((st, i) => { g += shape(i, pos[i][0], pos[i][1], st); });
    centerStates.forEach((st, i) => {
      const label = st.name.split('（')[0];
      const off = i === 4 ? -52 : i === 6 ? -48 : i === 7 ? 48 : 0;
      g += `<text x="${pos[i][0] + off}" y="${pos[i][1] + (i === 4 || i === 6 || i === 7 ? -32 : 46)}" text-anchor="middle" font-size="11.5" fill="${COLORS.label}">${esc(label)}<title>${esc(st.name)}</title></text>`;
      if (st.gates.length) g += `<text x="${pos[i][0] + off}" y="${pos[i][1] + (i === 4 || i === 6 || i === 7 ? -32 : 46) + 13}" text-anchor="middle" font-size="9.5" fill="rgba(45,38,74,.55)">${st.gates.join(' ')}</text>`;
    });
    let html = `<svg viewBox="0 0 300 520" role="img" aria-label="人類圖九中心">${g}</svg>`;
    html += `<p class="chart-note"><span class="lg" style="background:#7D6BE0"></span>實心＝有定義　<span class="lg" style="background:rgba(125,107,224,.3);border:1px dashed #7D6BE0"></span>虛框＝有閘門未成通道　<span class="lg" style="border:1px solid rgba(45,38,74,.4)"></span>空＝全開放（容易接收並放大他人的能量）</p>`;
    return html;
  }

  /* ---------- 迷你雷達（時期演化） ---------- */
  function miniRadar(labels, values, color, title, highlight) {
    return `<figure class="mini-radar${highlight ? ' current' : ''}"><div>${radar(labels, [{ values, color }], { size: 168, pad: 34, labelSize: 10.5 })}</div><figcaption>${esc(title)}</figcaption></figure>`;
  }

  /* ---------- 折線（用神接近度曲線） ---------- */
  function lineChart(points, opts = {}) {
    // points: [{x label, y}]
    const W = opts.width || 640, H = 200, padL = 46, padR = 14, padT = 18, padB = 40;
    const ys = points.map((p) => p.y);
    const ymin = Math.floor(Math.min(...ys) / 10) * 10, ymax = Math.ceil(Math.max(...ys) / 10) * 10 || 10;
    const X = (i) => padL + (i / (points.length - 1)) * (W - padL - padR);
    const Y = (v) => padT + (1 - (v - ymin) / (ymax - ymin || 1)) * (H - padT - padB);
    let g = '';
    for (let v = ymin; v <= ymax; v += 10) {
      g += `<line x1="${padL}" y1="${Y(v)}" x2="${W - padR}" y2="${Y(v)}" stroke="${COLORS.grid}"/><text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" fill="${COLORS.label}">${v}%</text>`;
    }
    g += `<polyline points="${points.map((p, i) => X(i) + ',' + Y(p.y)).join(' ')}" fill="none" stroke="${COLORS.bazi}" stroke-width="2.5" stroke-linejoin="round"/>`;
    points.forEach((p, i) => {
      g += `<circle cx="${X(i)}" cy="${Y(p.y)}" r="4" fill="${COLORS.bazi}" stroke="#FFFFFF" stroke-width="1.5"><title>${esc(p.x)}：喜用五行佔比 ${p.y.toFixed(0)}%</title></circle>`;
      g += `<text x="${X(i)}" y="${H - padB + 16}" text-anchor="middle" font-size="10" fill="${COLORS.label}">${esc(p.x)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || '曲線')}">${g}</svg>`;
  }

  /* ---------- 數字頻次長條 ---------- */
  function freqBars(freq, mainNum) {
    let h = '<div class="freq-bars">';
    const max = Math.max(...Object.values(freq), 1);
    for (let i = 1; i <= 9; i++) {
      const v = freq[i] || 0;
      h += `<div class="freq-col" title="數字 ${i}：出現 ${v} 次${i === mainNum ? '（主命數）' : ''}">
        <div class="freq-bar-wrap"><div class="freq-bar" style="height:${(v / max) * 100}%;background:${i === mainNum ? '#C56A3F' : 'rgba(197,106,63,.45)'}"></div></div>
        <span class="freq-num${i === mainNum ? ' is-main' : ''}">${i}</span><span class="freq-count">${v || '·'}</span>
      </div>`;
    }
    return h + '</div><p class="chart-note">出生年月日各位數出現頻次（深色＝主命數）；「·」＝缺數</p>';
  }

  /* =========================================================
   * 盤面圖卡四張（與 LINE 版同視覺：深紫夜空卡）— viewBox 響應式 SVG
   * ========================================================= */
  const CW = 1040, CH2 = 585;
  const CARD_BG = `<defs><linearGradient id="cardbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3D3470"/><stop offset="1" stop-color="#211C42"/></linearGradient></defs>
    <rect width="${CW}" height="${CH2}" rx="18" fill="url(#cardbg)"/>
    <circle cx="80" cy="60" r="1.6" fill="#fff" opacity=".55"/><circle cx="920" cy="80" r="2" fill="#fff" opacity=".4"/>
    <circle cx="540" cy="40" r="1.4" fill="#fff" opacity=".45"/><circle cx="180" cy="520" r="1.6" fill="#fff" opacity=".35"/>
    <circle cx="980" cy="500" r="1.5" fill="#fff" opacity=".45"/><circle cx="700" cy="550" r="1.3" fill="#fff" opacity=".3"/>`;
  const CARD_BRAND = `<text x="${CW - 30}" y="${CH2 - 24}" font-size="22" fill="rgba(255,255,255,.5)" text-anchor="end" font-family="sans-serif">問命織盤所</text>`;
  const cardTitle = (t, sub) => `<text x="50" y="72" font-size="44" font-weight="700" fill="#fff" font-family="sans-serif" letter-spacing="4">${t}</text>
    <text x="50" y="112" font-size="24" fill="#C9A44C" font-family="sans-serif" letter-spacing="2">${esc(sub)}</text>
    <rect x="50" y="130" width="${CW - 100}" height="2" fill="rgba(201,164,76,.5)"/>`;
  const cardWrap = (inner, label) => `<svg viewBox="0 0 ${CW} ${CH2}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">${inner}</svg>`;
  const CARD_ELEM_COLOR = { '木': '#6FBF73', '火': '#E06B5B', '土': '#B08850', '金': '#D8B94E', '水': '#5B9BD8' };

  /* 五行能量圖 */
  function wuxingCard(d) {
    const pct = d.bazi.elemPct, fav = d.bazi.favorable;
    const elems = ['木', '火', '土', '金', '水'];
    const max = Math.max(...elems.map((e) => pct[e] || 0), 1);
    const barW = 150, gap = 40, x0 = (CW - (barW * 5 + gap * 4)) / 2, baseY = 470, maxH = 260;
    let bars = '';
    elems.forEach((e, i) => {
      const v = pct[e] || 0;
      const h = Math.max(10, (v / max) * maxH);
      const x = x0 + i * (barW + gap);
      const isFav = fav.includes(e);
      bars += `<rect x="${x}" y="${baseY - h}" width="${barW}" height="${h}" rx="10" fill="${CARD_ELEM_COLOR[e]}" opacity="${isFav ? 1 : 0.55}"/>
${isFav ? `<rect x="${x - 4}" y="${baseY - h - 4}" width="${barW + 8}" height="${h + 8}" rx="12" fill="none" stroke="#C9A44C" stroke-width="3"/>` : ''}
<text x="${x + barW / 2}" y="${baseY - h - 16}" font-size="30" font-weight="700" fill="#fff" text-anchor="middle" font-family="sans-serif">${v.toFixed(0)}%</text>
<text x="${x + barW / 2}" y="${baseY + 46}" font-size="36" font-weight="700" fill="${CARD_ELEM_COLOR[e]}" text-anchor="middle" font-family="sans-serif">${e}${isFav ? ' ★' : ''}</text>`;
    });
    const note = `<text x="50" y="${CH2 - 24}" font-size="22" fill="rgba(255,255,255,.65)" font-family="sans-serif">★ 喜用神：${fav.join('、')}（你的能量補給來源）</text>`;
    return cardWrap(`${CARD_BG}${cardTitle('五行能量圖', `日主${d.bazi.dayMaster.stem}${d.bazi.dayMaster.elem}・${d.bazi.strength}`)}${bars}${note}${CARD_BRAND}`, '五行能量圖');
  }

  /* 十年運勢時間波 */
  const CARD_TONE = { good: ['#5CB86B', '進攻'], mid: ['#C9A44C', '平持'], low: ['#DB6A5F', '防守'] };
  function annualCard(d) {
    const at = ML.report.annualTable(d, new Date().getFullYear(), 10);
    const n = at.rows.length, bw = (CW - 100) / n;
    let seg = '';
    at.rows.forEach((r, i) => {
      const [color, label] = CARD_TONE[r.tone] || CARD_TONE.mid;
      const x = 50 + i * bw;
      const hgt = r.tone === 'good' ? 200 : r.tone === 'low' ? 110 : 150;
      const y = 400 - hgt;
      seg += `<rect x="${x + 5}" y="${y}" width="${bw - 10}" height="${hgt}" rx="10" fill="${color}" opacity="${r.tone === 'mid' ? 0.75 : 0.95}"/>
<text x="${x + bw / 2}" y="${y - 12}" font-size="22" fill="${color}" text-anchor="middle" font-family="sans-serif" font-weight="700">${label}</text>
<text x="${x + bw / 2}" y="435" font-size="26" font-weight="700" fill="#fff" text-anchor="middle" font-family="sans-serif">${r.year}</text>
<text x="${x + bw / 2}" y="468" font-size="22" fill="rgba(255,255,255,.75)" text-anchor="middle" font-family="sans-serif">${r.gz}</text>
<text x="${x + bw / 2}" y="500" font-size="20" fill="rgba(255,255,255,.55)" text-anchor="middle" font-family="sans-serif">${r.god}</text>`;
    });
    const legend = [['#5CB86B', '進攻年：放手推進', 50], ['#C9A44C', '平持年：穩中經營', 330], ['#DB6A5F', '防守年：保守蹲點', 610]]
      .map(([c, t, x]) => `<circle cx="${x + 10}" cy="${CH2 - 31}" r="10" fill="${c}"/><text x="${x + 30}" y="${CH2 - 24}" font-size="22" fill="rgba(255,255,255,.65)" font-family="sans-serif">${t}</text>`).join('');
    return cardWrap(`${CARD_BG}${cardTitle('十年運勢時間波', '流年紅綠燈・年界立春')}${seg}${legend}${CARD_BRAND}`, '十年運勢時間波');
  }

  /* 八字四柱命式 */
  function baziCard(d) {
    const B = d.bazi, C = ML.core;
    const cols = [
      { key: 'hour', label: '時柱' }, { key: 'day', label: '日柱' },
      { key: 'month', label: '月柱' }, { key: 'year', label: '年柱' },
    ]; // 傳統右→左：年在最右
    const colW = 200, gap = 30, x0 = (CW - (colW * 4 + gap * 3)) / 2;
    let body = '';
    cols.forEach((c, i) => {
      const p = B.pillars[c.key];
      const x = x0 + i * (colW + gap);
      const isDay = c.key === 'day';
      const tg = isDay ? '日主' : ML.bazi.tenGod(B.pillars.day.stemIdx, p.stemIdx);
      const stemColor = CARD_ELEM_COLOR[C.STEM_ELEM[p.stemIdx]] || '#fff';
      const branchColor = CARD_ELEM_COLOR[C.BRANCH_ELEM[p.branchIdx]] || '#fff';
      const hidden = (C.HIDDEN_STEMS[p.branch] || []).map(([hs]) => {
        const hsIdx = C.STEMS.indexOf(hs);
        return `${hs}${hsIdx >= 0 && !isDay ? '・' + ML.bazi.tenGod(B.pillars.day.stemIdx, hsIdx) : ''}`;
      }).join('　');
      body += `<rect x="${x}" y="150" width="${colW}" height="360" rx="12" fill="rgba(255,255,255,${isDay ? '.10' : '.04'})" stroke="${isDay ? '#C9A44C' : 'rgba(255,255,255,.22)'}" stroke-width="${isDay ? 3 : 1.5}"/>
<text x="${x + colW / 2}" y="190" font-size="26" fill="rgba(255,255,255,.7)" text-anchor="middle" font-family="sans-serif">${c.label}</text>
<text x="${x + colW / 2}" y="228" font-size="22" fill="${isDay ? '#C9A44C' : 'rgba(255,255,255,.85)'}" text-anchor="middle" font-family="sans-serif">${tg}</text>
<text x="${x + colW / 2}" y="308" font-size="64" font-weight="700" fill="${stemColor}" text-anchor="middle" font-family="sans-serif">${p.stem}</text>
<text x="${x + colW / 2}" y="398" font-size="64" font-weight="700" fill="${branchColor}" text-anchor="middle" font-family="sans-serif">${p.branch}</text>
<text x="${x + colW / 2}" y="448" font-size="19" fill="rgba(255,255,255,.65)" text-anchor="middle" font-family="sans-serif">${hidden}</text>
<text x="${x + colW / 2}" y="488" font-size="18" fill="rgba(255,255,255,.45)" text-anchor="middle" font-family="sans-serif">${p.nayinName}</text>`;
    });
    const legend = `<text x="50" y="${CH2 - 24}" font-size="22" fill="rgba(255,255,255,.65)" font-family="sans-serif">喜用神：${B.favorable.join('、')}　｜　字色＝五行（綠＝木、紅＝火、棕＝土、金＝金、藍＝水）</text>`;
    return cardWrap(`${CARD_BG}${cardTitle('八字四柱命式', `日主${B.dayMaster.stem}${B.dayMaster.elem}・${B.strength}・${B.pattern.name}`)}${body}${legend}${CARD_BRAND}`, '八字四柱命式');
  }

  /* 人類圖九中心 */
  const CARD_HD_CENTERS = [
    { key: '頭腦', shape: 'triUp', x: 300, y: 175 },
    { key: '邏輯', shape: 'triDown', x: 300, y: 245 },
    { key: '喉嚨', shape: 'square', x: 300, y: 318 },
    { key: 'G', shape: 'diamond', x: 300, y: 398 },
    { key: '意志', shape: 'triUp', x: 400, y: 420, small: true },
    { key: '情緒', shape: 'triDown', x: 445, y: 505 },
    { key: '薦骨', shape: 'square', x: 300, y: 490 },
    { key: '直覺', shape: 'triDown', x: 155, y: 505 },
    { key: '根部', shape: 'square', x: 300, y: 555, half: true },
  ];
  function cardShapePath(c) {
    const s = c.small ? 26 : 34;
    const { x, y } = c;
    if (c.shape === 'triUp') return `M${x},${y - s} L${x + s},${y + s * 0.8} L${x - s},${y + s * 0.8} Z`;
    if (c.shape === 'triDown') return `M${x},${y + s} L${x + s},${y - s * 0.8} L${x - s},${y - s * 0.8} Z`;
    if (c.shape === 'diamond') return `M${x},${y - s} L${x + s},${y} L${x},${y + s} L${x - s},${y} Z`;
    const h = c.half ? s * 0.7 : s;
    return `M${x - s},${y - h} L${x + s},${y - h} L${x + s},${y + h} L${x - s},${y + h} Z`;
  }
  function hdCard(d) {
    const defined = d.hd.definedCenters.map((s) => s.replace(/（.*/, ''));
    const isDef = (k) => defined.some((n) => n.startsWith(k) || k.startsWith(n));
    let shapes = '';
    for (const c of CARD_HD_CENTERS) {
      const on = isDef(c.key);
      shapes += `<path d="${cardShapePath(c)}" fill="${on ? '#C9A44C' : 'none'}" stroke="${on ? '#E8CE85' : 'rgba(255,255,255,.5)'}" stroke-width="2.5"/>
<text x="${c.x + (c.key === '意志' ? 52 : c.key === '情緒' ? 62 : c.key === '直覺' ? -62 : 68)}" y="${c.y + 8}" font-size="24" fill="${on ? '#E8CE85' : 'rgba(255,255,255,.55)'}" font-family="sans-serif" text-anchor="${c.key === '直覺' ? 'end' : 'start'}">${c.key}</text>`;
    }
    const info = `
<text x="620" y="220" font-size="30" fill="rgba(255,255,255,.7)" font-family="sans-serif">類型</text>
<text x="620" y="268" font-size="40" font-weight="700" fill="#fff" font-family="sans-serif">${esc(d.hd.type.split(' ')[0])}</text>
<text x="620" y="330" font-size="30" fill="rgba(255,255,255,.7)" font-family="sans-serif">內在權威</text>
<text x="620" y="378" font-size="36" font-weight="700" fill="#fff" font-family="sans-serif">${esc(d.hd.authority.split('（')[0])}</text>
<text x="620" y="440" font-size="30" fill="rgba(255,255,255,.7)" font-family="sans-serif">人生角色</text>
<text x="620" y="488" font-size="36" font-weight="700" fill="#fff" font-family="sans-serif">${esc(d.hd.profile)} ${esc(d.hd.profileName || '')}</text>
<text x="620" y="540" font-size="24" fill="#C9A44C" font-family="sans-serif">金色＝有定義（穩定運作的能量）</text>`;
    return cardWrap(`${CARD_BG}${cardTitle('人類圖能量中心', `${d.hd.definition}・通道 ${d.hd.channels.length} 條`)}${shapes}${info}${CARD_BRAND}`, '人類圖能量中心');
  }

  ML.charts = { COLORS, radar, meterGroup, signedBars, timelineChart, bodygraph, miniRadar, lineChart, freqBars, esc, wuxingCard, annualCard, baziCard, hdCard };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
