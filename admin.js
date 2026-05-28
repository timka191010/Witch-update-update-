(function () {
  // ============================================
  // АВТОРИЗАЦИЯ
  // ============================================
  // Пароль по умолчанию: vedmy2026
  // Чтобы поменять — введите новый пароль в консоли:
  //   await setAdminPassword('новый-пароль')
  // и обновите страницу.
  //
  // Внимание: это клиентская защита (защита от случайных гостей).
  // Любой, кто откроет devtools, может обойти проверку.
  // Для реальной защиты нужен бэкенд.

  const PASSWORD_HASH_KEY = 'vedmy_admin_pwd_hash';
  const SESSION_KEY = 'vedmy_admin_session';
  const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 дней
  const DEFAULT_PASSWORD = 'vedmy2026';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function getStoredHash() {
    return localStorage.getItem(PASSWORD_HASH_KEY) || (await sha256(DEFAULT_PASSWORD));
  }

  // Утилита для смены пароля из консоли
  window.setAdminPassword = async function (newPassword) {
    if (!newPassword || newPassword.length < 4) {
      console.warn('Пароль должен быть минимум 4 символа');
      return;
    }
    const hash = await sha256(newPassword);
    localStorage.setItem(PASSWORD_HASH_KEY, hash);
    console.log('✓ Пароль обновлён. Не забудьте его 🔑');
  };

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.expires < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch { return null; }
  }

  function setSession(remember) {
    const ttl = remember ? SESSION_TTL_MS : 1000 * 60 * 60 * 4; // 4 часа если не помнить
    localStorage.setItem(SESSION_KEY, JSON.stringify({ expires: Date.now() + ttl }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  const loginGate = document.getElementById('login-gate');
  const adminWrap = document.getElementById('admin-wrap');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginPassword = document.getElementById('login-password');
  const loginRemember = document.getElementById('login-remember');

  function showAdmin() {
    loginGate.style.display = 'none';
    adminWrap.style.display = '';
    initAdmin();
  }

  function showLogin() {
    loginGate.style.display = '';
    adminWrap.style.display = 'none';
    loginPassword.value = '';
    setTimeout(() => loginPassword.focus(), 50);
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const entered = loginPassword.value;
    const enteredHash = await sha256(entered);
    const storedHash = await getStoredHash();
    if (enteredHash === storedHash) {
      setSession(loginRemember.checked);
      showAdmin();
    } else {
      loginError.style.display = 'block';
      loginPassword.value = '';
      loginPassword.focus();
      loginForm.classList.add('shake');
      setTimeout(() => loginForm.classList.remove('shake'), 400);
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    showLogin();
  });

  // Gate check
  if (getSession()) {
    showAdmin();
  } else {
    showLogin();
  }

  // ============================================
  // АДМИН-ПАНЕЛЬ (запускается после успешного входа)
  // ============================================
  function initAdmin() {
    if (initAdmin._done) return;
    initAdmin._done = true;
    if (window.Store) bootAdmin();
    else window.addEventListener('store-ready', bootAdmin, { once: true });
  }

  function bootAdmin() {
  // ---------- Tabs ----------
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
  }));

  // ---------- Counters ----------
  function refreshCounts() {
    document.getElementById('apps-count').textContent = Store.getApplications().filter(a => a.status === 'new').length;
    document.getElementById('members-count').textContent = Store.getMembers().length;
    document.getElementById('trips-count').textContent = Store.getTrips().length;
    document.getElementById('history-count').textContent = Store.getHistory().length;
  }

  // ---------- Helpers ----------
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso; }
  }

  // ---------- File → compressed DataURL ----------
  // Уменьшает картинку до maxSize px и кодирует в jpeg, чтобы не забить localStorage.
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
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Renders a single image upload control inside the modal form.
  // The control hides a <input type="file"> and uses two hidden inputs:
  //   - <input name="photo"> contains current value (URL or dataURL)
  //   - drag-and-drop + preview UI
  function photoFieldHTML(initial) {
    const has = !!initial;
    return `
      <label class="photo-field">
        <span class="photo-label">Фото</span>
        <div class="photo-uploader ${has ? 'has-image' : ''}" data-photo-uploader>
          <div class="photo-preview" data-photo-preview style="${has ? `background-image:url('${esc(initial)}')` : ''}">
            ${has ? '' : '<div class="photo-placeholder">Перетащите файл сюда<br>или нажмите, чтобы выбрать</div>'}
          </div>
          <div class="photo-actions">
            <button type="button" class="btn-secondary photo-pick-btn" data-photo-pick>Выбрать файл</button>
            <button type="button" class="btn-danger photo-clear-btn" data-photo-clear style="${has ? '' : 'display:none;'}">Удалить</button>
          </div>
          <input type="file" accept="image/*" data-photo-input style="display:none;">
          <input type="hidden" name="photo" value="${esc(initial || '')}">
        </div>
        <span class="photo-hint">Можно перетащить картинку или вставить из буфера (Cmd/Ctrl+V).</span>
      </label>
    `;
  }

  function initPhotoField(container) {
    const root = container.querySelector('[data-photo-uploader]');
    if (!root) return;
    const preview = root.querySelector('[data-photo-preview]');
    const fileInput = root.querySelector('[data-photo-input]');
    const hidden = root.querySelector('input[name="photo"]');
    const pickBtn = root.querySelector('[data-photo-pick]');
    const clearBtn = root.querySelector('[data-photo-clear]');

    function setImage(dataUrl) {
      hidden.value = dataUrl || '';
      if (dataUrl) {
        preview.style.backgroundImage = `url('${dataUrl}')`;
        preview.innerHTML = '';
        root.classList.add('has-image');
        clearBtn.style.display = '';
      } else {
        preview.style.backgroundImage = '';
        preview.innerHTML = '<div class="photo-placeholder">Перетащите файл сюда<br>или нажмите, чтобы выбрать</div>';
        root.classList.remove('has-image');
        clearBtn.style.display = 'none';
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

    pickBtn.addEventListener('click', () => fileInput.click());
    preview.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) handleFile(f);
      fileInput.value = '';
    });
    clearBtn.addEventListener('click', () => setImage(''));

    // Drag & drop
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

    // Paste
    function pasteHandler(e) {
      if (!document.body.contains(root)) {
        document.removeEventListener('paste', pasteHandler);
        return;
      }
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.indexOf('image/') === 0) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    }
    document.addEventListener('paste', pasteHandler);
  }

  // ---------- Applications ----------
  const appsList = document.getElementById('apps-list');
  const appsEmpty = document.getElementById('apps-empty');

  function renderApps() {
    const apps = Store.getApplications().slice().reverse();
    appsEmpty.style.display = apps.length ? 'none' : 'block';
    appsList.innerHTML = apps.map(a => `
      <div class="app-card">
        <div class="app-head">
          <div>
            <div class="app-name">${esc(a.name)}</div>
            <div class="app-meta">${formatDate(a.createdAt)}</div>
          </div>
          <span class="status-pill ${esc(a.status)}">${
            a.status === 'new' ? 'новая' : a.status === 'accepted' ? 'принята' : 'отклонена'
          }</span>
        </div>
        <div class="app-fields">
          ${a.age   ? `<div><strong>Возраст:</strong> ${esc(a.age)}</div>` : ''}
          ${a.role  ? `<div><strong>Роль:</strong> ${esc(a.role)}</div>` : ''}
          ${a.phone ? `<div><strong>Телефон:</strong> ${esc(a.phone)}</div>` : ''}
          ${a.email ? `<div><strong>Email:</strong> ${esc(a.email)}</div>` : ''}
          ${a.photo ? `<div><strong>Фото:</strong> <a href="${esc(a.photo)}" target="_blank" style="color:#d8c2a0">смотреть</a></div>` : ''}
        </div>
        ${a.story ? `<div class="app-story">${esc(a.story)}</div>` : ''}
        <div class="app-actions">
          ${a.status === 'new' ? `
            <button class="btn-accept" data-action="accept" data-id="${a.id}">✓ Принять в клуб</button>
            <button class="btn-secondary" data-action="reject" data-id="${a.id}">Отклонить</button>
          ` : ''}
          <button class="btn-danger" data-action="delete-app" data-id="${a.id}">Удалить</button>
        </div>
      </div>
    `).join('');
  }

  appsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const app = Store.getApplications().find(a => a.id === id);
    if (!app) return;

    if (action === 'accept') {
      await Store.addMember({
        name: app.name,
        role: app.role,
        age: app.age || null,
        photo: app.photo || '',
      });
      await Store.updateApplication(id, { status: 'accepted' });
    } else if (action === 'reject') {
      await Store.updateApplication(id, { status: 'rejected' });
    } else if (action === 'delete-app') {
      if (!confirm('Удалить заявку?')) return;
      await Store.removeApplication(id);
    }
    // Перерисовка случится автоматически через onSnapshot/listeners
  });

  // ---------- Members ----------
  const membersListEl = document.getElementById('members-admin-list');
  const membersEmpty = document.getElementById('members-empty');

  function renderMembers() {
    const items = Store.getMembers();
    membersEmpty.style.display = items.length ? 'none' : 'block';
    membersListEl.innerHTML = items.map(m => `
      <div class="admin-card">
        <div class="preview" style="${m.photo ? `background-image:url('${esc(m.photo)}')` : 'display:flex;align-items:center;justify-content:center;font-family:Cormorant Garamond,serif;font-size:60px;color:#d8c2a0;'}">
          ${!m.photo ? esc((m.name || '?')[0]) : ''}
        </div>
        <div class="body">
          <h4>${esc(m.name)}</h4>
          <div class="sub">${esc(m.role)}${m.age ? `, ${esc(m.age)}` : ''}</div>
        </div>
        <div class="card-actions">
          <button class="btn-secondary" data-action="edit-member" data-id="${m.id}">Изменить</button>
          <button class="btn-danger" data-action="delete-member" data-id="${m.id}">Удалить</button>
        </div>
      </div>
    `).join('');
  }

  membersListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit-member') openMemberForm(id);
    if (btn.dataset.action === 'delete-member') {
      if (!confirm('Удалить участницу?')) return;
      await Store.removeMember(id);
    }
  });

  document.getElementById('add-member-btn').addEventListener('click', () => openMemberForm());

  function openMemberForm(id) {
    const member = id ? Store.getMembers().find(m => m.id === id) : { name: '', role: '', age: '', photo: '' };
    if (!member) return;
    showModal(id ? 'Изменить участницу' : 'Добавить участницу', `
      <label>Имя
        <input name="name" required value="${esc(member.name)}">
      </label>
      <label>Роль (например: травница)
        <input name="role" required value="${esc(member.role)}">
      </label>
      <label>Возраст
        <input name="age" type="number" min="18" max="120" value="${esc(member.age || '')}">
      </label>
      ${photoFieldHTML(member.photo)}
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-close>Отмена</button>
        <button type="submit" class="btn-primary">${id ? 'Сохранить' : 'Добавить'}</button>
      </div>
    `, async (data) => {
      const payload = {
        name: data.name.trim(),
        role: data.role.trim(),
        age: data.age ? parseInt(data.age, 10) : null,
        photo: (data.photo || '').trim(),
      };
      if (id) await Store.updateMember(id, payload);
      else await Store.addMember(payload);
    });
  }

  // ---------- Trips ----------
  const tripsListEl = document.getElementById('trips-admin-list');
  const tripsEmpty = document.getElementById('trips-empty');

  function renderTrips() {
    const items = Store.getTrips();
    tripsEmpty.style.display = items.length ? 'none' : 'block';
    tripsListEl.innerHTML = items.map(t => `
      <div class="admin-card">
        <div class="preview" style="background-image:url('${esc(t.photo || '')}')"></div>
        <div class="body">
          <h4>${esc(t.title)}</h4>
          <div class="sub">${esc(t.date)} · ${esc(t.price)}</div>
          <div class="desc">${esc(t.description)}</div>
        </div>
        <div class="card-actions">
          <button class="btn-secondary" data-action="edit-trip" data-id="${t.id}">Изменить</button>
          <button class="btn-danger" data-action="delete-trip" data-id="${t.id}">Удалить</button>
        </div>
      </div>
    `).join('');
  }

  tripsListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit-trip') openTripForm(id);
    if (btn.dataset.action === 'delete-trip') {
      if (!confirm('Удалить выезд?')) return;
      await Store.removeTrip(id);
    }
  });

  document.getElementById('add-trip-btn').addEventListener('click', () => openTripForm());

  function openTripForm(id) {
    const trip = id ? Store.getTrips().find(t => t.id === id) : { date: '', title: '', description: '', price: '', photo: '' };
    if (!trip) return;
    showModal(id ? 'Изменить выезд' : 'Добавить выезд', `
      <label>Дата (например: июнь 2026)
        <input name="date" required value="${esc(trip.date)}">
      </label>
      <label>Название
        <input name="title" required value="${esc(trip.title)}">
      </label>
      <label>Описание
        <textarea name="description" rows="3" required>${esc(trip.description)}</textarea>
      </label>
      <label>Цена (например: от 85 000 ₽)
        <input name="price" required value="${esc(trip.price)}">
      </label>
      ${photoFieldHTML(trip.photo)}
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-close>Отмена</button>
        <button type="submit" class="btn-primary">${id ? 'Сохранить' : 'Добавить'}</button>
      </div>
    `, async (data) => {
      const payload = {
        date: data.date.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        price: data.price.trim(),
        photo: (data.photo || '').trim(),
      };
      if (id) await Store.updateTrip(id, payload);
      else await Store.addTrip(payload);
    });
  }

  // ---------- History ----------
  const historyListEl = document.getElementById('history-admin-list');
  const historyEmpty = document.getElementById('history-admin-empty');

  function renderHistoryAdmin() {
    const items = Store.getHistory().slice().sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
    historyEmpty.style.display = items.length ? 'none' : 'block';
    historyListEl.innerHTML = items.map(h => `
      <div class="admin-card">
        <div class="preview" style="background-image:url('${esc(h.photo || '')}')"></div>
        <div class="body">
          <h4>${esc(h.title)}</h4>
          <div class="sub">${esc(h.year || '')} · ${esc(h.date || '')}${h.participants ? ` · ${esc(h.participants)} участниц` : ''}</div>
          <div class="desc">${esc(h.description)}</div>
        </div>
        <div class="card-actions">
          <button class="btn-secondary" data-action="edit-history" data-id="${h.id}">Изменить</button>
          <button class="btn-danger" data-action="delete-history" data-id="${h.id}">Удалить</button>
        </div>
      </div>
    `).join('');
  }

  historyListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'edit-history') openHistoryForm(id);
    if (btn.dataset.action === 'delete-history') {
      if (!confirm('Удалить событие из истории?')) return;
      await Store.removeHistory(id);
    }
  });

  document.getElementById('add-history-btn').addEventListener('click', () => openHistoryForm());

  function openHistoryForm(id) {
    const h = id ? Store.getHistory().find(x => x.id === id) : { year: '', date: '', title: '', description: '', participants: '', photo: '' };
    if (!h) return;
    showModal(id ? 'Изменить событие' : 'Добавить событие в историю', `
      <label>Год (например: 2024)
        <input name="year" required value="${esc(h.year)}">
      </label>
      <label>Дата / месяц (например: август 2024)
        <input name="date" value="${esc(h.date)}">
      </label>
      <label>Название
        <input name="title" required value="${esc(h.title)}">
      </label>
      <label>Описание
        <textarea name="description" rows="3" required>${esc(h.description)}</textarea>
      </label>
      <label>Сколько было участниц
        <input name="participants" type="number" min="1" value="${esc(h.participants || '')}">
      </label>
      ${photoFieldHTML(h.photo)}
      <div class="form-actions">
        <button type="button" class="btn-secondary" data-close>Отмена</button>
        <button type="submit" class="btn-primary">${id ? 'Сохранить' : 'Добавить'}</button>
      </div>
    `, async (data) => {
      const payload = {
        year: data.year.trim(),
        date: data.date.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        participants: data.participants ? parseInt(data.participants, 10) : null,
        photo: (data.photo || '').trim(),
      };
      if (id) await Store.updateHistory(id, payload);
      else await Store.addHistory(payload);
    });
  }

  // ---------- Modal ----------
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalForm = document.getElementById('modal-form');
  let submitHandler = null;

  function showModal(title, innerHTML, onSubmit) {
    modalTitle.textContent = title;
    modalForm.innerHTML = innerHTML;
    submitHandler = onSubmit;
    modal.classList.add('open');
    initPhotoField(modalForm);
    setTimeout(() => {
      const first = modalForm.querySelector('input:not([type=hidden]):not([type=file]), textarea');
      first && first.focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.remove('open');
    submitHandler = null;
  }

  modal.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) closeModal();
  });

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!submitHandler) return;
    const fd = new FormData(modalForm);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = v;
    try {
      await submitHandler(data);
      closeModal();
    } catch (err) {
      if (err && err.name === 'QuotaExceededError') {
        alert('Не хватает места в localStorage. Удалите старые записи или используйте картинки поменьше.');
      } else {
        throw err;
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // ---------- Init: реактивные подписки ----------
  // Любое изменение в облаке или локально — автоматически перерисовывает админку.
  Store.onApplicationsChange(() => { renderApps(); refreshCounts(); });
  Store.onMembersChange(() => { renderMembers(); refreshCounts(); });
  Store.onTripsChange(() => { renderTrips(); refreshCounts(); });
  Store.onHistoryChange(() => { renderHistoryAdmin(); refreshCounts(); });

  // Индикатор режима
  const mode = Store.mode === 'cloud' ? '☁️ облако' : '💾 локально';
  console.log('Admin режим хранилища:', mode);
  } // end bootAdmin
})();
