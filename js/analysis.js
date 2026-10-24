/* ==========================================================
 * 命理解读规则库（简化模型）
 * 依赖：lunar.js 提供 EightChar 数据；本文件负责
 *   1. 十神推算、五行计分、日主强弱、喜用神
 *   2. 天干性格、十神含义、格局、事业财运婚姻解读文案
 * 供 UI（app.js）与 Node 测试脚本共用。
 * ========================================================== */
(function (root) {
  "use strict";

  /* ---------------- 基础常量 ---------------- */

  var GAN = "甲乙丙丁戊己庚辛壬癸";
  var ZHI = "子丑寅卯辰巳午未申酉戌亥";

  // 天干五行 / 阴阳（true=阳）
  var GAN_WX = { "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水" };
  var GAN_YANG = { "甲": true, "乙": false, "丙": true, "丁": false, "戊": true, "己": false, "庚": true, "辛": false, "壬": true, "癸": false };

  // 地支五行
  var ZHI_WX = { "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火", "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水" };

  // 五行生克：我生 / 我克
  var WX_SHENG = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
  var WX_KE = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

  var WX_LIST = ["木", "火", "土", "金", "水"];

  /* ---------------- 十神推算 ---------------- */

  /**
   * 求任意天干相对日主的十神
   * @param dayGan 日主天干，如 "癸"
   * @param gan    目标天干
   */
  function shiShen(dayGan, gan) {
    if (dayGan === gan) return "比肩";
    var d = GAN_WX[dayGan], o = GAN_WX[gan];
    var same = GAN_YANG[dayGan] === GAN_YANG[gan]; // 同性
    if (d === o) return same ? "比肩" : "劫财";
    if (WX_SHENG[d] === o) return same ? "食神" : "伤官";   // 我生
    if (WX_KE[d] === o) return same ? "偏财" : "正财";       // 我克
    if (WX_KE[o] === d) return same ? "七杀" : "正官";       // 克我
    if (WX_SHENG[o] === d) return same ? "偏印" : "正印";    // 生我
    return "";
  }

  // 地支藏干表（本气在前，与 lunar 顺序一致）
  var HIDE_GAN = {
    "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"], "卯": ["乙"],
    "辰": ["戊", "乙", "癸"], "巳": ["丙", "庚", "戊"], "午": ["丁", "己"], "未": ["己", "丁", "乙"],
    "申": ["庚", "壬", "戊"], "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "甲"]
  };
  // 地支本气藏干
  var ZHI_MAIN_GAN = { "子": "癸", "丑": "己", "寅": "甲", "卯": "乙", "辰": "戊", "巳": "丙", "午": "丁", "未": "己", "申": "庚", "酉": "辛", "戌": "戊", "亥": "壬" };
  function hideGanOf(z) { return HIDE_GAN[z] || []; }

  /* ---------------- 五行计分与强弱 ---------------- */

  /**
   * 五行计分：天干每字 100 分；地支按藏干加权（本气 60 / 中气 30 / 余气 10），
   * 总分恒为 800。同时给出同类（日主+印）占比。
   */
  function wuxingScore(ec) {
    var score = { "木": 0, "火": 0, "土": 0, "金": 0, "水": 0 };
    var gans = [ec.getYearGan(), ec.getMonthGan(), ec.getDayGan(), ec.getTimeGan()];
    var zhis = [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi(), ec.getTimeZhi()];
    gans.forEach(function (g) { score[GAN_WX[g]] += 100; });
    zhis.forEach(function (z) {
      var hides = hideGanOf(z); // 本气在前
      var weights = [60, 30, 10];
      hides.forEach(function (h, i) { score[GAN_WX[h]] += weights[i] || 0; });
    });
    var dayWX = GAN_WX[ec.getDayGan()];
    var yinWX = null;
    for (var wx in WX_SHENG) { if (WX_SHENG[wx] === dayWX) { yinWX = wx; break; } } // 生我者为印
    var tonglei = score[dayWX] + score[yinWX];
    return {
      score: score,
      total: 800,
      dayWX: dayWX,
      yinWX: yinWX,
      tongleiRatio: tonglei / 800,
      // 各柱天干、地支原始数据（供 UI 上色复用）
      gans: gans,
      zhis: zhis
    };
  }

  /**
   * 日主强弱：同类占比为主，辅以得令（月令本气同/生日主）与
   * 得地（地支藏干见本气根）修正。
   */
  function strength(ec, scoreData) {
    var dayGan = ec.getDayGan();
    var dayWX = scoreData.dayWX;

    // 得令：月支本气与日主同类，或生日主
    var monthMain = ZHI_MAIN_GAN[ec.getMonthZhi()];
    var deLing = GAN_WX[monthMain] === dayWX || WX_SHENG[GAN_WX[monthMain]] === dayWX;

    // 得地：除月支外，年/日/时支藏干中有与日主同五行之根
    var deDi = false;
    var zhiArr = [ec.getYearZhi(), ec.getDayZhi(), ec.getTimeZhi()];
    for (var i = 0; i < zhiArr.length; i++) {
      var hides = hideGanOf(zhiArr[i]);
      for (var j = 0; j < hides.length; j++) {
        if (GAN_WX[hides[j]] === dayWX) { deDi = true; break; }
      }
      if (deDi) break;
    }

    var ratio = scoreData.tongleiRatio;
    var pts = ratio * 100;
    if (deLing) pts += 8;
    if (deDi) pts += 4;

    var level, label, desc;
    if (pts >= 60) { level = "strong"; label = "身强"; desc = "日主得令得势，气势旺盛，足以任财官。"; }
    else if (pts >= 52) { level = "slightly-strong"; label = "偏强"; desc = "日主中气偏旺，根基尚稳，行运顺遂时可担财官。"; }
    else if (pts >= 45) { level = "balanced"; label = "中和"; desc = "五行气势较为均衡，命局平稳，环境与努力对人生影响显著。"; }
    else if (pts >= 35) { level = "slightly-weak"; label = "偏弱"; desc = "日主中气偏弱，宜得生扶，行印比之运较顺。"; }
    else { level = "weak"; label = "身弱"; desc = "日主气势不足，须印比生扶，忌财官克泄过重。"; }

    return { level: level, label: label, desc: desc, deLing: deLing, deDi: deDi, ratio: ratio, points: pts };
  }

  /**
   * 喜用神（简化规则）：强喜克泄耗（官杀/财/食伤），弱喜生扶（印/比）。
   * 返回 {favor: [五行], avoid: [五行], text}
   */
  function favorable(ec, scoreData, strengthData) {
    var dayWX = scoreData.dayWX, yinWX = scoreData.yinWX;
    var biWX = dayWX;                 // 比劫
    var shangWX = WX_SHENG[dayWX];    // 我生（食伤）
    var caiWX = WX_KE[dayWX];         // 我克（财）
    var guanWX = null;
    for (var wx in WX_KE) { if (WX_KE[wx] === dayWX) { guanWX = wx; break; } } // 克我（官杀）

    var favor, avoid, text;
    if (strengthData.level === "strong" || strengthData.level === "slightly-strong") {
      favor = [guanWX, caiWX, shangWX];
      avoid = [yinWX, biWX];
      text = "日主偏强，喜以官杀约身、财星耗力、食伤泄秀；行运遇" + favor.join("、") + "之五行较吉，忌印比过旺再助其势。";
    } else if (strengthData.level === "balanced") {
      favor = [dayWX, yinWX];
      avoid = [];
      text = "命局中和，五行贵在流通，宜顺势而为：补其不足、损其有余，行运以平顺均衡为佳。";
    } else {
      favor = [yinWX, biWX];
      avoid = [guanWX, caiWX, shangWX];
      text = "日主偏弱，喜印星生扶、比劫帮身；行运遇" + favor.join("、") + "之五行较吉，忌财官食伤克泄交加。";
    }
    return { favor: favor, avoid: avoid, text: text };
  }

  /* ---------------- 文案库 ---------------- */

  // 十天干性格（含阴阳之别）
  var GAN_PROFILES = {
    "甲": { name: "甲木", title: "参天之木", text: "甲木如参天大树，天性正直向上，富有理想与担当。为人稳重可靠，重原则、讲道义，一旦认准方向便坚忍生长；缺点是稍显固执，不善拐弯。" },
    "乙": { name: "乙木", title: "藤蔓花草", text: "乙木如藤蔓花草，柔韧而富生机。为人谦和灵活，适应力极强，善于借势借力、以柔克刚；心思细腻敏感，交际圆润，但遇事易多虑、依赖环境。" },
    "丙": { name: "丙火", title: "太阳之火", text: "丙火如太阳当空，光明磊落、热情开朗。为人坦率慷慨，感染力强，乐于照亮他人，行动明快；只是性情急躁直接，喜怒易形于色。" },
    "丁": { name: "丁火", title: "灯烛之火", text: "丁火如灯烛星火，温婉而持久。为人细腻体贴，洞察入微，对在意之事有超常的专注与执念；外柔内热，感情丰富，较为顾面子。" },
    "戊": { name: "戊土", title: "城墙厚土", text: "戊土如高山城墙，厚重沉稳。为人守信重诺，包容大度，是众人可以依靠的对象；处事稳健保守，有时显得不够变通、慢半拍。" },
    "己": { name: "己土", title: "田园之土", text: "己土如田园沃土，谦逊而滋养万物。为人温和务实，心思缜密，擅长协调与经营细节；包容性强，但耳根偏软，易受他人影响。" },
    "庚": { name: "庚金", title: "刀剑矿石", text: "庚金如刀剑顽铁，刚毅果决。为人豪爽重义，敢作敢当，爱憎分明，越挫越勇；性格棱角分明，易得罪人而不自知。" },
    "辛": { name: "辛金", title: "珠玉之金", text: "辛金如珠玉首饰，精致通透。为人聪慧敏感，品味出众，追求完美，注重形象与体面；自尊心强，受批评时容易暗自介怀。" },
    "壬": { name: "壬水", title: "江河之水", text: "壬水如江河奔流，智慧通达。为人豁达乐观，思维活跃，善于变通与沟通，见识广阔；兴趣多变，定力稍欠，宜择一而深。" },
    "癸": { name: "癸水", title: "雨露之水", text: "癸水如雨露滋润，聪颖内敛。为人温和低调，直觉敏锐，想象力丰富，擅于暗中蓄力、以时间换空间；多愁善感，易受情绪牵动。" }
  };

  // 十神含义（关键词 / 性格 / 事业 / 财运 / 大运）
  var SHISHEN_PROFILES = {
    "比肩": {
      kw: "自立 · 竞争 · 平等",
      nature: "自我意识强，独立自主，重视公平，愿意凭本事立足；朋友缘不弱，但与人共事时界限分明。",
      career: "适合凭专业技能独立发展，或与人合伙经营；同行竞争虽多，亦是动力。",
      wealth: "财来财去皆靠自己双手，合伙投资须先小人后君子，谨防利益纠葛。",
      yun: "此运比肩当值，同辈与竞争者纷至——宜自立门户、精进技艺，防小人分利、朋友借贷。"
    },
    "劫财": {
      kw: "行动 · 豪爽 · 冲劲",
      nature: "行动派，豪爽大方，敢闯敢拼，极具号召力；花钱大方，性急冲动，易虎头蛇尾。",
      career: "宜开拓性、攻坚性的工作，如销售、创业、体力或竞技性行业；忌守成。",
      wealth: "偏财缘旺但破耗也快，切忌赌博式投机与为人担保，宜强制储蓄。",
      yun: "此运劫财主导，机遇与破耗并存——宜攻不宜守，大额支出与借贷务必谨慎。"
    },
    "食神": {
      kw: "才艺 · 温和 · 口福",
      nature: "性情温和，多才多艺，表达力佳，懂得享受生活；有耐心，能于平淡中见真味。",
      career: "适合文创、美食、教育、艺术、内容创作等以才华与表达立身的领域。",
      wealth: "以技艺生财，财源细水长流；食神生财，越有专业积累越见富足。",
      yun: "此运食神吐秀，才华得以施展——宜创作、深造、开拓副业，身心亦较安泰。"
    },
    "伤官": {
      kw: "聪明 · 锋芒 · 创新",
      nature: "天资聪颖，创意十足，口才了得，蔑视陈规；个性张扬，易恃才傲物、言语伤人。",
      career: "适合技术、设计、法律、自媒体等高自由度、以创新立身的行业；不宜死板体制。",
      wealth: "伤官生财，凭点子与手艺进财快而猛；忌与人斗气误事，落袋方为安。",
      yun: "此运伤官主事，才气纵横而口舌亦多——扬长避短，慎言慎行，防与上司权威起冲突。"
    },
    "正财": {
      kw: "踏实 · 节俭 · 正缘",
      nature: "务实勤勉，精打细算，重视家庭与承诺；行事稳妥，不喜冒险。",
      career: "适合财务、实业、稳定薪职等按部就班积累的领域，积小成大。",
      wealth: "正财稳厚，多劳多得，宜工薪加稳健理财；横财非其所长，稳即是福。",
      yun: "此运正财临门，财缘正当而稳定——宜勤勉经营、置业储蓄，亦是成家立业的好时机。"
    },
    "偏财": {
      kw: "灵活 · 慷慨 · 机遇",
      nature: "慷慨大方，交际圆融，商业嗅觉敏锐，善于抓住机会；豪爽不拘小节。",
      career: "适合贸易、金融、销售、创业等灵活多变的行当，长袖善舞。",
      wealth: "财来机遇，善于以钱生钱，但也大起大落；须戒赌性与挥霍，见好就收。",
      yun: "此运偏财掌局，意外之机与桃花纷至——宜果断出手亦须设止损，防财色双失。"
    },
    "正官": {
      kw: "守规 · 责任 · 名誉",
      nature: "品行端正，自律守规，有责任感与荣誉感，天然让人信服；略显拘谨。",
      career: "适合体制内、管理、法务、大企业等讲求规范与层级的轨道，贵气可期。",
      wealth: "以名取利，职位与声望即是财源；不宜灰色收入，因小失大。",
      yun: "此运正官值岁，名誉与责任并重——是晋升、考试、掌权的好时机，亦须奉公守度。"
    },
    "七杀": {
      kw: "果决 · 魄力 · 压力",
      nature: "魄力十足，果敢坚毅，敢于迎难而上，有领导欲与征服欲；性烈易怒，压力中人。",
      career: "适合军警、外科、竞技、创业、技术攻坚等高压高回报领域，能成大事。",
      wealth: "富贵险中求，敢拼敢抢；须防树敌招怨，刚极易折，宜留三分余地。",
      yun: "此运七杀当头，如驾烈马——权力与压力同至，宜化压力为动力，慎防小人与官非。"
    },
    "正印": {
      kw: "慈爱 · 学养 · 庇护",
      nature: "心地仁厚，好学不倦，重视精神世界，有长者缘与贵人运；依赖心稍重。",
      career: "适合学术、教育、医疗、公职、文创等以学识与德行立身的领域。",
      wealth: "财缘平稳，靠名望学识安身；重名轻利，理财宜稳健为主。",
      yun: "此运正印护身，贵人与学识俱旺——宜深造、考证、著述，名声运佳，惟防惰性滋生。"
    },
    "偏印": {
      kw: "独特 · 专精 · 直觉",
      nature: "思维独特，直觉敏锐，擅长冷门专业与深度钻研；性情孤僻，多疑内敛。",
      career: "适合玄学、医药、技术、设计、研究等偏门专精领域，一招鲜吃遍天。",
      wealth: "以稀罕技艺得财，不宜随大流竞争；灵感即财源。",
      yun: "此运偏印司权，灵感倍出而人际渐疏——宜深耕专业、慎思笃行，防想多做少。"
    }
  };

  // 月令本气十神 → 传统格局名
  var GEJU_NAMES = {
    "正官": "正官格", "七杀": "七杀格", "正财": "正财格", "偏财": "偏财格",
    "食神": "食神格", "伤官": "伤官格", "正印": "正印格", "偏印": "偏印格",
    "比肩": "建禄格", "劫财": "月刃格"
  };
  var GEJU_DESC = {
    "正官格": "正官格以贵气立命，重秩序与名分，行运顺遂时可得名位，忌刑冲破害损伤官星。",
    "七杀格": "七杀格以魄力立命，敢任难事，如能食神制杀或印化杀，反主大贵大权。",
    "正财格": "正财格以勤俭立命，财帛稳厚，宜稳步经营，忌比劫争夺。",
    "偏财格": "偏财格以机变立命，财来财去皆快，善经营交际，须防挥霍与浮财。",
    "食神格": "食神格以才艺立命，福气深厚，衣食无忧，食神生财最为绵长。",
    "伤官格": "伤官格以才气立命，聪明外露，若伤官配印或伤官生财，成就非凡。",
    "正印格": "正印格以学识立命，清贵有福，多得长辈庇荫，宜文教之路。",
    "偏印格": "偏印格以专技立命，思虑深远，宜冷门技艺深耕，忌三心二意。",
    "建禄格": "建禄格身旺自立，不靠祖荫，凭实力白手起家，喜财官成局。",
    "月刃格": "月刃格阳刃当权，性格刚烈果敢，宜武职与技术，须官杀制刃方成大器。"
  };

  // 五行对应行业方向
  var WX_CAREER = {
    "木": "教育、文化出版、医药养生、园艺、家具、服装",
    "火": "能源电力、传媒影视、电子科技、餐饮、美业",
    "土": "房地产、建筑、农业、仓储物流、陶瓷、咨询",
    "金": "金融证券、机械制造、五金、法律、军警",
    "水": "贸易、物流运输、旅游、水产、流动性强的行业"
  };

  // 日支（夫妻宫）藏干十神 → 配偶画像
  var SPOUSE_PROFILE = {
    "比肩": "配偶独立自主、与我势均力敌，相处如友；惟双方都硬气，须各退一步。",
    "劫财": "配偶性格豪爽、行动力强，人缘旺；婚后须防财务 AA 不清与异性缘过旺。",
    "食神": "配偶温和有品位，懂生活、有口福，家庭氛围融洽安逸。",
    "伤官": "配偶聪明有才、个性鲜明，相处不闷；惟口舌之争在所难免，须互相欣赏。",
    "正财": "配偶勤俭踏实、顾家可靠，是持家好手，婚姻务实而安稳。",
    "偏财": "配偶慷慨机敏、善交际，财缘佳；须平衡家庭与应酬。",
    "正官": "配偶端正有责任感，传统顾家，让人心安；略显严肃无趣。",
    "七杀": "配偶果敢有魄力、事业心强，气场较盛；宜敬而互信，忌硬碰硬。",
    "正印": "配偶仁厚包容、有学识，如长辈般呵护，婚姻温情。",
    "偏印": "配偶心思细腻、有独门专长，安静内敛；须多主动沟通免生隔阂。"
  };

  // 咸池桃花：按年支/日支三合局查
  var TAOHUA = { "申": "酉", "子": "酉", "辰": "酉", "寅": "卯", "午": "卯", "戌": "卯", "巳": "午", "酉": "午", "丑": "午", "亥": "子", "卯": "子", "未": "子" };

  /* ---------------- 综合解读 ---------------- */

  /**
   * 生成全部解读文案
   * @param opts {ec, gender(1男0女), score, strength, favor, currentDaYun, nextDaYun}
   * @returns {summary, personality, geju, career, wealth, marriage, dayun}
   */
  function buildReading(opts) {
    var ec = opts.ec, gender = opts.gender;
    var score = opts.score, st = opts.strength, fa = opts.favor;
    var dayGan = ec.getDayGan();
    var dayProfile = GAN_PROFILES[dayGan];
    var dayWX = score.dayWX;

    // ---- 统计十神分布（四柱天干 + 地支藏干全量）----
    var shiShenCount = {};
    var addSS = function (name) { if (name && name !== "日主") shiShenCount[name] = (shiShenCount[name] || 0) + 1; };
    [ec.getYearGan(), ec.getMonthGan(), ec.getTimeGan()].forEach(function (g) { addSS(shiShen(dayGan, g)); });
    [ec.getYearZhi(), ec.getMonthZhi(), ec.getDayZhi(), ec.getTimeZhi()].forEach(function (z) {
      hideGanOf(z).forEach(function (h) { addSS(shiShen(dayGan, h)); });
    });

    // 格局：月支本气透干优先，否则径取月令本气十神
    var gejuSS = shiShen(dayGan, ZHI_MAIN_GAN[ec.getMonthZhi()]);

    // ---- 总评 ----
    var summary = "命主为" + dayProfile.name + "之命，如" + dayProfile.title + "。月令" +
      ec.getMonthZhi() + "，" + GAN_WX[ZHI_MAIN_GAN[ec.getMonthZhi()]] + "气当权。四柱五行以" +
      dominantWX(score) + "最旺，日主" + st.label + "——" + st.desc +
      "整体而言，" + fa.text;

    // ---- 性格 ----
    var topSS = topShiShen(shiShenCount);
    var personality = dayProfile.text;
    if (topSS) {
      personality += "命局中以" + SHISHEN_PROFILES[topSS].kw.split(" · ").join("、") + "（" + topSS + "）气质最为突出，" + SHISHEN_PROFILES[topSS].nature;
    }

    // ---- 格局 ----
    var geju = "月令" + ec.getMonthZhi() + "中" + ZHI_MAIN_GAN[ec.getMonthZhi()] + "之气为用，" + GEJU_DESC[GEJU_NAMES[gejuSS]];

    // ---- 事业 ----
    var careerParts = [];
    var hasGuan = (shiShenCount["正官"] || 0) > 0, hasSha = (shiShenCount["七杀"] || 0) > 0;
    if (hasGuan && !hasSha) {
      careerParts.push("命带正官，责任心与规范意识强，适合体制内、大企业或管理岗位，凭资历与名誉稳步上升。");
    } else if (hasSha && !hasGuan) {
      careerParts.push("命带七杀，魄力与抗压能力过人，适合竞争激烈、技术攻坚或开拓性领域，乱世出英雄之命。");
    } else if (hasGuan && hasSha) {
      careerParts.push("官杀并见，官杀混杂则贵气有争——宜尽早聚焦一条主线（从政或从商择一深耕），去留分明方成大器。");
    } else {
      careerParts.push("四柱不见官杀，天性不喜受管束，适合自由职业、专业技术或自行创业，凭本事吃饭。");
    }
    careerParts.push("结合喜用五行，利于" + fa.favor.join("、") + "属性行业：如" + fa.favor.map(function (w) { return WX_CAREER[w]; }).join("；") + "等。");
    var career = careerParts.join("");

    // ---- 财运 ----
    var caiCount = (shiShenCount["正财"] || 0) + (shiShenCount["偏财"] || 0);
    var wealthParts = [];
    if (caiCount === 0) {
      wealthParts.push("四柱财星不显，视金钱较为淡泊，钱财多过手而不聚；宜以技艺立身、以食伤引财，中年行财运时方见起色。");
    } else if (caiCount <= 2 && (st.level === "strong" || st.level === "slightly-strong")) {
      wealthParts.push("财星" + (caiCount === 1 ? "一位" : "两见") + "而日主" + st.label + "，身能任财，是善于把握机会、财来能守之命，宜稳健经营、逐步滚大。");
    } else if (caiCount <= 2) {
      wealthParts.push("财星" + (caiCount === 1 ? "一位" : "两见") + "而日主偏弱，财来须防身受累——宜量力而行，忌重仓投机，行印比运帮身后再图进取。");
    } else {
      if (st.level === "strong" || st.level === "slightly-strong") {
        wealthParts.push("财星多见而日主" + st.label + "，身旺财旺，经商理财皆有天分，富格可期；惟须防贪多嚼不烂。");
      } else {
        wealthParts.push("财星多见而日主偏弱，古谓「财多身弱，富屋贫人」——机会多而精力有限，切忌贪大求全，宜借力合伙、择一而精。");
      }
    }
    var wealth = wealthParts.join("");

    // ---- 婚姻 ----
    var marriageParts = [];
    var dayZhiSS = shiShen(dayGan, ZHI_MAIN_GAN[ec.getDayZhi()]);
    marriageParts.push("日支为夫妻宫，坐" + dayZhiSS + "：" + SPOUSE_PROFILE[dayZhiSS]);
    if (gender === 1) {
      if ((shiShenCount["正财"] || 0) > 0) marriageParts.push("男命以财星为妻，正财入命，妻缘正而稳，多得贤内助。");
      else if ((shiShenCount["偏财"] || 0) > 0) marriageParts.push("男命以财星为妻，偏财入命，配偶善交际而多机变，婚后财务宜公开透明。");
      else marriageParts.push("男命以财星为妻，财星不透藏于支中，婚缘略迟，宜主动经营感情。");
    } else {
      if ((shiShenCount["正官"] || 0) > 0) marriageParts.push("女命以官星为夫，正官入命，夫缘正而贵，易遇端正可靠之人。");
      else if ((shiShenCount["七杀"] || 0) > 0) marriageParts.push("女命以官星为夫，七杀入命，配偶气场强、事业心重，相处宜柔中带刚。");
      else marriageParts.push("女命以官星为夫，官星藏而不透，婚缘略迟，宜广结善缘静待良人。");
    }
    // 桃花
    var taoZhi = TAOHUA[ec.getYearZhi()];
    var hasTaohua = [ec.getMonthZhi(), ec.getDayZhi(), ec.getTimeZhi()].indexOf(taoZhi) >= 0;
    if (hasTaohua) marriageParts.push("命中带咸池桃花，人缘异性缘皆旺，魅力天成；惟须专情定志，防烂桃花扰家。");
    var marriage = marriageParts.join("");

    // ---- 大运简评 ----
    var dayunParts = [];
    if (opts.currentDaYun && opts.currentDaYun.getGanZhi()) {
      var curSS = shiShen(dayGan, opts.currentDaYun.getGanZhi()[0]);
      var range = opts.currentDaYun.getStartYear() + "–" + opts.currentDaYun.getEndYear() + "年（" +
        opts.currentDaYun.getStartAge() + "–" + opts.currentDaYun.getEndAge() + "岁）行" + opts.currentDaYun.getGanZhi() + "运，天干" + curSS + "当值。" +
        SHISHEN_PROFILES[curSS].yun;
      dayunParts.push(range);
    }
    if (opts.nextDaYun && opts.nextDaYun.getGanZhi()) {
      var nxtSS = shiShen(dayGan, opts.nextDaYun.getGanZhi()[0]);
      dayunParts.push("其后" + opts.nextDaYun.getGanZhi() + "运（" + opts.nextDaYun.getStartYear() + "–" + opts.nextDaYun.getEndYear() + "年）转" + nxtSS + "之气：" + SHISHEN_PROFILES[nxtSS].yun);
    }
    var dayun = dayunParts.join("") || "尚在起运之前的童年期。";

    return {
      summary: summary,
      personality: personality,
      geju: geju,
      career: career,
      wealth: wealth,
      marriage: marriage,
      dayun: dayun,
      gejuName: GEJU_NAMES[gejuSS],
      topShiShen: topSS,
      shiShenCount: shiShenCount,
      dayProfile: dayProfile
    };
  }

  /* 工具 */
  function dominantWX(score) {
    var best = "木", n = -1;
    WX_LIST.forEach(function (w) { if (score.score[w] > n) { n = score.score[w]; best = w; } });
    return best;
  }
  function topShiShen(count) {
    var best = null, n = 0;
    for (var k in count) { if (k !== "比肩" && count[k] > n) { n = count[k]; best = k; } }
    return best;
  }

  /* ---------------- 导出 ---------------- */
  var api = {
    GAN: GAN, ZHI: ZHI, GAN_WX: GAN_WX, ZHI_WX: ZHI_WX, ZHI_MAIN_GAN: ZHI_MAIN_GAN, HIDE_GAN: HIDE_GAN,
    hideGanOf: hideGanOf,
    WX_SHENG: WX_SHENG, WX_KE: WX_KE, WX_LIST: WX_LIST,
    shiShen: shiShen,
    wuxingScore: wuxingScore,
    strength: strength,
    favorable: favorable,
    buildReading: buildReading,
    GAN_PROFILES: GAN_PROFILES,
    SHISHEN_PROFILES: SHISHEN_PROFILES,
    GEJU_NAMES: GEJU_NAMES
  };

  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  root.BaziAnalysis = api;
})(typeof window !== "undefined" ? window : globalThis);
