(() => {
  /* ---------- wait for interact.js ---------- */
  function whenInteractReady(cb) {
    if (typeof window.interact === "function") return cb();
    let tries = 0;
    const t = setInterval(() => {
      if (typeof window.interact === "function") {
        clearInterval(t);
        cb();
      } else if (++tries > 50) {
        clearInterval(t);
        console.error("Interact.js failed to load.");
      }
    }, 100);
  }

  /* ---------- proxy helpers (for CORS-safe images) ---------- */
  const PROXY_BASE = "/api/proxy";
  const isAbs = (u) => /^https?:\/\//i.test(u || "");
  const isProx = (u) =>
    typeof u === "string" &&
    (u.startsWith(PROXY_BASE) || u.includes("/api/proxy?url="));
  const proxify = (u) =>
    !u || isProx(u) || !isAbs(u)
      ? u
      : `${PROXY_BASE}?url=${encodeURIComponent(u)}`;

  /* ---------- html2pdf/jsPDF presence (CDN is loaded in index.html) ---------- */
  const getJsPDF = () => window.jspdf?.jsPDF || window.jsPDF || null;
  const libsReady = () =>
    !!window.html2pdf && !!window.html2canvas && !!getJsPDF();

  const elPages = document.getElementById("pages");
  const selectTpl = document.getElementById("templateSelect");
  const addBlank = document.getElementById("addBlank");
  const deletePageBtn = document.getElementById("deletePage");
  const exportBtn = document.getElementById("exportPdf");
  const elGallery = document.getElementById("lb-gallery");
  const sidebar = document.querySelector(".lb-sidebar");

  /* ---------- state ---------- */
  let pages = load() || [makePage()];
  let selectedPageId = null;
  let selectedBlock = null;

  function makeId() {
    return Math.random().toString(36).slice(2, 10);
  }
  function makePage(blocks = []) {
    return { id: makeId(), blocks: blocks.map(withIds) };
  }
  function withIds(b) {
    return { id: makeId(), z: 1, ...b };
  }

  /* ---------- storage ---------- */
  function save() {
    localStorage.setItem("lookbook", JSON.stringify(pages));
  }
  function load() {
    try {
      return JSON.parse(localStorage.getItem("lookbook"));
    } catch {
      return null;
    }
  }

  /* ---------- wardrobe feed ---------- */
  const norm = (arr = []) =>
    arr
      .map((it, i) =>
        typeof it === "string"
          ? { id: String(i), name: "", imageUrl: it }
          : {
              id: it?.id ?? String(i),
              name: it?.name || "",
              imageUrl: it?.imageUrl || it?.url || "",
            }
      )
      .filter((x) => x.imageUrl);

  function currentWardrobeItems() {
    if (Array.isArray(window.WARDROBE_ITEMS) && window.WARDROBE_ITEMS.length)
      return norm(window.WARDROBE_ITEMS);
    if (window.Wardrobe?.getAll) return norm(window.Wardrobe.getAll());
    return [];
  }

  /* ---------- gallery ---------- */
  function renderGallery(items = currentWardrobeItems()) {
    if (!elGallery) return;
    elGallery.innerHTML = "";

    if (!items.length) {
      elGallery.innerHTML = `<div style="font-size:12px;color:#6b7280;line-height:1.4;padding:6px 4px;">
        No wardrobe items yet. Save some looks, then drag them here.
      </div>`;
      return;
    }

    items.forEach((item) => {
      const raw = (item.imageUrl || "").trim();
      if (!raw) return;
      const src = proxify(raw);
      const card = document.createElement("div");
      card.className = "lb-thumb draggable-item";
      card.dataset.imageUrl = src; // carry proxied URL
      card.dataset.name = item.name || "";
      card.innerHTML = `<img alt=""><div class="lb-name"></div>`;
      card.querySelector("img").src = src;
      elGallery.appendChild(card);
    });

    if (typeof window.interact !== "function") return;

    window.interact(".draggable-item").draggable({
      inertia: true,
      listeners: { move: dragMoveListener },
      cursorChecker: () => "grabbing",
      onstart: (ev) => {
        ev.target.classList.add("dragging");
        sidebar?.classList.add("sidebar-open");
      },
      onend: (ev) => {
        ev.target.classList.remove("dragging");
        ev.target.style.transform = "";
        ev.target.removeAttribute("data-x");
        ev.target.removeAttribute("data-y");
        sidebar?.classList.remove("sidebar-open");
      },
    });
  }

  function dragMoveListener(event) {
    const t = event.target;
    const x = (parseFloat(t.getAttribute("data-x")) || 0) + event.dx;
    const y = (parseFloat(t.getAttribute("data-y")) || 0) + event.dy;
    t.style.transform = `translate(${x}px,${y}px)`;
    t.setAttribute("data-x", x);
    t.setAttribute("data-y", y);
  }
  window.dragMoveListener = dragMoveListener;

  /* ---------- render pages ---------- */
  function render() {
    elPages.innerHTML = "";
    pages.forEach((pg) => {
      const page = document.createElement("div");
      page.className = "page";
      page.dataset.pid = pg.id;

      const inner = document.createElement("div");
      inner.className = "page-inner";
      page.appendChild(inner);

      const canvas = document.createElement("div");
      canvas.className = "page-canvas dropzone";
      inner.appendChild(canvas);

      pg.blocks.forEach((b) => {
        const el = renderBlock(pg, b);
        canvas.appendChild(el);
        applyRect(el, b.rect);
      });

      const safe = document.createElement("div");
      safe.className = "page-safe";
      page.appendChild(safe);

      // deselect on empty click
      page.addEventListener("mousedown", (e) => {
        if (e.target.closest(".lb-block")) return;
        selectPage(pg.id, { clearBlock: true });
      });

      if (pg.id === selectedPageId) page.classList.add("selected");
      elPages.appendChild(page);
    });

    if (typeof window.interact === "function") {
      bindInteract();
      bindDropzones();
    } else {
      whenInteractReady(() => {
        bindInteract();
        bindDropzones();
      });
    }

    if (!selectedPageId && pages.length) {
      selectedPageId = pages[pages.length - 1].id;
      markSelectedPage();
    }
  }

  function markSelectedPage() {
    document.querySelectorAll(".page").forEach((p) => {
      p.classList.toggle("selected", p.dataset.pid === selectedPageId);
    });
  }

  function selectPage(pid, opts) {
    selectedPageId = pid;
    if (opts?.clearBlock) {
      document
        .querySelectorAll(".lb-block")
        .forEach((d) => d.classList.remove("selected"));
      selectedBlock = null;
    }
    markSelectedPage();
  }

  /* ---------- image helpers ---------- */
  function setImgFitAndPos(img, b) {
    const fit = b.content?.fit || "contain";
    const px = Number(b.content?.posX ?? 50);
    const py = Number(b.content?.posY ?? 50);
    img.style.objectFit = fit;
    img.style.objectPosition = `${px}% ${py}%`;
  }

  // Alt/Option + drag to pan image in frame
  function attachPan(img, blockNode, b) {
    let start = null;
    img.addEventListener("pointerdown", (e) => {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      blockNode.classList.add("pan-mode");
      img.setPointerCapture(e.pointerId);
      start = {
        x: e.clientX,
        y: e.clientY,
        px: Number(b.content?.posX ?? 50),
        py: Number(b.content?.posY ?? 50),
        w: img.clientWidth,
        h: img.clientHeight,
      };
    });
    img.addEventListener("pointermove", (e) => {
      if (!start) return;
      const nx = Math.max(
        0,
        Math.min(100, start.px + ((e.clientX - start.x) / start.w) * 100)
      );
      const ny = Math.max(
        0,
        Math.min(100, start.py + ((e.clientY - start.y) / start.h) * 100)
      );
      b.content = b.content || {};
      b.content.posX = nx;
      b.content.posY = ny;
      img.style.objectPosition = `${nx}% ${ny}%`;
    });
    img.addEventListener("pointerup", () => {
      if (!start) return;
      start = null;
      blockNode.classList.remove("pan-mode");
      save();
    });
  }

  /* ---------- selection helper ---------- */
  function selectBlockNode(div, pg, b) {
    document
      .querySelectorAll(".lb-block")
      .forEach((d) => d.classList.remove("selected"));
    div.classList.add("selected");
    selectedBlock = { pg, b, node: div };
    selectPage(pg.id);
    div.focus({ preventScroll: true });
  }

  function renderBlock(pg, b) {
    const div = document.createElement("div");
    div.className = "lb-block";
    div.dataset.pid = pg.id;
    div.dataset.bid = b.id;
    div.tabIndex = 0;

    div.addEventListener(
      "pointerdown",
      () => selectBlockNode(div, pg, b),
      true
    );
    div.addEventListener("click", () => selectBlockNode(div, pg, b), true);

    if (b.type === "image") {
      const img = document.createElement("img");
      img.className = "lb-img";
      img.crossOrigin = "anonymous";
      const raw = b.content?.url || null;
      img.src = raw ? proxify(raw) : placeholderSvg("Drop here");
      setImgFitAndPos(img, b);
      attachPan(img, div, b);

      img.addEventListener(
        "pointerdown",
        () => selectBlockNode(div, pg, b),
        true
      );
      img.addEventListener("click", () => selectBlockNode(div, pg, b), true);

      div.appendChild(img);
    } else if (b.type === "text") {
      const t = document.createElement("div");
      t.className = "lb-text";
      t.textContent = b.content?.text || "Your text";
      t.addEventListener("dblclick", () => {
        const next = prompt("Edit text:", b.content?.text || "");
        if (next != null) {
          b.content = b.content || {};
          b.content.text = next;
          save();
          render();
        }
      });
      div.appendChild(t);
    }
    return div;
  }

  function placeholderSvg(msg) {
    const text = (msg || "Drop here")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return (
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
         <rect width='100%' height='100%' fill='#f0f2f4'/>
         <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
               font-family='system-ui,Inter' font-size='16' fill='#9aa1a8'>${text}</text>
       </svg>`
      )
    );
  }

  function applyRect(node, rect) {
    node.style.left = rect.x + "%";
    node.style.top = rect.y + "%";
    node.style.width = rect.w + "%";
    node.style.height = rect.h + "%";
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function clampRect(r) {
    const minW = 2,
      minH = 2;
    r.w = clamp(r.w, minW, 100);
    r.h = clamp(r.h, minH, 100);
    r.x = clamp(r.x, 0, 100 - r.w);
    r.y = clamp(r.y, 0, 100 - r.h);
    return r;
  }

  /* ---------- interact (drag/resize) ---------- */
  function bindInteract() {
    if (typeof window.interact !== "function") return;

    window
      .interact(".lb-block")
      .draggable({
        listeners: {
          move(event) {
            const node = event.target;
            const pid = node.dataset.pid,
              bid = node.dataset.bid;
            const pg = pages.find((p) => p.id === pid);
            const b = pg?.blocks.find((x) => x.id === bid);
            if (!b) return;

            const R = node.parentElement.getBoundingClientRect();
            const dxPct = (event.dx / R.width) * 100;
            const dyPct = (event.dy / R.height) * 100;

            b.rect = clampRect({
              x: b.rect.x + dxPct,
              y: b.rect.y + dyPct,
              w: b.rect.w,
              h: b.rect.h,
            });
            applyRect(node, b.rect);
          },
          end() {
            save();
          },
        },
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
      })
      .on("resizemove", (event) => {
        const node = event.target;
        const pid = node.dataset.pid,
          bid = node.dataset.bid;
        const pg = pages.find((p) => p.id === pid);
        const b = pg?.blocks.find((x) => x.id === bid);
        if (!b) return;

        const R = node.parentElement.getBoundingClientRect();
        const x = ((event.rect.left - R.left) / R.width) * 100;
        const y = ((event.rect.top - R.top) / R.height) * 100;
        const w = (event.rect.width / R.width) * 100;
        const h = (event.rect.height / R.height) * 100;
        b.rect = clampRect({ x, y, w, h });
        applyRect(node, b.rect);
      })
      .on("resizeend", () => save());
  }

  /* ---------- drop from gallery ---------- */
  let _lastDrop = { id: "", time: 0 };

  function bindDropzones() {
    if (typeof window.interact !== "function") return;
    try {
      window.interact(".page-canvas.dropzone").unset();
    } catch {}

    window.interact(".page-canvas.dropzone").dropzone({
      accept: ".draggable-item",
      overlap: "pointer",
      ondragenter(e) {
        e.target.closest(".page")?.classList.add("dz-over");
      },
      ondragleave(e) {
        e.target.closest(".page")?.classList.remove("dz-over");
      },
      ondrop(event) {
        try {
          const canvas = event.target;
          const pid = canvas.closest(".page")?.dataset?.pid;
          const pg = pages.find((p) => p.id === pid);
          if (!pg) return;

          const dragged = event.relatedTarget;
          const imageUrl = dragged?.dataset?.imageUrl; // already proxied
          if (!imageUrl) return;

          // de-dupe rapid double-fires
          const dragId =
            dragged.dataset.dragId || (dragged.dataset.dragId = makeId());
          const now = Date.now();
          if (_lastDrop.id === dragId && now - _lastDrop.time < 250) return;
          _lastDrop = { id: dragId, time: now };

          const R = canvas.getBoundingClientRect();
          const clientX =
            event.dragEvent?.clientX || event.clientX || event.pageX || 0;
          const clientY =
            event.dragEvent?.clientY || event.clientY || event.pageY || 0;

          const xPct = clamp(((clientX - R.left) / R.width) * 100, 0, 100);
          const yPct = clamp(((clientY - R.top) / R.height) * 100, 0, 100);

          const target = findImageBlockAt(pg, xPct, yPct);
          if (target) {
            target.content = target.content || {};
            target.content.url = imageUrl; // replace image
            save();
            render();
          } else {
            pg.blocks.push({
              id: makeId(),
              type: "image",
              rect: clampRect({ x: xPct - 20, y: yPct - 15, w: 40, h: 30 }),
              content: { url: imageUrl },
            });
            save();
            render();
          }

          dragged.style.transform = "";
          dragged.removeAttribute("data-x");
          dragged.removeAttribute("data-y");
        } catch (err) {
          console.error("Drop failed:", err);
        }
      },
    });
  }

  function findImageBlockAt(pg, x, y) {
    for (let i = pg.blocks.length - 1; i >= 0; i--) {
      const b = pg.blocks[i];
      if (b.type !== "image") continue;
      const r = b.rect || { x: 0, y: 0, w: 0, h: 0 };
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return b;
    }
    return null;
  }

  /* ---------- toolbar ---------- */
  selectTpl.addEventListener("change", () => {
    const val = selectTpl.value;
    if (!val) return;
    const maker =
      (window.LB_TEMPLATES && window.LB_TEMPLATES[val]) || (() => []);
    const blocks = maker().map(withIds);
    blocks.forEach((b) => {
      if (b.type === "image") b.content = { url: "" };
    });

    const pid = selectedPageId || pages[pages.length - 1]?.id;
    const idx = pages.findIndex((p) => p.id === pid);
    if (idx >= 0) {
      pages[idx].blocks = blocks;
      save();
      render();
    }
    selectTpl.value = "";
  });

  addBlank.addEventListener("click", () => {
    const pg = makePage();
    pages.push(pg);
    save();
    render();
    selectPage(pg.id, { clearBlock: true });
  });

  deletePageBtn.addEventListener("click", () => {
    if (!selectedPageId) return;
    if (pages.length <= 1) return alert("You must keep at least one page.");
    const idx = pages.findIndex((p) => p.id === selectedPageId);
    if (idx < 0) return;
    pages.splice(idx, 1);
    selectedBlock = null;
    selectedPageId = pages[Math.max(0, idx - 1)].id;
    save();
    render();
  });

  /* ---------- Delete hotkey (remove selected block) ---------- */
  function isDeleteKey(e) {
    const k = e.key || e.code || "";
    return (
      k === "Backspace" || k === "Delete" || e.keyCode === 8 || e.keyCode === 46
    );
  }
  function shouldIgnoreForInputs() {
    const ae = document.activeElement;
    return (
      ae &&
      (ae.tagName === "INPUT" ||
        ae.tagName === "TEXTAREA" ||
        ae.isContentEditable)
    );
  }
  function deleteHandler(e) {
    if (!isDeleteKey(e) || shouldIgnoreForInputs()) return;
    const node = document.querySelector(".lb-block.selected");
    if (!node) return;
    const pid = node.dataset.pid,
      bid = node.dataset.bid;
    const pg = pages.find((p) => p.id === pid);
    if (!pg) return;
    pg.blocks = pg.blocks.filter((x) => x.id !== bid);
    selectedBlock = null;
    save();
    node.remove();
    render();
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  window.addEventListener("keydown", deleteHandler, true);
  document.addEventListener("keydown", deleteHandler, true);
  (document.body || document).addEventListener("keydown", deleteHandler, true);

  // --- replace the whole export handler with this ---
  exportBtn.addEventListener("click", async () => {
    // make sure we have jsPDF (the html2pdf bundle usually exposes it as window.jspdf.jsPDF)
    const getJsPDF = () =>
      (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || null;
    let JsPDF = getJsPDF();
    if (!JsPDF) {
      // lightweight fallback if your bundle didn't expose jsPDF globally
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      }).catch(() => {});
      JsPDF = getJsPDF();
    }

    if (!JsPDF || !window.html2canvas) {
      alert(
        "PDF libs not available. Keep the html2pdf bundle script in index.html."
      );
      return;
    }

    const pages = Array.from(document.querySelectorAll(".page"));
    if (!pages.length) {
      alert("There’s nothing to export yet.");
      return;
    }

    // hide UI chrome so capture is 1:1 with the studio
    document.body.classList.add("export-mode");

    try {
      // A4 portrait in points; we’ll scale each captured page to fill exactly
      const pdf = new JsPDF({
        unit: "pt",
        format: "a4",
        orientation: "portrait",
        compressPdf: true,
      });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();

      // high-res capture; CORS-safe because your images are proxied
      const h2c = {
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        letterRendering: true,
        logging: false,
      };

      for (let i = 0; i < pages.length; i++) {
        // render exactly one .page
        const canvas = await window.html2canvas(pages[i], h2c);
        const img = canvas.toDataURL("image/jpeg", 0.98);

        if (i > 0) pdf.addPage();
        // place the page snapshot to fill the PDF page (no auto-splitting)
        pdf.addImage(img, "JPEG", 0, 0, W, H, undefined, "FAST");
      }

      pdf.save("lookbook.pdf");
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. See console for details.");
    } finally {
      document.body.classList.remove("export-mode");
    }
  });

  /* ---------- helpers exposed (optional) ---------- */
  window.addGeneratedImage = function (url) {
    const newPage = makePage([
      {
        id: makeId(),
        type: "image",
        rect: { x: 0, y: 0, w: 100, h: 100 },
        content: { url: proxify(url) },
      },
    ]);
    pages.push(newPage);
    save();
    render();
    selectPage(newPage.id, { clearBlock: true });
  };

  window.addImageToLastPage = function (url) {
    const last = pages[pages.length - 1];
    if (!last) return window.addGeneratedImage(url);
    last.blocks.push({
      id: makeId(),
      type: "image",
      rect: { x: 10, y: 10, w: 40, h: 40 },
      content: { url: proxify(url) },
    });
    save();
    render();
    selectPage(last.id, { clearBlock: true });
  };

  /* ---------- boot ---------- */
  render();
  whenInteractReady(() => {
    renderGallery();
    bindDropzones();
  });
  document.addEventListener("wardrobe:update", () =>
    whenInteractReady(() => renderGallery(currentWardrobeItems()))
  );
})();
