// public/app.js
(function () {
  const els = {
    gender: document.getElementById("gender"),
    race: document.getElementById("race"),
    complexion: document.getElementById("complexion"),
    height: document.getElementById("height"),
    weight: document.getElementById("weight"),
    style: document.getElementById("style"),
    item: document.getElementById("item"),
    imageUpload: document.getElementById("image-upload"),
    batch: document.getElementById("batch"),
    go: document.getElementById("go"),
    regen: document.getElementById("regen"),
    loading: document.getElementById("loading"),
    images: document.getElementById("images"),
    status: document.getElementById("status"),
    modeTextRadio: document.getElementById("mode-text"),
    modeImageRadio: document.getElementById("mode-image"),
    textInputContainer: document.getElementById("text-input-container"),
    imageInputContainer: document.getElementById("image-input-container"),
    itemsChecklistContainer: document.getElementById("items-checklist-container"),
    itemsChecklist: document.getElementById("items-checklist"),
  };

  const STORE_KEY = "sogni-wardrobe.profile";
  let lastPayload = null;
  let lastMode = "text";
  let imageWorkflowState = "idle";
  let stagedFormData = null;

  // NEW: track last images + a selected tile index
  let lastImages = [];
  let selectedIndex = null;

  /* ---------- Lightbox ---------- */
  const Lightbox = (() => {
    const overlay = document.createElement('div');
    overlay.id = 'img-lightbox';
    overlay.className = 'fixed inset-0 z-50 hidden bg-black/90 flex items-center justify-center';
    overlay.innerHTML = `
      <button id="lb-close" class="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/20 text-white text-2xl leading-none">×</button>
      <img id="lb-img" alt="Full size" class="max-w-[95vw] max-h-[95vh] rounded-xl shadow-2xl object-contain"/>
    `;
    document.body.appendChild(overlay);
    const imgEl = overlay.querySelector('#lb-img');
    const closeBt = overlay.querySelector('#lb-close');
    function open(src) { if (!src) return; imgEl.src = src; overlay.classList.remove('hidden'); }
    function close() { imgEl.src = ''; overlay.classList.add('hidden'); }
    closeBt.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return { open, close };
  })();
  window.Lightbox = Lightbox;

  // Double-click to zoom (mobile-friendly)
  els.images?.addEventListener('dblclick', (e) => {
    const img = e.target.closest('img');
    if (img?.src) Lightbox.open(img.src);
  });

  // NEW: selection helpers
  function clearSelection() {
    selectedIndex = null;
    els.images?.querySelectorAll("[data-tile]").forEach(t => t.classList.remove("result-selected"));
  }
  function bindTileSelection(tile, index) {
    tile.dataset.tile = index;
    tile.addEventListener("click", (e) => {
      // ignore clicks on Save button
      if (e.target.closest(".save-btn")) return;
      if (selectedIndex === index) {
        tile.classList.remove("result-selected");
        selectedIndex = null;
      } else {
        els.images?.querySelectorAll("[data-tile]").forEach(t => t.classList.remove("result-selected"));
        tile.classList.add("result-selected");
        selectedIndex = index;
      }
    });
  }

  /* ---------- Mode switching ---------- */
  function resetImageWorkflow() {
    imageWorkflowState = "idle";
    stagedFormData = null;
    els.itemsChecklistContainer?.classList.add("hidden");
    if (els.itemsChecklist) els.itemsChecklist.innerHTML = "";
    clearSelection(); // clear any picked tile when switching modes
  }
  document.addEventListener("clear", resetImageWorkflow);

  els.modeTextRadio?.addEventListener("change", () => {
    if (els.modeTextRadio.checked) {
      els.textInputContainer?.classList.remove("hidden");
      els.imageInputContainer?.classList.add("hidden");
      if (els.go) els.go.textContent = "Generate";
      if (els.regen) els.regen.style.display = "block";
      resetImageWorkflow();
    }
  });

  els.modeImageRadio?.addEventListener("change", () => {
    if (els.modeImageRadio.checked) {
      els.textInputContainer?.classList.add("hidden");
      els.imageInputContainer?.classList.remove("hidden");
      if (els.go) els.go.textContent = "Analyze Items";
      if (els.regen) els.regen.style.display = "none";
      resetImageWorkflow();
    }
  });

  hydrate();
  setRegenEnabled(false);
  if (els.modeImageRadio?.checked && els.regen) els.regen.style.display = "none";

  /* ---------- UI helpers ---------- */
  function setLoading(v) {
    els.loading?.classList.toggle("hidden", !v);
    if (els.go) els.go.disabled = v;
    if (lastPayload && els.regen) els.regen.disabled = v;
  }
  function setRegenEnabled(v) { if (els.regen) els.regen.disabled = !v; }
  function setStatus(msg) { if (els.status) els.status.textContent = msg || ""; }

  /* ---------- Render results ---------- */
  function attachSaveButton(tileEl, url) {
    tileEl.querySelector('.save-btn')?.remove();
    if (!window.Wardrobe) return;
    const btn = document.createElement('button');
    btn.className = 'save-btn absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white';
    function setLabel() { btn.textContent = window.Wardrobe.isSaved(url) ? '♥ Saved' : '♡ Save'; }
    setLabel();
    btn.addEventListener('click', (e) => { e.stopPropagation(); window.Wardrobe.toggle(url); setLabel(); });
    window.Wardrobe.onChange(setLabel);
    tileEl.appendChild(btn);
  }

  function showImages(list) {
    if (!els.images) return;
    lastImages = Array.isArray(list) ? list.slice() : [];
    clearSelection(); // reset any existing selection
    els.images.innerHTML = "";
    (lastImages || []).forEach((url, i) => {
      const tile = document.createElement("div");
      tile.className = 'relative aspect-[3/4] bg-neutral-950 rounded-2xl overflow-hidden ring-1 ring-white/10';
      const img = document.createElement("img");
      img.src = url; img.alt = "Generated outfit"; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.className = 'absolute inset-0 w-full h-full object-cover';
      tile.appendChild(img);
      attachSaveButton(tile, url);
      bindTileSelection(tile, i); // NEW: enable single-click selection per tile
      els.images.appendChild(tile);
    });
  }

  /* ---------- Validations ---------- */
  function validateNumbers(h, w) {
    if (h != null && (h < 140 || h > 210)) return "Height should be between 140–210 cm";
    if (w != null && (w < 35 || w > 160)) return "Weight should be between 35–160 kg";
    return null;
  }
  function clampBatch(n) { const x = Number.isFinite(n) ? n : 3; return Math.max(1, Math.min(x, 6)); }
  function toNullableNumber(v) { if (v === "" || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }

  /* ---------- Payloads ---------- */
  function readTextPayload() {
    const heightCm = toNullableNumber(els.height?.value);
    const weightKg = toNullableNumber(els.weight?.value);
    const err = validateNumbers(heightCm, weightKg); if (err) throw new Error(err);
    return {
      gender: els.gender?.value, style: els.style?.value,
      itemText: (els.item?.value || "").trim() || "t-shirt",
      batch: clampBatch(Number(els.batch?.value)),
      race: els.race?.value, complexion: els.complexion?.value, heightCm, weightKg,
    };
  }
  function readImagePayload() {
    const heightCm = toNullableNumber(els.height?.value);
    const weightKg = toNullableNumber(els.weight?.value);
    const err = validateNumbers(heightCm, weightKg); if (err) throw new Error(err);
    return {
      gender: els.gender?.value, style: els.style?.value,
      batch: clampBatch(Number(els.batch?.value)),
      race: els.race?.value, complexion: els.complexion?.value, heightCm, weightKg,
    };
  }

  /* ---------- Profile ---------- */
  function persistProfile(p) {
    const keep = { gender: p.gender, race: p.race, complexion: p.complexion, heightCm: p.heightCm, weightKg: p.weightKg, style: p.style };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(keep)); } catch {}
  }
  function hydrate() {
    try {
      const raw = localStorage.getItem(STORE_KEY); if (!raw) return;
      const p = JSON.parse(raw);
      if (p.gender && els.gender) els.gender.value = p.gender;
      if (p.race && els.race) els.race.value = p.race;
      if (p.complexion && els.complexion) els.complexion.value = p.complexion;
      if (p.heightCm != null && els.height) els.height.value = p.heightCm;
      if (p.weightKg != null && els.weight) els.weight.value = p.weightKg;
      if (p.style && els.style) els.style.value = p.style;
    } catch {}
  }

  /* ---------- API: Text (supports targeted replace) ---------- */
  async function runTextGeneration(payload, isRegen = false) {
    setLoading(true);
    setStatus(isRegen ? "Regenerating…" : "Generating…");
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: ctrl.signal,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Generation failed (HTTP ${resp.status})`);

      lastPayload = { ...payload };
      setRegenEnabled(true);

      // If server returned exactly one image for a targeted replace, swap just that tile
      if (payload.__replaceIndex != null && Array.isArray(data.images) && data.images.length === 1) {
        const idx = payload.__replaceIndex;
        const newUrl = data.images[0];
        const tile = els.images?.querySelectorAll("[data-tile]")[idx];
        if (tile) {
          const img = tile.querySelector("img");
          if (img) img.src = newUrl;
          lastImages[idx] = newUrl;
          tile.classList.add("result-selected");
          selectedIndex = idx;
          setStatus(`Done • Replaced look #${idx + 1}`);
        } else {
          // fallback: re-render whole grid
          showImages(data.images || []);
          setStatus(`Done • ${payload.batch} image(s) for “${payload.itemText}”`);
        }
      } else {
        // normal path: render full batch
        showImages(data.images || []);
        setStatus(`Done • ${payload.batch} image(s) for “${payload.itemText}”`);
      }
    } catch (e) {
      setStatus(e.name === "AbortError" ? "Timed out. Please try again." : e.message);
    } finally { clearTimeout(t); setLoading(false); }
  }

  /* ---------- API: Image ---------- */
  async function runImageGeneration(formData) {
    setLoading(true); imageWorkflowState = "generating";
    setStatus("Generating final style…");
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const resp = await fetch("/api/generate-from-image", { method: "POST", body: formData, signal: ctrl.signal });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Generation failed (HTTP ${resp.status})`);
      lastPayload = null; setRegenEnabled(false); showImages(data.images || []);
      const finalItems = formData.get("itemText");
      setStatus(`Done • Styled: “${finalItems}”`);
    } catch (e) {
      setStatus(e.name === "AbortError" ? "Timed out. Please try again." : e.message);
    } finally {
      clearTimeout(t); setLoading(false); resetImageWorkflow(); if (els.go) els.go.textContent = "Analyze Items";
    }
  }

  async function runAnalysis(formData) {
    setLoading(true); imageWorkflowState = "analyzing";
    setStatus("Analyzing items…");
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      const resp = await fetch("/api/analyze-items", { method: "POST", body: formData, signal: ctrl.signal });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Analysis failed (HTTP ${resp.status})`);
      displayItemsChecklist(data.items); imageWorkflowState = "analyzed";
      if (els.go) els.go.textContent = "Generate Style";
      setStatus("Analysis complete. Select items and generate.");
    } catch (e) {
      setStatus(e.name === "AbortError" ? "Timed out. Please try again." : e.message);
      resetImageWorkflow();
    } finally { clearTimeout(t); setLoading(false); }
  }

  function displayItemsChecklist(items) {
    if (!els.itemsChecklist || !els.itemsChecklistContainer) return;
    els.itemsChecklist.innerHTML = "";
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "flex items-center gap-2";
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.id = `item-checkbox-${index}`; cb.checked = true; cb.className = "w-4 h-4 accent-accent";
      const txt = document.createElement("input");
      txt.type = "text"; txt.id = `item-text-${index}`; txt.value = item;
      txt.className = "w-full px-2 py-1.5 rounded-md bg-neutral-900 ring-1 ring-neutral-800";
      row.appendChild(cb); row.appendChild(txt);
      els.itemsChecklist.appendChild(row);
    });
    els.itemsChecklistContainer.classList.remove("hidden");
  }

  /* ---------- Events ---------- */
  els.go?.addEventListener("click", () => {
    try {
      if (els.modeTextRadio?.checked) {
        lastMode = "text";
        const payload = readTextPayload(); persistProfile(payload);
        clearSelection(); // starting a new batch clears any previous selection
        runTextGeneration(payload, false);
      } else {
        lastMode = "image";
        if (imageWorkflowState === "idle" || imageWorkflowState === "generating") {
          const imageFiles = window.stagedFiles;
          if (!imageFiles || imageFiles.length === 0) throw new Error("Please upload at least one image.");
          const payload = readImagePayload(); persistProfile(payload);
          stagedFormData = new FormData();
          for (const f of imageFiles) stagedFormData.append("image_files", f);
          for (const k in payload) if (payload[k] !== null) stagedFormData.append(k, payload[k]);
          runAnalysis(stagedFormData);
        } else if (imageWorkflowState === "analyzed") {
          const selectedItems = []; const deselectedItems = [];
          els.itemsChecklist?.querySelectorAll("div").forEach((div) => {
            const cb = div.querySelector('input[type="checkbox"]');
            const tx = div.querySelector('input[type="text"]');
            (cb.checked ? selectedItems : deselectedItems).push(tx.value.trim());
          });
          if (selectedItems.length === 0) throw new Error("Please select at least one item.");
          stagedFormData.append("itemText", selectedItems.join(", "));
          if (deselectedItems.length > 0) stagedFormData.append("deselectedItems", deselectedItems.join(", "));
          runImageGeneration(stagedFormData);
        }
      }
    } catch (e) {
      setStatus(e.message);
    }
  });

  els.regen?.addEventListener("click", () => {
    if (!lastPayload || lastMode !== "text") return;
    try {
      if (selectedIndex != null && lastImages[selectedIndex]) {
        // Targeted replace: request 1 image and indicate which index to replace
        const singlePayload = { ...lastPayload, batch: 1, __replaceIndex: selectedIndex };
        runTextGeneration(singlePayload, true);
      } else {
        // No selection: full regen with last payload
        runTextGeneration(lastPayload, true);
      }
    } catch (e) { setStatus(e.message); }
  });
})();
