(function () {
  "use strict";

  var PRODUCTS_CSV_PATH = "./data/products.csv";
  var PASSPORT_SECTIONS = [
    { key: "identification", label: "識別資訊 / Identification" },
    { key: "technical", label: "技術資料 / Technical" },
    { key: "sustainability", label: "永續性 / Sustainability" },
    { key: "circularity", label: "循環性 / Circularity" },
    { key: "events", label: "事件紀錄 / Events" }
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body && document.body.dataset && document.body.dataset.page;
    if (page === "home") {
      initHome();
      return;
    }
    if (page === "passport") {
      initPassportPage();
    }
  });

  async function initHome() {
    var searchInput = document.getElementById("product-search");
    var listEl = document.getElementById("product-list");
    var statusEl = document.getElementById("home-status");
    try {
      var records = await loadProductsIndex();
      records.sort(function (a, b) {
        return String(a.uid).localeCompare(String(b.uid));
      });

      function render(query) {
        var q = (query || "").trim().toLowerCase();
        var filtered = records.filter(function (row) {
          if (!q) return true;
          return [
            row.uid,
            row.gtin,
            row.serialNumber,
            row.modelId,
            row.category
          ].join(" ").toLowerCase().indexOf(q) !== -1;
        });
        renderProductList(listEl, filtered);
        statusEl.textContent = "共 " + filtered.length + " 筆結果 / " + filtered.length + " result" + (filtered.length === 1 ? "" : "s");
      }

      searchInput.addEventListener("input", function () {
        render(searchInput.value);
      });

      render("");
    } catch (error) {
      statusEl.textContent = "";
      listEl.innerHTML = "";
      var msg = document.createElement("div");
      msg.className = "error";
      msg.textContent = "無法載入產品索引 / Unable to load product index: " + error.message;
      listEl.appendChild(msg);
    }
  }

  async function initPassportPage() {
    var loadingEl = document.getElementById("passport-loading");
    var shellEl = document.getElementById("passport-shell");
    var errorEl = document.getElementById("passport-error");
    try {
      var uid = extractUidFromLocation();
      if (!uid) {
        throw new Error("缺少 UID。請使用 /p/01/.../21/... 或 /p/?uid=... / Missing UID. Use /p/01/.../21/... or /p/?uid=...");
      }

      var records = await loadProductsIndexForPassportPage();
      var product = records.find(function (row) { return normalizeUid(row.uid) === normalizeUid(uid); });
      if (!product) {
        throw new Error("在 products.csv 找不到此 UID / UID not found in products.csv: " + uid);
      }

      var batteryPassport = await fetchJson(resolveFromPage(product.passportJsonUrl));
      var modelPassport = null;
      if (batteryPassport && batteryPassport.modelPassportUrl) {
        modelPassport = await fetchJson(resolveFromPage(batteryPassport.modelPassportUrl));
      }

      var composed = composePassport(product, batteryPassport, modelPassport);
      renderPassportPage(product, composed, batteryPassport, modelPassport);

      loadingEl.classList.add("hidden");
      shellEl.classList.remove("hidden");
    } catch (error) {
      loadingEl.classList.add("hidden");
      errorEl.textContent = error.message;
      errorEl.classList.remove("hidden");
    }
  }

  function renderProductList(container, items) {
    container.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "找不到符合的護照資料。 / No matching passports.";
      container.appendChild(empty);
      return;
    }

    items.forEach(function (row) {
      var card = document.createElement("article");
      card.className = "product-card";

      var link = document.createElement("a");
      link.href = buildPassportLink(row.uid);
      link.innerHTML = "<h3>" + escapeHtml(row.modelId) + " / " + escapeHtml(row.serialNumber) + "</h3>";

      var dl = document.createElement("dl");
      dl.className = "meta-grid";
      addMeta(dl, "UID", row.uid);
      addMeta(dl, "GTIN", row.gtin);
      addMeta(dl, "類別 / Category", row.category);
      addMeta(dl, "護照 JSON / Passport JSON", row.passportJsonUrl);

      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "開啟護照 / Open Passport";

      var actions = document.createElement("div");
      actions.className = "card-actions";

      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn-secondary btn-sm";
      copyBtn.textContent = "複製 QR 連結 / Copy QR Link";

      var copyStatus = document.createElement("span");
      copyStatus.className = "copy-status muted small";
      copyStatus.setAttribute("aria-live", "polite");

      copyBtn.addEventListener("click", function () {
        var urlToCopy = row.qrPayload || row.publicLandingUrl || buildAbsolutePassportUrl(row.uid);
        copyToClipboard(urlToCopy).then(function () {
          copyStatus.textContent = "已複製 / Copied";
        }).catch(function () {
          copyStatus.textContent = "複製失敗 / Copy failed";
        });
      });

      actions.appendChild(copyBtn);
      actions.appendChild(copyStatus);

      card.appendChild(link);
      card.appendChild(dl);
      card.appendChild(badge);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  function addMeta(dl, label, value) {
    var wrap = document.createElement("div");
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.className = label === "UID" ? "mono" : "";
    dd.textContent = value == null ? "" : String(value);
    wrap.appendChild(dt);
    wrap.appendChild(dd);
    dl.appendChild(wrap);
  }

  function renderPassportPage(product, composed, batteryPassport, modelPassport) {
    document.getElementById("passport-title").textContent =
      (composed.identification.modelName || product.modelId) + " / " + (composed.identification.serialNumber || product.serialNumber);
    document.getElementById("passport-subtitle").textContent =
      "UID " + composed.identification.uid + " · " + (composed.identification.category || product.category);

    var qrText = product.qrPayload || product.publicLandingUrl || buildAbsolutePassportUrl(product.uid);
    document.getElementById("qr-text").textContent = qrText;
    if (window.BatteryQr && typeof window.BatteryQr.render === "function") {
      window.BatteryQr.render({
        target: document.getElementById("qr-target"),
        text: qrText,
        size: 220
      });
    }

    setupTabs();
    renderPassportSections(document.getElementById("passport-sections"), composed);
    setupPassportSearch();
    setupDownloadButton(product, batteryPassport, modelPassport, composed);
  }

  function setupTabs() {
    var publicTab = document.getElementById("tab-public");
    var restrictedTab = document.getElementById("tab-restricted");
    var publicPanel = document.getElementById("panel-public");
    var restrictedPanel = document.getElementById("panel-restricted");

    function activate(which) {
      var isPublic = which === "public";
      publicTab.classList.toggle("is-active", isPublic);
      restrictedTab.classList.toggle("is-active", !isPublic);
      publicTab.setAttribute("aria-selected", String(isPublic));
      restrictedTab.setAttribute("aria-selected", String(!isPublic));
      publicPanel.classList.toggle("hidden", !isPublic);
      restrictedPanel.classList.toggle("hidden", isPublic);
    }

    publicTab.addEventListener("click", function () { activate("public"); });
    restrictedTab.addEventListener("click", function () { activate("restricted"); });
  }

  function renderPassportSections(container, composed) {
    container.innerHTML = "";

    PASSPORT_SECTIONS.forEach(function (sectionDef) {
      var key = sectionDef.key;
      var sectionData = composed[key];
      if (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0)) return;

      var section = document.createElement("section");
      section.className = "section-card";
      section.dataset.section = key;

      var h2 = document.createElement("h2");
      h2.textContent = sectionDef.label;
      section.appendChild(h2);

      if (key === "events") {
        section.appendChild(renderEvents(sectionData));
      } else {
        section.appendChild(renderFieldList(flattenObject(sectionData)));
      }

      container.appendChild(section);
    });
  }

  function renderFieldList(rows) {
    var wrap = document.createElement("div");
    wrap.className = "field-list";

    rows.forEach(function (row) {
      var item = document.createElement("div");
      item.className = "field-row searchable";
      item.dataset.searchText = (row.label + " " + stringifyValue(row.value)).toLowerCase();

      var label = document.createElement("div");
      label.className = "field-label";
      label.textContent = row.label;

      var value = document.createElement("div");
      value.className = "field-value";
      appendValueNode(value, row.value);

      item.appendChild(label);
      item.appendChild(value);
      wrap.appendChild(item);
    });

    return wrap;
  }

  function appendValueNode(container, value) {
    if (Array.isArray(value)) {
      var row = document.createElement("div");
      row.className = "chip-row";
      value.forEach(function (v) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = stringifyValue(v);
        row.appendChild(chip);
      });
      container.appendChild(row);
      return;
    }

    if (value && typeof value === "object") {
      var pre = document.createElement("pre");
      pre.className = "mono small";
      pre.textContent = JSON.stringify(value, null, 2);
      container.appendChild(pre);
      return;
    }

    var text = String(value == null ? "" : value);
    if (/^https?:\/\//i.test(text)) {
      var a = document.createElement("a");
      a.href = text;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = text;
      container.appendChild(a);
    } else {
      if (text.length > 22 && (text.indexOf("/") !== -1 || text.indexOf("-") !== -1)) {
        container.classList.add("mono");
      }
      container.textContent = text;
    }
  }

  function renderEvents(events) {
    var list = document.createElement("div");
    list.className = "event-list";

    events.forEach(function (eventItem, index) {
      var article = document.createElement("article");
      article.className = "event-item searchable";
      var title = eventItem.type || ("事件 / Event " + (index + 1));
      article.dataset.searchText = (title + " " + JSON.stringify(eventItem)).toLowerCase();

      var h3 = document.createElement("h3");
      h3.textContent = title;
      article.appendChild(h3);

      var meta = document.createElement("p");
      meta.className = "event-meta";
      meta.textContent = [
        eventItem.date ? "日期 Date: " + eventItem.date : "",
        eventItem.actor ? "執行者 Actor: " + eventItem.actor : "",
        eventItem.location ? "地點 Location: " + eventItem.location : ""
      ].filter(Boolean).join(" · ");
      if (meta.textContent) article.appendChild(meta);

      if (eventItem.description) {
        var desc = document.createElement("p");
        desc.className = "event-desc";
        desc.textContent = eventItem.description;
        article.appendChild(desc);
      }

      var extra = Object.assign({}, eventItem);
      delete extra.type;
      delete extra.date;
      delete extra.actor;
      delete extra.location;
      delete extra.description;
      if (Object.keys(extra).length) {
        var details = renderFieldList(flattenObject(extra));
        article.appendChild(details);
      }

      list.appendChild(article);
    });

    return list;
  }

  function setupPassportSearch() {
    var input = document.getElementById("passport-search");
    var container = document.getElementById("passport-sections");
    var emptyEl = document.getElementById("search-empty");

    function applyFilter() {
      var q = (input.value || "").trim().toLowerCase();
      var anyVisible = false;
      var sections = container.querySelectorAll(".section-card");

      sections.forEach(function (section) {
        var matchesInSection = 0;
        section.querySelectorAll(".searchable").forEach(function (node) {
          var show = !q || (node.dataset.searchText || "").indexOf(q) !== -1;
          node.classList.toggle("hidden", !show);
          if (show) matchesInSection += 1;
        });
        var showSection = matchesInSection > 0;
        section.classList.toggle("hidden", !showSection);
        if (showSection) anyVisible = true;
      });

      emptyEl.classList.toggle("hidden", anyVisible || !q);
    }

    input.addEventListener("input", applyFilter);
    applyFilter();
  }

  function setupDownloadButton(product, batteryPassport, modelPassport, composed) {
    var button = document.getElementById("download-json");
    button.addEventListener("click", function () {
      var downloadData = {
        uid: product.uid,
        generatedAt: new Date().toISOString(),
        productIndexRow: product,
        batteryPassport: batteryPassport,
        modelPassport: modelPassport,
        composedPublicView: composed
      };
      var blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = sanitizeFilename(product.serialNumber || "battery-passport") + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    });
  }

  function composePassport(product, battery, model) {
    var identification = {
      uid: product.uid,
      gtin: product.gtin,
      serialNumber: product.serialNumber,
      modelId: product.modelId || (battery && battery.modelId),
      modelName: model && model.identification && model.identification.modelName,
      category: product.category || (model && model.identification && model.identification.category),
      manufacturer: getNested(model, ["identification", "manufacturer"]) || getNested(battery, ["identification", "manufacturer"]),
      manufacturingDate: getNested(battery, ["identification", "manufacturingDate"]),
      manufacturingPlant: getNested(battery, ["identification", "manufacturingPlant"]),
      batteryStatus: getNested(battery, ["identification", "status"]),
      publicLandingUrl: product.publicLandingUrl,
      qrPayload: product.qrPayload
    };

    var technical = Object.assign(
      {},
      getNested(model, ["technical"]) || {},
      getNested(battery, ["technical"]) || {}
    );

    var sustainability = Object.assign(
      {},
      getNested(model, ["sustainability"]) || {},
      getNested(battery, ["sustainability"]) || {}
    );

    var circularity = Object.assign(
      {},
      getNested(model, ["circularity"]) || {},
      getNested(battery, ["circularity"]) || {}
    );

    var events = getNested(battery, ["events"]) || [];

    return {
      identification: identification,
      technical: technical,
      sustainability: sustainability,
      circularity: circularity,
      events: events
    };
  }

  async function loadProductsIndex() {
    var response = await fetch(PRODUCTS_CSV_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    var csvText = await response.text();
    return parseCsv(csvText);
  }

  async function loadProductsIndexForPassportPage() {
    var path = "../data/products.csv";
    var response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status + " while loading " + path);
    return parseCsv(await response.text());
  }

  async function fetchJson(path) {
    var response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status + " while loading " + path);
    return response.json();
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = "";
    var i = 0;
    var inQuotes = false;

    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        cell += ch;
        i += 1;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === ",") {
        row.push(cell);
        cell = "";
        i += 1;
        continue;
      }
      if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i += 1;
        continue;
      }
      if (ch === "\r") {
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
    }

    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    if (!rows.length) return [];
    var headers = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ""; });
    }).map(function (r) {
      var obj = {};
      headers.forEach(function (h, idx) {
        obj[h] = r[idx] == null ? "" : r[idx];
      });
      return obj;
    });
  }

  function flattenObject(obj, prefix) {
    var rows = [];
    Object.keys(obj || {}).forEach(function (key) {
      var value = obj[key];
      if (value == null || value === "") return;
      var label = prefix ? prefix + " / " + humanizeKey(key) : humanizeKey(key);
      if (Array.isArray(value)) {
        if (value.every(function (v) { return v == null || ["string", "number", "boolean"].indexOf(typeof v) !== -1; })) {
          rows.push({ label: label, value: value });
        } else {
          rows.push({ label: label, value: value });
        }
        return;
      }
      if (typeof value === "object") {
        rows = rows.concat(flattenObject(value, label));
        return;
      }
      rows.push({ label: label, value: value });
    });
    return rows;
  }

  function stringifyValue(value) {
    if (Array.isArray(value)) return value.map(stringifyValue).join(" ");
    if (value && typeof value === "object") return JSON.stringify(value);
    return String(value == null ? "" : value);
  }

  function humanizeKey(key) {
    return String(key)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function buildPassportLink(uid) {
    var parts = String(uid || "").split("/").map(encodeURIComponent);
    return "./p/" + parts.join("/");
  }

  function buildAbsolutePassportUrl(uid) {
    var parts = String(uid || "").split("/").map(encodeURIComponent).join("/");
    var base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "/");
    if (window.location.pathname.indexOf("/p/") !== -1) {
      base = window.location.origin + window.location.pathname.split("/p/")[0] + "/";
    }
    return new URL("p/" + parts, base).toString();
  }

  function extractUidFromLocation() {
    var params = new URLSearchParams(window.location.search);
    var uidFromQuery = params.get("uid");
    if (uidFromQuery) return normalizeUid(decodeURIComponent(uidFromQuery));

    var path = window.location.pathname || "";
    var marker = "/p/";
    var idx = path.indexOf(marker);
    if (idx === -1) return "";

    var rest = path.slice(idx + marker.length);
    rest = rest.replace(/^index\.html\/?/, "");
    rest = rest.replace(/\/+$/, "");
    if (!rest) return "";

    try {
      return normalizeUid(decodeURIComponent(rest));
    } catch (_err) {
      return normalizeUid(rest);
    }
  }

  function normalizeUid(uid) {
    return String(uid || "").trim().replace(/^\/+|\/+$/g, "");
  }

  function resolveFromPage(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    return new URL(path, window.location.href).toString();
  }

  function getNested(obj, path) {
    return path.reduce(function (acc, key) {
      return acc && acc[key] != null ? acc[key] : null;
    }, obj);
  }

  function sanitizeFilename(input) {
    return String(input || "file").replace(/[^a-z0-9._-]+/gi, "_");
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(String(text || ""));
    }

    return new Promise(function (resolve, reject) {
      try {
        var textarea = document.createElement("textarea");
        textarea.value = String(text || "");
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        var ok = document.execCommand("copy");
        textarea.remove();
        if (ok) resolve();
        else reject(new Error("execCommand copy failed"));
      } catch (err) {
        reject(err);
      }
    });
  }

  function escapeHtml(input) {
    return String(input == null ? "" : input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
