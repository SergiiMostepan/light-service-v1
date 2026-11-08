# light-service-v1

NestJS-сервис для чтения данных из Deye Cloud.

## Деплой первой версии

В приложении доступен только `GET /health`. Маршруты `/`, `/deye/stations/*`
и `/deye/batteries/*` отключены: контроллеры диагностики не зарегистрированы
в модулях. Это относится и к локальному запуску; примеры старых HTTP-запросов
ниже оставлены как справка по отключённым контроллерам.

Команда сборки: `npm ci && npm run build`.
Команда запуска: `npm run start:prod` (включает `NODE_ENV=production`).
Версия Node указана в `.nvmrc`. Настройки Deye задаются в переменных окружения
хостинга. Для production обязательны `DEYE_APP_ID`, `DEYE_APP_SECRET`,
один из `DEYE_EMAIL` / `DEYE_USERNAME` / `DEYE_MOBILE`, а также
`DEYE_PASSWORD` или `DEYE_PASSWORD_SHA256`. Без них запуск завершится ошибкой.
Порт берётся из `PORT`, по умолчанию `3000`.

Мониторится только станция ИТП `61845325`: состояние трёх фаз при старте и
далее каждые 5 минут. Значения батарей выводятся при старте и затем каждый час.
Сообщения о лифтах пока принудительно идут только в консоль, даже при наличии
настроек Telegram. Данные о фазах показывают наличие электропитания,
а не фактическую исправность лифтов.

Запускайте одну реплику постоянно работающего сервиса. Состояние хранится
в памяти: после рестарта начальное сообщение повторится; несколько реплик
будут независимо опрашивать Deye и дублировать сообщения. При остановке или
сне процесса мониторинг не выполняется, пропущенные события не восстанавливаются.
`/health` проверяет только работу процесса, не свежесть телеметрии или доступность
Deye. Батареи читаются через веб-API Deye, которое может измениться независимо
от публичного OpenAPI.

## Запуск

Требуется Node.js 22.22.3+. Зависимости фиксируются в `package-lock.json`.

```bash
nvm use
npm ci
cp .env.example .env
npm run start:dev
```

Приложение запускается без учётных данных Deye. Для обращения к облаку заполните `.env`:

```dotenv
DEYE_API_BASE_URL=https://eu1-developer.deyecloud.com
DEYE_APP_ID=your-app-id
DEYE_APP_SECRET=your-app-secret
DEYE_EMAIL=your-account-email
DEYE_PASSWORD=your-account-password
```

App ID и App Secret выдаются при создании приложения в
[Deye Developer Portal](https://developer.deyecloud.com/app).
Email и пароль относятся к аккаунту Deye Cloud. Пароль перед отправкой
хешируется SHA-256 в нижнем регистре, как требует
[документация Deye](https://developer.deyecloud.com/start).
Вместо `DEYE_PASSWORD` можно задать `DEYE_PASSWORD_SHA256` — уже готовый
64-символьный hex-хеш. Одновременно задавать оба значения нельзя.
`.env` исключён из Git; пароли, хеши и токены нельзя коммитить.

Дата-центр должен совпадать с дата-центром аккаунта:

| Дата-центр | `DEYE_API_BASE_URL` |
| --- | --- |
| Europe | `https://eu1-developer.deyecloud.com` |
| Americas | `https://us1-developer.deyecloud.com` |
| India | `https://india-developer.deyecloud.com` |

Дополнительные параметры:

| Переменная | Назначение |
| --- | --- |
| `PORT` | Порт NestJS, по умолчанию `3000` |
| `DEYE_API_TIMEOUT_MS` | Таймаут HTTP-запросов, по умолчанию `10000` мс |
| `DEYE_USERNAME` | Имя пользователя вместо email |
| `DEYE_MOBILE` и `DEYE_COUNTRY_CODE` | Вход по телефону вместо email |
| `DEYE_COMPANY_ID` | Необязательный ID компании для бизнес-аккаунта |

Укажите ровно один способ идентификации: email, username или mobile.
Для бизнес-аккаунта `getAccountInfo()` возвращает список организаций;
нужный `companyId` можно затем сохранить в `.env`.
Настройки проверяются при запуске; в production обязательные credentials
проверяются сразу, в остальных режимах — при первом запросе.
Префикс настроек и названия файлов исправлены с прежнего `DAYE`/`daye` на `DEYE`/`deye`.

## Использование DeyeService

Импортируйте `DeyeModule` в модуль, которому нужен клиент, и внедрите `DeyeService`:

```typescript
import { Injectable, Module } from '@nestjs/common';
import { DeyeModule } from './deye/deye.module.js';
import { DeyeService } from './deye/deye.service.js';

@Injectable()
export class MonitoringService {
  constructor(private readonly deye: DeyeService) {}

  async readStation(stationId: number) {
    const latest = await this.deye.getStationLatest({ stationId });
    const devices = await this.deye.getStationDevices({
      stationIds: [stationId],
      page: 1,
      size: 20,
    });
    return { latest, devices };
  }
}

@Module({
  imports: [DeyeModule],
  providers: [MonitoringService],
})
export class MonitoringModule {}
```

`DeyeModule` уже подключён в `AppModule`. Клиент выполняет только мониторинг:

| Методы | Данные |
| --- | --- |
| `getAccountInfo()` | Организации аккаунта |
| `getStations()`, `getStation()`, `getStationsWithDevices()` | Список и сведения о станциях |
| `getStationDevices()`, `getDevices()` | Устройства станции или бизнес-аккаунта |
| `getStationLatest()`, `getDeviceLatest()` | Последние показатели |
| `getStationHistory()`, `getStationHistoryPower()` | История станции |
| `getDeviceHistory()`, `getDeviceHistoryRaw()` | История устройства |
| `getDeviceMeasurePoints()` | Доступные измеряемые параметры устройства |
| `getStationAlerts()`, `getDeviceAlerts(request, language?)` | Предупреждения и ошибки |
| `getBatteryConfiguration()`, `getSystemConfiguration()`, `getTimeOfUseConfiguration()` | Чтение существующих настроек |

Типы запросов и ответов находятся в `src/deye/deye.types.ts` и основаны на
[официальной OpenAPI-схеме](https://eu1-developer.deyecloud.com/v2/api-docs).
Методы возвращают полный ответ Deye, включая `total`, `stationList`,
`deviceListItems`, `deviceDataList` и другие поля соответствующего endpoint.
Списки возвращаются постранично; для следующей страницы передайте `page` и `size`.
`getDevices()` доступен бизнес-аккаунтам; для личного аккаунта используйте `getStationDevices()`.

Примеры чтения устройства:

```typescript
const latest = await deye.getDeviceLatest({ deviceList: ['YOUR_DEVICE_SN'] });
const points = await deye.getDeviceMeasurePoints({ deviceSn: 'YOUR_DEVICE_SN' });
// measurePoints берите из ответа getDeviceMeasurePoints, имена зависят от устройства.
const history = await deye.getDeviceHistoryRaw({
  deviceSn: 'YOUR_DEVICE_SN',
  startTimestamp: 1793232000,
  endTimestamp: 1793235600,
  measurePoints: ['YOUR_MEASURE_POINT'],
});
```

Для `getDeviceLatest()` размер пакета — от 1 до 10 серийных номеров.
`startTimestamp`/`endTimestamp` передаются в Unix-секундах. Для истории устройства
`historyRaw` интервал ограничен 5 днями, для предупреждений устройства — 30 днями.
Для `getDeviceHistory()` и `getStationHistory()` параметр `granularity` определяет
формат `startAt`/`endAt`: `1` — данные дня (`YYYY-MM-DD`), `2` — по дням
(`YYYY-MM-DD`), `3` — по месяцам (`YYYY-MM`), `4` — по годам (`YYYY`).
При `granularity=1` для истории устройства также нужны `measurePoints`.
Подробные ограничения перечислены в [API Reference](https://developer.deyecloud.com/api).

## Авторизация и ошибки

Токен получается автоматически при первом запросе, хранится в памяти процесса
и переиспользуется. Срок кеширования рассчитывается по `expiresIn` с запасом
до 60 секунд. Параллельные запросы используют одно получение токена.
После HTTP 401 клиент повторно авторизуется и повторяет чтение ровно один раз.
При перезапуске процесса токен получается заново; на диск он не сохраняется.

`DeyeApiError` сообщает тип ошибки (`api`, `http`, `network`, `invalid-response`),
endpoint, HTTP-статус, код Deye и `requestId`, если они доступны.
Ответы с `success: false` обрабатываются как ошибки даже при HTTP 200.
Таймауты, HTTP 429 и 5xx автоматически не повторяются.
`DeyeConfigurationError` означает отсутствие обязательных настроек.
Ошибки клиента не сохраняют Axios config, пароль или заголовки авторизации.

Все методы мониторинга используют POST согласно протоколу Deye.
Доступные пути явно перечислены в `src/deye/deye.endpoints.ts`;
методов отправки команд, изменения настроек и регистрации устройств нет.
Следующие маршруты отключены перед деплоем (описание сохранено для разработки).
Ранее для Postman использовались маршруты (тело запроса и заголовок Authorization не нужны;
сервис сам авторизуется в Deye по `.env`):

```http
GET http://localhost:3000/deye/stations?page=1&size=20
GET http://localhost:3000/deye/stations/with-devices?page=1&size=20
GET http://localhost:3000/deye/stations/61845325
GET http://localhost:3000/deye/stations/my
```

Первый возвращает список станций, второй — станции вместе с устройствами.
`GET /deye/stations/:stationId` возвращает сведения о станции по положительному целому ID.
`GET /deye/stations/my` использует константу `DEYE_STATION_ID = 61845325`
из `src/deye/deye.constants.ts`.
Параметры необязательны: `page=1`, `size=20` по умолчанию; `size` от 1 до 200.
Стандартный `GET /` отключён и возвращает 404.

## Часы без сети за период (HTTP-маршруты отключены)

Для своей станции (`61845325`):

```http
GET http://localhost:3000/deye/stations/my/grid-outages?from=2026-10-28T00:00:00Z&to=2026-10-29T00:00:00Z
```

Для станции по ID: `GET /deye/stations/:stationId/grid-outages` с такими же
параметрами `from` и `to`. Укажите ISO-дату со временем до секунд и часовым
поясом: `Z` для UTC либо смещение, например `2026-10-28T00:00:00+02:00`.
В Postman задавайте значения во вкладке Params: знак `+` в URL должен быть
закодирован как `%2B`. Период — до 31 дня, конец позже начала и не в будущем.
Конец периода не включается; расчёт идёт по фактическим прошедшим секундам,
в том числе при смене часового пояса.

Основные поля ответа:

| Поле | Значение |
| --- | --- |
| `hoursWithoutGrid` | Расчётное число часов полного отсутствия сети |
| `hoursWithGrid` | Часы, когда напряжение сети присутствовало |
| `hoursWithoutData` | Часы, для которых состояние неизвестно |
| `coveragePercent` | Доля периода, покрытая пригодными измерениями |
| `partial` | `true`, если часть периода не покрыта данными |
| `estimated` | `true`: результат рассчитан по дискретной телеметрии |
| `outages` | Интервалы без сети, длительность в секундах и часах |
| `dataGaps` | Интервалы без достоверных данных |

Сервис находит инвертор станции и запрашивает историю `GridVoltageL1/L2/L3`
из доступных параметров устройства. Полное отключение означает напряжение
не более 10 В на всех доступных фазах. Потеря одной фазы при наличии другой
не считается полным отключением. Отсутствие солнечных панелей не меняет
этот критерий: нулевая мощность сети возможна и при работе от батареи.

Для твоего инвертора проверено наличие всех трёх параметров и фактической
истории с шагом около 5 минут. Значение замера действует до следующего замера,
но не более 10 минут. Более длинные пропуски, отсутствующая фаза, некорректное
значение и противоречивые дубликаты считаются неизвестными данными.
Границы отключений приблизительны; это не журнал точных событий переключения.
При `partial: true` значение `hoursWithoutGrid` относится только к покрытой
части периода. Пустая история даёт 0 часов без сети и весь период без данных;
это не подтверждение отсутствия отключений.

История автоматически разбивается на запросы короче 5 суток с дополнительным
замером перед началом периода. Сейчас поддерживается станция с одним инвертором;
при нескольких инверторах или отсутствии параметров напряжения возвращается 422.
Неверный период — 400, отсутствие инвертора — 404, отсутствие credentials — 503,
ошибка Deye — 502. Deye отклоняет интервал ровно 5 суток с кодом `2101006`,
поэтому максимальная длина одной части — 5 суток минус 1 секунда.
При ошибке ответ содержит `kind`, `endpoint`, `upstreamStatus`, `code` и `requestId`,
если они доступны.

Эндпоинт проверен реальным HTTP-запросом за период
`2026-10-28T00:00:00Z`–`2026-10-29T00:00:00Z`:
`hoursWithoutGrid=1.546944`, `hoursWithoutData=0.103889`, `coveragePercent=99.57`.
Это сутки UTC; для местных календарных суток передавайте соответствующее смещение.

## Батареи через веб-API

Ранее для чтения конкретной батареи использовался маршрут (сейчас отключён):

```http
GET http://localhost:3000/deye/batteries/web/8395568
```

`8395568` — числовой ID батареи, увиденный в запросе веб-интерфейса;
это не ID станции и не серийный номер. Сервис автоматически получает свой
обычный токен и отправляет его в `POST https://eu1.deyecloud.com/device-s/device/detail`
с телом `{ "language": "en", "deviceId": 8395568, "needRealTimeDataFlag": true }`.
Отдельные настройки авторизации не нужны: для этого аккаунта получен успешный
ответ с текущим токеном OpenAPI.

При успехе возвращается ответ веб-API. В `paramCategoryList[].fieldList[]`
нужны поля `storageName`: `BSC` (SOC), `MAX_C_V`, `MIN_C_V`.
Ответ 502 с `upstreamStatus: 401` или `403` означает, что текущий запрос
авторизации/доступа отклонён. Ответ `kind: invalid-response` означает, что
вместо ожидаемых данных батареи пришёл другой ответ, например ошибка авторизации.
Токен в ответ и логи не выводится. Почасовые логи используют этот же метод:
при старте и затем через час после завершения предыдущего чтения сервис
получает список батарей ИТП, запрашивает каждую по числовому `deviceId`
и выводит max cell V, min cell V, SOC и время замера. Ответы проверяются
на совпадение станции и серийного номера; ошибка одной батареи не мешает
чтению остальных. Старые и офлайн-замеры помечаются как неактуальные.

## Проверки

```bash
npm run build
npm run start:prod
npm run lint
npm run format:check
npm test
npm run test:e2e
```

Тесты Deye используют HTTP-адаптер в памяти: реальные credentials и сеть не нужны.
Для проверки реального аккаунта нужно заполнить `.env`.
Маршрут расчёта отключений дополнительно проверен на реальной истории станции.
