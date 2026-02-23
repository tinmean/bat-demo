# Battery DPP (Battery Passport) Demo Site

Static front-end demo showing how a battery passport can be published on GitHub Pages with:

- a CSV index (`/data/products.csv`)
- per-battery JSON passport files (`/data/passports/*.json`)
- no backend and no database

The demo includes:

- a landing page (`/index.html`) with search and product list
- a public passport page (`/p/index.html`) that resolves a UID from the URL
- a deep-link fallback (`/404.html`) for GitHub Pages routes like `/p/01/.../21/...`
- a public/restricted access UI concept (no real authentication)

## Quick Start (Local)

`fetch()` for CSV/JSON usually fails when opening `index.html` directly from `file://`, so run a local static server:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/`
- `http://localhost:8000/p/?uid=01/09501234000017/21/EV75-240101-000042`

## GitHub Pages Deployment

1. Push this repository to GitHub.
2. In GitHub, open `Settings` → `Pages`.
3. Set source to `Deploy from a branch`.
4. Select your branch (for example `main`) and folder `/ (root)`.
5. Save and wait for deployment.

After publishing, the site works as static hosting only.

### Deep Links on GitHub Pages

GitHub Pages does not provide server-side route rewrites. This demo includes `404.html` to redirect deep links such as:

- `/p/01/09501234000017/21/EV75-240101-000042`

to the query fallback form:

- `/p/?uid=01/09501234000017/21/EV75-240101-000042`

This preserves a clean QR link pattern while remaining compatible with static hosting.

## Demo Data Model

### CSV Index (`/data/products.csv`)

Columns:

- `uid`
- `gtin`
- `serialNumber`
- `modelId`
- `category`
- `passportJsonUrl`
- `publicLandingUrl`
- `qrPayload`

The app uses `uid` as the lookup key to find `passportJsonUrl`, then loads the JSON and renders the passport.

### JSON Passports (`/data/passports/`)

Included samples:

- 2 model passports (`model-itb-ev75.json`, `model-itb-ess10.json`)
- 2 battery instance passports (`battery-*.json`)

Battery instance JSON references its `modelId` and `modelPassportUrl`, allowing the UI to combine model-level and instance-level data.

## EU Battery Passport Concept Mapping (Demo)

This is a **UI/architecture demo**, not a legal implementation. It maps to the battery passport concept as follows:

- **UID via QR**: each battery has a unique identifier (UID) encoded in a QR payload (GS1 Digital Link style URL path).
- **Public page reachability**: the QR points to a public page that resolves and displays the passport using the UID.
- **Machine-readable structured data**: passport content is stored in JSON (open, structured, searchable in the UI).
- **Decentralized/static publication**: data is served from static files on GitHub Pages (no central database required for the demo).
- **Access-rights concept**: the UI shows `Public` and `Restricted (concept)` tabs, but authentication/authorization is intentionally not implemented.

## Compliance-Inspired Notes (Demo Scope)

- The demo shows how a QR code can resolve to a battery-specific UID page.
- The JSON format is intended as a machine-readable, structured representation.
- Real-world restricted data access would require an identity and authorization layer aligned with applicable rules (including Annex XIII and implementing-act details).

## QR Code Generation Note

`/assets/qr.js` renders a QR preview using a public QR image endpoint to keep the demo small and static. For a fully self-contained/offline deployment, replace it with an embedded QR encoder implementation (for example a small MIT-licensed library copied into `assets/qr.js`).
