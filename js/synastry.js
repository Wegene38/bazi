/* ==========================================================
 * 双人合盘（合婚）评分与解读
 * 依据（现代命理通行口径）：
 *   权重高：日柱夫妻宫（日干五合、日支六合/三合/冲刑害）+ 喜用神互补
 *   权重中：日主五行生克、日柱纳音相生
 *   权重低：年支生肖六合/三合/冲害刑（仅作参考）
 * 依赖：BaziAnalysis（analysis.js）
 * ========================================================== */
(function (root) {
  "use strict";

  var BA = root.BaziAnalysis || (typeof require !== "undefined" ? require("./analysis.js") : null);

  // 天干五合：甲己合土、乙庚合金、丙辛合水、丁壬合木、戊癸合火
  var GAN_HE = {
    "甲己": "土", "己甲": "土",
    "乙庚": "金", "庚乙": "金",
    "丙辛": "水", "辛丙": "水",
    "丁壬": "木", "壬丁": "木",
    "戊癸": "火", "癸戊": "火"
  };

  // 地支六合
  var ZHI_LIUHE = { "子丑": 1, "丑子": 1, "寅亥": 1, "亥寅": 1, "卯戌": 1, "戌卯": 1, "辰酉": 1, "酉辰": 1, "巳申": 1, "申巳": 1, "午未": 1, "未午": 1 };
  // 地支三合局（需成局：二者与其余不可，仅双方各一爻时按半合小计）
  var ZHI_SANHE = {
    "申子": "水", "子申": "水", "子辰": "水", "辰子": "水", "申辰": "水", "辰申": "水",
    "寅午": "火", "午寅": "火", "午戌": "火", "戌午": "火", "寅戌": "火", "戌寅": "火",
    "巳酉": "金", "酉巳": "金", "酉丑": "金", "丑酉": "金", "巳丑": "金", "丑巳": "金",
    "亥卯": "木", "卯亥": "木", "卯未": "木", "未卯": "木", "亥未": "木", "未亥": "木"
  };
  // 地支六冲
  var ZHI_CHONG = { "子午": 1, "午子": 1, "丑未": 1, "未丑": 1, "寅申": 1, "申寅": 1, "卯酉": 1, "酉卯": 1, "辰戌": 1, "戌辰": 1, "巳亥": 1, "亥巳": 1 };
  // 地支相害
  var ZHI_HAI = { "子未": 1, "未子": 1, "丑午": 1, "午丑": 1, "寅巳": 1, "巳寅": 1, "卯辰": 1, "辰卯": 1, "申亥": 1, "亥申": 1, "酉戌": 1, "戌酉": 1 };
  // 地支相刑（双方互见；同支自刑）
  var ZHI_XING = { "寅巳": 1, "巳寅": 1, "巳申": 1, "申巳": 1, "申寅": 1, "寅申": 1, "丑戌": 1, "戌丑": 1, "戌未": 1, "未戌": 1, "丑未": 1, "未丑": 1, "子卯": 1, "卯子": 1 };
  var ZHI_ZIXING = { "辰": 1, "午": 1, "酉": 1, "亥": 1 };

  function relationOf(a, b) {
    var k = a + b;
    if (ZHI_LIUHE[k]) return { key: "liuhe", label: "六合", pts: 14, pos: true };
    if (ZHI_SANHE[k]) return { key: "sanhe", label: "三合(" + ZHI_SANHE[k] + ")", pts: 12, pos: true };
    if (ZHI_CHONG[k]) return { key: "chong", label: "相冲", pts: -10, pos: false };
    if (ZHI_HAI[k]) return { key: "hai", label: "相害", pts: -6, pos: false };
    if (ZHI_XING[k]) return { key: "xing", label: "相刑", pts: -8, pos: false };
    if (a === b && ZHI_ZIXING[a]) return { key: "zixing", label: "自刑", pts: -4, pos: false };
    if (a === b) return { key: "tong", label: "同支", pts: 3, pos: true };
    return null;
  }

  // 纳音五行 = 纳音名末字（炉中火→火）
  function nayinWX(n) { return n ? n.slice(-1) : ""; }

  /**
   * 双人合盘
   * @param A {name, gender, ec, score, st, fa}  甲方
   * @param B 同构                                乙方
   * @returns {score, band, items[], summary, nayinA, nayinB}
   */
  function computeSynastry(A, B) {
    var items = [];
    var add = function (label, detail, pts, pos) {
      items.push({ label: label, detail: detail, pts: pts, pos: pos });
      return pts;
    };
    var score = 50;

    // ---- 1. 日柱夫妻宫（权重最高）----
    var ganK = A.ec.getDayGan() + B.ec.getDayGan();
    if (GAN_HE[ganK]) {
      var hua = GAN_HE[ganK];
      var extra = (A.fa.favor.indexOf(hua) >= 0 || B.fa.favor.indexOf(hua) >= 0) ? 6 : 0;
      score += add("日干五合", "甲乙双方日主天干" + A.ec.getDayGan() + B.ec.getDayGan() + "相合（合化" + hua + "）" + (extra ? "，且化神为双方喜用" : ""), 18 + extra, true);
    } else {
      var ganRel = BA.shiShen(A.ec.getDayGan(), B.ec.getDayGan());
      var wxA = A.score.dayWX, wxB = B.score.dayWX;
      if (BA.WX_KE[wxA] === wxB) score += add("日主相克", "甲方日主" + wxA + "克乙方日主" + wxB + "，相处中甲方较为强势", -4, false);
      else if (BA.WX_KE[wxB] === wxA) score += add("日主相克", "乙方日主" + wxB + "克甲方日主" + wxA + "，相处中乙方较为强势", -4, false);
      else if (BA.WX_SHENG[wxA] === wxB) score += add("日主相生", "甲方日主生乙方日主（" + wxA + "生" + wxB + "），甲方多付出", 6, true);
      else if (BA.WX_SHENG[wxB] === wxA) score += add("日主相生", "乙方日主生甲方日主（" + wxB + "生" + wxA + "），乙方多付出", 6, true);
      else if (wxA === wxB) score += add("日主同气", "双方日主同属" + wxA + "，性情相近、易有共鸣", 5, true);
      var rel = relationOf(A.ec.getDayZhi(), B.ec.getDayZhi());
      if (rel) score += add("日支" + rel.label, "双方夫妻宫（日支" + A.ec.getDayZhi() + "与" + B.ec.getDayZhi() + "）" + rel.label, rel.pts, rel.pos);
    }

    // ---- 2. 喜用神互补（权重高）----
    var aHelped = A.fa.favor.indexOf(wxB) >= 0;
    var bHelped = B.fa.favor.indexOf(wxA) >= 0;
    if (aHelped && bHelped) {
      score += add("喜用互补", "乙方日主" + wxB + "为甲方喜用，甲方日主" + wxA + "亦为乙方喜用——互为贵人、彼此补益", 16, true);
    } else if (aHelped) {
      score += add("喜用得助", "乙方日主" + wxB + "恰为甲方喜用神，与乙方相处使甲方顺遂", 9, true);
    } else if (bHelped) {
      score += add("喜用得助", "甲方日主" + wxA + "恰为乙方喜用神，与甲方相处使乙方顺遂", 9, true);
    } else if (A.fa.avoid.indexOf(wxB) >= 0 && B.fa.avoid.indexOf(wxA) >= 0) {
      score += add("喜忌相悖", "双方日主五行互为对方忌神，相处易相互消耗，宜刻意调和", -8, false);
    }

    // ---- 3. 夫妻星到位（异性配对）----
    var isM = function (p) { return p.gender === 1; };
    var manP = null, womanP = null;
    if (isM(A) && !isM(B)) { manP = A; womanP = B; }
    else if (!isM(A) && isM(B)) { manP = B; womanP = A; }
    if (manP && womanP) {
      var wxM = manP.score.dayWX, wxW = womanP.score.dayWX;
      var caiM = BA.WX_KE[wxM]; // 男命以财为妻
      if (wxW === caiM) {
        // 男克女时财官同源：女方日主为男方财星，男方日主亦为女方官星
        score += add("夫妻星到位", manP.name + "日主" + wxM + "克" + womanP.name + "日主" + wxW +
          "——男命财星、女命官星到位，姻缘信息明显", 12, true);
      }
    }

    // ---- 4. 纳音相生（权重中）----
    var nA = nayinWX(A.ec.getDayNaYin()), nB = nayinWX(B.ec.getDayNaYin());
    if (nA && nB) {
      if (BA.WX_SHENG[nA] === nB) score += add("纳音相生", "双方日柱纳音（" + A.ec.getDayNaYin() + " / " + B.ec.getDayNaYin() + "）相生", 5, true);
      else if (nA === nB) score += add("纳音比和", "双方日柱纳音同气（" + A.ec.getDayNaYin() + "）", 4, true);
      else if (BA.WX_KE[nA] === nB) score += add("纳音相克", "双方日柱纳音相克（" + A.ec.getDayNaYin() + " / " + B.ec.getDayNaYin() + "）", -3, false);
    }

    // ---- 5. 年支生肖（权重低，仅参考）----
    var zrel = relationOf(A.ec.getYearZhi(), B.ec.getYearZhi());
    var ptsZ = zrel ? Math.round(zrel.pts * 0.5) : 0;
    if (zrel) {
      score += add("生肖" + zrel.label, "双方属相（" + A.ec.getYearZhi() + "与" + B.ec.getYearZhi() + "）" + zrel.label + "——传统参考项，权重较低", ptsZ, zrel.pos);
    }

    score = Math.max(5, Math.min(98, Math.round(score)));
    var band, bandDesc;
    if (score >= 80) { band = "天作之合"; bandDesc = "双方命局契合度很高，干支相合、喜用相辅，是传统意义上难得的良缘配置。"; }
    else if (score >= 65) { band = "佳偶天成"; bandDesc = "整体契合度良好，关键位置多有相合相生，相处顺遂中带小波澜。"; }
    else if (score >= 50) { band = "和顺相处"; bandDesc = "命局有合有冲，属普通婚缘配置——无大碍亦无大助，经营全凭用心。"; }
    else if (score >= 35) { band = "磨合成长"; bandDesc = "冲刑较多而相合不足，相处需更多包容与沟通，磨合之后感情更坚。"; }
    else { band = "用心经营"; bandDesc = "命局相冲相害明显，摩擦概率高——若感情深厚，请以理解与迁就化解分歧。"; }

    var posItems = items.filter(function (i) { return i.pos && i.pts > 0; }).map(function (i) { return i.label; });
    var negItems = items.filter(function (i) { return !i.pos; }).map(function (i) { return i.label; });
    var summary = bandDesc;
    if (posItems.length) summary += "亮点：" + posItems.join("、") + "。";
    if (negItems.length) summary += "需留意：" + negItems.join("、") + "。";

    return { score: score, band: band, items: items, summary: summary };
  }

  var api = { computeSynastry: computeSynastry, relationOf: relationOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BaziSynastry = api;
})(typeof window !== "undefined" ? window : globalThis);
