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

## SalesDrive

Використовується підтверджений endpoint бази заявок:

`https://<subdomain>.salesdrive.me/api/order/list/`

Авторизація: заголовок `X-Api-Key`. Потрібен API-ключ бази заявок з правом `Заявки — читання`.

У вебзастосунку ключ можна один раз ввести через `Налаштування`. Він зберігається тільки у Script Properties.

З SalesDrive читаються, зокрема, `ord_delivery_data[].provider`, `trackingNumber`, `statusCode`, `primaryContact`, `products`, `externalId`, `orderTime`, `paymentAmount`.

## Локальна робота

```powershell
git clone https://github.com/dponline23/Return-monitor.git
cd Return-monitor
npm install
npm run clasp:config
```

Якщо `clasp` уже авторизований на цьому ПК для Dropario, повторний `clasp login` не потрібен.

GitHub є джерелом актуального коду. Після локальних правок достатньо:

```powershell
git pull
git add .
git commit -m "Update Return Monitor"
git push
```

Після `git push` GitHub Actions сам виконає `clasp push --force`. `clasp pull` використовувати тільки якщо код навмисно змінювався безпосередньо в Apps Script.

`.clasp.json` створюється локально і не комітиться.

## Автодеплой GitHub Actions

Workflow `.github/workflows/deploy.yml` на кожен push у `main`:

1. встановлює clasp;
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

- `SALESDRIVE_SUBDOMAIN`
- `SALESDRIVE_ORDER_API_KEY`
- `SALESDRIVE_LAST_SYNC` — службове, заповнюється автоматично
- `NOVA_POSHTA_API_KEY`
- `UKRPOSHTA_TRACKING_URL_TEMPLATE`
- `UKRPOSHTA_TRACKING_TOKEN`
- `MEEST_TRACKING_URL_TEMPLATE`
- `MEEST_TRACKING_TOKEN`
- `PROM_API_TOKEN`

Для tracking URL-шаблонів можна використовувати `{{TOKEN}}` і `{{TTN}}`.

## Таблиця

База: `Повернення - контроль`.

Основні аркуші:

- `Повернення`
- `Постачальники`
- `Налаштування`

API-ключі в Google Sheet не зберігати.
