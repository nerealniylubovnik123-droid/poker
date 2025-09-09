# Poker Telegram WebApp + Bot

Готовый проект для GitHub.

## Состав
- `index.html` — клиентское мини‑приложение (WebApp).
- `bot.js` — бот на Telegraf, получает `web_app_data`.
- `package.json` — зависимости.
- `.env.example` — пример конфигурации.
- `.gitignore` — исключает `node_modules` и `.env`.
- `README.md` — эта инструкция.

## Быстрый старт
1. Клонируйте репозиторий.
2. Установите зависимости:
   ```bash
   npm i
   ```
3. Создайте `.env` на основе `.env.example`:
   ```
   BOT_TOKEN=ВАШ_ТОКЕН_БОТА
   WEBAPP_URL=https://ВАШ_ДОМЕН/index.html
   ```
4. Запустите бота:
   ```bash
   npm start
   ```

## Загрузка на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
