# Pongy AI

**Версия 0.10.2** · Веб-приложение для компьютеров и телефонов.

Pongy AI — персональный помощник с потоковыми ответами, вложениями и историей диалогов. Простой интерфейс помогает сосредоточиться на вопросе, а не на настройках.

## Возможности

- Формулы KaTeX, блоки кода с копированием/скачиванием и боковым предпросмотром.
- Изолированный запуск HTML/JavaScript по подтверждению; остальные языки доступны для чтения, не исполняются сервером.
- Лайки, несколько закреплённых сообщений, сворачивание длинных ответов.
- Предложения ИИ изменить тему/язык, открыть чат или включить встроенный фоновый звук — только после подтверждения.
- Голосовой ввод через SpeechRecognition браузера; индикатор уровня использует настоящий микрофон, требуется разрешение и поддержка браузера.
- Локальные ресурсы KaTeX распространяются по лицензии MIT (public/vendor/katex/LICENSE).


- Бесплатные модели OpenRouter и автоматическое переключение при сбоях.
- Анализ изображений через доступные модели с поддержкой vision.
- Вложения: изображения, текст, исходный код, PDF, DOCX и ZIP-проекты.
- Поиск по необходимости через Tavily или Brave Search API; чтение публичных HTTPS-страниц.
- Поиск Wiki-страниц и фотографий Wikimedia Commons с указанием авторов и лицензий.
- Раскрываемый список «Источники (N)» под ответом.
- Создание и скачивание текстовых файлов, исходного кода и ZIP-проектов.
- Генерация изображений после отдельного включения владельцем сервера.
- Уточнение сообщения через плашку над полем ввода.
- История по датам: закрепление, переименование, поиск и удаление чатов.
- Дополнительный контекст из других чатов — по желанию пользователя.
- Светлая и тёмная темы, русский и английский интерфейс, плавные анимации.
- Вход по почте, подтверждение адреса, восстановление пароля и Google после настройки авторизации.
- Облачное сохранение через Firestore либо локальное хранение в SQLite.
- API-ключ ИИ хранится на сервере. Посетителям вводить ключ не нужно.

## Характеристики

| Параметр | Значение |
| --- | --- |
| Сервер | Node.js 22+, Express |
| Хранение | SQLite / Firebase Firestore |
| Авторизация | Firebase Auth / Google OAuth, HttpOnly cookie |
| Интерфейс | HTML, CSS, JavaScript; адаптивная верстка |
| Размер вложения | До 2 МБ; до 4 файлов в сообщении |
| Документы | Извлечение текста; PDF — первые 12 страниц, до 50 000 символов |
| Защита | CSP, очистка Markdown, ограничения запросов и проверка доступа |

Для общего веб-поиска владелец задаёт `TAVILY_API_KEY` в Environment (либо существующий `BRAVE_SEARCH_API_KEY`). Чтение страниц по ссылке не требует ключа поиска; страницы с авторизацией, CAPTCHA или обязательным JavaScript не поддерживаются.

Качество и доступность ответов зависят от выбранной модели, лимитов и работы провайдера. Для PDF-сканов без текста страницы нужно прикреплять как изображения. Видео, аудио и старые форматы Office не поддерживаются.

ZIP: до 100 элементов и 8 МБ после распаковки. Анализируется текст и код; изображения из архива нужно прикреплять отдельно. Архив для скачивания нормализуется: приватные файлы и зависимости исключаются, PDF/DOCX заменяются извлечённым текстом. Созданный код не исполняется сервером.

**Pongy Plus:** исходный экран тарифа сохранён. Оплата временно отключена — приложение не принимает деньги и не активирует подписку по нажатию кнопки.

## Установка

Установите Node.js 22+ и скачайте проект.

```bash
npm ci
cp .env.example .env
```

В Windows используйте `copy .env.example .env`. Заполните серверные переменные и запустите:

```bash
npm start
```

Для Render: команда сборки `npm ci`, запуска — `npm start`. Переменные задаются в **Environment**, не в GitHub.

Адаптирован для актуальных Chrome, Edge, Firefox и Safari и мобильных экранов. В старых браузерах отдельные возможности могут быть недоступны.

**Pongy AI — понятное управление и ничего лишнего между вами и диалогом.**

## Локальная история

Текст чатов дополнительно сохраняется в IndexedDB этого браузера, отдельно для каждого аккаунта. После очистки серверной базы история восстанавливается с устройства после входа с той же почтой. Firestore и постоянный диск для локальной истории не нужны. В настройках доступны экспорт и импорт JSON-копии; сами вложенные файлы сохраняйте отдельно. Очистка данных браузера удаляет локальную базу.

История обновлений: [CHANGELOG.md](CHANGELOG.md). Заметки релизов: [RELEASES.md](RELEASES.md). Версия **2.0.0 — Глобальный релиз** пока только тизер, не текущий выпуск.


Генерация изображений зависит от включённого владельцем совместимого IMAGE_MODEL и доступности/баланса провайдера. IMAGE_API_MODE=chat или images позволяет явно выбрать API; по умолчанию auto. Резервный поиск Wikipedia не заменяет полноценный поисковый API. Защита запросов многоуровневая, но не является гарантией абсолютной защиты от всех обходов.

Предпросмотр видео поддерживает MP4/WebM до 512 КБ; это просмотр файла, а не анализ видео моделью. Для генерации через Image API можно задать IMAGE_GENERATION_ENABLED=true, IMAGE_API_MODE=images и IMAGE_MODEL с идентификатором из каталога изображений OpenRouter; действующий OPENROUTER_API_KEY задаётся только на сервере. Генерация может оплачиваться провайдеру отдельно от бесплатных текстовых моделей.

Анализ видео: браузер выбирает 3 JPEG-кадра (начало, середина, конец) для vision-модели. MP4/WebM до 20 МБ и 2 минут; звуковая дорожка не распознаётся, полный видеоряд не анализируется. Небольшой оригинал до 512 КБ также сохраняется для просмотра, для больших роликов сохраняются только кадры. Один ролик занимает 3–4 места вложений.

### Видео и хранение
Видео MP4/WebM до 20 МБ и 2 минут обрабатывается в браузере: до 9 моментов собираются в три листа с временными метками и передаются доступной бесплатной vision-модели. Очень короткие клипы дают 3 момента. Это не непрерывный анализ и не распознавание звука; краткие события могут быть пропущены. Большой оригинал видео не отправляется на сервер. Качество зависит от разрешения и выбранной модели, а доступность — от квоты провайдера.

Локальные чаты хранятся в IndexedDB этого браузера отдельно для каждого аккаунта и объединяются с серверной историей. Очистка данных сайта, приватный режим, смена браузера или устройства могут удалить/скрыть локальную копию. Используйте экспорт и, при необходимости, облачную синхронизацию. Восстановление локального интерфейса не заменяет серверную проверку сессии и не продлевает истёкшую авторизацию.

### Инструменты и взаимодействие
Кнопка «+» открывает загрузку файлов, режим программирования и генерацию изображений. На узком экране доступны отдельные пункты камеры, галереи и файлов; фактический системный выбор зависит от браузера и ОС. Режим генерации не включает провайдера автоматически и не делает платную генерацию бесплатной.

Последнее применённое действие ИИ можно вернуть запросом «Верни обратно»; обратное действие тоже требует подтверждения. История такого действия хранится отдельно для каждого аккаунта на устройстве. Это не произвольная отмена любых изменений сайта.

Роль разработчика определяется сервером только для подтверждённых публичных адресов команды. Она не отменяет защиту, не открывает чужие чаты и не предоставляет административный доступ. По явному запросу доступна базовая проверка конфигурации, идентичности, защитного фильтра и отмены действий — без выполнения произвольного кода, вызова платного провайдера или заявления о полном тестировании ИИ.

Почтовый контакт поддержки предлагает основной и резервные адреса. Сайт не определяет доставку писем из внешнего почтового приложения и не обещает автоматическое переключение после недоставки.

Распознавание речи запускается до подготовки индикатора громкости. Промежуточный текст появляется сразу при поступлении от браузера; повторные финальные результаты не дублируются. Скорость и доступность SpeechRecognition зависят от браузера и его сервиса; при отсутствии поддержки можно использовать системную диктовку клавиатуры.

Повторная регистрация занятого адреса отклоняется; существующий вход и восстановление пароля сохраняются. При переходе старого аккаунта на Firebase допускается подтверждённое связывание с тем же аккаунтом, а не создание второго.

### Лимиты сообщений
На аккаунт доступно 100 принятых отправок за сутки UTC. Один чат вмещает до 1000 сообщений пользователя и ИИ суммарно. Второе одинаковое сообщение подряд получает напоминание; третье и последующие помечаются как неотправленные. Вложения участвуют в сравнении. Счётчики хранятся в серверной SQLite; постоянный диск необходим, чтобы они переживали пересоздание сервиса. При нескольких независимых экземплярах сервера нужна общая атомарная база счётчиков. Локальная история не заменяет серверный контроль лимита.

По явной просьбе ИИ может прочитать другой сохранённый чат этого же аккаунта. Названия сравниваются без учёта регистра; неоднозначный выбор требует уточнения. Вложения не входят в текст чтения. Большие чаты могут не помещаться в контекст целиком; модель получает явный признак неполноты и не должна утверждать обратное.

Навыки меню «+» показываются метками в начале поля ввода и не входят в текст запроса. Крестик доступен при наведении и фокусе, а на сенсорном экране виден постоянно. Удаление метки не удаляет прикреплённые файлы.

## Optional APILayer resources
Disabled by default (`APILAYER_ENABLED=false`). Enable only after confirming the product subscriptions, HTTPS access and quota in the provider dashboard. Set credentials only in the server environment: a product-specific `APILAYER_<PRODUCT>_KEY` overrides `APILAYER_API_KEY`. A Marketplace API key is not assumed to work with the direct product APIs used here. No arbitrary endpoint overrides, HTTP downgrade, automated retries or paid fallback are implemented.

| Product | Integration scope | Cache |
| --- | --- | --- |
| Mediastack | Published news, up to 5 records | 15 minutes |
| Numverify | Phone formatting/country/carrier metadata; not ownership or reachability | 24 hours, account-scoped memory only |
| IPstack | Approximate location of an explicitly supplied public IP; no automatic IP profiling | 24 hours, account-scoped memory only |
| Aviationstack | Flight status by flight code, airline reference by IATA code | 5 minutes |
| Positionstack | Forward/reverse geocoding of an explicitly supplied address/coordinates; no map tiles or routing | 30 days, account-scoped memory only |
| Countrylayer | Country reference by ISO alpha-2 code; offsets may not reflect current daylight saving | 7 days |
| Marketstack | Up to 5 historical/end-of-day stock records; not live quotes, forex or investment advice | 1 hour |
| Mailboxlayer | Syntax and domain/MX signals; SMTP and catch-all checks disabled, no guaranteed mailbox existence/delivery | 6 hours, account-scoped memory only |

Queries are offered to the model only for relevant explicit requests. They are not mandatory, even when a tool is offered. A phone/email/address/IP must come from the current request, not account settings, server network metadata or earlier chats. Removing an instruction to use external services prevents offering these tools. At most two different specialized products can be used in one answer; a product is not retried in that answer. The provider receives only the needed lookup arguments, not the whole conversation. Data and timestamps are reference material, never governing instructions. Sources are added to the standard source list.

`APILAYER_MONTHLY_LIMIT` is capped at 100 per product **for all users combined**; lower it to reserve quota for other applications. SQLite atomically reserves requests before sending; failed HTTP calls, malformed replies and timeouts count conservatively. Identical concurrent lookups are coalesced. Valid cache hits do not consume requests. The cap also covers a rolling 31-day window, so crossing a calendar month cannot create an accidental burst above a free allowance. This is stricter than some provider billing cycles. Limits do not include other applications using the same key: inspect actual provider usage and lower the local cap accordingly. This integration does not enable paid plans or configure the provider's billing/overage settings.

Quota and public-cache tables use the server SQLite file and require a persistent disk to survive service recreation. Separate server instances with independent databases do not share quotas; use one instance or implement shared atomic quota storage before scaling. Do not delete the database to reset limits. Failed authorization/plan checks open a protective circuit; a changed key changes that circuit identity. A provider quota response blocks that credential/product for 31 days. Errors are never returned with raw provider bodies or keys. Personal lookup responses are not persisted to the public cache or request-count tables.

## Release integrity

`npm run check` validates project syntax, required files, npm script targets and local server dependencies. `npm run check:release` additionally verifies the original complete release against `MANIFEST.sha256`; intentional source edits invalidate that release snapshot. Neither command proves the absence of all bugs or secrets.

## Storage security boundaries

Browser history is stored locally without a separate encryption password. A returning workspace may display that device’s cached history while the server is unavailable; this does not authorize API access or sending messages. Use a separate browser profile on shared devices and sign out before handing the device to someone else.

The 50 MB aggregate attachment cap currently applies to SQLite storage. Firestore enforces a per-document bound, but this release does not provide a trusted atomic aggregate attachment quota across multiple server instances or direct authenticated Firestore clients. Monitor cloud storage usage; do not interpret the local cap as a cloud billing guarantee.

Cloud deletion reconciliation between separate devices remains limited: a stale local copy on another device can be re-uploaded after a server-side deletion. This release does not claim global deletion consistency.
