# 2026 大阪自由行 ・ 互動行程視覺化

2026/6/6–6/10 日本大阪自由行（5 天 4 夜）的互動式網頁行程：行程總覽、逐日時間軸、地圖動線，以及大阪周遊卡免費景點附錄。

純靜態網站，**可離線瀏覽**（PWA + Service Worker），適合直接放到 GitHub Pages 等公開靜態空間。

## 特色

- **逐日時間軸**：點日期切換，卡片依「航班 / 交通 / 景點 / 餐食 / 住宿」分色，並標示**各點間交通方式與估算車資**。
- **地圖動線**：Leaflet 顯示當日景點與路線，可開啟 Google 地圖導航；底圖採 CARTO Voyager 並套上插畫/動畫風格濾鏡。
- **完全離線**：Leaflet 與**行程範圍的地圖圖磚（331 張，約 8.6 MB）皆內嵌於 repo**；Service Worker 會於背景預先快取全部圖磚，離線也能看地圖。
- **無後端、無密鑰**：全部靜態檔案，安全公開。

## 本機預覽

Service Worker 需在 http(s) 下執行（`file://` 直接開啟時地圖與行程仍可用，僅離線快取停用）：

```bash
python -m http.server 8765
# 開啟 http://localhost:8765
```

## 發佈到 GitHub Pages

```bash
git init
git add .
git commit -m "大阪自由行行程視覺化"
git branch -M main
git remote add origin <你的 repo URL>
git push -u origin main
```

接著到 GitHub repo 的 **Settings → Pages**，Source 選 `main` 分支根目錄即可。

## 檔案結構

```
index.html                  主頁（總覽 / 行程 / 地圖 / 周遊卡）
manifest.webmanifest        PWA 設定
sw.js                       Service Worker（離線快取、背景預載圖磚）
assets/
  css/style.css             樣式
  js/data.js                行程資料（在此維護行程內容、座標、交通）
  js/app.js                 渲染與地圖邏輯
  icon.svg                  App 圖示
  vendor/leaflet/           Leaflet 1.9.4（內嵌，離線可用）
  tiles/                    離線地圖圖磚（CARTO Voyager，z10–14）
  tiles-manifest.json       圖磚清單（供 SW 預先快取）
行程列表.md                 行程清單（文字版來源）
```

> 地圖底圖 © OpenStreetMap contributors ・ © CARTO。圖磚僅涵蓋本行程範圍（大阪市區—關西機場），其他區域離線時不顯示。

## 維護行程

所有行程內容集中在 [`assets/js/data.js`](assets/js/data.js)：修改 `days[].items` 即可新增/調整景點，`coord: [緯度, 經度]` 為地圖標記位置（概略即可）。

> 地圖座標為各景點概略位置，非精確門牌；底圖 © OpenStreetMap。
