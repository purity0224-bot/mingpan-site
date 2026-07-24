/* =========================================================
 * 西洋占星引擎（回歸黃道，當日座標）
 * 行星經度＋速度（判逆行）、ASC/MC、Placidus 與整宮制、
 * 相位（含 <1° 精準相位與無相位行星）、元素／模式雷達（區塊G計分）
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  const SIGNS = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '摩羯', '水瓶', '雙魚'];
  const SIGN_ELEM = ['火', '土', '風', '水', '火', '土', '風', '水', '火', '土', '風', '水'];
  const MODES = ['基本', '固定', '變動']; // signIdx % 3

  const PLANET_NAMES = { Sun: '太陽', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星', NorthNode: '北交點', SouthNode: '南交點', ASC: '上升', MC: '天頂' };
  const ELEM_WEIGHTS = { Sun: 2.0, Moon: 2.0, ASC: 2.0, Mercury: 1.5, Venus: 1.5, Mars: 1.5, Jupiter: 1.0, Saturn: 1.0, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5 };

  const RULER = { 牡羊: '火星', 金牛: '金星', 雙子: '水星', 巨蟹: '月亮', 獅子: '太陽', 處女: '水星', 天秤: '金星', 天蠍: '冥王星／火星', 射手: '木星', 摩羯: '土星', 水瓶: '天王星／土星', 雙魚: '海王星／木星' };

  function signOf(lon) { return Math.floor(C.norm360(lon) / 30); }
  function fmtDeg(lon) {
    const l = C.norm360(lon);
    const inSign = l % 30;
    const d = Math.floor(inSign);
    const m = Math.floor((inSign - d) * 60);
    return `${SIGNS[signOf(l)]} ${d}°${String(m).padStart(2, '0')}′`;
  }

  /* ---------- ASC / MC ---------- */
  function ascMc(dateUTC, lat, lon) {
    const A = C.AE();
    const t = A.MakeTime(dateUTC);
    const eps = C.obliquity(dateUTC) * D2R;
    const ramc = C.norm360((A.SiderealTime(t) + lon / 15) * 15) * D2R; // RAMC in rad
    // MC：黃經
    let mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * R2D;
    mc = C.norm360(mc);
    // ASC
    const phi = lat * D2R;
    let asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * R2D;
    asc = C.norm360(asc);
    // ASC 必須在 MC 之後 180 度內（東方地平）
    if (C.mod(asc - mc, 360) > 180) asc = C.norm360(asc + 180);
    return { asc, mc, ramc: ramc * R2D, eps: eps * R2D };
  }

  /* ---------- Placidus 宮位 ---------- */
  function placidusCusps(dateUTC, lat, lon) {
    const { asc, mc, ramc, eps } = ascMc(dateUTC, lat, lon);
    const phi = lat * D2R, e = eps * D2R;
    // 高緯度不適用
    if (Math.abs(lat) > 66) return { cusps: null, asc, mc, note: '高緯度 Placidus 失效，改用整宮制' };

    function raOfEclLon(lam) { return Math.atan2(Math.sin(lam * D2R) * Math.cos(e), Math.cos(lam * D2R)) * R2D; }
    function declOfEclLon(lam) { return Math.asin(Math.sin(e) * Math.sin(lam * D2R)) * R2D; }
    function lonOfRA(ra) { return C.norm360(Math.atan2(Math.sin(ra * D2R), Math.cos(ra * D2R) * Math.cos(e)) * R2D); }

    // f: 佔弧比例；diurnal: 用晝弧或夜弧
    function iterate(offsetDeg, f, diurnal) {
      let lam = C.norm360(mc + offsetDeg);
      for (let i = 0; i < 60; i++) {
        const dec = declOfEclLon(lam) * D2R;
        let x = -Math.tan(phi) * Math.tan(dec);
        if (x < -1 || x > 1) return null; // 極圈內失效
        const sad = Math.acos(x) * R2D;        // 晝半弧
        const san = 180 - sad;                  // 夜半弧
        const targetRA = diurnal
          ? C.norm360(ramc + f * sad)          // 11、12宮
          : C.norm360(ramc + sad + f * san);   // 2、3宮
        const newLam = lonOfRA(targetRA);
        if (Math.abs(C.mod(newLam - lam + 180, 360) - 180) < 1e-7) { lam = newLam; break; }
        lam = newLam;
      }
      return lam;
    }

    const c11 = iterate(30, 1 / 3, true);
    const c12 = iterate(60, 2 / 3, true);
    const c2 = iterate(120, 1 / 3, false);
    const c3 = iterate(150, 2 / 3, false);
    if ([c11, c12, c2, c3].some((v) => v === null)) return { cusps: null, asc, mc, note: '極圈附近 Placidus 失效，改用整宮制' };

    const cusps = new Array(13);
    cusps[1] = asc; cusps[10] = mc; cusps[11] = c11; cusps[12] = c12; cusps[2] = c2; cusps[3] = c3;
    cusps[4] = C.norm360(mc + 180); cusps[5] = C.norm360(c11 + 180); cusps[6] = C.norm360(c12 + 180);
    cusps[7] = C.norm360(asc + 180); cusps[8] = C.norm360(c2 + 180); cusps[9] = C.norm360(c3 + 180);
    return { cusps, asc, mc, note: null };
  }

  function houseOf(lonDeg, cusps) {
    for (let h = 1; h <= 12; h++) {
      const a = cusps[h], b = cusps[h === 12 ? 1 : h + 1];
      const span = C.mod(b - a, 360);
      if (C.mod(lonDeg - a, 360) < span) return h;
    }
    return 12;
  }

  /* ---------- 相位 ---------- */
  const ASPECTS = [
    { name: '合相', angle: 0, orb: 8, sym: '☌' },
    { name: '六合', angle: 60, orb: 4, sym: '⚹' },
    { name: '四分', angle: 90, orb: 7, sym: '□' },
    { name: '三合', angle: 120, orb: 7, sym: '△' },
    { name: '對分', angle: 180, orb: 8, sym: '☍' },
  ];

  function compute(input) {
    const utc = C.toUTC(input);
    const planets = [];
    for (const b of C.PLANET_BODIES) {
      const p = C.eclLon(b, utc);
      const speed = C.eclSpeed(b, utc);
      planets.push({
        key: b, name: PLANET_NAMES[b], lon: p.lon, lat: p.lat, speed,
        retro: speed < 0 && b !== 'Sun' && b !== 'Moon',
        sign: SIGNS[signOf(p.lon)], signIdx: signOf(p.lon),
        elem: SIGN_ELEM[signOf(p.lon)], mode: MODES[signOf(p.lon) % 3],
        deg: fmtDeg(p.lon),
      });
    }
    // 北交點（平均）
    const nn = C.meanLunarNode(utc);
    planets.push({ key: 'NorthNode', name: '北交點（平均）', lon: nn, lat: 0, speed: -0.053, retro: true, sign: SIGNS[signOf(nn)], signIdx: signOf(nn), elem: SIGN_ELEM[signOf(nn)], mode: MODES[signOf(nn) % 3], deg: fmtDeg(nn) });

    const ph = placidusCusps(utc, input.lat, input.lon);
    const ascSign = signOf(ph.asc);
    const mcSign = signOf(ph.mc);

    // 宮位（Placidus + 整宮）
    for (const p of planets) {
      p.house = ph.cusps ? houseOf(p.lon, ph.cusps) : null;
      p.wholeSignHouse = C.mod(signOf(p.lon) - ascSign, 12) + 1;
    }

    // 相位（十行星互相；不含交點以免灌水，交點相位另列）
    const aspects = [];
    const majors = planets.filter((p) => p.key !== 'NorthNode');
    for (let i = 0; i < majors.length; i++) {
      for (let j = i + 1; j < majors.length; j++) {
        const d = Math.abs(C.mod(majors[i].lon - majors[j].lon + 180, 360) - 180);
        for (const asp of ASPECTS) {
          let orb = asp.orb;
          if (majors[i].key === 'Sun' || majors[i].key === 'Moon' || majors[j].key === 'Sun' || majors[j].key === 'Moon') orb += 1;
          const diff = Math.abs(d - asp.angle);
          if (diff <= orb) {
            aspects.push({
              a: majors[i].name, b: majors[j].name, aKey: majors[i].key, bKey: majors[j].key,
              type: asp.name, sym: asp.sym, orb: Math.round(diff * 100) / 100,
              exact: diff < 1.0,
            });
          }
        }
      }
    }
    // 無相位行星
    const aspected = new Set();
    for (const a of aspects) { aspected.add(a.aKey); aspected.add(a.bKey); }
    const unaspected = majors.filter((p) => !aspected.has(p.key)).map((p) => p.name);

    // 元素／模式雷達（區塊G計分）
    const elemScore = { 火: 0, 土: 0, 風: 0, 水: 0 };
    const modeScore = { 基本: 0, 固定: 0, 變動: 0 };
    const detail = [];
    for (const p of planets) {
      const w = ELEM_WEIGHTS[p.key];
      if (!w) continue;
      elemScore[p.elem] += w; modeScore[p.mode] += w;
      detail.push(`${p.name}(${p.sign})${w}`);
    }
    elemScore[SIGN_ELEM[ascSign]] += 2.0; modeScore[MODES[ascSign % 3]] += 2.0;
    detail.push(`上升(${SIGNS[ascSign]})2.0`);
    const elemTotal = Object.values(elemScore).reduce((a, b) => a + b, 0);
    const elemPct = {}, modePct = {};
    for (const k of Object.keys(elemScore)) elemPct[k] = elemScore[k] / elemTotal * 100;
    for (const k of Object.keys(modeScore)) modePct[k] = modeScore[k] / elemTotal * 100;

    // 關鍵度數：0° 開創（世俗軸點）±1、29° 臨界度
    const keyDegrees = [];
    for (const p of planets) {
      const inSign = p.lon % 30;
      if (inSign >= 29) keyDegrees.push(`${p.name}在${p.sign}29°（臨界度 anaretic）`);
      const cardinalDist = Math.min(...[0, 90, 180, 270].map((x) => Math.abs(C.mod(p.lon - x + 180, 360) - 180)));
      if (cardinalDist <= 1) keyDegrees.push(`${p.name}貼近世俗軸點（0°開創 ±1°）`);
    }

    // 星群 stellium（同星座 ≥3 顆，不含交點）
    const bySign = {};
    for (const p of majors) (bySign[p.sign] = bySign[p.sign] || []).push(p.name);
    const stelliums = Object.entries(bySign).filter(([, v]) => v.length >= 3).map(([s, v]) => ({ sign: s, planets: v }));

    return {
      utc, planets,
      asc: { lon: ph.asc, sign: SIGNS[ascSign], deg: fmtDeg(ph.asc), ruler: RULER[SIGNS[ascSign]] },
      mc: { lon: ph.mc, sign: SIGNS[mcSign], deg: fmtDeg(ph.mc) },
      cusps: ph.cusps, houseNote: ph.note,
      aspects, unaspected, elemScore, elemPct, modeScore, modePct, scoringDetail: detail,
      keyDegrees, stelliums,
      sun: planets[0], moon: planets[1],
    };
  }

  ML.west = { compute, SIGNS, SIGN_ELEM, MODES, fmtDeg, signOf, ascMc, placidusCusps, houseOf, PLANET_NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
