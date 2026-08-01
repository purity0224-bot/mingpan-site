/* =========================================================
 * 交叉分析層
 * 區塊B2/B3：找匯流、攤矛盾；區塊F：多訊號並存＋★分級；
 * 區塊H：L0–L3 動靜分層＋狀態切換表；時間層三波對齊；
 * 待驗證假說生成；AI 深度解讀提示詞匯出
 *
 * 誠實原則:所有訊號都由盤面計算而得,證據字串附在每個訊號上;
 * 這一層只做「規則可判定」的交叉,更深的詮釋交給匯出提示詞讓 AI 續寫。
 * ========================================================= */
(function (global) {
  'use strict';
  const ML = (global.ML = global.ML || {});
  const C = ML.core;

  function buildAll(input) {
    const bazi = ML.bazi.compute(input);
    const west = ML.west.compute(input);
    const vedic = ML.vedic.compute(input, west);
    const hd = ML.hd.compute(input);
    const ziwei = ML.ziwei.compute(input);
    const misc = ML.misc.compute(input, bazi, ziwei.lunar);
    return { input, bazi, west, vedic, hd, ziwei, misc };
  }

  /* ---------- 小工具 ---------- */
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  function starsOf(n) { return n >= 3 ? '★★★' : n === 2 ? '★★' : '★'; }
  function palaceOf(z, name) { return z.palaces.find((p) => p.name === name); }
  function mingStars(z) { return z.mingPalace.major.map((m) => m.star); }
  function hasGate(hd, g) { return hd.gates.includes(g); }
  function housePlanets(w, h) { return w.planets.filter((p) => p.key !== 'NorthNode' && p.wholeSignHouse === h); }

  /* ---------- 匯流探針 ---------- */
  function probes(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, misc: M } = d;
    const zm = mingStars(Z);
    const zShen = Z.shenPalace.major.map((m) => m.star);
    const P = [];

    function probe(dim, axis, signals, note) {
      const hits = signals.filter((s) => s.hit);
      P.push({
        dim, axis, note,
        systems: hits.map((s) => s.sys),
        evidence: hits.map((s) => `【${s.sys}】${s.ev}`),
        misses: signals.filter((s) => !s.hit).map((s) => s.sys),
        n: new Set(hits.map((s) => s.sys)).size,
        stars: starsOf(new Set(hits.map((s) => s.sys)).size),
      });
    }

    const shang = B.godScore['食傷'];
    const guan = B.godScore['官殺'];
    const cai = B.godScore['財星'];
    const yin = B.godScore['印星'];
    const bi = B.godScore['比劫'];
    const merc = W.planets.find((p) => p.key === 'Mercury');
    const mars = W.planets.find((p) => p.key === 'Mars');
    const venus = W.planets.find((p) => p.key === 'Venus');
    const sat = W.planets.find((p) => p.key === 'Saturn');
    const vs = (g) => V.strength.find((s) => s.graha === g);

    const throatChs = H.channels.filter((c) => c.centers.includes(2));
    probe('表達與傳播', '把內在內容說／寫／演出來的頻寬', [
      { sys: '八字', hit: shang >= 2.5, ev: `食傷 ${shang.toFixed(1)} 分（門檻2.5）` },
      { sys: '西占', hit: ['雙子', '處女'].includes(merc.sign) || W.aspects.filter((a) => (a.aKey === 'Mercury' || a.bKey === 'Mercury') && a.exact).length >= 2 || housePlanets(W, 3).length >= 2, ev: `水星${merc.sign}${merc.retro ? '逆' : ''}；水星精準相位 ${W.aspects.filter((a) => (a.aKey === 'Mercury' || a.bKey === 'Mercury') && a.exact).length} 個；第3宮 ${housePlanets(W, 3).length} 星` },
      { sys: '人類圖', hit: throatChs.length >= 2, ev: `喉部通道 ${throatChs.length} 條：${throatChs.map((c) => c.name).join('、') || '無'}（門檻≥2）` },
      { sys: '紫微', hit: zm.some((s) => ['巨門', '天機'].includes(s)) || Z.mingPalace.lucky.some((l) => ['文昌', '文曲'].includes(l.star)), ev: `命宮主星 ${zm.join('、') || '無主星'}；命宮昌曲：${Z.mingPalace.lucky.filter((l) => ['文昌', '文曲'].includes(l.star)).map((l) => l.star).join('、') || '無'}` },
      { sys: '印占', hit: vs('Mercury').d1 >= 3, ev: `水星力量 D1=${vs('Mercury').d1}（${vs('Mercury').d1Label}，門檻≥3）` },
      { sys: '靈數', hit: [3, 5].includes(M.numerology.main) || M.numerology.freq[3] >= 2, ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('行動力與衝勁', '從想法到出手的點火速度', [
      { sys: '八字', hit: B.elemPct['火'] >= 30 || B.shensha.some((s) => s.name === '羊刃') || bi >= 3.2, ev: `火 ${B.elemPct['火'].toFixed(0)}%（門檻30）；比劫 ${bi.toFixed(1)}；${B.shensha.some((s) => s.name === '羊刃') ? '帶羊刃' : '無羊刃'}` },
      { sys: '西占', hit: mars.elem === '火' || mars.house === 1 || mars.house === 10 || W.elemPct['火'] >= 38, ev: `火星${mars.sign}（${mars.house}宮）；火象 ${W.elemPct['火'].toFixed(0)}%` },
      { sys: '人類圖', hit: H.type.includes('顯示'), ev: `類型：${H.type}${H.type.includes('顯示') ? '（馬達通喉嚨，先發型）' : '（回應／受邀型，非先發結構）'}` },
      { sys: '紫微', hit: zm.some((s) => ['七殺', '破軍', '貪狼'].includes(s)) || zShen.some((s) => ['七殺', '破軍'].includes(s)), ev: `命宮 ${zm.join('、') || '空宮'}／身宮 ${zShen.join('、') || '空宮'}${zm.concat(zShen).some((s) => ['七殺', '破軍', '貪狼'].includes(s)) ? '（殺破狼結構）' : ''}` },
      { sys: '印占', hit: vs('Mars').d1 >= 2 || V.yogas.some((y) => y.name.includes('Ruchaka')), ev: `火星力量 D1=${vs('Mars').d1}（${vs('Mars').d1Label}）` },
      { sys: '靈數', hit: [1, 8].includes(M.numerology.main), ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('情感深度與感受力', '情緒的水位深度與滲透性', [
      { sys: '八字', hit: B.elemPct['水'] >= 28, ev: `水 ${B.elemPct['水'].toFixed(0)}%` },
      { sys: '西占', hit: W.elemPct['水'] >= 38 || (W.moon.elem === '水' && (housePlanets(W, 8).length >= 2 || housePlanets(W, 12).length >= 2)), ev: `水象 ${W.elemPct['水'].toFixed(0)}%（門檻38）；月亮${W.moon.sign}；8宮${housePlanets(W, 8).length}星／12宮${housePlanets(W, 12).length}星` },
      { sys: '人類圖', hit: H.channels.filter((c) => c.centers.includes(7)).length >= 2, ev: `情緒中心通道 ${H.channels.filter((c) => c.centers.includes(7)).length} 條（門檻≥2）：${H.channels.filter((c) => c.centers.includes(7)).map((c) => c.name).join('、') || '無'}` },
      { sys: '紫微', hit: zm.some((s) => ['太陰', '天同', '天機'].includes(s)) || palaceOf(Z, '福德').major.some((m) => ['太陰', '天同'].includes(m.star)), ev: `命宮 ${zm.join('、') || '空宮'}；福德宮 ${palaceOf(Z, '福德').major.map((m) => m.star).join('、') || '空宮'}` },
      { sys: '印占', hit: ['巨蟹', '天蠍', '雙魚'].includes(V.planets.find((p) => p.key === 'Moon').sign) || [8, 12].includes(V.planets.find((p) => p.key === 'Moon').house), ev: `恆星月亮${V.planets.find((p) => p.key === 'Moon').sign}（第${V.planets.find((p) => p.key === 'Moon').house}宮）；月宿 ${V.moonNak.name}` },
      { sys: '靈數', hit: [2, 6, 9, 11].includes(M.numerology.main), ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('秩序、結構與控制', '對規則、框架與掌控感的需求', [
      { sys: '八字', hit: guan >= 2.8 || (B.pattern && B.pattern.name.includes('正官')), ev: `官殺 ${guan.toFixed(1)} 分（門檻2.8）；格局 ${B.pattern.name}` },
      { sys: '西占', hit: W.elemPct['土'] >= 40 || W.aspects.some((a) => ['Sun', 'Moon'].includes(a.aKey) && a.bKey === 'Saturn' && a.orb < 3) || W.stelliums.some((s) => s.sign === '摩羯'), ev: `土象 ${W.elemPct['土'].toFixed(0)}%（門檻40）；${W.stelliums.filter((s) => s.sign === '摩羯').length ? '摩羯星群（' + W.stelliums.find((s) => s.sign === '摩羯').planets.join('、') + '）' : '日月—土星緊相位：' + (W.aspects.filter((a) => a.bKey === 'Saturn' && ['Sun', 'Moon'].includes(a.aKey) && a.orb < 3).map((a) => a.a + a.sym + a.b).join('、') || '無')}` },
      { sys: '人類圖', hit: H.channels.some((c) => ['邏輯', '組織（接納）', '專注'].includes(c.name)), ev: `邏輯迴路通道：${H.channels.filter((c) => ['邏輯', '組織（接納）', '專注'].includes(c.name)).map((c) => c.name).join('、') || '無'}` },
      { sys: '紫微', hit: zm.some((s) => ['天相', '天梁', '武曲', '紫微'].includes(s)), ev: `命宮 ${zm.join('、') || '空宮'}` },
      { sys: '印占', hit: vs('Saturn').d1 >= 2 || V.yogas.some((y) => y.name.includes('Shasha')), ev: `土星力量 D1=${vs('Saturn').d1}（${vs('Saturn').d1Label}）` },
      { sys: '靈數', hit: [4, 22, 8].includes(M.numerology.main), ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('直覺與非線性認知', '不經推理直接「知道」的通道', [
      { sys: '八字', hit: Object.values(B.stemGods).includes('偏印') || B.shensha.some((s) => s.name === '華蓋' && (s.at.includes('日') || s.at.includes('時'))), ev: `偏印${Object.values(B.stemGods).includes('偏印') ? '透干' : '未透干'}；華蓋${B.shensha.some((s) => s.name === '華蓋' && (s.at.includes('日') || s.at.includes('時'))) ? '坐日／時支' : '不在日時'}` },
      { sys: '西占', hit: W.aspects.some((a) => ['Neptune', 'Pluto'].includes(a.bKey) && ['Sun', 'Moon'].includes(a.aKey) && ['合相', '四分', '對分'].includes(a.type) && a.orb < 2.5), ev: `海冥對日月硬相位（<2.5°）：${W.aspects.filter((a) => ['Neptune', 'Pluto'].includes(a.bKey) && ['Sun', 'Moon'].includes(a.aKey) && ['合相', '四分', '對分'].includes(a.type) && a.orb < 2.5).map((a) => a.a + a.sym + a.b + '(' + a.orb + '°)').join('、') || '無'}` },
      { sys: '人類圖', hit: H.definedCenters.some((c) => c.includes('直覺')) && hasGate(H, 57), ev: `直覺中心${H.definedCenters.some((c) => c.includes('直覺')) ? '有定義' : '開放'}＋閘門57（直覺）${hasGate(H, 57) ? '啟動' : '未啟動'}` },
      { sys: '紫微', hit: zm.some((s) => ['天機', '太陰'].includes(s)) || Z.mingzhu === '文曲', ev: `命宮 ${zm.join('、') || '空宮'}；命主 ${Z.mingzhu}` },
      { sys: '印占', hit: ['Ketu', 'Saturn'].includes(V.moonNak.lord) || V.planets.find((p) => p.key === 'Ketu').house === 1, ev: `月宿主星 ${ML.vedic.LORD_ZH[V.moonNak.lord]}；計都第 ${V.planets.find((p) => p.key === 'Ketu').house} 宮` },
      { sys: '靈數', hit: [7, 11].includes(M.numerology.main) || M.numerology.freq[7] >= 2, ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('領導與舞台', '站到人前、拿主導權的引力', [
      { sys: '八字', hit: (guan >= 2.8 && bi >= 2) || B.shensha.some((s) => s.name === '魁罡') || (B.shensha.some((s) => s.name === '將星') && guan >= 2.5), ev: `官殺 ${guan.toFixed(1)}／比劫 ${bi.toFixed(1)}；${B.shensha.filter((s) => ['將星', '魁罡'].includes(s.name)).map((s) => s.name).join('、') || '無將星魁罡'}` },
      { sys: '西占', hit: W.sun.house === 10 || W.sun.house === 1 || W.sun.sign === '獅子' || housePlanets(W, 10).length >= 2, ev: `太陽第 ${W.sun.house} 宮；10宮 ${housePlanets(W, 10).length} 星` },
      { sys: '人類圖', hit: H.channels.some((c) => ['領導', '金錢線', '發起'].includes(c.name)) || H.profile.startsWith('5'), ev: `通道 ${H.channels.filter((c) => ['領導', '金錢線', '發起'].includes(c.name)).map((c) => c.name).join('、') || '無領導群通道'}；人生角色 ${H.profile}` },
      { sys: '紫微', hit: zm.some((s) => ['紫微', '太陽', '七殺'].includes(s)), ev: `命宮 ${zm.join('、') || '空宮'}` },
      { sys: '印占', hit: ['入廟', '入旺'].some((l) => vs('Sun').d1Label.includes(l)) || V.yogas.filter((y) => y.name.includes('Mahapurusha')).length >= 1 && vs('Sun').d1 >= 1, ev: `太陽力量 D1=${vs('Sun').d1}（${vs('Sun').d1Label}）；${V.yogas.filter((y) => y.name.includes('Mahapurusha')).map((y) => y.name).join('、') || '無五大人格瑜伽'}` },
      { sys: '靈數', hit: [1, 8].includes(M.numerology.main), ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('財務嗅覺與資源運籌', '對錢與資源流的天生敏感度', [
      { sys: '八字', hit: cai >= 2.5, ev: `財星 ${cai.toFixed(1)} 分（含藏干）` },
      { sys: '西占', hit: housePlanets(W, 2).length >= 2 || W.aspects.some((a) => a.aKey === 'Venus' && a.bKey === 'Jupiter' && a.orb < 4), ev: `2宮 ${housePlanets(W, 2).length} 星；金木相位：${W.aspects.filter((a) => a.aKey === 'Venus' && a.bKey === 'Jupiter').map((a) => a.type + a.orb + '°').join('、') || '無'}` },
      { sys: '人類圖', hit: H.channels.some((c) => ['金錢線', '投降（傳訊）'].includes(c.name)) || [21, 45, 26, 44].filter((g) => hasGate(H, g)).length >= 3, ev: `${H.channels.filter((c) => ['金錢線', '投降（傳訊）'].includes(c.name)).map((c) => c.name).join('、') || '物質閘門 ' + [21, 45, 26, 44].filter((g) => hasGate(H, g)).join('、') + '（門檻≥3）'}` },
      { sys: '紫微', hit: zm.some((s) => ['武曲', '天府', '太陰'].includes(s)) || palaceOf(Z, '財帛').score >= 4, ev: `命宮 ${zm.join('、') || '空宮'}；財帛宮強度 ${palaceOf(Z, '財帛').score}（門檻≥4）` },
      { sys: '印占', hit: vs('Venus').d1 >= 3 || vs('Jupiter').d1 >= 3, ev: `金星 D1=${vs('Venus').d1}／木星 D1=${vs('Jupiter').d1}（門檻≥3）` },
      { sys: '靈數', hit: M.numerology.main === 8 || M.numerology.freq[8] >= 2, ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('研究、深度與洞察', '往一個題目深處鑽的續航力', [
      { sys: '八字', hit: yin >= 3 || (B.shensha.some((s) => s.name === '文昌') && yin >= 2), ev: `印星 ${yin.toFixed(1)} 分（門檻3，帶文昌降為2）；${B.shensha.some((s) => s.name === '文昌') ? '文昌入柱' : '無文昌'}` },
      { sys: '西占', hit: housePlanets(W, 9).length >= 2 || housePlanets(W, 8).length >= 2 || W.aspects.some((a) => a.aKey === 'Mercury' && a.bKey === 'Saturn' && a.orb < 3), ev: `9宮${housePlanets(W, 9).length}星／8宮${housePlanets(W, 8).length}星；水土緊相位：${W.aspects.filter((a) => a.aKey === 'Mercury' && a.bKey === 'Saturn' && a.orb < 3).map((a) => a.type).join('、') || '無'}` },
      { sys: '人類圖', hit: H.channels.some((c) => ['波長（才華）', '覺知', '抽象', '邏輯', '架構'].includes(c.name)), ev: `深度迴路通道：${H.channels.filter((c) => ['波長（才華）', '覺知', '抽象', '邏輯', '架構'].includes(c.name)).map((c) => c.name).join('、') || '無'}` },
      { sys: '紫微', hit: zm.some((s) => ['天機', '天梁'].includes(s)) || Z.mingPalace.lucky.some((l) => ['文昌', '文曲'].includes(l.star)), ev: `命宮 ${zm.join('、') || '空宮'}${Z.mingPalace.lucky.length ? '＋' + Z.mingPalace.lucky.map((l) => l.star).join('、') : ''}` },
      { sys: '印占', hit: ['入廟', '入旺'].some((l) => vs('Jupiter').d1Label.includes(l)) || vs('Mercury').d9 >= 2, ev: `木星 D1=${vs('Jupiter').d1}（${vs('Jupiter').d1Label}）；水星 D9=${vs('Mercury').d9}` },
      { sys: '靈數', hit: M.numerology.main === 7 || M.numerology.freq[7] >= 2, ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('人群魅力與桃花', '不費力吸引注意力的場', [
      { sys: '八字', hit: B.shensha.some((s) => s.name === '桃花'), ev: `${B.shensha.find((s) => s.name === '桃花') ? '桃花在' + B.shensha.find((s) => s.name === '桃花').at : '無桃花'}` },
      { sys: '西占', hit: venus.house === 1 || venus.house === 10 || venus.sign === '天秤' || venus.sign === '金牛', ev: `金星${venus.sign}（${venus.house}宮）` },
      { sys: '人類圖', hit: H.channels.some((c) => ['魅力', '開放', '韻律'].includes(c.name)), ev: `${H.channels.filter((c) => ['魅力', '開放', '韻律'].includes(c.name)).map((c) => c.name).join('、') || '無魅力群通道'}` },
      { sys: '紫微', hit: zm.some((s) => ['貪狼', '太陰', '天同'].includes(s)) || [...Z.mingPalace.misc, ...palaceOf(Z, '夫妻').misc].some((m) => ['紅鸞', '天喜'].includes(m.star)), ev: `命宮 ${zm.join('、') || '空宮'}；紅鸞天喜：${[...Z.mingPalace.misc, ...palaceOf(Z, '夫妻').misc].filter((m) => ['紅鸞', '天喜'].includes(m.star)).map((m) => m.star).join('、') || '不在命/夫妻'}` },
      { sys: '印占', hit: vs('Venus').d1 >= 3, ev: `金星 D1=${vs('Venus').d1}（${vs('Venus').d1Label}）` },
      { sys: '靈數', hit: [3, 6].includes(M.numerology.main), ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('遷移、變動與自由', '對「移動、換場景」的結構性需求', [
      { sys: '八字', hit: B.shensha.some((s) => s.name === '驛馬'), ev: `${B.shensha.find((s) => s.name === '驛馬') ? '驛馬在' + B.shensha.find((s) => s.name === '驛馬').at : '無驛馬'}` },
      { sys: '西占', hit: W.modePct['變動'] >= 45 || housePlanets(W, 9).length >= 2 || W.sun.sign === '射手', ev: `變動宮 ${W.modePct['變動'].toFixed(0)}%（門檻45）；9宮 ${housePlanets(W, 9).length} 星` },
      { sys: '人類圖', hit: H.channels.some((c) => ['無常', '成熟', '發現'].includes(c.name)), ev: `${H.channels.filter((c) => ['無常', '成熟', '發現'].includes(c.name)).map((c) => c.name).join('、') || '無變動迴路通道'}` },
      { sys: '紫微', hit: palaceOf(Z, '遷移').score >= 4 || [Z.mingIdx, C.mod(Z.mingIdx + 6, 12)].some((bi) => Z.palaces[bi].misc.some((m) => m.star === '天馬')), ev: `遷移宮強度 ${palaceOf(Z, '遷移').score}（門檻≥4）；天馬在${Z.palaces.find((p) => p.misc.some((m) => m.star === '天馬')).name}宮` },
      { sys: '印占', hit: [9, 12].includes(V.planets.find((p) => p.key === 'Rahu').house) || V.moonNak.lord === 'Rahu', ev: `羅睺第 ${V.planets.find((p) => p.key === 'Rahu').house} 宮；月宿主星 ${ML.vedic.LORD_ZH[V.moonNak.lord]}` },
      { sys: '靈數', hit: M.numerology.main === 5 || M.numerology.freq[5] >= 2, ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('批判眼與完美主義', '一眼看到「哪裡不對」的雷達', [
      { sys: '八字', hit: shang >= 2.2 && guan >= 2.2, ev: `食傷 ${shang.toFixed(1)} 與官殺 ${guan.toFixed(1)} 並旺（挑錯與標準並存）` },
      { sys: '西占', hit: [W.sun, W.moon, merc].some((p) => p.sign === '處女') || W.aspects.some((a) => ['Sun', 'Moon', 'Mercury'].includes(a.aKey) && a.bKey === 'Saturn' && a.type === '四分'), ev: `處女座配置：${[W.sun, W.moon, merc].filter((p) => p.sign === '處女').map((p) => p.name).join('、') || '無'}` },
      { sys: '人類圖', hit: hasGate(H, 18) || hasGate(H, 58) || H.channels.some((c) => c.name.includes('批判')), ev: `${[18, 58].filter((g) => hasGate(H, g)).map((g) => '閘門' + g).join('、') || '無批判閘門'}${H.channels.some((c) => c.name.includes('批判')) ? '（18-58 成通道）' : ''}` },
      { sys: '紫微', hit: zm.some((s) => ['天相', '巨門', '天梁'].includes(s)), ev: `命宮 ${zm.join('、') || '空宮'}` },
      { sys: '印占', hit: V.planets.find((p) => p.key === 'Moon').sign === '處女' || vs('Mercury').d1 >= 2 && vs('Saturn').d1 >= 2, ev: `恆星月亮${V.planets.find((p) => p.key === 'Moon').sign}` },
      { sys: '靈數', hit: [4, 7].includes(M.numerology.main), ev: `主命數 ${M.numerology.main}` },
    ]);

    probe('美感與藝術頻道', '對美的形式敏感並想動手做', [
      { sys: '八字', hit: shang >= 2.5 && B.shensha.some((s) => ['桃花', '華蓋'].includes(s.name)), ev: `食傷 ${shang.toFixed(1)}（門檻2.5）＋${B.shensha.filter((s) => ['桃花', '華蓋'].includes(s.name)).map((s) => s.name).join('、') || '無桃花華蓋'}` },
      { sys: '西占', hit: ['金牛', '天秤', '雙魚'].includes(venus.sign) || venus.house === 5 || W.aspects.some((a) => a.aKey === 'Venus' && a.bKey === 'Neptune' && a.orb < 3), ev: `金星${venus.sign}（${venus.house}宮）` },
      { sys: '人類圖', hit: H.channels.some((c) => ['開放', '啟發', '好奇'].includes(c.name)) || [1, 8, 22].filter((g) => hasGate(H, g)).length >= 2, ev: `${H.channels.filter((c) => ['開放', '啟發', '好奇'].includes(c.name)).map((c) => c.name).join('、') || '藝術閘門 ' + [1, 8, 22].filter((g) => hasGate(H, g)).join('、') + '（門檻≥2）'}` },
      { sys: '紫微', hit: zm.some((s) => ['貪狼', '太陰', '天同'].includes(s)) || Z.mingPalace.lucky.some((l) => ['文昌', '文曲'].includes(l.star)), ev: `命宮 ${zm.join('、') || '空宮'}` },
      { sys: '印占', hit: vs('Venus').d1 >= 3 || (vs('Venus').d1 >= 2 && vs('Venus').d9 >= 2), ev: `金星 D1=${vs('Venus').d1}／D9=${vs('Venus').d9}` },
      { sys: '靈數', hit: [3, 6].includes(M.numerology.main) || M.numerology.freq[3] >= 2 || M.numerology.freq[6] >= 2, ev: `主命數 ${M.numerology.main}` },
    ]);

    return P.sort((a, b) => b.n - a.n);
  }

  /* ---------- 矛盾偵測 ---------- */
  function contradictions(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z } = d;
    const list = [];

    // 座標系假衝突：回歸 vs 恆星
    const shifted = [];
    for (const p of W.planets) {
      if (p.key === 'NorthNode') continue;
      const vp = V.planets.find((x) => x.key === p.key);
      if (vp && vp.sign !== p.sign) shifted.push(`${p.name}：回歸${p.sign} → 恆星${vp.sign}`);
    }
    if (shifted.length) {
      list.push({
        type: '假衝突（座標系差異）',
        what: `西占（回歸黃道）與印占（Lahiri 恆星制）星座不同：${shifted.slice(0, 4).join('；')}${shifted.length > 4 ? '…等 ' + shifted.length + ' 顆' : ''}`,
        verdict: '兩套黃道原點不同（相差 ayanamsa ' + V.ayanamsa.toFixed(1) + '°），這不是誰對誰錯，也不是互相打架。西占讀「季節性人格光譜」、印占讀「恆星背景與業力軸」，各自在自己的座標系內解讀，不要把兩邊混著比。',
      });
    }
    // 年界假衝突：八字（立春）vs 紫微（正月初一）
    if (B.pillars.year.name !== Z.lunar.yearGZ.name) {
      list.push({
        type: '假衝突（年界流派）',
        what: `八字年柱 ${B.pillars.year.name}（立春界）≠ 紫微生年 ${Z.lunar.yearGZ.name}（正月初一界）`,
        verdict: '出生落在立春與春節之間，兩套系統年界定義不同所致，皆屬正確排法。',
      });
    }
    // 真對立候選：HD 非薦骨型 vs 高行動訊號
    const driveP = probes(d).find((p) => p.dim === '行動力與衝勁');
    if (!H.definedCenters.includes('薦骨') && driveP && driveP.n >= 3) {
      list.push({
        type: '真對立（能量供給 vs 行動慾望）',
        what: `人類圖為${H.type}（無持續薦骨馬達），但 ${driveP.systems.filter((s) => s !== '人類圖').join('、')} 都指向高行動慾望`,
        verdict: '想衝的慾望是真的，但持續輸出的引擎是借來的。建議用「短衝刺＋長休整」的節奏取代等速輸出：發起和指揮的位置留給自己，需要長期綿延的執行交給環境或團隊。',
      });
    }
    if (H.definedCenters.includes('薦骨') && driveP && driveP.n <= 1) {
      list.push({
        type: '待調和（引擎在但油門訊號弱）',
        what: `人類圖薦骨有定義（產能引擎在），但其他系統的行動訊號不強（${driveP.n} 系統）`,
        verdict: '可能是「有體力但不主動出擊」的回應型結構：等對的事來回應，比主動發起更順。',
      });
    }
    // 並存：情感深 & 秩序控制同高（區塊F軸向並存示範）
    const ps = probes(d);
    const emo = ps.find((p) => p.dim === '情感深度與感受力');
    const ord = ps.find((p) => p.dim === '秩序、結構與控制');
    if (emo && ord && emo.n >= 2 && ord.n >= 2) {
      list.push({
        type: '並存（軸向並存，非衝突）',
        what: `「情感深度」（${emo.stars}）與「秩序控制」（${ord.stars}）同時高分`,
        verdict: '這不是矛盾：感受力與結構力是兩條獨立座標軸，可以同時高分。常見外顯：對人柔軟、對事嚴格；或平時理性、特定情境下情感全開（見 L3 狀態切換表）。',
      });
    }
    // 身強弱邊緣
    if (B.strength.includes('中和')) {
      list.push({
        type: '流派敏感（八字身強弱在邊緣帶）',
        what: `身強弱判分 ${B.strengthScore.toFixed(0)}（${B.strength}），落在門檻附近`,
        verdict: '不同流派可能給出相反的喜用神。本報告的喜用（' + B.favorable.join('、') + '）僅視為工作假設，建議用第九節的假說對照你實際走過的年份，確認後再校準。',
      });
    }
    return list;
  }

  /* ---------- 時間層：三波對齊 ---------- */
  function timeline(d) {
    const { bazi: B, vedic: V, ziwei: Z, input } = d;
    const birthYear = input.y;
    const tracks = [];
    tracks.push({
      system: '八字大運',
      spans: B.luck.steps.map((s) => ({
        from: birthYear + Math.floor(s.ageFrom), to: birthYear + Math.floor(s.ageTo),
        label: s.gz.name + '運',
        sub: `這十年${s.favorableHit >= 2 ? '干支都是你的喜用五行，大環境雙重順風' : s.favorableHit === 1 ? '有一半是你的喜用五行，環境偏順' : '五行不是你的喜用，環境無加成、靠自己'}（天干十神＝${s.stemGod}、地支主氣＝${s.branchMainGod}）`,
        tone: s.favorableHit >= 2 ? 'good' : s.favorableHit === 1 ? 'mid' : 'low',
      })),
    });
    tracks.push({
      system: '紫微大限',
      spans: Z.daxian.map((x) => {
        const p = Z.palaces[x.branchIdx];
        return {
          from: birthYear + x.ageFrom, to: birthYear + x.ageTo,
          label: `${x.stem}${x.branch}限`,
          sub: `這十年聚光燈打在「${x.palaceName}」領域，該宮先天強度 ${p.score} 分（${p.score >= 3 ? '強，主戲好打' : p.score <= -2 ? '弱，這十年偏磨練' : '中等'}）`,
          tone: p.score >= 3 ? 'good' : p.score <= -2 ? 'low' : 'mid',
        };
      }),
    });
    tracks.push({
      system: '印占大運',
      spans: V.dashas.filter((x) => x.endAge > 0).map((x) => {
        const st = V.strength.find((s) => s.graha === x.lord);
        const power = st ? st.d1 : 0;
        return {
          from: birthYear + Math.max(0, x.startAge), to: birthYear + x.endAge,
          label: x.lordZh + '大運',
          sub: `這段人生由「${x.lordZh}」主題定調，該星在你本命盤的力量 ${power >= 0 ? '+' : ''}${power}（${power >= 2 ? '有力，這章走得順' : power <= -1 ? '偏弱，這章的課題要用功' : '中等'}）`,
          tone: power >= 2 ? 'good' : power <= -1 ? 'low' : 'mid',
        };
      }),
    });
    // 換軌窗口：≥2 系統在 ±2 年內同時換段
    const switches = [];
    for (const t of tracks) for (const s of t.spans) switches.push({ year: s.from, sys: t.system, label: s.label });
    const windows = [];
    const sorted = switches.filter((s) => s.year > birthYear).sort((a, b) => a.year - b.year);
    for (let i = 0; i < sorted.length; i++) {
      const grp = sorted.filter((s) => Math.abs(s.year - sorted[i].year) <= 2);
      const sysSet = new Set(grp.map((g) => g.sys));
      if (sysSet.size >= 2) {
        const c = Math.round(grp.reduce((a, g) => a + g.year, 0) / grp.length);
        if (!windows.some((w) => Math.abs(w.year - c) <= 2)) {
          windows.push({ year: c, systems: [...sysSet], detail: grp.map((g) => `${g.year} ${g.sys}換${g.label}`).join('；') });
        }
      }
    }
    return { tracks, windows };
  }

  /* ---------- 流年紅綠燈十年表 ---------- */
  const XING_PAIRS = ['子卯', '寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未'];
  const LIUHE_PAIRS = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
  const LIUHAI_PAIRS = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
  const pairIn = (list, a, b) => list.includes(a + b) || list.includes(b + a);

  // 木星／土星回歸年（掃描每年中點的行運—本命距角，取局部最小）
  function planetReturns(d, body, maxAge) {
    const natal = d.west.planets.find((p) => p.key === body).lon;
    const diffs = [];
    for (let age = 1; age <= maxAge; age++) {
      const t = new Date(Date.UTC(d.input.y + age, 6, 1));
      const lon = C.eclLon(body, t).lon;
      diffs.push({ year: d.input.y + age, diff: Math.abs(C.mod(lon - natal + 180, 360) - 180) });
    }
    const thr = body === 'Jupiter' ? 16 : 7;
    const out = [];
    for (let i = 1; i < diffs.length - 1; i++) {
      if (diffs[i].diff < thr && diffs[i].diff <= diffs[i - 1].diff && diffs[i].diff <= diffs[i + 1].diff) out.push(diffs[i].year);
    }
    return out;
  }

  function annualTable(d, fromYear, count) {
    const { bazi: B, ziwei: Z, input } = d;
    const dayBranch = B.pillars.day.branch;
    const natalYearBranch = B.pillars.year.branch;
    const maxAge = fromYear - input.y + count + 1;
    const jupR = planetReturns(d, 'Jupiter', Math.min(maxAge, 95));
    const satR = planetReturns(d, 'Saturn', Math.min(maxAge, 95));
    // 星 → 本命宮
    const starPalace = {};
    for (const p of Z.palaces) {
      for (const s of [...p.major, ...p.lucky]) starPalace[s.star] = p.name;
    }
    const rows = [];
    for (let i = 0; i < count; i++) {
      const Y = fromYear + i;
      const gz = C.ganzhi(C.mod(Y - 1984, 60));
      const god = ML.bazi.tenGod(B.pillars.day.stemIdx, gz.stemIdx);
      const reasons = [];
      let score = 0;
      // 喜用
      const favHits = [C.STEM_ELEM[gz.stemIdx], C.BRANCH_ELEM[gz.branchIdx]].filter((e) => B.favorable.includes(e)).length;
      score += favHits;
      if (favHits) reasons.push(`流年${favHits === 2 ? '干支皆' : ''}帶喜用（+${favHits}）`);
      else reasons.push('流年五行非喜用');
      // 太歲
      const yb = gz.branch;
      const ybi = gz.branchIdx, nbi = C.BRANCHES.indexOf(natalYearBranch);
      if (yb === natalYearBranch) { score -= 0.5; reasons.push('值太歲（本命年）'); }
      else if (C.mod(ybi - nbi, 12) === 6) { score -= 1; reasons.push('沖太歲'); }
      else if (pairIn(XING_PAIRS, yb, natalYearBranch)) { score -= 0.5; reasons.push('刑太歲'); }
      else if (pairIn(LIUHAI_PAIRS, yb, natalYearBranch)) { score -= 0.5; reasons.push('害太歲'); }
      else if (pairIn(LIUHE_PAIRS, yb, natalYearBranch)) { score += 0.5; reasons.push('合太歲'); }
      // 沖日支（自身／婚姻宮動）
      if (C.mod(ybi - C.BRANCHES.indexOf(dayBranch), 12) === 6) { score -= 0.5; reasons.push('流年沖日支（自身與親密關係易動）'); }
      // 紫微流年四化
      const hua = ML.ziwei.SIHUA[gz.stem];
      const jiP = starPalace[hua['忌']];
      const luP = starPalace[hua['祿']];
      if (jiP) {
        reasons.push(`${hua['忌']}化忌入${jiP}`);
        if (['命宮', '財帛', '官祿', '夫妻'].includes(jiP)) score -= 0.5;
      }
      if (luP) {
        reasons.push(`${hua['祿']}化祿入${luP}`);
        if (['命宮', '財帛', '官祿', '夫妻'].includes(luP)) score += 0.5;
      }
      // 土木回歸
      if (satR.includes(Y)) { score -= 1; reasons.push('土星回歸（結構重組年，防守與收斂）'); }
      if (jupR.includes(Y)) { score += 0.5; reasons.push('木星回歸（十二年週期起點，擴張窗口）'); }
      const tone = score >= 1.5 ? 'good' : score <= -1 ? 'low' : 'mid';
      rows.push({ year: Y, age: Y - input.y, gz: gz.name, god, score: Math.round(score * 10) / 10, tone, reasons });
    }
    return { rows, jupR, satR };
  }

  /* ---------- L0–L3 動靜分層 ---------- */
  function dynamicLayers(d, now) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, misc: M, input } = d;
    const nowY = now.getFullYear();
    const age = nowY - input.y;
    const curLuck = B.luck.steps.find((s) => age >= s.ageFrom && age < s.ageTo);
    const curDaxian = Z.daxian.find((x) => age >= x.ageFrom && age <= x.ageTo);
    const curDasha = V.dashas.find((x) => age >= Math.max(0, x.startAge) && age < x.endAge);
    const curAntar = curDasha ? curDasha.antars.find((a) => now >= a.start && now < a.end) : null;
    const yearGZ = C.ganzhi(C.mod(nowY - 1984, 60));

    const L0 = [
      `八字原局：${B.pillars.year.name} ${B.pillars.month.name} ${B.pillars.day.name} ${B.pillars.hour.name}（日主${B.dayMaster.stem}${B.dayMaster.elem}・${B.strength}・${B.pattern.name}）`,
      `西占本命：日${W.sun.sign}／月${W.moon.sign}／升${W.asc.sign}，相位結構與宮位一生不變`,
      `人類圖：${H.type}・${H.authority}・${H.profile} ${H.profileName}・${H.definition}`,
      `紫微本命盤：命宮${Z.mingBranch}（${mingStars(Z).join('、') || '空宮借對宮'}）・${Z.juName}・生年四化 ${Object.entries(Z.sihua).map(([k, v]) => v + '化' + k).join('、')}`,
      `印占：恆星月亮${V.planets.find((p) => p.key === 'Moon').sign}・月宿 ${V.moonNak.name}`,
      `命卦 ${M.gua.name}（${M.gua.group}）・馬雅 ${M.maya.title || '—'}・生命靈數 ${M.numerology.main}`,
    ];
    const L1 = [
      curLuck ? `八字大運（現行）：${curLuck.gz.name}運 ${curLuck.ageFrom}–${curLuck.ageTo}歲（${curLuck.stemGod}／${curLuck.branchMainGod}${curLuck.favorableHit >= 1 ? '・帶喜用' : '・非喜用'}）` : '八字大運：尚未起運（幼限）',
      curDaxian ? `紫微大限（現行）：${curDaxian.stem}${curDaxian.branch}限 ${curDaxian.ageFrom}–${curDaxian.ageTo}歲，走${curDaxian.palaceName}宮，本限四化 ${Object.entries(curDaxian.hua).map(([k, v]) => v + k).join('、')}` : '紫微大限：計算範圍外',
      curDasha ? `印占大運（現行）：${curDasha.lordZh}大運（至 ${curDasha.end.getFullYear()} 年）${curAntar ? '・中運 ' + curAntar.lordZh + '（至 ' + curAntar.end.getFullYear() + '/' + (curAntar.end.getMonth() + 1) + '）' : ''}` : '印占大運：範圍外',
    ];
    const L2 = [
      `${nowY} 流年：${yearGZ.name}年（相對日主為${ML.bazi.tenGod(B.pillars.day.stemIdx, yearGZ.stemIdx)}年）`,
      `紫微流年四化（${yearGZ.stem}干）：${Object.entries(ML.ziwei.SIHUA[yearGZ.stem]).map(([k, v]) => v + '化' + k).join('、')}`,
      '西占行運與太陽回歸：屬年度細部校準，建議以匯出提示詞交給 AI 展開',
    ];
    // L3 狀態切換表
    const emoDefined = H.definedCenters.some((c) => c.includes('情緒'));
    const L3 = [
      {
        scene: '初識／新環境', parts: `西占上升${W.asc.sign}＋HD ${H.type}策略`,
        looks: `先以${W.asc.sign}的介面應對（${W.asc.sign === '摩羯' || W.asc.sign === '處女' || W.asc.sign === '金牛' ? '穩、慢熱、先觀察規則' : W.asc.sign === '牡羊' || W.asc.sign === '獅子' || W.asc.sign === '射手' ? '直接、熱、先出手再說' : W.asc.sign === '雙子' || W.asc.sign === '天秤' || W.asc.sign === '水瓶' ? '聊、對頻、先社交掃描' : '感應場、先讀氣氛'}）`,
      },
      {
        scene: '親密關係穩定期', parts: `西占月亮${W.moon.sign}＋紫微夫妻宮（${palaceOf(Z, '夫妻').major.map((m) => m.star).join('、') || '空宮'}）`,
        looks: `卸下介面後由月亮${W.moon.sign}接手：需求變成「${['巨蟹', '金牛', '雙魚'].includes(W.moon.sign) ? '被穩定照顧與歸屬' : ['牡羊', '獅子', '射手'].includes(W.moon.sign) ? '被崇拜與保有自由' : ['雙子', '天秤', '水瓶'].includes(W.moon.sign) ? '被理解與說話有人接' : '被深度信任、共享祕密'}」`,
      },
      {
        scene: '衝突當下', parts: `西占火星${W.planets.find((p) => p.key === 'Mars').sign}＋八字${B.godScore['官殺'] >= B.godScore['食傷'] ? '官殺' : '食傷'}主導`,
        looks: `${B.godScore['官殺'] >= B.godScore['食傷'] ? '先壓住情緒講規則，但累積後一次清算' : '嘴上不讓人，直接指出對方哪裡錯'}（火星${W.planets.find((p) => p.key === 'Mars').sign}的出手方式）`,
      },
      {
        scene: '壓力低谷', parts: `HD ${emoDefined ? '情緒中心定義（自帶情緒波）' : '情緒中心開放（吸收放大他人情緒）'}＋月亮${W.moon.sign}`,
        looks: emoDefined ? '低谷是內建週期的谷底：不是壞掉，是波形走到低點——等波過，不在谷底做決定' : '低谷常是「替別人扛的情緒」：離開現場情緒就掉一半——先分辨是誰的情緒',
      },
      {
        scene: '工作場域', parts: `西占天頂${W.mc.sign}＋紫微官祿宮（${palaceOf(Z, '官祿').major.map((m) => m.star).join('、') || '空宮'}）＋八字${B.pattern.name}`,
        looks: `對外職業面具是${W.mc.sign}式的，內在做事邏輯是${B.pattern.name}式的——兩者不一致時會被說「你本人跟工作形象不一樣」`,
      },
    ];
    return { L0, L1, L2, L3, now: nowY, age };
  }

  /* ---------- 待驗證假說（白話短句＋生活化例子＋盤面依據，全部可證偽） ---------- */
  function hypotheses(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, misc: M } = d;
    const pool = [];
    const add = (claim, example, src) => pool.push({ claim, example, src });

    for (const a of W.aspects.filter((x) => x.exact)) {
      add(`同一種劇本在你人生重播過至少三次`,
        `例如：換了不同公司、不同對象，最後卡住的點卻是同一個——旁人聽你講會說「這不就跟上次一樣嗎」。`,
        `西占 ${a.a}${a.sym}${a.b} 精準相位（差距僅 ${a.orb}°，少見）`);
    }
    for (const u of W.unaspected) {
      add(`「${u.replace('（平均）', '')}」代表的那種能力，你要嘛完全不用、一用就過頭`,
        `例如：平常完全不碰，某天突然全力投入，力道大到身邊的人嚇一跳，覺得「你今天怪怪的」。`,
        `西占 ${u} 無相位（功能孤島配置）`);
    }
    if (W.keyDegrees.length) {
      add('每到「換階段」前夕（畢業、離職、搬家），你會突然特別急',
        '例如：平常拖拖拉拉，但期限或轉捩點一逼近，會爆發式地在最後關頭把事情全做完。',
        `西占 ${W.keyDegrees[0]}`);
    }
    if (B.kongHits.length) {
      const area = B.kongHits.map((k) => k === '年' ? '老家、童年' : k === '月' ? '父母、職場' : '晚年、子女').join('與');
      add(`「${area}」這塊，形式上都在、感受上卻隔一層`,
        '例如：逢年過節都有到場，該做的都做了，但你自己知道心裡沒有那麼「踏實在場」。',
        `八字${B.kongHits.join('、')}支落空亡`);
    }
    if (B.dayClash) {
      add('你的住處、感情或身體狀態，比別人更常「突然翻頁」',
        '例如：搬家次數比同齡人多、關係說變就變、身體狀況說來就來——不是慢慢變，是一夕之間換場景。',
        '八字日支逢沖');
    }
    if (B.relations.some((r) => r.kind === '三刑')) {
      add('「誰該負責、誰說了算」的糾紛總是找上你',
        '例如：在家裡、職場、朋友群都遇過類似的權責衝突，場景不同但劇情雷同。',
        `八字${B.relations.find((r) => r.kind === '三刑').where}三刑`);
    }
    if (B.shensha.some((s) => s.name === '羊刃')) {
      add('你平常控制得很好，但一年總有一兩次爆大的',
        '例如：忍很久都沒事，某次被踩到「不准指揮我」的線，火山式爆發，連自己都意外。',
        '八字帶羊刃');
    }
    if (B.shensha.some((s) => s.name === '魁罡')) {
      add('你受不了模糊跟和稀泥，也曾因為太直接得罪過重要的人',
        '例如：會議上大家都打太極，只有你把話挑明——事後知道有人記恨，但你還是覺得該說。',
        '八字日柱魁罡');
    }
    if (B.shensha.some((s) => s.name === '華蓋')) {
      add('獨處對你是充電，不是懲罰',
        '例如：連續社交三天後明顯「沒電」、工作品質下滑；自己安靜待一天就恢復了。',
        '八字帶華蓋');
    }
    if (V.yogas.some((y) => y.name.includes('Kemadruma'))) {
      add('心情跌到谷底時，你誰都不找，事後才輕描淡寫帶過',
        '例如：最親的人常說「你難過的時候我都不知道，知道時已經過了」。',
        '印占孤月（Kemadruma）');
    }
    if (H.splitCount >= 2) {
      add('你長期覺得自己「像兩個人」，而且需要特定的人在場，腦袋才會通',
        '例如：跟某些朋友聊天時思路特別順、決定下得特別快；那個人不在，你會想很久還定不下來。',
        `人類圖${H.definition}（能量迴路分成 ${H.splitCount} 塊）`);
    }
    if (!H.definedCenters.includes('薦骨') && H.type.includes('投射者')) {
      add('同一句建議，別人來問時你講效果就好；你主動講，反而沒人聽',
        '例如：主動提醒同事會被已讀或反駁；但對方哪天自己來請教，你講一樣的話他卻猛點頭。',
        '人類圖投射者（等邀請的結構）');
    }
    if (Z.mingPalace.major.length === 0) {
      add('不同圈子的朋友描述你，聽起來像在講兩個不同的人',
        '例如：同事說你冷靜寡言，老友說你瘋癲搞笑——你自己也說不清哪個才是「本體」。',
        '紫微命宮無主星（自我形象隨情境變形）');
    }
    {
      const jiStar = Z.sihua['忌'];
      const jiPalace = Z.palaces.find((p) => [...p.major, ...p.lucky].some((s) => s.star === jiStar));
      if (jiPalace) {
        add(`「${jiPalace.name}」相關的事，你越用力越糾結，放手反而好轉`,
          '例如：拼命想抓緊時狀況連連；哪次真的累了不管了，事情反而自己順了。',
          `紫微生年${jiStar}化忌落${jiPalace.name}宮`);
      }
    }
    if (M.numerology.missing.length >= 3) {
      const m0 = M.numerology.missing[0];
      add(`「${ML.misc.NUM_MEANING[m0].split('・')[0]}」類的事你會下意識外包給別人或工具`,
        '例如：這類任務你能拖就拖，最後總是找人幫忙或用 App 解決，自己不太碰。',
        `生日數字缺 ${M.numerology.missing.join('、')}`);
    }
    if (V.vargottamas.length) {
      add(`不管換幾個環境，你身上都有一個「帶著走」的穩定核心`,
        `例如：工作換過好幾種，但朋友說你「本質從沒變過」——那個不變的部分和「${V.vargottamas[0]}」主題有關。`,
        `印占 ${V.vargottamas.join('、')} Vargottama（主盤與九分盤同宮，少見）`);
    }
    if (V.atmakaraka) {
      const theme = { 太陽: '被看見、證明自己的價值', 月亮: '安全感、有沒有歸屬', 火星: '力氣該怎麼用才對', 水星: '說出口、被聽懂', 木星: '這一切值不值得、有沒有意義', 金星: '關係裡的付出與享受怎麼拿捏', 土星: '責任、等待、孤獨感' }[V.atmakaraka.name] || '同一個主題';
      add(`「${theme}」是你換工作、換關係都躲不掉的同一道考題`,
        '例如：回顧幾段重要經歷，表面上原因各不相同，核心糾結其實是同一件事。',
        `Jaimini 靈魂主星＝${V.atmakaraka.name}`);
    }

    // 補足到 10 條：先取 ★★★ 匯流，再取 ★★，最後用恆存盤面命題
    const allP = probes(d);
    for (const p of allP.filter((x) => x.n >= 3)) {
      if (pool.length >= 12) break;
      add(`「${p.dim}」是你不用刻意經營、別人也會主動稱讚的強項`,
        '例如：回想一下，是否有三個互不認識的人都對你說過類似的話。',
        `${p.stars} 匯流（${p.systems.join('、')}）`);
    }
    for (const p of allP.filter((x) => x.n === 2)) {
      if (pool.length >= 10) break;
      add(`你在「${p.dim}」上應該比多數人突出`,
        '例如：近三年應能想到至少一件具體事例；完全想不到就打叉，這條就不算。',
        `★★ 支持（${p.systems.join('、')}）`);
    }
    if (pool.length < 10) {
      const fb = [
        [`壓力最大的時候，你的反應是「${W.moon.sign}」式的，不是平常那個你`,
          '例如：回想最近一次崩潰或大怒，那個當下的你和平時給人的印象落差很大。',
          `西占月亮${W.moon.sign}（壓力下的底層反應）`],
        [`回顧最後悔的三個大決定，可能都違反了同一個決策方式`,
          `例如：你的盤指向「${H.authority.split('（')[0]}」——後悔的決定是不是都跳過了這道程序？`,
          `人類圖${H.authority}`],
        [`35 歲之後，你的生活重心會明顯往「${Z.shenPalace.name}」偏移`,
          '例如：年輕時不在意的這塊，中年後越來越常出現在你的時間表上。（未滿 35 歲者先留著待驗證）',
          `紫微身宮在${Z.shenPalace.name}`],
        [`累壞之後，你恢復的方式是${B.strength.includes('強') ? '「動起來、找事做」' : '「躲起來、補眠獨處」'}`,
          '例如：長假第一天你做的事，透露了你是哪一種。',
          `八字${B.strength}`],
        [`住得最舒服的房子，窗或床的朝向可能偏「${M.gua.dir}」系`,
          '例如：回想住過最順的那間房的格局。（詩性層，僅供玩味）',
          `八宅${M.gua.name}命（${M.gua.group}）`],
      ];
      for (const f of fb) { if (pool.length >= 10) break; add(f[0], f[1], f[2]); }
    }
    return pool.slice(0, 10);
  }

  /* ---------- 總結與建議（白話統整：相似度最高的交叉點＋未來＋分領域） ---------- */
  const DIM_PLAIN = {
    '表達與傳播': '很會把想法說出來、寫出來，天生有輸出的管道',
    '行動力與衝勁': '想到就想動，點火速度比一般人快',
    '情感深度與感受力': '感受力深，情緒的水位比表面看起來深得多',
    '秩序、結構與控制': '重視規則與掌控感，喜歡把事情整理成有條理的系統',
    '直覺與非線性認知': '常常「不知道為什麼就是知道」，直覺通道是開的',
    '領導與舞台': '天生會被推到人前，站出來主導對你來說不費力',
    '財務嗅覺與資源運籌': '對錢和資源的流向敏感，會算、也敢調度',
    '研究、深度與洞察': '能往一個題目的深處鑽很久，坐得住冷板凳',
    '人群魅力與桃花': '不太費力就能吸引注意力，人緣是你的被動技能',
    '遷移、變動與自由': '骨子裡需要移動和換場景，定太久會悶',
    '批判眼與完美主義': '一眼就看到「哪裡不對」，標準比別人高',
    '美感與藝術頻道': '對美的東西有反應，而且會想自己動手做',
  };

  /* 月亮 12 星座感情需求（2026-08-02 拆桶定稿：need 需求／react 得不到的反應／say 開口建議） */
  const MOON_NEED = {
    牡羊: { need: '你要的是「被當第一順位」——愛要來得直接，慢熱和曖昧會讓你煩躁', react: '長期被冷處理，你會用吵架來確認對方在不在乎', say: '與其吵，不如直說「我需要你先找我」' },
    金牛: { need: '你要的是穩定與身體感的踏實——牽手、吃飯、規律的陪伴勝過驚喜', react: '安全感長期不足，你會變得固執佔有', say: '開口要「固定的相處節奏」，比要承諾有用' },
    雙子: { need: '你要的是「聊得來」——說話有人接、梗有人懂，無話可說是你的分手前兆', react: '這種交流長期得不到，你會忍不住往外尋找「聊得來的人」', say: '感覺疏遠時，先約一場只聊天的約會，比質問「你變了」有效' },
    巨蟹: { need: '你要的是歸屬感——對方「在不在」比浪漫重要', react: '長期得不到，你會不自覺變得緊黏或鬧脾氣', say: '直接說「我需要你多報備」，比生悶氣讓對方猜有效' },
    獅子: { need: '你要的是被欣賞、被驕傲地介紹給別人', react: '長期不被肯定，你會往外尋找掌聲', say: '告訴對方「多稱讚我一點，我吃這套」——這不丟臉，是說明書' },
    處女: { need: '你要的是「被細心對待」——記得你說過的小事，勝過大禮', react: '失望累積時，你會用挑剔表達受傷', say: '試著把「你都不⋯」換成「我希望你⋯」' },
    天秤: { need: '你要的是關係裡的公平與美感——不吵架不代表沒事', react: '委屈時你習慣先讓，讓久了會突然想逃', say: '練習在「還不嚴重」時就說出來' },
    天蠍: { need: '你要的是深度信任——能交換祕密、全然交付', react: '被背叛的恐懼會讓你忍不住測試對方', say: '與其測試不如直接問，你其實承受得起真話' },
    射手: { need: '你要的是被欣賞、同時保有自由——管太緊你會逃', react: '悶住的感覺累積久了，你會用「突然消失」處理', say: '先說「我需要自己的時間，不是不愛你」' },
    摩羯: { need: '你要的是「值得長期投資的關係」——你用行動不用甜言', react: '對方若讀不懂你的付出，你會變得更沉默', say: '偶爾把做的事說出口，愛需要字幕' },
    水瓶: { need: '你要的是「像朋友一樣的戀人」——先是同類，才是伴侶', react: '被要求交代行蹤，你會感到窒息想逃', say: '直接談好彼此的自由額度——你給得起承諾，只是討厭被查勤' },
    雙魚: { need: '你要的是情緒被接住——「我懂你」三個字勝過解決方案', react: '長期沒人接，你會退到幻想裡或過度犧牲', say: '練習說「我不需要建議，只需要你聽」' },
  };

  /* 夫妻宮主星調性（組合生成用：優先序取第一顆命中的主星） */
  const SPOUSE_TONE_ORDER = ['七殺', '破軍', '貪狼', '紫微', '天府', '武曲', '天相', '太陽', '巨門', '天機', '太陰', '天同', '天梁', '廉貞'];
  const SPOUSE_TONE = {
    七殺: '你的夫妻宮坐七殺——感情來得快也烈，關係需要一起衝的共同目標，過度平淡反而是危機',
    破軍: '你的夫妻宮坐破軍——感情模式常是「打掉重練」，關係的轉折多，找能一起變動的人比找安穩的人重要',
    貪狼: '你的夫妻宮坐貪狼——你們的關係需要新鮮感和玩性，一成不變會讓感情降溫，定期創造新體驗是保鮮術',
    紫微: '你的夫妻宮坐紫微——另一半常是有主見、能扛事的人，關係像合夥經營，互相尊重比甜言蜜語重要',
    天府: '你的夫妻宮坐天府——你傾向找穩定可靠、能持家的伴，關係求穩，但要小心穩到變成室友',
    武曲: '你的夫妻宮坐武曲——伴侶常是務實硬派、行動多過言語的人，別用「他都不說」判他罪，看他做了什麼',
    天相: '你的夫妻宮坐天相——你適合互相輔佐型的關係，兩人像搭檔，一起打理生活的踏實感就是你們的浪漫',
    太陽: '你的夫妻宮坐太陽——伴侶常是外放、有能量的人，光芒強的人也需要休息，留意別讓一方永遠當發光體',
    巨門: '你的夫妻宮坐巨門——你們的關係成也溝通敗也溝通，話講開就沒事，悶著猜就出事，吵架要吵完不要冷戰',
    天機: '你的夫妻宮坐天機——伴侶常是聰明多思的人，關係裡的想法交流很重要，但別把「分析感情」當成「經營感情」',
    太陰: '你的夫妻宮坐太陰——你要的是細水長流的溫柔，關係進展慢不是壞事，急催反而壞事',
    天同: '你的夫妻宮坐天同——你們的相處以舒服為底色，是能一起耍廢的關係；要留意別把包容用到沒了底線',
    天梁: '你的夫妻宮坐天梁——關係帶「照顧與被照顧」的結構，穩定感強，但要避免變成單方面的家長式付出',
    廉貞: '你的夫妻宮坐廉貞——感情裡理智與慾望並存，愛恨都比別人深一度，選對人是天堂、選錯人內耗最重',
  };
  /* 十神主旋律 × 職涯路線（組合生成用） */
  const GOD_CAREER = {
    比劫: '你的驅力主旋律是「自我與行動」（比劫最強）——適合當先鋒、開疆闢土或獨立作業；合夥要先講清楚拆帳與退場，因為你天生不愛被分走方向盤',
    食傷: '你的驅力主旋律是「輸出與才華」（食傷最強）——做作品、內容、教學是你的天然賽道，純執行的行政位會悶死你，選能讓你「產出東西」的位置',
    財星: '你的驅力主旋律是「目標與資源」（財星最強）——你對成果和回報敏感，適合業務、經營、資源調度類的位置，KPI 對你是燃料不是壓力',
    官殺: '你的驅力主旋律是「規範與承擔」（官殺最強）——體制內爬升、帶團隊、扛責任反而讓你安定，自由接案的無結構狀態會讓你焦慮',
    印星: '你的驅力主旋律是「學習與專業」（印星最強）——專業深度是你的護城河，靠知識、證照、資歷的複利累積最穩，短線風口不是你的戰場',
  };

  function synthesize(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, input } = d;
    const ps = probes(d);
    const strong = ps.filter((p) => p.n >= 3);
    const dual = ps.filter((p) => p.n === 2);

    // 一、多系統一致指向的核心樣貌
    const core = strong.map((p) => ({
      dim: p.dim, stars: p.stars, systems: p.systems,
      plain: DIM_PLAIN[p.dim] || p.axis,
    }));

    // 二、並存的兩面
    const both = [];
    const emo = ps.find((p) => p.dim === '情感深度與感受力');
    const ord = ps.find((p) => p.dim === '秩序、結構與控制');
    if (emo && ord && emo.n >= 2 && ord.n >= 2) both.push('你可以同時很理性又很感性——對事嚴謹、對人柔軟，這是兩條獨立的軸，不必二選一。');
    const act = ps.find((p) => p.dim === '行動力與衝勁');
    const deep = ps.find((p) => p.dim === '研究、深度與洞察');
    if (act && deep && act.n >= 2 && deep.n >= 2) both.push('你既有衝勁又坐得住——快攻和深耕都在你身上，看場合切換即可。');
    if (!H.definedCenters.includes('薦骨') && act && act.n >= 2) both.push('你「想衝的心」是真的，但引擎是借來的：適合短衝刺＋長休息的節奏，等速硬撐反而容易垮。');

    // 三、未來走勢（三年＋最近的換軌窗口）
    const nowY = new Date().getFullYear();
    const at = annualTable(d, nowY, 3);
    const toneWord = { good: '進攻年——適合主動出擊、開新局', mid: '平持年——穩住節奏、累積籌碼', low: '防守年——少做大變動、顧好根基' };
    const next3 = at.rows.map((r) => ({
      year: r.year, gz: r.gz, tone: r.tone,
      plain: `${r.year}（${r.gz}年）：${toneWord[r.tone]}。`,
      signals: r.reasons.slice(0, 4),
    }));
    const tl = timeline(d);
    const nextWindow = tl.windows.find((w) => w.year >= nowY);
    const windowNote = nextWindow ? `最近一次「換軌窗口」在 ${nextWindow.year} 前後（${nextWindow.year - input.y} 歲）——${nextWindow.systems.join('與')}同時換段，人生章節切換的機率高，重大轉向放在這附近最順。` : null;

    // 四、分領域建議（規則式，附來源）
    const vs = (g) => V.strength.find((s) => s.graha === g);
    const pal = (n) => Z.palaces.find((p) => p.name === n);
    const domains = [];
    {
      const lead = ps.find((p) => p.dim === '領導與舞台');
      const guanScore = pal('官祿').score;
      let text = guanScore >= 3 ? `事業宮位強（強度 +${guanScore}，屬全盤前段），適合走「有名有位」的路線，往能被看見的位置移動。` : guanScore <= -1 ? `事業宮帶壓（強度 ${guanScore}），建議成就感別全押在頭銜上——改用累積作品和專業實力，取代跟人搶職位。` : '事業宮中性，成就高低更多取決於你選的賽道是否用得上你的核心強項。';
      const topGod = Object.entries(B.godScore).sort((a, x) => x[1] - a[1])[0][0];
      if (GOD_CAREER[topGod]) text += GOD_CAREER[topGod] + '。';
      if (lead && lead.n >= 3) text += '多套系統都指向領導力——別只做執行者，因為對你來說爭取主導權反而更輕鬆。';
      if (strong.some((p) => p.dim === '秩序、結構與控制')) text += '你的控制力適合拿來「建制度、設流程」，這是最不費力的專業資產。';
      domains.push({ name: '事業', text, src: `紫微官祿宮強度 ${guanScore}＋八字十神主旋律＋匯流探針` });
    }
    {
      const wealth = ps.find((p) => p.dim === '財務嗅覺與資源運籌');
      const caiScore = pal('財帛').score;
      let text = wealth && wealth.n >= 2 ? '你對錢有真實的嗅覺，可以主動經營投資與開源，但給嗅覺配一套「小額驗證再加碼」的紀律。' : '理財偏保守經營較穩：先固定儲蓄率，再談報酬率，別讓別人的機會感染你。';
      text += caiScore >= 3 ? `財帛宮強（強度 +${caiScore}），錢的事上你比自己以為的更有底氣。` : caiScore <= -1 ? `財帛宮帶煞忌（強度 ${caiScore}），大額決定前設 48 小時冷靜期。` : '';
      domains.push({ name: '財務', text, src: `紫微財帛宮強度 ${caiScore}＋財務探針 ${wealth ? wealth.stars : '★'}` });
    }
    {
      const charm = ps.find((p) => p.dim === '人群魅力與桃花');
      const spouse = pal('夫妻');
      const spouseStars = spouse.major.map((m) => m.star).join('、') || '空宮';
      const mn = MOON_NEED[W.moon.sign];
      let text = mn
        ? `親密關係裡，卸下社交面具後真正的需求由「月亮${W.moon.sign}」接手：${mn.need}。找對象先確認這一項；開口的訣竅：${mn.say}。`
        : `親密關係裡，卸下社交面具後真正的需求由「月亮${W.moon.sign}」接手，找對象先確認這一項。`;
      const spouseStar = SPOUSE_TONE_ORDER.find((st) => spouse.major.some((m) => m.star === st));
      if (spouseStar) text += SPOUSE_TONE[spouseStar] + '。';
      else text += '你的夫妻宮是空宮——不是沒姻緣，而是關係樣貌高度受對方影響，「選人」等於「選劇本」，前期篩選比經營更關鍵。';
      if (charm && charm.n >= 3) text += '桃花是你的被動技能，問題從來不是「有沒有人」而是「怎麼篩」。';
      if (B.dayClash) text += '日支逢沖：關係易有「突然翻頁」的波動，重大承諾避開流年再沖的年份。';
      domains.push({ name: '感情', text, src: `西占月亮＋紫微夫妻宮（${spouseStars}）＋桃花探針` });
    }
    {
      const ji = pal('疾厄');
      const DM_HINT = { 木: '肝膽與筋（悶氣和久坐最傷）', 火: '心血管與眼（熬夜代價雙倍）', 土: '脾胃（壓力先打腸胃）', 金: '呼吸道與皮膚（空氣與規律最關鍵）', 水: '腎與睡眠（怕耗不怕動）' };
      let text = `你的日主屬${B.dayMaster.elem}、${B.strength}——體質重點在${DM_HINT[B.dayMaster.elem]}；${B.strength.includes('強') ? '能量要有出口，高強度運動反而讓你穩定' : '養重於練，睡眠比健身房重要'}。`;
      text += ji.score <= -1 ? '疾厄宮帶煞，問題是「累積型」的——小毛病別拖，定期健檢比進補重要。' : '疾厄宮無大礙，重點在別讓情緒債轉成身體債。';
      if (H.definedCenters.some((c) => c.includes('情緒'))) text += '你的情緒是週期波：低潮是波形不是故障，等波過再評估身體狀況。';
      domains.push({ name: '健康作息', text, src: `八字日主${B.dayMaster.elem}（${B.strength}）＋紫微疾厄宮 ${ji.score}＋人類圖情緒中心` });
    }
    {
      const study = ps.find((p) => p.dim === '研究、深度與洞察');
      let text = study && study.n >= 2 ? '你適合深度學習路線：一段時間鑽一個主題，勝過同時淺嚐十個。把學習成果公開輸出（寫、講、教）會加倍固化。' : '你更適合「邊做邊學」：先有具體任務再補知識，純上課容易半途而廢。';
      if (vs('Mercury').d9 >= 2) text += '水星在九分盤有力——中年後的學習力反而比年輕時好，別怕晚起步。';
      domains.push({ name: '學習成長', text, src: `研究探針 ${study ? study.stars : '★'}＋印占水星 D9` });
    }

    // 五、短中長期布局（依盤面逐人生成）
    const at10 = annualTable(d, nowY, 10);
    const horizons = { short: [], mid: [], long: [] };
    {
      const y0 = at10.rows[0];
      const SHORT_DO = {
        good: '今年是進攻年：醞釀已久的事（換工作、開案、告白、搬家）優先在今年啟動，順風年不出手等於浪費一年',
        mid: '今年是平持年：主軸放「優化現有的」——進修、累積作品、提高儲蓄率，替下一個進攻年備糧',
        low: '今年是防守年：避開大額投入、借貸、衝動離職；主動做的事以盤點、健檢、修內功為主',
      };
      horizons.short.push(`${SHORT_DO[y0.tone]}（依據：${y0.year} ${y0.gz}年燈號）`);
      const luR = y0.reasons.find((x) => x.includes('化祿入'));
      const jiR = y0.reasons.find((x) => x.includes('化忌入'));
      if (luR) horizons.short.push(`今年的機會窗在「${luR.split('化祿入')[1]}」領域——送上門的邀請值得認真評估（依據：紫微流年化祿）`);
      if (jiR) horizons.short.push(`今年的考題在「${jiR.split('化忌入')[1]}」領域——多用心但別鑽牛角尖，用鬆不用緊（依據：紫微流年化忌）`);
    }
    {
      const goodYs = at10.rows.filter((r) => r.tone === 'good').map((r) => r.year);
      if (goodYs.length) horizons.mid.push(`未來十年的進攻年是 ${goodYs.join('、')}——人生大額決策（買房、創業正式投入、轉職談判）優先排進這些年（依據：流年紅綠燈）`);
      if (nextWindow) horizons.mid.push(`${nextWindow.year} 前後（${nextWindow.year - input.y} 歲）是換軌窗口——${nextWindow.systems.join('與')}同時翻章，重大轉向（換跑道、搬遷、身分轉變）放在這附近最順（依據：時間層三波對齊）`);
      const age = nowY - input.y;
      const curDasha = V.dashas.find((x) => age >= Math.max(0, x.startAge) && age < x.endAge);
      const nxtDasha = curDasha ? V.dashas[V.dashas.indexOf(curDasha) + 1] : null;
      if (nxtDasha && nxtDasha.start.getFullYear() - nowY <= 9) horizons.mid.push(`${nxtDasha.start.getFullYear()} 年起人生主題換章為「${nxtDasha.lordZh}」——交界前後一兩年會有明顯換氣感，屆時別急著下結論（依據：印占大運）`);
    }
    {
      horizons.long.push(`約 35 歲後生活重心會往「${Z.shenPalace.name}」（${({ 命宮: '自我狀態', 兄弟: '同輩手足', 夫妻: '感情婚姻', 子女: '子女與創作', 財帛: '金錢', 疾厄: '健康', 遷移: '外出變動', 交友: '人脈圈', 官祿: '事業', 田宅: '居住資產', 福德: '心境享受', 父母: '長輩體制' })[Z.shenPalace.name] || Z.shenPalace.name}）移——做長期布局時，建議先把資源預留給這一塊（依據：紫微身宮）`);
      const gainers = V.strength.filter((s) => s.d9 - s.d1 >= 2).map((s) => s.name);
      if (gainers.length) horizons.long.push(`${gainers.join('、')}是你的「後勁型」配備——年紀越大越有力，這些主題的深耕是長期複利（依據：印占 D1/D9 對照）`);
      const age = nowY - input.y;
      const futureFav = B.luck.steps.filter((s) => s.ageFrom >= age && s.favorableHit >= 2).slice(0, 2);
      if (futureFav.length) horizons.long.push(`${futureFav.map((s) => `${Math.round(s.ageFrom)}–${Math.round(s.ageTo)} 歲（${s.gz.name}運）`).join('、')}是帶喜用的大運——大環境雙重順風的十年，值得預先鋪路（依據：八字大運）`);
      else horizons.long.push('往後的大運沒有「干支雙喜用」的十年——大環境屬平盤，成就更依賴選對賽道與紀律，而非等風來（依據：八字大運）');
    }

    // 六、個人化提問：從最強訊號生成「最值得追問的三題」（讀者可帶去 LINE 直接問）
    const qCandidates = [];
    {
      const guanQ = pal('官祿').score;
      if (guanQ >= 3) qCandidates.push({ tag: '事業', q: `我的官祿宮是全盤強宮（強度 +${guanQ}），現在的工作有把這個優勢用滿嗎？往哪個方向調整最划算？` });
      else if (guanQ <= -1) qCandidates.push({ tag: '事業', q: '我的事業宮帶壓，哪種「不搶頭銜、靠作品累積」的路線最適合我的盤？' });
      if (B.dayClash) qCandidates.push({ tag: '感情', q: '我的日支逢沖、感情容易突然翻頁——最近幾年哪些年份要特別留意關係變動？' });
      else qCandidates.push({ tag: '感情', q: `月亮${W.moon.sign}的我，在關係裡最需要的那件事，該怎麼開口跟對方要？` });
      const goodYsQ = at10.rows.filter((r) => r.tone === 'good').map((r) => r.year);
      if (goodYsQ.length) qCandidates.push({ tag: '時機', q: `${goodYsQ.slice(0, 2).join('、')} 是我的進攻年——想做的大事（換工作／創業／買房）該從何時開始佈局、第一步做什麼？` });
      if (/情緒|直覺|自我投射/.test(H.authority)) qCandidates.push({ tag: '決策', q: `我是${H.authority}，手上正在猶豫的那個決定，照我的決策機制該怎麼走？` });
      const DIM_Q = {
        '行動力與衝勁': '多套系統指向我行動力強——怎麼設計煞車，避免衝太快翻車？',
        '情感深度與感受力': '我的感受力是全盤強項——哪些工作或創作形式最能把它變成優勢？',
        '秩序、結構與控制': '我的結構控制力強——但哪些事其實該放手不管？',
        '表達與傳播': '多套系統指向我適合表達與傳播——該選寫、講還是教？從哪裡開始？',
        '批判眼與完美主義': '我的挑錯眼很利——怎麼用在專業上，而不是消耗自己和身邊的人？',
        '直覺與非線性認知': '我的直覺訊號強——哪些場合該信直覺、哪些場合該壓下來？',
        '研究、深度與洞察': '我適合深度鑽研——現在該押哪個主題深挖三年？',
        '美感與藝術頻道': '我的美感頻道強——該從哪件小作品開始累積？',
        '財務嗅覺與資源運籌': '我對錢有嗅覺——適合主動投資還是經營副業？紀律線設在哪？',
        '遷移、變動與自由': '我的盤帶變動能量——近兩年適合搬遷或轉換環境嗎？',
        '領導與舞台': '多套系統指向領導力——我該在現在的環境爭主導權，還是換個舞台？',
        '人群魅力與桃花': '我的人緣是被動技能——怎麼把它用在事業上而不只是社交？',
      };
      if (strong[0] && DIM_Q[strong[0].dim]) qCandidates.push({ tag: '天賦', q: DIM_Q[strong[0].dim] });
    }
    const questions = [];
    for (const it of qCandidates) {
      if (!questions.some((x) => x.tag === it.tag)) questions.push(it);
      if (questions.length >= 3) break;
    }

    return { core, both, next3, windowNote, domains, horizons, questions };
  }

  /* ---------- 行動手冊（把每個結論接上「所以呢」） ---------- */
  const SKILL_CARDS = {
    '表達與傳播': { roles: '行銷內容、公關媒體、教學培訓、主持簡報、文案編輯', collab: '當團隊的「翻譯機」——把複雜的東西講給外行聽，這個位置你最省力', misuse: '話多蓋過別人、承諾說得比做得快——輸出快不等於想清楚了', step: '本月固定發布 4 篇短內容（貼文、筆記都算），把表達變成有出口的習慣' },
    '行動力與衝勁': { roles: '業務開發、活動執行、創業初期、危機處理、體育健身', collab: '當開路先鋒——「從 0 到 0.5」的髒活交給你最快', misuse: '三分鐘熱度、衝完不收尾——你的天敵是「維運期」', step: '把想做很久的那件事拆出 30 分鐘的最小版本，今天就做掉第一步' },
    '情感深度與感受力': { roles: '諮商陪伴、使用者研究、品牌故事、醫療照護、藝術創作', collab: '團隊的情緒雷達——士氣出問題你最早知道，記得說出來', misuse: '把別人的情緒背回家、過度共感導致耗竭——你需要下班儀式', step: '每天睡前寫三行情緒日記，給感受一個固定容器，不讓它溢到人際裡' },
    '秩序、結構與控制': { roles: '專案管理、營運流程、品管稽核、財務行政、系統規劃', collab: '把混亂變 SOP 的人——收尾與制度化交給你，大家最安心', misuse: '對「人」也想用管的、計畫一變就焦躁——控制欲對系統用，不對人用', step: '挑一件生活或工作裡反覆卡住的事，本週把它寫成一張 checklist' },
    '直覺與非線性認知': { roles: '產品企劃、趨勢研究、選品採購、創意發想、早期投資研究', collab: '提案階段先讓你「聞過」——你的第六感當偵察兵，論證交給別人', misuse: '直覺當結論不查證、把自己的判斷神祕化——直覺提案、證據背書', step: '開一本「直覺筆記」：每次預感寫下來，一個月後回頭對答案，算命中率' },
    '領導與舞台': { roles: '團隊主管、對外代表、講師講者、社群經營、跨部門協調', collab: '撿沒人扛的球——補位型領導最不被抵抗，也最快建立威信', misuse: '不在位子上也想主導、把舞台當氧氣——沒聚光燈就失落是警訊', step: '主動認領一個沒人想主持的會議或活動，把它辦好' },
    '財務嗅覺與資源運籌': { roles: '採購談判、投資理財、資源整合、電商經營、商務開發', collab: '團隊的資源雷達——誰缺什麼、哪裡有機會你最快知道', misuse: '嗅覺退化成賭性、把人情當籌碼——機會要驗證不要 all-in', step: '開一筆「驗證基金」（收入的 5%），專門小額測試你聞到的機會' },
    '研究、深度與洞察': { roles: '研究分析、資料科學、法務審計、深度報導、技術專家路線', collab: '團隊的挖井人——別人放棄的深度你挖得下去，適合攻堅任務', misuse: '用「還在研究」逃避交付——深度是資產，無限延期是負債', step: '給目前在鑽的主題設一個公開交付日，先寫 500 字就好' },
    '人群魅力與桃花': { roles: '公關業務、社群經營、接待服務、演藝表現、公益倡議', collab: '開場破冰交給你——你在場，空氣就是軟的', misuse: '人緣好變成時間破產、關係多而淺——魅力需要篩選器', step: '列出「值得深交的 5 個人」，本月各約一次一對一深聊' },
    '遷移、變動與自由': { roles: '遠距工作、駐外輪調、旅遊產業、自由接案、跨領域整合', collab: '探路者——新市場、新工具、新據點先派你去試', misuse: '用「換環境」逃避該解的題——搬了家，題目會跟著搬', step: '排一個固定的「換場景日」：每週半天換個地方工作或活動' },
    '批判眼與完美主義': { roles: '品質審查、編輯校對、測試除錯、風控法遵、評論策展', collab: '上線前的最後一道門——你點頭，大家才敢出手', misuse: '對人開槍、用高標準拖住自己出手——挑錯對稿不對作者', step: '練習「80 分就交」：本週挑一件事，故意在 80 分時交出去，觀察天沒有塌' },
    '美感與藝術頻道': { roles: '設計視覺、空間陳列、選物策展、攝影影像、品牌美術', collab: '團隊的審美底線——東西出門前給你過目', misuse: '只出一張嘴嫌、自己不動手做，美感就淪為購物藉口——因為沒有作品，品味會退化成刻薄', step: '本季完成一件小作品（一張海報、一組照片、一個角落改造）並公開給人看' },
  };

  /* A3：中檔（★★，特質存在但非主引擎）版本文案——與強檔口吻一致、定位改成「輔助技」 */
  const SKILL_CARDS_MID = {
    '表達與傳播': { roles: '表達不必當主業，但它是強力加分項——簡報、寫文件、對外溝通的場合主動接下來', collab: '團隊裡當「補充說明的人」——別人講不清楚時你補一段，存在感就出來了', misuse: '因為「還算會講」就硬撐主講位——你的表達適合輔助火力，連續高強度輸出會累', step: '本月把一件你做過的事寫成一篇短分享，練習讓輸出有形' },
    '行動力與衝勁': { roles: '起步不算最快，但推得動——適合當「第二棒」：方向定了之後的推進與執行', collab: '當可靠的推進者——先鋒衝出缺口後，你把戰線穩住往前推', misuse: '被氣氛帶著衝——你的行動力需要一個明確理由，沒想清楚就跟著衝最容易白忙', step: '本月挑一件拖著的事，訂一個「開工儀式」（時間＋地點），到點就動手' },
    '情感深度與感受力': { roles: '感受力是你的底層配備而非招牌——用在理解客戶、同事與家人上，最有回報', collab: '重要溝通前你先「試水溫」——你對氣氛的判讀比多數人準一些', misuse: '情緒偶爾上來得又急又猛卻說不出口——不是沒感覺，是平常關太緊', step: '本週跟一個信任的人聊一件「有感覺但沒講過」的事，練習讓感受有出口' },
    '秩序、結構與控制': { roles: '規劃力中上——先當「自己人生的專案經理」，不必以管理為業', collab: '團隊亂的時候你看得出問題在哪——說出來，別等別人發現', misuse: '想管又不想擔——提了規則就要顧到底，不然會變成只出一張嘴', step: '本週把待辦清單重整一次：只留三類——今天、這週、以後' },
    '直覺與非線性認知': { roles: '直覺是你的側翼雷達不是主導航——重大決定用「直覺提名、理性投票」兩段制', collab: '腦力激盪時你的「歪點子」有價值——先講出來再讓大家篩', misuse: '直覺對過幾次就全押——你的命中率夠當參考，還不夠當唯一依據', step: '這個月遇到選擇時，先寫下第一直覺再分析，月底回頭對答案' },
    '領導與舞台': { roles: '不必搶大舞台的 C 位——你適合「小舞台的主人」：小組長、聚會主揪、專案負責人', collab: '沒人表態的時刻你先開口——這種時候你的份量會被記住', misuse: '想被看見又怕站太前面——半推半就最吃虧，要嘛上、要嘛大方讓', step: '本月在一個小場合主動當一次主持人或召集人' },
    '財務嗅覺與資源運籌': { roles: '對錢的敏感度中上——比起操盤，更適合「守門」：預算、比價、資源盤點', collab: '團隊花錢前讓你看一眼——你容易看到「這筆其實可以省」', misuse: '省了小錢漏了大局——你對細節的精明要配上對整體的檢查', step: '本月盤點一次固定支出，砍掉一項已經無感的訂閱或開銷' },
    '研究、深度與洞察': { roles: '鑽得下去但別鑽太久——適合「兩週深潛」型任務，不適合無限期的研究職', collab: '需要查證的事找你——你比多數人有耐心把資料真的看完', misuse: '收藏了很多資料沒消化——你缺的不是輸入，是輸出', step: '把最近存下來的文章挑三篇真的讀完，各寫一句心得' },
    '人群魅力與桃花': { roles: '人緣是你的潤滑劑不是職業——花在維繫關鍵關係上，比花在拓展人脈上值得', collab: '兩邊有心結時你去傳話——你開口比較不踩雷', misuse: '對誰都好＝對誰都普通——中等魅力更需要選擇性經營', step: '本月主動關心一位很久沒聯絡、但你其實在意的人' },
    '遷移、變動與自由': { roles: '需要變化但不必漂泊——穩定工作＋定期換場景（出差、輪調、旅行）是你的甜蜜點', collab: '新工具新方法進來時你當第一批試用者——你的適應力中上', misuse: '悶久了就想「全部打掉重來」——其實你需要的常常只是換個房間', step: '本月安排一次兩天以上離開日常的行程（小旅行、外地工作都算）' },
    '批判眼與完美主義': { roles: '看得到問題但不必以挑錯為業——先當自己作品的第一個審查者', collab: '重要文件出手前幫大家看一眼——你會抓到別人漏掉的', misuse: '對自己嚴、對外不好意思講——憋著的意見沒有價值', step: '本週練習提一次「建設性的反對意見」：講事實、不講人' },
    '美感與藝術頻道': { roles: '美感是你的生活品質配備——用在穿搭、空間、簡報質感上，天天有回報', collab: '排版、配色、選圖這類事主動接——小事累積審美信用', misuse: '看得出好壞但懶得動手——美感不用會生鏽', step: '本月改造一個每天看得到的角落（桌面、桌布、玄關都算）' },
  };

  const ELEM_INDUSTRY = {
    木: '教育培訓、出版內容、醫療保健、園藝環保、服飾紡織',
    火: '餐飲、能源、行銷廣告、影視娛樂、美容時尚',
    土: '不動產、營建、農產食品、倉儲物流、人力資源',
    金: '金融、法律、機械製造、科技硬體、精品珠寶',
    水: '貿易流通、旅遊運輸、飲品水產、傳播媒體、自由接案',
  };

  const HD_ENTRY = {
    生產者: '你的進場方式是「回應」：別憑空發起，把履歷、作品、名聲放出去，等具體機會出現時用身體的直覺答「要／不要」。有回應的事會越做越有能量，硬發起的事會把你掏空。',
    顯示生產者: '你的進場方式是「回應＋快試錯」：可以多線並進，但砍線要快——沒感覺的案子拖著不放，是你最大的能量漏洞。',
    投射者: '你的進場方式是「被邀請」：把專業寫成看得見的東西（文章、作品、口碑），讓對的人來找你；毛遂自薦對你效率最差。適合顧問、教練、管理這類「看系統」的位置，而且你的高效工時比別人短，別用工時競爭。',
    顯示者: '你的進場方式是「發起」：你適合開局。訣竅是行動前先「告知」相關的人，阻力會少一大半；開完局把日常營運交出去，你去開下一局。',
    反映者: '你的進場方式是「等一輪月亮」：重大職涯決定拖滿 28 天再定。對你來說「環境」比「職務」重要——場域選對了你才會發光。',
  };

  const GUAN_ROLE = {
    紫微: '掌舵定方向的位置——就算團隊小，也要是「說了算」的那個', 天機: '軍師企劃位——出謀劃策比親自執行更值錢',
    太陽: '對外代表——曝光度高的公眾型角色，越被看見越旺', 武曲: '執行與財務營運——拿數字、扛目標的實權位',
    天同: '協調潤滑與服務體驗——氣氛與福利類角色', 廉貞: '大組織裡的制度型角色——公部門、大企業的體制內晉升路線',
    天府: '守成管理——管資產、管庫房、管團隊的穩定型主管', 太陰: '幕僚規劃——企劃、財務規劃、房產相關，幕後比幕前順',
    貪狼: '業務公關與多角經營——靠人脈與才藝吃飯的位置', 巨門: '靠嘴與專業吃飯——教學、法務、媒體、評論',
    天相: '幕僚長／二把手——輔佐強人、把關品質的位置', 天梁: '導師顧問型——醫療、公益、資深專家路線，越老越值錢',
    七殺: '開疆闢土——外派、新市場、獨當一面的戰區指揮官', 破軍: '開創改革——汰舊換新的變革型任務，穩定期反而待不住',
  };

  function actionPlan(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, input } = d;
    const ps = probes(d);
    const pal = (n) => Z.palaces.find((p) => p.name === n);

    // 一、強項用法卡（只取「最能區辨你」的前三張：先比匯流數，再比稀有度——
    // 稀有度＝該維度在 300 盤隨機樣本中的 ★★★ 出現率，越低越能代表「你」而非「大家」）
    const BASE_RATE = {
      '表達與傳播': 17, '行動力與衝勁': 40, '情感深度與感受力': 19, '秩序、結構與控制': 24,
      '直覺與非線性認知': 29, '領導與舞台': 26, '財務嗅覺與資源運籌': 18, '研究、深度與洞察': 30,
      '人群魅力與桃花': 25, '遷移、變動與自由': 24, '批判眼與完美主義': 18, '美感與藝術頻道': 19,
    };
    const ranked = ps.slice().sort((a, b) => b.n - a.n || (BASE_RATE[a.dim] || 25) - (BASE_RATE[b.dim] || 25));
    let picked = ranked.filter((p) => p.n >= 3);          // ★★★ 全列（常見的也是你的特質）
    if (picked.length < 3) picked = picked.concat(ranked.filter((p) => p.n === 2).slice(0, 3 - picked.length));
    if (picked.length < 2) picked = ranked.slice(0, 2);
    const rareLabel = (r) => r <= 20 ? '少見' : r <= 28 ? '中等' : '常見';
    /* A3：文案分檔——★★★ 用主引擎版、★★ 用輔助技版；「這個月」行動再依當年流年調節奏 */
    const nowTone = (annualTable(d, new Date().getFullYear(), 1).rows[0] || {}).tone || 'mid';
    const cards = picked.map((p, i) => {
      const rate = BASE_RATE[p.dim] || 25;
      const base = p.n >= 3 ? SKILL_CARDS[p.dim] : (SKILL_CARDS_MID[p.dim] || SKILL_CARDS[p.dim]);
      const card = { ...base };
      if (nowTone === 'good') card.step = `${card.step}。今年是你的進攻年——這件事可以放大力度做`;
      else if (nowTone === 'low') card.step = `${card.step}。今年偏防守——用小規模、低成本的方式試就好，別重壓`;
      if (p.n <= 1) card.roles = `這項在你盤中訊號較弱，當「輔助技」看待就好：${card.roles}`;
      return {
        dim: p.dim, stars: p.stars, systems: p.systems, top: i === 0,
        n: p.n, rate,
        rarity: `每 100 人約 ${rate} 人有此匯流（${rareLabel(rate)}）`,
        ...card,
      };
    });

    // 二、事業拼圖
    const hdType = H.type.split(' ')[0].replace('顯示生產者 MG', '顯示生產者');
    const entryKey = H.type.includes('MG') ? '顯示生產者' : H.type.split(' ')[0];
    const guanStars = pal('官祿').major.map((m) => m.star);
    const MC_STYLE = {
      牡羊: '敢衝敢言的開創者——讓人記住你的果斷和行動速度',
      金牛: '穩定可靠的實力派——用作品與持久力累積信任，不急著表現',
      雙子: '反應快、什麼都能聊的多面手——用資訊力和溝通力當名片',
      巨蟹: '照顧人的溫暖角色——讓人覺得「跟你共事很安心」是你的招牌',
      獅子: '自帶舞台感的領銜者——大方站C位，光環就是你的專業包裝',
      處女: '細節控的專業職人——用精準和挑不出錯的品質建立口碑',
      天秤: '得體圓融的協調者——形象經營走質感與平衡，當雙方都信任的橋樑',
      天蠍: '深沉專注、帶點神祕感的權威——話不多但一出手就是重點，讓專業深度替你說話',
      射手: '視野開闊的探索者——用國際觀、大格局和樂觀感染力當個人品牌',
      摩羯: '扎實苦幹的實績派——頭銜與成果會自己說話，走「值得託付大事」的路線',
      水瓶: '獨特前衛的創新者——與眾不同就是你的賣點，別把自己修剪成主流',
      雙魚: '有溫度有想像力的療癒系——用同理心和美感直覺當專業特色',
    };
    const career = {
      entry: HD_ENTRY[entryKey] || HD_ENTRY['生產者'],
      industries: B.favorable.map((e) => `${e}系：${ELEM_INDUSTRY[e]}`),
      role: guanStars.length ? guanStars.map((s) => GUAN_ROLE[s]).filter(Boolean).join('；也適合') : '官祿宮無主星——角色彈性大，跟對人、選對環境比選職稱重要',
      mask: `${MC_STYLE[W.mc.sign] || '穩健專業路線'}。面試和個人品牌都照這個人設來經營，最省力（依據：天頂${W.mc.sign}）`,
    };

    // 三、財務策略
    const nowY = new Date().getFullYear();
    const at = annualTable(d, nowY, 10);
    const goodYears = at.rows.filter((r) => r.tone === 'good').map((r) => r.year);
    const lowYears = at.rows.filter((r) => r.tone === 'low').map((r) => r.year);
    const wealthP = ps.find((p) => p.dim === '財務嗅覺與資源運籌');
    const caiScore = pal('財帛').score;
    const finance = {
      style: (wealthP && wealthP.n >= 2)
        ? '你有真實的財務嗅覺——可以主動型理財：核心部位（六成）放穩健標的，剩下用「驗證基金」小額試你看到的機會，驗證成功才加碼。'
        : '你的優勢不在盯盤——用制度取代判斷：發薪日自動轉存（至少 20%）、指數化長期投資、一年只檢視兩次，勝過頻繁進出。',
      timing: `未來十年裡，${goodYears.length ? goodYears.join('、') + ' 是進攻年——大額決策（買房、轉職加薪談判、擴大投資）優先放這幾年' : '未來十年沒有明顯進攻年——更適合定期定額的紀律型策略'}${lowYears.length ? '；' + lowYears.join('、') + ' 是防守年——避免借貸、創業、重押單一標的' : ''}。`,
      guard: caiScore <= -1 ? '財帛宮帶煞忌：任何超過月收入的支出，強制 48 小時冷靜期＋找一個唱反調的人聊過。' : '財帛宮無大礙：你的風險不在錢本身，在「別人的機會感染你」——聽到穩賺先問誰在賣。',
    };

    // 四、感情實戰
    const moonNeed = ['巨蟹', '金牛', '雙魚'].includes(W.moon.sign) ? '穩定的照顧與歸屬感——對方要「在」，比浪漫重要'
      : ['牡羊', '獅子', '射手'].includes(W.moon.sign) ? '被欣賞同時保有自由——管太緊你會逃'
      : ['雙子', '天秤', '水瓶'].includes(W.moon.sign) ? '聊得來、說話有人接——無話可說是你的分手前兆'
      : '深度信任、能交換祕密——淺關係養不活你';
    const clashYears = at.rows.filter((r) => r.reasons.some((x) => x.includes('沖日支') || x.includes('沖太歲'))).map((r) => r.year);
    const spouseStars = pal('夫妻').major.map((m) => m.star).join('、');
    const love = {
      checklist: [
        `核心需求檢查：相處三個月後，你有沒有穩定感受到「${moonNeed.split('——')[0]}」？沒有就是錯頻，別凹`,
        `節奏檢查：做重大關係決定時，照你的「${H.authority.split('（')[0]}」走過一遍——${H.authority.includes('情緒') ? '至少睡一晚，情緒高低點都體驗過再答應' : H.authority.includes('薦骨') ? '問自己是非題，聽身體的直覺回應' : '跟信任的人把想法說出口，聽自己怎麼說'}`,
        spouseStars ? `對象輪廓：夫妻宮見「${spouseStars}」——${/七殺|破軍|貪狼/.test(spouseStars) ? '你容易被強烈、有個性的人吸引，穩定型會嫌無聊；接受這點，挑「強但講理」的' : /天同|天梁|天相/.test(spouseStars) ? '溫和可靠型和你最合拍，激情型消耗你' : /太陽|巨門/.test(spouseStars) ? '你需要能溝通、能曬在陽光下的關係，曖昧不明的先淘汰' : '找能一起成長變化的，一成不變的關係會讓你窒息'}` : '夫妻宮空宮：對象類型彈性大，關係品質取決於你自己的狀態，別急著用清單框人',
      ],
      sop: `吵架 SOP：你的火星在${W.planets.find((p) => p.key === 'Mars').sign}${B.godScore['官殺'] >= B.godScore['食傷'] ? '，加上你習慣先壓情緒講道理——小心累積後一次清算。規則：當下只講「這件事」，超過 30 分鐘就喊暫停，24 小時內回來收尾' : '，而且你嘴上不讓人——先贏了道理、輸了關係。規則：先說感受再說對錯，「我覺得受傷」比「你就是錯了」有效十倍'}。`,
      timing: clashYears.length ? `時機：${clashYears.join('、')} 年感情與住所易有波動——這幾年適合「觀察與磨合」，求婚、結婚、同居等大承諾盡量避開或多想兩週。` : '未來十年沒有明顯的感情沖動年，時機上沒有特別要避開的。',
    };

    // 五、健康作息（日主體質×身強弱×疾厄宮主星×忌神——個人化組合而非通用清單）
    const DM_BODY = {
      木: '對應肝膽與筋——久坐和「氣悶著不發」最傷你，伸展與戶外綠意是你的藥',
      火: '對應心血管與眼——過勞熬夜的代價比別人大，行程要有波峰也要有波谷',
      土: '對應脾胃與代謝——你的身體用消化系統抗議壓力，吃飯時別開會別滑手機',
      金: '對應肺與呼吸道皮膚——空氣品質、乾濕度和作息規律對你影響最明顯',
      水: '對應腎與泌尿——怕耗不怕動：睡眠與補水是你的底線，夜貓對你是雙倍傷',
    };
    const strengthMode = B.strength.includes('強')
      ? '你偏「身強」體質：能量需要出口——高強度運動（重訓、球類、爬山）反而讓你穩定，悶著不動最容易出狀況。'
      : '你偏「身弱」體質：養重於練——溫和規律（快走、瑜伽、游泳）加充足睡眠，比激烈操練有效；累了就休，硬撐的帳之後加倍還。';
    const JIBING = {
      紫微: '頭腦與脾胃（用腦過度型）', 天機: '肝膽與神經（想太多睡不好型）', 太陽: '心血管、血壓與眼睛',
      武曲: '呼吸道與筋骨', 天同: '水腫與泌尿系統', 廉貞: '發炎與血液循環', 天府: '脾胃消化',
      太陰: '內分泌與泌尿婦科', 貪狼: '肝腎與內分泌（生活不節制型）', 巨門: '腸胃與口腔咽喉',
      天相: '皮膚與泌尿', 天梁: '腸胃與慢性老毛病', 七殺: '筋骨關節與外傷', 破軍: '牙齒與消耗性疲勞',
    };
    const jiStars = pal('疾厄').major.map((m) => m.star);
    const AVOID_LIFE = {
      木: '怒氣硬吞不發（肝火內傷型）、整天綁在椅子上', 火: '熬夜趕工、靠亢奮硬撐的行程',
      土: '暴飲暴食、壓力性進食與久坐', 金: '菸、髒空氣與過度乾燥的環境', 水: '憋尿、水喝太少、夜生活',
    };
    const health = {
      base: `你的日主是「${B.dayMaster.elem}」——${DM_BODY[B.dayMaster.elem]}。${strengthMode}`,
      weak: jiStars.length
        ? `疾厄宮見「${jiStars.join('、')}」，傳統對應的弱點雷達：${jiStars.map((s) => JIBING[s]).filter(Boolean).join('；')}${pal('疾厄').score <= -1 ? '——且宮位帶煞，屬「累積型」問題，小毛病別拖、每年固定健檢' : '（象徵層保健參考，不是診斷）'}`
        : `疾厄宮無主星——沒有特別突出的弱點標記${pal('疾厄').score <= -1 ? '，但宮位帶煞：留意累積型疲勞，定期健檢' : '，重點放在整體節奏管理'}`,
      avoid: `你的忌神是「${B.unfavorable.slice(0, 2).join('、')}」——最傷你的生活型態：${B.unfavorable.slice(0, 2).map((e) => AVOID_LIFE[e]).join('；')}。`,
      mind: H.definedCenters.some((c) => c.includes('情緒'))
        ? '你的情緒是內建週期波：低潮是波形不是故障。記錄自己的週期（約幾天一循環），谷底那幾天不做重大決定、不對人下結論。'
        : '你的情緒中心開放：低潮常常是「替別人扛的」。心情突然變差先問——這是誰的情緒？離開現場十分鐘掉一半的，就不是你的。',
    };

    // 六、學習策略
    const studyP = ps.find((p) => p.dim === '研究、深度與洞察');
    const learning = {
      what: (studyP && studyP.n >= 2)
        ? '適合深度型技能：需要長時間累積、有門檻的專業（分析、技術、專業證照）——你坐得住，這是複利最高的路。'
        : '適合應用型技能：直接接在任務上的能力（工具操作、溝通銷售、專案實戰）——「用中學」是你的最佳學法，純上課容易棄坑。',
      how: `學法：${(studyP && studyP.n >= 2) ? '一次只開一口井，設公開交付日防止無限延期' : '先接一個真實任務再補知識，讓需求拉著你學'}；學到的東西${ps.find((p) => p.dim === '表達與傳播' && p.n >= 2) ? '用你的表達優勢輸出（寫、講、教），記憶會加倍固化' : '做成自己的 checklist 或筆記系統，比回頭重看教材更有效'}。`,
      when: V.strength.find((s) => s.graha === 'Mercury').d9 >= 2 ? '你的水星在九分盤有力——中年後學習力反而更好，任何時候起步都不晚。' : '學習黃金時段配合你的用神節奏：喜' + B.favorable[0] + '者，' + (B.favorable.includes('水') ? '夜深人靜' : B.favorable.includes('火') ? '白天日照充足時' : '早晨') + '吸收最好。',
    };

    // 七、年度行動曆（未來三年，逐年給「適合做／避免做」）
    const TONE_DO = {
      good: ['啟動醞釀已久的計畫（換工作、開案、搬家都行）', '主動爭取曝光、升遷、加薪談判', '拓展新人脈圈與合作對象'],
      mid: ['優化現有的，而不是打掉重練', '進修、考照、累積作品', '提高儲蓄率，為下一個進攻年備糧'],
      low: ['盤點與斷捨離（資產、關係、待辦）', '深耕專業、修內功', '健檢、保險、備援計畫這類防禦工事'],
    };
    const TONE_DONT = {
      good: ['把機會閒置——順風年不出手，等於浪費一年'],
      mid: ['孤注一擲的大動作', '因為無聊而亂動（換工作前先確認是「想逃」還是「想去」）'],
      low: ['大額投資、借貸、創業', '衝動離職與重大承諾', '硬碰硬的對抗（今年適合迂迴）'],
    };
    const yearCal = at.rows.slice(0, 3).map((r) => {
      const extra = [];
      if (r.reasons.some((x) => x.includes('太歲') && !x.includes('合'))) extra.push('犯太歲年：儀式性大事（婚嫁、購屋）多做功課，保持低調、留些彈性');
      if (r.reasons.some((x) => x.includes('沖日支'))) extra.push('沖日支：感情與居住易變動，承諾與搬遷多想兩週');
      if (r.reasons.some((x) => x.includes('木星回歸'))) extra.push('木星回歸：12 年一度的擴張窗口，適合開啟長期計畫');
      if (r.reasons.some((x) => x.includes('土星回歸'))) extra.push('土星回歸：人生結構重組年，適合「轉大人」的決定，不適合硬衝');
      const luIn = r.reasons.find((x) => x.includes('化祿入'));
      const jiIn = r.reasons.find((x) => x.includes('化忌入'));
      if (luIn) extra.push(`機會浮現在「${luIn.split('化祿入')[1]}」領域，留意這裡的邀請`);
      if (jiIn) extra.push(`「${jiIn.split('化忌入')[1]}」是本年考點——這塊多用心但別鑽牛角尖`);
      return { year: r.year, gz: r.gz, age: r.age, tone: r.tone, dos: TONE_DO[r.tone], donts: TONE_DONT[r.tone], extra };
    });

    // 八、決策速查卡
    const authLine = H.authority.includes('情緒') ? '睡一晚再答，情緒的高點與低點都經歷過才算數'
      : H.authority.includes('薦骨') ? '把問題化成是非題問自己，聽第一秒身體的「嗯／唔」'
      : H.authority.includes('直覺') ? '相信第一聲微弱的「不對勁」，它不會重播'
      : H.authority.includes('意志') ? '問自己「我真的想要嗎」——不是應不應該，是想不想要'
      : H.authority.includes('自我投射') ? '找信任的人把想法完整說一遍，答案在你自己的話裡'
      : '換兩三個環境各待一陣子再決定，因為你要在對的場域，腦袋才會清楚';
    const top2 = picked.slice(0, 2).map((c) => c.dim);
    const decisions = [
      {
        q: '要不要接這個工作／案子？',
        steps: [
          `【權威判斷】${authLine}`,
          `【強項判斷】這份工作用得到你的「${top2.join('」或「')}」嗎？用不到的話，薪水要夠高才值得`,
          `【年份判斷】${yearCal[0].tone === 'good' ? '今年是進攻年，值得冒險的可以衝' : yearCal[0].tone === 'low' ? '今年是防守年，除非明顯升級否則先穩住' : '今年平持——條件明顯變好才動，平轉不如不轉'}`,
        ],
        verdict: yearCal[0].tone === 'good' ? '年份順風——只要權威點頭、用得上強項，就值得接。' : yearCal[0].tone === 'low' ? '年份逆風——除非強項對口且條件明顯升級，否則預設不接。' : '年份中性——成敗看前兩關：權威點頭＋用得上強項才接。',
      },
      {
        q: '要不要承諾這段關係？',
        steps: [
          `【需求判斷】對方能穩定給你「${moonNeed.split('——')[0]}」嗎？相處中驗證過才算`,
          `【權威判斷】${authLine}`,
          `【年份判斷】${clashYears.length ? clashYears.join('、') + ' 是感情易動盪的年份，重大承諾避開或延後' : '年份上沒有特別要避開的'}`,
        ],
        verdict: clashYears.length && clashYears.includes(nowY) ? `今年（${nowY}）正是感情易動盪年——感受對了也建議再觀察幾個月，把承諾押後。` : '年份沒有反對票——核心需求有被滿足＋權威點頭，就可以承諾。',
      },
      {
        q: '要不要搬家／換城市？',
        steps: [
          `【體質判斷】${B.shensha.some((s) => s.name === '驛馬') ? '你帶驛馬——移動對你是加分項，想搬通常值得認真評估' : '你的盤驛馬訊號不強——建議搬家前先確認是「想去那裡」還是「想逃這裡」'}`,
          `【方位玩味】你是${d.misc.gua.name}命（${d.misc.gua.group}），挑房時床位與主窗偏「${d.misc.gua.dir}」系可以當參考（詩性層）`,
          `【年份判斷】${yearCal.find((y) => y.tone === 'good') ? (yearCal.find((y) => y.tone === 'good').year + ' 年動最順') : '近三年皆非進攻年，若非必要可再等'}`,
        ],
        verdict: B.shensha.some((s) => s.name === '驛馬')
          ? (yearCal.find((y) => y.tone === 'good') ? `你的體質適合移動＋${yearCal.find((y) => y.tone === 'good').year} 年有順風——想搬就認真規劃。` : '你的體質適合移動，但近三年沒有順風年——可以搬，別急著搬。')
          : '你的盤對「移動」中性——先確認動機是「想去」不是「想逃」，是前者才動。',
      },
      {
        q: '要不要創業／開新專案？',
        steps: [
          `【進場判斷】${HD_ENTRY[entryKey] ? HD_ENTRY[entryKey].split('：')[1].split('。')[0] : '照你的類型策略走'}`,
          `【財務判斷】${finance.style.includes('嗅覺') ? '你有財務嗅覺——但用「驗證基金」規模先試三個月，數字說話再擴大' : '你的優勢不在金錢直覺——找一個財務嗅覺強的夥伴互補，自己管品質與交付'}`,
          `【年份判斷】${goodYears.length ? '正式投入放在 ' + goodYears[0] + ' 年前後最順；之前先低成本驗證' : '未來十年無明顯進攻年，適合副業式慢養，不適合裸辭梭哈'}`,
        ],
        verdict: goodYears.length ? `低成本先驗證，把「正式投入」瞄準 ${goodYears[0]} 年——進場方式照你的類型走，別硬發起。` : '未來十年沒有明顯順風年——副業慢養可以，裸辭重押不建議。',
      },
    ];

    // 追加面向：離職／大額投入／合夥／進修轉行
    const weakestDim = ranked[ranked.length - 1].dim;
    const youScore = pal('交友').score;
    const midYears = at.rows.filter((r) => r.tone === 'mid').map((r) => r.year);
    decisions.push(
      {
        q: '要不要離職？',
        steps: [
          '【動機判斷】把「想逃的理由」和「想去的地方」各寫三條——只有逃、沒有去，先別辭，逃的題目會跟到下一份工作',
          `【權威判斷】${authLine}`,
          `【年份判斷】${yearCal[0].tone === 'good' ? '今年是進攻年——下一步確定了就可以動，但騎驢找馬仍優於裸辭' : yearCal[0].tone === 'low' ? '今年是防守年——裸辭風險加倍，先把下家簽好再走' : '今年平持——不是不能走，但「條件明顯升級」才值得動，平轉不如不轉'}`,
        ],
        verdict: yearCal[0].tone === 'low' ? '今年逆風——想走可以，但「先簽下家再遞辭呈」是鐵律。' : yearCal[0].tone === 'good' ? '年份放行——只要「想去的地方」寫得出三條、權威也點頭，就可以動。' : '年份中性——動機關（想去＞想逃）過了才考慮，平轉不如不轉。',
      },
      {
        q: '要不要投入這筆錢？（大額消費或投資）',
        steps: [
          `【護欄判斷】${finance.guard}`,
          `【嗅覺判斷】${(wealthP && wealthP.n >= 2) ? '你有財務嗅覺——但也只用「驗證基金」試：先小額三個月，數字對了才加碼' : '這個機會是你找到的，還是別人塞給你的？你的盤不吃「被推銷的機會」——找上門的先預設拒絕'}`,
          `【年份判斷】${lowYears.includes(nowY) ? `今年（${nowY}）是防守年——大額投入預設答案是「不」，除非錯過的成本極高` : (goodYears.length ? `大額投入放在進攻年（${goodYears.join('、')}）勝率最高，其他年份分批進場` : '未來十年無明顯進攻年——分批進場優於一次重押')}`,
        ],
        verdict: lowYears.includes(nowY) ? '今年防守——預設不投；真要投，金額壓到驗證等級（虧掉不心痛的量）。' : (wealthP && wealthP.n >= 2) ? '你有嗅覺、年份也沒擋——小額驗證三個月，數字說話再加碼。' : '你的優勢不在盯盤——過護欄（冷靜期＋唱反調的人）再分批進場。',
      },
      {
        q: '要不要跟這個人合作／合夥？',
        steps: [
          `【看人判斷】${youScore >= 3 ? '你的交友宮強——識人是你的資產，但合夥拆的是錢不是交情，制度仍要白紙黑字' : youScore <= -1 ? '你的交友宮帶煞——你容易吸引「消耗型隊友」，合夥前先寫好退場條款再談感情' : '交友宮中性——別靠感覺，看對方怎麼對待上一個夥伴，那就是未來的你'}`,
          `【互補判斷】你的短板在「${weakestDim}」——對方補得上這塊，合作才是乘法；跟你太像的人只有加法`,
          `【權威判斷】${authLine}`,
        ],
        verdict: youScore <= -1 ? '你的盤在「隊友」上帶警訊——可以合作，但條款先行、簽約放慢。' : '對方補得上你的短板＋權威點頭＝可談合夥；缺一項就先維持專案合作、別急著綁定。',
      },
      {
        q: '要不要進修／轉換跑道？',
        steps: [
          `【路線判斷】${(studyP && studyP.n >= 2) ? '你坐得住——選有門檻、要長期累積的硬技能，複利最高' : '純上課你容易棄坑——選「直接接在真實任務上」的學法，邊做邊學才留得住'}`,
          `【年份判斷】${midYears.length ? `${midYears.slice(0, 2).join('、')} 是平持年——最適合蹲下來進修累積，把進攻年留給出手` : '近年沒有典型的蹲修年——進修用「小步快跑」拆進日常，不必等完整空檔'}`,
          `【轉行判斷】新跑道用得上你的「${top2[0]}」嗎？用得上＝轉場；用不上＝歸零重練，時間成本抓三倍再決定`,
        ],
        verdict: '進修幾乎沒有壞時機，照路線判斷選學法就好；「轉行」才需要挑年份＋確認新跑道接得上你的強項。',
      }
    );

    return { cards, career, finance, love, health, learning, yearCal, decisions };
  }

  /* ---------- 對策層 ---------- */
  function strategies(d) {
    const ps = probes(d);
    const { hd: H, bazi: B } = d;
    const out = [];
    const top = ps.filter((p) => p.n >= 2).slice(0, 6);
    const PLAYBOOK = {
      '表達與傳播': '不要壓縮輸出量，改管線：把「想講」導進固定的發表容器（週更、專欄、頻道），讓表達有出口而非在人際裡溢出。',
      '行動力與衝勁': '不要學「三思而後行」（做不到），改成「先衝小的」：把第一步拆到 30 分鐘內可完成，衝動有地方放，大決定自然慢下來。',
      '情感深度與感受力': '感受力不是要修掉的 bug：給它獨立頻寬（寫、獨處、藝術），不要讓它只能從身邊最親近的人身上找出口。',
      '秩序、結構與控制': '控制欲別對人用，對系統用：把「要求別人」翻譯成「設計流程」，同一股力氣，前者結仇、後者建資產。',
      '直覺與非線性認知': '直覺當偵察兵、邏輯當參謀：直覺負責提案，查證負責背書——只信直覺會踩雷，只信邏輯會錯過窗口。',
      '領導與舞台': '選「沒人接的球」當舞台切入點，而非跟人搶現成的位子：你的權威感在補位時最不被抵抗。',
      '財務嗅覺與資源運籌': '把嗅覺制度化：設定「聞到機會→寫下假設→小額驗證」的固定流程，防止嗅覺退化成賭性。',
      '研究、深度與洞察': '深度需要圍欄：一次只開一口井，並公開宣告你在挖什麼——防止深度變成無限延期的藉口。',
      '人群魅力與桃花': '魅力是被動資產，設主動篩選：吸來的注意力先過「值不值得回應」一關，否則人緣好會直接變成時間破產。',
      '遷移、變動與自由': '變動需求要排程，不是戒除：固定週期主動換場景（旅行、換咖啡店、輪調），否則它會用「突然想辭職」的形式討債。',
      '批判眼與完美主義': '批判眼對物不對人、對稿不對作者：把「指出錯誤」包裝成 checklist 與 code review 型制度，天賦就從人際負債轉成專業資產。',
      '美感與藝術頻道': '美感要有作品出口：沒有作品時，美感會退化成「只會嫌」——每季完成一件小的，比構想十件大的重要。',
    };
    for (const p of top) {
      out.push({ dim: p.dim, stars: p.stars, move: PLAYBOOK[p.dim] || '順著結構設計管線，而非對抗結構。' });
    }
    // 類型專屬
    out.push({
      dim: `人類圖決策（${H.type.split(' ')[0]}）`, stars: '策略',
      move: H.authority.includes('情緒') ? '所有重大決定過一夜再簽：因為你最清醒的時刻不在當下，而在情緒的波走完之後。' :
        H.authority.includes('薦骨') ? '用是非題問自己（身體有沒有「嗯哼」）：薦骨不回應的事，再合理也是消耗。' :
          H.authority.includes('直覺') ? '第一聲微弱的「不對勁」就是答案，它不會重播：錯過後用邏輯追認通常是災難。' :
            H.authority.includes('意志') ? '只承諾你真心想要的：意志力是脈衝式的，拿去撐別人的目標會過勞。' :
              H.authority.includes('自我投射') ? '決定前找信任的人把想法「說出來」：你是在聽自己說話的過程中知道答案的。' :
                H.authority.includes('月亮') ? '大決定等 28 天月循環走完：你是環境的取樣器，需要完整取樣週期。' :
                  '重大決定去對的環境、跟對的人談過再定：因為你的清醒來自對的場域。',
    });
    out.push({
      dim: `八字喜用（${B.favorable.join('、')}）`, stars: '策略',
      move: `環境與節奏向喜用五行傾斜（${B.favorable.map((e) => ({ 木: '生長型專案、綠色環境、晨間', 火: '曝光、熱鬧、表現舞台', 土: '固定據點、累積型資產、規律', 金: '制度、精修、削減冗餘', 水: '流動、學習、夜間深工作' }[e])).join('；')}）——這比「避開忌神」更可操作。`,
    });
    return out;
  }

  /* ---------- 頭條發現 ---------- */
  function headline(d) {
    const ps = probes(d);
    const top = ps.filter((p) => p.n >= 3).slice(0, 2);
    const { hd: H, bazi: B, west: W } = d;
    const identity = `身分層：${H.type.split(' ')[0]}×${B.pattern.name}×日主${B.dayMaster.stem}${B.dayMaster.elem}（${B.strength}）`;
    const body = `體質層：${H.authority.split('（')[0]}×月亮${W.moon.sign}×${B.favorable.join('')}為喜`;
    return { top, identity, body };
  }

  /* ---------- AI 深度解讀提示詞匯出 ---------- */
  function exportPrompt(d) {
    const { bazi: B, west: W, vedic: V, hd: H, ziwei: Z, misc: M, input } = d;
    const raw = [];
    raw.push('【已精算之盤面原始數據（由 astronomy-engine 天文曆算，非估算；禁止重算或覆寫，直接採用）】');
    raw.push('');
    const birthTime = input.timePrecision === 'range' && input.timeRange
      ? `時間區間 ${String(Math.floor(input.timeRange.start / 60)).padStart(2, '0')}:${String(input.timeRange.start % 60).padStart(2, '0')}–${String(Math.floor(input.timeRange.end / 60)).padStart(2, '0')}:${String(input.timeRange.end % 60).padStart(2, '0')}（本報告代表盤 ${String(input.hh).padStart(2, '0')}:${String(input.mm).padStart(2, '0')}）`
      : `${String(input.hh).padStart(2, '0')}:${String(input.mm).padStart(2, '0')}`;
    raw.push(`▎出生資料：${input.y}/${input.m}/${input.d} ${birthTime}（UTC${input.tz >= 0 ? '+' : ''}${input.tz}）緯度${input.lat} 經度${input.lon} ${input.sex === 'male' ? '男' : '女'}`);
    if (input.timePrecision === 'range' && input.timeRange) raw.push('▎時間不確定性：出生時間為區間而非精確分鐘。涉及八字時柱、紫微命／身宮、西占上升／天頂、人類圖核心設定的結論，必須保留多種可能性；禁止把代表盤寫成唯一斷語。');
    raw.push('');
    raw.push(`▎八字：${B.pillars.year.name} ${B.pillars.month.name} ${B.pillars.day.name} ${B.pillars.hour.name}｜日主${B.dayMaster.stem}${B.dayMaster.elem}・${B.strength}・${B.pattern.name}｜五行%：${Object.entries(B.elemPct).map(([e, p]) => e + p.toFixed(0)).join(' ')}｜喜用（工作假設）：${B.favorable.join('')}｜神煞：${B.shensha.map((s) => s.name + '@' + s.at).join('、')}｜刑沖合害：${B.relations.map((r) => r.kind + '(' + r.where + ')').join('、') || '無'}｜空亡：${B.kong.join('')}｜大運（${B.luck.forward ? '順' : '逆'}行，${B.luck.startAgeYears}歲起）：${B.luck.steps.map((s) => s.gz.name + '(' + Math.round(s.ageFrom) + ')').join(' ')}`);
    raw.push('');
    raw.push(`▎西占（回歸黃道／Placidus）：${W.planets.map((p) => `${p.name}${p.deg}${p.retro ? '℞' : ''}(${p.house || p.wholeSignHouse}宮)`).join('｜')}｜ASC ${W.asc.deg}｜MC ${W.mc.deg}｜相位：${W.aspects.map((a) => a.a + a.sym + a.b + a.orb + '°' + (a.exact ? '(精準)' : '')).join('、')}｜無相位：${W.unaspected.join('、') || '無'}｜元素%：${Object.entries(W.elemPct).map(([k, v]) => k + v.toFixed(0)).join(' ')}｜模式%：${Object.entries(W.modePct).map(([k, v]) => k + v.toFixed(0)).join(' ')}`);
    raw.push('');
    raw.push(`▎印占（Lahiri，ayanamsa ${V.ayanamsa.toFixed(3)}°）：${V.planets.map((p) => `${p.name}${p.deg}(${p.house}宮)`).join('｜')}｜恆星上升 ${V.ascDeg}｜月宿 ${V.moonNak.name} 第${V.moonNak.pada}pada（主星${ML.vedic.LORD_ZH[V.moonNak.lord]}）｜行星力量D1：${V.strength.map((s) => s.name + (s.d1 >= 0 ? '+' : '') + s.d1).join(' ')}｜D9：${V.strength.map((s) => s.name + (s.d9 >= 0 ? '+' : '') + s.d9).join(' ')}｜Vargottama：${V.vargottamas.join('、') || '無'}${V.ascVarg ? '、上升' : ''}｜瑜伽：${V.yogas.map((y) => y.name).join('、') || '無'}｜Jaimini七曜Karaka：${V.karakas.map((k) => k.role.split(' ')[0] + '=' + k.name).join('、')}｜Vimshottari：${V.dashas.filter((x) => x.endAge > 0 && x.startAge < 90).map((x) => `${x.lordZh}(${Math.max(0, x.startAge)}~${x.endAge}歲)`).join(' ')}`);
    raw.push('');
    raw.push(`▎人類圖：${H.type}｜${H.authority}｜${H.profile} ${H.profileName}｜${H.definition}｜定義中心：${H.definedCenters.join('、')}｜通道：${H.channels.map((c) => c.a + '-' + c.b + c.name).join('、')}｜輪迴交叉閘門：個性日${H.crossGates.pSun}／個性地${H.crossGates.pEarth}／設計日${H.crossGates.dSun}／設計地${H.crossGates.dEarth}（${H.crossAngle}）｜個性端：${H.personality.map((a) => a.bodyZh + a.gate + '.' + a.line).join(' ')}｜設計端（${H.designUTC.toISOString().slice(0, 10)}）：${H.design.map((a) => a.bodyZh + a.gate + '.' + a.line).join(' ')}`);
    raw.push('');
    raw.push(`▎紫微（真實朔望農曆：${Z.lunar.yearGZ.name}年${Z.lunar.monthName}${Z.lunar.dayName}${Z.hourBranch}時）：命宮${Z.mingBranch}・身宮${Z.shenBranch}・${Z.juName}・命主${Z.mingzhu}・身主${Z.shenzhu}｜生年四化：${Object.entries(Z.sihua).map(([k, v]) => v + '化' + k).join('、')}｜${Z.palaces.map((p) => `${p.name}[${p.stem}${p.branch}]${p.major.map((m) => m.star + m.bright + (m.hua ? '化' + m.hua : '')).join('')}${p.lucky.map((l) => l.star).join('')}${p.unlucky.map((u) => u.star).join('')}`).join('｜')}｜大限：${Z.daxian.map((x) => `${x.ageFrom}-${x.ageTo}${x.palaceName}`).join(' ')}`);
    raw.push('');
    raw.push(`▎補充：生命靈數 ${M.numerology.main}${M.numerology.master ? '（卓越數）' : ''}（生日數${M.numerology.birthday}；缺${M.numerology.missing.join('、') || '無'}）｜塔羅生日牌 ${M.tarot.map((t) => t.name).join('＋')}｜馬雅 ${M.maya.title || '2/29 無時間日'}（${M.maya.wavespell || ''}）｜命卦 ${M.gua.name}命（${M.gua.group}，吉向${M.gua.dir}方位群）｜宿曜本命宿 ${M.xiuyao.name}（${M.xiuyao.key}；曆算法27宿制，與印占天文月宿為兩套獨立系統）`);
    raw.push('');
    const nowYr = new Date().getFullYear();
    const at = annualTable(d, nowYr, 10);
    raw.push(`▎流年粗篩（${nowYr} 起十年，年界立春）：${at.rows.map((r) => `${r.year}${r.gz}${r.god}[${r.tone === 'good' ? '進攻' : r.tone === 'low' ? '防守' : '平持'}:${r.reasons.join('，')}]`).join('｜')}｜木星回歸：${at.jupR.join('、') || '—'}｜土星回歸：${at.satR.join('、') || '—'}`);
    raw.push('');

    const template = `你是一位跨系統命理分析者。以上排盤數據已由程式精確計算完成（swisseph 等級精度），請直接採用、禁止重算或憑記憶修改任何度數。

請嚴格遵守以下方法論：
1.【交叉，不並列】核心任務是找出「多個獨立系統共同指向的同一結構」，三系統以上匯流才視為高信度。禁止寫成各系統分段報告。
2.【矛盾要攤開】系統衝突處明確指出，判定是「真實對立」還是「座標系／流派差異的假衝突」。禁止和稀泥。
3.【可證偽優先】結論盡量寫成可用當事人實際紀錄核對的命題，嚴禁巴納姆句（如「你有時外向有時內向」「你很有潛力」）。每條觀察必須綁定盤面上統計少見的具體配置。
4.【逐句標來源】每個結論標注支持系統。不確定處標「⚠不確定」。
5.【本質 vs 狀態】區分結構性本質（L0）與流年狀態（L1/L2），L0 可寫「你是」，L1/L2 只能寫「這段時期你會偏向」，L3 只能寫「在某情境下你會」。
6.【並存優先於取捨】衝突特質預設「並存」（軸向／情境／時期三種形式，須指明），只有三系統以上匯流指向單邊才允許收斂。所有結論標注 ★★★（3+系統）／★★（2系統）／★（單系統，禁止寫成斷語）。
7.【語氣】高密度、結構化、不吹捧、不宿命論。不好聽但精準優先於好聽但空泛。

請依以下結構輸出：
一、排盤總表核對（簡列即可，已提供）
二、頭條發現：跨系統最強的一兩個匯流訊號，回答「為什麼此人會執著／重複某類模式」
三、本質層：8–10 個核心機制【機制／來源系統／為何重複／為何『提醒自己別做』無效】
四、結構層：人格構造分層＋純盤面天賦（附來源）
五、陰影層：10 條反巴納姆盲點（全部可證偽命題）
六、誤判層：以為是天賦其實可能是逃避／以為是限制其實可能是保護
七、匯流與矛盾：匯流表（三系統以上）＋矛盾清單（真對立 vs 假衝突＋調和方向）
八、時間層：八字大運＋紫微大限＋印占大運三波對齊，標「換軌窗口」與「紅綠燈年份」
九、待驗證假說：10 條純盤面推導、供當事人打勾／劃掉的命題
十、對策層：逐條對應本質層的結構性對策（不與結構對抗，替結構改管線）
十一、認識論收尾：聲明這是象徵系統交叉閱讀、非實證預測
十二、行動處方：每個重要結論配一條「具體到可執行」的行動——包含做什麼、多常做、
    第一步是什麼（例：「本週三前寄出一封毛遂自薦信」而非「多爭取機會」）。
    禁止勵志空話，每條行動必須小到一週內可以開始。

補充要求（v2）：在第一節後加「量化總覽」對讀（各系統雷達數據已附上，請做跨系統文字對讀，不要發明統一量表）；在時間層加「時期演化」（同一結構在不同章節被點亮的部位）。`;

    return raw.join('\n') + '\n\n' + template;
  }

  ML.report = { buildAll, probes, contradictions, timeline, dynamicLayers, hypotheses, strategies, headline, exportPrompt, starsOf, annualTable, planetReturns, synthesize, actionPlan, DIM_PLAIN, SKILL_CARDS, HD_ENTRY, ELEM_INDUSTRY, MOON_NEED };
  if (typeof module !== 'undefined' && module.exports) module.exports = ML;
})(typeof window !== 'undefined' ? window : globalThis);
