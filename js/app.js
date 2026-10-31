/* ==========================================================
 * 八字排盘 · 前端逻辑
 * 依赖：lib/lunar.js（排盘引擎）、js/analysis.js（解读规则库）
 * ========================================================== */
(function () {
  "use strict";

  var BA = window.BaziAnalysis;
  var $ = function (sel) { return document.querySelector(sel); };

  var MONTH_CN = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  var DAY_CN = (function () {
    var ones = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    var names = [];
    for (var i = 1; i <= 30; i++) {
      if (i <= 10) names.push("初" + ones[i - 1]);
      else if (i < 20) names.push("十" + ones[i - 11]);
      else if (i === 20) names.push("二十");
      else if (i < 30) names.push("廿" + ones[i - 21]);
      else names.push("三十");
    }
    return names;
  })();
  var ZHI_CN = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  /* ---------------- 时辰与真太阳时 ---------------- */

  // 时辰索引：23-1 为子(0)，1-3 丑(1)……
  function shiChenIndex(hour) { return Math.floor(((hour + 1) % 24) / 2); }
  function shiChenRangeText(idx) {
    var start = (idx * 2 - 1 + 24) % 24;
    var end = (start + 2) % 24;
    return pad(start) + ":00–" + pad(end) + ":00";
  }
  function updateShiChenHint() {
    var v = $("#f-time").value || "12:00";
    var h = parseInt(v.split(":")[0], 10);
    var idx = shiChenIndex(h);
    $("#shichen-hint").textContent = ZHI_CN[idx] + "时 · " + shiChenRangeText(idx);
  }

  // 均时差（分钟，近似公式，误差约 1 分钟）；d 为 Date
  function equationOfTime(d) {
    var start = Date.UTC(d.getFullYear(), 0, 0);
    var n = Math.floor((d.getTime() - start) / 86400000); // 积日
    var b = 2 * Math.PI * (n - 81) / 365;
    return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  }

  /**
   * 真太阳时：北京时间 + 经度差 × 4 分钟 + 均时差
   * 返回校正后的 Date
   */
  function toTrueSolar(d, lon) {
    var offset = (lon - 120) * 4 + equationOfTime(d);
    return { date: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + Math.round(offset)), offset: offset };
  }

  /* ---------------- 表单交互 ---------------- */

  function initForm() {
    // 默认日期：今天
    var now = new Date();
    var today = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    ["#f-date", "#f-date-a", "#f-date-b", "#f-date-n"].forEach(function (sel) { $(sel).value = today; });

    initModeTabs();
    // 历法切换
    var radios = document.querySelectorAll('input[name="calendar"]');
    radios.forEach(function (r) {
      r.addEventListener("change", function () {
        var lunar = $("#cal-lunar").checked;
        $("#solar-input").classList.toggle("hidden", lunar);
        $("#lunar-input").classList.toggle("hidden", !lunar);
      });
    });

    // 真太阳时开关
    $("#f-true-solar").addEventListener("change", function () {
      $("#longitude-row").classList.toggle("hidden", !this.checked);
    });

    $("#f-time").addEventListener("input", updateShiChenHint);
    updateShiChenHint();

    initLunarSelects();
    $("#bazi-form").addEventListener("submit", onSubmit);
  }

  /* ---------------- 模式切换 ---------------- */

  var MODE = "single";
  var MODE_BTN_TEXT = { single: "开始排盘", synastry: "开始合盘", naming: "开始起名" };
  var RESULT_SELS = ["#result", "#synastry-result", "#naming-result"];

  function initModeTabs() {
    document.querySelectorAll(".mode-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        MODE = tab.dataset.mode;
        document.querySelectorAll(".mode-tab").forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        $("#panel-single").classList.toggle("hidden", MODE !== "single");
        $("#panel-synastry").classList.toggle("hidden", MODE !== "synastry");
        $("#panel-naming").classList.toggle("hidden", MODE !== "naming");
        $("#submit-btn").textContent = MODE_BTN_TEXT[MODE];
        RESULT_SELS.forEach(function (s) { $(s).classList.add("hidden"); });
        hideError();
      });
    });

    // 起名类型切换
    function toggleNaming() {
      var person = $("#nt-person").checked;
      $("#naming-person").classList.toggle("hidden", !person);
      $("#naming-company").classList.toggle("hidden", person);
    }
    $("#nt-person").addEventListener("change", toggleNaming);
    $("#nt-company").addEventListener("change", toggleNaming);

    // 行业下拉（五行归属）
    $("#f-industry").innerHTML = window.BaziNaming.INDUSTRIES.map(function (it) {
      return '<option value="' + it.wx + '">' + esc(it.name) + "（" + it.wx + "）</option>";
    }).join("");
  }

  /* ---------------- 农历三联下拉 ---------------- */

  function initLunarSelects() {
    var yearSel = $("#f-lunar-year"), monthSel = $("#f-lunar-month"), daySel = $("#f-lunar-day");

    var yHtml = "";
    for (var y = 2099; y >= 1901; y--) yHtml += '<option value="' + y + '">' + y + "年</option>";
    yearSel.innerHTML = yHtml;
    yearSel.value = "1990";

    function fillMonths() {
      var year = parseInt(yearSel.value, 10);
      var html = "";
      for (var m = 1; m <= 12; m++) {
        html += '<option value="' + m + '">' + MONTH_CN[m - 1] + "月</option>";
        if (window.LunarMonth.fromYm(year, -m)) html += '<option value="' + (-m) + '">闰' + MONTH_CN[m - 1] + "月</option>";
      }
      monthSel.innerHTML = html;
      fillDays();
    }

    function fillDays() {
      var year = parseInt(yearSel.value, 10);
      var month = parseInt(monthSel.value, 10);
      var lm = window.LunarMonth.fromYm(year, month);
      var count = lm ? lm.getDayCount() : 30;
      var html = "";
      for (var d = 1; d <= count; d++) html += '<option value="' + d + '">' + DAY_CN[d - 1] + "</option>";
      daySel.innerHTML = html;
    }

    yearSel.addEventListener("change", fillMonths);
    monthSel.addEventListener("change", fillDays);
    fillMonths();
  }

  /* ---------------- 提交与排盘 ---------------- */

  function onSubmit(e) {
    e.preventDefault();
    hideError();
    if (MODE === "synastry") { submitSynastry(); return; }
    if (MODE === "naming") { submitNaming(); return; }
    submitSingle();
  }

  function submitSingle() {
    var gender = parseInt(document.querySelector('input[name="gender"]:checked').value, 10);
    var timeStr = $("#f-time").value || "12:00";
    var hh = parseInt(timeStr.split(":")[0], 10);
    var mm = parseInt(timeStr.split(":")[1], 10);
    if (isNaN(hh)) return showError("请填写出生时间。");

    // 1) 求公历 Date
    var y, m, d, lunarBirth = null;
    if ($("#cal-solar").checked) {
      var dv = $("#f-date").value;
      if (!dv) return showError("请填写出生日期。");
      var parts = dv.split("-");
      y = parseInt(parts[0], 10); m = parseInt(parts[1], 10); d = parseInt(parts[2], 10);
    } else {
      y = parseInt($("#f-lunar-year").value, 10);
      m = parseInt($("#f-lunar-month").value, 10);
      d = parseInt($("#f-lunar-day").value, 10);
      var lunarTmp = window.Lunar.fromYmd(y, m, d);
      var solar = lunarTmp.getSolar();
      y = solar.getYear(); m = solar.getMonth(); d = solar.getDay();
    }

    var birth = new Date(y, m - 1, d, hh, mm);

    // 2) 真太阳时校正
    var trueSolarNote = null;
    if ($("#f-true-solar").checked) {
      var lon = parseFloat($("#f-longitude").value);
      if (isNaN(lon) || lon < 73 || lon > 136) return showError("请填写 73–136 范围内的出生地经度。");
      var res = toTrueSolar(birth, lon);
      birth = res.date;
      trueSolarNote = "已按东经 " + lon + "° 校正真太阳时（校正 " +
        (res.offset >= 0 ? "+" : "") + Math.round(res.offset) + " 分钟，校正后 " +
        pad(birth.getHours()) + ":" + pad(birth.getMinutes()) + "）";
    }

    // 3) 排盘与解读
    var lunar = window.Lunar.fromDate(birth);
    var ec = lunar.getEightChar();
    var score = BA.wuxingScore(ec);
    var st = BA.strength(ec, score);
    var fa = BA.favorable(ec, score, st);

    var yun = ec.getYun(gender);
    var daYunList = yun.getDaYun();
    var nowYear = new Date().getFullYear();
    var curIdx = -1;
    for (var i = 0; i < daYunList.length; i++) {
      if (nowYear >= daYunList[i].getStartYear() && nowYear <= daYunList[i].getEndYear()) { curIdx = i; break; }
    }

    var reading = BA.buildReading({
      ec: ec, gender: gender, score: score, strength: st, favor: fa,
      currentDaYun: curIdx >= 0 ? daYunList[curIdx] : null,
      nextDaYun: curIdx >= 0 && daYunList[curIdx + 1] ? daYunList[curIdx + 1] : null
    });

    renderAll({
      name: $("#f-name").value.trim(),
      gender: gender,
      lunar: lunar,
      ec: ec,
      score: score, st: st, fa: fa,
      yun: yun, daYunList: daYunList, curIdx: curIdx, nowYear: nowYear,
      reading: reading,
      trueSolarNote: trueSolarNote
    });
  }

  function showError(msg) { var el = $("#form-error"); el.textContent = msg; el.classList.remove("hidden"); }
  function hideError() { $("#form-error").classList.add("hidden"); }

  /* ---------------- 渲染 ---------------- */

  function gzSpan(ch) {
    var wx = BA.GAN_WX[ch] || BA.ZHI_WX[ch];
    return '<span class="gz wx-' + wx + '">' + ch + "</span>";
  }

  function renderAll(data) {
    renderBasic(data);
    renderChart(data.ec);
    renderWuxing(data);
    renderDaYun(data);
    renderCareer(data);
    renderReading(data.reading);
    $("#result").classList.remove("hidden");
    $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderBasic(data) {
    var lunar = data.lunar, ec = data.ec;
    var name = data.name || "命主";
    var genderTag = data.gender === 1 ? "乾造 · 男命" : "坤造 · 女命";
    var lunarStr = lunar.getYearInChinese() + "年" +
      lunar.getMonthInChinese() + "月" + lunar.getDayInChinese() + "日"; // 闰月时 getMonthInChinese 已含"闰"字
    var html =
      '<span><b>' + esc(name) + '</b></span>' +
      '<span class="gender-tag">' + genderTag + "</span>" +
      "<span>公历 <b>" + lunar.getSolar().toYmd() + " " + pad(lunar.getSolar().getHour()) + ":" + pad(lunar.getSolar().getMinute()) + "</b></span>" +
      "<span>农历 <b>" + lunarStr + "</b></span>" +
      "<span>生肖 <b>" + lunar.getYearShengXiao() + "</b></span>" +
      "<span>星座 <b>" + lunar.getSolar().getXingZuo() + "</b></span>";
    if (data.trueSolarNote) html += '<span class="true-solar-note">' + data.trueSolarNote + "</span>";
    $("#basic-info").innerHTML = html;
  }

  function renderChart(ec) {
    var dayGan = ec.getDayGan();
    var pillars = [
      { title: "年柱", gan: ec.getYearGan(), zhi: ec.getYearZhi(), ssGan: ec.getYearShiShenGan(), diShi: ec.getYearDiShi(), naYin: ec.getYearNaYin(), xunKong: ec.getYearXunKong() },
      { title: "月柱", gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), ssGan: ec.getMonthShiShenGan(), diShi: ec.getMonthDiShi(), naYin: ec.getMonthNaYin(), xunKong: ec.getMonthXunKong() },
      { title: "日柱", gan: ec.getDayGan(), zhi: ec.getDayZhi(), ssGan: null, diShi: ec.getDayDiShi(), naYin: ec.getDayNaYin(), xunKong: ec.getDayXunKong() },
      { title: "时柱", gan: ec.getTimeGan(), zhi: ec.getTimeZhi(), ssGan: ec.getTimeShiShenGan(), diShi: ec.getTimeDiShi(), naYin: ec.getTimeNaYin(), xunKong: ec.getTimeXunKong() }
    ];

    var rows = [];
    // 表头
    var head = "<tr><th></th>";
    pillars.forEach(function (p) { head += "<th>" + p.title + "</th>"; });
    rows.push(head + "</tr>");

    // 天干十神
    var r = '<tr><td class="label-td">十神</td>';
    pillars.forEach(function (p) {
      r += "<td>" + (p.ssGan ? esc(p.ssGan) : '<span class="day-master-tag">日主</span>') + "</td>";
    });
    rows.push(r + "</tr>");

    // 天干
    r = '<tr><td class="label-td">天干</td>';
    pillars.forEach(function (p) { r += "<td>" + gzSpan(p.gan) + "</td>"; });
    rows.push(r + "</tr>");

    // 地支
    r = '<tr><td class="label-td">地支</td>';
    pillars.forEach(function (p) { r += "<td>" + gzSpan(p.zhi) + "</td>"; });
    rows.push(r + "</tr>");

    // 地势（长生十二神）
    r = '<tr><td class="label-td">地势</td>';
    pillars.forEach(function (p) { r += "<td>" + esc(p.diShi) + "</td>"; });
    rows.push(r + "</tr>");

    // 藏干
    r = '<tr><td class="label-td">藏干</td>';
    pillars.forEach(function (p) {
      var hides = BA.hideGanOf(p.zhi);
      var inner = hides.map(function (h) {
        return '<span class="hg-item"><span class="wx-' + BA.GAN_WX[h] + '" style="font-weight:700">' + h + "</span><i>" + esc(BA.shiShen(dayGan, h)) + "</i></span>";
      }).join("");
      r += '<td><span class="hide-gan">' + inner + "</span></td>";
    });
    rows.push(r + "</tr>");

    // 纳音
    r = '<tr><td class="label-td">纳音</td>';
    pillars.forEach(function (p) { r += "<td>" + esc(p.naYin) + "</td>"; });
    rows.push(r + "</tr>");

    // 空亡
    r = '<tr><td class="label-td">空亡</td>';
    pillars.forEach(function (p) { r += "<td>" + esc(p.xunKong) + "</td>"; });
    rows.push(r + "</tr>");

    $("#chart-table").innerHTML = rows.join("");

    $("#extra-info").innerHTML =
      "<span>胎元 <b>" + ec.getTaiYuan() + "</b></span>" +
      "<span>命宫 <b>" + ec.getMingGong() + "</b></span>" +
      "<span>身宫 <b>" + ec.getShenGong() + "</b></span>" +
      "<span>命局 <b>" + ec.getYear() + " " + ec.getMonth() + " " + ec.getDay() + " " + ec.getTime() + "</b></span>";
  }

  function renderWuxing(data) {
    var score = data.score;
    var max = 1;
    BA.WX_LIST.forEach(function (w) { if (score.score[w] > max) max = score.score[w]; });

    var html = "";
    BA.WX_LIST.forEach(function (w) {
      var pct = (score.score[w] / score.total * 100);
      html +=
        '<div class="wx-bar-row">' +
        '<span class="wx-name ' + w + '">' + w + "</span>" +
        '<div class="wx-bar-track"><div class="wx-bar-fill ' + w + '" style="width:' + (score.score[w] / max * 100) + '%"></div></div>' +
        '<span class="wx-bar-pct">' + pct.toFixed(1) + "%</span>" +
        "</div>";
    });
    $("#wuxing-bars").innerHTML = html;

    var st = data.st, fa = data.fa;
    var missing = BA.WX_LIST.filter(function (w) { return score.score[w] === 0; });
    var v =
      '<div class="verdict-box">' +
      "<h3>日主分析</h3>" +
      "<p><b>日主</b> <b>" + data.ec.getDayGan() + "</b>（" + score.dayWX + "）　" +
      '<span class="tag">' + st.label + "</span>" +
      "得令：" + (st.deLing ? "✓" : "✗") + "　得地：" + (st.deDi ? "✓" : "✗") +
      "　同类（含印）占比 " + (st.ratio * 100).toFixed(1) + "%</p>" +
      "<p>" + esc(st.desc) + "</p>" +
      "<p><b>喜用</b>：" + fa.favor.join("、") + (fa.avoid.length ? "　<b>忌</b>：" + fa.avoid.join("、") : "") + "</p>" +
      "<p>" + esc(fa.text) + "</p>" +
      (missing.length ? '<p><b>五行缺</b>：' + missing.join("、") + "（可在名字、方位、行业等方面适当补益）</p>" : "") +
      '<p class="model-note">计分模型：天干每字 100 分，地支按藏干加权（本气 60 / 中气 30 / 余气 10），总分 800；强弱综合同类占比与得令、得地修正，为简化算法，仅供参考。</p>' +
      "</div>";
    $("#wuxing-verdict").innerHTML = v;
  }

  function renderDaYun(data) {
    var yun = data.yun, list = data.daYunList, curIdx = data.curIdx, nowYear = data.nowYear;
    var ec = data.ec;
    var dayGan = ec.getDayGan();

    var ss = yun.getStartSolar();
    var yearYang = BA.GAN.indexOf(ec.getYearGan()) % 2 === 0; // 年干为阳
    var forward = (data.gender === 1) === yearYang;            // 阳男阴女顺行，阴男阳女逆行
    $("#qiyun-info").innerHTML =
      "出生后 <b>" + yun.getStartYear() + " 年 " + yun.getStartMonth() + " 个月 " + yun.getStartDay() +
      "</b> 天起运 · 起运于 <b>" + ss.getYear() + " 年 " + ss.getMonth() + " 月 " + ss.getDay() + " 日</b> · " +
      "大运" + (forward ? "顺行" : "逆行");

    var html = "";
    list.forEach(function (dy, i) {
      var gz = dy.getGanZhi();
      var isPre = !gz; // 第 0 步：起运前
      var ssGan = gz ? BA.shiShen(dayGan, gz.charAt(0)) : "";
      var current = i === curIdx;

      html += '<div class="dayun-item' + (current ? " current" : "") + '" data-idx="' + i + '">';
      html += '<div class="dayun-head" role="button" tabindex="0">';
      html += '<span class="dayun-idx">' + (isPre ? "起运前" : "第 " + i + " 运") + "</span>";
      if (gz) {
        html += '<span class="dayun-gz">' + gzSpan(gz.charAt(0)) + gzSpan(gz.charAt(1)) + '<span class="ss">' + esc(ssGan) + "</span></span>";
      } else {
        html += '<span class="dayun-gz" style="font-size:16px;color:var(--ink-light)">童年小运</span>';
      }
      html += '<span class="dayun-range">' + dy.getStartYear() + "–" + dy.getEndYear() + " 年 · 虚岁 " + dy.getStartAge() + "–" + dy.getEndAge() + "</span>";
      if (current) html += '<span class="badge">当前大运</span>';
      html += '<span class="arrow"></span></div>';

      // 展开区：起运前显示小运，之后显示流年
      html += '<div class="liunian-wrap">';
      var chips = [];
      if (isPre) {
        dy.getXiaoYun().forEach(function (xy) {
          var s2 = BA.shiShen(dayGan, xy.getGanZhi().charAt(0));
          chips.push('<span class="liunian-chip">' + xy.getYear() + " " + xy.getGanZhi() + '<span class="ss">' + esc(s2) + "</span></span>");
        });
      } else {
        dy.getLiuNian().forEach(function (ln) {
          var s2 = BA.shiShen(dayGan, ln.getGanZhi().charAt(0));
          chips.push('<span class="liunian-chip' + (ln.getYear() === nowYear ? " current" : "") + '">' + ln.getYear() + " " + ln.getGanZhi() + '<span class="ss">' + esc(s2) + "</span></span>");
        });
      }
      html += chips.join("");
      html += "</div></div>";
    });
    $("#dayun-list").innerHTML = html;

    // 点击展开/收起
    document.querySelectorAll(".dayun-head").forEach(function (head) {
      function toggle() { head.parentElement.classList.toggle("open"); }
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
    // 默认展开当前大运
    if (curIdx >= 0) {
      var cur = document.querySelector('.dayun-item[data-idx="' + curIdx + '"]');
      if (cur) cur.classList.add("open");
    }
  }

  function renderCareer(data) {
    var rec = BA.recommendCareers(data.ec, data.score, data.st, data.fa);
    var list = rec.list.slice(0, 5);
    var max = list[0] ? Math.max(list[0].score, 1) : 1;

    var html = "";
    list.forEach(function (f, i) {
      var pct = Math.max(Math.round(f.score / max * 100), 5);
      html += '<div class="career-item' + (i === 0 ? " top" : "") + '">';
      html += '<div class="career-head">';
      html += '<span class="career-rank">' + (i + 1) + "</span>";
      html += '<span class="career-name">' + esc(f.name) + "</span>";
      html += '<div class="career-score-track"><div class="career-score-fill" style="width:' + pct + '%"></div></div>';
      html += "</div>";
      html += '<p class="career-jobs"><b>适任</b> ' + esc(f.careers) + " — " + esc(f.desc) + "</p>";
      html += '<div class="career-reasons">' +
        f.reasons.map(function (r) {
          return '<span class="reason-chip' + (r.neg ? " neg" : "") + '">' + esc(r.t) + "</span>";
        }).join("") + "</div>";
      html += "</div>";
    });

    // 相对费力方向：取分数最低的领域，温和提示
    var worst = rec.list[rec.list.length - 1];
    if (worst && worst.score < 50) {
      html += '<p class="career-avoid">相对费力的方向：' + esc(worst.name) + "（" +
        worst.reasons.filter(function (r) { return r.neg; }).map(function (r) { return esc(r.t); }).join("；") +
        "）。命理仅为倾向参考，兴趣与努力始终优先。</p>";
    }

    // 命带神煞小结
    var ss = rec.shensha, ssNote = [];
    if (ss.wenchang) ssNote.push("文昌主聪颖好学，利考试功名");
    if (ss.yima) ssNote.push("驿马主奔波变动，宜流动性事业");
    if (ss.huagai) ssNote.push("华盖主艺术孤高，宜专精之学");
    if (ssNote.length) html += '<p class="field-note">命带神煞：' + esc(ssNote.join("；")) + "。</p>";

    $("#career-list").innerHTML = html;
  }

  function renderReading(r) {
    var sections = [
      ["总评", r.summary],
      ["性格 · " + r.dayProfile.name, r.personality],
      ["格局 · " + r.gejuName, r.geju],
      ["事业方向", r.career],
      ["财运分析", r.wealth],
      ["婚姻感情", r.marriage],
      ["大运简评", r.dayun]
    ];
    var html = "";
    sections.forEach(function (s) {
      html += '<div class="reading-section"><h3>' + esc(s[0]) + "</h3><p>" + esc(s[1]) + "</p></div>";
    });
    $("#reading-body").innerHTML = html;
  }

  /* ---------------- 合盘 ---------------- */

  function buildPerson(selDate, selTime, genderName, fallbackName, nameVal) {
    var dv = $(selDate).value;
    var tv = $(selTime).value || "12:00";
    if (!dv) return null;
    var parts = dv.split("-");
    var gender = parseInt(document.querySelector('input[name="' + genderName + '"]:checked').value, 10);
    var birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10),
      parseInt(tv.split(":")[0], 10), parseInt(tv.split(":")[1], 10));
    var lunar = window.Lunar.fromDate(birth);
    var ec = lunar.getEightChar();
    var score = BA.wuxingScore(ec);
    var st = BA.strength(ec, score);
    var fa = BA.favorable(ec, score, st);
    return { name: (nameVal || "").trim() || fallbackName, gender: gender, birth: birth, lunar: lunar, ec: ec, score: score, st: st, fa: fa };
  }

  function pillarGanZhi(ec, i) {
    return [
      [ec.getYearGan(), ec.getYearZhi()], [ec.getMonthGan(), ec.getMonthZhi()],
      [ec.getDayGan(), ec.getDayZhi()], [ec.getTimeGan(), ec.getTimeZhi()]
    ][i];
  }

  function submitSynastry() {
    var A = buildPerson("#f-date-a", "#f-time-a", "genderA", "甲方", $("#f-name-a").value);
    var B = buildPerson("#f-date-b", "#f-time-b", "genderB", "乙方", $("#f-name-b").value);
    if (!A) return showError("请填写甲方的出生日期。");
    if (!B) return showError("请填写乙方的出生日期。");
    var syn = window.BaziSynastry.computeSynastry(A, B);
    renderSynastry(A, B, syn);
  }

  function renderSynastry(A, B, syn) {
    var html = '<div class="chart-scroll"><table class="chart-table"><tr><th></th><th>' + esc(A.name) + "</th><th>" + esc(B.name) + "</th></tr>";
    ["年柱", "月柱", "日柱", "时柱"].forEach(function (pn, i) {
      var gA = pillarGanZhi(A.ec, i), gB = pillarGanZhi(B.ec, i);
      var tag = i === 2 ? '<br><span class="day-master-tag">夫妻宫</span>' : "";
      html += '<tr><td class="label-td">' + pn + tag + "</td><td>" + gzSpan(gA[0]) + gzSpan(gA[1]) + "</td><td>" + gzSpan(gB[0]) + gzSpan(gB[1]) + "</td></tr>";
    });
    html += "</table></div>";
    html += '<div class="extra-info">' +
      "<span>" + esc(A.name) + " <b>" + (A.gender === 1 ? "男" : "女") + "</b> · 日主 <b>" + A.ec.getDayGan() + "</b>（" + A.score.dayWX + "）" + A.st.label + " · 喜用 <b>" + A.fa.favor.join("、") + "</b></span>" +
      "<span>" + esc(B.name) + " <b>" + (B.gender === 1 ? "男" : "女") + "</b> · 日主 <b>" + B.ec.getDayGan() + "</b>（" + B.score.dayWX + "）" + B.st.label + " · 喜用 <b>" + B.fa.favor.join("、") + "</b></span>" +
      "</div>";
    $("#syn-compare-body").innerHTML = html;

    var bandClass = syn.score >= 80 ? "excellent" : syn.score >= 65 ? "good" : syn.score >= 50 ? "fair" : "poor";
    var body = '<div class="syn-score ' + bandClass + '"><div class="syn-score-num">' + syn.score + '</div><div class="syn-score-band">' + esc(syn.band) + "</div></div>";
    body += '<div class="syn-items">' + syn.items.map(function (it) {
      return '<div class="syn-item' + (it.pos ? "" : " neg") + '"><span class="syn-item-label">' + esc(it.label) +
        (it.pts ? "<i>" + (it.pts > 0 ? "+" : "") + it.pts + "</i>" : "") +
        '</span><span class="syn-item-detail">' + esc(it.detail) + "</span></div>";
    }).join("") + "</div>";
    body += '<div class="verdict-box"><p>' + esc(syn.summary) + "</p></div>";
    $("#syn-score-body").innerHTML = body;

    $("#synastry-result").classList.remove("hidden");
    $("#synastry-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------- 起名 ---------------- */

  function wugeCls(v) { return v === "吉" ? "vg-good" : v === "半吉" ? "vg-mid" : "vg-bad"; }

  function submitNaming() {
    if ($("#nt-person").checked) {
      var surnameText = $("#f-surname").value.trim();
      if (!surnameText) return showError("请填写姓氏。");
      var p = buildPerson("#f-date-n", "#f-time-n", "genderN", "命主", "");
      if (!p) return showError("请填写宝宝的出生日期。");
      var res = window.BaziNaming.genPersonNames({
        surnameText: surnameText, gender: p.gender, fa: p.fa,
        single: $("#nl-single").checked
      });
      renderNamingPerson(surnameText, p, res);
    } else {
      var wx = $("#f-industry").value;
      var count = $("#bl-3").checked ? 3 : 2;
      var res2 = window.BaziNaming.genCompanyNames({ wx: wx, count: count });
      renderNamingCompany(wx, count, res2);
    }
  }

  function renderNamingPerson(surnameText, p, res) {
    $("#naming-card-title").textContent = "推荐名字 · " + surnameText + "姓" + (p.gender === 1 ? "男宝" : "女宝");
    $("#naming-basis").innerHTML = "日主 <b>" + p.ec.getDayGan() + "</b>（" + p.score.dayWX + "）· " + p.st.label +
      " · 名字优先补益喜用五行 <b>" + res.favor.join("、") + "</b>" +
      (res.surnameKnown ? "" : " · <span style=\"color:var(--cinnabar-deep)\">姓氏笔画未收录，未计五格数理</span>");

    var html = res.list.map(function (n, i) {
      var name = surnameText + n.chars.map(function (c) { return c.c; }).join("");
      var pinyin = n.chars.map(function (c) { return c.p; }).join(" ");
      var wxTags = n.chars.map(function (c) { return '<span class="wx-tag wx-' + c.w + '">' + c.w + "</span>"; }).join("");
      var meanings = n.chars.map(function (c) { return c.c + "：" + c.m; }).join("；");
      var wugeHtml = "";
      if (n.wuge) {
        wugeHtml = '<div class="name-wuge">' +
          '<span>人格 <b class="' + wugeCls(n.wuge.ren.v) + '">' + n.wuge.ren.n + " " + n.wuge.ren.v + "</b></span>" +
          '<span>地格 <b class="' + wugeCls(n.wuge.di.v) + '">' + n.wuge.di.n + " " + n.wuge.di.v + "</b></span>" +
          '<span>总格 <b class="' + wugeCls(n.wuge.zong.v) + '">' + n.wuge.zong.n + " " + n.wuge.zong.v + "</b></span>" +
          "</div>";
      }
      return '<div class="name-item"><div class="name-head"><span class="name-rank">' + (i + 1) +
        '</span><span class="name-text">' + esc(name) + '</span><span class="name-pinyin">' + esc(pinyin) + "</span>" + wxTags + "</div>" +
        wugeHtml + '<p class="name-meaning">' + esc(meanings) + "</p></div>";
    }).join("");
    $("#naming-list").innerHTML = html;

    $("#naming-result").classList.remove("hidden");
    $("#naming-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderNamingCompany(wx, count, res) {
    $("#naming-card-title").textContent = "推荐字号 · " + count + "字 · " + wx + "属行业";
    $("#naming-basis").innerHTML = "行业五行 <b>" + wx + "</b> · 字号用字优先取本气与相生之五行 · 总格按康熙笔画计 81 数理";

    var html = res.list.map(function (n, i) {
      var name = n.chars.map(function (c) { return c.c; }).join("");
      var pinyin = n.chars.map(function (c) { return c.p; }).join(" ");
      var wxTags = n.chars.map(function (c) { return '<span class="wx-tag wx-' + c.w + '">' + c.w + "</span>"; }).join("");
      var meanings = n.chars.map(function (c) { return c.c + "：" + c.m; }).join("；");
      return '<div class="name-item"><div class="name-head"><span class="name-rank">' + (i + 1) +
        '</span><span class="name-text">' + esc(name) + '</span><span class="name-pinyin">' + esc(pinyin) + "</span>" + wxTags + "</div>" +
        '<div class="name-wuge"><span>总格 <b class="' + wugeCls(n.shuli.v) + '">' + n.shuli.n + " " + n.shuli.v + "</b></span></div>" +
        '<p class="name-meaning">' + esc(meanings) + "</p></div>";
    }).join("");
    $("#naming-list").innerHTML = html;

    $("#naming-result").classList.remove("hidden");
    $("#naming-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------- 启动 ---------------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForm);
  } else {
    initForm();
  }
})();
