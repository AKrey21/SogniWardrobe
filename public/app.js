// public/app.js
(function(){
  const gender = document.getElementById('gender');
  const style  = document.getElementById('style');
  const item   = document.getElementById('item');
  const batch  = document.getElementById('batch');
  const go     = document.getElementById('go');
  const regen  = document.getElementById('regen');
  const loading= document.getElementById('loading');
  const images = document.getElementById('images');
  const status = document.getElementById('status');

  let lastPayload = null;

  function setLoading(v){
    loading.classList.toggle('hidden', !v);
    go.disabled = v; regen.disabled = v;
  }

  function showImages(list){
    images.innerHTML = '';
    for (const url of list) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Generated outfit';
      images.appendChild(img);
    }
  }

  async function run(payload){
    setLoading(true);
    status.textContent = 'Generating...';
    try {
      const resp = await fetch('/api/generate', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Generation failed');
      lastPayload = payload; // remember last
      showImages(data.images || []);
      status.textContent = `Done • ${payload.batch} image(s) for “${payload.itemText}” in ${payload.style} (${payload.gender})`;
    } catch (e) {
      status.textContent = 'Error: ' + e.message;
    } finally {
      setLoading(false);
    }
  }

  go.addEventListener('click', () => {
    const payload = {
      gender: gender.value,
      style: style.value,
      itemText: item.value.trim() || 't-shirt',
      batch: Number(batch.value)
    };
    run(payload);
  });

  regen.addEventListener('click', () => {
    if (!lastPayload) {
      status.textContent = 'Nothing to regenerate yet. Click Generate first.';
      return;
    }
    run(lastPayload);
  });
})();
