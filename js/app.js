/* =========================================================
 * 應用層：表單、渲染、互動（分頁、假說校準、匯出、存檔、分享）
 * ========================================================= */
(function () {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const CH = ML.charts;
  const esc = CH.esc;

  const CITIES = {
    // 台灣（依北到南、本島至離島）
    '基隆': [25.13, 121.74, 8], '台北': [25.04, 121.56, 8], '新北': [25.01, 121.46, 8],
    '桃園': [24.99, 121.30, 8], '新竹': [24.80, 120.97, 8], '苗栗': [24.56, 120.82, 8],
    '台中': [24.15, 120.67, 8], '彰化': [24.07, 120.54, 8], '南投': [23.91, 120.69, 8],
    '雲林': [23.71, 120.54, 8], '嘉義': [23.48, 120.45, 8], '台南': [22.99, 120.21, 8],
    '高雄': [22.63, 120.30, 8], '屏東': [22.68, 120.49, 8], '宜蘭': [24.76, 121.75, 8],
    '花蓮': [23.98, 121.60, 8], '台東': [22.76, 121.14, 8], '澎湖': [23.57, 119.58, 8],
    '金門': [24.43, 118.32, 8], '馬祖': [26.16, 119.95, 8],
    // 港澳中國
    '香港': [22.32, 114.17, 8], '澳門': [22.20, 113.55, 8], '上海': [31.23, 121.47, 8],
    '北京': [39.90, 116.40, 8],
    // 亞洲其他
    '新加坡': [1.35, 103.82, 8], '吉隆坡': [3.14, 101.69, 8], '東京': [35.68, 139.69, 9],
    '首爾': [37.57, 126.98, 9], '曼谷': [13.76, 100.50, 7],
    // 歐美澳
    '雪梨': [-33.87, 151.21, 10], '倫敦': [51.51, -0.13, 0], '巴黎': [48.86, 2.35, 1],
    '紐約': [40.71, -74.01, -5], '洛杉磯': [34.05, -118.24, -8], '舊金山': [37.77, -122.42, -8],
    '溫哥華': [49.28, -123.12, -8],
  };
  const SYS_CHIP = { '八字': 'sys-bazi', '西占': 'sys-west', '紫微': 'sys-ziwei', '印占': 'sys-vedic', '人類圖': 'sys-hd', '靈數': 'sys-misc' };
  const sysChips = (arr) => arr.map((s) => `<span class="chip ${SYS_CHIP[s] || ''}">${esc(s)}</span>`).join(' ');

  let cur = null; // 目前的分析資料
  const LS_KEY = 'mingli-profiles-v1';
  const SHARE_HASH_MAX = 4096;

  const pad2 = (n) => String(n).padStart(2, '0');
  const formatTime = (mins) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
  function timeToMinutes(value) {
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    return h >= 0 && h < 24 && min >= 0 && min < 60 ? h * 60 + min : null;
  }
  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
  function safeRemove(key) { try { localStorage.removeItem(key); } catch (e) { /* 瀏覽器拒絕儲存時靜默略過 */ } }

  /* ---------- 表單 ---------- */
  function revealGeo() {
    document.querySelectorAll('.geo-field').forEach((f) => f.classList.remove('hidden'));
  }
  function initForm() {
    const sel = $('#city');
    for (const c of Object.keys(CITIES)) sel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
    sel.insertAdjacentHTML('beforeend', '<option value="custom">其他（自行輸入經緯度）</option>');
    sel.addEventListener('change', () => {
      const c = CITIES[sel.value];
      if (c) { $('#lat').value = c[0]; $('#lon').value = c[1]; $('#tz').value = c[2]; }
      if (sel.value) revealGeo();
    });
    document.querySelectorAll('input[name=time-precision]').forEach((input) => input.addEventListener('change', () => setTimePrecision(input.value)));
    setTimePrecision('exact');
    $('#run').addEventListener('click', run);
    $('#save-profile').addEventListener('click', saveProfile);
    $('#share-link').addEventListener('click', openShareDialog);
    $('#share-site-only').addEventListener('click', () => copyShareLink(siteUrl(), '已複製網站連結'));
    $('#share-with-data').addEventListener('click', shareWithBirthData);
    $('#clear-local-data').addEventListener('click', clearLocalData);
    $('#download-report').addEventListener('click', () => {
      if (!cur) return alert('請先按「織盤」產生報告，再下載單檔。');
      if (confirm('下載的單檔報告會包含盤面與可能的姓名、出生資料。確定要儲存在這台裝置嗎？')) downloadStandalone(cur);
    });
    renderProfiles();
    initAnalytics();
    // URL 分享參數
    try {
      if (location.hash.length > 2 && location.hash.length <= SHARE_HASH_MAX) {
        const inp = parseSharedInput(location.hash.slice(1));
        if (inp) {
          fillForm(inp);
          // 讀取後立即從網址列移除，避免再次複製、截圖或留在目前歷史紀錄中。
          history.replaceState(null, '', location.pathname + location.search);
          setTimeout(run, 350);
        }
      }
    } catch (e) { /* 無效分享參數，忽略 */ }
  }

  function setTimePrecision(mode) {
    const range = mode === 'range';
    $('#time-range-panel').classList.toggle('hidden', !range);
    $('#precise-time-field').classList.toggle('hidden', range);
    $('#bhh').disabled = range; $('#bmm').disabled = range;
  }

  function readForm() {
    const dt = $('#bdate').value;
    const timePrecision = $('input[name=time-precision]:checked').value;
    let hh, mm, timeRange = null;
    if (timePrecision === 'range') {
      const start = timeToMinutes($('#time-start').value), end = timeToMinutes($('#time-end').value);
      if (start === null || end === null || start >= end) return null;
      const midpoint = Math.floor((start + end) / 2);
      hh = Math.floor(midpoint / 60); mm = midpoint % 60;
      timeRange = { start, end };
    } else {
      hh = parseInt($('#bhh').value, 10); mm = parseInt($('#bmm').value, 10);
      if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    }
    if (!dt) return null;
    const [y, m, d] = dt.split('-').map(Number);
    return {
      y, m, d, hh, mm,
      tz: parseFloat($('#tz').value),
      lat: parseFloat($('#lat').value), lon: parseFloat($('#lon').value),
      sex: $('input[name=sex]:checked').value,
      useTrueSolar: true,   // 預設：八字時柱用真太陽時
      dayBoundary: '23',    // 預設：日界 23:00（夜子時起算翌日）
      name: $('#pname').value.trim(),
      timePrecision,
      timeRange,
    };
  }
  function fillForm(inp) {
    $('#bdate').value = `${inp.y}-${String(inp.m).padStart(2, '0')}-${String(inp.d).padStart(2, '0')}`;
    const timePrecision = inp.timePrecision === 'range' && inp.timeRange ? 'range' : 'exact';
    document.querySelector(`input[name=time-precision][value=${timePrecision}]`).checked = true;
    setTimePrecision(timePrecision);
    if (timePrecision === 'range') {
      $('#time-start').value = formatTime(inp.timeRange.start);
      $('#time-end').value = formatTime(inp.timeRange.end);
    } else { $('#bhh').value = inp.hh; $('#bmm').value = inp.mm; }
    $('#tz').value = inp.tz; $('#lat').value = inp.lat; $('#lon').value = inp.lon;
    document.querySelector(`input[name=sex][value=${inp.sex}]`).checked = true;
    $('#pname').value = inp.name || '';
    // 分享連結／存檔載入：經緯度已帶入，直接視為「自訂」並顯示欄位
    $('#city').value = 'custom';
    revealGeo();
  }

  /* ---------- 存檔／分享 ---------- */
  function profiles() { try { return JSON.parse(safeGet(LS_KEY) || '[]'); } catch (e) { return []; } }
  function saveProfile() {
    const inp = readForm();
    if (!inp) return alert('請完整填寫出生日期，並填入正確時間或同一天內的時間區間');
    const list = profiles();
    const time = inp.timePrecision === 'range' ? `${formatTime(inp.timeRange.start)}–${formatTime(inp.timeRange.end)}` : `${inp.hh}:${pad2(inp.mm)}`;
    const label = inp.name || `${inp.y}/${inp.m}/${inp.d} ${time}`;
    list.unshift({ label, inp });
    if (!safeSet(LS_KEY, JSON.stringify(list.slice(0, 12)))) return alert('瀏覽器目前不允許本機儲存，資料不會被保存。');
    renderProfiles();
  }
  function renderProfiles() {
    const list = profiles();
    const box = $('#profiles');
    box.innerHTML = list.length ? '' : '<span class="form-note">尚無存檔（僅存於此瀏覽器）</span>';
    list.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'ghost'; b.textContent = p.label;
      b.addEventListener('click', () => { fillForm(p.inp); run(); });
      const x = document.createElement('button');
      x.className = 'ghost'; x.textContent = '✕'; x.setAttribute('aria-label', '刪除 ' + p.label);
      x.addEventListener('click', () => { const l = profiles(); l.splice(i, 1); safeSet(LS_KEY, JSON.stringify(l)); renderProfiles(); });
      box.append(b, x);
    });
  }

  function siteUrl() { return location.href.split('#')[0]; }
  function openShareDialog() {
    const dialog = $('#share-dialog');
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeShareDialog() {
    const dialog = $('#share-dialog');
    if (dialog.close) dialog.close();
    else dialog.removeAttribute('open');
  }
  function copyShareLink(url, message) {
    const status = $('#share-status');
    const done = () => { status.textContent = message; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(() => { prompt('複製此連結', url); done(); });
    else { prompt('複製此連結', url); done(); }
  }
  function shareWithBirthData() {
    const inp = readForm();
    if (!inp) { closeShareDialog(); return alert('請完整填寫出生資料後，再分享完整盤面。'); }
    const hash = btoa(unescape(encodeURIComponent(JSON.stringify(inp))));
    copyShareLink(`${siteUrl()}#${hash}`, '已複製完整盤面連結。請只傳給信任的對象。');
  }
  function flash(btn, msg) { const t = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = t; }, 1600); }

  function parseSharedInput(hash) {
    const raw = JSON.parse(decodeURIComponent(escape(atob(hash))));
    if (!raw || typeof raw !== 'object') return null;
    const y = Number(raw.y), m = Number(raw.m), d = Number(raw.d);
    const tz = Number(raw.tz), lat = Number(raw.lat), lon = Number(raw.lon);
    const sex = raw.sex === 'female' ? 'female' : raw.sex === 'male' ? 'male' : null;
    if (![y, m, d, tz, lat, lon].every(Number.isFinite) || !sex || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31 || tz < -14 || tz > 14 || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    const timePrecision = raw.timePrecision === 'range' ? 'range' : 'exact';
    let hh = Number(raw.hh), mm = Number(raw.mm), timeRange = null;
    if (timePrecision === 'range') {
      const start = Number(raw.timeRange && raw.timeRange.start), end = Number(raw.timeRange && raw.timeRange.end);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 1439 || start >= end) return null;
      timeRange = { start, end }; hh = Math.floor((start + end) / 120); mm = Math.floor((start + end) / 2) % 60;
    }
    if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { y, m, d, hh, mm, tz, lat, lon, sex, useTrueSolar: true, dayBoundary: '23', name: typeof raw.name === 'string' ? raw.name.slice(0, 80) : '', timePrecision, timeRange };
  }

  function clearLocalData() {
    if (!confirm('要清除這台裝置上已存的人物資料嗎？目前顯示的報告不會被刪除。')) return;
    safeRemove(LS_KEY);
    renderProfiles();
    flash($('#clear-local-data'), '已清除本機資料');
  }

  function initAnalytics() {
    loadAnalytics();
  }
  function loadAnalytics() {
    if (document.getElementById('goatcounter-script')) return;
    const script = document.createElement('script');
    script.id = 'goatcounter-script'; script.async = true; script.src = 'https://gc.zgo.at/count.js';
    script.dataset.goatcounter = 'https://marss.goatcounter.com/count';
    document.head.appendChild(script);
  }

  /* ---------- 主流程 ---------- */
  function run() {
    if (!$('#city').value) { alert('請先選擇出生區域——找不到你的城市就選「其他」，再輸入經緯度'); return; }
    const inp = readForm();
    if (!inp || isNaN(inp.tz) || isNaN(inp.lat) || isNaN(inp.lon)) { alert('請完整填寫出生日期、時間（或同一天內的時間區間）、時區與地點'); return; }
    const btn = $('#run');
    btn.disabled = true;
    const report = $('#report');
    report.setAttribute('aria-busy', 'true');
    const loadingLabel = inp.timePrecision === 'range'
      ? '正在以天文曆算排盤，並掃描出生時間區間的關鍵變動……'
      : '正在以天文曆算精確排盤（節氣、朔望、行星、設計端回推）……';
    report.innerHTML = `<div class="loading-veil" role="status"><span class="orb" aria-hidden="true"></span>${loadingLabel}</div>`;
    report.classList.remove('hidden');
    setTimeout(() => {
      try {
        cur = ML.report.buildAll(inp);
        if (inp.timePrecision === 'range') cur.timeUncertainty = analyzeTimeRange(inp);
        render(cur);
      } catch (e) {
        report.innerHTML = `<section class="panel"><h2>排盤失敗</h2><p>${esc(e.message)}</p><p class="form-note">請確認輸入資料（年份建議 1900–2100）。</p></section>`;
        console.error(e);
      }
      report.setAttribute('aria-busy', 'false');
      btn.disabled = false;
      report.scrollIntoView({ behavior: 'smooth', block: 'start' });
      report.focus({ preventScroll: true });
    }, 60);
  }

  /* ---------- 渲染 ---------- */
  function render(d) {
    const { input } = d;
    const html = [
      renderTimeUncertainty(d),
      renderNav(),
      renderActionManual(d),
      renderTimeline(d),
      renderCTA(d),
      renderEpistemic(),
    ].join('');
    $('#report').innerHTML = html;
    // 排盤完成後顯示懸浮 LINE 導流按鈕
    const fab = $('#line-fab');
    if (fab) fab.classList.remove('hidden');
    // 時間層色塊：點擊顯示說明（iOS 無 hover，長按會觸發文字選取，改用點擊）
    document.querySelectorAll('.tl-span').forEach((r) => r.addEventListener('click', () => {
      const box = r.closest('figure').querySelector('.tl-detail');
      if (box) box.textContent = r.dataset.tip;
    }));
    // AI 提示詞一鍵複製
    const aiBtn = $('#copy-ai-btn');
    if (aiBtn) aiBtn.addEventListener('click', () => {
      const ta = $('#ai-prompt-text');
      const done = () => { $('#ai-copy-status').textContent = '已複製！貼到 AI 對話框即可開問'; setTimeout(() => { $('#ai-copy-status').textContent = ''; }, 3000); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(done).catch(() => { ta.select(); document.execCommand('copy'); done(); });
      } else { ta.select(); document.execCommand('copy'); done(); }
    });
    // 出生時間敏感度：顯示在輸入表單下方（緊貼資料來源，改時間前先看這裡）
    const sensBox = $('#sens-inline');
    if (sensBox) { sensBox.innerHTML = renderSensitivity(d); sensBox.classList.remove('hidden'); }
    bindTabs();
    // 導覽點到收合章節時自動展開
    document.querySelectorAll('nav.toc a').forEach((a) => a.addEventListener('click', () => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t && t.tagName === 'DETAILS') t.open = true;
    }));
  }

  function analyzeTimeRange(input) {
    const { start, end } = input.timeRange;
    const interval = 5;
    const minutes = [];
    for (let minute = start; minute <= end; minute += interval) minutes.push(minute);
    if (minutes[minutes.length - 1] !== end) minutes.push(end);
    const samples = minutes.map((minute) => {
      const sampleInput = { ...input, hh: Math.floor(minute / 60), mm: minute % 60 };
      const bazi = ML.bazi.compute(sampleInput);
      const west = ML.west.compute(sampleInput);
      const hd = ML.hd.compute(sampleInput);
      const ziwei = ML.ziwei.compute(sampleInput);
      return {
        minute,
        values: {
          '八字時柱': bazi.pillars.hour.name,
          '紫微命宮': ziwei.mingBranch,
          '紫微身宮': ziwei.shenBranch,
          '西占上升星座': west.asc.sign,
          '西占天頂星座': west.mc.sign,
          '人類圖類型': hd.type,
          '人類圖權威': hd.authority,
          '人類圖人生角色': hd.profile,
        },
      };
    });
    const labels = Object.keys(samples[0].values);
    const stable = [], variable = [];
    for (const label of labels) {
      const values = [...new Set(samples.map((s) => s.values[label]))];
      (values.length === 1 ? stable : variable).push({ label, values });
    }
    return { start, end, midpoint: input.hh * 60 + input.mm, interval, sampleCount: samples.length, stable, variable };
  }

  function renderTimeUncertainty(d) {
    const u = d.timeUncertainty;
    if (!u) return '';
    const list = (items, kind, title) => `<div class="uncertainty-list ${kind}"><h3>${title}</h3><ul>${items.map((item) => `<li><strong>${esc(item.label)}</strong>${item.values.length > 1 ? `<br><span class="range-values">可能為：${item.values.map(esc).join('／')}</span>` : `<span class="range-values">：${esc(item.values[0])}</span>`}</li>`).join('')}</ul></div>`;
    const stable = u.stable.length ? list(u.stable, 'stable', '區間內保持一致') : '';
    const variable = u.variable.length ? list(u.variable, 'variable', '會隨出生時間改變') : '<div class="uncertainty-list stable"><h3>區間內保持一致</h3><ul><li>本次檢視的時間敏感項目未發現變動。</li></ul></div>';
    const description = u.variable.length
      ? '請先以「保持一致」的項目閱讀報告；變動項目應視為多種可能，而非單一結論。'
      : '在本次檢視的時間敏感項目中，未發現變動；完整報告仍以區間中點為代表盤。';
    return `<section class="panel time-confidence" id="sec-time-confidence"><h2><span class="no">準</span>出生時間區間檢視</h2><p class="desc">你提供 ${formatTime(u.start)}–${formatTime(u.end)}；完整報告以中點 ${formatTime(u.midpoint)} 為代表盤，另以每 ${u.interval} 分鐘掃描 ${u.sampleCount} 個時間點。</p><div class="uncertainty-overview"><span class="uncertainty-seal">區間</span><p>${description}</p></div><div class="uncertainty-grid">${stable}${variable}</div><p class="form-note">此功能比對八字時柱、紫微命／身宮、西占上升／天頂與人類圖核心設定；它呈現時間敏感度，不會把區間分析視為精確出生時刻。</p></section>`;
  }

  function panel(id, no, title, desc, body, collapsed) {
    const seal = no ? `<span class="no">${no}</span>` : '';
    if (collapsed) {
      return `<details class="panel" id="${id}"><summary><h2>${seal}${title}<span class="fold-hint">點開</span></h2>${desc ? `<p class="desc">${desc}</p>` : ''}</summary>${body}</details>`;
    }
    return `<section class="panel" id="${id}"><h2>${seal}${title}</h2>${desc ? `<p class="desc">${desc}</p>` : ''}${body}</section>`;
  }

  function renderNav() {
    const items = [
      ['sec-action', '行動手冊'], ['sec-time', '時間層'], ['sec-cta', '深入問答'],
    ];
    return `<nav class="toc" aria-label="報告章節">${items.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav>`;
  }

  /* --- LINE 導流共用 --- */
  const LINE_URL = 'https://line.me/R/ti/p/@989vkcos';
  function ctaLine(text) {
    return `<p class="cta-inline"><a href="${LINE_URL}" target="_blank" rel="noopener">${text} →</a></p>`;
  }

  /* --- AI 深度提問（匯出提示詞） --- */
  function renderAIPrompt(d) {
    const prompt = ML.report.exportPrompt(d);
    const b = `<p class="probe-plain">想深入追問，最省事的路是 <a href="${LINE_URL}" target="_blank" rel="noopener"><strong>LINE 問命織盤所</strong></a>——盤面自動帶入、命理老師人設調校好、回答附你的專屬盤面圖，一題 9 元。下面的工具留給想自己動手的進階玩家：</p>
    <p class="probe-plain">把<strong>完整盤面提示詞</strong>複製給任何 AI（ChatGPT、Claude、Gemini 都可以）。它包含你已精算好的全部盤面數據與分析方法論——AI 不必重新排盤、也不會亂編度數，直接站在這份報告的肩膀上往深處答。</p>
    <div class="ai-actions"><button class="ghost" id="copy-ai-btn">一鍵複製提示詞</button><span id="ai-copy-status" class="form-note"></span></div>
    <textarea id="ai-prompt-text" readonly rows="9" aria-label="AI 深度解讀提示詞">${esc(prompt)}</textarea>
    <p class="chart-note">用法：複製 → 貼到 AI 對話框送出 → 接著問你想問的任何問題（感情、事業、某一年怎麼走……）。提示詞已內建「交叉不並列、禁止巴納姆空話、逐句標來源、區分本質與流年」等規則，回答品質會比直接丟一句「幫我算命」好非常多。</p>`;
    return panel('sec-ai', '陸', 'AI 深度提問（進階 DIY）', '想自己拿盤面數據去問其他 AI 的進階玩家再點開；一般使用者直接用 LINE 深入問答最省事。', b, true);
  }

  /* --- 總結與建議（白話統整） --- */
  function renderSummary(d) {
    const s = ML.report.synthesize(d);
    const name = d.input.name ? esc(d.input.name) + '｜' : '';
    const birthTime = d.input.timePrecision === 'range'
      ? `時間區間 ${formatTime(d.input.timeRange.start)}–${formatTime(d.input.timeRange.end)}（代表盤 ${pad2(d.input.hh)}:${pad2(d.input.mm)}）`
      : `${pad2(d.input.hh)}:${pad2(d.input.mm)}`;
    let b = `<p class="desc">${name}${d.input.y}/${d.input.m}/${d.input.d} ${birthTime}（UTC${d.input.tz >= 0 ? '+' : ''}${d.input.tz}）・${d.input.sex === 'male' ? '男' : '女'}・緯度 ${d.input.lat}／經度 ${d.input.lon}・八字採真太陽時、日界 23:00</p>`;
    b += `<div class="guide"><strong>怎麼用這份報告？</strong>第一次看，把這一區讀完就好，順手到「行動手冊」找找自己的強項用法卡。之後遇到要做決定的時候，直接翻「決策速查卡」和「年度行動曆」。其他章節不用急，哪天想查證據了再點開。</div>`;
    b += `<div class="summary-block"><h4>多套系統一致指向的你</h4>`;
    if (s.core.length) {
      const SC = ML.report.SKILL_CARDS;
      b += `<ul>${s.core.map((c) => {
        const card = SC[c.dim];
        const extra = card ? `<br><small class="core-extra">怎麼用：${esc(card.collab)}｜<span class="warn-text">小心：${esc(card.misuse)}</span></small>` : '';
        return `<li><strong>${esc(c.dim)}</strong>——${esc(c.plain)}。<span class="chip" title="${esc(c.systems.join('、'))}">${c.stars} ${c.systems.length} 系統同指</span>${extra}</li>`;
      }).join('')}</ul>`;
    } else {
      b += '<p>沒有出現三系統以上的強匯流——你是「多面分散型」，任何單一標籤都會漏掉你的一大塊，建議直接看下方的並存清單。</p>';
    }
    b += '</div>';
    if (s.both.length) {
      b += `<div class="summary-block"><h4>你可以同時是的兩面（不用二選一）</h4><ul>${s.both.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }
    b += `<div class="summary-block"><h4>接下來三年怎麼走</h4>
    <p class="chart-note" style="margin-top:0">每年下面列的是「為什麼打這個燈」：左邊是命理術語（想對照排盤用的），右邊是它對你的意思。這張表是照你的盤逐年算的，別人的長得不一樣。</p>
    <ul class="next3">${s.next3.map((n) => `<li><strong>${esc(n.plain)}</strong><ul class="signal-list">${n.signals.map((sg) => { const p = ML.deep.reasonPlain(sg); return `<li><span class="sig-raw">${esc(sg)}</span>${p ? `——${esc(p)}` : ''}</li>`; }).join('')}</ul></li>`).join('')}</ul>${s.windowNote ? `<p><strong>${esc(s.windowNote)}</strong></p>` : ''}</div>`;
    b += `<div class="summary-block"><h4>短・中・長期怎麼布局</h4>
    <div class="horizon"><span class="hz-tag">短期｜今年</span><ul>${s.horizons.short.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="horizon"><span class="hz-tag">中期｜三～八年</span><ul>${s.horizons.mid.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="horizon"><span class="hz-tag">長期｜十年以上</span><ul>${s.horizons.long.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
    b += `<div class="summary-block"><h4>各領域建議</h4><ul>${s.domains.map((dm) => `<li><strong>${esc(dm.name)}</strong>｜${esc(dm.text)}<div class="chart-note">依據：${esc(dm.src)}</div></li>`).join('')}</ul></div>`;
    b += `<p class="chart-note">這一區是整份報告的摘要，每條結論都標了出處，細節和證據在後面各章。未來走勢是抓節奏用的粗篩，別當判決書。</p>`;
    return panel('sec-summary', '壹', '總結與建議', '六套系統交叉之後，指向最一致的結論都在這裡——先看這區就夠。', b + ctaLine('看完想針對你的狀況追問？LINE 一題 9 元深入問'));
  }

  /* --- 行動手冊 --- */
  function renderActionManual(d) {
    const bt = d.input.timePrecision === 'range' ? `時間區間 ${formatTime(d.input.timeRange.start)}–${formatTime(d.input.timeRange.end)}` : `${pad2(d.input.hh)}:${pad2(d.input.mm)}`;
    const a = ML.report.actionPlan(d);
    let b = '';
    // 強項用法卡（★★★ 全列＋標稀有度）
    b += `<h3>強項用法卡——你的多系統匯流特質</h3>
    <div class="amanual">`;
    for (const c of a.cards) {
      b += `<div class="acard${c.top ? ' acard-top' : ''}">${c.top ? '<div class="top-badge">你最突出的特質</div>' : ''}<h4><span class="stars">${c.stars}</span> ${esc(c.dim)}</h4>
        <div class="fld"><span class="fld-tag">適合走</span>${esc(c.roles)}</div>
        <div class="fld"><span class="fld-tag">合作時</span>${esc(c.collab)}</div>
        <div class="fld"><span class="fld-tag warn">小心</span>${esc(c.misuse)}</div>
        <div class="fld"><span class="fld-tag go">這個月</span>${esc(c.step)}</div>
        <div class="src-note">依據：${c.systems.join('、')} 匯流｜稀有度：${esc(c.rarity)}</div></div>`;
    }
    b += `</div>`;
    // 事業拼圖
    b += `<h3>事業拼圖</h3><div class="pieces">
      <div class="piece"><span class="fld-tag">怎麼進場</span>${esc(a.career.entry)}</div>
      <div class="piece"><span class="fld-tag">產業方向</span>依你的喜用五行，這些領域「環境對你順」：${a.career.industries.map(esc).join('；')}（不是限制，是加成清單）</div>
      <div class="piece"><span class="fld-tag">角色定位</span>${esc(a.career.role)}</div>
      <div class="piece"><span class="fld-tag">對外人設</span>${esc(a.career.mask)}</div>
    </div>`;
    // 財務
    b += `<h3>財務策略</h3><div class="pieces">
      <div class="piece"><span class="fld-tag">運用</span>${esc(a.finance.style)}</div>
      <div class="piece"><span class="fld-tag">時機</span>${esc(a.finance.timing)}</div>
      <div class="piece"><span class="fld-tag warn">護欄</span>${esc(a.finance.guard)}</div>
    </div>`;
    // 感情
    b += `<h3>感情實戰</h3><div class="pieces">
      <div class="piece"><span class="fld-tag">擇偶檢查</span><ol>${a.love.checklist.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
      <div class="piece"><span class="fld-tag">吵架 SOP</span>${esc(a.love.sop)}</div>
      <div class="piece"><span class="fld-tag">時機</span>${esc(a.love.timing)}</div>
    </div>`;
    // 健康
    b += `<h3>健康作息</h3><div class="pieces">
      <div class="piece"><span class="fld-tag">體質底色</span>${esc(a.health.base)}</div>
      <div class="piece"><span class="fld-tag warn">弱點雷達</span>${esc(a.health.weak)}</div>
      <div class="piece"><span class="fld-tag warn">生活地雷</span>${esc(a.health.avoid)}</div>
      <div class="piece"><span class="fld-tag">心理</span>${esc(a.health.mind)}</div>
    </div>`;
    // 學習
    b += `<h3>學習成長</h3><div class="pieces">
      <div class="piece"><span class="fld-tag">學什麼</span>${esc(a.learning.what)}</div>
      <div class="piece"><span class="fld-tag">怎麼學</span>${esc(a.learning.how)}</div>
      <div class="piece"><span class="fld-tag">何時學</span>${esc(a.learning.when)}</div>
    </div>`;
    // 年度行動曆（三年同燈號時合併成一張，各年差異列在備註）
    const toneName = { good: '進攻年', mid: '平持年', low: '防守年' };
    b += `<h3>年度行動曆（近三年）</h3>`;
    const sameTone = a.yearCal.every((y) => y.tone === a.yearCal[0].tone);
    if (sameTone) {
      const t = a.yearCal[0].tone;
      b += `<div class="ycal"><div class="ycard ${t}" style="grid-column:1/-1">
        <div class="yhead">${a.yearCal.map((y) => `<span class="ynum">${y.year}</span><span class="chip ${t === 'good' ? 'ok-chip' : t === 'low' ? 'warn-chip' : ''}">${y.gz}・${y.age}歲</span>`).join('')}</div>
        <p class="chart-note" style="margin:2px 0 8px">這三年的大方向相同（都是${toneName[t]}），共用同一套原則；各年的細節差異在下方備註。</p>
        <div class="ydo">✔ 適合：<ul>${a.yearCal[0].dos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="ydont">✘ 避免：<ul>${a.yearCal[0].donts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${a.yearCal.some((y) => y.extra.length) ? `<div class="yextra">${a.yearCal.filter((y) => y.extra.length).map((y) => `<strong>${y.year}</strong>：${y.extra.map(esc).join('；')}`).join('<br>')}</div>` : ''}
      </div></div>`;
    } else {
      b += `<div class="ycal">`;
      for (const y of a.yearCal) {
        b += `<div class="ycard ${y.tone}"><div class="yhead"><span class="ynum">${y.year}</span><span class="chip ${y.tone === 'good' ? 'ok-chip' : y.tone === 'low' ? 'warn-chip' : ''}">${y.gz}・${toneName[y.tone]}・${y.age}歲</span></div>
          <div class="ydo">✔ 適合：<ul>${y.dos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          <div class="ydont">✘ 避免：<ul>${y.donts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
          ${y.extra.length ? `<div class="yextra">※ ${y.extra.map(esc).join('；')}</div>` : ''}</div>`;
      }
      b += `</div>`;
    }
    b += `<p class="chart-note">「適合／避免」清單由該年的燈號決定（同燈號原則相同），各年的個人化差異（太歲、化祿化忌落點、行星回歸）寫在備註列。</p>`;
    b += `<p class="chart-note">本手冊全部由你的盤面規則式生成（喜用五行、人類圖類型與權威、宮位強度、流年表），不是通用模板；「產業方向」「方位」屬加成參考而非限制。時機類建議為粗篩參考，重大決策仍請綜合實際條件判斷。</p>`;
    return panel('sec-action', '壹', '行動手冊', '你的強項怎麼用、各領域怎麼走——全部由你的盤面規則式生成。', b + ctaLine('感情、事業想問得更細？到 LINE 跟老師聊'));
  }

  /* --- 時間敏感度 --- */
  function renderSensitivity(d) {
    const inp = d.input;
    function variant(dmin) {
      const t = new Date(Date.UTC(inp.y, inp.m - 1, inp.d, inp.hh, inp.mm) + dmin * 60000);
      return { ...inp, y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), hh: t.getUTCHours(), mm: t.getUTCMinutes() };
    }
    let rows = [];
    try {
      const minus = { asc: ML.west.compute(variant(-10)), zw: ML.ziwei.compute(variant(-10)), hd: ML.hd.compute(variant(-10)) };
      const plus = { asc: ML.west.compute(variant(10)), zw: ML.ziwei.compute(variant(10)), hd: ML.hd.compute(variant(10)) };
      const checks = [
        ['西占上升', minus.asc.asc.sign, d.west.asc.sign, plus.asc.asc.sign],
        ['紫微命宮', minus.zw.mingBranch, d.ziwei.mingBranch, plus.zw.mingBranch],
        ['人類圖類型', minus.hd.type, d.hd.type, plus.hd.type],
        ['人生角色', minus.hd.profile, d.hd.profile, plus.hd.profile],
      ];
      rows = checks.map(([k, a, b, c]) => {
        const stable = a === b && b === c;
        return `<span class="chip ${stable ? 'ok-chip' : 'warn-chip'}">${k}：${stable ? '±10分鐘內穩定' : `敏感！ −10分=${esc(String(a))}／+10分=${esc(String(c))}`}</span>`;
      });
    } catch (e) { rows = ['<span class="chip">敏感度檢查失敗</span>']; }
    return `<div class="sens-inline-box"><strong>出生時間敏感度檢查</strong><span class="form-note">（時間差 10 分鐘可能改變上升、命宮與人類圖——若出現紅色，請優先跟家人確認出生時間再看報告）</span>
      <div class="sens">${rows.join('')}</div></div>`;
  }

  /* --- 排盤總表（tabs） --- */
  function renderCharts(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, misc: M } = d;
    const tabs = ['八字', '紫微', '西占', '印占', '人類圖', '靈數'];
    let head = `<div class="tab-group-label">主力六系統｜以下皆參與匯流投票統計</div>
    <div class="tabs" role="tablist">${tabs.map((t, i) => `<button role="tab" data-tab="${i}" class="${i === 0 ? 'active' : ''}">${t}</button>`).join('')}</div>`;

    // 八字
    let p0 = `<div class="tbl-wrap"><table><thead><tr><th></th><th>年柱</th><th>月柱</th><th>日柱</th><th>時柱</th></tr></thead><tbody>
      <tr><th>天干</th>${['year', 'month', 'day', 'hour'].map((k) => `<td><strong>${B.pillars[k].stem}</strong>（${B.stemGods[k]}）</td>`).join('')}</tr>
      <tr><th>地支</th>${['year', 'month', 'day', 'hour'].map((k) => `<td><strong>${B.pillars[k].branch}</strong></td>`).join('')}</tr>
      <tr><th>藏干</th>${['year', 'month', 'day', 'hour'].map((k) => `<td>${B.hidden[k].map((h) => `${h.stem}<small>(${h.god})</small>`).join('<br>')}</td>`).join('')}</tr>
      <tr><th>納音</th>${['year', 'month', 'day', 'hour'].map((k) => `<td>${B.pillars[k].nayinName}</td>`).join('')}</tr>
    </tbody></table></div>
    <p class="chart-note">上表怎麼看：四根柱子＝出生的年、月、日、時各換算成一組干支；「天干」是浮在檯面上的性格與際遇，「地支」是底層的根，「藏干」是藏在地支裡的隱藏成分（括號內是它相對你的角色），「納音」是傳統的詩意標籤。</p>
    <ul class="bazi-read">
      <li><strong>日主＝代表「你本人」的那個字</strong>：<strong>${B.dayMaster.stem}${B.dayMaster.elem}</strong>——整張盤都以它為中心來讀，其他字都是相對它的角色。</li>
      <li><strong>身強弱＝你這個「${B.dayMaster.elem}」的能量夠不夠</strong>：${B.strength}（判分 ${B.strengthScore.toFixed(0)}；${B.deLing ? '得令＝出生季節幫你' : '不得令＝出生季節不幫你'}）——身強要「出口」（發揮、消耗），身弱要「補給」（休養、貴人）。</li>
      <li><strong>格局＝天生的做事框架</strong>：${esc(B.pattern.name)}——${esc(B.pattern.how)}。</li>
      <li><strong>喜用神＝該補的五行（工作假設）</strong>：<strong>${B.favorable.join('、')}</strong>——行業、環境、作息往這些屬性靠，等於順著體質走${B.tiaohou ? `；另需調候「${B.tiaohou}」＝出生月份的氣候偏了，先調溫再談補` : ''}。</li>
      <li><strong>空亡＝訊號減弱區</strong>：${B.kong.join('')}${B.kongHits.length ? `——你的${B.kongHits.join('、')}支入空：該柱管的人事容易「形式上都在、感受上隔一層」` : '——四柱皆未入空，無此議題'}。</li>
      <li><strong>神煞＝傳統速記標籤</strong>：${B.shensha.map((s) => `<span class="chip" title="${esc(s.desc)}">${s.name}・${s.at}</span>`).join(' ') || '無'}<br><small>滑鼠停留可看單個解釋；逐個白話細講在本頁底部「深入解讀」。</small></li>
      <li><strong>刑沖合害＝地支之間的化學反應</strong>：${B.relations.map((r) => `<span class="chip ${r.kind.includes('沖') || r.kind.includes('刑') || r.kind.includes('害') ? 'warn-chip' : 'ok-chip'}" title="${esc(r.note)}">${r.kind}・${esc(r.where)}</span>`).join(' ') || '<span class="chip">四支無明顯刑沖合害</span>'}<br><small>合（綠）＝黏合互助；沖（紅）＝對撞、該領域易動盪；刑／害（紅）＝隱性摩擦。${B.dayClash ? '<strong>你的日支逢沖</strong>——自身與婚姻位帶動盪體質。' : ''}</small></li>
      <li><strong>大運＝十年一換的人生大環境</strong>：${B.luck.steps.map((s) => `${s.gz.name}<small>(${Math.round(s.ageFrom)})</small>`).join('　')}<br><small>${B.luck.forward ? '順' : '逆'}行、${B.luck.startAgeYears} 歲起運；括號內＝該運開始的歲數。每步大運的順逆分析見「時間層」。</small></li>
    </ul>
    <p class="chart-note">${B.notes.map(esc).join('；')}</p>`;

    // 紫微命盤格（4×4 環形）
    const order = [5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11]; // 支索引佈局：巳午未申／辰○○酉／卯○○戌／寅丑子亥
    let cells = '';
    order.forEach((bi, i) => {
      if (bi === null) {
        if (i === 5) cells += `<div class="zw-cell zw-center"><div><strong>${Z.lunar.yearGZ.name}年 ${Z.lunar.monthName}${Z.lunar.dayName} ${Z.hourBranch}時</strong></div>
          <div>${Z.juName}・命主${Z.mingzhu}・身主${Z.shenzhu}</div>
          <div>生年四化：${Object.entries(Z.sihua).map(([k, v]) => `${v}化${k}`).join('、')}</div>
          <div class="chart-note">${Z.notes.slice(0, 1).map(esc).join('')}</div></div>`;
        return;
      }
      const p = Z.palaces[bi];
      cells += `<div class="zw-cell"><span class="pname">${p.name}${p.isShen ? '<span class="shen">・身</span>' : ''}</span>
        <div class="majors">${p.major.map((m) => `${m.star}<small>${m.bright}</small>${m.hua ? `<span class="hua">化${m.hua}</span>` : ''}`).join(' ') || '<small style="opacity:.5">空宮</small>'}</div>
        <div class="sub">${p.lucky.map((l) => l.star + (l.hua ? `<span class="hua">化${l.hua}</span>` : '')).join(' ')} <span class="bad">${p.unlucky.map((u) => u.star).join(' ')}</span> ${p.misc.map((m) => m.star).join(' ')}</div>
        <span class="gz">${p.stem}${p.branch}</span></div>`;
    });
    let p1 = `<div class="zw-grid">${cells}</div>
    <p>大限：${Z.daxian.map((x) => `${x.ageFrom}–${x.ageTo} ${x.palaceName}`).join('　')}</p>
    <p class="chart-note">${Z.notes.slice(1).map(esc).join('；')}</p>`;

    // 西占
    let p2 = `<div class="tbl-wrap"><table><thead><tr><th>星體</th><th>位置</th><th>宮位(Placidus)</th><th>整宮</th><th>狀態</th></tr></thead><tbody>
      ${W.planets.map((p) => `<tr><td>${p.name}</td><td><strong>${p.deg}</strong></td><td>${p.house != null ? p.house + '宮' : '—'}</td><td>${p.wholeSignHouse}宮</td><td>${p.retro ? '逆行 ℞' : ''}</td></tr>`).join('')}
      <tr><td>上升 ASC</td><td><strong>${W.asc.deg}</strong></td><td colspan="3">守護星 ${W.asc.ruler}</td></tr>
      <tr><td>天頂 MC</td><td><strong>${W.mc.deg}</strong></td><td colspan="3"></td></tr>
    </tbody></table></div>
    <p>相位：${W.aspects.map((a) => `<span class="chip" title="容許度 ${a.orb}°">${a.a}${a.sym}${a.b}${a.exact ? '<strong>✦</strong>' : ''}</span>`).join(' ')}</p>
    <p>${W.unaspected.length ? `無相位行星：<strong>${W.unaspected.join('、')}</strong>（功能孤島，全有或全無式運作）` : '無「無相位行星」'}${W.stelliums.length ? `・星群：${W.stelliums.map((s) => s.sign + '（' + s.planets.join('、') + '）').join('；')}` : ''}${W.keyDegrees.length ? `・關鍵度數：${W.keyDegrees.map(esc).join('；')}` : ''}</p>
    <p class="chart-note">✦＝容許度 &lt;1° 的精準相位；北交點為平均交點。${W.houseNote ? esc(W.houseNote) : ''}</p>`;

    // 印占
    let p3 = `<div class="tbl-wrap"><table><thead><tr><th>行星</th><th>恆星位置</th><th>宮位(整宮)</th><th>D1 力量</th><th>D9</th><th>Varg.</th></tr></thead><tbody>
      ${V.planets.map((p) => {
      const st = V.strength.find((s) => s.graha === p.key);
      return `<tr><td>${p.name}</td><td><strong>${p.deg}</strong>${p.retro ? ' ℞' : ''}</td><td>${p.house}宮</td><td>${st ? st.d1 + '（' + st.d1Label + '）' : '—'}</td><td>${st ? st.d9 + '（' + st.d9Label + '）' : '—'}</td><td>${st && st.vargottama ? '◈' : ''}</td></tr>`;
    }).join('')}
    </tbody></table></div>
    <p>恆星上升 <strong>${V.ascDeg}</strong>${V.ascVarg ? '（Vargottama ◈）' : ''}・月宿 <strong>${esc(V.moonNak.name)}</strong> 第${V.moonNak.pada}pada（${esc(V.moonNak.motif)}，主星${ML.vedic.LORD_ZH[V.moonNak.lord]}）・日宿 ${esc(V.sunNak.name)}</p>
    <p>瑜伽：${V.yogas.map((y) => `<span class="chip ${y.caution ? 'warn-chip' : ''}" title="${esc(y.rule)}——${esc(y.meaning)}">${esc(y.name)}</span>`).join(' ') || '無特殊瑜伽'}</p>
    <p>Jaimini 業力主星（七曜制，依宮內度數排序）：<strong>${esc(V.atmakaraka.role)}＝${V.atmakaraka.name}</strong>（${V.atmakaraka.sign} ${V.atmakaraka.deg}）・${esc(V.amatyakaraka.role.split(' ')[0])}＝${V.amatyakaraka.name}・${esc(V.darakaraka.role.split(' ')[0])}＝${V.darakaraka.name}<br><small class="chart-note">Atmakaraka＝此生靈魂反覆修的主題行星；含羅睺之八曜制為另一流派。</small></p>
    <p>Vimshottari 大運：${V.dashas.filter((x) => x.endAge > 0 && x.startAge < 92).map((x) => `${x.lordZh}<small>(${Math.max(0, x.startAge)}–${x.endAge})</small>`).join('　')}</p>
    <p class="chart-note">Lahiri ayanamsa ${V.ayanamsa.toFixed(3)}°；◈ Vargottama＝D1/D9 同宮（貫穿性配置）</p>`;

    // 人類圖
    let p4 = `<div class="chart-grid"><figure class="chart"><figcaption>九中心（${esc(H.definition)}）</figcaption>${CH.bodygraph(H.centerStates, H.channels)}</figure>
    <div><p><strong>${esc(H.type)}</strong>・${esc(H.authority)}<br>人生角色 <strong>${H.profile} ${esc(H.profileName)}</strong>・${esc(H.crossAngle)}</p>
    <p>通道：${H.channels.map((c) => `<span class="chip sys-hd">${c.a}-${c.b} ${esc(c.name)}</span>`).join(' ') || '無成形通道'}</p>
    <p>輪迴交叉閘門：個性日${H.crossGates.pSun}／地${H.crossGates.pEarth}・設計日${H.crossGates.dSun}／地${H.crossGates.dEarth}</p>
    <div class="tbl-wrap"><table><thead><tr><th>Gene Keys 四正</th><th>閘門</th><th>陰影</th><th>天賦</th><th>悉地</th></tr></thead><tbody>
    ${H.geneKeys.map((g) => `<tr><td>${esc(g.role)}</td><td><strong>${g.gate}</strong> ${esc(g.name)}</td><td>${esc(g.shadow)}</td><td>${esc(g.gift)}</td><td>${esc(g.siddhi)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="chart-note">設計端＝太陽黃經回推 88°（${H.designUTC.toISOString().slice(0, 10)}）；個性端 ${H.personality.map((a) => a.bodyZh + a.gate + '.' + a.line).join('　')}；設計端 ${H.design.map((a) => a.bodyZh + a.gate + '.' + a.line).join('　')}</p></div></div>`;

    // 靈數（主力第六票）
    let p5 = `<h3>生命靈數 <span class="chip sys-misc">${M.numerology.main}${M.numerology.master ? '・卓越數' : ''}</span></h3>
    <p>${esc(M.numerology.meaning)}（計算：${M.numerology.steps.join('→')}）・生日數 ${M.numerology.birthday}（${esc(M.numerology.birthdayMeaning || '')}）${M.numerology.missing.length ? `・缺數 ${M.numerology.missing.join('、')}` : ''}</p>
    ${CH.freqBars(M.numerology.freq, M.numerology.main)}
    <p class="chart-note">靈數是六票中結構最薄的一票——規則上它永遠無法單獨成案（至少需三系統匯流），僅作佐證票。</p>`;

    // 參考系統（不投票、不列入統計）
    const my = M.maya;
    const refBlock = `<details class="ref-block"><summary><strong>參考系統</strong><span class="ref-tag">僅供對照玩味・不列入匯流統計</span><span class="fold-hint">點開</span></summary>
    <p class="chart-note">這五套系統只給「單一原型標籤」（一個 Kin、一個卦、一個宿），結構太薄、無法翻成可驗證的訊號——硬讓它們投票會把詩意變成噪音，所以只陳列、不計分。當趣味對照即可。</p>
    <div class="chart-grid">
    <div><h3>塔羅生日牌 <span class="chip sys-misc">${M.tarot.map((t) => t.name).join('＋')}</span></h3>
    <p>由生日推導的大阿爾克那組合，象徵人生反覆出現的原型課題（Tarot School 標準法）。你的組合：</p>
    <ul class="ref-ul">${M.tarot.map((t) => `<li><strong>${esc(t.name)}</strong>：${esc(ML.deep.TAROT_KEY[t.name] || '')}</li>`).join('')}</ul>
    <p class="chart-note">讀法：${M.tarot.length > 1 ? '這幾張是同一股生命能量的不同面貌——不是二選一，是「同時都在你身上輪流上場」，合起來讀' : '單張即人生主牌'}。</p>
    <h3>馬雅 13 月亮曆 <span class="chip sys-misc">${my.kin ? 'Kin ' + my.kin : '無時間日'}</span></h3>
    ${my.kin ? `<p><strong>${esc(my.title)}</strong>・${esc(my.wavespell)}</p>
    <ul class="ref-ul"><li><strong>圖騰（能量原型）</strong>：${esc(my.sealKey)}——這是你這個 Kin 的「角色設定」。</li>
    <li><strong>調性（運作節奏）</strong>：${esc(my.toneKey)}——這是你發揮該角色時的節奏課題。</li>
    <li><strong>波符（所屬大主題）</strong>：${esc(my.wavespell)}——你的 Kin 座落在這條 13 天週期的大敘事裡。</li></ul>` : `<p>${esc(my.note)}</p>`}
    <p class="chart-note">Dreamspell 曆（非真實瑪雅長紀曆），錨點 2013-07-26＝Kin164，2/29 不賦 Kin。</p></div>
    <div><h3>八宅命卦 <span class="chip sys-misc">${M.gua.name}命</span></h3>
    <p>你屬<strong>${M.gua.group}</strong>（五行屬${M.gua.elem}，以 ${M.effYear} 立春年計）。八宅法把人分「東四命／西四命」兩組，各有四個相生的吉方位：你的吉方軸在<strong>${esc(M.gua.dir)}</strong>系——實際用途是挑房、擺床、選座位時的傳統參考（床頭、書桌、主窗朝吉方）。屬詩性層趣味，別為此搬家。</p>
    <h3>宿曜二十八宿 <span class="chip sys-misc">${esc(M.xiuyao.name)}</span></h3>
    <p>宿曜經以出生農曆日定「本命宿」，傳統用來看性格底色與人際相性（日本稱宿曜占星）。你的本命宿 <strong>${esc(M.xiuyao.name)}</strong>——${esc(M.xiuyao.key)}</p>
    <p class="chart-note">宿曜經曆算法（27 宿制）；與印占月宿是兩套獨立月宿系統，指向相似時可當額外印證，不同時屬方法差異、非矛盾。</p></div>
    </div></details>`;

    // 每個系統的白話導讀（放各分頁最上方）
    const zmTop = Z.mingPalace.major.map((m) => m.star).join('、');
    const curDasha = V.dashas.find((x) => { const age = new Date().getFullYear() - d.input.y; return age >= Math.max(0, x.startAge) && age < x.endAge; });
    const briefs = [
      `<div class="sys-brief"><strong>這套在算什麼：</strong>用出生時刻的天干地支算五行能量配比——看你的「性格底色、先天強弱、人生節奏」。<br><strong>你的結果一句話：</strong>日主 ${B.dayMaster.stem}${B.dayMaster.elem}（${B.strength}），喜 ${B.favorable.join('、')}——生活與工作環境往這些元素靠，你就順；${B.pattern.name}代表你天生的做事框架。以下完整盤面供核對。</div>`,
      `<div class="sys-brief"><strong>這套在算什麼：</strong>用農曆生日把天空分成十二宮，看每個人生領域（財、感情、事業⋯）的先天配備。<br><strong>你的結果一句話：</strong>命宮${zmTop ? `坐「${zmTop}」——這是你給人的主印象` : '無主星——你的形象隨情境變化大'}；身宮在${Z.shenPalace.name}——中年後重心會往這裡移。</div>`,
      `<div class="sys-brief"><strong>這套在算什麼：</strong>西洋占星看出生那刻行星的位置——太陽＝核心自我、月亮＝私下情緒、上升＝給人的第一印象。<br><strong>你的結果一句話：</strong>你是「太陽${W.sun.sign}＋月亮${W.moon.sign}＋上升${W.asc.sign}」的組合：外殼是${W.asc.sign}、核心是${W.sun.sign}、沒人看到的時候是${W.moon.sign}。</div>`,
      `<div class="sys-brief"><strong>這套在算什麼：</strong>印度占星用恆星座標，擅長看「業力課題」和「人生時程表」（什麼年紀走什麼運）。<br><strong>你的結果一句話：</strong>月宿 ${V.moonNak.name.split(' ')[0]}（${V.moonNak.motif}）是你的內在質地${curDasha ? `；現在走「${curDasha.lordZh}大運」到 ${curDasha.end.getFullYear()} 年——這段時期的人生主題由它定調` : ''}。</div>`,
      `<div class="sys-brief"><strong>這套在算什麼：</strong>人類圖是你的「能量使用說明書」——告訴你怎麼做決定、怎麼進場最不內耗。<br><strong>你的結果一句話：</strong>你是${H.type.split(' ')[0]}，人生策略照「${H.authority.split('（')[0]}」做決定；人生角色 ${H.profile}（${H.profileName}）。</div>`,
      `<div class="sys-brief"><strong>這套在算什麼：</strong>把生日數字加總，看你的人生主題號碼——六票裡結構最簡單的一票，只當佐證。<br><strong>你的結果一句話：</strong>主命數 ${M.numerology.main}，是「${(M.numerology.meaning || '').split('（')[0]}」型的人生課題。</div>`,
    ];
    const deeps = [ML.deep.bazi(d), ML.deep.ziwei(d), ML.deep.west(d), ML.deep.vedic(d), ML.deep.hd(d), ML.deep.num(d)];
    const panes = [p0, p1, p2, p3, p4, p5].map((c, i) => `<div class="tab-pane ${i === 0 ? 'active' : ''}" data-pane="${i}" role="tabpanel">${briefs[i]}${c}${deeps[i]}</div>`).join('');
    return panel('sec-boards', '伍', '排盤總表（較深奧可略）', '主力六系統參與匯流投票；下方另有五套參考系統（不列入統計）。每頁開頭有白話導讀、末尾有「深入解讀」。', head + panes + refBlock, true);
  }

  /* --- 量化雷達（區塊G） --- */
  function renderRadars(d) {
    const { bazi: B, west: W, vedic: V, ziwei: Z, misc: M } = d;
    const elems = ['木', '火', '土', '金', '水'];
    // 白話導讀：把四張圖的重點先講成一句話
    const eSorted = elems.slice().sort((a, x) => B.elemPct[x] - B.elemPct[a]);
    const wTop = Object.entries(W.elemPct).sort((a, x) => x[1] - a[1])[0];
    const mTop = Object.entries(W.modePct).sort((a, x) => x[1] - a[1])[0];
    const zTop = Z.palaces.slice().sort((a, x) => x.score - a.score).slice(0, 2);
    const vTop = V.strength.slice().sort((a, x) => x.d1 - a.d1).slice(0, 2);
    const MODE_PLAIN = { 基本: '喜歡開局、發起', 固定: '擅長堅持、守成', 變動: '擅長應變、調整' };
    let b = `<div class="sys-brief"><strong>看不懂圖沒關係，重點先講：</strong><br>
      ①八字：你的五行以「${eSorted[0]}、${eSorted[1]}」最多、「${eSorted[4]}」最少——所以喜用（該補的）是 ${B.favorable.join('、')}。<br>
      ②西占：你的能量 ${wTop[1].toFixed(0)}% 集中在${wTop[0]}象，且「${mTop[0]}」型佔 ${mTop[1].toFixed(0)}%＝${MODE_PLAIN[mTop[0]]}的人。<br>
      ③紫微：十二個人生領域裡，先天配備最強的是「${zTop.map((p) => p.name).join('、')}」。<br>
      ④印占：最有力的行星是${vTop.map((s) => s.name).join('、')}——它們代表的主題（${vTop.map((s) => ({ 太陽: '自我', 月亮: '情感', 火星: '行動', 水星: '思考表達', 木星: '智慧機運', 金星: '愛與美感', 土星: '紀律責任' }[s.name])).join('、')}）是你的可靠資產。<br>
      <span class="chart-note">雷達是「佔比」不是「好壞」；下面各圖附計分規則，可自行覆核；每張圖下方都有「再深一層」的解讀。</span></div>`;
    const DI = ML.deep.radarInsights(d);
    b += `<div class="chart-grid">`;
    b += `<figure class="chart"><figcaption>八字｜五行雷達</figcaption>${CH.radar(elems, [{ values: elems.map((e) => B.elemPct[e]), color: CH.COLORS.bazi }], { unit: '%', valueLabels: true, max: Math.max(40, ...elems.map((e) => B.elemPct[e])) })}
      ${DI.bazi}
      <p class="chart-note">計分：天干各1.0、地支本氣1.0（月支×1.5）、中氣0.5、餘氣0.3，換算百分比。喜用（假設）：${B.favorable.join('、')}</p></figure>`;
    b += `<figure class="chart"><figcaption>西占｜元素與模式</figcaption>
      ${CH.meterGroup([
      { label: '火（直覺行動）', pct: W.elemPct['火'], color: '#C4506A' },
      { label: '土（實感建造）', pct: W.elemPct['土'], color: '#B58325' },
      { label: '風（思考連結）', pct: W.elemPct['風'], color: '#3E8FC7' },
      { label: '水（感受滲透)', pct: W.elemPct['水'], color: '#2E9B82' },
    ])}
      ${CH.meterGroup([
      { label: '基本（發起）', pct: W.modePct['基本'], color: '#7D6BE0' },
      { label: '固定（堅持）', pct: W.modePct['固定'], color: '#7D6BE0' },
      { label: '變動（適應）', pct: W.modePct['變動'], color: '#7D6BE0' },
    ])}
      ${DI.west}
      <p class="chart-note">計分：日月升各2.0、水金火各1.5、木土各1.0、天海冥各0.5。</p></figure>`;
    b += `<figure class="chart"><figcaption>紫微｜十二宮強度</figcaption>${CH.radar(Z.palaces.map((p) => p.name), [{ values: Z.palaces.map((p) => p.score), color: CH.COLORS.ziwei }], { min: Math.min(-3, ...Z.palaces.map((p) => p.score)), labelSize: 11 })}
      ${DI.ziwei}
      <p class="chart-note">計分：主星廟旺+2／陷−1、化祿+2權+1.5科+1忌−2、六吉各+1、六煞各−1。虛線＝0 分環，內側為負。</p></figure>`;
    b += `<figure class="chart"><figcaption>印占｜行星力量 D1／D9</figcaption>${CH.signedBars(V.strength.map((s) => ({ label: s.name, a: s.d1, aNote: s.d1Label, b: s.d9, bNote: s.d9Label })), { aName: 'D1 主盤', bName: 'D9 九分盤' })}
      ${DI.vedic}
      <p class="chart-note">計分：廟旺+2／友+1／中0／敵−1／陷−2，角宮再+1（僅 D1）。</p></figure>`;
    b += '</div>';
    b += DI.cross;
    b += `<p class="chart-note">依區塊 G 規範：一系統一張圖、各用原生維度、禁止混軸；雷達是「佔比」不是「優劣」，多軸同高即多面性的數據呈現。更多跨系統交叉見「匯流與矛盾」。</p>`;
    return panel('sec-radar', '肆', '量化總覽', '各系統原生維度雷達（計分規則全部揭露，可覆核）。', b, true);
  }

  /* --- 匯流與矛盾 --- */
  function renderConfluence(d) {
    const ps = ML.report.probes(d);
    const strong = ps.filter((p) => p.n >= 2);
    const weak = ps.filter((p) => p.n < 2);
    let b = '<h3>匯流表（★★★＝三系統以上，可當結構事實；★★＝高信度假說）</h3>';
    b += strong.map((p) => `<details class="probe"${p.n >= 3 ? ' open' : ''}><summary><span class="stars">${p.stars}</span> <strong>${esc(p.dim)}</strong> ${sysChips(p.systems)}<span class="axis">${esc(p.axis)}</span></summary>
      <p class="probe-plain">白話：${esc(ML.report.DIM_PLAIN[p.dim] || p.axis)}。以下是各系統投下這一票的具體證據——</p>
      <ul>${p.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      ${p.misses.length ? `<p class="miss">未支持系統：${p.misses.join('、')}（誠實列出，非全票通過）</p>` : ''}</details>`).join('');
    b += '<h3>並存的可能性（單系統訊號，保留不剪掉，禁作斷語）</h3>';
    b += `<p class="chart-note">以下維度只有 0–1 個系統支持——不夠格當結論，但「弱訊號」不等於「沒有」：點開看是誰投的票、證據是什麼，再用自己的經驗判斷去留。</p>`;
    b += weak.map((p) => `<details class="probe weak-probe"><summary>${p.stars} <strong>${esc(p.dim)}</strong> ${p.systems.length ? sysChips(p.systems) : '<span class="chip">無系統支持</span>'}<span class="axis">${esc(p.axis)}</span></summary>
      <p class="probe-plain">這個維度在說：${esc(ML.report.DIM_PLAIN[p.dim] || p.axis)}。</p>
      ${p.evidence.length ? `<ul>${p.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p class="miss">僅 ${p.systems.join('、')} 支持——當「可能有」看待：想得起具體事例就留，想不起就劃掉。</p>` : `<p class="miss">六系統皆未投票——大概率「不是你」，這本身也是有用的排除法資訊。</p>`}
    </details>`).join('') || '<p>無</p>';
    const cons = ML.report.contradictions(d);
    b += `<h3>矛盾清單（真對立 vs 假衝突）</h3>
    <p class="probe-plain">這區在做的事：一般命理遇到系統打架會挑好聽的講，這裡反過來把衝突攤開給你看。分三種——<strong>假衝突</strong>＝兩套系統的曆法或座標不同造成的表面不一致，不是真的矛盾，看過就好；<strong>真對立</strong>＝盤面裡真實存在的內在張力，通常正是你人生反覆糾結的地方，值得細讀「☞」後的調和方向；<strong>並存</strong>＝看似矛盾其實是兩條獨立的軸，可以同時成立。</p>`;
    b += cons.map((c) => {
      const cls = c.type.includes('假衝突') ? 'pseudo' : c.type.includes('並存') ? 'coexist' : '';
      return `<div class="contra ${cls}"><div class="t">${esc(c.type)}</div><div class="w">${esc(c.what)}</div><div class="v">☞ ${esc(c.verdict)}</div></div>`;
    }).join('') || '<p>未偵測到顯著矛盾。</p>';
    return `<details class="sub-chapter"><summary><h3>匯流與矛盾</h3><span class="axis">結論是怎麼交叉出來的——匯流表、弱訊號與矛盾攤開</span><span class="fold-hint">點開</span></summary>${b}</details>`;
  }

  /* --- 動靜分層 --- */
  function renderLayers(d) {
    const dl = ML.report.dynamicLayers(d, new Date());
    let b = `<p class="probe-plain">這一章和前面的差別：前面各章講「你是什麼樣的人」，這章做的是幫那些結論貼上<strong>保存期限</strong>——哪些終身有效（L0）、哪些十年一換（L1）、哪些只是今年的天氣（L2）、哪些只在特定場合出現（L3）。內容看起來眼熟是正常的（同一批結論），但貼錯層就會出事：把「今年的天氣」誤當「一輩子的個性」，是命理最常見的誤讀。各項的深入解釋在「排盤總表」各分頁的深入解讀區。</p>`;
    const L = [
      ['L0 恆定結構層', '一生不變——可寫「你是」', '白話：這是你的「出廠設定」——不論幾歲、換什麼環境都不變的底層配備。認識自己先認識這層；下面每一行是一套系統的恆定部分。', dl.L0],
      ['L1 慢變層', '約十年一換的章節——只能寫「這段時期偏向」', '白話：人生像一本書，每十年翻一章。你還是你，但每一章被「點亮」的部位不同——下面列的是你「現在」所在的章節，過幾年回來看會不一樣。', dl.L1],
      ['L2 年變層', '逐年更替——非人格本質', '白話：一年一換的「天氣」。影響今年的際遇和心情背景，明年就換——別把今年的天氣當成自己的個性。詳細的逐年天氣預報在「時間層」的流年紅綠燈。', dl.L2],
    ];
    for (const [t, s, plain, items] of L) {
      b += `<div class="layer"><h4>${t} <small>｜${s}</small></h4><p class="probe-plain">${esc(plain)}</p><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    }
    b += `<div class="layer"><h4>L3 情境切換層 <small>｜不隨時間、隨場合切換——只能寫「在某情境下你會」（待驗證）</small></h4>
    <div class="tbl-wrap"><table><thead><tr><th>情境</th><th>上場部件</th><th>表現樣貌（假說）</th></tr></thead><tbody>
    ${dl.L3.map((r) => `<tr><td><strong>${esc(r.scene)}</strong></td><td>${esc(r.parts)}</td><td>${esc(r.looks)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="chart-note">此表回答「為什麼同一個人可以同時很理性又很感性」——不同部件在不同情境上場，或兩軸本來同高。每格標注來源部件，請當事人實際核對。</p></div>`;
    return `<details class="sub-chapter"><summary><h3>動靜分層（L0–L3）</h3><span class="axis">幫結論貼「保存期限」——分清恆定結構與流動狀態</span><span class="fold-hint">點開</span></summary>${b}</details>`;
  }

  /* --- 其他參考章節（方法論與進階細節） --- */
  function renderExtras(d) {
    const body = `<p class="probe-plain">這裡收的是「結論怎麼來的」與方法論層——平常不用看；想覆核證據、想知道系統怎麼交叉投票、或對某個結論存疑時，再進來翻。</p>`
      + renderConfluence(d) + renderLayers(d);
    return panel('sec-extra', '柒', '其他參考章節', '進階／方法論——匯流證據與動靜分層收在這裡，對過程有興趣再看。', body, true);
  }

  /* --- 深入問答導流 --- */
  function renderCTA(d) {
    const services = [
      ['💬', '單題深度問答', '任何問題，AI 命理老師依你的盤即時分析', '9 元/題起'],
      ['📜', '流年運勢詳批', '未來五年逐年批注＋關鍵月份', '4 題'],
      ['❤️', '桃花運專批', '感情模式・對象輪廓・桃花窗口', '5 題'],
      ['💼', '事業選擇建議', '產業方向・創業適性・未來節奏', '5 題'],
      ['💞', '合盤配對分析', '兩人盤面交叉：引力、摩擦、經營', '8 題'],
      ['📅', '擇日選時', '程式精算吉日＋建議時辰', '4 題'],
      ['📝', '姓名學鑑定', '名字五行是否補到你的喜用神', '3 題'],
    ];
    let b = `<p class="desc">這份免費報告是你的「說明書」；想針對自己的狀況追問——換工作時機、這段感情、這個決定——到 LINE 上跟 AI 命理老師一題一題深入聊。你的盤面會自動帶入，回答附專屬盤面圖表。一題 9 元起、買多最低 5 元/題，不到一杯飲料就能問個透徹。</p>`;
    b += `<div class="cta-services">${services.map(([ic, name, desc, price]) => `<div class="cta-item"><span class="cta-ic">${ic}</span><div class="cta-body"><strong>${name}</strong><span class="cta-desc">${desc}</span></div><span class="cta-price">${price}</span></div>`).join('')}</div>`;
    b += `<div class="cta-btn-wrap"><a class="cta-line-btn" href="https://line.me/R/ti/p/@989vkcos" target="_blank" rel="noopener">加 LINE 開始深入問 →</a><p class="chart-note" style="text-align:center;margin-top:10px">LINE 搜尋 @989vkcos｜綁定出生資料一次，之後隨問隨答</p></div>`;
    return panel('sec-cta', '參', '深入問答：問命織盤所', '', b);
  }

  /* --- 時間層 --- */
  function renderTimeline(d) {
    const tl = ML.report.timeline(d);
    let b = `<figure class="chart">${CH.timelineChart(tl, d.input.y)}</figure>`;
    b += '<h3>換軌窗口</h3>';
    b += `<p class="probe-plain">白話：上圖三套系統各自把人生切成約十年一段的「章節」。當兩套以上在同一兩年內<strong>同時翻章</strong>，就像多條列車同時進站——人生出現明顯轉折（換工作、搬家、關係聚散、身分轉變）的機率特別高。下表是你的「同時翻章」年份，重大轉向放在這附近通常最順：</p>
    <div class="tbl-wrap"><table><thead><tr><th>窗口</th><th>同時換段的系統</th><th>細節</th></tr></thead><tbody>
      ${tl.windows.filter((w) => w.year <= d.input.y + 92).map((w) => `<tr><td><strong>${w.year} 前後</strong>（${w.year - d.input.y}歲）</td><td>${w.systems.join('＋')}</td><td>${esc(w.detail)}</td></tr>`).join('')}
    </tbody></table></div>`;
    b += `<p class="chart-note">換軌窗口為粗篩參考，重大決策仍請綜合實際條件判斷。</p>`;
    b += ctaLine('想要未來五年逐年詳批（含關鍵月份）？LINE 取得流年詳批');
    return panel('sec-time', '貳', '時間層：三波對齊', '八字大運＋紫微大限＋印占 Vimshottari 三條長波對齊；同時換段處＝換軌窗口。', b);
  }

  function renderEpistemic() {
    return panel('sec-epistemic', '肆', '認識論收尾', '', `<div class="epistemic">
      本報告是<strong>象徵系統的交叉閱讀，不是實證預測</strong>。它描述的是「預設值的分佈」——你出廠時各種傾向的相對強弱——而非判決。
      所有排盤數據皆以天文曆算精確計算（誤差角分級）；但「計算正確」不等於「詮釋為真」：請用你的實際人生經驗核對各項結論，符合的採用、不符的剔除。
      流派敏感處（喜用神、廟旺、四化版本、日界）均已標注；雷達計分規則全部揭露，歡迎覆核。多軸同高、系統相互衝突之處，優先解讀為「並存」而非「取捨」——人是複雜的流動系統，這正是這套方法的核心原則。
    </div>`);
  }

  /* ---------- 互動 ---------- */
  function bindTabs() {
    const tabs = document.querySelectorAll('.tabs button');
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === t.dataset.tab));
    }));
  }

  /* ---------- 單檔報告匯出（自包含 .html，可離線轉傳） ---------- */
  async function downloadStandalone(d) {
    let css = '';
    try { css = await fetch('style.css').then((r) => r.text()); } catch (e) { /* file:// 下 fetch 可能失敗 */ }
    if (!css) css = [...document.styleSheets].map((ss) => { try { return [...ss.cssRules].map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const clone = document.getElementById('report').cloneNode(true);
    // 移除互動元素（單檔為靜態快照）
    clone.querySelectorAll('.hypo .btns, #copy-prompt, #download-report').forEach((el) => el.remove());
    const name = d.input.name || `${d.input.y}${String(d.input.m).padStart(2, '0')}${String(d.input.d).padStart(2, '0')}`;
    const title = `Marss｜問命織盤所報告｜${name}`;
    const html = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${CH.esc(title)}</title><style>${css}</style></head><body>
<header class="site"><h1>Marss｜問命織盤所</h1><p class="sub">多系統命理交叉分析・靜態快照（產生於 ${new Date().toLocaleDateString('zh-TW')}）</p></header>
<main>${clone.innerHTML}</main>
<footer>Marss｜問命織盤所・排盤採天文曆算（角分級精度）・象徵系統交叉閱讀，非實證預測</footer>
<script>document.querySelectorAll('.tabs button').forEach(function(t){t.addEventListener('click',function(){var tabs=t.closest('.tabs').querySelectorAll('button');tabs.forEach(function(x){x.classList.remove('active')});t.classList.add('active');var sec=t.closest('section');sec.querySelectorAll('.tab-pane').forEach(function(p){p.classList.toggle('active',p.dataset.pane===t.dataset.tab)})})});<\/script>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Marss｜問命織盤所-${name}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    $('#copy-status').textContent = '已下載單檔報告——可離線開啟、直接轉傳。';
    setTimeout(() => $('#copy-status').textContent = '', 3200);
  }

  /* ---------- 星幕（淡墨點＋星座連線） ---------- */
  function stars() {
    const c = $('#stars'), ctx = c.getContext('2d');
    function draw() {
      c.width = innerWidth; c.height = innerHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < 110; i++) {
        const x = Math.random() * c.width, y = Math.random() * c.height;
        const r = Math.random() * 1.2 + 0.3;
        const warm = Math.random() < 0.4;
        ctx.fillStyle = warm
          ? `rgba(143,106,30,${Math.random() * .18 + .05})`
          : `rgba(42,36,64,${Math.random() * .14 + .04})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      // 星座連線：幾組相連的亮點，像被織進宣紙的星圖
      const clusters = Math.max(2, Math.round(c.width / 480));
      for (let k = 0; k < clusters; k++) {
        const cx = Math.random() * c.width, cy = Math.random() * c.height;
        const n = 3 + Math.floor(Math.random() * 3);
        const pts = [];
        for (let i = 0; i < n; i++) {
          pts.push([cx + (Math.random() - 0.5) * 220, cy + (Math.random() - 0.5) * 160]);
        }
        ctx.strokeStyle = 'rgba(143,106,30,.13)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        ctx.stroke();
        for (const [x, y] of pts) {
          ctx.fillStyle = 'rgba(143,106,30,.32)';
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 7); ctx.fill();
        }
      }
    }
    draw();
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200); });
  }

  document.addEventListener('DOMContentLoaded', () => { initForm(); stars(); });
})();
