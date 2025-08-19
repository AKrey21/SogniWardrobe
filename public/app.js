// public/app.js
(function () {
  const els = {
    gender: document.getElementById('gender'),
    race: document.getElementById('race'),
    complexion: document.getElementById('complexion'),
    height: document.getElementById('height'),
    weight: document.getElementById('weight'),
    style: document.getElementById('style'),
    item: document.getElementById('item'),
    batch: document.getElementById('batch'),
    go: document.getElementById('go'),
    regen: document.getElementById('regen'),
    loading: document.getElementById('loading'),
    images: document.getElementById('images'),
    status: document.getElementById('status'),
  };

  const STORE_KEY = 'sogni-wardrobe.profile';
  let lastPayload = null;

  hydrate();
  setRegenEnabled(false);

  function setLoading(v) {
    els.loading.classList.toggle('hidden', !v);
    els.go.disabled = v;
    els.regen.disabled = v || !lastPayload;
  }

  function setRegenEnabled(v) {
    els.regen.disabled = !v;
  }

  function showImages(list) {
    els.images.innerHTML = '';
    for (const url of (list || [])) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Generated outfit';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      els.images.appendChild(img);
    }
  }

  function validateNumbers(h, w) {
    if (h != null && (h < 140 || h > 210)) return 'Height should be between 140–210 cm';
    if (w != null && (w < 35 || w > 160)) return 'Weight should be between 35–160 kg';
    return null;
  }

  function clampBatch(n) {
    const x = Number.isFinite(n) ? n : 3;
    return Math.max(1, Math.min(x, 6));
  }

  function toNullableNumber(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function readPayload() {
    const heightCm = toNullableNumber(els.height.value);
    const weightKg = toNullableNumber(els.weight.value);

    const err = validateNumbers(heightCm, weightKg);
    if (err) throw new Error(err);

    return {
      gender: els.gender.value,
      style: els.style.value,
      itemText: (els.item.value || '').trim() || 't-shirt',
      batch: clampBatch(Number(els.batch.value)),
      race: els.race.value,
      complexion: els.complexion.value,
      heightCm,   // null when empty
      weightKg,   // null when empty
    };
  }

  function persistProfile(p) {
    const keep = {
      gender: p.gender,
      race: p.race,
      complexion: p.complexion,
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      style: p.style,
    };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(keep)); } catch {}
  }

  function hydrate() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.gender) els.gender.value = p.gender;
      if (p.race) els.race.value = p.race;
      if (p.complexion) els.complexion.value = p.complexion;
      if (p.heightCm != null) els.height.value = p.heightCm;
      if (p.weightKg != null) els.weight.value = p.weightKg;
      if (p.style) els.style.value = p.style;
    } catch {}
  }

  async function run(payload, isRegen = false) {
    setLoading(true);
    els.status.textContent = isRegen ? 'Regenerating…' : 'Generating…';

    // fetch timeout (15s)
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || `Generation failed (HTTP ${resp.status})`);

      lastPayload = { ...payload };
      setRegenEnabled(true);

      showImages(data.images || []);
      els.status.textContent =
        `Done • ${payload.batch} image(s) for “${payload.itemText}” in ${payload.style} (${payload.gender})`;
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'Request timed out. Please try again.' : e.message;
      els.status.innerHTML = `<span class="err">Error:</span> ${msg}`;
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  }

  els.go.addEventListener('click', () => {
    try {
      const payload = readPayload();
      persistProfile(payload);
      run(payload, false);
    } catch (e) {
      els.status.innerHTML = `<span class="err">${e.message}</span>`;
    }
  });

  els.regen.addEventListener('click', () => {
    try {
      const payload = lastPayload || readPayload();
      run(payload, true);
    } catch (e) {
      els.status.innerHTML = `<span class="err">${e.message}</span>`;
    }
  });
})();
