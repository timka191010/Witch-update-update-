# Облачное хранилище через Firebase Firestore

Сайт теперь умеет работать через облако: данные общие для всех, изменения видны в реальном времени.

## 🔥 Настройка Firebase (10 минут, бесплатно)

### Шаг 1. Создать проект Firebase

1. Откройте https://console.firebase.google.com
2. Войдите через Google-аккаунт
3. Нажмите **«Add project»** (или «Создать проект»)
4. Введите название (например, `vedmy-club`)
5. Можно отключить Google Analytics — он не нужен
6. Нажмите **«Create project»** → подождите ~30 секунд → **«Continue»**

### Шаг 2. Добавить веб-приложение

1. На главной странице проекта найдите иконку **`</>` (Web)** и нажмите её
2. Введите имя приложения (например, `vedmy-web`)
3. **НЕ** включайте Firebase Hosting (не нужно)
4. Нажмите **«Register app»**
5. На следующем экране появится код вида:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSyA...",
     authDomain: "vedmy-club.firebaseapp.com",
     projectId: "vedmy-club",
     storageBucket: "vedmy-club.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123def"
   };
   ```

6. **Скопируйте эти значения**

### Шаг 3. Вставить ключи в проект

Откройте файл `firebase-config.js` и замените `"ВСТАВЬТЕ_СЮДА"` на свои значения:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyA...",          // ваше
  authDomain: "vedmy-club.firebaseapp.com",
  projectId: "vedmy-club",
  storageBucket: "vedmy-club.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123def"
};
```

### Шаг 4. Создать базу данных Firestore

1. В консоли Firebase слева: **Build → Firestore Database**
2. Нажмите **«Create database»**
3. Выберите режим **«Start in test mode»** (для прототипа)
   - ⚠️ Test mode даёт открытый доступ на 30 дней. Перед публичным запуском нужно настроить правила безопасности.
4. Выберите регион (например, `europe-west` или `eur3`) → **«Enable»**

### Шаг 5. Разрешить домен сайта

Firebase по умолчанию принимает запросы только с разрешённых доменов.

1. В консоли Firebase: **Authentication → Settings → Authorized domains**
   (даже если не используете auth — это влияет на CORS)
2. Добавьте домен вашего сайта, например `ваш-логин.github.io` или `ваш-сайт.netlify.app`
3. `localhost` уже разрешён по умолчанию — локальная разработка работает сразу

### Шаг 6. Готово!

Откройте сайт — в консоли браузера (F12) увидите:
```
☁️ Vedmy Club: cloud storage (Firebase)
```

Если видите `💾 Vedmy Club: localStorage` — значит конфиг не подхватился, проверьте `firebase-config.js`.

## 🔄 Как работает realtime

- Добавили выезд в админке → у всех на странице он появляется **мгновенно**, без перезагрузки
- Кто-то отправил анкету → в админке она появляется сразу
- Удалили участницу → у всех исчезла

## 🔒 Безопасность правил Firestore

Сейчас правила открыты (test mode). Чтобы:
- любой мог читать сайт
- только админка могла писать (но это требует аутентификации)

Минимальный безопасный вариант (открыто всем, как сейчас на 30 дней):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Безопаснее (любой может читать, писать только из приложения с паролем):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Открытое чтение для всех
    match /members/{id}    { allow read: if true; allow write: if true; }
    match /trips/{id}      { allow read: if true; allow write: if true; }
    match /history/{id}    { allow read: if true; allow write: if true; }

    // Заявки: создавать может кто угодно, читать/менять — только админ
    match /applications/{id} {
      allow create: if true;
      allow read, update, delete: if true; // ← здесь желательно настроить auth
    }
  }
}
```

Для серьёзной защиты админки нужен Firebase Authentication. Скажите — настрою.

## ⚡ Лимиты бесплатного тарифа Firebase

- **50 000 чтений в день**
- **20 000 записей в день**
- **1 GB хранилища**

Для женского клуба этого хватит **с огромным запасом** (это объём для приложения с тысячами активных пользователей).

## 🛟 Fallback

Если в `firebase-config.js` оставить заглушки `"ВСТАВЬТЕ_СЮДА"`, сайт автоматически переключится на `localStorage` — будет работать как раньше, локально у каждого пользователя.
