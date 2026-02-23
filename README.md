# 電池 DPP（Battery Passport）靜態示範站 / Battery DPP (Battery Passport) Static Demo

這是一個可直接部署到 **GitHub Pages** 的純前端示範網站，使用：

- CSV 索引（`/data/products.csv`）
- 每顆電池的 JSON 護照（`/data/passports/*.json`）
- 無後端、無資料庫

This is a fully static front-end demo that can be deployed to **GitHub Pages** using:

- a CSV index (`/data/products.csv`)
- per-battery JSON passport files (`/data/passports/*.json`)
- no backend and no database

## 你的部署網址 / Your Deployment URL

本專案已調整為 GitHub Pages 專案站路徑：

- `https://tinmean.github.io/bat-demo/`

The sample links and QR payloads have been updated for:

- `https://tinmean.github.io/bat-demo/`

## 功能 / Features

- 首頁搜尋電池護照（UID / GTIN / 序號 / 型號 / 類別）
- 單一靜態 `/p/` 頁面依 UID 顯示護照資料
- 支援深連結 `/p/01/.../21/...`
- 支援 query fallback `/p/?uid=...`
- 護照內容區塊：Identification / Technical / Sustainability / Circularity / Events
- 護照內搜尋（篩選可見欄位）
- JSON 下載按鈕
- 公開 / 受限（概念）分頁 UI（不實作真實驗證）

- Landing page search (UID / GTIN / serial / model / category)
- Single static `/p/` page that resolves UID and renders a passport
- Deep-link support `/p/01/.../21/...`
- Query fallback `/p/?uid=...`
- Passport sections: Identification / Technical / Sustainability / Circularity / Events
- In-passport search filter
- Download JSON button
- Public / Restricted (concept) tabs (no real authentication)

## 本機執行 / Run Locally

由於瀏覽器直接用 `file://` 開啟時，`fetch()` 常會因 CORS / local file policy 失敗，請使用本機靜態伺服器：

Because `fetch()` often fails when opening from `file://`, run a local static server:

```bash
python3 -m http.server 8000
```

開啟 / Open:

- `http://localhost:8000/`
- `http://localhost:8000/p/?uid=01/09501234000017/21/EV75-240101-000042`

## GitHub Pages 部署 / GitHub Pages Deployment

1. 將此專案推到 GitHub。
2. 到 GitHub 專案頁面 `Settings` → `Pages`。
3. 選擇 `Deploy from a branch`。
4. 選擇分支（例如 `main`）與資料夾 `/ (root)`。
5. 儲存後等待部署完成。

1. Push this repository to GitHub.
2. Open `Settings` → `Pages`.
3. Choose `Deploy from a branch`.
4. Select your branch (e.g. `main`) and folder `/ (root)`.
5. Save and wait for deployment.

## 深連結路由（GitHub Pages）/ Deep-Link Routing on GitHub Pages

GitHub Pages 不提供伺服器端 rewrite。本示範使用 `404.html` 將深連結（例如 `/p/01/.../21/...`）轉導到 query fallback（`/p/?uid=...`）。

GitHub Pages does not provide server-side rewrites. This demo uses `404.html` to redirect deep links (e.g. `/p/01/.../21/...`) to the query fallback (`/p/?uid=...`).

## 資料結構 / Data Model

### CSV 索引 (`/data/products.csv`)

欄位 / Columns:

- `uid`
- `gtin`
- `serialNumber`
- `modelId`
- `category`
- `passportJsonUrl`
- `publicLandingUrl`
- `qrPayload`

應用程式以 `uid` 為 key 查找 `passportJsonUrl`，再讀取 JSON 並渲染頁面。

The app uses `uid` as the lookup key to find `passportJsonUrl`, then loads the JSON and renders the passport.

### JSON 護照 (`/data/passports/`)

範例包含 / Included samples:

- 2 個型號護照（model passports）
- 2 個單顆電池護照（battery instance passports）

電池實例 JSON 會參照 `modelId` 與 `modelPassportUrl`，頁面會合併顯示型號層與實例層資料。

Battery instance JSON references `modelId` and `modelPassportUrl`, allowing the page to compose model-level and instance-level data.

## 與 EU 電池護照概念的對應（示範）/ EU Battery Passport Concept Mapping (Demo)

此專案是 **UI / 架構示範**，不是法規實作。對應方式如下：

This project is a **UI/architecture demo**, not a legal implementation. It maps as follows:

- **QR 對應 UID / UID via QR**：每顆電池有唯一識別碼（UID），並以 GS1 Digital Link 風格網址放入 QR payload。
- **公開頁面可達 / Public page reachability**：QR 連到公開頁面，頁面依 UID 載入並顯示護照。
- **機器可讀結構化資料 / Machine-readable structured data**：護照內容使用 JSON，且 UI 可搜尋。
- **去中心化靜態發布 / Decentralized static publication**：資料由 GitHub Pages 靜態檔案提供（示範無需資料庫）。
- **存取權限概念 / Access-rights concept**：顯示 `Public` 與 `Restricted (concept)` 分頁，但不實作身份驗證/授權。

## 合規啟發說明（示範範圍）/ Compliance-Inspired Notes (Demo Scope)

- 本示範展示 QR 如何導向每顆電池的 UID 頁面。
- JSON 作為機器可讀與結構化資料格式。
- 實務上受限資料需透過身份與授權系統，並依適用法規（包含 Annex XIII 與 implementing act 細節）進行治理。

- The demo shows how a QR code can resolve to a battery-specific UID page.
- JSON is used as a machine-readable, structured format.
- Real restricted data access would require identity and authorization controls aligned with applicable rules (including Annex XIII and implementing-act details).

## QR Code 產生說明 / QR Code Generation Note

`/assets/qr.js` 目前使用公開 QR 圖片服務產生預覽，以保持示範精簡。若你需要完全離線 / 自包含版本，可將其替換為內嵌 MIT 授權 QR encoder（放在 `assets/qr.js`）。

`/assets/qr.js` currently uses a public QR image endpoint for a lightweight static demo. Replace it with an embedded MIT-licensed QR encoder (in `assets/qr.js`) for fully self-contained/offline use.
