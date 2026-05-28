// Рендер публичной части сайта
function bootApp() {
  const membersList = document.getElementById('members-list');
  const tripsList = document.getElementById('trips-list');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/`/g, '&#96;'); }

  // Reveal-on-scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  function observeReveals(root) {
    (root || document).querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
  }

  function renderMembers() {
    if (!membersList) return;
    const items = Store.getMembers();
    membersList.innerHTML = items.map((m, i) => `
      <div class="member reveal" style="transition-delay:${i * 0.08}s">
        <div class="avatar">
          ${m.photo
            ? `<img src="${escapeHtml(m.photo)}" alt="${escapeHtml(m.name)}">`
            : `<span class="avatar-letter">${escapeHtml((m.name || '?')[0])}</span>`}
        </div>
        <h4>${escapeHtml(m.name)}</h4>
        <p>${escapeHtml(m.role)}${m.age ? `, ${m.age}` : ''}</p>
      </div>
    `).join('');
    observeReveals(membersList);
  }

  function renderTrips() {
    if (!tripsList) return;
    const items = Store.getTrips();
    tripsList.innerHTML = items.map((t, i) => `
      <article class="trip reveal" style="transition-delay:${i * 0.08}s">
        <div class="trip-img" style="background-image:url('${escapeAttr(t.photo || '')}')"></div>
        <div class="trip-body">
          <div class="trip-date">${escapeHtml(t.date)}</div>
          <h3>${escapeHtml(t.title)}</h3>
          <p>${escapeHtml(t.description)}</p>
          <div class="trip-price">${escapeHtml(t.price)}</div>
        </div>
      </article>
    `).join('');
    observeReveals(tripsList);
  }

  function renderHistory() {
    if (!historyList) return;
    const items = Store.getHistory().slice().sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
    if (historyEmpty) historyEmpty.style.display = items.length ? 'none' : 'block';
    historyList.innerHTML = items.map((h, i) => `
      <article class="history-item reveal ${i % 2 ? 'right' : 'left'}" style="transition-delay:${i * 0.05}s">
        <div class="history-dot"></div>
        <div class="history-card">
          ${h.photo ? `<div class="history-img" style="background-image:url('${escapeAttr(h.photo)}')"></div>` : ''}
          <div class="history-body">
            <div class="history-year">${escapeHtml(h.year || '')}</div>
            <h3>${escapeHtml(h.title)}</h3>
            <div class="history-date">${escapeHtml(h.date || '')}</div>
            <p>${escapeHtml(h.description)}</p>
            ${h.participants ? `<div class="history-participants">✦ участниц: ${escapeHtml(h.participants)}</div>` : ''}
          </div>
        </div>
      </article>
    `).join('');
    observeReveals(historyList);
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Stars
  const stars = document.querySelector('.stars');
  if (stars && !stars.dataset.populated) {
    stars.dataset.populated = '1';
    for (let i = 0; i < 80; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.style.top = Math.random() * 100 + '%';
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 5) + 's';
      s.style.animationDuration = (2 + Math.random() * 4) + 's';
      s.style.opacity = 0.2 + Math.random() * 0.7;
      stars.appendChild(s);
    }
  }

  // File → compressed data URL
  function fileToDataUrl(file, maxSize = 800, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      if (!/^image\//.test(file.type)) return reject(new Error('Это не картинка'));
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Не удалось прочитать картинку'));
        img.onload = () => {
          const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Public photo uploader on application form
  (function initPublicPhotoUploader() {
    const root = document.getElementById('public-photo');
    if (!root || root.dataset.init) return;
    root.dataset.init = '1';
    const preview = document.getElementById('public-photo-preview');
    const input = document.getElementById('public-photo-input');
    const value = document.getElementById('public-photo-value');
    const clear = document.getElementById('public-photo-clear');

    function setImage(dataUrl) {
      value.value = dataUrl || '';
      if (dataUrl) {
        preview.style.backgroundImage = `url('${dataUrl}')`;
        preview.innerHTML = '';
        root.classList.add('has-image');
        clear.style.display = '';
      } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<div class="public-photo-placeholder">Перетащите файл сюда или нажмите, чтобы выбрать</div>';
        root.classList.remove('has-image');
        clear.style.display = 'none';
      }
    }

    async function handleFile(file) {
      try {
        root.classList.add('loading');
        const dataUrl = await fileToDataUrl(file, 900, 0.82);
        setImage(dataUrl);
      } catch (err) {
        alert('Не удалось загрузить картинку: ' + err.message);
      } finally {
        root.classList.remove('loading');
      }
    }

    preview.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (f) handleFile(f);
      input.value = '';
    });
    clear.addEventListener('click', () => setImage(''));

    ['dragenter', 'dragover'].forEach(ev => root.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      root.classList.add('drag');
    }));
    ['dragleave', 'drop'].forEach(ev => root.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      root.classList.remove('drag');
    }));
    root.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  })();

  // Application form
  const form = document.getElementById('application-form');
  if (form && !form.dataset.init) {
    form.dataset.init = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const tgUser = window.__tgUser || null;
      // Нормализуем ник: убираем @ и пробелы
      const rawTg = (fd.get('telegram') || '').toString().trim().replace(/^@/, '');
      const application = {
        name: (fd.get('name') || '').toString().trim(),
        age: parseInt(fd.get('age'), 10) || null,
        role: (fd.get('role') || '').toString().trim(),
        phone: (fd.get('phone') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        telegram: rawTg,
        photo: (fd.get('photo') || '').toString(),
        story: (fd.get('story') || '').toString().trim(),
        // Если форма открыта внутри Telegram Mini App — добавим точный id и username
        telegramId: tgUser ? tgUser.id : null,
        telegramUsername: tgUser ? (tgUser.username || null) : (rawTg || null),
        telegramName: tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : null,
      };
      try {
        await Store.addApplication(application);
      } catch (err) {
        if (err && err.name === 'QuotaExceededError') {
          alert('Не хватает места — попробуйте отправить анкету без фото.');
          return;
        }
        alert('Не удалось отправить: ' + (err.message || err));
        return;
      }
      form.reset();
      const preview = document.getElementById('public-photo-preview');
      const value = document.getElementById('public-photo-value');
      const clear = document.getElementById('public-photo-clear');
      if (preview && value && clear) {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<div class="public-photo-placeholder">Перетащите файл сюда или нажмите, чтобы выбрать</div>';
        value.value = '';
        clear.style.display = 'none';
        document.getElementById('public-photo').classList.remove('has-image');
      }
      document.getElementById('thanks').style.display = 'block';
      setTimeout(() => { document.getElementById('thanks').style.display = 'none'; }, 5000);
    });
  }

  // Реактивная подписка на изменения в облаке/локально
  Store.onMembersChange(renderMembers);
  Store.onTripsChange(renderTrips);
  Store.onHistoryChange(renderHistory);
  observeReveals(document);
}

// Ждём готовности Store (cloud init может быть асинхронным)
if (window.Store) bootApp();
else window.addEventListener('store-ready', bootApp, { once: true });
