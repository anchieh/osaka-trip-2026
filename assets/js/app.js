/* ===== 2026 大阪自由行 — 互動邏輯 ===== */
(function () {
  const T = window.TRIP;

  const TYPE = {
    flight:    { label: "航班", color: "var(--c-flight)", hex: "#6b5bd2", ico: "✈️" },
    transport: { label: "交通", color: "var(--c-transport)", hex: "#2a6f7a", ico: "🚆" },
    spot:      { label: "景點", color: "var(--c-spot)", hex: "#d6485f", ico: "📍" },
    food:      { label: "餐食", color: "var(--c-food)", hex: "#e0892b", ico: "🍜" },
    hotel:     { label: "住宿", color: "var(--c-hotel)", hex: "#4a8c5a", ico: "🏨" },
    luggage:   { label: "行李", color: "var(--gold)", hex: "#c79a3a", ico: "🧳" },
    tip:       { label: "攻略", color: "#7c5cd2", hex: "#7c5cd2", ico: "🎯" },
  };

  /* ---------- Hero / 總覽 ---------- */
  document.getElementById("hero-meta").innerHTML = [
    T.summary.dates, T.summary.nights, T.summary.meals,
  ].map(s => `<span class="chip">${s}</span>`).join("");

  document.getElementById("overview").innerHTML = `
    <div class="cards">
      <div class="card">
        <h3><span class="ico">✈️</span> 航班</h3>
        <ul><li>${T.summary.flights.out}</li><li>${T.summary.flights.back}</li></ul>
      </div>
      <div class="card">
        <h3><span class="ico">🏨</span> 住宿</h3>
        <ul>${T.summary.hotels.map(h => `<li>${h}</li>`).join("")}</ul>
      </div>
      <div class="card">
        <h3><span class="ico">📝</span> 行前提醒</h3>
        <ul>${T.summary.reminders.map(r => `<li>${r}</li>`).join("")}</ul>
      </div>
    </div>`;

  /* ---------- 日標籤 + 時間軸 ---------- */
  const daybar = document.getElementById("daybar");
  const daysWrap = document.getElementById("days");

  T.days.forEach((d, i) => {
    const btn = document.createElement("button");
    btn.innerHTML = `<b>Day ${d.n}</b><span>${d.date}（${d.weekday}）</span>`;
    btn.dataset.idx = i;
    btn.onclick = () => selectDay(i);
    daybar.appendChild(btn);

    const sec = document.createElement("div");
    sec.className = "day";
    sec.dataset.idx = i;
    const renderCard = (it) => {
      const t = TYPE[it.type] || TYPE.spot;
      const linkList = [];
      if (it.link) linkList.push({ url: it.link, text: "參考連結" });
      if (it.links) it.links.forEach(l => linkList.push({ url: l.url, text: l.text || "連結" }));
      const links = linkList.length
        ? `<div class="tl-links">${linkList.map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.text} ↗</a>`).join("")}</div>` : "";
      let transit = "";
      if (it.transit && it.transitDetail) {
        const dt = it.transitDetail;
        const routeHtml = (dt.route || []).map(s => `<li>${s}</li>`).join("");
        const notesHtml = (dt.notes || []).map(s => `<li>${s}</li>`).join("");
        transit = `<div class="tl-transit">
          <button class="tl-transit-btn" type="button" aria-expanded="false">
            <span>${it.transit}</span><span class="tl-transit-caret" aria-hidden="true">▾</span>
          </button>
          <div class="tl-transit-detail" hidden>
            <div class="ttd-head">
              <span class="ttd-head-title">🧭 交通詳情</span>
              <button class="tl-transit-close" type="button" aria-label="關閉詳情">✕ 關閉</button>
            </div>
            <div class="ttd-body">
              <div class="tl-transit-title">${it.transit}</div>
              ${routeHtml ? `<div class="ttd-sec"><h5>🚉 交通動線</h5><ol>${routeHtml}</ol></div>` : ""}
              ${notesHtml ? `<div class="ttd-sec"><h5>⚠️ 注意事項</h5><ul>${notesHtml}</ul></div>` : ""}
            </div>
          </div>
        </div>`;
      } else if (it.transit) {
        transit = `<div class="tl-transit"><span>${it.transit}</span></div>`;
      }
      const meta = [
        it.time ? `<b class="tl-time">${it.time}</b>` : "",
        it.desc || "",
      ].filter(Boolean).join(" ");
      return `${transit}<div class="tl-item${it.optional ? " tl-item--opt" : ""}" style="--dot:${t.hex}">
        <div class="tl-card${it.optional ? " tl-card--opt" : ""}" style="--dot:${t.hex}">
          <div class="tl-name">${t.ico} ${it.name}
            <span class="tl-badge" style="--dot:${t.hex}">${t.label}</span>
            ${it.optional ? '<span class="tl-optbadge">備案・可去可不去</span>' : ""}</div>
          ${meta ? `<p class="tl-meta">${meta}</p>` : ""}
          ${links}
        </div></div>`;
    };

    const renderUsjCard = (it) => {
      const z = (T.usjZones && T.usjZones[it.zone]) || { label: it.zone, hex: "#999" };
      return `<div class="usj-card" data-zone="${it.zone}" data-dur="${it.dur}" data-name="${it.name}" style="--zhex:${z.hex}">
        <div class="usj-walk" hidden></div>
        <div class="usj-card__row">
          <span class="usj-handle" aria-label="拖曳排序" title="拖曳排序">⠿</span>
          <span class="usj-zone">${z.label}</span>
          <div class="usj-body">
            <div class="usj-name">${it.name}</div>
            <div class="usj-meta"><b class="usj-time">—</b> ・ 約 ${it.dur} 分　<span class="usj-toggle">詳情 ▾</span></div>
            <div class="usj-detail" hidden>${it.desc || ""}</div>
          </div>
        </div>
      </div>`;
    };

    // 組裝時間軸；usj 日把連續「有 zone/dur」的設施包成可拖曳排程器
    let tl = "";
    const items = d.items;
    let k = 0;
    while (k < items.length) {
      const it = items[k];
      if (d.usj && it.zone && it.dur) {
        const run = [];
        while (k < items.length && items[k].zone && items[k].dur) { run.push(items[k]); k++; }
        tl += `<div class="usj-planner">
          <div class="usj-ctrl">
            <label class="usj-startlbl">🎢 開園 <input type="time" id="usj-start" value="${d.start || "08:30"}"></label>
            <span class="usj-endlbl">預估結束 <b id="usj-endtime">—</b></span>
            <button type="button" id="usj-reset" class="usj-reset">↺ 重設順序</button>
          </div>
          <p class="usj-hint">拖曳 <b>⠿</b> 調整單項順序，時間依「各設施耗時＋區間步行」自動重算（順序已存於本機）。</p>
          <div class="usj-list" id="usj-list">${run.map(renderUsjCard).join("")}</div>
        </div>`;
      } else {
        tl += renderCard(it);
        k++;
      }
    }

    sec.innerHTML = `
      <div class="day__head">
        <h3>Day ${d.n}・${d.date}（${d.weekday}）${d.title}</h3>
        ${d.start && d.end ? `<div class="day__time">⏱ 起 ${d.start} ・ 訖 ${d.end}</div>` : ""}
        <p>${d.theme}</p>
      </div>
      <div class="timeline">${tl}</div>`;
    daysWrap.appendChild(sec);
  });

  initUSJ();

  // 交通提示：點擊展開詳細動線/注意事項，✕ 關閉
  daysWrap.addEventListener("click", (e) => {
    const closeBtn = e.target.closest(".tl-transit-close");
    if (closeBtn) {
      const detail = closeBtn.closest(".tl-transit-detail");
      detail.setAttribute("hidden", "");
      const b = detail.parentElement.querySelector(".tl-transit-btn");
      if (b) { b.setAttribute("aria-expanded", "false"); b.classList.remove("open"); }
      return;
    }
    const btn = e.target.closest(".tl-transit-btn");
    if (btn) {
      const detail = btn.parentElement.querySelector(".tl-transit-detail");
      const willOpen = detail.hasAttribute("hidden");
      if (willOpen) { detail.removeAttribute("hidden"); btn.setAttribute("aria-expanded", "true"); btn.classList.add("open"); }
      else { detail.setAttribute("hidden", ""); btn.setAttribute("aria-expanded", "false"); btn.classList.remove("open"); }
      return;
    }
    // USJ 設施卡：點「詳情」展開/收合
    const tog = e.target.closest(".usj-toggle, .usj-body");
    if (tog) {
      const body = tog.closest(".usj-body");
      const det = body && body.querySelector(".usj-detail");
      if (det) {
        const open = det.hasAttribute("hidden");
        det.toggleAttribute("hidden", !open);
        const tg = body.querySelector(".usj-toggle");
        if (tg) tg.textContent = open ? "收合 ▴" : "詳情 ▾";
      }
    }
  });

  /* ---------- Day 4 USJ 拖曳排程器 ---------- */
  function initUSJ() {
    const list = document.getElementById("usj-list");
    if (!list || typeof Sortable === "undefined") return;
    const startEl = document.getElementById("usj-start");
    const endEl = document.getElementById("usj-endtime");
    const resetEl = document.getElementById("usj-reset");
    const usjDay = T.days.find(d => d.usj) || {};
    const originalNames = (usjDay.items || []).filter(it => it.zone && it.dur).map(it => it.name);
    const LS = "usjOrder-v1";
    const walkMin = (a, b) => a === b ? 0 : (T.usjWalk[a + "-" + b] ?? T.usjWalk[b + "-" + a] ?? 8);
    const fmt = (min) => { min = Math.round(min / 5) * 5; const h = Math.floor(min / 60), m = min % 60; return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };
    const applyOrder = (names) => names.forEach(n => { const c = [...list.children].find(x => x.dataset.name === n); if (c) list.appendChild(c); });

    function recompute() {
      const parts = (startEl.value || "08:30").split(":").map(Number);
      let cur = parts[0] * 60 + parts[1];
      let prevZone = null;
      [...list.querySelectorAll(".usj-card")].forEach((card, idx) => {
        const zone = card.dataset.zone, dur = +card.dataset.dur;
        const walkEl = card.querySelector(".usj-walk");
        if (idx === 0) { walkEl.hidden = true; }
        else { const w = walkMin(prevZone, zone); walkEl.hidden = false; walkEl.textContent = "🚶 步行 " + w + " 分"; cur += w; }
        card.querySelector(".usj-time").textContent = fmt(cur) + "~" + fmt(cur + dur);
        cur += dur; prevZone = zone;
      });
      if (endEl) endEl.textContent = fmt(cur);
      try { localStorage.setItem(LS, JSON.stringify([...list.querySelectorAll(".usj-card")].map(c => c.dataset.name))); } catch (err) {}
    }

    try { const saved = JSON.parse(localStorage.getItem(LS) || "null"); if (Array.isArray(saved)) applyOrder(saved); } catch (err) {}
    new Sortable(list, { handle: ".usj-handle", animation: 150, ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", onEnd: recompute });
    startEl.addEventListener("input", recompute);
    resetEl.addEventListener("click", () => {
      try { localStorage.removeItem(LS); } catch (err) {}
      applyOrder(originalNames);
      startEl.value = usjDay.start || "08:30";
      recompute();
    });
    recompute();
  }

  const prevBtn = document.getElementById("prev-day");
  const nextBtn = document.getElementById("next-day");
  const pagerNow = document.getElementById("pager-now");
  const lastDay = T.days.length - 1;
  let currentDay = 0;
  let mapInited = false;

  function selectDay(i) {
    i = Math.max(0, Math.min(lastDay, i));
    currentDay = i;
    [...daybar.children].forEach((b, j) => b.classList.toggle("active", j === i));
    [...daysWrap.children].forEach((s, j) => s.classList.toggle("active", j === i));
    // 換頁器狀態
    pagerNow.textContent = `Day ${T.days[i].n} / ${T.days.length}・${T.days[i].date}`;
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === lastDay;
    // 將所選日期捲到日期列中央（手機橫向捲動）
    const ab = daybar.children[i];
    if (ab) daybar.scrollTo({ left: ab.offsetLeft - daybar.clientWidth / 2 + ab.clientWidth / 2, behavior: "smooth" });
    if (mapInited) focusDay(i);
  }

  prevBtn.onclick = () => selectDay(currentDay - 1);
  nextBtn.onclick = () => selectDay(currentDay + 1);

  /* ---------- 地圖 ---------- */
  const legend = Object.values(TYPE)
    .map(t => `<span><i style="background:${t.hex}"></i>${t.ico} ${t.label}</span>`).join("");
  const lineLegend =
    `<span><i style="background:#1e88e5;width:20px;height:4px;border-radius:2px"></i>步行（沿街真實路徑）</span>` +
    `<span><i style="width:20px;height:0;border-radius:0;border-top:3px dashed #d6485f"></i>電車／其他（示意）</span>`;
  document.getElementById("map-legend").innerHTML = legend + lineLegend;

  const map = L.map("map", { scrollWheelZoom: false, minZoom: 10, maxZoom: 16 })
    .setView([34.67, 135.50], 11);
  // 限制可平移範圍在已快取的圖磚區域內
  map.setMaxBounds([[34.30, 135.08], [34.92, 135.78]]);

  // 本地圖磚（離線可用）；缺圖時自動回退線上 OSM（連網時）
  const tiles = L.tileLayer("./assets/tiles/{z}/{x}/{y}.png", {
    minZoom: 10, maxZoom: 16, maxNativeZoom: 14,
    bounds: [[34.39, 135.21], [34.83, 135.63]],
    attribution: "© OpenStreetMap contributors ・ © CARTO ・ 離線圖磚",
    className: "trip-tiles",
  }).addTo(map);
  tiles.on("tileerror", (e) => {
    const t = e.tile, c = e.coords;
    if (t && !t.dataset.fellback) {
      t.dataset.fellback = "1";
      t.src = `https://${"abcd"[(c.x + c.y) % 4]}.basemaps.cartocdn.com/rastertiles/voyager/${c.z}/${c.x}/${c.y}.png`;
    }
  });

  const dayGroups = [];
  const WALK = window.WALK_ROUTES || {};
  const segKey = (a, b) => `${a[0].toFixed(4)},${a[1].toFixed(4)}->${b[0].toFixed(4)},${b[1].toFixed(4)}`;

  T.days.forEach((d, i) => {
    const group = L.layerGroup().addTo(map);
    const latlngs = [];
    let prev = null;
    d.items.forEach(it => {
      if (!it.coord) return;
      const t = TYPE[it.type] || TYPE.spot;
      // 先畫「從上一個點到此點」的連線
      if (prev) {
        const isWalk = !!it.transit && it.transit.startsWith("🚶");
        const geo = isWalk ? WALK[segKey(prev, it.coord)] : null;
        if (geo) {
          // 步行：沿街真實路徑（藍色實線）
          L.polyline(geo, { color: "#1e88e5", weight: 4, opacity: .85, lineCap: "round" }).addTo(group);
        } else {
          // 電車/其他：簡潔虛線
          L.polyline([prev, it.coord], { color: "#d6485f", weight: 2, opacity: .5, dashArray: "6 6" }).addTo(group);
        }
      }
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${t.hex};width:26px;height:26px;border-radius:50% 50% 50% 0;
               transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3);
               display:flex;align-items:center;justify-content:center;">
               <span style="transform:rotate(45deg);font-size:13px">${t.ico}</span></div>`,
        iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
      });
      const m = L.marker(it.coord, { icon }).bindPopup(
        `<div class="popup-time">Day ${d.n} ・ ${it.time || ""}</div>
         <div class="popup-name">${t.ico} ${it.name}</div>
         <div style="font-size:.8rem;color:#666">${it.place || ""}</div>
         <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place || it.name)}"
            target="_blank" rel="noopener" style="font-size:.8rem">Google 地圖 ↗</a>`
      );
      m.addTo(group);
      latlngs.push(it.coord);
      prev = it.coord;
    });
    dayGroups.push({ group, latlngs, center: d.center });
  });

  function focusDay(i) {
    dayGroups.forEach((g, j) => {
      if (j === i) map.addLayer(g.group); else map.removeLayer(g.group);
    });
    const g = dayGroups[i];
    if (g.latlngs.length > 1) map.fitBounds(L.latLngBounds(g.latlngs).pad(0.3));
    else if (g.latlngs.length === 1) map.setView(g.latlngs[0], 14);
    else map.setView(g.center, 12);
  }
  mapInited = true;

  /* ---------- 目前位置（GPS）---------- */
  const locStatus = document.getElementById("loc-status");
  let locWatch = null, locMarker = null, locCircle = null;
  const setLocStatus = (msg) => { if (locStatus) { locStatus.textContent = msg || ""; locStatus.hidden = !msg; } };

  const LocateControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const btn = L.DomUtil.create("button", "leaflet-bar locate-btn");
      btn.type = "button";
      btn.title = "顯示我的位置";
      btn.setAttribute("aria-label", "顯示我的位置");
      btn.textContent = "📍";
      L.DomEvent.on(btn, "click", (e) => { L.DomEvent.stop(e); toggleLocate(btn); });
      this._btn = btn;
      return btn;
    },
  });
  const locateCtl = new LocateControl();
  map.addControl(locateCtl);

  function toggleLocate(btn) {
    if (locWatch !== null) { stopLocate(btn); setLocStatus(""); return; }
    if (!("geolocation" in navigator)) { setLocStatus("此裝置/瀏覽器不支援定位。"); return; }
    btn.classList.add("locating");
    setLocStatus("定位中…請允許瀏覽器的定位權限。");
    locWatch = navigator.geolocation.watchPosition(
      (pos) => {
        btn.classList.remove("locating");
        btn.classList.add("active");
        setLocStatus("");
        const { latitude, longitude, accuracy } = pos.coords;
        const ll = [latitude, longitude];
        const first = !locMarker;
        if (first) {
          const icon = L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
          locMarker = L.marker(ll, { icon, zIndexOffset: 1000 }).addTo(map).bindPopup("📍 我的目前位置");
          locCircle = L.circle(ll, { radius: accuracy, color: "#1e88e5", weight: 1, fillColor: "#1e88e5", fillOpacity: .12 }).addTo(map);
        } else {
          locMarker.setLatLng(ll);
          locCircle.setLatLng(ll).setRadius(accuracy);
        }
        if (first) {
          const inOsaka = latitude > 34.30 && latitude < 34.92 && longitude > 135.08 && longitude < 135.78;
          if (inOsaka) map.setView(ll, 16);
          else setLocStatus("目前位置不在大阪行程範圍，地圖底圖可能無法顯示（離線圖磚僅含大阪）。");
        }
      },
      (err) => {
        stopLocate(btn);
        setLocStatus(err.code === 1 ? "已拒絕定位權限，請至瀏覽器設定允許定位後再試。" : "無法取得目前位置，請確認已開啟定位。");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }
  function stopLocate(btn) {
    if (locWatch !== null) { navigator.geolocation.clearWatch(locWatch); locWatch = null; }
    if (locMarker) { map.removeLayer(locMarker); locMarker = null; }
    if (locCircle) { map.removeLayer(locCircle); locCircle = null; }
    if (btn) btn.classList.remove("active", "locating");
  }

  /* ---------- 周遊卡附錄 ---------- */
  const ap = T.amazingPass;
  document.getElementById("pass-note").textContent = ap.note;
  document.getElementById("pass-grid").innerHTML = ap.regions.map(r => `
    <div class="pass-region">
      <h4>${r.name}</h4>
      <table>${r.spots.map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td></tr>`).join("")}</table>
    </div>`).join("");

  /* ---------- 啟動 ---------- */
  selectDay(0);

  /* ---------- 導覽高亮 ---------- */
  const navLinks = [...document.querySelectorAll(".nav__links a")];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute("href")));
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = "#" + e.target.id;
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id));
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(s => s && obs.observe(s));

  /* ---------- Service Worker (本地快取/離線) ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
