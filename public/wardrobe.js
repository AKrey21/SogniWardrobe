// public/wardrobe.js
// Wardrobe store + UI helpers, now with backward-compatible APIs:
// - isSaved(url), save(url) retained for old callers
// - Persists to localStorage
// - Exposes window.Wardrobe and keeps window.WARDROBE_ITEMS in sync

(function () {
  const STORE_KEY = "sogni-wardrobe.items";

  /* ------------------------ storage ------------------------ */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      // Back-compat: if it was an array of URLs, normalize
      if (raw.length && typeof raw[0] === "string") {
        return raw.map((url) => ({ id: idFrom(url), name: "", imageUrl: url }));
      }
      return raw;
    } catch {
      return [];
    }
  }
  function saveItems(items) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(items));
    } catch {}
  }
  function idFrom(s) {
    return (s || Math.random().toString(36)).replace(/\W+/g, "").slice(-12);
  }

  /* ------------------------ state -------------------------- */
  let items = load(); // [{id,name,imageUrl}]
  syncGlobal();

  function emit() {
    document.dispatchEvent(
      new CustomEvent("wardrobe:update", { detail: { items } })
    );
    syncGlobal();
  }
  function syncGlobal() {
    // What Lookbook sidebar consumes
    window.WARDROBE_ITEMS = items.map((it) => ({
      id: it.id,
      name: it.name || "",
      imageUrl: it.imageUrl,
    }));
  }

  /* --------------------- slideshow UI ---------------------- */
  const Slideshow = (() => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;z-index:9999;";
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;">
        <img id="ss-img" alt="Look"
             style="max-width:94vw;max-height:92vh;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.4);object-fit:contain"/>
        <button id="ss-close"  style="position:absolute;top:14px;right:14px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25)">Close (Esc)</button>
        <button id="ss-prev"   style="position:absolute;left:14px;top:50%;transform:translateY(-50%);padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25)">‹ Prev</button>
        <button id="ss-next"   style="position:absolute;right:14px;top:50%;transform:translateY(-50%);padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25)">Next ›</button>
        <div id="ss-counter"   style="position:absolute;bottom:14px;color:rgba(255,255,255,.8);font-size:13px;background:rgba(255,255,255,.1);padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.25)"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const img = overlay.querySelector("#ss-img");
    const btnClose = overlay.querySelector("#ss-close");
    const btnPrev = overlay.querySelector("#ss-prev");
    const btnNext = overlay.querySelector("#ss-next");
    const counter = overlay.querySelector("#ss-counter");

    let urls = [],
      i = 0;

    function show(k) {
      if (!urls.length) return;
      i = (k + urls.length) % urls.length;
      img.src = urls[i];
      counter.textContent = `${i + 1} / ${urls.length}`;
      new Image().src = urls[(i + 1) % urls.length];
      new Image().src = urls[(i - 1 + urls.length) % urls.length];
    }
    function open(list, start = 0) {
      urls = list || [];
      if (!urls.length) return;
      overlay.style.display = "block";
      show(start);
    }
    function close() {
      overlay.style.display = "none";
      img.src = "";
      urls = [];
    }

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", () => show(i - 1));
    btnNext.addEventListener("click", () => show(i + 1));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (overlay.style.display !== "block") return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });

    return { open };
  })();

  /* ---------------------- public API ----------------------- */
  const Wardrobe = {
    /** Array of {id,name,imageUrl} */
    getAll() {
      return items.slice();
    },
    /** URLs only */
    getUrls() {
      return items.map((it) => it.imageUrl);
    },

    /** Back-compat: is this URL saved? */
    isSaved(url) {
      return items.some((x) => x.imageUrl === url);
    },

    /** Add by URL or object {name?, imageUrl} */
    add(input) {
      const it =
        typeof input === "string"
          ? { id: idFrom(input), name: "", imageUrl: input }
          : {
              id: input.id || idFrom(input.imageUrl || Math.random()),
              name: input.name || "",
              imageUrl: input.imageUrl,
            };
      if (!it.imageUrl) return;
      if (!this.isSaved(it.imageUrl)) {
        items.push(it);
        saveItems(items);
        emit();
      }
    },

    /** Back-compat alias for add(url) */
    save(url) {
      this.add(url);
    },

    /** Remove by url or id */
    remove(ref) {
      const before = items.length;
      items = items.filter((x) => x.id !== ref && x.imageUrl !== ref);
      if (items.length !== before) {
        saveItems(items);
        emit();
      }
    },

    /** Toggle by URL */
    toggle(url) {
      this.isSaved(url) ? this.remove(url) : this.add(url);
    },

    clear() {
      items = [];
      saveItems(items);
      emit();
    },

    /** Subscribe to changes */
    onChange(fn) {
      document.addEventListener("wardrobe:update", fn);
      return () => document.removeEventListener("wardrobe:update", fn);
    },

    /** Slideshow of all saved looks */
    viewAll() {
      const urls = this.getUrls();
      if (!urls.length) return alert("No saved looks yet.");
      Slideshow.open(urls, 0);
    },

    /** Optional grid renderer */
    mountGrid(container) {
      const render = () => {
        const urls = this.getUrls();
        if (!urls.length) {
          container.innerHTML =
            '<div style="color:#8b8b8b;font-size:14px">No saved looks yet.</div>';
          return;
        }
        container.innerHTML = urls
          .map(
            (u) => `
          <div style="position:relative;aspect-ratio:3/4;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8;margin:4px;cursor:zoom-in;display:inline-block;width:160px;">
            <img src="${u}" alt="Saved look" style="width:100%;height:100%;object-fit:cover;display:block"/>
            <button data-remove="${u}" style="position:absolute;top:6px;right:6px;padding:6px 8px;border-radius:10px;background:rgba(0,0,0,.6);color:#fff;border:1px solid rgba(255,255,255,.2);font-size:12px">
              Remove
            </button>
          </div>
        `
          )
          .join("");
        container
          .querySelectorAll("[data-remove]")
          .forEach((btn) =>
            btn.addEventListener("click", () =>
              Wardrobe.remove(btn.getAttribute("data-remove"))
            )
          );
      };

      container.addEventListener("dblclick", (e) => {
        const img = e.target.closest("img");
        if (!img?.src) return;
        const urls = Wardrobe.getUrls();
        const start = urls.indexOf(img.src);
        if (start >= 0) Slideshow.open(urls, start);
      });

      this.onChange(render);
      render();
    },
  };

  // Expose globally
  window.Wardrobe = Wardrobe;

  // Optional: support data-save-look buttons anywhere in the site
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-save-look]");
    if (!btn) return;
    const url = btn.getAttribute("data-save-look");
    Wardrobe.toggle(url);
  });
})();
