/* =========================================================
 * 八字引擎：四柱、十神、藏干、神煞、大運、五行雷達（區塊G計分）
 * 年界＝立春精確時刻；月界＝十二節精確時刻；日干支以 1949-10-01=甲子 錨定
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;

  const DAY_ANCHOR_JDN = C.jdnFromCivil(1949, 10, 1); // 甲子日

  // 節黃經 → 月支索引（立春315→寅=2）
  const JIE_TO_BRANCH = { 315: 2, 345: 3, 15: 4, 45: 5, 75: 6, 105: 7, 135: 8, 165: 9, 195: 10, 225: 11, 255: 0, 285: 1 };

  /* ---------- 十神 ---------- */
  const GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // 我生
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }; // 我剋
  function tenGod(dayStemIdx, otherStemIdx) {
    const de = C.STEM_ELEM[dayStemIdx], oe = C.STEM_ELEM[otherStemIdx];
    const same = C.STEM_YANG[dayStemIdx] === C.STEM_YANG[otherStemIdx];
    if (oe === de) return same ? '比肩' : '劫財';
    if (GEN[de] === oe) return same ? '食神' : '傷官';
    if (KE[de] === oe) return same ? '偏財' : '正財';
    if (KE[oe] === de) return same ? '七殺' : '正官';
    if (GEN[oe] === de) return same ? '偏印' : '正印';
    return '?';
  }
  const TENGOD_GROUP = { 比肩: '比劫', 劫財: '比劫', 食神: '食傷', 傷官: '食傷', 正財: '財星', 偏財: '財星', 正官: '官殺', 七殺: '官殺', 正印: '印星', 偏印: '印星' };

  /* ---------- 神煞表 ---------- */
  const TIANYI = { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '巳卯', 癸: '巳卯', 辛: '午寅' };
  const WENCHANG = { 甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
  const LU = { 甲: '寅', 乙: '卯', 丙: '巳', 戊: '巳', 丁: '午', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
  const YANGREN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
  const SANHE_GROUP = (b) => ('申子辰'.includes(b) ? 0 : '寅午戌'.includes(b) ? 1 : '巳酉丑'.includes(b) ? 2 : 3);
  const TAOHUA = ['酉', '卯', '午', '子'];
  const YIMA = ['寅', '申', '亥', '巳'];
  const HUAGAI = ['辰', '戌', '丑', '未'];
  const JIANGXING = ['子', '午', '酉', '卯'];
  const TIANDE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
  const YUEDE = (b) => ('寅午戌'.includes(b) ? '丙' : '申子辰'.includes(b) ? '壬' : '亥卯未'.includes(b) ? '甲' : '庚');
  const KUIGANG = ['庚辰', '庚戌', '壬辰', '戊戌'];

  /* ---------- 地支刑沖合害 ---------- */
  const LIUHE = { 子丑: '土', 寅亥: '木', 卯戌: '火', 辰酉: '金', 巳申: '水', 午未: '土' };
  const LIUHAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  const SANHE = { 申子辰: '水', 亥卯未: '木', 寅午戌: '火', 巳酉丑: '金' };
  const SANHUI = { 寅卯辰: '木', 巳午未: '火', 申酉戌: '金', 亥子丑: '水' };
  const XING_TRIO = [['寅', '巳', '申', '無恩之刑'], ['丑', '戌', '未', '恃勢之刑']];
  const ZIXING = ['辰', '午', '酉', '亥'];

  function branchRelations(pillars) {
    const pos = [['年', pillars.year.branch], ['月', pillars.month.branch], ['日', pillars.day.branch], ['時', pillars.hour.branch]];
    const rel = [];
    const pairKey = (a, b) => [a, b].sort((x, y) => C.BRANCHES.indexOf(x) - C.BRANCHES.indexOf(y)).join('');
    // 兩兩關係
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const [pa, ba] = pos[i], [pb, bb] = pos[j];
        const ia = C.BRANCHES.indexOf(ba), ib = C.BRANCHES.indexOf(bb);
        const where = `${pa}支${ba}—${pb}支${bb}`;
        if (C.mod(ia - ib, 12) === 6) rel.push({ kind: '六沖', where, note: '對衝——該兩柱領域互相拉扯、易動盪變遷' });
        if (LIUHE[pairKey(ba, bb)]) rel.push({ kind: '六合', where, elem: LIUHE[pairKey(ba, bb)], note: `合化${LIUHE[pairKey(ba, bb)]}——黏合互援，也可能互相牽制` });
        if (LIUHAI.includes(pairKey(ba, bb)) || LIUHAI.includes(bb + ba) || LIUHAI.includes(ba + bb)) rel.push({ kind: '六害', where, note: '相害——暗中損耗，多為隱性摩擦' });
        if ((ba === '子' && bb === '卯') || (ba === '卯' && bb === '子')) rel.push({ kind: '相刑', where, note: '子卯無禮之刑——界線議題' });
        if (ba === bb && ZIXING.includes(ba)) rel.push({ kind: '自刑', where, note: `${ba}${ba}自刑——同質過旺、自我內耗` });
      }
    }
    // 三合／半合
    const branchSet = pos.map((p) => p[1]);
    for (const [trio, elem] of Object.entries(SANHE)) {
      const hit = trio.split('').filter((b) => branchSet.includes(b));
      if (hit.length === 3) rel.push({ kind: '三合局', where: hit.join(''), elem, note: `三合${elem}局——${elem}性主題貫穿全局` });
      else if (hit.length === 2 && hit.includes(trio[1])) rel.push({ kind: '半合', where: hit.join(''), elem, note: `半合${elem}——${elem}性傾向增幅` });
    }
    for (const [trio, elem] of Object.entries(SANHUI)) {
      const hit = trio.split('').filter((b) => branchSet.includes(b));
      if (hit.length === 3) rel.push({ kind: '三會方', where: trio, elem, note: `三會${elem}方——${elem}氣成勢` });
    }
    // 三刑
    for (const [a, b, c, name] of XING_TRIO) {
      const hit = [a, b, c].filter((x) => branchSet.includes(x));
      if (hit.length >= 2) rel.push({ kind: hit.length === 3 ? '三刑' : '相刑', where: hit.join(''), note: `${name}${hit.length === 3 ? '全' : '（二字）'}——權責與規則的反覆碰撞` });
    }
    return rel;
  }

  /* ---------- 主計算 ---------- */
  // input: {y,m,d,hh,mm,tz,lon,lat,sex:'male'|'female', useTrueSolar:bool, dayBoundary:'23'|'0'}
  function compute(input) {
    const notes = [];
    const utc = C.toUTC(input);

    // ── 時辰使用的當地小時數
    let localHours;
    if (input.useTrueSolar) {
      localHours = C.trueSolarHours(utc, input.lon);
      notes.push('時柱採真太陽時（含均時差修正）');
    } else {
      const cv = C.civilOf(utc, input.tz);
      localHours = cv.hh + cv.mm / 60 + cv.ss / 3600;
      notes.push('時柱採輸入之標準鐘錶時間（未用真太陽時）');
    }

    // ── 年柱（立春界，精確時刻）
    const cvl = C.civilOf(utc, input.tz);
    let sujYear = cvl.y;
    const lichun = C.lichunOf(sujYear);
    if (utc < lichun) sujYear -= 1;
    const yearGZ = C.ganzhi(C.mod(sujYear - 1984, 60));

    // ── 月柱（節界）
    const jie = C.bracketingJie(utc);
    const monthBranchIdx = JIE_TO_BRANCH[jie.prev.lon];
    // 五虎遁：由年干求寅月干，順推
    const yinStem = C.WUHU[yearGZ.stemIdx];
    const monthOffset = C.mod(monthBranchIdx - 2, 12);
    const monthStemIdx = C.mod(yinStem + monthOffset, 10);
    const monthGZ = C.ganzhi(C.ganzhiIdx(monthStemIdx, monthBranchIdx));

    // ── 日柱（日界可選 23:00 或 00:00；預設 23:00 起換日）
    const boundary = input.dayBoundary || '23';
    let civil = C.civilOf(utc, input.tz);
    let dayShift = 0;
    if (boundary === '23' && localHours >= 23) dayShift = 1;
    const jdn = C.jdnFromCivil(civil.y, civil.m, civil.d) + dayShift;
    const dayGZ = C.ganzhi(jdn - DAY_ANCHOR_JDN);
    notes.push(boundary === '23' ? '日界採 23:00（夜子時起算翌日）；另派主張 00:00 換日' : '日界採 00:00（晚子時不換日派）');

    // ── 時柱（五鼠遁）
    const hbIdx = C.hourBranchIdx(localHours);
    const ziStem = C.WUSHU[dayGZ.stemIdx];
    const hourStemIdx = C.mod(ziStem + hbIdx, 10);
    const hourGZ = C.ganzhi(C.ganzhiIdx(hourStemIdx, hbIdx));

    const pillars = { year: yearGZ, month: monthGZ, day: dayGZ, hour: hourGZ };

    // ── 十神（干＋藏干）
    const ds = dayGZ.stemIdx;
    const stemGods = {
      year: tenGod(ds, yearGZ.stemIdx),
      month: tenGod(ds, monthGZ.stemIdx),
      day: '日主',
      hour: tenGod(ds, hourGZ.stemIdx),
    };
    const hidden = {};
    for (const [k, gz] of Object.entries(pillars)) {
      hidden[k] = C.HIDDEN_STEMS[gz.branch].map(([stem, layer]) => ({
        stem, layer,
        god: tenGod(ds, C.STEMS.indexOf(stem)),
      }));
    }

    // ── 五行雷達（區塊G計分：天干各1.0、地支本氣1.0（月支×1.5）、中氣0.5、餘氣0.3）
    const elemScore = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const scoringDetail = [];
    for (const [k, gz] of Object.entries(pillars)) {
      elemScore[C.STEM_ELEM[gz.stemIdx]] += 1.0;
      scoringDetail.push(`${k === 'year' ? '年' : k === 'month' ? '月' : k === 'day' ? '日' : '時'}干${gz.stem} ${C.STEM_ELEM[gz.stemIdx]}+1.0`);
      for (const [stem, layer] of C.HIDDEN_STEMS[gz.branch]) {
        let w = layer === 'main' ? 1.0 : layer === 'mid' ? 0.5 : 0.3;
        if (k === 'month' && layer === 'main') w = 1.5;
        elemScore[C.STEM_ELEM[C.STEMS.indexOf(stem)]] += w;
      }
    }
    const totalScore = Object.values(elemScore).reduce((a, b) => a + b, 0);
    const elemPct = {};
    for (const e of Object.keys(elemScore)) elemPct[e] = elemScore[e] / totalScore * 100;

    // ── 十神分佈統計（干1.0 + 藏干加權）
    const godScore = { 比劫: 0, 食傷: 0, 財星: 0, 官殺: 0, 印星: 0 };
    for (const [k, g] of Object.entries(stemGods)) if (g !== '日主') godScore[TENGOD_GROUP[g]] += 1.0;
    for (const [k, hs] of Object.entries(hidden)) {
      for (const h of hs) {
        let w = h.layer === 'main' ? 1.0 : h.layer === 'mid' ? 0.5 : 0.3;
        if (k === 'month' && h.layer === 'main') w = 1.5;
        if (!(k === 'day' && h.layer === 'main' && h.stem === dayGZ.stem)) godScore[TENGOD_GROUP[h.god]] += w;
      }
    }

    // ── 身強弱（簡化判定，標注流派敏感）
    const de = C.STEM_ELEM[ds];
    const supportElems = [de, Object.keys(GEN).find((k) => GEN[k] === de)]; // 同我＋生我
    const monthMain = C.STEM_ELEM[C.STEMS.indexOf(C.HIDDEN_STEMS[monthGZ.branch][0][0])];
    const deLing = supportElems.includes(monthMain);
    const supportPct = supportElems.reduce((a, e) => a + elemPct[e], 0);
    let strength, strengthScore = supportPct + (deLing ? 12 : -6);
    if (strengthScore >= 55) strength = '身強';
    else if (strengthScore >= 42) strength = '中和偏強';
    else if (strengthScore >= 34) strength = '中和偏弱';
    else strength = '身弱';

    // ── 喜用神（扶抑＋調候，演算法簡化版，標注）
    const weakSide = supportElems; // 印比
    const strongSide = [GEN[de], KE[de], Object.keys(KE).find((k) => KE[k] === de)]; // 食傷/財/官殺
    let favorable = (strength === '身強' || strength === '中和偏強') ? strongSide : weakSide;
    // 調候：夏生喜水、冬生喜火（燥濕寒暖）
    const mb = monthGZ.branch;
    let tiaohou = null;
    if ('巳午未'.includes(mb)) tiaohou = '水';
    if ('亥子丑'.includes(mb)) tiaohou = '火';
    if (tiaohou && !favorable.includes(tiaohou)) favorable = [tiaohou].concat(favorable);
    const unfavorable = ['木', '火', '土', '金', '水'].filter((e) => !favorable.includes(e));

    // ── 神煞
    const branches = { 年: yearGZ.branch, 月: monthGZ.branch, 日: dayGZ.branch, 時: hourGZ.branch };
    const stems = { 年: yearGZ.stem, 月: monthGZ.stem, 日: dayGZ.stem, 時: hourGZ.stem };
    const shensha = [];
    function scanBranch(name, want, baseDesc) {
      const hits = Object.entries(branches).filter(([, b]) => want.includes(b)).map(([p]) => p);
      if (hits.length) shensha.push({ name, at: hits.join('、') + '支', desc: baseDesc });
    }
    scanBranch('天乙貴人', TIANYI[dayGZ.stem] || '', '日干起——遇難有助之貴氣位');
    scanBranch('文昌', WENCHANG[dayGZ.stem] || '', '日干起——文思學業之星');
    scanBranch('祿神', LU[dayGZ.stem] || '', '日干之祿——本氣強根');
    if (YANGREN[dayGZ.stem]) scanBranch('羊刃', YANGREN[dayGZ.stem], '陽刃——energy 過旺之刃，主爆發與耗損');
    const ybG = SANHE_GROUP(yearGZ.branch), dbG = SANHE_GROUP(dayGZ.branch);
    scanBranch('桃花', TAOHUA[ybG] + TAOHUA[dbG], '年/日支三合起——人緣魅力');
    scanBranch('驛馬', YIMA[ybG] + YIMA[dbG], '年/日支三合起——移動變遷');
    scanBranch('華蓋', HUAGAI[ybG] + HUAGAI[dbG], '年/日支三合起——孤高、宗教哲思藝術');
    scanBranch('將星', JIANGXING[ybG] + JIANGXING[dbG], '年/日支三合起——領導統御');
    // 天德月德（月支查干或支）
    const td = TIANDE[monthGZ.branch];
    if (td && (Object.values(stems).includes(td) || Object.values(branches).includes(td))) {
      shensha.push({ name: '天德貴人', at: '柱中見' + td, desc: '化險呈祥之德' });
    }
    const yd = YUEDE(monthGZ.branch);
    if (Object.values(stems).includes(yd)) shensha.push({ name: '月德貴人', at: '柱中見' + yd, desc: '仁善之德' });
    if (KUIGANG.includes(dayGZ.name)) shensha.push({ name: '魁罡', at: '日柱' + dayGZ.name, desc: '性格剛烈果決，聰明但極端' });

    // ── 空亡（日柱旬）
    const xun = Math.floor(dayGZ.idx / 10);
    const kong = [C.BRANCHES[C.mod(10 - xun * 2, 12)], C.BRANCHES[C.mod(11 - xun * 2, 12)]];
    const kongHits = Object.entries(branches).filter(([p, b]) => kong.includes(b) && p !== '日').map(([p]) => p);

    // ── 格局（簡化：月支本氣透干優先）
    const monthMainStem = C.HIDDEN_STEMS[monthGZ.branch][0][0];
    let pattern = null;
    const transparent = Object.entries(stems).filter(([p, s]) => p !== '日' && C.HIDDEN_STEMS[monthGZ.branch].some(([hs]) => hs === s));
    if (transparent.length) {
      const g = tenGod(ds, C.STEMS.indexOf(transparent[0][1]));
      pattern = { name: g + '格', how: `月支${monthGZ.branch}藏干${transparent[0][1]}透出於${transparent[0][0]}干` };
    } else {
      const g = tenGod(ds, C.STEMS.indexOf(monthMainStem));
      pattern = { name: g + '格', how: `月支${monthGZ.branch}本氣${monthMainStem}取格（未透干）` };
    }
    if (['比肩', '劫財'].some((g) => pattern.name.startsWith(g))) {
      pattern = { name: deLing ? '建祿／月刃格' : pattern.name, how: pattern.how };
    }

    // ── 大運
    const yang = C.STEM_YANG[yearGZ.stemIdx];
    const forward = (yang && input.sex === 'male') || (!yang && input.sex === 'female');
    const refJie = forward ? jie.next.date : jie.prev.date;
    const diffDays = Math.abs(refJie.getTime() - utc.getTime()) / 86400000;
    const startAgeYears = diffDays / 3; // 3日=1年
    const luckSteps = [];
    for (let i = 1; i <= 9; i++) {
      const gz = C.ganzhi(monthGZ.idx + (forward ? i : -i));
      const ageFrom = startAgeYears + (i - 1) * 10;
      luckSteps.push({
        gz, ageFrom: Math.round(ageFrom * 10) / 10, ageTo: Math.round((ageFrom + 10) * 10) / 10,
        yearFrom: Math.round(cvl.y + ageFrom), yearTo: Math.round(cvl.y + ageFrom + 10),
        stemGod: tenGod(ds, gz.stemIdx),
        branchMainGod: tenGod(ds, C.STEMS.indexOf(C.HIDDEN_STEMS[gz.branch][0][0])),
        stemElem: C.STEM_ELEM[gz.stemIdx],
        branchElem: C.BRANCH_ELEM[gz.branchIdx],
        favorableHit: [C.STEM_ELEM[gz.stemIdx], C.BRANCH_ELEM[gz.branchIdx]].filter((e) => favorable.includes(e)).length,
      });
    }

    // ── 時期演化雷達（區塊H：本命＋大運干支各1.0 逐十年重算）
    const evolution = luckSteps.map((st) => {
      const es = Object.assign({}, elemScore);
      es[st.stemElem] += 1.0;
      es[st.branchElem] += 1.0;
      const tot = Object.values(es).reduce((a, b) => a + b, 0);
      const pct = {};
      for (const e of Object.keys(es)) pct[e] = es[e] / tot * 100;
      const favPct = favorable.reduce((a, e) => a + (pct[e] || 0), 0);
      return { label: `${st.ageFrom}–${st.ageTo}歲 ${st.gz.name}運`, pct, favPct, gz: st.gz.name };
    });

    const relations = branchRelations(pillars);
    const dayClash = relations.some((r) => r.kind === '六沖' && r.where.includes('日支'));

    return {
      utc, localHours, pillars, stemGods, hidden, elemScore, elemPct, scoringDetail, relations, dayClash,
      godScore, strength, strengthScore, deLing, dayMaster: { stem: dayGZ.stem, elem: de, yang: C.STEM_YANG[ds] },
      favorable, unfavorable, tiaohou, shensha, kong, kongHits, pattern,
      luck: { forward, startAgeYears: Math.round(startAgeYears * 100) / 100, refJieName: forward ? jie.next.name : jie.prev.name, steps: luckSteps },
      evolution, jie, notes,
    };
  }

  ML.bazi = { compute, tenGod, TENGOD_GROUP, GEN, KE, branchRelations };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
