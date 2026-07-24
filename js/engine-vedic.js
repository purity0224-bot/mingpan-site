/* =========================================================
 * 印度占星引擎（Lahiri 恆星制）
 * 恆星黃道行星、27 星宿＋pada、Vimshottari 大運／中運、
 * 整宮制宮位、行星尊貴力量（D1/D9，區塊G計分）、Vargottama、瑜伽偵測
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;

  const SIGNS = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '摩羯', '水瓶', '雙魚'];

  // Lahiri ayanamsa：J2000 = 23°51′11.5″，歲差率 50.28792″/年（線性近似，±30年內誤差 < 0.5′）
  function ayanamsa(dateUTC) {
    const A = C.AE();
    const yrs = A.MakeTime(dateUTC).tt / 365.25;
    return 23.85320 + yrs * (50.28792 / 3600);
  }

  const NAKSHATRAS = [
    ['Ashwini 婁宿', '馬首・迅捷療癒'], ['Bharani 胃宿', '約束・承載生死'], ['Krittika 昴宿', '刀刃・淬煉'],
    ['Rohini 畢宿', '生長・豐美'], ['Mrigashira 觜宿', '尋覓・鹿首'], ['Ardra 參宿', '風暴・淚滴'],
    ['Punarvasu 井宿', '歸返・復原'], ['Pushya 鬼宿', '滋養・花蕊'], ['Ashlesha 柳宿', '蛇纏・洞察'],
    ['Magha 星宿', '王座・祖蔭'], ['Purva Phalguni 張宿', '享樂・床榻'], ['Uttara Phalguni 翼宿', '契約・庇護'],
    ['Hasta 軫宿', '巧手・掌握'], ['Chitra 角宿', '寶石・造形'], ['Swati 亢宿', '獨行・風中幼芽'],
    ['Vishakha 氐宿', '雙叉・志向'], ['Anuradha 房宿', '蓮花・友誼'], ['Jyeshtha 心宿', '傘蓋・長者'],
    ['Mula 尾宿', '斷根・究底'], ['Purva Ashadha 箕宿', '扇・不敗之水'], ['Uttara Ashadha 斗宿', '象牙・終局勝利'],
    ['Shravana 女宿', '聆聽・足跡'], ['Dhanishta 虛宿', '鼓・節奏'], ['Shatabhisha 危宿', '百醫・封印'],
    ['Purva Bhadrapada 室宿', '雙面・烈修'], ['Uttara Bhadrapada 壁宿', '深蛇・靜水'], ['Revati 奎宿', '魚・護航'],
  ];
  const DASHA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  const LORD_ZH = { Ketu: '計都', Venus: '金星', Sun: '太陽', Moon: '月亮', Mars: '火星', Rahu: '羅睺', Jupiter: '木星', Saturn: '土星', Mercury: '水星' };

  // 尊貴表
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 }; // 星座索引
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const FRIENDS = {
    Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'],
    Mercury: ['Sun', 'Venus'], Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
  };
  const ENEMIES = {
    Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'],
    Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
  };
  const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const GRAHA_ZH = { Sun: '太陽', Moon: '月亮', Mars: '火星', Mercury: '水星', Jupiter: '木星', Venus: '金星', Saturn: '土星', Rahu: '羅睺', Ketu: '計都' };

  function navamsaSign(sidLon) {
    const s = Math.floor(C.norm360(sidLon) / 30);
    const p = Math.floor((C.norm360(sidLon) % 30) / (30 / 9));
    const start = s % 3 === 0 ? s : s % 3 === 1 ? (s + 8) % 12 : (s + 4) % 12;
    return (start + p) % 12;
  }

  function dignity(graha, signIdx) {
    if (EXALT[graha] === signIdx) return { label: '入旺', score: 2 };
    if ((EXALT[graha] + 6) % 12 === signIdx) return { label: '落陷', score: -2 };
    if ((OWN[graha] || []).includes(signIdx)) return { label: '入廟', score: 2 };
    const lord = SIGN_LORD[signIdx];
    if ((FRIENDS[graha] || []).includes(lord)) return { label: '友宮', score: 1 };
    if ((ENEMIES[graha] || []).includes(lord)) return { label: '敵宮', score: -1 };
    return { label: '中性', score: 0 };
  }

  function fmtSid(lon) {
    const l = C.norm360(lon);
    const d = Math.floor(l % 30), m = Math.floor(((l % 30) - d) * 60);
    return `${SIGNS[Math.floor(l / 30)]} ${d}°${String(m).padStart(2, '0')}′`;
  }

  function compute(input, westResult) {
    const utc = C.toUTC(input);
    const ayan = ayanamsa(utc);
    const w = westResult || ML.west.compute(input);

    // 恆星黃道行星（含 Rahu/Ketu 平均交點）
    const planets = [];
    for (const p of w.planets) {
      if (p.key === 'NorthNode') continue;
      const sid = C.norm360(p.lon - ayan);
      planets.push({
        key: p.key, name: GRAHA_ZH[p.key] || p.name, sidLon: sid, retro: p.retro,
        signIdx: Math.floor(sid / 30), sign: SIGNS[Math.floor(sid / 30)], deg: fmtSid(sid),
      });
    }
    const rahuSid = C.norm360(w.planets.find((p) => p.key === 'NorthNode').lon - ayan);
    planets.push({ key: 'Rahu', name: '羅睺', sidLon: rahuSid, retro: true, signIdx: Math.floor(rahuSid / 30), sign: SIGNS[Math.floor(rahuSid / 30)], deg: fmtSid(rahuSid) });
    const ketuSid = C.norm360(rahuSid + 180);
    planets.push({ key: 'Ketu', name: '計都', sidLon: ketuSid, retro: true, signIdx: Math.floor(ketuSid / 30), sign: SIGNS[Math.floor(ketuSid / 30)], deg: fmtSid(ketuSid) });

    // 上升（恆星）與整宮制
    const sidAsc = C.norm360(w.asc.lon - ayan);
    const ascSignIdx = Math.floor(sidAsc / 30);
    for (const p of planets) p.house = C.mod(p.signIdx - ascSignIdx, 12) + 1;

    // 星宿
    const moon = planets.find((p) => p.key === 'Moon');
    const nakSize = 360 / 27;
    function nakOf(sidLon) {
      const i = Math.floor(C.norm360(sidLon) / nakSize);
      const pada = Math.floor((C.norm360(sidLon) % nakSize) / (nakSize / 4)) + 1;
      const frac = (C.norm360(sidLon) % nakSize) / nakSize;
      return { idx: i, name: NAKSHATRAS[i][0], motif: NAKSHATRAS[i][1], pada, frac, lord: DASHA_LORDS[i % 9] };
    }
    const moonNak = nakOf(moon.sidLon);
    const ascNak = nakOf(sidAsc);
    const sunNak = nakOf(planets.find((p) => p.key === 'Sun').sidLon);

    // Vimshottari 大運（陽曆年 365.25 天）
    const YEAR_MS = 365.25 * 86400000;
    const firstLord = moonNak.lord;
    const firstIdx = DASHA_LORDS.indexOf(firstLord);
    const remainFrac = 1 - moonNak.frac;
    const dashas = [];
    let cursor = utc.getTime() - (moonNak.frac * DASHA_YEARS[firstLord]) * YEAR_MS;
    for (let i = 0; i < 9; i++) {
      const lord = DASHA_LORDS[(firstIdx + i) % 9];
      const lenMs = DASHA_YEARS[lord] * YEAR_MS;
      const start = new Date(cursor), end = new Date(cursor + lenMs);
      // 中運（antardasha）
      const antars = [];
      let ac = cursor;
      for (let j = 0; j < 9; j++) {
        const sub = DASHA_LORDS[(DASHA_LORDS.indexOf(lord) + j) % 9];
        const subLen = lenMs * DASHA_YEARS[sub] / 120;
        antars.push({ lord: sub, lordZh: LORD_ZH[sub], start: new Date(ac), end: new Date(ac + subLen) });
        ac += subLen;
      }
      dashas.push({
        lord, lordZh: LORD_ZH[lord], start, end,
        startAge: Math.round((cursor - utc.getTime()) / YEAR_MS * 10) / 10,
        endAge: Math.round((cursor + lenMs - utc.getTime()) / YEAR_MS * 10) / 10,
        antars,
      });
      cursor += lenMs;
    }

    // 行星力量雷達 D1/D9（區塊G計分：廟旺+2 友+1 中0 敵−1 陷−2；角宮再+1）
    const KENDRA = [1, 4, 7, 10];
    const strength = GRAHAS.map((g) => {
      const p = planets.find((x) => x.key === g);
      const d1 = dignity(g, p.signIdx);
      const navS = navamsaSign(p.sidLon);
      const d9 = dignity(g, navS);
      const kendraBonus = KENDRA.includes(p.house) ? 1 : 0;
      return {
        graha: g, name: GRAHA_ZH[g],
        d1: d1.score + kendraBonus, d9: d9.score,
        d1Label: d1.label + (kendraBonus ? '・角宮' : ''), d9Label: d9.label,
        d1Sign: p.sign, d9Sign: SIGNS[navS],
        vargottama: navS === p.signIdx,
      };
    });
    const vargottamas = strength.filter((s) => s.vargottama).map((s) => s.name);
    // 上升 Vargottama
    const ascVarg = navamsaSign(sidAsc) === ascSignIdx;

    // 瑜伽偵測（規則明列）
    const yogas = [];
    const byKey = {};
    for (const p of planets) byKey[p.key] = p;
    const houseFrom = (a, b) => C.mod(byKey[a].signIdx - byKey[b].signIdx, 12) + 1;
    if ([1, 4, 7, 10].includes(houseFrom('Jupiter', 'Moon'))) {
      yogas.push({ name: 'Gajakesari 象吉瑜伽', rule: '木星在月亮的四角位', meaning: '聲譽與長輩貴人，逆境有撐' });
    }
    if (byKey.Sun.signIdx === byKey.Mercury.signIdx) {
      yogas.push({ name: 'Budha-Aditya 智慧瑜伽', rule: '日水同宮', meaning: '心智與表達結合，聰敏' });
    }
    if (byKey.Moon.signIdx === byKey.Mars.signIdx || houseFrom('Moon', 'Mars') === 7) {
      yogas.push({ name: 'Chandra-Mangala 財動瑜伽', rule: '月火同宮或對望', meaning: '行動力與企圖心強，財來自主動' });
    }
    const PMP = { Mars: 'Ruchaka 勇者格', Mercury: 'Bhadra 智者格', Jupiter: 'Hamsa 天鵝格', Venus: 'Malavya 雅樂格', Saturn: 'Shasha 統御格' };
    for (const g of Object.keys(PMP)) {
      const p = byKey[g];
      const dg = dignity(g, p.signIdx);
      if ((dg.label === '入廟' || dg.label === '入旺') && KENDRA.includes(p.house)) {
        yogas.push({ name: `Pancha Mahapurusha：${PMP[g]}`, rule: `${GRAHA_ZH[g]}入廟旺且居角宮`, meaning: '五大人格瑜伽之一，該行星主題成為人生支柱' });
      }
    }
    // Kemadruma（孤月）：月亮前後宮無行星（不計日/交點）且無行星同宮
    {
      const ms = byKey.Moon.signIdx;
      const others = planets.filter((p) => !['Moon', 'Sun', 'Rahu', 'Ketu'].includes(p.key));
      const near = others.some((p) => [C.mod(ms - 1, 12), ms, C.mod(ms + 1, 12)].includes(p.signIdx));
      if (!near) yogas.push({ name: 'Kemadruma 孤月瑜伽', rule: '月亮前後與同宮皆無行星（日、交點不計）', meaning: '情緒自力更生、易感孤立——需外部支持系統', caution: true });
    }
    // 落陷解消（簡化）
    for (const g of GRAHAS) {
      const p = byKey[g];
      if ((EXALT[g] + 6) % 12 === p.signIdx) {
        const disp = SIGN_LORD[p.signIdx];
        const dispHouseFromAsc = C.mod(byKey[disp].signIdx - ascSignIdx, 12) + 1;
        if (KENDRA.includes(dispHouseFromAsc)) {
          yogas.push({ name: `Neecha Bhanga（${GRAHA_ZH[g]}落陷解消）`, rule: `${GRAHA_ZH[g]}落陷，但其定位星${GRAHA_ZH[disp]}居命主四角`, meaning: '弱點經歷淬煉反成資產的結構' });
        } else {
          yogas.push({ name: `${GRAHA_ZH[g]}落陷`, rule: `${GRAHA_ZH[g]}在${p.sign}（落陷位）`, meaning: '該行星主題天生費力，需後天補位', caution: true });
        }
      }
    }

    // Jaimini Chara Karaka（七曜制：日月火水木金土，取宮內度數最高者；另有含羅睺之八曜制流派）
    const KARAKA_NAMES = ['Atmakaraka 靈魂主星', 'Amatyakaraka 事業輔星', 'Bhratrikaraka 手足師長', 'Matrikaraka 母親根基', 'Putrakaraka 子嗣創造', 'Gnatikaraka 同儕試煉', 'Darakaraka 伴侶之鑰'];
    const karakas = GRAHAS.map((g) => {
      const p = planets.find((x) => x.key === g);
      return { graha: g, name: GRAHA_ZH[g], degInSign: C.norm360(p.sidLon) % 30, sign: p.sign };
    }).sort((a, b) => b.degInSign - a.degInSign)
      .map((k, i) => ({ ...k, role: KARAKA_NAMES[i], deg: `${Math.floor(k.degInSign)}°${String(Math.floor((k.degInSign % 1) * 60)).padStart(2, '0')}′` }));

    return {
      utc, ayanamsa: ayan, planets, sidAsc, ascSign: SIGNS[ascSignIdx], ascSignIdx, ascDeg: fmtSid(sidAsc),
      moonNak, ascNak, sunNak, dashas, strength, vargottamas, ascVarg, yogas, karakas,
      atmakaraka: karakas[0], amatyakaraka: karakas[1], darakaraka: karakas[6],
      nakOf,
    };
  }

  ML.vedic = { compute, ayanamsa, navamsaSign, dignity, SIGNS, NAKSHATRAS, LORD_ZH, GRAHA_ZH, DASHA_YEARS };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
