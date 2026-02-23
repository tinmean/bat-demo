(function () {
  "use strict";

  function renderQrImage(target, text, size) {
    if (!target) return;
    target.innerHTML = "";

    if (!text) {
      target.textContent = "No QR payload";
      return;
    }

    var img = document.createElement("img");
    img.alt = "QR code for battery passport URL";
    img.width = size || 220;
    img.height = size || 220;

    // Tiny static-demo approach: use a public QR image endpoint so the site remains backend-free.
    // Replace this module with an embedded QR encoder (MIT-licensed) for fully self-contained/offline use.
    img.src = "https://api.qrserver.com/v1/create-qr-code/?size=" +
      encodeURIComponent((size || 220) + "x" + (size || 220)) +
      "&data=" + encodeURIComponent(text);

    img.addEventListener("error", function () {
      target.textContent = "QR preview unavailable";
    });

    target.appendChild(img);
  }

  window.BatteryQr = {
    render: function (options) {
      renderQrImage(options.target, options.text, options.size || 220);
    }
  };
})();
