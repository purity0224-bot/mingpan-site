/* =========================================================
 * 深入解讀層：把各系統盤面翻成「有內容的白話」
 * 原則與 report.js 相同——全部規則式生成、來源可追、
 * 字典組合而非自由發揮；詮釋深度加深，但不越過盤面證據。
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const wrap = (title, body) => `<details class="deep-dive"><summary><strong>${title}</strong><span class="fold-hint">點開</span></summary>${body}</details>`;

  /* ================= 八字 ================= */
  const TEN_GOD = {
    比肩: '自立與同儕——靠自己，也與人並肩或競爭',
    劫財: '敢衝敢搶的行動力——執行猛，但破財與合夥糾紛也走這條線',
    食神: '溫和的才華輸出——享受、表達、口福，細水長流的創造力',
    傷官: '鋒利的才氣——聰明外露、敢挑戰權威，是亮點也是嘴上惹禍的來源',
    正財: '踏實的現實感——按部就班的收入、務實的感情觀',
    偏財: '機會財與人脈財——來得快去得快，慷慨、會做人',
    正官: '規範與名分——責任感、被體制期待，走正路的晉升線',
    七殺: '壓力與魄力——危機中反而冷靜掌權，平時是緊繃的來源',
    正印: '庇蔭與學問——長輩貴人、名聲信用、吸收力強',
    偏印: '另類的洞察——非主流專業、直覺敏銳，帶點孤獨的學問',
  };
  const PILLAR_STAGE = {
    year: ['年柱', '祖上與童年（約 1–16 歲）', '家風與早年環境，也是你的「對外門面」'],
    month: ['月柱', '父母與青年（約 17–32 歲）', '原生家庭氛圍與踏入社會的舞台——全盤格局多由此柱定調'],
    day: ['日柱', '自我與婚姻（約 33–48 歲）', '天干是你本人，地支是你的「內室」：身體、伴侶與私領域'],
    hour: ['時柱', '子女與晚年（49 歲後）', '後代緣分與晚景，也是你的「作品與傳承」位'],
  };
  const GOD_GROUP_HI = {
    比劫: '主體性與行動量大：靠自己、不太服管；朋友兄弟是助力，也是分財分資源的人',
    食傷: '輸出旺盛：才藝、表達、創作與享受的能量足——但也容易管不住嘴、鋒芒傷人',
    財星: '現實感與目標感強：對錢與資源敏感，慾望是你的引擎，做事會算投報',
    官殺: '規範與壓力並存：責任感重、扛得住位子，但常年活在「應該」裡，要留意緊繃',
    印星: '吸收與庇蔭強：學習快、長輩緣好、重名聲信用——但易「想很多、動很少」',
  };
  const GOD_GROUP_LO = {
    比劫: '同儕依賴低：習慣單打獨鬥，遇事少呼朋引伴——團體戰要刻意練',
    食傷: '輸出口窄：想法多但表達少，成果常被低估——刻意建立輸出管道是最划算的投資',
    財星: '對錢的驅力弱：動力來自興趣與意義，理財要靠制度、不能靠慾望',
    官殺: '不受框架管：自由度高，但在大組織裡的爬梯動力偏弱——選環境比忍環境重要',
    印星: '靠實戰不靠學歷：吸收偏「用中學」，也較少倚賴他人庇蔭——自己的路自己鋪',
  };
  const GROUP_TAG = { 比劫: '自我與同儕系', 食傷: '輸出與才華系', 財星: '目標與資源系', 官殺: '規範與壓力系', 印星: '學習與庇蔭系' };
  function deepBazi(d) {
    const B = d.bazi;
    let b = `<div class="term-note"><strong>名詞小抄（先看這裡再往下讀）：</strong>
      <span>「天干」＝浮在檯面上的角色，外顯的性格與際遇</span>
      <span>「地支」＝底層的根，內在狀態與環境</span>
      <span>「藏干」＝地支裡的隱藏成分，檯面下的暗流</span>
      <span>「納音」＝該柱的詩意標籤，參考用</span>
      <span>「十神」＝盤上每個字「相對你」扮演的角色名，共十種——下面每次出現都會附白話</span></div>`;
    b += '<h4>四柱人生地圖——每一柱管一段人生</h4><ul>';
    for (const k of ['year', 'month', 'day', 'hour']) {
      const [pn, stage, role] = PILLAR_STAGE[k];
      const g = B.stemGods[k];
      const stemLine = g === '日主'
        ? `天干 ${B.pillars[k].stem} 就是「你本人」（日主，屬${B.dayMaster.elem}）`
        : `天干透「${g}」——${TEN_GOD[g] || g}`;
      const hid = B.hidden[k].map((h) => `${h.stem}（${h.god}${TEN_GOD[h.god] ? '＝' + TEN_GOD[h.god].split('——')[0] : ''}）`).join('、');
      b += `<li><strong>${pn}｜${esc(stage)}</strong>——${esc(role)}。<br>檯面上：${esc(stemLine)}。<br>檯面下：地支 ${B.pillars[k].branch} 藏 ${esc(hid)}。<br><small>納音「${esc(B.pillars[k].nayinName)}」。</small></li>`;
    }
    b += '</ul><p class="chart-note">看法：哪一柱出現的角色，就往那個年齡段與人事位（祖上／父母職場／自身婚姻／子女晚年）套讀。例如月柱見「正官」＝青年期與職場帶著規範與被期待的味道。</p>';

    const order = Object.entries(B.godScore).sort((a, x) => x[1] - a[1]);
    const [topG, topV] = order[0]; const [subG, subV] = order[1]; const [lowG, lowV] = order[4];
    b += `<h4>十神能量結構——你的五股驅力怎麼分配</h4>
    <p class="probe-plain">十種角色可以歸成五大系統（${Object.entries(GROUP_TAG).map(([g, t]) => `${g}＝${t}`).join('、')}）——看哪系最強最弱，就知道你的驅力長什麼形狀：</p>
    <ul>
      <li><strong>最強：${topG}・${GROUP_TAG[topG]}（${topV.toFixed(1)} 分）</strong>——${esc(GOD_GROUP_HI[topG])}。這是你人生的主旋律，多數行為可以回溯到這股力。</li>
      <li><strong>次強：${subG}・${GROUP_TAG[subG]}（${subV.toFixed(1)} 分）</strong>——${esc(GOD_GROUP_HI[subG])}。副旋律，通常在主旋律卡住時接手。</li>
      <li><strong>最弱：${lowG}・${GROUP_TAG[lowG]}（${lowV.toFixed(1)} 分）</strong>——${esc(GOD_GROUP_LO[lowG])}。</li>
    </ul>
    <p class="chart-note">五組全貌：${order.map(([g, v]) => `${g} ${v.toFixed(1)}`).join('｜')}（計分含天干與藏干加權，可與上方盤面覆核）。</p>`;

    b += `<h4>格局、喜忌與調候——你的先天策略</h4>
    <ul>
      <li><strong>格局「${esc(B.pattern.name)}」</strong>：${esc(B.pattern.how)}——格局是你「天生的做事框架」，順著它省力，硬走反格局的路線事倍功半。</li>
      <li><strong>喜用 ${B.favorable.join('、')}</strong>（工作假設）：不是叫你戴什麼顏色，而是「環境選擇」——行業、合作對象、居住環境帶這些元素的，對你是順風；上方產業清單就是這樣推出來的。</li>
      <li><strong>忌神 ${B.unfavorable.slice(0, 2).join('、')}</strong>：長期泡在這類屬性過重的環境（行業、作息、人）會慢性耗你——不是碰不得，是別把主戰場設在這裡。</li>
      ${B.tiaohou ? `<li><strong>調候需「${esc(B.tiaohou)}」</strong>：你的月令氣候偏了，${esc(B.tiaohou)} 是回到舒適區的那味藥——生活節奏與環境溫度（比喻義與字面義都算）往這邊調。</li>` : ''}
    </ul>`;

    if (B.shensha.length) {
      b += `<h4>神煞細講——傳統標籤的白話版</h4><ul>${B.shensha.map((s) => `<li><strong>${esc(s.name)}（在${esc(s.at)}）</strong>：${esc(s.desc)}${PILLAR_HINT(s.at)}</li>`).join('')}</ul>
      <p class="chart-note">神煞是象徵層的速記標籤，位階低於十神與五行結構——當「附註」讀，別當判決。</p>`;
    }
    return wrap('深入解讀｜四柱地圖・十神結構・格局喜忌', b);
  }
  function PILLAR_HINT(at) {
    if (/日/.test(at)) return '——落在日柱，與「你本人／婚姻」關聯最直接';
    if (/時/.test(at)) return '——落在時柱，偏向中晚年與子女線發酵';
    if (/月/.test(at)) return '——落在月柱，青年期與職場上最有感';
    if (/年/.test(at)) return '——落在年柱，多顯化在早年與家族線';
    return '';
  }

  /* ================= 紫微 ================= */
  const STAR_KEY = {
    紫微: '帝座——主導欲、格局感，要位子也扛得起位子', 天機: '智多星——腦子轉不停、善謀劃，想太多是副作用',
    太陽: '發光體——付出、照亮別人，光環與勞碌一體兩面', 武曲: '武財星——務實剛毅、執行與理財硬實力',
    天同: '福星——隨和、懂享受，安逸是天賦也是陷阱', 廉貞: '次桃花——聰明、有手腕，遊走規則邊緣的張力',
    天府: '庫房星——穩健、守成、有底氣，天生的資產管理人', 太陰: '月光——細膩、收藏、照顧人，財富偏「靜靜累積」型',
    貪狼: '慾望星——多才多藝、社交桃花強，什麼都想要', 巨門: '口舌星——靠嘴吃飯（教學、評論、法務），也易惹口舌',
    天相: '印星——輔佐、公道、重形象，天生的二把手', 天梁: '蔭星——長者風、愛照顧人、遇難有救，適合顧問醫療公益',
    七殺: '將星——衝鋒陷陣、獨當一面，人生要有仗打才痛快', 破軍: '先鋒——破舊立新、不破不立，穩定期反而待不住',
  };
  const HUA_MEAN = {
    祿: '資源與機會的水龍頭——這顆星管的事，一生中比較容易「有得拿」',
    權: '主導權放大器——這顆星管的事，你會想抓、也抓得住，但小心強勢過頭',
    科: '名聲與貴人線——這顆星管的事，容易被看見、有人幫，走「口碑路線」',
    忌: '糾結點與課題——這顆星管的事，越用力越糾結；功課是「鬆手與轉念」，過關後反而是深度所在',
  };
  const PALACE_PLAIN = { 命宮: '自我狀態與人生基調', 兄弟: '同輩、手足與close圈', 夫妻: '感情與婚姻', 子女: '子女、學生與創作', 財帛: '金錢與現金流', 疾厄: '健康與身體', 遷移: '外出、變動與外界評價', 交友: '人脈圈與部屬', 官祿: '事業與職場', 田宅: '居住、資產與家運', 福德: '心境、享受與精神生活', 父母: '長輩、體制與文書' };
  function starLine(p) {
    if (!p.major.length) return '空宮（借對宮氣）——這領域「樣子」隨環境變，彈性大、定性弱';
    return p.major.map((m) => `${m.star}${m.bright ? `（${m.bright}）` : ''}${m.hua ? `〔化${m.hua}〕` : ''}：${STAR_KEY[m.star] || ''}`).join('；');
  }
  function toneOf(score) { return score >= 3 ? '先天配備強——可以主動經營、期待回報' : score <= -1 ? '先天帶壓——不是註定差，是要「後天裝制度」的區域，經營得法反而扎實' : '中性——好壞多取決於你放多少注意力'; }
  function deepZiwei(d) {
    const Z = d.ziwei;
    const pal = (n) => Z.palaces.find((p) => p.name === n);
    const sanfang = ['命宮', '官祿', '財帛', '遷移'];
    let b = `<h4>命宮三方四正——你的人生主結構</h4>
    <p class="probe-plain">紫微看人不是只看命宮一格，而是看「命＋官祿＋財帛＋遷移」四宮連線——它們構成你的自我、事業、金錢、對外形象的主框架：</p>
    <ul>${sanfang.map((n) => { const p = pal(n); return `<li><strong>${n}（${esc(PALACE_PLAIN[n])}）</strong>｜強度 ${p.score}：${esc(starLine(p))}</li>`; }).join('')}</ul>
    <p class="chart-note">四宮合看：強的宮是你的「發力點」，弱的宮是「借力點」——例如命宮弱但官祿強的人，往往是「進了對的舞台才像自己」。</p>`;

    b += `<h4>生年四化落宮——你人生的水龍頭、放大器、貴人線與考題</h4><ul>`;
    for (const [k, star] of Object.entries(Z.sihua)) {
      const p = Z.palaces.find((x) => [...x.major, ...x.lucky].some((s) => s.star === star));
      b += p
        ? `<li><strong>${esc(star)}化${k} → ${p.name}宮（${esc(PALACE_PLAIN[p.name])}）</strong>：${esc(HUA_MEAN[k])}。對你來說，這股力顯化在「${esc(PALACE_PLAIN[p.name])}」。</li>`
        : `<li><strong>${esc(star)}化${k}</strong>：${esc(HUA_MEAN[k])}（此星未入十二宮主副星盤，略）。</li>`;
    }
    b += `</ul>`;

    const tour = ['夫妻', '財帛', '官祿', '田宅', '福德', '疾厄'];
    b += `<h4>重點宮位巡禮——六個最常被問的領域</h4><ul>`;
    for (const n of tour) {
      const p = pal(n);
      const extras = [...p.lucky.map((l) => l.star), ...p.unlucky.map((u) => u.star)];
      b += `<li><strong>${n}宮（${esc(PALACE_PLAIN[n])}）</strong>｜${esc(toneOf(p.score))}。<br>主星：${esc(starLine(p))}${extras.length ? `；輔煞：${esc(extras.join('、'))}` : ''}</li>`;
    }
    b += `</ul><p class="chart-note">宮位強度計分規則見「量化總覽」；此處的星曜詮釋為傳統關鍵字，請與自身經驗核對。</p>`;

    b += `<h4>命主・身主・身宮——三個常被忽略的開關</h4><ul>
      <li><strong>命主「${esc(Z.mingzhu)}」</strong>：先天性格的隱藏基調——${esc(STAR_KEY[Z.mingzhu] || '傳統以此星為命宮氣質的深層底色')}。</li>
      <li><strong>身主「${esc(Z.shenzhu)}」</strong>：後天行動的慣用武器——遇事你下意識先抽出來用的那把刀。</li>
      <li><strong>身宮在${Z.shenPalace.name}宮</strong>：約 35 歲後人生重心會明顯往「${esc(PALACE_PLAIN[Z.shenPalace.name])}」移——年輕時可能無感，中年回頭看會發現時間表早就偏過去了。</li>
    </ul>`;
    return wrap('深入解讀｜三方四正・四化落宮・宮位巡禮', b);
  }

  /* ================= 西占 ================= */
  const SIGN_STYLE = {
    牡羊: '直接、搶先、有火就點', 金牛: '穩、慢熱、重感官與持有', 雙子: '快、好奇、多線切換',
    巨蟹: '重感受、護短、記憶很長', 獅子: '要舞台、慷慨、自尊掛帥', 處女: '精準、挑剔、服務型完美',
    天秤: '衡量、優雅、關係優先', 天蠍: '深、專、全有或全無', 射手: '遠望、樂觀、要意義與自由',
    摩羯: '務實、耐操、目標導向', 水瓶: '抽離、理性、反主流', 雙魚: '滲透、共感、界線模糊',
  };
  const HOUSE_ARENA = {
    1: '自我形象與身體', 2: '金錢與價值感', 3: '溝通、學習與手足', 4: '家與內在根基',
    5: '創作、戀愛與玩樂', 6: '日常工作與健康', 7: '一對一關係與合作', 8: '深度連結與他人資源',
    9: '遠方、信念與高等學習', 10: '事業與公眾聲望', 11: '朋友、社群與理想', 12: '潛意識、獨處與療癒',
  };
  const PLANET_FUNC = {
    Sun: '核心自我與生命方向', Moon: '情緒需求與安全感', Mercury: '思考與溝通', Venus: '愛的方式與品味價值',
    Mars: '行動與慾望的引擎', Jupiter: '擴張與機運', Saturn: '紀律、限制與長期功課',
    Uranus: '突變與獨立（世代）', Neptune: '夢想與消融（世代）', Pluto: '深層蛻變（世代）', NorthNode: '此生成長方向',
  };
  const ASPECT_MEAN = {
    合相: '融合——兩股能量綁在一起出場，分不開也停不掉',
    對分: '拉鋸——蹺蹺板的兩端，常透過關係裡的「別人」演給你看',
    四分: '摩擦——內在卡點，也是最強的驅動引擎（有成就的盤幾乎都靠四分推）',
    三合: '順流——天生就會，順到常忘記這是天賦，記得拿出來用',
    六合: '機會——有門但要自己推，不推不開',
  };
  const hs = (p) => p.house != null ? p.house : p.wholeSignHouse;
  function deepWest(d) {
    const W = d.west;
    const P = (k) => W.planets.find((p) => p.key === k);
    let b = `<h4>三巨頭詳解——外殼、核心、內裡</h4><ul>
      <li><strong>上升${W.asc.sign}（外殼）</strong>：你給人的第一印象與應對世界的介面——「${esc(SIGN_STYLE[W.asc.sign])}」。初見面的人認識的是這一層；守護星是${esc(W.asc.ruler)}，它的狀態牽動你整體的「開場運作」。</li>
      <li><strong>太陽${W.sun.sign}・第 ${hs(W.sun)} 宮（核心）</strong>：你的人生主軸以「${esc(SIGN_STYLE[W.sun.sign])}」的方式運轉，主戰場在${esc(HOUSE_ARENA[hs(W.sun)])}——把時間花在這裡，你會覺得「活得像自己」。</li>
      <li><strong>月亮${W.moon.sign}・第 ${hs(W.moon)} 宮（內裡）</strong>：沒人看的時候、以及壓力大的時候，你切回「${esc(SIGN_STYLE[W.moon.sign])}」模式；安全感的補給站在${esc(HOUSE_ARENA[hs(W.moon)])}。伴侶與家人面對的主要是這一層。</li>
    </ul>
    <p class="chart-note">三層落差越大，「熟前熟後判若兩人」的程度越高——這不是表裡不一，是分層運作。</p>`;

    b += `<h4>個人行星——你的四把日常工具</h4><ul>`;
    for (const k of ['Mercury', 'Venus', 'Mars']) {
      const p = P(k);
      b += `<li><strong>${esc(p.name)}${p.sign}・第 ${hs(p)} 宮</strong>：${esc(PLANET_FUNC[k])}走「${esc(SIGN_STYLE[p.sign])}」路線，最常上場的領域是${esc(HOUSE_ARENA[hs(p)])}${p.retro ? '。<em>逆行</em>：這功能偏「內化重審型」——反應慢半拍，但想過的比別人深' : ''}。</li>`;
    }
    const jup = P('Jupiter'), sat = P('Saturn');
    b += `<li><strong>木星${jup.sign}・第 ${hs(jup)} 宮（順風處）</strong>：你的天然擴張線在${esc(HOUSE_ARENA[hs(jup)])}——這領域你比別人容易「遇到好事」，值得主動押注。</li>
      <li><strong>土星${sat.sign}・第 ${hs(sat)} 宮（功課處）</strong>：你的長期功課在${esc(HOUSE_ARENA[hs(sat)])}——這領域早年常覺得「比別人難」，但它是慢利率的定存：認真修，四十歲後變成最硬的資產。</li>
    </ul>`;

    const tight = W.aspects.filter((a) => !['Uranus', 'Neptune', 'Pluto', 'NorthNode'].includes(a.aKey)).sort((a, x) => a.orb - x.orb).slice(0, 5);
    if (tight.length) {
      b += `<h4>重要相位深讀——內在零件怎麼互相咬合</h4><ul>${tight.map((a) => {
        const fa = PLANET_FUNC[a.aKey] || a.a, fb = PLANET_FUNC[a.bKey] || a.b;
        return `<li><strong>${esc(a.a)}${a.sym}${esc(a.b)}（${a.type}，容許度 ${a.orb}°${a.exact ? '・精準' : ''}）</strong>：「${esc(fa)}」與「${esc(fb)}」${esc(ASPECT_MEAN[a.type] || '')}。</li>`;
      }).join('')}</ul>
      <p class="chart-note">只列容許度最緊的五組（越緊越常駐）；${W.unaspected.length ? `另有無相位行星 ${W.unaspected.join('、')}——孤島功能，全有或全無式運作。` : '本盤無「無相位行星」。'}</p>`;
    }
    return wrap('深入解讀｜三巨頭・行星工具箱・相位咬合', b);
  }

  /* ================= 印占 ================= */
  const DASHA_THEME = {
    太陽: '自我確立、被看見、與權威的關係', 月亮: '情感、家庭與生活基座', 火星: '行動、競爭與衝刺',
    羅睺: '慾望放大、非常規的機會與動盪', 木星: '擴張、學習、貴人與意義感', 土星: '收斂、責任、慢工出細活的磨練',
    水星: '學習、溝通、商業與技能', 計都: '內收、剝離、靈性與斷捨離', 金星: '關係、財富、美與享受',
  };
  function deepVedic(d) {
    const V = d.vedic;
    const age = new Date().getFullYear() - d.input.y;
    const cur = V.dashas.find((x) => age >= Math.max(0, x.startAge) && age < x.endAge);
    const nxt = cur ? V.dashas[V.dashas.indexOf(cur) + 1] : null;
    let b = `<h4>大運章節表——你的人生時程主題</h4>
    <p class="probe-plain">Vimshottari 大運把人生切成九種主題章節，每章由一顆行星「定調」——同一個你，在不同章節會被推去修不同的課：</p><ul>`;
    if (cur) {
      b += `<li><strong>現在章節：${esc(cur.lordZh)}大運（${Math.max(0, Math.round(cur.startAge))}–${Math.round(cur.endAge)} 歲，至 ${cur.end.getFullYear()} 年）</strong>——主題是「${esc(DASHA_THEME[cur.lordZh])}」。這段期間的人生際遇，多半繞著這條軸線出題。</li>`;
      if (nxt) b += `<li><strong>下一章：${esc(nxt.lordZh)}大運（約 ${Math.round(nxt.startAge)} 歲起，${nxt.start.getFullYear()} 年）</strong>——主題切換成「${esc(DASHA_THEME[nxt.lordZh])}」。大運交界前後一兩年常有明顯的「換氣感」，可對照時間層的換軌窗口。</li>`;
    } else {
      b += `<li>目前年齡超出排出的運程範圍，僅供回顧使用。</li>`;
    }
    b += `</ul>`;

    const counts = { kendra: [], trikona: [], dusthana: [], other: [] };
    for (const p of V.planets) {
      if ([1, 4, 7, 10].includes(p.house)) counts.kendra.push(p.name + (p.house === 1 ? '(1)' : `(${p.house})`));
      else if ([5, 9].includes(p.house)) counts.trikona.push(`${p.name}(${p.house})`);
      else if ([6, 8, 12].includes(p.house)) counts.dusthana.push(`${p.name}(${p.house})`);
      else counts.other.push(`${p.name}(${p.house})`);
    }
    b += `<h4>宮位聚落——你的行星駐紮在哪類戰區</h4><ul>
      <li><strong>四角宮（1/4/7/10，行動支柱）</strong>：${counts.kendra.length ? esc(counts.kendra.join('、')) + '——這些行星的主題會直接展現在人生舞台上，是「看得見」的配備' : '無——你的力量偏內斂型，不靠正面舞台發揮'}。</li>
      <li><strong>三合宮（5/9，福德三角）</strong>：${counts.trikona.length ? esc(counts.trikona.join('、')) + '——傳統視為福報位：這些主題上你有「天生的順」' : '無行星——福報靠行動宮自己掙，不是沒有、是不白給'}。</li>
      <li><strong>困難宮（6/8/12，修煉區）</strong>：${counts.dusthana.length ? esc(counts.dusthana.join('、')) + '——這些主題以「磨練」形式出現：早年辛苦、越修越強，很多深度專業（醫療、研究、危機處理）反而吃這種配置' : '無行星——人生的坑相對少，但也少了「置之死地而後生」的爆發位'}。</li>
    </ul>`;

    b += `<h4>月宿與靈魂軸——內在質地的細節</h4><ul>
      <li><strong>月宿 ${esc(V.moonNak.name)} 第 ${V.moonNak.pada} pada</strong>：「${esc(V.moonNak.motif)}」是你情緒的原廠質地；宿主星${esc(ML.vedic.LORD_ZH[V.moonNak.lord])}（${esc(DASHA_THEME[ML.vedic.LORD_ZH[V.moonNak.lord]] || '')}）同時決定你出生起跑的大運章節——等於「你的內在主題」和「人生第一章」是同一條線。</li>
      <li><strong>靈魂主星（Atmakaraka）＝${esc(V.atmakaraka.name)}</strong>：「${esc(DASHA_THEME[V.atmakaraka.name] || '')}」是你換工作、換關係都躲不掉的同一道考題——它不是懲罰，是這輩子選定要修精的科目。</li>
    </ul>`;
    return wrap('深入解讀｜大運章節・宮位聚落・靈魂軸', b);
  }

  /* ================= 人類圖 ================= */
  const CENTER_MEAN = {
    頭腦: ['靈感來源固定——常自帶問題意識，想事情有自己的起點', '替別人的問題想答案——議題來來去去，別把每個都當成自己的功課'],
    '邏輯（Ajna）': ['思考框架固定——觀點一致、有立場', '能理解各種觀點——不必假裝有定見，「還沒有結論」是合法狀態'],
    喉嚨: ['表達管道固定——說話有一貫的聲音與作用', '說話風格隨場合變——等對的時機開口，比搶話有效十倍'],
    'G（自我）': ['方向感與身分感穩定——知道自己是誰', '方向隨環境與同伴變——選對「地方和人」，方向自己會浮現'],
    '意志（心）': ['有持續意志力——適合承諾、談判、扛目標', '別亂承諾、別靠意志力硬撐——「證明自己」的衝動是課題不是燃料'],
    薦骨: ['有持續產能的引擎——回應對的事會越做越有勁', '能量是借來的——做完要休息，不適合等速長跑'],
    '直覺（脾）': ['當下的直覺可靠——第一時間的警訊要聽，它不重播', '對別人的恐懼與狀態敏感——恐懼放大時先問：這是我的嗎？'],
    '情緒（太陽神經叢）': ['情緒有內建週期——清明來自「等波過」，谷底不做決定', '吸收並放大別人的情緒——離開現場，才知道哪些是自己的'],
    根部: ['壓力驅動穩定——有自己的節奏，扛得住 deadline', '容易被環境壓力推著跑——「急」多半是吸來的，不是你的'],
  };
  const CHANNEL_MEAN = {
    '64-47': '影像式回想——把過去的畫面整理成意義', '61-24': '內在真理的思考者——反覆咀嚼直到想通', '63-4': '懷疑→假設——天生的邏輯檢查機',
    '17-62': '把觀點講成有條理的意見', '43-23': '獨到見解——等對時機才說得進去', '11-56': '點子與故事的採集者——用敘事教人',
    '1-8': '用自己的創作做榜樣', '13-33': '聆聽與見證——把經歷沉澱成經驗談', '7-31': '被推舉的領導——用影響力帶方向',
    '10-20': '活出自己就是影響力', '16-48': '反覆練到精的才華——技藝型天賦', '20-57': '當下的直覺直接說出口',
    '12-22': '情緒性的表達——有心情才開口，張力即魅力', '35-36': '經驗收集者——什麼都想試一輪', '21-45': '掌控資源——要嘛管事、要嘛管錢',
    '20-34': '忙起來就發光——做自己的事最迷人', '2-14': '方向與資源的鑰匙——跟對方向資源自來', '5-15': '固定節奏與生命流——作息即實力',
    '29-46': '說 yes 就全力投入——體驗派', '25-51': '敢衝第一個——競爭與突破的勇氣', '10-57': '直覺帶路的生存美學',
    '10-34': '照自己的信念活——行為即宣言', '26-44': '記憶＋說服——天生的傳訊與行銷者', '37-40': '家與組織的黏著劑——談條件也給溫暖',
    '27-50': '照顧與價值觀——守護群體的人', '34-57': '直覺×動能——當下反應快而準', '59-6': '打破距離的親密力——建立深度連結',
    '3-60': '從限制中長出新東西——變革的起點', '9-52': '定得下來——聚焦小處成就大事', '42-53': '把週期走完——善始善終的成長線',
    '18-58': '挑錯雷達×活力——挑剔是為了讓事情更好', '28-38': '為值得的事奮鬥——先找到值得打的仗', '32-54': '企圖心與階梯——被認可後步步高升',
    '30-41': '慾望與想像的燃料——期待本身就是動力', '39-55': '情緒的挑釁與詩意——感染力豐沛', '19-49': '需求與原則的結盟——對群體溫度敏感',
  };
  const LINE_MEAN = {
    1: ['研究者', '安全感來自「查透」——基礎不穩不出手，出手前一定先做功課。你的權威感建立在「我查過」上'],
    2: ['隱士', '天賦是自然流露型——自己往往說不清怎麼辦到的。需要大量獨處空間，但躲著躲著就會被人「叫喚」出門'],
    3: ['試錯者', '用身體撞世界來學習——別人眼中的「失敗」是你的學費與教材。你的智慧全是實戰換來的，別拿別人的直線人生比較'],
    4: ['人脈者', '機會幾乎都透過「熟人網絡」來——陌生開發對你效率極差。經營關係不是社交手腕，是你的基礎建設'],
    5: ['救火隊', '自帶「他一定能解決」的投射光環——人們期待你來救場。接對的投射是舞台，接錯的是背鍋，名聲管理是終身課題'],
    6: ['榜樣', '人生分三階段：約30歲前像3爻一樣試錯、30–50歲退到屋頂上觀察沉澱、50歲後下來當「活過的典範」。越老越對味'],
  };
  const PROFILE_LIFE = {
    '1/3': '實戰建議：把「查資料→小規模試→修正」變成你的標準流程，這是你最強的學習機器。注意：查太久不出手（1爻的恐懼）＋怕再失敗（3爻的累積傷）會互相加乘，給研究設截止日。',
    '1/4': '實戰建議：學透一門，然後只對你的熟人圈輸出——你的影響力半徑就是關係半徑。注意：對圈外人講不進去是結構問題不是你的問題，別浪費力氣說服陌生人。',
    '2/4': '實戰建議：保護你的獨處時間（那是天賦充電的地方），但讓朋友知道你在做什麼——機會是朋友帶著敲門的。注意：門關死了機會進不來，全開了你會枯竭，留一扇窗。',
    '2/5': '實戰建議：挑「值得出洞」的求救再回應，一年認真救幾次場就夠建立名聲。注意：你比別人更容易被投射成救世主——不想接的期待要早點說破，拖越久反噬越大。',
    '3/5': '實戰建議：把你的失敗史整理成方法論——「我踩過所以我知道」是你最有說服力的專業。注意：別人期待你救場時，只接你真的踩過的領域。',
    '3/6': '實戰建議：30歲前的混亂與碰撞都是在收集素材，別急著定型；50歲後你的話語權自然變重。注意：中段（30–50）的「抽離感」是設計不是冷漠，允許自己旁觀。',
    '4/6': '實戰建議：經營少而深的關係網，你的機會與影響力都從這裡長。注意：你天生被觀察——言行不一致的成本比別人高，承諾前多想一步。',
    '4/1': '實戰建議：選定一門專業扎到底＋維護好核心圈子，就是你的人生公式——路窄但走得深、走得穩。注意：你的軌道轉彎成本高，重大轉向要比別人更早規劃。',
    '5/1': '實戰建議：人們會推你上台救場——上台前確保底下有扎實研究墊著，有底氣的救場會滾出名聲複利。注意：接了沒把握的投射，破滅時反噬也最重；「這題我沒研究過」是你最重要的一句話。',
    '5/2': '實戰建議：世界看你是萬事通，你自己只想安靜做事——固定切換「上台／進洞」兩種模式，別讓任一邊吃掉另一邊。注意：學會管理別人對你的想像，比學新技能更重要。',
    '6/2': '實戰建議：你天生被觀察、低調也藏不住——與其躲，不如挑選「值得被看到什麼」。30歲前的跌撞是素材，50歲後是你的教材。注意：中段沉澱期別焦慮「怎麼變得不想衝了」，那是換檔不是熄火。',
    '6/3': '實戰建議：你是「一邊當榜樣一邊還在試錯」的組合——把試錯公開化反而加分（人們愛看真實的成長）。注意：別用完美人設綁自己，你的說服力來自「還在路上」。',
  };
  const PROFILE_MEAN = {
    '1/3': '研究者×試錯者——先查透，再親身撞一遍才安心；你的專業是「查過＋踩過」的雙保險',
    '1/4': '研究者×人脈者——把研究透的東西分享給熟人圈；機會走「熟人介紹」線',
    '2/4': '隱士×人脈者——需要大量獨處空間，機會卻總從朋友來；留窗給人敲，但守住洞穴',
    '2/5': '隱士×救火隊——只想安靜修練，卻常被投射成救世主；學會挑「值得出洞」的求救',
    '3/5': '試錯者×救火隊——用碰撞學習，經驗值就是說服力；別人眼中你「什麼都經歷過」',
    '3/6': '試錯者×榜樣——前半生撞牆收集智慧，約五十歲後上屋頂變成過來人',
    '4/6': '人脈者×榜樣——靠關係網立足，中年後漸轉為旁觀的智者',
    '4/1': '人脈者×研究者——根基穩固的固定人生軌道，路窄但走得深',
    '5/1': '救火隊×研究者——常被期待來解決問題，底氣必須來自扎實研究，否則投射會反噬',
    '5/2': '救火隊×隱士——名聲在外的實用主義者，內心只想安靜做事；管理別人對你的想像是必修課',
    '6/2': '榜樣×隱士——人生分三階段（試錯→觀察→上場），天生被觀察，低調也藏不住',
    '6/3': '榜樣×試錯者——一邊當榜樣一邊仍在試錯，越老越通透，別急著在年輕時定型',
  };
  function deepHD(d) {
    const H = d.hd;
    const stateLabel = { defined: '有定義', gated: '懸掛閘門', open: '全開放' };
    let b = `<h4>九中心巡禮——哪裡是你的、哪裡是放大鏡</h4>
    <p class="probe-plain">「有定義」（著色）＝你恆定擁有、可靠的部分；「開放」＝你放大並吸收別人的部分——開放不是缺陷，是感知天線，但別把吸來的當自己的：</p><ul>`;
    for (const c of H.centerStates) {
      const m = CENTER_MEAN[c.name] || ['', ''];
      const txt = c.state === 'defined' ? m[0] : m[1];
      const gateNote = c.state === 'gated' ? `（有閘門 ${c.gates.join('、')} 但未成通道——潛在敏感點，仍屬開放運作）` : '';
      b += `<li><strong>${esc(c.name)}｜${stateLabel[c.state]}</strong>：${esc(txt)}${esc(gateNote)}</li>`;
    }
    b += `</ul>`;

    if (H.channels.length) {
      b += `<h4>通道深讀——你恆定的天賦線路</h4><ul>${H.channels.map((c) => {
        const key = CHANNEL_MEAN[`${c.a}-${c.b}`] ? `${c.a}-${c.b}` : `${c.b}-${c.a}`;
        return `<li><strong>${c.a}-${c.b} ${esc(c.name)}</strong>：${esc(CHANNEL_MEAN[key] || '恆定啟動的能量線路')}</li>`;
      }).join('')}</ul>
      <p class="chart-note">通道是「一生不關機」的配備（L0 層）——不用練就有，但用不用得好要看策略與權威。</p>`;
    } else {
      b += `<h4>通道深讀</h4><p>無成形通道（反映者結構）——你的天賦不在「固定線路」而在「如實反映環境」：環境好壞你最先知道，選場域就是選人生。</p>`;
    }

    const [l1, l2] = H.profile.split('/').map(Number);
    b += `<h4>人生角色 ${H.profile}——你和世界的互動劇本</h4>
    <p>${esc(PROFILE_MEAN[H.profile] || H.profileName)}。</p>
    <p class="probe-plain">人生角色由兩個數字組成，讀法是「意識面／潛意識面」：前面的數字是你<strong>自覺的活法</strong>（自己認得出來），後面的是<strong>底層的運作</strong>（別人看得到、你自己常不自覺）：</p>
    <ul>
      <li><strong>意識面 ${l1} 爻「${esc((LINE_MEAN[l1] || [''])[0])}」</strong>：${esc((LINE_MEAN[l1] || ['', ''])[1])}。</li>
      <li><strong>潛意識面 ${l2} 爻「${esc((LINE_MEAN[l2] || [''])[0])}」</strong>：${esc((LINE_MEAN[l2] || ['', ''])[1])}。</li>
    </ul>
    <p>${esc(PROFILE_LIFE[H.profile] || '')}</p>
    <p class="chart-note">配合類型與權威使用：${esc(H.type)}的進場策略＋「${esc(H.authority)}」的決策程序，是這張圖最實戰的兩件事——行動手冊的決策速查卡已把它織進每一題。</p>`;
    return wrap('深入解讀｜九中心・通道線路・人生角色', b);
  }

  /* ================= 靈數 ================= */
  function deepNum(d) {
    const N = d.misc.numerology;
    const NM = ML.misc.NUM_MEANING;
    let b = `<h4>主命數 ${N.main} 的課題結構</h4>
    <p><strong>${esc(NM[N.main] || '')}</strong>——靈數的讀法是「人生反覆出現的主題」，不是能力上限。${N.master ? `你的 ${N.master} 是卓越數：同一課題的高壓版——能量更大、震盪也更大，接得住就是天賦，接不住會先以「過敏」形式出現。` : ''}計算過程 ${N.steps.join('→')}，生日數 ${N.birthday}（${esc(N.birthdayMeaning || '')}）是日常性格的「面交版」。</p>`;
    const hi = Object.entries(N.freq).filter(([, v]) => v >= 3).map(([k, v]) => `${k}（${v} 次，${NM[k].split('・')[0]}）`);
    if (hi.length) b += `<h4>高頻數——生日裡重複出現的音</h4><p>${esc(hi.join('、'))}——出現三次以上的數字像「加倍鍵」：該主題在你身上濃度特別高，優點與副作用都會放大。</p>`;
    if (N.missing.length) {
      b += `<h4>缺數——你天生的外包區</h4><ul>${N.missing.map((m) => `<li><strong>缺 ${m}</strong>（${esc(NM[m])}）：這類任務你會下意識拖延或交給別人／工具——不是學不會，是不順手。認識它，然後理直氣壯地外包或用制度補。</li>`).join('')}</ul>`;
    }
    b += `<p class="chart-note">靈數是六票中結構最薄的一票，永遠不單獨成案——以上請當「主題提示」，與其他系統的匯流對照使用。</p>`;
    return wrap('深入解讀｜主命數・高頻數・缺數', b);
  }

  /* ================= 量化總覽深讀 ================= */
  const ELEM_PERSON = {
    木: '成長與企劃——擅長把事情「養大」，帶點仁厚氣', 火: '行動與表現——熱得快、能帶動氣氛',
    土: '承載與信用——穩、能扛、讓人放心', 金: '決斷與原則——收得住、切得開、講規則',
    水: '流通與智謀——腦子轉得快、感受滲透力強',
  };
  const ELEM_LACK = {
    木: '長線企劃與「慢慢養」的耐心要靠後天制度補', 火: '主動曝光與臨場熱度不足——重要場合要刻意暖機',
    土: '落地與穩定感是弱項——找土重的夥伴或用流程補', 金: '收尾與拒絕最難——「決斷」這件事建議外包給事先訂好的規則',
    水: '變通與情緒表達偏少——容易硬碰硬，關係裡要刻意軟化',
  };
  const ELEM4_MEAN = { 火: '靠直覺與行動認識世界', 土: '靠實感與成果認識世界', 風: '靠思考與交流認識世界', 水: '靠感受與共鳴認識世界' };
  const MODE_MEAN = { 基本: '習慣開局、發起新局', 固定: '習慣堅持、把事做穩做深', 變動: '習慣調整、順勢應變' };
  const LOW4 = {
    火: '不易「先衝再說」——需要行動時給自己設倒數計時', 土: '容易飄在想法裡——落地需要外部結構（夥伴、期限、清單）',
    風: '不愛講理由——溝通時多給一句脈絡，誤會少一半', 水: '對情緒訊號較鈍——關係裡要刻意問感受，別等對方爆',
  };
  const PLANET_THEME_V = { 太陽: '自我與權威', 月亮: '情感與安定', 火星: '行動與競爭', 水星: '思考與表達', 木星: '智慧與機運', 金星: '愛與財', 土星: '紀律與耐力' };
  function radarInsights(d) {
    const { bazi: B, west: W, ziwei: Z, vedic: V } = d;
    const elems = ['木', '火', '土', '金', '水'];
    const eS = elems.slice().sort((a, x) => B.elemPct[x] - B.elemPct[a]);
    const spread = B.elemPct[eS[0]] - B.elemPct[eS[4]];
    const shape = spread >= 30 ? '高度集中（偏枯型）——性格輪廓極鮮明，代價是彈性小：擅長的碾壓、不擅長的躲不掉'
      : spread >= 18 ? '有明顯主副（偏向型）——有清楚的性格主色，也保有一定調節空間'
      : '相對均衡（流通型）——五行都拿得出手，特徵是「沒有明顯短板」，但也因此常被說「看不透」';
    const bazi = `<div class="deep-insight"><strong>這張圖再深一層：</strong>你的五行分佈屬「${esc(shape)}」（最高最低差 ${spread.toFixed(0)} 個百分點）。
      最重的「${eS[0]}」（${B.elemPct[eS[0]].toFixed(0)}%）＝${esc(ELEM_PERSON[eS[0]])}——這是你不假思索就在用的預設模式；
      最輕的「${eS[4]}」（${B.elemPct[eS[4]].toFixed(0)}%）＝${esc(ELEM_LACK[eS[4]])}。
      喜用「${B.favorable.join('、')}」的意義就是把這個形狀「補圓」：往含這些元素的環境靠，等於借外力平衡先天配比。</div>`;

    const wTop = Object.entries(W.elemPct).sort((a, x) => x[1] - a[1]);
    const wLow = wTop[wTop.length - 1];
    const mTop = Object.entries(W.modePct).sort((a, x) => x[1] - a[1])[0];
    const west = `<div class="deep-insight"><strong>這張圖再深一層：</strong>你的主導組合是「${wTop[0][0]}象 × ${mTop[0]}」＝${esc(ELEM4_MEAN[wTop[0][0]])}，而且${esc(MODE_MEAN[mTop[0]])}——合起來就是你面對新事物的「標準開場動作」。
      最低的${wLow[0]}象（${wLow[1].toFixed(0)}%）是感知盲區：${esc(LOW4[wLow[0]])}。
      盲區不用治，要「補件」——找這象強的人合作，或用工具替代。</div>`;

    const zSorted = Z.palaces.slice().sort((a, x) => x.score - a.score);
    const zTop = zSorted.slice(0, 2), zLow = zSorted.slice(-2).reverse();
    const jiStar = Z.sihua['忌'];
    const jiPal = Z.palaces.find((p) => [...p.major, ...p.lucky].some((s) => s.star === jiStar));
    const ziwei = `<div class="deep-insight"><strong>這張圖再深一層：</strong>先天配備最厚的是「${zTop.map((p) => `${p.name}（${esc(PALACE_PLAIN[p.name])}，${p.score} 分）`).join('、')}」——這些領域你可以主動經營、敢期待回報；
      配備最薄的是「${zLow.map((p) => `${p.name}（${esc(PALACE_PLAIN[p.name])}，${p.score} 分）`).join('、')}」——低分不是判死刑，是「原廠沒附配件」：要靠後天制度、貴人與刻意練習裝上去，裝上去反而比天生的更穩。
      ${jiPal ? `另外注意${jiPal.name}宮帶生年${esc(jiStar)}化忌——這領域「越用力越糾結」，經營方式要用鬆不用緊。` : ''}</div>`;

    const vS = V.strength.slice().sort((a, x) => x.d1 - a.d1);
    const vTop = vS[0], vLow = vS[vS.length - 1];
    const gainers = V.strength.filter((s) => s.d9 - s.d1 >= 2).map((s) => s.name);
    const droppers = V.strength.filter((s) => s.d1 - s.d9 >= 2).map((s) => s.name);
    const vedic = `<div class="deep-insight"><strong>這張圖再深一層：</strong>最有力的${esc(vTop.name)}（D1=${vTop.d1}，${esc(vTop.d1Label)}）代表「${esc(PLANET_THEME_V[vTop.name] || '')}」是你可靠的資產；最弱的${esc(vLow.name)}（D1=${vLow.d1}，${esc(vLow.d1Label)}）代表「${esc(PLANET_THEME_V[vLow.name] || '')}」是這輩子要修的科目——弱不等於沒有，等於「要用功才拿得到」。
      D1 是外顯配備、D9 是內核與後勁：${gainers.length ? `${gainers.join('、')}屬「後勁型」（D9 明顯高於 D1）——年紀越大越有力，中年後你會感覺這塊「突然開竅」。` : ''}${droppers.length ? `${droppers.join('、')}屬「先盛型」（D1 高於 D9）——年輕好用，中年後要刻意保養才不掉。` : ''}${!gainers.length && !droppers.length ? '你的 D1 與 D9 大致同步——表裡一致、沒有明顯的早發或晚成落差。' : ''}</div>`;

    const pair = (name, be, wThr, bThr) => {
      const bv = B.elemPct[be[0]], wv = W.elemPct[be[1]];
      const bHi = bv >= bThr[0], bLo = bv <= bThr[1], wHi = wv >= wThr[0], wLo = wv <= wThr[1];
      if (bHi && wHi) return `<li><strong>${name}：雙高（八字${be[0]} ${bv.toFixed(0)}%＋西占${be[1]}象 ${wv.toFixed(0)}%）</strong>——兩套不同算法指到同一處，屬強印證：這是你的結構事實。</li>`;
      if (bLo && wLo) return `<li><strong>${name}：雙低</strong>——兩套都說稀缺，這是真實的短板區，交給制度與隊友，別硬練。</li>`;
      if ((bHi && wLo) || (bLo && wHi)) return `<li><strong>${name}：一高一低（八字${bv.toFixed(0)}% vs 西占${wv.toFixed(0)}%）</strong>——兩套定義本就不同（干支五行 vs 星座元素），這種分歧常見於「情境切換型」：某些場合開、某些場合關，可對照動靜分層的 L3 情境表驗證。</li>`;
      return `<li><strong>${name}：兩套皆中段</strong>——不突出也不匱乏，屬背景值。</li>`;
    };
    const cross = `<div class="deep-insight"><strong>兩套系統互相對答案：</strong>八字（算干支五行）和西占（算星座元素）是兩套完全獨立的算法——就像兩位不認識的醫生各自看診。下面挑三個兩邊都量得到的主題對答案：<strong>兩邊都說高＝可信度加倍；一高一低＝可能是「看場合切換」的特質</strong>。因為兩套的尺不一樣，只比方向、不比數字。<ul>
      ${pair('行動熱度', ['火', '火'], [33, 15], [25, 12])}
      ${pair('感受水位', ['水', '水'], [33, 15], [25, 12])}
      ${pair('務實度', ['土', '土'], [33, 15], [25, 12])}
    </ul></div>`;

    return { bazi, west, ziwei, vedic, cross };
  }

  /* ================= 流年訊號白話翻譯 ================= */
  function reasonPlain(r) {
    if (r.includes('干支皆帶喜用')) return '流年的天干、地支都是你的喜用五行——大環境雙重順風';
    if (r.includes('帶喜用')) return '流年五行有一半是你的喜用——環境偏順';
    if (r.includes('非喜用')) return '流年五行不是你的喜用——沒有環境加成，靠自己（不算逆風）';
    if (r.includes('值太歲')) return '流年生肖與你相同（本命年）：傳統視為「換階段」的動盪年，宜穩不宜衝';
    if (r.includes('沖太歲')) return '流年生肖與你正對沖：變動最大的一年，環境會推著你換位置——順勢調整比硬守好';
    if (r.includes('刑太歲')) return '流年生肖與你相刑：人事摩擦與權責糾紛偏多，說話做事多留餘地';
    if (r.includes('害太歲')) return '流年生肖與你相害：暗耗型干擾偏多，合約與承諾多檢查一次';
    if (r.includes('合太歲')) return '流年生肖與你相合：人和運偏旺，貴人與合作機會比平常多';
    if (r.includes('沖日支')) return '流年衝到你命盤的「自身／婚姻位」：感情、居住、身體易變動，重大承諾多想兩週';
    if (r.includes('化忌入')) { const p = r.split('化忌入')[1].replace('宮', ''); return `紫微流年的「考題」落在${p}（${PALACE_PLAIN[p] || p}）——這領域今年多用心，但別鑽牛角尖`; }
    if (r.includes('化祿入')) { const p = r.split('化祿入')[1].replace('宮', ''); return `紫微流年的「機會」落在${p}（${PALACE_PLAIN[p] || p}）——這領域今年容易有好事，留意主動送上門的邀請`; }
    if (r.includes('土星回歸')) return '土星回到你出生時的位置（約 29 年一次）：人生結構總驗收——適合「轉大人」的決定，不適合硬衝';
    if (r.includes('木星回歸')) return '木星回到你出生時的位置（約 12 年一次）：擴張窗口開啟——適合啟動長期計畫';
    return '';
  }

  /* ================= 參考系統字典 ================= */
  const TAROT_KEY = {
    愚者: '歸零與冒險——帶著天真往未知走', 魔術師: '心想事成的執行力——把想法變現實', 女祭司: '直覺與內在知曉——答案在安靜裡',
    皇后: '豐盛與滋養——創造和照顧的能量', 皇帝: '秩序與掌權——建立自己的疆域', 教皇: '傳承與體制——在規範中找到位置',
    戀人: '選擇與結合——關係是人生主題', 戰車: '意志與推進——靠衝勁拿下目標', 力量: '柔性的馴服——以柔克剛的內在力',
    隱者: '獨處與求道——往內找光', 命運之輪: '週期與轉折——人生起伏節奏明顯', 正義: '衡量與公道——因果分明',
    倒吊人: '換位與犧牲——用不同角度看世界', 死神: '結束與重生——斷捨離的功課', 節制: '調和與煉金——把兩極混出中道',
    惡魔: '慾望與枷鎖——面對執念的課題', 高塔: '瓦解與覺醒——推倒重來的勇氣', 星星: '希望與療癒——黑暗後的指引',
    月亮: '潛意識與迷霧——與不安共處', 太陽: '光明與純粹的成功——直接發光', 審判: '召喚與復甦——回應內心的呼喚', 世界: '完成與整合——把一圈走完',
  };

  /* ================= 12 維度詳解 ================= */
  const DIM_DETAIL = {
    '表達與傳播': '想法憋不住，總得說出來或寫出來才痛快，而且你講的別人聽得懂。朋友找你代筆、簡報常被稱讚、老被說「你很會講」——都是這個特質在工作。',
    '行動力與衝勁': '想到就想動，等待比失敗更折磨你。計畫還沒寫完人已經出發了，排隊和冗長的會議對你來說是酷刑。',
    '情感深度與感受力': '你接得到別人沒說出口的情緒。電影哭點比別人低、朋友失戀第一個想到你、一進房間就聞得出氣氛不對——這條天線一直開著。',
    '秩序、結構與控制': '亂糟糟的環境會讓你真的不舒服。行程表排得比別人細、東西有固定位置、計畫臨時被改會煩躁——你需要秩序，就像有些人需要咖啡。',
    '直覺與非線性認知': '你常常說不出理由，但答案就是對的。第一印象很準、老是有「我早就覺得會這樣」的時刻——不是玄，是你的判斷走了一條不經過語言的近路。',
    '領導與舞台': '不是你愛出風頭，是位子自己會找上你。分組總被推當組長、會議冷場時大家不自覺看向你——主導對你是省力的事，不是負擔。',
    '財務嗅覺與資源運籌': '你對錢的流向特別有感——不只是愛錢，是看得見「價值往哪走、誰缺什麼、哪裡有便宜可撿」。買東西總能找到更划算的路徑、朋友下手前會先問你值不值、你覺得會漲的東西常常真的漲。',
    '研究、深度與洞察': '淺嚐輒止讓你難受，一個題目可以鑽好幾年。維基百科一開就是兩小時、常被說「你懂的也太細了吧」——坐得住冷板凳，就是你的本錢。',
    '人群魅力與桃花': '你不太需要經營存在感，它自己會發光。陌生人常主動攀談、服務生對你特別好、沒特別做什麼就有人記得你——注意力會自己流向你。',
    '遷移、變動與自由': '在同一個地方待太久，你會悶出病來。旅行對你是充電不是消耗、同一份工作坐三年就蠢蠢欲動、搬家次數比同齡人多——移動是你的氧氣。',
    '批判眼與完美主義': '不是你故意挑剔，是錯誤會自己跳到你眼前。文件錯字自動浮現、別人說「可以了」你心裡想「還差三個地方」——這雙眼睛用在事情上是天賦，用在人身上是負債。',
    '美感與藝術頻道': '你對醜的容忍度很低。排版歪一格就想調、買東西先看設計再看功能、房間佈置有別人不懂的堅持——美感對你不是品味，是生理需求。',
  };

  /* ================= 出廠規格用的白話函式 ================= */
  function authorityPlain(authority) {
    if (authority.includes('情緒')) return '情緒權威——你的清明不在當下：重大決定睡一晚，情緒的高點和低點都經歷過再答，當場答應的常後悔';
    if (authority.includes('薦骨')) return '薦骨權威——把問題化成是非題問自己，聽第一秒身體的「嗯／唔」：身體不回應的事，再合理也是消耗';
    if (authority.includes('直覺')) return '直覺權威——第一聲微弱的「不對勁」就是答案，它不會重播：事後用邏輯追認錯過的直覺，通常是災難的開始';
    if (authority.includes('意志')) return '意志權威——問自己「我真的想要嗎」，不是應不應該：意志力是脈衝式的，拿去撐別人的目標會過勞';
    if (authority.includes('自我投射')) return '自我投射權威——找信任的人把想法完整說一遍：你是在「聽自己說話」的過程中知道答案的，悶著想想不出來';
    if (authority.includes('月亮')) return '月亮權威——重大決定等 28 天月循環走完：你是環境的取樣器，需要完整取樣週期';
    return '環境權威——換兩三個場域各待一陣子再決定：你的清明來自「對的地方」，場域錯了怎麼想都是霧';
  }
  function moonNeedPlain(sign) {
    if (['巨蟹', '金牛', '雙魚'].includes(sign)) return '要的是穩定的照顧與歸屬感——對方「在不在」比浪漫重要；長期得不到會用黏人或退縮表現';
    if (['牡羊', '獅子', '射手'].includes(sign)) return '要的是被欣賞、同時保有自由——管太緊你會逃；長期得不到會用挑釁或冷漠表現';
    if (['雙子', '天秤', '水瓶'].includes(sign)) return '要的是聊得來、說話有人接——無話可說是你的分手前兆；長期得不到會往外找「聊得來的人」';
    return '要的是深度信任、能交換祕密——淺關係養不活你；長期得不到會整個人關機';
  }

  ML.deep = { bazi: deepBazi, ziwei: deepZiwei, west: deepWest, vedic: deepVedic, hd: deepHD, num: deepNum, radarInsights, PALACE_PLAIN, reasonPlain, TAROT_KEY, DIM_DETAIL, TEN_GOD, ELEM_PERSON, authorityPlain, moonNeedPlain, LINE_MEAN };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
