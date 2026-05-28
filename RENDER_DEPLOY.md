# Деплой сайта на Render

## Быстрый старт (5 минут)

### 1. Git + GitHub

```bash
cd ~/vedmy-club
git init
git add .
git commit -m "vedmy club"
```

Создайте репозиторий на https://github.com/new (например `vedmy-club`), затем:

```bash
git remote add origin https://github.com/ВАШ_ЛОГИН/vedmy-club.git
git branch -M main
git push -u origin main
```

### 2. Render

1. Откройте https://dashboard.render.com
2. **New +** → **Static Site**
3. Подключите GitHub, выберите репозиторий
4. Render автоматически прочитает `render.yaml` и предложит создать сайт
   (или заполните вручную: Build Command — пусто, Publish Directory — `.`)
5. **Create Static Site**

Через 1–2 минуты сайт доступен по `https://имя-сайта.onrender.com`.

### 3. Обновление сайта

```bash
git add .
git commit -m "что-то поменял"
git push
```

Render автоматически передеплоит сайт за минуту.

## Firebase: настройка домена

После деплоя надо разрешить Firebase запросы с домена Render:

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Добавьте `имя-сайта.onrender.com`

## Telegram Mini App с Render

URL `https://имя-сайта.onrender.com` уже HTTPS — можно сразу привязывать к боту.

`@BotFather`:
- `/newapp` → выберите бота
- Web App URL: `https://имя-сайта.onrender.com`

Готово, открывается через `t.me/ваш_бот/app`.

## Свой домен (необязательно)

В настройках сайта на Render: **Settings → Custom Domains → Add**.
Привяжете свой домен (например `vedmy-club.ru`), Render сам выдаст HTTPS-сертификат.

## Что важно

- **Firebase API-ключи в публичном репозитории не страшны** — Firebase Web SDK использует их как идентификаторы, а защита делается через Firestore Rules. Главное — настройте правила безопасности (см. CLOUD_SETUP.md).
- **Бесплатный план Render** для статики не имеет лимитов и сайт не «засыпает» (в отличие от Web Services).
- **Автодеплой** — каждый push в `main` запускает новый билд.
