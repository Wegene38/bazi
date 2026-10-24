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

console.log(failed === 0 ? "\n全部核对通过 ✓" : "\n失败 " + failed + " 项 ✗");
process.exit(failed === 0 ? 0 : 1);
