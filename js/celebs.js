/* ==========================================================
 * 同盘人物命例库与匹配
 * 人物生辰整理自公开资料（公历，时辰大多不详，按正午 12:00 排盘，
 * 时柱不参与匹配）；四柱与命理视角由本站引擎统一推算。
 * 匹配权重：日柱相同 55 > 年柱 15 / 月柱 12 > 同日主 12 / 日支 8 > 生肖 6
 * ========================================================== */
(function (root) {
  "use strict";

  var BA = root.BaziAnalysis || (typeof require !== "undefined" ? require("./analysis.js") : null);
  var Lunar, Solar;
  if (typeof window === "undefined") {
    var lm = require("../lib/lunar.js");
    Lunar = lm.Lunar; Solar = lm.Solar;
  } else {
    Lunar = window.Lunar; Solar = window.Solar;
  }

  /* ---------------- 人物数据（name / date 公历 / cat 领域 / bio 生平一句） ---------------- */
  var PEOPLE = [
    // 政治家 / 军事家 / 思想家
    { name: "毛泽东", date: "1893-12-26", cat: "政治家", bio: "中国共产党、中国人民解放军和中华人民共和国的主要缔造者。" },
    { name: "周恩来", date: "1898-03-05", cat: "政治家", bio: "开国总理，以儒雅务实、鞠躬尽瘁著称。" },
    { name: "邓小平", date: "1904-08-22", cat: "政治家", bio: "改革开放总设计师，开创中国特色社会主义道路。" },
    { name: "丘吉尔", date: "1874-11-30", cat: "政治家", bio: "英国首相，二战期间领导英国抗衡纳粹德国。" },
    { name: "罗斯福", date: "1882-01-30", cat: "政治家", bio: "美国第 32 任总统，推行新政并领导二战同盟国。" },
    { name: "拿破仑", date: "1769-08-15", cat: "军事家", bio: "法兰西第一帝国皇帝，横扫欧洲的军事天才。" },
    { name: "林肯", date: "1809-02-12", cat: "政治家", bio: "美国第 16 任总统，废除奴隶制、维护国家统一。" },
    { name: "甘地", date: "1869-10-02", cat: "政治家", bio: "印度独立运动领袖，以非暴力不合作闻名于世。" },
    { name: "曼德拉", date: "1918-07-18", cat: "政治家", bio: "南非首位黑人总统，反种族隔离的精神象征。" },
    { name: "马克思", date: "1818-05-05", cat: "思想家", bio: "马克思主义创始人，《资本论》《共产党宣言》作者。" },
    { name: "黑格尔", date: "1770-08-27", cat: "思想家", bio: "德国古典哲学集大成者，辩证法大师。" },
    { name: "歌德", date: "1749-08-28", cat: "文学家", bio: "德国文豪，《浮士德》作者，魏玛古典主义代表。" },
    // 科学家
    { name: "钱学森", date: "1911-12-11", cat: "科学家", bio: "中国航天之父、导弹之父，两弹一星元勋。" },
    { name: "杨振宁", date: "1922-10-01", cat: "科学家", bio: "诺贝尔物理学奖得主，提出宇称不守恒理论。" },
    { name: "李政道", date: "1926-11-24", cat: "科学家", bio: "诺贝尔物理学奖得主，粒子物理与量子场论大家。" },
    { name: "华罗庚", date: "1910-11-12", cat: "科学家", bio: "中国现代数学奠基人，优选法与统筹法推广者。" },
    { name: "陈景润", date: "1933-05-22", cat: "科学家", bio: "数学家，攻克哥德巴赫猜想「1+2」。",  },
    { name: "袁隆平", date: "1930-09-07", cat: "科学家", bio: "杂交水稻之父，让亿万人口远离饥饿。" },
    { name: "屠呦呦", date: "1930-12-30", cat: "科学家", bio: "发现青蒿素，中国首位诺贝尔生理学或医学奖得主。" },
    { name: "钟南山", date: "1936-10-20", cat: "科学家", bio: "呼吸病学专家，非典与新冠防疫的领军人物。" },
    { name: "爱因斯坦", date: "1879-03-14", cat: "科学家", bio: "相对论创立者，二十世纪最伟大的物理学家。" },
    { name: "达尔文", date: "1809-02-12", cat: "科学家", bio: "《物种起源》作者，进化论创立者。" },
    { name: "爱迪生", date: "1847-02-11", cat: "发明家", bio: "发明电灯、留声机，一生持有上千项专利。" },
    { name: "特斯拉", date: "1856-07-10", cat: "发明家", bio: "交流电系统之父，无线电先驱，传奇发明家。" },
    { name: "居里夫人", date: "1867-11-07", cat: "科学家", bio: "镭与钋的发现者，两获诺贝尔奖的物理化学家。" },
    { name: "霍金", date: "1942-01-08", cat: "科学家", bio: "黑洞理论与宇宙学大家，《时间简史》作者。" },
    { name: "图灵", date: "1912-06-23", cat: "科学家", bio: "计算机科学与人工智能之父，破解恩尼格码。" },
    { name: "弗洛伊德", date: "1856-05-06", cat: "思想家", bio: "精神分析学派创始人，《梦的解析》作者。" },
    { name: "荣格", date: "1875-07-26", cat: "思想家", bio: "分析心理学创始人，提出集体无意识与原型理论。" },
    // 文学家
    { name: "鲁迅", date: "1881-09-25", cat: "文学家", bio: "中国现代文学奠基人，《呐喊》《彷徨》作者。" },
    { name: "胡适", date: "1891-12-17", cat: "文学家", bio: "新文化运动领袖，白话文倡导者。" },
    { name: "老舍", date: "1899-02-03", cat: "文学家", bio: "《骆驼祥子》《茶馆》作者，人民艺术家。" },
    { name: "巴金", date: "1904-11-25", cat: "文学家", bio: "《家》《春》《秋》作者，世纪文学巨匠。" },
    { name: "冰心", date: "1900-10-05", cat: "文学家", bio: "《繁星》《春水》作者，世纪同龄人。" },
    { name: "张爱玲", date: "1920-09-30", cat: "文学家", bio: "《倾城之恋》《金锁记》作者，沦陷区文学的传奇。" },
    { name: "林徽因", date: "1904-06-10", cat: "建筑学家", bio: "中国第一位女建筑学家，参与国徽设计。" },
    { name: "金庸", date: "1924-03-10", cat: "文学家", bio: "武侠小说泰斗，「飞雪连天射白鹿，笑书神侠倚碧鸳」。" },
    { name: "莫言", date: "1955-02-17", cat: "文学家", bio: "诺贝尔文学奖得主，《红高粱家族》作者。" },
    { name: "余华", date: "1960-04-03", cat: "文学家", bio: "《活着》《许三观卖血记》作者。" },
    { name: "三毛", date: "1943-03-26", cat: "文学家", bio: "撒哈拉的故事作者，浪迹天涯的传奇作家。" },
    { name: "海明威", date: "1899-07-21", cat: "文学家", bio: "《老人与海》作者，诺贝尔文学奖得主。" },
    // 艺术家
    { name: "齐白石", date: "1864-01-01", cat: "画家", bio: "从木匠到国画大师，虾蟹虫草独步画坛。" },
    { name: "徐悲鸿", date: "1895-07-19", cat: "画家", bio: "《奔马图》作者，中西融合的美术教育奠基人。" },
    { name: "张大千", date: "1899-05-10", cat: "画家", bio: "泼墨泼彩开创者，五百年来一大千。" },
    { name: "梅兰芳", date: "1894-10-22", cat: "艺术家", bio: "京剧旦角一代宗师，梅派艺术创始人。" },
    { name: "梵高", date: "1853-03-30", cat: "画家", bio: "《向日葵》《星月夜》作者，后印象派巨匠。" },
    { name: "毕加索", date: "1881-10-25", cat: "画家", bio: "立体主义创始人，二十世纪最伟大的艺术家之一。" },
    // 企业家
    { name: "李嘉诚", date: "1928-07-29", cat: "企业家", bio: "从塑胶花起家到长和系商业帝国，华人首富。" },
    { name: "任正非", date: "1944-10-25", cat: "企业家", bio: "华为创始人，带领华为成为全球通信巨头。" },
    { name: "马云", date: "1964-09-10", cat: "企业家", bio: "阿里巴巴创始人，改变中国电商与支付格局。" },
    { name: "马化腾", date: "1971-10-29", cat: "企业家", bio: "腾讯创始人，QQ 与微信缔造者。" },
    { name: "雷军", date: "1969-12-16", cat: "企业家", bio: "小米创始人，「为发烧而生」的互联网手机旗手。" },
    { name: "王健林", date: "1954-10-24", cat: "企业家", bio: "万达集团创始人，商业地产王者。" },
    { name: "董明珠", date: "1954-08-19", cat: "企业家", bio: "格力电器董事长，铁腕营销的「董小姐」。" },
    { name: "曹德旺", date: "1946-05-09", cat: "企业家", bio: "福耀玻璃创始人，全球汽车玻璃大王。" },
    { name: "比尔·盖茨", date: "1955-10-28", cat: "企业家", bio: "微软联合创始人，个人计算机革命推手。" },
    { name: "乔布斯", date: "1955-02-24", cat: "企业家", bio: "苹果联合创始人，重新定义手机与个人电脑。" },
    { name: "马斯克", date: "1971-06-28", cat: "企业家", bio: "特斯拉与 SpaceX 掌门人，火星移民梦想家。" },
    { name: "巴菲特", date: "1930-08-30", cat: "投资家", bio: "伯克希尔掌门人，「奥马哈先知」价值投资之神。" },
    { name: "贝佐斯", date: "1964-01-12", cat: "企业家", bio: "亚马逊创始人，电商与云计算帝国缔造者。" },
    { name: "扎克伯格", date: "1984-05-14", cat: "企业家", bio: "Facebook（Meta）创始人，社交网络之王。" },
    // 演艺
    { name: "成龙", date: "1954-04-07", cat: "演员", bio: "功夫喜剧之王，奥斯卡终身成就奖华人第一人。" },
    { name: "李连杰", date: "1963-04-26", cat: "演员", bio: "武术冠军出身的国际功夫巨星。" },
    { name: "周星驰", date: "1962-06-22", cat: "演员", bio: "无厘头喜剧之王，《大话西游》深入人心。" },
    { name: "刘德华", date: "1961-09-27", cat: "演员", bio: "影歌双栖常青树，劳模精神代名词。" },
    { name: "张学友", date: "1961-07-10", cat: "歌手", bio: "「歌神」，华语乐坛唱片销量纪录保持者。" },
    { name: "王菲", date: "1969-08-08", cat: "歌手", bio: "天后级歌手，空灵嗓音独树一帜。" },
    { name: "邓丽君", date: "1953-01-29", cat: "歌手", bio: "华语乐坛永恒的天后，《月亮代表我的心》。" },
    { name: "张国荣", date: "1956-09-12", cat: "演员", bio: "影歌双栖巨星，《霸王别姬》程蝶衣。" },
    { name: "周杰伦", date: "1979-01-18", cat: "歌手", bio: "华语流行音乐革命者，融合中西曲风。" },
    { name: "巩俐", date: "1965-12-31", cat: "演员", bio: "威尼斯影后，中国第五代电影的国际名片。" },
    { name: "迈克尔·杰克逊", date: "1958-08-29", cat: "歌手", bio: "流行音乐之王，《Thriller》史上最畅销专辑。" },
    { name: "猫王", date: "1935-01-08", cat: "歌手", bio: "摇滚乐之王，猫王普雷斯利。" },
    { name: "约翰·列侬", date: "1940-10-09", cat: "音乐人", bio: "披头士乐队核心，《Imagine》作者。" },
    // 体育
    { name: "姚明", date: "1980-09-12", cat: "运动员", bio: "NBA 名人堂中锋，中美体育交流桥梁。" },
    { name: "刘翔", date: "1983-07-13", cat: "运动员", bio: "110 米栏奥运冠军，亚洲飞人。" },
    { name: "李宁", date: "1963-03-10", cat: "运动员", bio: "体操王子，奥运五金得主，后创李宁品牌。" },
    { name: "郎平", date: "1960-12-10", cat: "运动员", bio: "「铁榔头」，运动员与教练身份均夺奥运金牌。" },
    { name: "迈克尔·乔丹", date: "1963-02-17", cat: "运动员", bio: "篮球之神，六夺 NBA 总冠军。" },
    { name: "梅西", date: "1987-06-24", cat: "运动员", bio: "八夺金球的阿根廷球王，世界杯冠军。" },
    { name: "C罗", date: "1985-02-05", cat: "运动员", bio: "葡萄牙巨星，五夺金球，欧冠之王。" },
    { name: "马拉多纳", date: "1960-10-30", cat: "运动员", bio: "阿根廷传奇球王，1986 年世界杯一己之力登顶。" },
    { name: "费德勒", date: "1981-08-08", cat: "运动员", bio: "网球史上最优雅的王者，20 座大满贯得主。" }
  ];

  /* ---------------- 预计算四柱与命理视角 ---------------- */

  function computeView(ec) {
    var dayGan = ec.getDayGan();
    var gejuSS = BA.shiShen(dayGan, BA.ZHI_MAIN_GAN[ec.getMonthZhi()]);
    var gejuName = BA.GEJU_NAMES[gejuSS];
    var kw = BA.SHISHEN_PROFILES[gejuSS] ? BA.SHISHEN_PROFILES[gejuSS].kw : "";
    var cnt = BA.countShiShen(ec);
    var top = null, n = 0;
    for (var k in cnt) { if (k !== "比肩" && cnt[k] > n) { n = cnt[k]; top = k; } }
    return BA.GAN_WX[dayGan] + "日主" + dayGan + "，月令" + gejuName + "（" + kw.split(" · ").join("、") + "）" +
      (top ? "，命局" + top + "气质突出" : "");
  }

  var DB = PEOPLE.map(function (p) {
    var parts = p.date.split("-");
    var ec = Solar.fromYmdHms(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10), 12, 0, 0).getLunar().getEightChar();
    return {
      name: p.name, date: p.date, cat: p.cat, bio: p.bio,
      gz: [ec.getYear(), ec.getMonth(), ec.getDay()],
      dayGan: ec.getDayGan(), dayZhi: ec.getDayZhi(),
      view: computeView(ec)
    };
  });

  /* ---------------- 匹配 ---------------- */

  /**
   * 与命例库匹配
   * @param ec 用户 EightChar
   * @returns {list, stats} list 为按相似度排序的全部命中（含 tags），stats 为各档人数
   */
  function matchCelebs(ec) {
    var uy = ec.getYear(), um = ec.getMonth(), ud = ec.getDay();
    var ug = ec.getDayGan(), uz = ec.getDayZhi();
    var stats = { sameDay: 0, sameGan: 0, sameZhi: 0, total: DB.length };

    var list = DB.map(function (p) {
      var s = 0, tags = [];
      if (p.gz[2] === ud) { s += 55; tags.push("日柱相同"); stats.sameDay++; }
      else {
        if (p.dayGan === ug) { s += 12; tags.push("同日主"); }
        if (p.dayZhi === uz) { s += 8; tags.push("日支相同"); }
      }
      if (p.gz[0] === uy) { s += 15; tags.push("年柱相同"); }
      else if (p.gz[0].charAt(1) === uy.charAt(1)) { s += 6; tags.push("同生肖"); }
      if (p.gz[1] === um) { s += 12; tags.push("月柱相同"); }
      if (p.dayGan === ug) stats.sameGan++;
      if (p.dayZhi === uz) stats.sameZhi++;
      return { name: p.name, date: p.date, cat: p.cat, bio: p.bio, gz: p.gz, view: p.view, score: s, tags: tags };
    }).filter(function (m) { return m.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    return { list: list, stats: stats };
  }

  var api = { matchCelebs: matchCelebs, PEOPLE: PEOPLE, DB: DB };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BaziCelebs = api;
})(typeof window !== "undefined" ? window : globalThis);
