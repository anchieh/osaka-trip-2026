/* ===== 2026 大阪自由行 — 互動邏輯 ===== */
(function () {
  const T = window.TRIP;

  const TYPE = {
    flight:    { label: "航班", color: "var(--c-flight)", hex: "#6b5bd2", ico: "✈️" },
    transport: { label: "交通", color: "var(--c-transport)", hex: "#2a6f7a", ico: "🚆" },
    spot:      { label: "景點", color: "var(--c-spot)", hex: "#d6485f", ico: "📍" },
    food:      { label: "餐食", color: "var(--c-food)", hex: "#e0892b", ico: "🍜" },
    hotel:     { label: "住宿", color: "var(--c-hotel)", hex: "#4a8c5a", ico: "🏨" },
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
    sec.innerHTML = `
      <div class="day__head">
        <h3>Day ${d.n}・${d.date}（${d.weekday}）${d.title}</h3>
        <p>${d.theme}</p>
      </div>
      <div class="timeline">
        ${d.items.map(it => {
          const t = TYPE[it.type] || TYPE.spot;
          const links = it.link
            ? `<div class="tl-links"><a href="${it.link}" target="_blank" rel="noopener">參考連結 ↗</a></div>` : "";
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
                <button class="tl-transit-close" type="button" aria-label="關閉">✕</button>
                <div class="tl-transit-title">${it.transit}</div>
                ${routeHtml ? `<div class="ttd-sec"><h5>🚉 交通動線</h5><ol>${routeHtml}</ol></div>` : ""}
                ${notesHtml ? `<div class="ttd-sec"><h5>⚠️ 注意事項</h5><ul>${notesHtml}</ul></div>` : ""}
              </div>
            </div>`;
          } else if (it.transit) {
            transit = `<div class="tl-transit"><span>${it.transit}</span></div>`;
          }
          const meta = [
            it.time ? `<b class="tl-time">${it.time}</b>` : "",
            it.desc || "",
          ].filter(Boolean).join(" ");
          return `${transit}<div class="tl-item" style="--dot:${t.hex}">
            <div class="tl-card" style="--dot:${t.hex}">
              <div class="tl-name">${t.ico} ${it.name}
                <span class="tl-badge" style="--dot:${t.hex}">${t.label}</span></div>
              ${meta ? `<p class="tl-meta">${meta}</p>` : ""}
              ${links}
            </div></div>`;
        }).join("")}
      </div>`;
    daysWrap.appendChild(sec);
  });

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
    }
  });

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
  document.getElementById("map-legend").innerHTML = legend;

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
  T.days.forEach((d, i) => {
    const group = L.layerGroup().addTo(map);
    const latlngs = [];
    d.items.forEach(it => {
      if (!it.coord) return;
      const t = TYPE[it.type] || TYPE.spot;
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
    });
    // 當日連線
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: "#d6485f", weight: 2, opacity: .5, dashArray: "6 6" }).addTo(group);
    }
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
