"use strict";
// Gallery editing helpers for the Product change form:
//   1. tick DELETE?  -> hide that inline row at once (with an Undo); the real
//      delete still happens on Save.
//   2. drag feedback  -> fade a stacked inline while its handle is held.
//   3. the "Add images / Add videos" multi-file fields accept files dropped
//      onto them, not just the file picker.
(function () {
  // ---------- 1 + 2: inline rows ----------

  function inlineRow(el) {
    return el.closest(".inline-related") || el.closest("tr.form-row");
  }

  function labelFor(row) {
    var el = row.querySelector(":scope > h3 .inline_label") ||
             row.querySelector(":scope > h3, td.original > p");
    if (!el) return "this item";
    var text = (el.firstChild && el.firstChild.textContent) || el.textContent || "";
    return text.trim().replace(/\s+/g, " ").replace(/\s*(Change|View)$/, "") || "this item";
  }

  function applyDelete(box) {
    var row = inlineRow(box);
    if (!row) return;
    var deleted = box.checked;
    row.classList.toggle("bb-row-deleted", deleted);

    var tip = row.previousElementSibling;
    var hasTip = tip && tip.classList && tip.classList.contains("bb-deleted-tip");

    if (deleted && !hasTip) {
      tip = document.createElement("div");
      tip.className = "bb-deleted-tip";
      tip.textContent = "🗑️ " + labelFor(row) + " — will be removed when you save. ";
      var undo = document.createElement("a");
      undo.href = "#";
      undo.textContent = "Undo";
      undo.addEventListener("click", function (ev) {
        ev.preventDefault();
        box.checked = false;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      });
      tip.appendChild(undo);
      row.parentNode.insertBefore(tip, row);
    } else if (!deleted && hasTip) {
      tip.remove();
    }
  }

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[type="checkbox"][name$="-DELETE"]')) applyDelete(t);
  });

  document.addEventListener("pointerdown", function (e) {
    var h = e.target.closest && e.target.closest(".inline-related.has_original > h3");
    if (h && h.parentElement) h.parentElement.classList.add("bb-dragging");
  });
  document.addEventListener("pointerup", function () {
    document.querySelectorAll(".bb-dragging").forEach(function (r) {
      r.classList.remove("bb-dragging");
    });
  });

  // ---------- 3: drop files onto the multi-upload fields ----------

  function wireDropzone(input) {
    if (!input || input.dataset.bbDropzone) return;
    input.dataset.bbDropzone = "1";

    var zone = document.createElement("div");
    zone.className = "bb-dropzone";
    input.parentNode.insertBefore(zone, input);
    zone.appendChild(input);

    var status = document.createElement("span");
    status.className = "bb-dropzone-status";
    zone.appendChild(status);

    function report() {
      var n = input.files ? input.files.length : 0;
      status.textContent = n ? n + " file" + (n === 1 ? "" : "s") + " ready to upload" : "";
    }
    input.addEventListener("change", report);

    ["dragenter", "dragover"].forEach(function (evt) {
      zone.addEventListener(evt, function (e) {
        e.preventDefault();
        zone.classList.add("bb-dragover");
      });
    });
    ["dragleave", "dragend", "drop"].forEach(function (evt) {
      zone.addEventListener(evt, function () {
        zone.classList.remove("bb-dragover");
      });
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      var dt = new DataTransfer();
      Array.prototype.forEach.call(input.files || [], function (f) {
        dt.items.add(f);
      });
      Array.prototype.forEach.call(e.dataTransfer.files, function (f) {
        dt.items.add(f);
      });
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function wire() {
    document.querySelectorAll('input[type="checkbox"][name$="-DELETE"]').forEach(applyDelete);
    ["id_bulk_images", "id_bulk_videos"].forEach(function (id) {
      wireDropzone(document.getElementById(id));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
