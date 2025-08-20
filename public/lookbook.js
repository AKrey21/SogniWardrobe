// lookbook.js — immersive landscape on phones + full-viewport sizing + smooth drag
(() => {
  const A4_RATIO = 1.4142;              // height = width * A4_RATIO
  const SAFE_INSET = "3%";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const isPortrait = () => window.matchMedia("(orientation: portrait)").matches;

  function whenInteractReady(cb) {
    if (typeof window.interact === "function") return cb();
    let tries = 0;
    const t = setInterval(() => {
      if (typeof window.interact === "function") { clearInterval(t); cb(); }
      else if (++tries > 50) { clearInterval(t); console.error("Interact.js failed to load."); }
    }, 100);
  }

  /* ---------- proxy + pdf ---------- */
  const PROXY_BASE = "/api/proxy";
  const isAbs = (u) => /^https?:\/\//i.test(u || "");
  const isProx = (u) => typeof u === "string" && (u.startsWith(PROXY_BASE) || u.includes("/api/proxy?url="));
  const proxify = (u) => !u || isProx(u) || !isAbs(u) ? u : `${PROXY_BASE}?url=${encodeURIComponent(u)}`;
  const getJsPDF = () => window.jspdf?.jsPDF || window.jsPDF || null;

  /* ---------- DOM ---------- */
  const elHeader = document.querySelector("body > header");
  const elMain   = document.getElementById("lb-main");
  const elSidebar= document.getElementById("lb-sidebar");
  const elShade  = document.getElementById("drawerShade");
  const elOpen   = document.getElementById("openSidebar");
  const elClose  = document.getElementById("closeSidebar");
  const elGallery= document.getElementById("lb-gallery");
  const elHelp   = document.getElementById("lb-help");
  const elFooter = document.getElementById("lb-footer");
  const elPages  = document.getElementById("pages");
  const elRotate = document.getElementById("rotateOverlay");
  const tryLockBtn = document.getElementById("tryLockBtn");
  const lockLandscapeBtn = document.getElementById("lockLandscapeBtn");

  // desktop toolbar
  const selTpl = document.getElementById("templateSelect");
  const addBlank = document.getElementById("addBlank");
  const delPage = document.getElementById("deletePage");
  const exportBtn = document.getElementById("exportPdf");
  // mobile toolbar (inside drawer)
  const selTpl_m = document.getElementById("templateSelect_m");
  const addBlank_m = document.getElementById("addBlank_m");
  const delPage_m = document.getElementById("deletePage_m");
  const exportBtn_m = document.getElementById("exportPdf_m");

  /* ---------- state ---------- */
  let pages = load() || [makePage()];
  let selectedPageId = null;
  let selectedBlock = null;

  function makeId() { return Math.random().toString(36).slice(2, 10); }
  function withIds(b) { return { id: makeId(), z: 1, ...b }; }
  function makePage(blocks = []) { return { id: makeId(), blocks: blocks.map(withIds) }; }
  function save() { localStorage.setItem("lookbook", JSON.stringify(pages)); }
  function load() { try { return JSON.parse(localStorage.getItem("lookbook")); } catch { return null; } }

  /* ---------- orientation + immersive ---------- */
  const ORIG = {
    header: elHeader?.className || "",
    main:   elMain?.className || "",
    aside:  elSidebar?.className || "",
    help:   elHelp?.className || "",
    footer: elFooter?.className || "",
  };
  const isPhoneLandscape = () =>
    !isPortrait() && window.innerWidth < 1024; // phones & small tablets in landscape

  function showRotateOverlay(show) {
    if (!elRotate) return;
    elRotate.classList.toggle("hidden", !show);
    elRotate.classList.toggle("flex", show);
  }

  async function requestLandscapeLock() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (screen.orientation?.lock) await screen.orientation.lock("landscape");
    } catch (e) { console.warn("Orientation lock failed:", e?.message || e); }
  }
  tryLockBtn?.addEventListener("click", requestLandscapeLock);
  lockLandscapeBtn?.addEventListener("click", requestLandscapeLock);

  function enterImmersiveLandscape() {
    elHeader && (elHeader.className = (ORIG.header + " hidden").trim());
    elHelp   && (elHelp.className   = (ORIG.help   + " hidden").trim());
    elFooter && (elFooter.className = (ORIG.footer + " hidden").trim());

    if (elMain) {
      elMain.className =
        "fixed inset-0 grid grid-cols-[minmax(260px,40vw)_1fr] gap-0 p-0 items-stretch";
    }
    if (elSidebar) {
      elSidebar.className = ORIG.aside
        .replace("-translate-x-full", "")
        .replace("rounded-2xl", "rounded-none")
        .replace("shadow-sm", "shadow-none")
        .replace(/h-\[calc\(100vh-160px\)\]/, "h-screen");
      elSidebar.classList.add("translate-x-0", "border-r");
    }
    elShade?.classList.add("hidden");
    document.body.style.overflow = "hidden";
  }

  function exitImmersiveLandscape() {
    if (elHeader) elHeader.className = ORIG.header;
    if (elHelp)   elHelp.className   = ORIG.help;
    if (elFooter) elFooter.className = ORIG.footer;
    if (elMain)   elMain.className   = ORIG.main;
    if (elSidebar)elSidebar.className= ORIG.aside;
    document.body.style.overflow = "";
  }

  function applyOrientationLayout() {
    const portrait = isPortrait();
    showRotateOverlay(portrait);
    if (isPhoneLandscape()) enterImmersiveLandscape();
    else exitImmersiveLandscape();
    sizePagesToViewport();
  }

  window.addEventListener("orientationchange", () => setTimeout(applyOrientationLayout, 50));

  /* ---------- mobile drawer (still available) ---------- */
  function openDrawer() {
    elSidebar?.classList.remove("-translate-x-full");
    elShade?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    elSidebar?.classList.add("-translate-x-full");
    elShade?.classList.add("hidden");
    document.body.style.overflow = "";
  }
  elOpen?.addEventListener("click", openDrawer);
  elClose?.addEventListener("click", closeDrawer);
  elShade?.addEventListener("click", closeDrawer);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  /* ---------- wardrobe feed ---------- */
  const norm = (arr = []) => arr
    .map((it, i) => typeof it === "string"
      ? { id: String(i), name: "", imageUrl: it }
      : { id: it?.id ?? String(i), name: it?.name || "", imageUrl: it?.imageUrl || it?.url || "" })
    .filter((x) => x.imageUrl);

  function currentWardrobeItems() {
    if (Array.isArray(window.WARDROBE_ITEMS) && window.WARDROBE_ITEMS.length) return norm(window.WARDROBE_ITEMS);
    if (window.Wardrobe?.getAll) return norm(window.Wardrobe.getAll());
    return [];
  }

  /* ---------- gallery (sidebar) ---------- */
  function renderGallery(items = currentWardrobeItems()) {
    if (!elGallery) return;
    elGallery.innerHTML = "";

    if (!items.length) {
      elGallery.innerHTML = `<div class="text-xs text-gray-500 leading-snug p-1.5">
        No wardrobe items yet. Save some looks, then drag them here.
      </div>`;
      return;
    }

    items.forEach((item) => {
      const raw = (item.imageUrl || "").trim(); if (!raw) return;
      const src = proxify(raw);
      const card = document.createElement("div");
      card.className = [
        "draggable-item",
        "border border-gray-200 rounded-xl bg-white",
        "shadow-sm cursor-grab overflow-hidden",
        "flex items-center justify-center",
        "aspect-[3/4] p-2 transition transform",
        "hover:shadow-md hover:scale-[1.02]",
      ].join(" ");
      card.dataset.imageUrl = src;
      card.dataset.name = item.name || "";
      card.innerHTML = `<img alt="" class="max-w-full max-h-full object-contain bg-gray-100 rounded-lg" />`;
      card.querySelector("img").src = src;
      elGallery.appendChild(card);
    });

    if (typeof window.interact !== "function") return;

    window.interact(".draggable-item").draggable({
      inertia: false,
      autoScroll: { container: window, margin: 60, distance: 10, interval: 16, speed: 900 },
      listeners: { move: dragMoveListener },
      cursorChecker: () => "grabbing",
      onstart: (ev) => { ev.target.classList.add("z-[1000]","drop-shadow-lg","opacity-90"); },
      onend: (ev) => {
        ev.target.classList.remove("z-[1000]","drop-shadow-lg","opacity-90");
        ev.target.style.transform = ""; ev.target.removeAttribute("data-x"); ev.target.removeAttribute("data-y");
      },
    });
  }

  function dragMoveListener(event) {
    const t = event.target;
    const x = (parseFloat(t.getAttribute("data-x")) || 0) + event.dx;
    const y = (parseFloat(t.getAttribute("data-y")) || 0) + event.dy;
    t.style.transform = `translate(${x}px,${y}px)`; t.setAttribute("data-x", x); t.setAttribute("data-y", y);
  }
  window.dragMoveListener = dragMoveListener;

  /* ---------- render pages ---------- */
  function render() {
    elPages.innerHTML = "";
    pages.forEach((pg) => {
      const page = document.createElement("div");
      // width set by sizePagesToViewport(); aspect keeps height correct
      page.className = [
        "aspect-[1/1.4142]",
        "bg-white relative shadow-xl rounded-md overflow-hidden",
        "outline-0"
      ].join(" ");
      page.dataset.pid = pg.id;

      const inner = document.createElement("div");
      inner.className = "absolute inset-0"; page.appendChild(inner);

      const canvas = document.createElement("div");
      canvas.className = "absolute dropzone"; canvas.style.inset = SAFE_INSET; inner.appendChild(canvas);

      pg.blocks.forEach((b) => { const el = renderBlock(pg, b); canvas.appendChild(el); applyRect(el, b.rect); });

      const safe = document.createElement("div");
      safe.className = "page-safe absolute pointer-events-none border border-dashed border-gray-200";
      safe.style.inset = SAFE_INSET; page.appendChild(safe);

      page.addEventListener("mousedown", (e) => { if (!e.target.closest(".lb-block")) selectPage(pg.id, { clearBlock: true }); });

      if (pg.id === selectedPageId) page.classList.add("outline","outline-2","outline-black");
      elPages.appendChild(page);
    });

    if (typeof window.interact === "function") { bindInteract(); bindDropzones(); }
    else { whenInteractReady(() => { bindInteract(); bindDropzones(); }); }

    if (!selectedPageId && pages.length) { selectedPageId = pages[pages.length - 1].id; markSelectedPage(); }
    sizePagesToViewport();
  }

  // Fill remaining viewport: compute page width from available height & column width
  function sizePagesToViewport() {
    const stage = elPages?.parentElement;
    if (!stage) return;

    const vh = window.innerHeight;
    const immersive = isPhoneLandscape();

    // account for minimal padding in immersive; more padding on desktop layout
    const chromePad = immersive ? 8 : 140;
    const usableH = Math.max(240, vh - chromePad);

    // width if we fit by height (A4 portrait: W = H / 1.4142)
    const widthByH = usableH / A4_RATIO;

    // limit by available column width (minus tiny padding)
    const stageW = Math.max(200, stage.getBoundingClientRect().width - (immersive ? 12 : 16));

    // final: as big as possible but not past 900 (keeps export quality reasonable)
    const targetW = Math.min(900, Math.max(260, Math.min(widthByH, stageW)));

    document.querySelectorAll("#pages [data-pid]").forEach((page) => {
      page.style.width = `${targetW}px`;
    });

    // in immersive, let the page stack scroll if tall
    if (immersive) {
      elPages.style.height = `${window.innerHeight}px`;
      elPages.style.overflow = "auto";
      elPages.classList.add("p-2", "gap-4");
    } else {
      elPages.style.height = "";
      elPages.style.overflow = "";
      elPages.classList.remove("p-2", "gap-4");
    }
  }
  window.addEventListener("resize", sizePagesToViewport);

  function markSelectedPage() {
    document.querySelectorAll("[data-pid]").forEach((p) => {
      const on = p.dataset.pid === selectedPageId;
      p.classList.toggle("outline", on);
      p.classList.toggle("outline-2", on);
      p.classList.toggle("outline-black", on);
    });
  }
  function selectPage(pid, opts) {
    selectedPageId = pid;
    if (opts?.clearBlock) {
      document.querySelectorAll(".lb-block").forEach((d) => d.classList.remove("border-black"));
      selectedBlock = null;
    }
    markSelectedPage();
  }

  /* ---------- blocks ---------- */
  function setImgFitAndPos(img, b) {
    const fit = b.content?.fit || "contain";
    const px = Number(b.content?.posX ?? 50);
    const py = Number(b.content?.posY ?? 50);
    img.classList.toggle("object-contain", fit === "contain");
    img.classList.toggle("object-cover", fit === "cover");
    img.style.objectPosition = `${px}% ${py}%`;
  }
  function attachPan(img, blockNode, b) {
    let start = null;
    img.addEventListener("pointerdown", (e) => {
      if (!e.altKey) return;
      e.preventDefault(); e.stopPropagation();
      blockNode.classList.add("cursor-grab"); img.setPointerCapture(e.pointerId);
      start = { x: e.clientX, y: e.clientY, px: Number(b.content?.posX ?? 50), py: Number(b.content?.posY ?? 50),
                w: img.clientWidth, h: img.clientHeight };
    });
    img.addEventListener("pointermove", (e) => {
      if (!start) return;
      const nx = clamp(start.px + ((e.clientX - start.x) / start.w) * 100, 0, 100);
      const ny = clamp(start.py + ((e.clientY - start.y) / start.h) * 100, 0, 100);
      b.content = b.content || {}; b.content.posX = nx; b.content.posY = ny; img.style.objectPosition = `${nx}% ${ny}%`;
    });
    img.addEventListener("pointerup", () => { if (!start) return; start = null; blockNode.classList.remove("cursor-grab"); save(); });
  }
  function selectBlockNode(div, pg, b) {
    document.querySelectorAll(".lb-block").forEach((d) => d.classList.remove("border-black"));
    div.classList.add("border-black"); selectedBlock = { pg, b, node: div };
    selectPage(pg.id); div.focus({ preventScroll: true });
  }
  function renderBlock(pg, b) {
    const div = document.createElement("div");
    div.className = "lb-block absolute border border-transparent box-border outline-none select-none rounded-md";
    div.dataset.pid = pg.id; div.dataset.bid = b.id; div.tabIndex = 0;
    div.addEventListener("pointerdown", () => selectBlockNode(div, pg, b), true);
    div.addEventListener("click", () => selectBlockNode(div, pg, b), true);

    if (b.type === "image") {
      const img = document.createElement("img");
      img.className = "w-full h-full object-contain object-center block"; img.crossOrigin = "anonymous";
      const raw = b.content?.url || null; img.src = raw ? proxify(raw) : placeholderSvg("Drop here");
      setImgFitAndPos(img, b); attachPan(img, div, b);
      img.addEventListener("pointerdown", () => selectBlockNode(div, pg, b), true);
      img.addEventListener("click", () => selectBlockNode(div, pg, b), true);
      div.appendChild(img);
    } else if (b.type === "text") {
      const t = document.createElement("div");
      t.className = "w-full h-full p-2.5 text-[22px] font-bold whitespace-pre-wrap outline-none select-none";
      t.textContent = b.content?.text || "Your text";
      t.addEventListener("dblclick", () => {
        const next = prompt("Edit text:", b.content?.text || "");
        if (next != null) { b.content = b.content || {}; b.content.text = next; save(); render(); }
      });
      div.appendChild(t);
    }
    return div;
  }
  function placeholderSvg(msg) {
    const text = (msg || "Drop here").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
         <rect width='100%' height='100%' fill='#f0f2f4'/>
         <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
               font-family='system-ui,Inter' font-size='16' fill='#9aa1a8'>${text}</text>
       </svg>`
    );
  }
  function applyRect(node, rect) {
    node.style.left = rect.x + "%"; node.style.top = rect.y + "%";
    node.style.width = rect.w + "%"; node.style.height = rect.h + "%";
  }
  function clampRect(r) {
    const minW = 8, minH = 8;
    r.w = clamp(r.w, minW, 100); r.h = clamp(r.h, minH, 100);
    r.x = clamp(r.x, 0, 100 - r.w); r.y = clamp(r.y, 0, 100 - r.h);
    return r;
  }

  /* ---------- interact (drag/resize on page blocks) ---------- */
  function bindInteract() {
    if (typeof window.interact !== "function") return;

    window
      .interact(".lb-block")
      .draggable({
        inertia: false,
        modifiers: [ window.interact.modifiers.restrictEdges({ outer: "parent", endOnly: true }) ],
        listeners: {
          move(event) {
            const node = event.target;
            const pid = node.dataset.pid, bid = node.dataset.bid;
            const pg = pages.find((p) => p.id === pid);
            const b = pg?.blocks.find((x) => x.id === bid); if (!b) return;
            const R = node.parentElement.getBoundingClientRect();
            const dxPct = (event.dx / R.width) * 100;
            const dyPct = (event.dy / R.height) * 100;
            b.rect = clampRect({ x: b.rect.x + dxPct, y: b.rect.y + dyPct, w: b.rect.w, h: b.rect.h });
            applyRect(node, b.rect);
          },
          end() { save(); },
        },
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        inertia: false,
        modifiers: [
          window.interact.modifiers.restrictEdges({ outer: "parent" }),
          window.interact.modifiers.restrictSize({ min: { width: 40, height: 40 } }),
        ],
      })
      .on("resizemove", (event) => {
        const node = event.target;
        const pid = node.dataset.pid, bid = node.dataset.bid;
        const pg = pages.find((p) => p.id === pid);
        const b = pg?.blocks.find((x) => x.id === bid); if (!b) return;
        const R = node.parentElement.getBoundingClientRect();
        const x = ((event.rect.left - R.left) / R.width) * 100;
        const y = ((event.rect.top - R.top) / R.height) * 100;
        const w = (event.rect.width / R.width) * 100;
        const h = (event.rect.height / R.height) * 100;
        b.rect = clampRect({ x, y, w, h }); applyRect(node, b.rect);
      })
      .on("resizeend", () => save());
  }

  /* ---------- drop from gallery ---------- */
  let _lastDrop = { id: "", time: 0 };
  function bindDropzones() {
    if (typeof window.interact !== "function") return;
    try { window.interact(".dropzone").unset(); } catch {}

    window.interact(".dropzone").dropzone({
      accept: ".draggable-item",
      overlap: "pointer",
      ondragenter(e) {
        e.target.closest("[data-pid]")?.querySelector(".page-safe")?.classList.add("border-solid","border-black");
      },
      ondragleave(e) {
        e.target.closest("[data-pid]")?.querySelector(".page-safe")?.classList.remove("border-solid","border-black");
      },
      ondrop(event) {
        try {
          const canvas = event.target;
          const pid = canvas.closest("[data-pid]")?.dataset?.pid;
          const pg = pages.find((p) => p.id === pid); if (!pg) return;
          const dragged = event.relatedTarget;
          const imageUrl = dragged?.dataset?.imageUrl; if (!imageUrl) return;

          const dragId = dragged.dataset.dragId || (dragged.dataset.dragId = makeId());
          const now = Date.now(); if (_lastDrop.id === dragId && now - _lastDrop.time < 250) return;
          _lastDrop = { id: dragId, time: now };

          const R = canvas.getBoundingClientRect();
          const clientX = event.dragEvent?.clientX || event.clientX || event.pageX || 0;
          const clientY = event.dragEvent?.clientY || event.clientY || event.pageY || 0;

          const xPct = clamp(((clientX - R.left) / R.width) * 100, 0, 100);
          const yPct = clamp(((clientY - R.top) / R.height) * 100, 0, 100);

          const target = findImageBlockAt(pg, xPct, yPct);
          if (target) { target.content = target.content || {}; target.content.url = imageUrl; save(); render(); }
          else {
            pg.blocks.push({ id: makeId(), type: "image",
              rect: clampRect({ x: xPct - 20, y: yPct - 15, w: 40, h: 30 }), content: { url: imageUrl } });
            save(); render();
          }
        } catch (err) { console.error("Drop failed:", err); }
      },
    });
  }
  function findImageBlockAt(pg, x, y) {
    for (let i = pg.blocks.length - 1; i >= 0; i--) {
      const b = pg.blocks[i]; if (b.type !== "image") continue;
      const r = b.rect || { x: 0, y: 0, w: 0, h: 0 };
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return b;
    }
    return null;
  }

  /* ---------- toolbar (desktop + mobile mirror) ---------- */
  function applyTemplate(val) {
    if (!val) return;
    const maker = (window.LB_TEMPLATES && window.LB_TEMPLATES[val]) || (() => []);
    const blocks = maker().map(withIds);
    blocks.forEach((b) => { if (b.type === "image") b.content = { url: "" }; });
    const pid = selectedPageId || pages[pages.length - 1]?.id;
    const idx = pages.findIndex((p) => p.id === pid);
    if (idx >= 0) { pages[idx].blocks = blocks; save(); render(); }
  }
  selTpl?.addEventListener("change", () => { applyTemplate(selTpl.value); selTpl.value = ""; });
  selTpl_m?.addEventListener("change", () => { applyTemplate(selTpl_m.value); selTpl_m.value = ""; });

  addBlank?.addEventListener("click", () => { const pg = makePage(); pages.push(pg); save(); render(); selectPage(pg.id, { clearBlock: true }); });
  addBlank_m?.addEventListener("click", () => { const pg = makePage(); pages.push(pg); save(); render(); selectPage(pg.id, { clearBlock: true }); });

  function deletePage() {
    if (!selectedPageId) return;
    if (pages.length <= 1) return alert("You must keep at least one page.");
    const idx = pages.findIndex((p) => p.id === selectedPageId); if (idx < 0) return;
    pages.splice(idx, 1); selectedBlock = null; selectedPageId = pages[Math.max(0, idx - 1)].id;
    save(); render();
  }
  delPage?.addEventListener("click", deletePage);
  delPage_m?.addEventListener("click", deletePage);

  function doExport() {
    const JsPDF = getJsPDF();
    if (!JsPDF || !window.html2canvas) return alert("PDF libs not available.");
    const pagesEls = Array.from(document.querySelectorAll("[data-pid]"));
    if (!pagesEls.length) return alert("There’s nothing to export yet.");

    const toHide = [elSidebar, elHelp, elFooter].filter(Boolean);
    const removed = [];
    toHide.forEach((n) => { if (!n.classList.contains("hidden")) { n.classList.add("hidden"); removed.push(n); } });
    const mainOld = elMain?.className || ""; if (elMain) elMain.className = "flex gap-0 p-0 items-start";

    (async () => {
      try {
        const pdf = new JsPDF({ unit: "pt", format: "a4", orientation: "portrait", compressPdf: true });
        const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
        const h2c = { scale: Math.max(2, window.devicePixelRatio || 1), useCORS: true, allowTaint: false, backgroundColor: "#ffffff", letterRendering: true, logging: false };
        for (let i = 0; i < pagesEls.length; i++) {
          const canvas = await window.html2canvas(pagesEls[i], h2c);
          const img = canvas.toDataURL("image/jpeg", 0.98);
          if (i > 0) pdf.addPage();
          pdf.addImage(img, "JPEG", 0, 0, W, H, undefined, "FAST");
        }
        pdf.save("lookbook.pdf");
      } catch (err) { console.error("Export failed:", err); alert("Export failed. See console."); }
      finally {
        removed.forEach((n) => n.classList.remove("hidden"));
        if (elMain) elMain.className = mainOld;
      }
    })();
  }
  exportBtn?.addEventListener("click", doExport);
  exportBtn_m?.addEventListener("click", doExport);

  /* ---------- boot ---------- */
  function init() {
    render();
    whenInteractReady(() => { renderGallery(); bindDropzones(); });
    document.addEventListener("wardrobe:update", () => whenInteractReady(() => renderGallery(currentWardrobeItems())));
    applyOrientationLayout();
  }
  window.addEventListener("DOMContentLoaded", init);
})();
