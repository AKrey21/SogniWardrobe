// public/wardrobe.js
(function () {
  const STORE_KEY = 'sogni-wardrobe.saved';

  const load = () => { try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')); } catch { return new Set(); } };
  const persist = (set) => { try { localStorage.setItem(STORE_KEY, JSON.stringify([...set])); } catch {} };

  /* ---------------- Slideshow (overlay) ---------------- */
  const Slideshow = (() => {
    // Create once
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[9999] hidden bg-black/90';
    overlay.innerHTML = `
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <img id="ss-img" alt="Look" class="max-w-[94vw] max-h-[92vh] rounded-xl shadow-2xl object-contain"/>
        <button id="ss-close" class="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm ring-1 ring-white/20 hover:bg-white/20">Close (Esc)</button>
        <button id="ss-prev"  class="absolute left-4  top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm ring-1 ring-white/20 hover:bg-white/20">‹ Prev</button>
        <button id="ss-next"  class="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm ring-1 ring-white/20 hover:bg-white/20">Next ›</button>
        <div id="ss-counter" class="absolute bottom-4 text-white/80 text-sm bg-white/10 px-2.5 py-1 rounded-lg ring-1 ring-white/20"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const img = overlay.querySelector('#ss-img');
    const btnClose = overlay.querySelector('#ss-close');
    const btnPrev  = overlay.querySelector('#ss-prev');
    const btnNext  = overlay.querySelector('#ss-next');
    const counter  = overlay.querySelector('#ss-counter');

    let urls = [];
    let i = 0;

    function show(k) {
      if (!urls.length) return;
      i = (k + urls.length) % urls.length;
      img.src = urls[i];
      counter.textContent = `${i + 1} / ${urls.length}`;
      // Preload neighbors (snappy)
      new Image().src = urls[(i + 1) % urls.length];
      new Image().src = urls[(i - 1 + urls.length) % urls.length];
    }
    function open(list, start = 0) {
      urls = list || [];
      if (!urls.length) return;
      overlay.classList.remove('hidden');
      show(start);
    }
    function close() {
      overlay.classList.add('hidden');
      img.src = '';
      urls = [];
    }

    // interactions
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(i - 1));
    btnNext.addEventListener('click', () => show(i + 1));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft')  show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });

    return { open };
  })();

  /* ---------------- Wardrobe core ---------------- */
  const Wardrobe = {
    _set: load(),
    getAll() { return [...this._set]; },
    isSaved(url) { return this._set.has(url); },
    save(url) { this._set.add(url); persist(this._set); this._emit(); },
    remove(url) { this._set.delete(url); persist(this._set); this._emit(); },
    toggle(url) { this.isSaved(url) ? this.remove(url) : this.save(url); },
    onChange(fn) { document.addEventListener('wardrobe:update', fn); return () => document.removeEventListener('wardrobe:update', fn); },
    _emit() { document.dispatchEvent(new CustomEvent('wardrobe:update')); },

    viewAll() {
      const urls = this.getAll();
      if (!urls.length) return alert('No saved looks yet.');
      Slideshow.open(urls, 0);
    },

    mountGrid(container) {
      const render = () => {
        const urls = this.getAll();
        container.innerHTML = urls.length
          ? urls.map(u => `
              <div class="relative group aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-white/10 cursor-zoom-in">
                <img src="${u}" alt="Saved look" class="w-full h-full object-cover"/>
                <button data-remove="${u}"
                        class="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 text-xs ring-1 ring-white/15 hover:bg-black/80">
                  Remove
                </button>
              </div>
            `).join('')
          : `<div class="text-sm text-neutral-400">No saved looks yet. Click “♡ Save” on any image.</div>`;

        container.querySelectorAll('[data-remove]').forEach(btn =>
          btn.addEventListener('click', () => this.remove(btn.dataset.remove))
        );
      };

      // Double-click a saved thumbnail to open slideshow at that image
      container.addEventListener('dblclick', (e) => {
        const img = e.target.closest('img');
        if (!img?.src) return;
        const urls = this.getAll();
        const start = urls.indexOf(img.src);
        if (start >= 0) Slideshow.open(urls, start);
      });

      // Bind the "View all" button if present
      const viewBtn = document.getElementById('view-wardrobe');
      if (viewBtn && !viewBtn.dataset.boundViewAll) {
        viewBtn.dataset.boundViewAll = '1';
        viewBtn.addEventListener('click', () => this.viewAll());
      }

      this.onChange(render);
      render();
    }
  };

  window.Wardrobe = Wardrobe; // expose globally
})();
