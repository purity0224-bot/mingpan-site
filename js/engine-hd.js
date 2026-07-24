/* =========================================================
 * 人類圖 Human Design ＋ Gene Keys 引擎
 * 設計端＝太陽黃經回推 88°（二分搜尋精確時刻）
 * 曼陀羅：閘門 41 起於水瓶 2°00′（黃經 302°），每閘 5.625°、每爻 0.9375°
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;

  // 黃道順序閘門輪（自黃經 302° 起）
  const WHEEL = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
    27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
    31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
    28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60];
  const WHEEL_START = 302; // 水瓶 2°00′

  const CENTERS = ['頭腦', '邏輯（Ajna）', '喉嚨', 'G（自我）', '意志（心）', '薦骨', '直覺（脾）', '情緒（太陽神經叢）', '根部'];
  const CENTER_OF_GATE = {
    64: 0, 61: 0, 63: 0,
    47: 1, 24: 1, 4: 1, 17: 1, 43: 1, 11: 1,
    62: 2, 23: 2, 56: 2, 35: 2, 12: 2, 45: 2, 33: 2, 8: 2, 31: 2, 20: 2, 16: 2,
    1: 3, 13: 3, 25: 3, 46: 3, 2: 3, 15: 3, 10: 3, 7: 3,
    26: 4, 51: 4, 21: 4, 40: 4,
    34: 5, 5: 5, 14: 5, 29: 5, 59: 5, 9: 5, 3: 5, 42: 5, 27: 5,
    48: 6, 57: 6, 44: 6, 50: 6, 32: 6, 28: 6, 18: 6,
    36: 7, 22: 7, 37: 7, 6: 7, 49: 7, 55: 7, 30: 7,
    53: 8, 60: 8, 52: 8, 19: 8, 39: 8, 41: 8, 58: 8, 38: 8, 54: 8,
  };
  const MOTOR_CENTERS = [4, 5, 7, 8]; // 意志、薦骨、情緒、根部
  const THROAT = 2;

  const CHANNELS = [
    [64, 47, '抽象'], [61, 24, '覺知'], [63, 4, '邏輯'],
    [17, 62, '組織（接納）'], [43, 23, '架構'], [11, 56, '好奇'],
    [1, 8, '啟發'], [13, 33, '浪蕩者'], [7, 31, '領導'], [10, 20, '覺醒'],
    [16, 48, '波長（才華）'], [20, 57, '腦波'], [12, 22, '開放'], [35, 36, '無常'],
    [21, 45, '金錢線'], [20, 34, '魅力'],
    [2, 14, '脈動（煉金）'], [5, 15, '韻律'], [29, 46, '發現'], [25, 51, '發起'],
    [10, 57, '完美形式'], [10, 34, '探索'], [26, 44, '投降（傳訊）'], [37, 40, '社群'],
    [27, 50, '保存'], [34, 57, '力量'], [59, 6, '親密'],
    [3, 60, '突變'], [9, 52, '專注'], [42, 53, '成熟'],
    [18, 58, '批判（評判）'], [28, 38, '掙扎（頑強）'], [32, 54, '蛻變（企圖心）'],
    [30, 41, '夢想（慾望）'], [39, 55, '情緒（多愁善感）'], [19, 49, '整合（愛與婚姻）'],
  ];

  const GATE_NAMES = {
    1: '創意', 2: '接納（方向）', 3: '開始（秩序）', 4: '公式化', 5: '固定模式（等待）', 6: '摩擦',
    7: '自我角色', 8: '貢獻', 9: '聚焦', 10: '自我行為', 11: '想法', 12: '謹慎',
    13: '聆聽者', 14: '強力技能', 15: '極端（韻律）', 16: '技能（熱忱）', 17: '意見', 18: '修正',
    19: '需求（靠近）', 20: '當下', 21: '控制（獵人）', 22: '優雅（開放）', 23: '同化', 24: '合理化',
    25: '純真（自我精神）', 26: '利己者', 27: '照顧', 28: '玩家（冒險）', 29: '承諾', 30: '感覺（慾望）',
    31: '影響力', 32: '延續', 33: '隱私（退隱）', 34: '力量', 35: '改變（進展）', 36: '危機',
    37: '友誼（家庭）', 38: '戰士（對抗）', 39: '挑釁', 40: '獨處（意志）', 41: '收縮（幻想）', 42: '成長',
    43: '洞見', 44: '警覺', 45: '收集者', 46: '身體之愛（決心）', 47: '領悟', 48: '深度',
    49: '原則（革命）', 50: '價值觀', 51: '衝擊', 52: '靜止（山）', 53: '開始（發展）', 54: '企圖心',
    55: '精神（豐盛）', 56: '刺激（說故事）', 57: '直覺', 58: '喜悅（活力）', 59: '性（親密）', 60: '接受（限制）',
    61: '內在真理', 62: '細節', 63: '懷疑', 64: '困惑',
  };

  // Gene Keys：陰影 / 天賦 / 悉地（Richard Rudd 標準對照之中譯）
  const GENE_KEYS = {
    1: ['熵（呆滯）', '新鮮', '美'], 2: ['錯位', '定向', '合一'], 3: ['混亂', '創新', '天真'],
    4: ['不寬容', '理解', '寬恕'], 5: ['不耐', '耐心', '永恆'], 6: ['衝突', '圓融', '和平'],
    7: ['分裂', '引導', '美德'], 8: ['平庸', '風格', '精妙'], 9: ['慣性', '決心', '無敵'],
    10: ['自我執迷', '自然', '存在'], 11: ['晦暗', '理想', '光'], 12: ['虛榮', '明辨', '純淨'],
    13: ['不和', '洞察', '同理'], 14: ['妥協', '勝任', '豐盛'], 15: ['沉悶', '磁性', '繁盛'],
    16: ['冷漠', '多才', '精通'], 17: ['意見', '遠見', '全知'], 18: ['批判', '正直', '完美'],
    19: ['依附', '敏感', '犧牲'], 20: ['淺薄', '自信', '臨在'], 21: ['控制', '威信', '英勇'],
    22: ['失禮', '優雅', '恩典'], 23: ['複雜', '簡明', '精髓'], 24: ['成癮', '發明', '寂靜'],
    25: ['束縛', '接納', '大愛'], 26: ['傲慢', '巧藝', '無形'], 27: ['自私', '利他', '無私'],
    28: ['無目的', '全然', '不朽'], 29: ['三心二意', '承諾', '奉獻'], 30: ['慾望', '輕盈', '狂喜'],
    31: ['自大', '領導', '謙卑'], 32: ['失敗', '保存', '崇敬'], 33: ['遺忘', '正念', '啟示'],
    34: ['蠻力', '力量', '威嚴'], 35: ['飢渴', '冒險', '無界'], 36: ['動盪', '人性', '慈悲'],
    37: ['軟弱', '平等', '柔情'], 38: ['掙扎', '堅毅', '榮耀'], 39: ['挑釁', '動能', '解脫'],
    40: ['耗竭', '決斷', '神聖意志'], 41: ['幻想', '期待', '流溢'], 42: ['期望', '超然', '慶祝'],
    43: ['充耳不聞', '洞見', '頓悟'], 44: ['干擾', '協作', '共治'], 45: ['支配', '綜效', '共融'],
    46: ['嚴肅', '欣喜', '忘我'], 47: ['壓抑', '轉化', '變容'], 48: ['匱乏感', '機智', '智慧'],
    49: ['反應', '革命', '重生'], 50: ['腐化', '平衡', '和諧'], 51: ['焦躁', '主動', '覺醒'],
    52: ['壓力', '克制', '靜定'], 53: ['不成熟', '擴展', '滿溢'], 54: ['貪婪', '志向', '揚升'],
    55: ['受害', '自由', '自由'], 56: ['分心', '滋養', '陶醉'], 57: ['不安', '直覺', '澄澈'],
    58: ['不滿', '活力', '至樂'], 59: ['不誠', '親密', '透明'], 60: ['限制', '務實', '公正'],
    61: ['迷妄', '靈感', '神聖'], 62: ['智識', '精準', '無瑕'], 63: ['懷疑', '探究', '真理'],
    64: ['困惑', '想像', '照見'],
  };

  function gateOf(lon) {
    const off = C.mod(lon - WHEEL_START, 360);
    const gi = Math.floor(off / 5.625);
    const line = Math.floor((off % 5.625) / 0.9375) + 1;
    return { gate: WHEEL[gi], line };
  }

  const HD_BODIES = ['Sun', 'Earth', 'Moon', 'NorthNode', 'SouthNode', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const HD_BODY_ZH = { Sun: '太陽', Earth: '地球', Moon: '月亮', NorthNode: '北交', SouthNode: '南交', Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', Uranus: '天王', Neptune: '海王', Pluto: '冥王' };

  function activationsAt(dateUTC) {
    const acts = [];
    const sun = C.eclLon('Sun', dateUTC).lon;
    const node = C.meanLunarNode(dateUTC);
    const lonOf = {
      Sun: sun, Earth: C.norm360(sun + 180),
      NorthNode: node, SouthNode: C.norm360(node + 180),
    };
    for (const b of ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) {
      lonOf[b] = C.eclLon(b, dateUTC).lon;
    }
    for (const b of HD_BODIES) {
      const g = gateOf(lonOf[b]);
      acts.push({ body: b, bodyZh: HD_BODY_ZH[b], lon: lonOf[b], gate: g.gate, line: g.line });
    }
    return acts;
  }

  function compute(input) {
    const utc = C.toUTC(input);
    const A = C.AE();

    // 個性端
    const personality = activationsAt(utc);
    const natalSun = personality.find((a) => a.body === 'Sun').lon;

    // 設計端：太陽黃經 = 本命 − 88°
    const target = C.norm360(natalSun - 88);
    const searchStart = A.MakeTime(new Date(utc.getTime() - 105 * 86400000));
    const found = A.SearchSunLongitude(target, searchStart, 40);
    if (!found) throw new Error('HD design time search failed');
    const designUTC = found.date;
    const design = activationsAt(designUTC);

    // 已啟動閘門
    const gates = new Set();
    for (const a of personality) gates.add(a.gate);
    for (const a of design) gates.add(a.gate);

    // 通道與中心
    const channels = CHANNELS.filter(([a, b]) => gates.has(a) && gates.has(b))
      .map(([a, b, name]) => ({ a, b, name, centers: [CENTER_OF_GATE[a], CENTER_OF_GATE[b]] }));
    const definedCenters = new Set();
    for (const ch of channels) { definedCenters.add(ch.centers[0]); definedCenters.add(ch.centers[1]); }

    // 中心三態＋閘門密度
    const centerStates = CENTERS.map((name, i) => {
      const gs = [...gates].filter((g) => CENTER_OF_GATE[g] === i);
      return {
        idx: i, name,
        state: definedCenters.has(i) ? 'defined' : gs.length ? 'gated' : 'open',
        gates: gs.sort((x, y) => x - y),
      };
    });

    // 連通性（判斷馬達→喉嚨、定義分裂數）
    const adj = new Map();
    for (const ch of channels) {
      const [c1, c2] = ch.centers;
      if (!adj.has(c1)) adj.set(c1, new Set());
      if (!adj.has(c2)) adj.set(c2, new Set());
      adj.get(c1).add(c2); adj.get(c2).add(c1);
    }
    function reachable(from) {
      const seen = new Set([from]);
      const stack = [from];
      while (stack.length) {
        const c = stack.pop();
        for (const n of adj.get(c) || []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
      }
      return seen;
    }
    let motorToThroat = false;
    if (definedCenters.has(THROAT)) {
      const reach = reachable(THROAT);
      motorToThroat = MOTOR_CENTERS.some((m) => reach.has(m));
    }
    // 定義分裂數
    const comps = [];
    const seenC = new Set();
    for (const c of definedCenters) {
      if (seenC.has(c)) continue;
      const comp = reachable(c);
      for (const x of comp) seenC.add(x);
      comps.push(comp);
    }
    const definition = comps.length === 0 ? '無定義' : ['一分人（單一定義）', '二分人（分裂定義）', '三分人', '四分人'][comps.length - 1];

    // 類型
    const sacral = definedCenters.has(5);
    let type;
    if (definedCenters.size === 0) type = '反映者 Reflector';
    else if (sacral) type = motorToThroat ? '顯示生產者 MG' : '生產者 Generator';
    else if (motorToThroat) type = '顯示者 Manifestor';
    else type = '投射者 Projector';

    // 內在權威
    let authority;
    if (definedCenters.size === 0) authority = '月亮週期（等 28 天）';
    else if (definedCenters.has(7)) authority = '情緒權威（等情緒週期過完）';
    else if (sacral) authority = '薦骨權威（當下的身體回應）';
    else if (definedCenters.has(6)) authority = '直覺權威（一次性的微弱訊號）';
    else if (definedCenters.has(4)) authority = '意志權威（我要／我不要）';
    else if (definedCenters.has(3) && (adj.get(3) || new Set()).has(THROAT)) authority = '自我投射權威（聽自己說出口的話）';
    else authority = '環境／頭腦權威（找對的人與場地談過再定）';

    // 人生角色
    const pSunLine = personality.find((a) => a.body === 'Sun').line;
    const dSunLine = design.find((a) => a.body === 'Sun').line;
    const profile = `${pSunLine}/${dSunLine}`;
    const PROFILE_NAMES = {
      '1/3': '調查者／烈士', '1/4': '調查者／機會主義者', '2/4': '隱士／機會主義者', '2/5': '隱士／異端者',
      '3/5': '烈士／異端者', '3/6': '烈士／人生典範', '4/6': '機會主義者／人生典範', '4/1': '機會主義者／調查者',
      '5/1': '異端者／調查者', '5/2': '異端者／隱士', '6/2': '人生典範／隱士', '6/3': '人生典範／烈士',
    };
    const RIGHT_ANGLE = ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6'];
    const crossAngle = profile === '4/1' ? '並列（Juxtaposition）' : RIGHT_ANGLE.includes(profile) ? '右角度（個人業力）' : '左角度（人際業力）';

    // 輪迴交叉四閘門
    const crossGates = {
      pSun: personality.find((a) => a.body === 'Sun').gate,
      pEarth: personality.find((a) => a.body === 'Earth').gate,
      dSun: design.find((a) => a.body === 'Sun').gate,
      dEarth: design.find((a) => a.body === 'Earth').gate,
    };

    // Gene Keys 四正（Life's Work / Evolution / Radiance / Purpose）
    const geneKeys = [
      { role: '人生志業（個性太陽）', gate: crossGates.pSun },
      { role: '演化課題（個性地球）', gate: crossGates.pEarth },
      { role: '光芒（設計太陽）', gate: crossGates.dSun },
      { role: '天命基石（設計地球）', gate: crossGates.dEarth },
    ].map((g) => ({
      ...g, name: GATE_NAMES[g.gate],
      shadow: GENE_KEYS[g.gate][0], gift: GENE_KEYS[g.gate][1], siddhi: GENE_KEYS[g.gate][2],
    }));

    return {
      utc, designUTC, personality, design, gates: [...gates].sort((a, b) => a - b),
      channels, centerStates, definedCenters: [...definedCenters].map((i) => CENTERS[i]),
      definition, type, authority, profile,
      profileName: PROFILE_NAMES[profile] || profile, crossAngle, crossGates, geneKeys,
      splitCount: comps.length,
    };
  }

  ML.hd = { compute, gateOf, WHEEL, CHANNELS, CENTERS, CENTER_OF_GATE, GATE_NAMES, GENE_KEYS, HD_BODY_ZH };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
