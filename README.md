# Return Monitor

Простий вебзастосунок Google Apps Script для контролю повернень.

## Джерела

- SalesDrive — основне джерело замовлень і ТТН.
- Нова Пошта — прямий tracking API.
- Укрпошта — tracking API після додавання токена/URL.
- Prom — додатковий модуль тільки для Prom → Rozetka, якщо дає унікальний статус або дію повернення.
- Meest — додатковий tracking provider за потреби.

## Google Apps Script

Script ID: `1kJJ4wr_MrxQm8gQWfM43uV5aVw2Pdvze2CFpr5hsoi6lsncI-qEF6dOi`

Код Apps Script лежить у `src/`.

## Локальна робота

```powershell
git clone https://github.com/dponline23/Return-monitor.git
cd Return-monitor
npm ci
npm run clasp:config
npm run pull
```

Якщо `clasp` уже авторизований на цьому ПК для Dropario, повторний `clasp login` не потрібен.

Після правок:

```powershell
git pull
npm run push
git add .
git commit -m "Update Return Monitor"
git push
```

`.clasp.json` створюється локально і не комітиться.

## Автодеплой GitHub Actions

Workflow `.github/workflows/deploy.yml` на кожен push у `main`:

1. встановлює залежності;
2. створює тимчасовий `.clasp.json`;
3. відновлює авторизацію clasp із GitHub Secret `CLASPRC_JSON`;
4. виконує `clasp push --force`;
5. якщо задано GitHub Variable `RETURN_MONITOR_DEPLOYMENT_ID`, оновлює той самий web-app deployment.

### Один раз треба додати в GitHub

**Secret**

- `CLASPRC_JSON` — вміст локального `%USERPROFILE%\.clasprc.json`. Не вставляти цей файл у код або чат.

**Variable** — після першого web-app deployment:

- `RETURN_MONITOR_DEPLOYMENT_ID` — ID deployment виду `AKfycb...`, не Script ID.

## Script Properties

Секрети зберігаються тільки в Apps Script → Project Settings → Script properties.

Підтримані ключі:

- `SALESDRIVE_API_URL_TEMPLATE`
- `SALESDRIVE_API_TOKEN`
- `NOVA_POSHTA_API_KEY`
- `UKRPOSHTA_TRACKING_URL_TEMPLATE`
- `UKRPOSHTA_TRACKING_TOKEN`
- `MEEST_TRACKING_URL_TEMPLATE`
- `MEEST_TRACKING_TOKEN`
- `PROM_API_TOKEN`

Для URL-шаблонів можна використовувати `{{TOKEN}}` і `{{TTN}}`.

## Таблиця

База: `Повернення - контроль`.

Основні аркуші:

- `Повернення`
- `Постачальники`
- `Налаштування`

API-ключі в Google Sheet не зберігати.
