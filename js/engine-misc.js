/* =========================================================
 * 補充系統：生命靈數＋塔羅生日牌、馬雅 13 月亮曆（Dreamspell）、
 * 八宅命卦、宿曜二十八宿
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;

  /* ---------- 生命靈數 ---------- */
  const NUM_MEANING = {
    1: '開創・獨立・意志', 2: '協調・感應・陪伴', 3: '表達・創意・社交',
    4: '結構・秩序・執行', 5: '自由・變化・冒險', 6: '照顧・責任・美感',
    7: '分析・真理・內省', 8: '權力・豐盛・掌控', 9: '慈悲・理想・整合',
    11: '靈感大師數（高壓版的2）', 22: '建築大師數（高壓版的4）', 33: '奉獻大師數（高壓版的6）',
  };
  function digitSum(n) { return String(n).split('').reduce((a, d) => a + (+d), 0); }
  function lifePath(y, m, d) {
    const digits = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
    let total = digits.split('').reduce((a, x) => a + (+x), 0);
    const steps = [total];
    let master = null;
    while (total > 9) {
      if (total === 11 || total === 22 || total === 33) { master = total; break; }
      total = digitSum(total);
      steps.push(total);
    }
    // 數字頻次（0 不計）
    const freq = {}; for (let i = 1; i <= 9; i++) freq[i] = 0;
    for (const ch of digits) if (ch !== '0') freq[+ch]++;
    const missing = Object.entries(freq).filter(([, v]) => v === 0).map(([k]) => +k);
    const peaks = Object.entries(freq).filter(([, v]) => v >= 2).map(([k, v]) => ({ n: +k, count: v }));
    let birthday = d; while (birthday > 9 && birthday !== 11 && birthday !== 22) birthday = digitSum(birthday);
    return {
      main: master || total, master, steps, freq, missing, peaks, birthday,
      meaning: NUM_MEANING[master || total], birthdayMeaning: NUM_MEANING[birthday],
    };
  }

  /* ---------- 塔羅生日牌（Tarot School 標準法） ---------- */
  // 月＋日＋年前兩位＋年後兩位（四組兩位數相加）；
  // 三位數的和 → 前兩位當一個數＋末位；兩位數 >22 → 逐位相加；
  // ≤22 為第一張牌（22＝愚者），再逐位縮減得後續牌；19→10→1 自然形成三張牌特例
  const TAROT = ['愚者', '魔術師', '女祭司', '皇后', '皇帝', '教皇', '戀人', '戰車', '力量', '隱者', '命運之輪',
    '正義', '倒吊人', '死神', '節制', '惡魔', '高塔', '星星', '月亮', '太陽', '審判', '世界'];
  function birthCards(y, m, d) {
    let sum = m + d + Math.floor(y / 100) + (y % 100);
    while (sum > 22) sum = Math.floor(sum / 10) + (sum % 10); // 134→13+4=17；25→2+5=7
    const chain = [sum];
    let v = sum;
    while (v > 9) { v = digitSum(v); chain.push(v); }
    return chain.map((i) => ({ idx: i === 22 ? 0 : i, name: TAROT[i === 22 ? 0 : i] }));
  }

  /* ---------- 馬雅 13 月亮曆（Dreamspell；錨點 2013-07-26 = Kin164；跳過 2/29） ---------- */
  const SEALS = ['紅龍', '白風', '藍夜', '黃種子', '紅蛇', '白世界橋', '藍手', '黃星星', '紅月', '白狗',
    '藍猴', '黃人', '紅天行者', '白巫師', '藍鷹', '黃戰士', '紅地球', '白鏡', '藍風暴', '黃太陽'];
  const SEAL_KEYS = ['誕生・滋養', '傳訊・呼吸', '豐盛・直覺(夢)', '目標・覺察', '生命力・本能', '死亡・機會(橋)', '完成・療癒', '優雅・藝術', '淨化・流動', '愛・忠誠',
    '魔法・遊戲', '自由意志・影響', '探索・穿越', '永恆・施法', '視野・創造心智', '無懼・智性', '導航・共時', '映照・秩序', '自生・催化', '開悟・普照'];
  const TONES = ['磁性', '月亮', '電力', '自我存在', '超頻', '韻律', '共振', '銀河星系', '太陽', '行星', '光譜', '水晶', '宇宙'];
  const TONE_Q = ['吸引・目的', '極性・挑戰', '啟動・服務', '定義・形式', '賦權・光芒', '平衡・組織', '調頻・通道', '和諧・完整', '意圖・脈動', '顯化・完美', '釋放・解放', '合作・奉獻', '臨在・超越'];

  function mayaKin(y, m, d) {
    // 與錨點的天數差（民用日期差），扣除區間內所有 2/29
    const target = C.jdnFromCivil(y, m, d);
    const anchor = C.jdnFromCivil(2013, 7, 26); // Kin 164
    let diff = target - anchor;
    // 計算區間內 2/29 數
    function leapDaysBetween(a, b) { // 嚴格介於 (a, b]
      let cnt = 0;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const y0 = 1584, y1 = 2200;
      for (let yy = y0; yy <= y1; yy++) {
        if ((yy % 4 === 0 && yy % 100 !== 0) || yy % 400 === 0) {
          const j = C.jdnFromCivil(yy, 2, 29);
          if (j > lo && j <= hi) cnt++;
        }
      }
      return cnt;
    }
    const skips = leapDaysBetween(anchor, target);
    diff += diff >= 0 ? -skips : skips;
    if (m === 2 && d === 29) return { kin: null, note: '2/29 為「無時間日」（Hunab Ku 0.0），Dreamspell 不賦 Kin' };
    const kin = C.mod(164 - 1 + diff, 260) + 1;
    const tone = ((kin - 1) % 13) + 1;
    const seal = ((kin - 1) % 20) + 1;
    const waveKin = kin - (tone - 1);
    const waveSeal = ((C.mod(waveKin - 1, 260)) % 20) + 1;
    return {
      kin, tone, seal, sealName: SEALS[seal - 1], sealKey: SEAL_KEYS[seal - 1],
      toneName: TONES[tone - 1], toneKey: TONE_Q[tone - 1],
      wavespell: SEALS[waveSeal - 1] + '波符',
      title: `Kin${kin} ${TONES[tone - 1]}的${SEALS[seal - 1]}`,
    };
  }

  /* ---------- 八宅命卦（年界＝立春） ---------- */
  const GUA_INFO = {
    1: { name: '坎', elem: '水', group: '東四命' }, 2: { name: '坤', elem: '土', group: '西四命' },
    3: { name: '震', elem: '木', group: '東四命' }, 4: { name: '巽', elem: '木', group: '東四命' },
    6: { name: '乾', elem: '金', group: '西四命' }, 7: { name: '兌', elem: '金', group: '西四命' },
    8: { name: '艮', elem: '土', group: '西四命' }, 9: { name: '離', elem: '火', group: '東四命' },
  };
  const GUA_DIRS = { 坎: '北', 坤: '西南', 震: '東', 巽: '東南', 乾: '西北', 兌: '西', 艮: '東北', 離: '南' };
  function droot(n) { while (n > 9) n = digitSum(n); return n; }
  function mingGua(effYear, sex) {
    const s = droot(effYear);
    let g;
    if (sex === 'male') { g = 11 - s; if (g > 9) g -= 9; if (g === 5) g = 2; }
    else { g = s + 4; if (g > 9) g -= 9; if (g === 5) g = 8; }
    const info = GUA_INFO[g];
    return { gua: g, ...info, dir: GUA_DIRS[info.name] };
  }

  /* ---------- 宿曜二十八宿（宿曜經曆算法：27宿，不含牛宿；閏月同本月） ---------- */
  const XIUYAO_SEQ = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '女', '虛', '危', '室', '壁', '奎',
    '婁', '胃', '昴', '畢', '觜', '參', '井', '鬼', '柳', '星', '張', '翼', '軫'];
  const XIUYAO_MONTH_ANCHOR = { 1: '室', 2: '奎', 3: '胃', 4: '畢', 5: '參', 6: '鬼', 7: '張', 8: '角', 9: '氐', 10: '心', 11: '斗', 12: '虛' };
  const XIUYAO_KEY = {
    角: '開拓・進取・春木之銳', 亢: '剛毅・自尊・不肯低頭', 氐: '穩健・蓄積・根基深厚', 房: '華貴・享受・人望聚集',
    心: '洞察人心・魅力・易涉是非', 尾: '專注深入・持久・孤高', 箕: '豪放・不羈・口直心快', 斗: '格局遠大・統籌・晚成',
    女: '勤勉・堅韌・重然諾', 虛: '空靈・善變・靜中生慧', 危: '機敏・謹慎・險中求存', 室: '果敢・火性・先鋒之氣',
    壁: '溫厚・守成・文庫之藏', 奎: '文雅・內斂・潔身自好', 婁: '和順・圓融・眾緣和合', 胃: '剛烈・聚財・倉廩之實',
    昴: '銳利・明察・鋒芒外露', 畢: '誠實・厚重・慢熱長久', 觜: '機辯・口才・心思細密', 參: '行動果決・征伐・冒險',
    井: '才思敏捷・法度・清流', 鬼: '直覺敏感・幽微・悟性', 柳: '情感濃烈・執著・韌性', 星: '自尊・表現・陽剛之華',
    張: '華麗・展演・貴氣場面', 翼: '理想・飄泊・藝文之翼', 軫: '謀略・沉穩・終局收官',
  };
  function xiuyao(lunarMonthNo, lunarDay) {
    const anchor = XIUYAO_SEQ.indexOf(XIUYAO_MONTH_ANCHOR[lunarMonthNo]);
    const idx = (anchor + lunarDay - 1) % 27;
    const name = XIUYAO_SEQ[idx];
    return { name: name + '宿', key: XIUYAO_KEY[name] };
  }

  /* ---------- 主計算 ---------- */
  function compute(input, baziResult, lunarInfo) {
    const utc = C.toUTC(input);
    const cv = C.civilOf(utc, input.tz);
    const numerology = lifePath(input.y, input.m, input.d);
    const tarot = birthCards(input.y, input.m, input.d);
    const maya = mayaKin(input.y, input.m, input.d);
    const lunar = lunarInfo || C.lunarDate(utc);
    const benming = xiuyao(lunar.monthNo, lunar.day);

    // 立春界有效年（沿用八字年柱）
    let effYear = cv.y;
    const lichun = C.lichunOf(effYear);
    if (utc < lichun) effYear -= 1;
    const gua = mingGua(effYear, input.sex);

    return { numerology, tarot, maya, gua, effYear, xiuyao: benming };
  }

  ML.misc = { compute, lifePath, birthCards, mayaKin, mingGua, xiuyao, TAROT, SEALS, TONES, NUM_MEANING };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
