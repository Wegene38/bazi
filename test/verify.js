/* 命例核对脚本：node test/verify.js
 * 1. 对照 lunar-javascript 官方文档命例（1986-05-29 13:37 男）
 * 2. 全链路跑 analysis.js（计分/强弱/喜用/解读），捕获运行时错误
 */
"use strict";
const path = require("path");
const { Solar, Lunar, LunarMonth } = require(path.join(__dirname, "..", "lib", "lunar.js"));
const BA = require(path.join(__dirname, "..", "js", "analysis.js"));

let failed = 0;
function eq(what, actual, expected) {
  const ok = String(actual) === String(expected);
  if (!ok) { failed++; console.error("  ✗ " + what + "：期望 " + expected + "，实际 " + actual); }
  else console.log("  ✓ " + what + " = " + actual);
}

/* ---------- 命例一：官方文档 1986-05-29 13:37（男） ---------- */
console.log("命例一：1986-05-29 13:37 男");
const lunar1 = Solar.fromYmdHms(1986, 5, 29, 13, 37, 0).getLunar();
const ec1 = lunar1.getEightChar();
eq("四柱", [ec1.getYear(), ec1.getMonth(), ec1.getDay(), ec1.getTime()].join(" "), "丙寅 癸巳 癸酉 己未");
eq("纳音(年)", ec1.getYearNaYin(), "炉中火");
eq("胎元", ec1.getTaiYuan(), "甲申");
eq("命宫", ec1.getMingGong(), "癸巳");
eq("身宫", ec1.getShenGong(), "辛丑");
const yun1 = ec1.getYun(1);
eq("起运", yun1.getStartYear() + "年" + yun1.getStartMonth() + "月" + yun1.getStartDay() + "天", "2年7月0天");
eq("大运2干支", yun1.getDaYun()[2].getGanZhi(), "乙未");
eq("大运3流年[0]", yun1.getDaYun()[3].getLiuNian()[0].getYear() + ":" + yun1.getDaYun()[3].getLiuNian()[0].getGanZhi(), "2008:戊子");

/* 十神推算交叉验证（对照 lunar 内置结果） */
eq("十神(年干丙 vs 日干癸)", BA.shiShen("癸", "丙"), ec1.getYearShiShenGan());
eq("十神(月支巳本气丙 vs 癸)", BA.shiShen("癸", "丙"), "正财");
eq("十神(时干己 vs 癸)", BA.shiShen("癸", "己"), "七杀");
eq("十神(癸 vs 甲)", BA.shiShen("癸", "甲"), "伤官");
eq("十神(甲 vs 甲)", BA.shiShen("甲", "甲"), "比肩");
eq("十神(甲 vs 乙)", BA.shiShen("甲", "乙"), "劫财");
eq("十神(甲 vs 庚)", BA.shiShen("甲", "庚"), "七杀");
eq("十神(庚 vs 甲)", BA.shiShen("庚", "甲"), "偏财");
eq("十神(丙 vs 癸)", BA.shiShen("丙", "癸"), "正官");
eq("十神(戊 vs 庚)", BA.shiShen("戊", "庚"), "食神");

/* analysis 全链路 */
const s1 = BA.wuxingScore(ec1);
eq("五行总分", s1.total, 800);
console.log("  五行分布:", JSON.stringify(s1.score), "同类占比:", (s1.tongleiRatio * 100).toFixed(1) + "%");
const st1 = BA.strength(ec1, s1);
console.log("  强弱判定:", st1.label, "得令:", st1.deLing, "得地:", st1.deDi);
const fa1 = BA.favorable(ec1, s1, st1);
console.log("  喜用:", fa1.favor.join("、"), "忌:", fa1.avoid.join("、"));
const rd1 = BA.buildReading({ ec: ec1, gender: 1, score: s1, strength: st1, favor: fa1, currentDaYun: yun1.getDaYun()[4], nextDaYun: yun1.getDaYun()[5] });
["summary", "personality", "geju", "career", "wealth", "marriage", "dayun"].forEach((k) => {
  if (!rd1[k] || rd1[k].length < 10) { failed++; console.error("  ✗ 解读字段 " + k + " 过短"); }
  if (rd1[k] && /undefined|null|NaN/.test(rd1[k])) { failed++; console.error("  ✗ 解读字段 " + k + " 含 undefined/null/NaN：" + rd1[k].slice(0, 60)); }
});
console.log("  格局:", rd1.gejuName, "| 主导十神:", rd1.topShiShen);
console.log("  总评:", rd1.summary);

/* 职业推荐 */
const rec1 = BA.recommendCareers(ec1, s1, st1, fa1);
eq("职业领域数量", rec1.list.length, 14);
rec1.list.forEach((f) => {
  const blob = f.careers + f.desc + f.name + f.reasons.map((r) => r.t).join(",");
  if (/undefined|NaN/.test(blob)) { failed++; console.error("  ✗ 职业字段含 undefined/NaN: " + f.name); }
  if (f.reasons.length === 0) { failed++; console.error("  ✗ 职业无任何依据: " + f.name); }
});
const top1 = rec1.list[0];
const top1wx = BA.CAREER_FIELDS.find((f) => f.name === top1.name).wx;
console.log("  TOP3:", rec1.list.slice(0, 3).map((f) => f.name + "(" + f.score + ")").join(" / "));
if (top1wx.indexOf("金") < 0 && top1wx.indexOf("水") < 0) {
  failed++; console.error("  ✗ 喜金水命例 TOP1「" + top1.name + "」五行(" + top1wx.join("/") + ")与喜用不符");
} else {
  console.log("  ✓ TOP1「" + top1.name + "」五行 " + top1wx.join("/") + " 与喜用神（金水）相符");
}
console.log("  神煞:", JSON.stringify(rec1.shensha));

/* ---------- 命例二：2000-01-01 00:30（女，含晚子时） ---------- */
console.log("命例二：2000-01-01 00:30 女（早子时，跨年柱）");
const lunar2 = Lunar.fromDate(new Date(2000, 0, 1, 0, 30));
const ec2 = lunar2.getEightChar();
eq("四柱", [ec2.getYear(), ec2.getMonth(), ec2.getDay(), ec2.getTime()].join(" "), "己卯 丙子 戊午 壬子");
const s2 = BA.wuxingScore(ec2);
const st2 = BA.strength(ec2, s2);
const fa2 = BA.favorable(ec2, s2, st2);
const rd2 = BA.buildReading({ ec: ec2, gender: 0, score: s2, strength: st2, favor: fa2, currentDaYun: null, nextDaYun: null });
console.log("  强弱:", st2.label, "| 格局:", rd2.gejuName);
console.log("  婚姻:", rd2.marriage.slice(0, 60) + "…");
const rec2 = BA.recommendCareers(ec2, s2, st2, fa2);
console.log("  职业TOP2:", rec2.list.slice(0, 2).map((f) => f.name + "(" + f.score + ")").join(" / "));

/* ---------- 命例三：2020 闰四月初五 → 公历 2020-05-27 ---------- */
console.log("命例三：农历 2020 闰四月初五");
const solar3 = Lunar.fromYmd(2020, -4, 5).getSolar();
eq("农历转公历", solar3.toYmd(), "2020-05-27");
const lm = LunarMonth.fromYm(2020, -4);
eq("闰四月天数", lm ? lm.getDayCount() : "?", 29);
console.log("  闰月中文:", Lunar.fromYmd(2020, -4, 5).getMonthInChinese());

/* ---------- 真太阳时公式抽查 ---------- */
console.log("真太阳时：东经116.41（北京）2020-06-21 12:00");
const d = new Date(2020, 5, 21, 12, 0);
const n = Math.floor((d.getTime() - Date.UTC(2020, 0, 0)) / 86400000);
const b = 2 * Math.PI * (n - 81) / 365;
const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
console.log("  均时差 ≈ " + eot.toFixed(2) + " 分钟（天文值约 -1.6 分，允许 ±2 分误差）");
const offset = (116.41 - 120) * 4 + eot;
console.log("  总校正 ≈ " + offset.toFixed(1) + " 分钟");

/* ---------- 合盘 ---------- */
console.log("合盘：1986-05-29 13:37 男 × 1990-01-01 10:00 女");
const Syn = require(path.join(__dirname, "..", "js", "synastry.js"));
function mkPerson(ec, gender, name) {
  const sc = BA.wuxingScore(ec);
  const st = BA.strength(ec, sc);
  return { name, gender, ec, score: sc, st, fa: BA.favorable(ec, sc, st) };
}
const ecB = Lunar.fromDate(new Date(1990, 0, 1, 10, 0)).getEightChar();
const A1 = mkPerson(ec1, 1, "甲");
const B1 = mkPerson(ecB, 0, "乙");
const syn = Syn.computeSynastry(A1, B1);
if (syn.score < 5 || syn.score > 98) { failed++; console.error("  ✗ 合盘分数越界: " + syn.score); }
if (!syn.band || /undefined|NaN/.test(syn.summary)) { failed++; console.error("  ✗ 合盘文案异常"); }
eq("合盘分项数量", syn.items.length > 0, true);
console.log("  得分: " + syn.score + "（" + syn.band + "）分项 " + syn.items.length + " 条");
syn.items.forEach((it) => console.log("    " + (it.pos ? "+" : "-") + " " + it.label + " " + it.pts + "｜" + it.detail));
// 冲刑判定抽查
eq("子午判定为冲", Syn.relationOf("子", "午").key, "chong");
eq("寅亥判定为六合", Syn.relationOf("寅", "亥").key, "liuhe");
eq("丑戌判定为刑", Syn.relationOf("丑", "戌").key, "xing");
eq("巳申合优先于刑（合解刑）", Syn.relationOf("巳", "申").key, "liuhe");

/* ---------- 起名 ---------- */
console.log("起名：五格与生成");
const NM = require(path.join(__dirname, "..", "js", "naming.js"));
const wg = NM.wuge([{ c: "李", s: 7 }], [{ c: "梓", s: 11 }, { c: "涵", s: 12 }]);
eq("五格天格(李+1)", wg.tian.n, 8);
eq("五格人格(李+梓)", wg.ren.n, 18);
eq("五格地格(梓+涵)", wg.di.n, 23);
eq("五格外格(总-人+1)", wg.wai.n, 13);
eq("五格总格", wg.zong.n, 30);
eq("数理18吉", wg.ren.v, "吉");
eq("数理30半吉", wg.zong.v, "半吉");
const gen1 = NM.genPersonNames({ surnameText: "李", gender: 1, fa: fa1, single: false });
eq("人名候选数量", gen1.list.length, 12);
gen1.list.forEach((nm) => {
  const blob = nm.chars.map((c) => c.c + c.p + c.m).join("") + JSON.stringify(nm.wuge || {});
  if (/undefined|NaN/.test(blob)) { failed++; console.error("  ✗ 人名字段异常"); }
});
const nmTop1wx = gen1.list[0].chars.map((c) => c.w);
const inFavor = nmTop1wx.filter((w) => fa1.favor.indexOf(w) >= 0).length;
if (inFavor < 1) { failed++; console.error("  ✗ TOP1 名字未补喜用五行: " + nmTop1wx.join("/")); }
else console.log("  ✓ 人名TOP1「李" + gen1.list[0].chars.map((c) => c.c).join("") + "」五行 " + nmTop1wx.join("/") + "，喜用为 " + fa1.favor.join("/"));
const biz1 = NM.genCompanyNames({ wx: "火", count: 3 });
eq("公司名候选数量", biz1.list.length, 10);
biz1.list.forEach((nm) => {
  const blob = nm.chars.map((c) => c.c + c.p + c.m).join("");
  if (/undefined|NaN/.test(blob)) { failed++; console.error("  ✗ 公司名字段异常"); }
  if (!nm.shuli || !nm.shuli.v) { failed++; console.error("  ✗ 公司名缺数理"); }
});
console.log("  公司名TOP3(" + biz1.wx + "属行业): " + biz1.list.slice(0, 3).map((nm) => nm.chars.map((c) => c.c).join("") + "(总格" + nm.shuli.n + nm.shuli.v + ")").join(" / "));

/* ---------- 同盘人物 ---------- */
console.log("同盘人物：库与匹配");
const CB = require(path.join(__dirname, "..", "js", "celebs.js"));
eq("命例库收录人数", CB.DB.length, CB.PEOPLE.length);
// 每条记录四柱完整、无 undefined
CB.DB.forEach((p) => {
  const blob = p.name + p.bio + p.view + p.gz.join("");
  if (/undefined|NaN/.test(blob)) { failed++; console.error("  ✗ 人物记录异常: " + p.name); }
  if (!/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(p.gz[2])) { failed++; console.error("  ✗ 日柱格式异常: " + p.name + " " + p.gz[2]); }
});
// 自匹配：毛泽东生日查库，TOP1 必为本人且日柱相同
const me = Solar.fromYmdHms(1893, 12, 26, 12, 0, 0).getLunar().getEightChar();
const mm = CB.matchCelebs(me);
if (!mm.list.length || mm.list[0].name !== "毛泽东") { failed++; console.error("  ✗ 自匹配失败: " + (mm.list[0] || {}).name); }
else if (mm.list[0].tags.indexOf("日柱相同") < 0) { failed++; console.error("  ✗ 自匹配未标日柱相同"); }
else console.log("  ✓ 自匹配：毛泽东(" + mm.list[0].gz[2] + ") 日柱相同，得分 " + mm.list[0].score);
// 命例一匹配示例
const gm = CB.matchCelebs(ec1);
console.log("  1986-05-29 癸酉日 TOP3: " + gm.list.slice(0, 3).map((m) => m.name + "(" + m.tags.join("/") + "," + m.score + ")").join("、"));
gm.list.forEach((m) => {
  if (/undefined|NaN/.test(m.name + m.view + m.bio + m.tags.join(","))) { failed++; console.error("  ✗ 匹配结果字段异常: " + m.name); }
});
console.log("  统计: 同日主 " + gm.stats.sameGan + " 位 / 同生肖 " + gm.stats.sameZhi + " 位 / 共 " + gm.stats.total + " 位");

console.log(failed === 0 ? "\n全部核对通过 ✓" : "\n失败 " + failed + " 项 ✗");
process.exit(failed === 0 ? 0 : 1);
