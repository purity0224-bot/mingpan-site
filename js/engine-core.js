/* =========================================================
 * 命理交叉分析系統 — 曆算核心
 * 全部以天文曆算精確計算（astronomy-engine），禁止估算。
 * 在瀏覽器與 Node 皆可運作（Node 供自動化測試）。
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});

  function AE() {
    if (global.Astronomy) return global.Astronomy;
    if (typeof require === 'function') {
      global.Astronomy = require('./astronomy.min.js');
      return global.Astronomy;
    }
    throw new Error('astronomy-engine not loaded');
  }

  /* ---------- 基本工具 ---------- */
  const norm360 = (x) => ((x % 360) + 360) % 360;
  const mod = (a, n) => ((a % n) + n) % n;

  /* ---------- 干支基礎表 ---------- */
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const STEM_ELEM = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  const STEM_YANG = [true, false, true, false, true, false, true, false, true, false];
  const BRANCH_ELEM = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  const BRANCH_YANG = [true, false, true, false, true, false, true, false, true, false, true, false];
  const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

  // 地支藏干：[ [干索引, 層級] ]；層級 main本氣 / mid中氣 / rest餘氣
  const HIDDEN_STEMS = {
    子: [['癸', 'main']],
    丑: [['己', 'main'], ['癸', 'mid'], ['辛', 'rest']],
    寅: [['甲', 'main'], ['丙', 'mid'], ['戊', 'rest']],
    卯: [['乙', 'main']],
    辰: [['戊', 'main'], ['乙', 'mid'], ['癸', 'rest']],
    巳: [['丙', 'main'], ['庚', 'mid'], ['戊', 'rest']],
    午: [['丁', 'main'], ['己', 'mid']],
    未: [['己', 'main'], ['丁', 'mid'], ['乙', 'rest']],
    申: [['庚', 'main'], ['壬', 'mid'], ['戊', 'rest']],
    酉: [['辛', 'main']],
    戌: [['戊', 'main'], ['辛', 'mid'], ['丁', 'rest']],
    亥: [['壬', 'main'], ['甲', 'mid']],
  };

  // 六十甲子納音五行（依納音歌訣，每兩柱一納音）
  const NAYIN_SEQ = ['金', '火', '木', '土', '金', '火', '水', '土', '金', '木',
    '水', '土', '火', '木', '水', '金', '火', '木', '土', '金',
    '火', '水', '土', '金', '木', '水', '土', '火', '木', '水'];
  const NAYIN_NAMES = ['海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木',
    '泉中水', '屋上土', '霹靂火', '松柏木', '長流水', '砂石金', '山下火', '平地木', '壁上土', '金箔金',
    '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];

  // 甲子序 (0..59) → {stem, branch, name}
  function ganzhi(idx) {
    const i = mod(idx, 60);
    return {
      idx: i,
      stem: STEMS[i % 10],
      branch: BRANCHES[i % 12],
      stemIdx: i % 10,
      branchIdx: i % 12,
      name: STEMS[i % 10] + BRANCHES[i % 12],
      nayin: NAYIN_SEQ[Math.floor(i / 2)],
      nayinName: NAYIN_NAMES[Math.floor(i / 2)],
    };
  }
  // 由干支索引反推甲子序
  function ganzhiIdx(stemIdx, branchIdx) {
    for (let i = 0; i < 60; i++) if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
    return -1;
  }

  // 五虎遁：年干 → 寅月天干索引
  const WUHU = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 };
  // 五鼠遁：日干 → 子時天干索引
  const WUSHU = { 0: 0, 5: 0, 1: 2, 6: 2, 2: 4, 7: 4, 3: 6, 8: 6, 4: 8, 9: 8 };

  /* ---------- 時間處理 ---------- */
  // 輸入：{y,m,d,hh,mm, tz(小時，可小數), lon, lat}
  // 回傳 Date（UTC 時刻）
  function toUTC(inp) {
    const ms = Date.UTC(inp.y, inp.m - 1, inp.d, inp.hh, inp.mm || 0, inp.ss || 0)
      - inp.tz * 3600 * 1000;
    return new Date(ms);
  }

  // 公曆年月日 → JDN（中午為界的天數編號，此處只用於日干支：以「當地日期」計）
  function jdnFromCivil(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
      - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  // UTC Date → 指定時區的民用年月日時分
  function civilOf(dateUTC, tz) {
    const t = new Date(dateUTC.getTime() + tz * 3600 * 1000);
    return {
      y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
      hh: t.getUTCHours(), mm: t.getUTCMinutes(), ss: t.getUTCSeconds(),
      dayFrac: (t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600) / 24,
    };
  }

  // 真太陽時（回傳當地真太陽時的小時數 0-24）：太陽時角法，精確
  function trueSolarHours(dateUTC, lon) {
    const A = AE();
    const time = A.MakeTime(dateUTC);
    const observer = new A.Observer(0, lon, 0);
    const eq = A.Equator(A.Body.Sun, time, observer, true, true);
    const gast = A.SiderealTime(time); // hours
    const lstHours = mod(gast + lon / 15, 24);
    const haHours = mod(lstHours - eq.ra, 24); // 時角
    return mod(haHours + 12, 24);
  }

  // 平太陽時（僅經度修正）
  function meanSolarHours(dateUTC, lon) {
    const c = civilOf(dateUTC, lon / 15);
    return c.dayFrac * 24;
  }

  /* ---------- 行星黃經（回歸黃道，當日座標） ---------- */
  const PLANET_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  function eclLon(bodyName, dateUTC) {
    const A = AE();
    const t = A.MakeTime(dateUTC);
    const vec = A.GeoVector(A.Body[bodyName], t, true);
    const ecl = A.Ecliptic(vec);
    return { lon: norm360(ecl.elon), lat: ecl.elat };
  }

  // 黃經速度（度/日，中央差分）→ 判逆行
  function eclSpeed(bodyName, dateUTC) {
    const dt = 0.25 * 86400 * 1000;
    const a = eclLon(bodyName, new Date(dateUTC.getTime() - dt)).lon;
    const b = eclLon(bodyName, new Date(dateUTC.getTime() + dt)).lon;
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff / 0.5;
  }

  // 月亮平均交點（Meeus 多項式，標注為平均值）
  function meanLunarNode(dateUTC) {
    const A = AE();
    const t = A.MakeTime(dateUTC);
    const T = (t.tt) / 36525.0; // 世紀數（自 J2000 TT）
    let omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
      + T * T * T / 467441 - T * T * T * T / 60616000;
    return norm360(omega);
  }

  // 黃赤交角（當日，Meeus）
  function obliquity(dateUTC) {
    const A = AE();
    const T = A.MakeTime(dateUTC).tt / 36525.0;
    return 23.43929111 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
  }

  /* ---------- 節氣 ---------- */
  // 依太陽黃經搜節氣時刻；targetLon 例：315=立春, 270=冬至
  function searchSolarTerm(targetLon, approxDateUTC, windowDays) {
    const A = AE();
    const start = A.MakeTime(new Date(approxDateUTC.getTime() - (windowDays / 2) * 86400000));
    const res = A.SearchSunLongitude(targetLon, start, windowDays);
    return res ? res.date : null;
  }

  const TERM_NAMES = { // 黃經 → 節氣名（節＝月界，氣＝中氣）
    315: '立春', 330: '雨水', 345: '驚蟄', 0: '春分', 15: '清明', 30: '穀雨',
    45: '立夏', 60: '小滿', 75: '芒種', 90: '夏至', 105: '小暑', 120: '大暑',
    135: '立秋', 150: '處暑', 165: '白露', 180: '秋分', 195: '寒露', 210: '霜降',
    225: '立冬', 240: '小雪', 255: '大雪', 270: '冬至', 285: '小寒', 300: '大寒',
  };
  const JIE_LONS = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285]; // 十二節（月界）
  const ZHONGQI_LONS = [330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300]; // 十二中氣

  // 找出生前最近的「節」與其後下一個「節」（八字月界與大運起運用）
  function bracketingJie(dateUTC) {
    const A = AE();
    const sun = eclLon('Sun', dateUTC).lon;
    // 上一個節黃經
    let prevLon = JIE_LONS.slice().sort((a, b) => a - b);
    // 找 <= sun 的最大節黃經（環狀）
    let pl = -1;
    for (const L of prevLon) if (L <= sun) pl = L;
    if (pl === -1) pl = Math.max(...prevLon);
    const nl = (pl + 30) % 360;
    // 搜尋時刻：上一節在最近 32 天內、下一節在未來 32 天內
    const prev = A.SearchSunLongitude(pl, A.MakeTime(new Date(dateUTC.getTime() - 33 * 86400000)), 34);
    const next = A.SearchSunLongitude(nl, A.MakeTime(dateUTC), 34);
    return {
      prev: { lon: pl, name: TERM_NAMES[pl], date: prev ? prev.date : null },
      next: { lon: nl, name: TERM_NAMES[nl], date: next ? next.date : null },
    };
  }

  // 某年立春（UTC 時刻）
  function lichunOf(year) {
    const A = AE();
    const res = A.SearchSunLongitude(315, A.MakeTime(new Date(Date.UTC(year, 0, 20))), 30);
    return res ? res.date : null;
  }

  /* ---------- 農曆（標準農曆以東八區日界計；出生地非東亞時仍依此，與萬年曆一致） ---------- */
  const LUNAR_TZ = 8;

  function cstDayNumber(dateUTC) { // 東八區民用日期的連續日編號
    const c = civilOf(dateUTC, LUNAR_TZ);
    return jdnFromCivil(c.y, c.m, c.d);
  }

  // 回傳涵蓋 dateUTC 的農曆資訊 {lunarYear, monthNo, isLeap, day, monthName, dayName}
  function lunarDate(dateUTC) {
    const A = AE();
    const targetDay = cstDayNumber(dateUTC);
    const cy = civilOf(dateUTC, LUNAR_TZ).y;

    // 收集朔（新月）：target−800 天 至 target+450 天（涵蓋前後冬至區間與前一個正月初一）
    const moons = [];
    let seek = A.MakeTime(new Date(dateUTC.getTime() - 800 * 86400000));
    for (let i = 0; i < 45; i++) {
      const nm = A.SearchMoonPhase(0, seek, 40);
      if (!nm) break;
      moons.push(nm.date);
      seek = A.MakeTime(new Date(nm.date.getTime() + 2 * 86400000));
      if (nm.date.getTime() > dateUTC.getTime() + 450 * 86400000) break;
    }
    const moonDays = moons.map(cstDayNumber);

    function monthIdxContaining(dayNum) {
      let idx = -1;
      for (let i = 0; i < moonDays.length; i++) if (moonDays[i] <= dayNum) idx = i;
      return idx;
    }

    // 中氣（步進搜尋：每個中氣一次搜尋）
    const zqDays = [];
    {
      let t = new Date(moons[0].getTime() - 2 * 86400000);
      let lon = eclLon('Sun', t).lon;
      let targetLon = (Math.ceil(lon / 30) * 30) % 360;
      if (Math.abs(norm360(targetLon - lon)) < 1e-9) targetLon = (targetLon + 30) % 360;
      let cursor = A.MakeTime(t);
      const endTime = moons[moons.length - 1].getTime() + 40 * 86400000;
      for (let i = 0; i < 95; i++) {
        const r = A.SearchSunLongitude(targetLon, cursor, 40);
        if (!r) break;
        if (ZHONGQI_LONS.includes(targetLon)) zqDays.push(cstDayNumber(r.date));
        cursor = A.MakeTime(new Date(r.date.getTime() + 5 * 86400000));
        targetLon = (targetLon + 15) % 360; // 每 15° 一節氣，其中偶數位為中氣
        if (r.date.getTime() > endTime) break;
      }
    }
    function monthHasZhongqi(mi) {
      const a = moonDays[mi], b = moonDays[mi + 1];
      return zqDays.some((z) => z >= a && z < b);
    }

    // 逐對冬至標號（每對冬至定義一個 11月→10月 的年度月序）
    const labels = {}; // mi → {no, leap}
    const solsticeMis = [];
    for (const y of [cy - 3, cy - 2, cy - 1, cy, cy + 1]) {
      const sd = cstDayNumber(A.Seasons(y).dec_solstice.date);
      const mi = monthIdxContaining(sd);
      if (mi >= 0 && mi < moonDays.length - 1) solsticeMis.push(mi);
    }
    for (let k = 0; k + 1 < solsticeMis.length; k++) {
      const ma = solsticeMis[k], mb = solsticeMis[k + 1];
      if (mb <= ma) continue;
      const hasLeap = (mb - ma) === 13;
      let leapMi = -1;
      if (hasLeap) {
        for (let mi = ma + 1; mi < mb; mi++) {
          if (!monthHasZhongqi(mi)) { leapMi = mi; break; }
        }
      }
      let num = 11; // 含冬至之月為十一月
      for (let mi = ma; mi < mb; mi++) {
        if (mi === leapMi && mi > ma) {
          labels[mi] = { no: labels[mi - 1].no, leap: true };
          continue;
        }
        labels[mi] = { no: ((num - 1) % 12) + 1, leap: false };
        num++;
      }
    }

    const tmi = monthIdxContaining(targetDay);
    const lab = labels[tmi];
    if (!lab) throw new Error('lunarDate: month label failed (out of labeled range)');
    const day = targetDay - moonDays[tmi] + 1;

    // 農曆年：最近一個（≤ 生日所屬月起點）的正月初一，其東八區civil年即農曆年號
    let lunarYear = null;
    for (let mi = 0; mi <= tmi; mi++) {
      if (labels[mi] && labels[mi].no === 1 && !labels[mi].leap) {
        lunarYear = civilOf(moons[mi], LUNAR_TZ).y;
      }
    }
    if (lunarYear === null) throw new Error('lunarDate: lunar year anchor not found');

    const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const DAY_NAMES = (() => {
      const a = [];
      const tens = ['初', '十', '廿', '三'];
      for (let i = 1; i <= 30; i++) {
        if (i === 10) a.push('初十');
        else if (i === 20) a.push('二十');
        else if (i === 30) a.push('三十');
        else a.push(tens[Math.floor(i / 10)] + '一二三四五六七八九'[i % 10 - 1]);
      }
      return a;
    })();

    // 農曆年干支（以正月初一為界）：以西元年號推（1984=甲子年）
    const gzYearIdx = mod(lunarYear - 1984, 60);

    return {
      lunarYear,
      yearGZ: ganzhi(gzYearIdx),
      monthNo: lab.no,
      isLeap: !!lab.leap,
      day,
      monthName: (lab.leap ? '閏' : '') + MONTH_NAMES[lab.no - 1] + '月',
      dayName: DAY_NAMES[day - 1],
    };
  }

  /* ---------- 時辰 ---------- */
  function hourBranchIdx(hours) { // 當地時間小時數 → 時辰支索引（23-1子…）
    return Math.floor(mod(hours + 1, 24) / 2);
  }

  ML.core = {
    AE, norm360, mod,
    STEMS, BRANCHES, STEM_ELEM, STEM_YANG, BRANCH_ELEM, BRANCH_YANG, ZODIAC_ANIMALS,
    HIDDEN_STEMS, ganzhi, ganzhiIdx, WUHU, WUSHU,
    toUTC, jdnFromCivil, civilOf, trueSolarHours, meanSolarHours,
    PLANET_BODIES, eclLon, eclSpeed, meanLunarNode, obliquity,
    searchSolarTerm, bracketingJie, lichunOf, TERM_NAMES, JIE_LONS, ZHONGQI_LONS,
    lunarDate, hourBranchIdx, LUNAR_TZ,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
