/* ==========================================================
 * 起名取名模块
 * 依据（通行姓名学口径，简化实现）：
 *   人名：八字喜用神定用字五行 + 五格剖象法（康熙笔画：天/人/地/外/总格，
 *         81数理吉凶）+ 音律（声调错落、避双声）
 *   公司名：以字号为主体，行业五行配用字五行 + 总格数理 + 寓意
 * 说明：五格剖象法为日式改良姓名学，数理口径争议较多，仅供娱乐参考。
 * ========================================================== */
(function (root) {
  "use strict";

  var BA = root.BaziAnalysis || (typeof require !== "undefined" ? require("./analysis.js") : null);

  /* ---------------- 人名字库 ----------------
   * c 字 / w 五行 / s 康熙笔画(姓名学通行口径) / p 拼音 / m 寓意 / g 性别倾向(f女 m男)
   */
  var PERSON_POOL = [
    // 木
    { c: "林", w: "木", s: 8, p: "lín", m: "双木成林，茂盛兴旺" },
    { c: "森", w: "木", s: 12, p: "sēn", m: "森林繁茂，生机勃勃" },
    { c: "松", w: "木", s: 8, p: "sōng", m: "松柏长青，坚韧高洁" },
    { c: "柏", w: "木", s: 9, p: "bǎi", m: "苍柏挺立，四季常青" },
    { c: "杉", w: "木", s: 7, p: "shān", m: "杉木挺拔，清雅正直" },
    { c: "桐", w: "木", s: 10, p: "tóng", m: "梧桐引凤，高洁祥瑞" },
    { c: "梓", w: "木", s: 11, p: "zǐ", m: "梓木良材，成材成器" },
    { c: "楠", w: "木", s: 13, p: "nán", m: "楠木贵重，坚实可靠" },
    { c: "榕", w: "木", s: 14, p: "róng", m: "榕树参天，荫泽绵长" },
    { c: "栋", w: "木", s: 12, p: "dòng", m: "栋梁之才，堪当大任" },
    { c: "杰", w: "木", s: 12, p: "jié", m: "人中之杰，才智出众", g: "m" },
    { c: "彬", w: "木", s: 11, p: "bīn", m: "文质彬彬，儒雅有礼" },
    { c: "楷", w: "木", s: 13, p: "kǎi", m: "楷模表率，端正可法" },
    { c: "筠", w: "木", s: 13, p: "yún", m: "竹之青皮，清雅坚韧" },
    { c: "健", w: "木", s: 11, p: "jiàn", m: "体魄强健，精力充沛", g: "m" },
    { c: "杭", w: "木", s: 8, p: "háng", m: "通航致远，温润从容" },
    { c: "芊", w: "木", s: 9, p: "qiān", m: "草木芊芊，青葱茂美", g: "f" },
    { c: "芸", w: "木", s: 10, p: "yún", m: "芸香清雅，书香之质", g: "f" },
    { c: "莉", w: "木", s: 13, p: "lì", m: "茉莉芬芳，清新可人", g: "f" },
    { c: "菁", w: "木", s: 14, p: "jīng", m: "菁华荟萃，出类拔萃" },
    { c: "萱", w: "木", s: 15, p: "xuān", m: "萱草忘忧，快乐无忧", g: "f" },
    { c: "萌", w: "木", s: 14, p: "méng", m: "萌芽初发，朝气蓬勃" },
    { c: "薇", w: "木", s: 19, p: "wēi", m: "蔷薇婉丽，柔美坚韧", g: "f" },
    { c: "若", w: "木", s: 11, p: "ruò", m: "若水灵动，温婉从容", g: "f" },
    { c: "英", w: "木", s: 11, p: "yīng", m: "英气勃发，才华过人" },
    { c: "梅", w: "木", s: 11, p: "méi", m: "梅花傲雪，冰清玉洁", g: "f" },
    // 火
    { c: "炎", w: "火", s: 8, p: "yán", m: "光炎炽盛，热忱似火" },
    { c: "焱", w: "火", s: 12, p: "yàn", m: "光华灿烂，光明磊落" },
    { c: "煜", w: "火", s: 13, p: "yù", m: "光辉照耀，前程明亮" },
    { c: "昊", w: "火", s: 8, p: "hào", m: "昊天广阔，胸襟远大", g: "m" },
    { c: "昕", w: "火", s: 8, p: "xīn", m: "朝阳初升，充满希望" },
    { c: "旭", w: "火", s: 6, p: "xù", m: "旭日东升，蒸蒸日上" },
    { c: "晗", w: "火", s: 11, p: "hán", m: "天将破晓，光明在望" },
    { c: "晴", w: "火", s: 12, p: "qíng", m: "晴空朗朗，乐观开朗", g: "f" },
    { c: "曦", w: "火", s: 20, p: "xī", m: "晨曦微光，温暖明亮" },
    { c: "灿", w: "火", s: 17, p: "càn", m: "灿烂夺目，光彩照人" },
    { c: "丹", w: "火", s: 4, p: "dān", m: "丹心赤诚，真挚热烈", g: "f" },
    { c: "彤", w: "火", s: 7, p: "tóng", m: "彤霞满天，红红火火", g: "f" },
    { c: "彰", w: "火", s: 14, p: "zhāng", m: "彰明较著，功成名就", g: "m" },
    { c: "德", w: "火", s: 15, p: "dé", m: "德行厚重，仁爱诚信", g: "m" },
    { c: "志", w: "火", s: 7, p: "zhì", m: "志存高远，坚定不移", g: "m" },
    { c: "乐", w: "火", s: 15, p: "lè", m: "乐观豁达，喜乐平安" },
    { c: "俊", w: "火", s: 9, p: "jùn", m: "英俊潇洒，才貌双全", g: "m" },
    { c: "晋", w: "火", s: 10, p: "jìn", m: "晋阶上进，步步高升", g: "m" },
    { c: "智", w: "火", s: 12, p: "zhì", m: "智慧通达，明辨是非" },
    { c: "玲", w: "火", s: 10, p: "líng", m: "玲珑剔透，聪慧灵巧", g: "f" },
    { c: "晓", w: "火", s: 16, p: "xiǎo", m: "破晓通明，明白事理" },
    { c: "朗", w: "火", s: 11, p: "lǎng", m: "开朗明快，爽朗大方", g: "m" },
    { c: "昱", w: "火", s: 9, p: "yù", m: "日光明亮，照耀四方" },
    // 土
    { c: "宇", w: "土", s: 6, p: "yǔ", m: "气宇轩昂，胸怀天地", g: "m" },
    { c: "安", w: "土", s: 6, p: "ān", m: "平安顺遂，安稳可靠" },
    { c: "岚", w: "土", s: 12, p: "lán", m: "山间雾岚，空灵秀美", g: "f" },
    { c: "峰", w: "土", s: 10, p: "fēng", m: "登峰造极，出类拔萃", g: "m" },
    { c: "峻", w: "土", s: 10, p: "jùn", m: "山势峻拔，刚毅挺立", g: "m" },
    { c: "岳", w: "土", s: 8, p: "yuè", m: "五岳巍峨，稳如泰山", g: "m" },
    { c: "岩", w: "土", s: 8, p: "yán", m: "岩石坚固，意志如磐", g: "m" },
    { c: "垚", w: "土", s: 9, p: "yáo", m: "三土高垒，厚重稳实" },
    { c: "培", w: "土", s: 11, p: "péi", m: "培土育才，厚积薄发" },
    { c: "磊", w: "土", s: 15, p: "lěi", m: "光明磊落，坦荡胸怀", g: "m" },
    { c: "屹", w: "土", s: 6, p: "yì", m: "屹立不倒，坚定不移", g: "m" },
    { c: "容", w: "土", s: 10, p: "róng", m: "有容乃大，包容大度" },
    { c: "怡", w: "土", s: 9, p: "yí", m: "怡然自得，温和愉悦", g: "f" },
    { c: "依", w: "土", s: 8, p: "yī", m: "依恋温情，柔顺体贴", g: "f" },
    { c: "远", w: "土", s: 17, p: "yuǎn", m: "宁静致远，志向高远" },
    { c: "阳", w: "土", s: 17, p: "yáng", m: "阳光明媚，积极向上" },
    { c: "维", w: "土", s: 14, p: "wéi", m: "维新致远，思维缜密", g: "m" },
    { c: "韵", w: "土", s: 19, p: "yùn", m: "气韵生动，风雅有情", g: "f" },
    { c: "圣", w: "土", s: 13, p: "shèng", m: "通达圣明，格局超凡" },
    { c: "婉", w: "土", s: 11, p: "wǎn", m: "温婉贤淑，柔美端庄", g: "f" },
    { c: "嫣", w: "土", s: 14, p: "yān", m: "嫣然巧笑，明媚动人", g: "f" },
    { c: "恩", w: "土", s: 10, p: "ēn", m: "感恩重义，福泽绵长" },
    { c: "辰", w: "土", s: 7, p: "chén", m: "星辰岁月，珍视时光" },
    // 金
    { c: "鑫", w: "金", s: 24, p: "xīn", m: "三金聚顶，财富兴盛" },
    { c: "铭", w: "金", s: 14, p: "míng", m: "铭刻于心，志向恒久", g: "m" },
    { c: "钦", w: "金", s: 12, p: "qīn", m: "钦敬景仰，德才服人", g: "m" },
    { c: "锐", w: "金", s: 15, p: "ruì", m: "锐意进取，敏锐果决", g: "m" },
    { c: "钰", w: "金", s: 13, p: "yù", m: "珍宝美玉，温润贵气", g: "f" },
    { c: "锦", w: "金", s: 16, p: "jǐn", m: "锦绣前程，繁华似锦" },
    { c: "瑞", w: "金", s: 14, p: "ruì", m: "祥瑞之气，吉庆有余" },
    { c: "珊", w: "金", s: 10, p: "shān", m: "珊瑚珍奇，美丽脱俗", g: "f" },
    { c: "诗", w: "金", s: 13, p: "shī", m: "诗礼传家，才情风雅", g: "f" },
    { c: "静", w: "金", s: 16, p: "jìng", m: "宁静致远，沉静优雅", g: "f" },
    { c: "承", w: "金", s: 8, p: "chéng", m: "承前启后，担当负责", g: "m" },
    { c: "睿", w: "金", s: 14, p: "ruì", m: "睿智明达，见识深远" },
    { c: "心", w: "金", s: 4, p: "xīn", m: "用心至诚，内心澄明", g: "f" },
    { c: "思", w: "金", s: 9, p: "sī", m: "才思敏捷，深谋远虑" },
    { c: "世", w: "金", s: 5, p: "shì", m: "经世致用，格局宏大", g: "m" },
    { c: "正", w: "金", s: 5, p: "zhèng", m: "正气凛然，堂堂正正", g: "m" },
    { c: "诚", w: "金", s: 14, p: "chéng", m: "诚信立身，一诺千金", g: "m" },
    { c: "舒", w: "金", s: 12, p: "shū", m: "舒展自如，从容不迫", g: "f" },
    { c: "宣", w: "金", s: 9, p: "xuān", m: "宣明通达，雅正大方" },
    { c: "悦", w: "金", s: 11, p: "yuè", m: "赏心悦目，喜悦常伴", g: "f" },
    { c: "瑜", w: "金", s: 14, p: "yú", m: "怀瑾握瑜，美玉之质", g: "f" },
    { c: "姝", w: "金", s: 9, p: "shū", m: "静女其姝，娴雅美好", g: "f" },
    { c: "聪", w: "金", s: 17, p: "cōng", m: "聪明睿智，耳聪目明" },
    { c: "超", w: "金", s: 12, p: "chāo", m: "超凡出众，卓尔不群", g: "m" },
    // 水
    { c: "涵", w: "水", s: 12, p: "hán", m: "涵养深厚，虚怀若谷" },
    { c: "沐", w: "水", s: 8, p: "mù", m: "如沐春风，清新自在" },
    { c: "泽", w: "水", s: 17, p: "zé", m: "泽被四方，恩泽绵长", g: "m" },
    { c: "洋", w: "水", s: 10, p: "yáng", m: "海洋辽阔，气度不凡" },
    { c: "海", w: "水", s: 11, p: "hǎi", m: "海纳百川，胸怀宽广" },
    { c: "涛", w: "水", s: 18, p: "tāo", m: "波涛壮阔，气势磅礴", g: "m" },
    { c: "沁", w: "水", s: 8, p: "qìn", m: "沁人心脾，清新怡人", g: "f" },
    { c: "清", w: "水", s: 12, p: "qīng", m: "清风朗月，清雅高洁" },
    { c: "淳", w: "水", s: 12, p: "chún", m: "淳厚朴真，温良谦和" },
    { c: "润", w: "水", s: 16, p: "rùn", m: "温润如玉，泽物无声" },
    { c: "汐", w: "水", s: 7, p: "xī", m: "潮汐有信，温柔守时", g: "f" },
    { c: "泓", w: "水", s: 9, p: "hóng", m: "一泓清泉，澄澈明净" },
    { c: "浩", w: "水", s: 11, p: "hào", m: "浩然正气，胸怀壮阔", g: "m" },
    { c: "源", w: "水", s: 14, p: "yuán", m: "饮水思源，生生不息" },
    { c: "溪", w: "水", s: 14, p: "xī", m: "清溪流淌，灵动秀气", g: "f" },
    { c: "慕", w: "水", s: 15, p: "mù", m: "心怀慕远，情谊深长" },
    { c: "雯", w: "水", s: 12, p: "wén", m: "云彩成雯，绚丽多姿", g: "f" },
    { c: "雨", w: "水", s: 8, p: "yǔ", m: "润物春雨，温柔滋养", g: "f" },
    { c: "雪", w: "水", s: 11, p: "xuě", m: "冰雪聪明，纯净高洁", g: "f" },
    { c: "霖", w: "水", s: 16, p: "lín", m: "甘霖普降，福泽丰厚", g: "m" },
    { c: "文", w: "水", s: 4, p: "wén", m: "文采斐然，温文尔雅" },
    { c: "慧", w: "水", s: 15, p: "huì", m: "慧质兰心，冰雪聪明", g: "f" },
    { c: "敏", w: "水", s: 11, p: "mǐn", m: "敏而好学，机敏干练" },
    { c: "汉", w: "水", s: 15, p: "hàn", m: "气度如汉，豪迈旷达", g: "m" },
    { c: "淇", w: "水", s: 12, p: "qí", m: "淇水清清，温婉灵秀", g: "f" },
    { c: "弘", w: "水", s: 5, p: "hóng", m: "弘毅宽厚，志向宏大", g: "m" },
    { c: "子", w: "水", s: 3, p: "zǐ", m: "君子之风，谦和有礼" },
    { c: "美", w: "水", s: 9, p: "měi", m: "尽善尽美，心地纯美" }
  ];

  /* ---------------- 商用字库（公司字号）---------------- */
  var BIZ_POOL = [
    { c: "鑫", w: "金", s: 24, p: "xīn", m: "财富兴盛" },
    { c: "金", w: "金", s: 8, p: "jīn", m: "尊贵坚实" },
    { c: "瑞", w: "金", s: 14, p: "ruì", m: "祥瑞吉庆" },
    { c: "祥", w: "金", s: 11, p: "xiáng", m: "吉祥如意" },
    { c: "昌", w: "金", s: 8, p: "chāng", m: "昌盛兴旺" },
    { c: "盛", w: "金", s: 12, p: "shèng", m: "兴旺繁盛" },
    { c: "创", w: "金", s: 12, p: "chuàng", m: "开创进取" },
    { c: "新", w: "金", s: 13, p: "xīn", m: "革新求变" },
    { c: "信", w: "金", s: 9, p: "xìn", m: "诚信立业" },
    { c: "隆", w: "火", s: 17, p: "lóng", m: "生意兴隆" },
    { c: "泰", w: "火", s: 9, p: "tài", m: "泰运恒安" },
    { c: "发", w: "水", s: 12, p: "fā", m: "发达兴旺" },
    { c: "达", w: "火", s: 16, p: "dá", m: "通达顺遂" },
    { c: "通", w: "火", s: 14, p: "tōng", m: "贯通四海" },
    { c: "天", w: "火", s: 4, p: "tiān", m: "格局宏大" },
    { c: "光", w: "火", s: 6, p: "guāng", m: "光明远大" },
    { c: "辉", w: "火", s: 15, p: "huī", m: "辉煌璀璨" },
    { c: "中", w: "火", s: 4, p: "zhōng", m: "持中守正" },
    { c: "兴", w: "水", s: 16, p: "xīng", m: "兴旺发达" },
    { c: "宝", w: "火", s: 20, p: "bǎo", m: "珍宝聚敛" },
    { c: "腾", w: "火", s: 20, p: "téng", m: "腾飞跃升" },
    { c: "卓", w: "火", s: 8, p: "zhuó", m: "卓尔不凡" },
    { c: "拓", w: "火", s: 9, p: "tuò", m: "开拓疆域" },
    { c: "丰", w: "火", s: 18, p: "fēng", m: "丰收丰裕" },
    { c: "德", w: "火", s: 15, p: "dé", m: "以德立业" },
    { c: "恒", w: "水", s: 10, p: "héng", m: "持之以恒" },
    { c: "宏", w: "水", s: 7, p: "hóng", m: "宏图大展" },
    { c: "海", w: "水", s: 11, p: "hǎi", m: "海纳百川" },
    { c: "汇", w: "水", s: 13, p: "huì", m: "汇聚八方" },
    { c: "源", w: "水", s: 14, p: "yuán", m: "源头活水" },
    { c: "永", w: "水", s: 5, p: "yǒng", m: "基业长青" },
    { c: "豪", w: "水", s: 14, p: "háo", m: "豪迈进取" },
    { c: "飞", w: "水", s: 9, p: "fēi", m: "展翅高飞" },
    { c: "富", w: "水", s: 12, p: "fù", m: "富足殷实" },
    { c: "华", w: "水", s: 14, p: "huá", m: "华彩卓越" },
    { c: "川", w: "金", s: 3, p: "chuān", m: "百川归海" },
    { c: "山", w: "土", s: 3, p: "shān", m: "稳固如山" },
    { c: "星", w: "金", s: 9, p: "xīng", m: "星光闪耀" },
    { c: "辰", w: "土", s: 7, p: "chén", m: "星辰高远" },
    { c: "旺", w: "土", s: 8, p: "wàng", m: "兴旺红火" },
    { c: "贵", w: "木", s: 12, p: "guì", m: "尊贵不凡" },
    { c: "玉", w: "木", s: 5, p: "yù", m: "玉质温润" },
    { c: "杰", w: "木", s: 12, p: "jié", m: "人中豪杰" },
    { c: "凯", w: "木", s: 12, p: "kǎi", m: "凯旋得胜" },
    { c: "启", w: "木", s: 11, p: "qǐ", m: "启航开篇" },
    { c: "元", w: "木", s: 4, p: "yuán", m: "一元复始" },
    { c: "茂", w: "木", s: 11, p: "mào", m: "根深叶茂" },
    { c: "佳", w: "木", s: 8, p: "jiā", m: "品质上佳" }
  ];

  /* ---------------- 行业 → 五行 ---------------- */
  var INDUSTRIES = [
    { name: "科技互联网 / 软件", wx: "火" },
    { name: "广告传媒 / 影视文化", wx: "火" },
    { name: "餐饮食品 / 烘焙", wx: "火" },
    { name: "能源电力 / 化工", wx: "火" },
    { name: "金融投资 / 银行证券", wx: "金" },
    { name: "机械制造 / 五金精密", wx: "金" },
    { name: "教育培训 / 文化出版", wx: "木" },
    { name: "医疗健康 / 生物医药", wx: "木" },
    { name: "农林牧渔 / 园艺环保", wx: "木" },
    { name: "服装纺织 / 美容美业", wx: "木" },
    { name: "房地产 / 建筑工程", wx: "土" },
    { name: "物业管理 / 仓储物流", wx: "土" },
    { name: "贸易进出口 / 电商", wx: "水" },
    { name: "运输航运 / 旅游酒店", wx: "水" },
    { name: "咨询策划 / 智力服务", wx: "水" }
  ];

  /* ---------------- 常见姓氏康熙笔画 ---------------- */
  var SURNAME_STROKES = {
    "李": 7, "王": 4, "张": 11, "刘": 15, "陈": 16, "杨": 13, "黄": 12, "吴": 7, "赵": 14, "周": 8,
    "徐": 10, "孙": 10, "马": 10, "朱": 6, "胡": 9, "郭": 15, "何": 7, "林": 8, "高": 10, "罗": 19,
    "郑": 19, "梁": 11, "谢": 17, "宋": 7, "唐": 10, "许": 11, "韩": 17, "冯": 12, "邓": 19, "曹": 11,
    "彭": 12, "曾": 12, "肖": 7, "田": 5, "董": 12, "袁": 10, "潘": 16, "蔡": 17, "蒋": 17, "余": 7,
    "杜": 7, "叶": 15, "程": 12, "苏": 22, "魏": 15, "吕": 7, "丁": 2, "任": 6, "沈": 8, "姚": 9,
    "卢": 16, "姜": 9, "崔": 11, "钟": 17, "谭": 20, "陆": 16, "汪": 9, "范": 8, "金": 8, "石": 5,
    "廖": 13, "贾": 13, "夏": 10, "韦": 9, "傅": 12, "方": 4, "白": 5, "邹": 13, "孟": 8, "秦": 10,
    "邱": 5, "侯": 9, "江": 7, "尹": 4, "薛": 17, "段": 9, "雷": 13, "龙": 16, "黎": 15, "陶": 16,
    "贺": 12, "顾": 21, "毛": 4, "郝": 9, "邵": 5, "钱": 16, "严": 20, "洪": 10, "汤": 13, "施": 9,
    "温": 14, "季": 8, "柳": 9, "闫": 7, "于": 3
  };

  /* ---------------- 五格数理 ---------------- */
  // 81数理（简化口径：吉 / 半吉 / 凶）
  var SHU_JI = { 1: 1, 3: 1, 5: 1, 6: 1, 7: 1, 8: 1, 11: 1, 13: 1, 15: 1, 16: 1, 17: 1, 18: 1, 21: 1, 23: 1, 24: 1, 25: 1, 29: 1, 31: 1, 32: 1, 33: 1, 35: 1, 37: 1, 39: 1, 41: 1, 45: 1, 47: 1, 48: 1, 52: 1, 57: 1, 61: 1, 63: 1, 65: 1, 67: 1, 68: 1, 81: 1 };
  var SHU_BANJI = { 27: 1, 30: 1, 38: 1, 42: 1, 49: 1, 51: 1, 55: 1, 58: 1, 71: 1, 73: 1, 75: 1 };

  function shuVerdict(n) {
    n = ((n - 1) % 80) + 1;
    if (SHU_JI[n]) return { n: n, v: "吉" };
    if (SHU_BANJI[n]) return { n: n, v: "半吉" };
    return { n: n, v: "凶" };
  }

  /**
   * 五格计算（康熙笔画）。surname 为 1-2 字的姓。
   * @returns {tian, ren, di, wai, zong} 各格 {n, v}
   */
  function wuge(surname, chars) {
    var sv = surname.map(function (c) { return c.s; });
    var nv = chars.map(function (c) { return c.s; });
    var tian, ren, di, zong;
    if (sv.length === 1) {
      tian = sv[0] + 1;
      ren = sv[0] + nv[0];
      di = nv.length > 1 ? nv[0] + nv[1] : nv[0] + 1;
    } else {
      tian = sv[0] + sv[1];
      ren = sv[1] + nv[0];
      di = nv.length > 1 ? nv[0] + nv[1] : nv[0] + 1;
    }
    zong = sv.reduce(function (a, b) { return a + b; }, 0) + nv.reduce(function (a, b) { return a + b; }, 0);
    var wai = zong - ren + 1;
    return { tian: shuVerdict(tian), ren: shuVerdict(ren), di: shuVerdict(di), wai: shuVerdict(wai), zong: shuVerdict(zong) };
  }

  // 数理打分：人格/地格/总格为主
  function wugePoints(g) {
    var f = function (x) { return x.v === "吉" ? 10 : x.v === "半吉" ? 4 : -8; };
    return f(g.ren) + f(g.di) + f(g.zong);
  }

  // 声调工具：拼音的声调用韵母标号后的符号推断不便，改为存数字声调
  function toneOf(p) {
    var marks = { "ā": 1, "á": 2, "ǎ": 3, "à": 4, "ē": 1, "é": 2, "ě": 3, "è": 4, "ī": 1, "í": 2, "ǐ": 3, "ì": 4, "ō": 1, "ó": 2, "ǒ": 3, "ò": 4, "ū": 1, "ú": 2, "ǔ": 3, "ù": 4, "ǖ": 1, "ǘ": 2, "ǚ": 3, "ǜ": 4 };
    for (var i = 0; i < p.length; i++) { if (marks[p[i]]) return marks[p[i]]; }
    return 5; // 轻声
  }
  function initialOf(p) { return p.charAt(0); }

  /* ---------------- 人名生成 ---------------- */

  function charScoreByWuxing(ch, favor, avoid) {
    if (favor.indexOf(ch.w) >= 0) return 30;
    if (avoid.indexOf(ch.w) >= 0) return -12;
    return 8;
  }

  /**
   * 个人起名
   * @param opts {surnameText, gender(1/0), ec, fa, single(bool)}
   * @returns {list, favor, note}
   */
  function genPersonNames(opts) {
    var favor = opts.fa.favor, avoid = opts.fa.avoid;
    var surname = [];
    for (var i = 0; i < opts.surnameText.length; i++) {
      var chr = opts.surnameText[i];
      // 姓氏笔画优先取姓氏表，其次字库（如"林"），都不含则视为笔画未知
      var sVal = SURNAME_STROKES[chr] || (PERSON_POOL.filter(function (c) { return c.c === chr; })[0] || {}).s || 0;
      surname.push({ c: chr, w: "", s: sVal, p: "", m: "" });
    }
    var surnameKnown = surname.length > 0 && surname.every(function (c) { return c.s > 0; });

    var pool = PERSON_POOL.map(function (ch) {
      var s = charScoreByWuxing(ch, favor, avoid);
      if (ch.g === "f" && opts.gender === 1) s -= 15;
      if (ch.g === "m" && opts.gender === 0) s -= 15;
      return { ch: ch, s: s };
    });

    var results = [];
    var tonePairPts = function (a, b) {
      var ta = toneOf(a.p), tb = toneOf(b.p);
      var pts = 0;
      if (ta !== tb) pts += 6; else pts -= 2;
      if (initialOf(a.p) === initialOf(b.p)) pts -= 4; // 双声拗口
      return pts;
    };

    function push(chars) {
      var pts = chars.reduce(function (acc, x) { return acc + x.s; }, 0);
      var g = null;
      if (surnameKnown) {
        g = wuge(surname, chars.map(function (x) { return x.ch; }));
        pts += wugePoints(g);
      } else {
        pts -= 10; // 无姓可算五格，整体微降以示信息较少
      }
      pts += chars.length > 1 ? tonePairPts(chars[0].ch, chars[1].ch) : 0;
      results.push({ chars: chars.map(function (x) { return x.ch; }), score: pts, wuge: g });
    }

    for (var a = 0; a < pool.length; a++) {
      if (pool[a].s <= -10) continue; // 忌神且性别不符的过差组合直接跳过
      if (opts.single) { push([pool[a]]); continue; }
      for (var b = a + 1; b < pool.length; b++) {
        if (pool[b].s <= -10) continue;
        if (pool[a].ch.c === pool[b].ch.c) continue;
        push([pool[a], pool[b]]);
      }
    }

    results.sort(function (x, y) { return y.score - x.score; });

    // 首字限流：避免高分首字霸榜，保证推荐多样性
    var firstCount = {};
    results = results.filter(function (r) {
      var k = r.chars[0].c;
      firstCount[k] = (firstCount[k] || 0) + 1;
      return firstCount[k] <= 3;
    });
    return {
      list: results.slice(0, 12),
      favor: favor,
      surnameKnown: surnameKnown
    };
  }

  /* ---------------- 公司名生成 ---------------- */

  function bizCharScore(ch, wx) {
    if (ch.w === wx) return 35;
    if (BA.WX_SHENG[ch.w] === wx) return 18; // 字五行生行业五行，如印生身
    if (BA.WX_KE[ch.w] === wx) return -5;
    if (BA.WX_SHENG[wx] === ch.w) return -3;
    if (BA.WX_KE[wx] === ch.w) return 5; // 克制行业过旺亦可为用，小加
    return 2;
  }

  /**
   * 公司起名
   * @param opts {wx(行业五行), count(字号字数 2/3)}
   * @returns {list, wx}
   */
  function genCompanyNames(opts) {
    var scored = BIZ_POOL.map(function (ch) { return { ch: ch, s: bizCharScore(ch, opts.wx) }; });
    var results = [];
    var tonePts = function (ps) {
      var pts = 0;
      for (var i = 1; i < ps.length; i++) { if (ps[i] !== ps[i - 1]) pts += 5; }
      if (new Set(ps).size === 1) pts -= 4;
      return pts;
    };

    function push(chars) {
      var pts = chars.reduce(function (acc, x) { return acc + x.s; }, 0);
      var zong = chars.reduce(function (acc, x) { return acc + x.ch.s; }, 0);
      var sv = shuVerdict(zong);
      pts += sv.v === "吉" ? 15 : sv.v === "半吉" ? 7 : -12;
      pts += tonePts(chars.map(function (x) { return toneOf(x.ch.p); }));
      results.push({ chars: chars.map(function (x) { return x.ch; }), score: pts, shuli: sv });
    }

    for (var a = 0; a < scored.length; a++) {
      if (scored[a].s < 0) continue;
      for (var b = 0; b < scored.length; b++) {
        if (b === a || scored[b].s < 0) continue;
        if (opts.count === 2) { push([scored[a], scored[b]]); continue; }
        for (var c = 0; c < scored.length; c++) {
          if (c === a || c === b || scored[c].s < 0) continue;
          push([scored[a], scored[b], scored[c]]);
        }
      }
    }
    // 去重（顺序不同视为同一名字，保留先出现者）
    var seen = {};
    results = results.filter(function (r) {
      var k = r.chars.map(function (x) { return x.c; }).join("");
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    results.sort(function (x, y) { return y.score - x.score; });

    // 首字限流：避免同一首字霸榜
    var fc = {};
    results = results.filter(function (r) {
      var k = r.chars[0].c;
      fc[k] = (fc[k] || 0) + 1;
      return fc[k] <= 2;
    });
    return { list: results.slice(0, 10), wx: opts.wx };
  }

  var api = {
    PERSON_POOL: PERSON_POOL,
    BIZ_POOL: BIZ_POOL,
    INDUSTRIES: INDUSTRIES,
    SURNAME_STROKES: SURNAME_STROKES,
    wuge: wuge,
    shuVerdict: shuVerdict,
    genPersonNames: genPersonNames,
    genCompanyNames: genCompanyNames,
    toneOf: toneOf
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BaziNaming = api;
})(typeof window !== "undefined" ? window : globalThis);
