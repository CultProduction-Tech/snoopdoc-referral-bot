# SnoopDoc Referral Bot

Telegram-бот реферальной программы. Работает через long polling, БД не нужна — все запросы идут в API SnoopDoc.

## Env

Скопируй `.env.example` → `.env`:

```env
REFERRAL_BOT_TOKEN=...
SNOOPDOC_API_URL=https://snoopdoc.ru
REFERRAL_BOT_API_SECRET=...
```

На prod SnoopDoc должен быть тот же `REFERRAL_BOT_API_SECRET`.

## Деплой на VPS (иностранный сервер)

```bash
sudo mkdir -p /opt/snoopdoc-referral-bot
sudo chown $USER:$USER /opt/snoopdoc-referral-bot
git clone https://github.com/CultProduction-Tech/snoopdoc-referral-bot.git /opt/snoopdoc-referral-bot
cd /opt/snoopdoc-referral-bot
cp .env.example .env
nano .env
npm install
npm start
```

Проверка сети:

```bash
curl -I --connect-timeout 10 https://api.telegram.org
curl -I --connect-timeout 10 https://snoopdoc.ru
```

## Autostart (systemd)

```bash
sudo cp referral-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable referral-bot
sudo systemctl start referral-bot
sudo systemctl status referral-bot
```

Логи: `journalctl -u referral-bot -f`

## Обновление

```bash
cd /opt/snoopdoc-referral-bot
git pull
npm install
sudo systemctl restart referral-bot
```
