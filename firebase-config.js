// ⚠️ ВСТАВЬТЕ СЮДА КОНФИГ ИЗ FIREBASE
// 1. Зайдите на https://console.firebase.google.com
// 2. Создайте проект (название любое, например "vedmy-club")
// 3. В проекте — "Add app" → значок </> (Web)
// 4. Дайте имя приложению → "Register app"
// 5. Скопируйте объект firebaseConfig — он выглядит так:
//
//    const firebaseConfig = {
//      apiKey: "AIza...",
//      authDomain: "vedmy-club.firebaseapp.com",
//      projectId: "vedmy-club",
//      storageBucket: "vedmy-club.appspot.com",
//      messagingSenderId: "1234567890",
//      appId: "1:1234567890:web:abc123"
//    };
//
// 6. Вставьте СВОЙ объект ниже (замените значения)
// 7. В консоли Firebase: Build → Firestore Database → Create database
//    → Start in TEST MODE (для прототипа)
// 8. Готово! Сайт начнёт работать через облако.

window.FIREBASE_CONFIG = {
  apiKey: "ВСТАВЬТЕ_СЮДА",
  authDomain: "ВСТАВЬТЕ_СЮДА.firebaseapp.com",
  projectId: "ВСТАВЬТЕ_СЮДА",
  storageBucket: "ВСТАВЬТЕ_СЮДА.appspot.com",
  messagingSenderId: "ВСТАВЬТЕ_СЮДА",
  appId: "ВСТАВЬТЕ_СЮДА"
};
