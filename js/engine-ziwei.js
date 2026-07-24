/* =========================================================
 * 紫微斗數引擎
 * 依真實朔望月農曆排盤；安星依《紫微斗數全書》常見版本
 * 流派敏感處（四化戊庚干、閏月歸屬、廟旺細目）於輸出中標注
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;

  const PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'];
  const MAJOR_STARS = ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'];

  // 廟旺利陷表（採主流排盤軟體 iztro／文墨天機通行版，2026-07 全表比對抽取；
  // 七級：廟旺得利平不陷；雷達計分只取 廟旺+2／陷−1／其餘0。古籍間本無統一標準，已於報告標注）
  // 支序：子丑寅卯辰巳午未申酉戌亥
  const BRIGHT = {
    紫微: '平廟旺旺得旺廟廟旺旺得旺', 天機: '廟陷得旺利平廟陷得旺利平',
    太陽: '陷不旺廟旺旺旺得得陷不陷', 武曲: '旺廟得利廟平旺廟得利廟平',
    天同: '旺不利平平廟陷不旺平平廟', 廉貞: '平利廟平利陷平利廟平利陷',
    天府: '廟廟廟得廟得旺廟得旺廟得', 太陰: '廟廟旺陷陷陷不不利不旺廟',
    貪狼: '旺廟平利廟陷旺廟平利廟陷', 巨門: '旺不廟廟陷旺旺不廟廟陷旺',
    天相: '廟廟廟陷得得廟得廟陷得得', 天梁: '廟旺廟廟廟陷廟旺陷得廟陷',
    七殺: '旺廟廟旺廟平旺廟廟廟廟平', 破軍: '廟旺得陷旺平廟旺得陷旺平',
  };

  // 生年四化（全書版：戊=貪陰右機、庚=陽武陰同；他派或作戊機陽、庚同陰，已標注）
  const SIHUA = {
    甲: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
    乙: { 祿: '天機', 權: '天梁', 科: '紫微', 忌: '太陰' },
    丙: { 祿: '天同', 權: '天機', 科: '文昌', 忌: '廉貞' },
    丁: { 祿: '太陰', 權: '天同', 科: '天機', 忌: '巨門' },
    戊: { 祿: '貪狼', 權: '太陰', 科: '右弼', 忌: '天機' },
    己: { 祿: '武曲', 權: '貪狼', 科: '天梁', 忌: '文曲' },
    庚: { 祿: '太陽', 權: '武曲', 科: '太陰', 忌: '天同' },
    辛: { 祿: '巨門', 權: '太陽', 科: '文曲', 忌: '文昌' },
    壬: { 祿: '天梁', 權: '紫微', 科: '左輔', 忌: '武曲' },
    癸: { 祿: '破軍', 權: '巨門', 科: '太陰', 忌: '貪狼' },
  };

  const MINGZHU = { 子: '貪狼', 丑: '巨門', 寅: '祿存', 卯: '文曲', 辰: '廉貞', 巳: '武曲', 午: '破軍', 未: '武曲', 申: '廉貞', 酉: '文曲', 戌: '祿存', 亥: '巨門' };
  const SHENZHU = { 子: '火星', 午: '火星', 丑: '天相', 未: '天相', 寅: '天梁', 申: '天梁', 卯: '天同', 酉: '天同', 辰: '文昌', 戌: '文昌', 巳: '天機', 亥: '天機' };

  const LUCUN_BRANCH = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 }; // 年干idx→祿存支idx
  const KUI_YUE = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [6, 2], 8: [3, 5], 9: [3, 5] }; // 天魁/天鉞

  // 火星鈴星起點（依年支三合）：[火星起, 鈴星起]，自起點子時順數至生時
  const HUO_LING_START = { 0: [2, 10], 1: [3, 10], 2: [1, 3], 3: [9, 10], 4: [2, 10], 5: [3, 10], 6: [1, 3], 7: [9, 10], 8: [2, 10], 9: [3, 10], 10: [1, 3], 11: [9, 10] };
  const TIANMA = { 0: 2, 4: 2, 8: 2, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 }; // 年支→天馬支

  // 局數：命宮納音五行 → 水二木三金四土五火六
  const JU = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };

  function compute(input, lunarInfo) {
    const notes = [];
    const utc = C.toUTC(input);
    const lunar = lunarInfo || C.lunarDate(utc);
    if (lunar.isLeap) notes.push('生於閏月：本盤採「閏月當本月」派；另派以月中為界分屬前後月');

    // 時辰（紫微以出生地鐘錶時間為主；可選真太陽時）
    let hours;
    if (input.useTrueSolar) hours = C.trueSolarHours(utc, input.lon);
    else { const cv = C.civilOf(utc, input.tz); hours = cv.hh + cv.mm / 60; }
    const hourIdx = C.hourBranchIdx(hours);

    const M = lunar.monthNo, D = lunar.day;
    const yStem = lunar.yearGZ.stemIdx, yBranch = lunar.yearGZ.branchIdx;
    notes.push('生年干支以農曆正月初一為界（全書派）；八字盤另以立春為界，兩者如不同屬座標系差異');

    // 命宮、身宮
    const mingIdx = C.mod(2 + (M - 1) - hourIdx, 12);
    const shenIdx = C.mod(2 + (M - 1) + hourIdx, 12);

    // 宮干（五虎遁）
    const stemOf = (b) => C.mod(C.WUHU[yStem] + C.mod(b - 2, 12), 10);

    // 五行局（命宮干支納音）
    const mingGZidx = C.ganzhiIdx(stemOf(mingIdx), mingIdx);
    const mingNayin = C.ganzhi(mingGZidx).nayin;
    const ju = JU[mingNayin];
    const JU_NAMES = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

    // 紫微位置
    const q = Math.ceil(D / ju), borrow = q * ju - D;
    let ziwei = C.mod(2 + (q - 1) + (borrow % 2 === 1 ? -borrow : borrow), 12);

    // 十四主星
    const starAt = {}; // 星 → 支idx
    starAt['紫微'] = ziwei;
    starAt['天機'] = C.mod(ziwei - 1, 12);
    starAt['太陽'] = C.mod(ziwei - 3, 12);
    starAt['武曲'] = C.mod(ziwei - 4, 12);
    starAt['天同'] = C.mod(ziwei - 5, 12);
    starAt['廉貞'] = C.mod(ziwei - 8, 12);
    const tianfu = C.mod(4 - ziwei, 12);
    starAt['天府'] = tianfu;
    starAt['太陰'] = C.mod(tianfu + 1, 12);
    starAt['貪狼'] = C.mod(tianfu + 2, 12);
    starAt['巨門'] = C.mod(tianfu + 3, 12);
    starAt['天相'] = C.mod(tianfu + 4, 12);
    starAt['天梁'] = C.mod(tianfu + 5, 12);
    starAt['七殺'] = C.mod(tianfu + 6, 12);
    starAt['破軍'] = C.mod(tianfu + 10, 12);

    // 六吉
    const lucky = {};
    lucky['文昌'] = C.mod(10 - hourIdx, 12);
    lucky['文曲'] = C.mod(4 + hourIdx, 12);
    lucky['左輔'] = C.mod(4 + (M - 1), 12);
    lucky['右弼'] = C.mod(10 - (M - 1), 12);
    lucky['天魁'] = KUI_YUE[yStem][0];
    lucky['天鉞'] = KUI_YUE[yStem][1];
    lucky['祿存'] = LUCUN_BRANCH[yStem];

    // 六煞
    const unlucky = {};
    unlucky['擎羊'] = C.mod(LUCUN_BRANCH[yStem] + 1, 12);
    unlucky['陀羅'] = C.mod(LUCUN_BRANCH[yStem] - 1, 12);
    const [huoS, lingS] = HUO_LING_START[yBranch];
    unlucky['火星'] = C.mod(huoS + hourIdx, 12);
    unlucky['鈴星'] = C.mod(lingS + hourIdx, 12);
    unlucky['地劫'] = C.mod(11 + hourIdx, 12);
    unlucky['地空'] = C.mod(11 - hourIdx, 12);

    // 雜曜（常用）
    const misc = {};
    misc['天馬'] = TIANMA[yBranch];
    misc['紅鸞'] = C.mod(3 - yBranch, 12);
    misc['天喜'] = C.mod(misc['紅鸞'] + 6, 12);

    // 生年四化
    const sihua = SIHUA[C.STEMS[yStem]];
    notes.push('四化採全書版（戊：貪陰右機／庚：陽武陰同）；三合派或有戊機、庚同之異');

    // 十二宮組裝
    const palaces = [];
    for (let b = 0; b < 12; b++) {
      const pn = PALACE_NAMES[C.mod(mingIdx - b, 12)];
      palaces.push({
        branchIdx: b, branch: C.BRANCHES[b], stem: C.STEMS[stemOf(b)],
        name: pn, isShen: b === shenIdx,
        major: [], lucky: [], unlucky: [], misc: [], hua: [],
      });
    }
    for (const [s, b] of Object.entries(starAt)) {
      const bright = BRIGHT[s][b];
      palaces[b].major.push({ star: s, bright, hua: Object.entries(sihua).find(([, v]) => v === s)?.[0] || null });
    }
    for (const [s, b] of Object.entries(lucky)) palaces[b].lucky.push({ star: s, hua: Object.entries(sihua).find(([, v]) => v === s)?.[0] || null });
    for (const [s, b] of Object.entries(unlucky)) palaces[b].unlucky.push({ star: s });
    for (const [s, b] of Object.entries(misc)) palaces[b].misc.push({ star: s });

    // 宮強度雷達（區塊G計分）
    function palaceScore(p, extraHua) {
      let sc = 0;
      const parts = [];
      const extraOf = (star) => {
        if (!extraHua) return null;
        const hit = Object.entries(extraHua).find(([, v]) => v === star);
        return hit ? hit[0] : null;
      };
      for (const m of p.major) {
        const v = '廟旺'.includes(m.bright) ? 2 : m.bright === '陷' ? -1 : 0;
        sc += v; if (v) parts.push(`${m.star}${m.bright}${v > 0 ? '+2' : '−1'}`);
        const huaAll = [m.hua, extraOf(m.star)].filter(Boolean);
        for (const h of huaAll) {
          const hv = h === '祿' ? 2 : h === '權' ? 1.5 : h === '科' ? 1 : -2;
          sc += hv; parts.push(`化${h}${hv > 0 ? '+' + hv : hv}`);
        }
      }
      for (const l of p.lucky) {
        if (['文昌', '文曲', '左輔', '右弼', '天魁', '天鉞'].includes(l.star)) { sc += 1; parts.push(l.star + '+1'); }
        const huaAll = [l.hua, extraOf(l.star)].filter(Boolean);
        for (const h of huaAll) {
          const hv = h === '祿' ? 2 : h === '權' ? 1.5 : h === '科' ? 1 : -2;
          sc += hv; parts.push(`${l.star}化${h}${hv > 0 ? '+' + hv : hv}`);
        }
      }
      for (const u of p.unlucky) { sc -= 1; parts.push(u.star + '−1'); }
      return { score: sc, parts };
    }
    for (const p of palaces) {
      const r = palaceScore(p, null);
      p.score = r.score; p.scoreParts = r.parts;
    }

    // 大限（起於命宮，起始歲=局數；陽男陰女順行【支序遞增，經父母宮】，陰男陽女逆行）
    const yangYear = C.STEM_YANG[yStem];
    const forward = (yangYear && input.sex === 'male') || (!yangYear && input.sex === 'female');
    notes.push('大限方向依「陽男陰女順行（命→父母方向）」；此為全書通行排法');
    const daxian = [];
    for (let i = 0; i < 9; i++) {
      const b = C.mod(mingIdx + (forward ? i : -i), 12);
      const px = palaces[b];
      // 大限四化（依大限宮干）
      const dhua = SIHUA[px.stem];
      daxian.push({
        seq: i + 1, branchIdx: b, palaceName: px.name, stem: px.stem, branch: px.branch,
        ageFrom: ju + i * 10, ageTo: ju + i * 10 + 9,
        hua: dhua,
      });
    }

    // 時期演化：每大限以大限四化重算宮強
    const evolution = daxian.map((dx) => {
      const scores = palaces.map((p) => palaceScore(p, dx.hua).score);
      return { label: `${dx.ageFrom}–${dx.ageTo} ${dx.stem}${dx.branch}限（${dx.palaceName}）`, scores, daxian: dx };
    });

    return {
      utc, lunar, hourIdx, hourBranch: C.BRANCHES[hourIdx],
      mingIdx, shenIdx, mingBranch: C.BRANCHES[mingIdx], shenBranch: C.BRANCHES[shenIdx],
      ju, juName: JU_NAMES[ju], ziweiBranch: C.BRANCHES[ziwei],
      mingzhu: MINGZHU[C.BRANCHES[mingIdx]], shenzhu: SHENZHU[C.BRANCHES[yBranch]],
      palaces, sihua, daxian, forward, evolution, notes,
      mingPalace: palaces[mingIdx], shenPalace: palaces[shenIdx],
    };
  }

  ML.ziwei = { compute, PALACE_NAMES, MAJOR_STARS, SIHUA, BRIGHT };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
