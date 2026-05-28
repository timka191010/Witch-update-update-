// Telegram Mini App интеграция
// Документация: https://core.telegram.org/bots/webapps
(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) {
    // Открыто не в Telegram — работает как обычный сайт
    document.body.classList.add('not-telegram');
    return;
  }

  document.body.classList.add('in-telegram');

  // Разворачиваем на весь экран
  tg.expand();
  tg.ready();

  // Версия Telegram WebApp SDK (на iOS/Android старые клиенты — 6.0)
  const tgVer = parseFloat(tg.version || '6.0');

  // Получаем данные пользователя
  const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (user) {
    // Сохраним для предзаполнения анкеты
    window.__tgUser = user;
    // Автозаполнение анкеты, если есть форма
    const form = document.getElementById('application-form');
    if (form) {
      const nameInput = form.querySelector('input[name="name"]');
      if (nameInput && !nameInput.value) {
        nameInput.value = [user.first_name, user.last_name].filter(Boolean).join(' ');
      }
    }
  }

  // Версия SDK 6.1+ поддерживает haptic feedback и кнопки
  function haptic(type) {
    if (tgVer < 6.1) return;
    try {
      if (tg.HapticFeedback) {
        if (type === 'success' || type === 'error' || type === 'warning') {
          tg.HapticFeedback.notificationOccurred(type);
        } else {
          tg.HapticFeedback.impactOccurred(type || 'light');
        }
      }
    } catch {}
  }
  window.tgHaptic = haptic;

  // Вибрация на все кнопки и ссылки-карточки
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .btn, .feature-card, .tab, .shop-card');
    if (target) haptic('light');
  });

  // Сообщение «Спасибо» после отправки анкеты + вибрация
  const applicationForm = document.getElementById('application-form');
  if (applicationForm) {
    applicationForm.addEventListener('submit', () => {
      setTimeout(() => {
        haptic('success');
        if (tg.showPopup && tgVer >= 6.2) {
          tg.showPopup({
            title: 'Спасибо!',
            message: 'Ваша анкета принята. Мы свяжемся с вами в течение луны 🌙',
            buttons: [{ id: 'ok', type: 'default', text: 'Хорошо' }]
          });
        }
      }, 100);
    });
  }

  // Применяем тему Telegram (можно полностью игнорировать, если дизайн фирменный)
  // Здесь оставляем свой дизайн, но синхронизируем системные цвета шапки.
  // Методы доступны только с версии 6.1+, поэтому проверяем версию.
  try {
    if (tgVer >= 6.1 && typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#0e0814');
    if (tgVer >= 6.1 && typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#15101a');
  } catch {}

  // Закрыть приложение из админ-кнопки (BackButton доступна с 6.1+)
  if (location.pathname.endsWith('admin.html') && tgVer >= 6.1 && tg.BackButton) {
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        location.href = 'index.html';
      });
    } catch {}
  }
})();
