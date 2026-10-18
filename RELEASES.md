# Релизы и этапы Pongy AI


## 0.18.6

- One complete code file is delivered with a download and its code block. Multiple source files are staged and delivered as one ZIP preserving their paths; source dumps are removed from the final project response.
- Static syntax, dependency and local-reference findings are exposed honestly. Up to two final-answer repair attempts are allowed before refusing invalid attachments. Generated code, builds and runtime tests are never executed by this server.
- Project requests use task-aware model routing and a separate bounded 180-second default deadline (`AI_PROJECT_TOTAL_MS`); ordinary chat retains its shorter budget. There are no separate billable availability probes.
- Concrete unfamiliar app purposes no longer trigger a platform/style questionnaire. Image edits preserve successive requested changes; prompt translation checks named subjects, explicit numeric counts and quoted visible text and briefly caches exact translations.
- Reminder delivery retains per-channel and per-device results, retries transient failures up to eight times with backoff, and recovers recent missed configuration/verification and legacy retry states. The UI can fetch schedules without waiting for SMTP; allowed push subscriptions are repaired automatically.
- Streaming Markdown parsing and line measurements are coalesced; unchanged answers and closed journals are not rebuilt needlessly. Low-resource devices use less expensive visual effects without overriding reduced-motion preferences. Frame rate still depends on device load and browser.
- Delivery on time still requires a running server, persistent schedule/VAPID storage, working mail transport and notification permission/device support. Free hosting sleep, missing credentials or denied OS notifications cannot be fixed by a UI patch. No real provider keys or user data are bundled.


## Current: 0.18.5 — focused answers, homework and image experience

Patch base: **0.18.4**. Restores omitted 0.18.3 conversation, presentation and rich-text changes found in the repository. Application generation asks only for an absent purpose, not optional platform/framework preferences; small unspecified apps default to a browser implementation. Coding has a separate bounded output budget and complex/visual Gemini work uses medium reasoning while simple text keeps minimal reasoning.

Homework selects the newest evidenced matching edition among actual read candidates, labels unknown metadata honestly, answers without an author questionnaire, and uses condition/solution/check/answer headings. This is not a guarantee of the latest official school textbook or a substitute for unavailable source text. Media follow-ups retain the relevant visual reference; video sampling provides up to twelve timestamped frames in three compact sheets, not audio or complete video understanding.

Cloudflare image prompts preserve the latest request, use bounded literal translation when Gemini is available and retain named-subject anchors. Requested realism is distinguished from explicitly stylized art. A stable square with slow animated dots is replaced by a large image with open/download controls, without provider-credit prose. No claim of perfect generation quality, exhaustive vocabulary, retraining, live API availability or error-free output is made. Existing provider quotas, billing opt-ins and safety rules remain.

Website **0.18.5**; Windows MSI **0.18.2** and Android APK **0.18.1** unchanged.


## Previous: 0.18.4 — Gemini + DeepSeek + Cloudflare

Patch base: **0.18.3**. Gemini's direct API is the primary general/vision route, with Flash-Lite first for short general requests and Flash first for complex/vision work. Explicitly enabled, operator-paid DeepSeek remains first for programming. OpenRouter is an independent zero-priced fallback. Google project billing and quotas still apply; no app flag can change an external provider's billing plan.

- Separate fixed endpoints and credentials; shared-provider quota errors skip other models on that provider, while independent providers remain eligible. No catalogue wait on the direct route.
- Cloudflare Workers AI FLUX.1 schnell replaces Pollinations when selected. Real returned image bytes are validated and attached; failed generation is never replaced with an unrelated picture or a hidden paid request.
- Bounded streaming/JSON I/O, cancellation, image-size validation, two concurrent image jobs, persistent UTC daily request reservations and Retry-After cooldown. The request cap does not promise a Neuron allowance shared with other applications.
- Existing safety, site-action confirmation, file checks and paid-model restrictions remain. No model guarantees perfect answers or perpetual free availability.

Website version is **0.18.4**; native MSI **0.18.2** and APK **0.18.1** are unchanged. No keys, user conversations or databases are included.


## Previous: 0.18.3

Patch over 0.18.2. Direct DeepSeek integration and response/document quality improvements. Read DEEPSEEK_SETUP.md before activation: API usage is billed to the operator and requires explicit permission. Existing MSI 0.18.2 and APK 0.18.1 remain unchanged.

## 0.18.2

Patch over 0.18.1. Windows-only installer update with logo background, English/Russian selection and optional desktop shortcut. Android remains 0.18.1.

## Previous: 0.18.1

Apply over 0.18.0. New MSI/APK downloads are in `public/downloads/`; see README for runtime requirements, Android certificate change, scoped permissions and image-provider setup. Free Classic image generation is best-effort, not guaranteed capacity.

Новая подробная нумерация присвоена задним числом фактическим этапам разработки. Часть этапов поставлялась вместе в одном архиве: отдельная запись здесь **не означает отдельный ранее опубликованный GitHub Release или тег**. Даты выпусков не выдумываются. Каждый новый самостоятельный патч далее получает собственную запись.

Файл содержит заметки для GitHub Releases, но не создаёт и не переименовывает релизы автоматически.

## Предыдущая версия: 0.18.0

Патч поверх 0.17.4: документы PPTX/DOCX/HTML, ИИ-помощники заметок,
точные напоминания из текста и приоритет их почтовой доставки, бесплатный
публичный поиск и улучшения навигации браузерной оболочки. Добавлены docx и
pptxgenjs; image-size закреплён на исправленной версии. Новые нативные
MSI/APK не входят. Бесплатный провайдер картинок не появляется автоматически;
платные модели и полный доступ к устройству не включены.

## Предыдущая версия: 0.17.4

Патч поверх 0.17.3: SMTP для почты напоминаний и уведомлений об ответах,
обязательное шифрование TLS, сохранение Resend как альтернативы. Нужны данные
реального почтового ящика и пароль приложения. Добавлена зависимость Nodemailer.
Установщики не пересобирались; данные и ключи не включены.

## Предыдущая версия: 0.17.3

Патч поверх 0.17.2: поисковое обнаружение учебников, близкое время напоминаний,
раннее восстановление анимаций, уведомления о готовности и ошибках по согласию.
Публичный поиск не гарантирует доступность сайтов или актуальность издания.
Для писем нужен настроенный почтовый отправитель, для push — разрешение и
поддержка устройства. Установщики и зависимости не изменены.

## Предыдущая версия: 0.17.2

Патч поверх 0.17.1: приоритет уменьшения движения, согласованная политика
CORS для запросов настроек и устранение дополнительного PUT при уходе
со страницы. Локальная очередь настроек сохраняется и повторяется после
восстановления. Установщики и зависимости не изменены.

## Предыдущая версия: 0.17.1

Небольшой патч поверх 0.17.0: устранение переполнения мобильного окна напоминания при устаревшем измерении высоты экрана. Проверки границ сохранены и дополнены воспроизводимым сценарием задержки обновления viewport. Содержимое прокручивается без сжатия полей. Установщики и серверная логика не изменены.

## Предыдущая версия: 0.17.0

Патч поверх 0.16.6. Уточнение требований к приложениям, рекомендации стека, ZIP многофайлового проекта с README, ограниченные статические проверки и точное чтение сохранённых исходников. Добавлены подтверждаемые команды навигации и режима ввода; контекст ИИ содержит поддерживаемые действия и ограничения. Проверки исходников не являются запуском, сборкой или доказательством готовности приложения. Установщики не пересобирались; облачные квоты не увеличены.

## Предыдущая версия: 0.16.6

Исправлено применение мобильных стилей на сенсорных устройствах, переработано окно напоминания, выровнены кнопки шапки и добавлены действия сообщений только иконками на телефоне. Неполные команды заметок и напоминаний уточняются, конкретные изменения заметок предлагаются без внешней модели и применяются после подтверждения. Текст напоминания необязателен. Установщики не пересобирались; онлайн-клиенты получают интерфейс с сервера.

## Предыдущая версия: 0.16.5

Компактные локализованные предупреждения над вводом при исключительных состояниях сети, сервиса и дневного лимита. Технические работы управляются явным флагом владельца, а слабая сеть — доступной оценкой браузера, не выдуманным уровнем радиосигнала.

## Предыдущая версия: 0.16.4

Напоминания заметок и чата, обычный и ежедневный режимы, уведомления чата, настроенной почты и поддерживающих Web Push устройств. Сервер должен работать, а SQLite и VAPID-ключи — храниться на постоянном диске; бесплатный засыпающий хостинг не обеспечивает точную доставку. Исправлены сочетания начертаний выделенного текста, добавлено текстовое «Поделиться» для заметок. Чтение литературных источников различает фрагмент, справку и полный текст, который не объявляется прочитанным без подтверждения. Плавные анимации включены по умолчанию. Нативные установщики не пересобирались.

## Предыдущая версия: 0.16.3

Поиск конкретных учебных заданий с чтением публичных страниц и ссылками на источники. Номер без автора не считается однозначным заданием. Страна учитывается только из слов пользователя; автоматическое определение местоположения не добавлено. Для общего веб-поиска нужен ранее подключённый Tavily или Brave. Увеличено ожидание модели без обхода квот провайдера.

## Предыдущая версия: 0.16.2

Стабильные действия под сообщениями, компактные карточки файлов с иконками открытия и скачивания, плавный лайк и улучшенное оформление ответов. Убрана автоматическая проверка экспериментальных браузерных языковых пакетов при показе голосовой ошибки. Системные окна сохранения управляются браузером и ОС. Нативные установщики не менялись.

## Предыдущая версия: 0.16.1

Быстрые карточки загрузки, фото до 25 МБ, локальный анализ видео до 100 МБ по кадрам и точные ответы о тарифе.

## Предыдущая версия: 0.16.0

Резервная диктовка Vosk на устройстве с моделями RU/EN, без зависимости от сервиса распознавания браузера. Первый запуск требует загрузки модели; серверные ключи не нужны. Векторный значок разработчика, плавная обратная связь кнопок и обновлённое окно скачивания. Нативные пакеты 0.15.0 не изменялись.

## Линейка 0.16.x

| Версия | Изменение |
| --- | --- |
| 0.16.0 | Локальный резерв диктовки RU/EN и улучшение окна скачивания |

## Предыдущая версия: 0.15.0

**Устанавливаемые онлайн-клиенты Pongy AI.** Windows x64 MSI, подписанный Android APK, кнопки скачивания и уведомление о новых нативных версиях. Сайт обновляется на сервере; установка пакетов требует подтверждения устройства. Клиенты не снимают квоты ИИ и не обещают неподтверждённого ускорения. Windows-пакет не подписан доверенным сертификатом. 2.0.0 не выпущена.

## Линейка 0.15.x

| Версия | Изменение |
| --- | --- |
| 0.15.0 | Онлайн-клиенты Windows/Android, реальные загрузки MSI/APK, проверяемые хеши и интерфейс обновления |

## Линейка 0.14.x

| Версия | Изменение |
| --- | --- |
| 0.14.0 | Журнал реальных действий, планирование, чтение исходников и готовые файлы, синтаксические проверки без исполнения, восстановление голосового ввода и плавные панели |

## Линейка 0.13.x

| Версия | Изменение |
| --- | --- |
| 0.13.0 | Заметки с подтверждаемыми правками ИИ, режимы в сообщениях, целые строки при сворачивании, прерывания и чтение сохранённой истории |

## Линейка 0.12.x

| Версия | Изменение |
| --- | --- |
| 0.12.3 | Проверенные данные своего аккаунта, повтор после сбоя без антиспама, десять бесплатных кандидатов и прозрачные иконки |
| 0.12.2 | До восьми бесплатных кандидатов, точная обработка квот, время сообщений и синхронная смена темы/языка |
| 0.12.1 | Актуальные настройки и собственный аккаунт, идемпотентные команды, подтверждение памяти/имени/анимаций, усиление защиты |
| 0.12.0 | Бесплатные маршруты под задачи, до пяти резервов, контекстный сленг RU/EN, персонализация и исправления ссылок |

## Линейка 0.11.x

| Версия | Изменение |
| --- | --- |
| 0.11.5 | Контрастная кнопка остановки, уровни реального аудиосигнала и непрерывные анимации статуса |
| 0.11.4 | Строковая метка сборки CSS и строгая диагностика совпадения версий интерфейса |
| 0.11.3 | Стабильная проверка доступности кнопки выхода после изменения мобильного размера и языка |
| 0.11.2 | Выбор моделей под сложные задачи и сокращение ожидания каталога и конфигурации |
| 0.11.1 | Возврат к последнему сообщению, выбор анимаций, контроль версий интерфейса и локальное распознавание при поддержке браузером |
| 0.11.0 | Локальная точная арифметика, резервирование бесплатного маршрутизатора, улучшения медиа и взаимодействия |

## Линейка 0.10.x

| Версия | Изменение |
| --- | --- |
| 0.10.4 | Восстановлен исходный lock-файл сторонних зависимостей; исправлена установка npm ci |
| 0.10.3 | Синхронизация доступности мобильной панели и ожидание асинхронного обновления в тесте WebKit |
| 0.10.2 | Очистка дубликатов поставки, точная диагностика CI, тайм-ауты, изоляция аккаунтов и регрессионные исправления |
| 0.10.1 | Исправление гонки локальной истории, проверки зависимостей и целостности полной поставки |
| 0.10.0 | Восемь опциональных источников APILayer с кэшем, квотами и защитой персональных данных |

## Линейка 0.9.x

| Версия | Изменение |
| --- | --- |
| 0.9.1 | Навыки в начале поля ввода с удалением по крестику |
| 0.9.0 | Антиспам, суточный лимит, длинные чаты, чтение истории по запросу и шапка режима |

## Линейка 0.8.x

| Версия | Изменение |
| --- | --- |
| 0.8.0 | Меню инструментов, тёплые ответы, роли разработчиков и подтверждаемая отмена действий |

## Линейка 0.1.x

| Версия | Изменение |
| --- | --- |
| 0.1.0 | Первый запуск |
| 0.1.1 | Серверные ключи ИИ |
| 0.1.2 | Защита сессий и запросов |
| 0.1.3 | Стабильность ответов ИИ |
| 0.1.4 | Исправления авторизации |
| 0.1.5 | Исправления истории и панели |

## Линейка 0.2.x

| Версия | Изменение |
| --- | --- |
| 0.2.0 | Авторизация Firebase |
| 0.2.1 | Подтверждение почты |
| 0.2.2 | Восстановление пароля |
| 0.2.3 | Локализация форм входа |
| 0.2.4 | Совместимость аккаунтов |
| 0.2.5 | Проверка и отзыв сессий |

## Линейка 0.3.x

| Версия | Изменение |
| --- | --- |
| 0.3.0 | Чаты и вложения |
| 0.3.1 | Анализ документов |
| 0.3.2 | Анализ изображений |
| 0.3.3 | Уточнение ответа |
| 0.3.4 | Группировка истории |
| 0.3.5 | Необязательное облачное хранение |
| 0.3.6 | Очистка интерфейса сообщений |
| 0.3.7 | Исправления повторной отправки |
| 0.3.8 | Восстановление интерфейса Plus |

## Линейка 0.4.x

| Версия | Изменение |
| --- | --- |
| 0.4.0 | Поддержка ZIP |
| 0.4.1 | Раскрываемые источники |
| 0.4.2 | Wiki и фотографии |
| 0.4.3 | Создание файлов |
| 0.4.4 | Проверка формата вложений |

## Линейка 0.5.x

| Версия | Изменение |
| --- | --- |
| 0.5.0 | Чтение публичных веб-страниц |
| 0.5.1 | Альтернатива Brave Search |
| 0.5.2 | Поиск по необходимости |
| 0.5.3 | Выбор быстрых моделей |
| 0.5.4 | Единый язык интерфейса |
| 0.5.5 | Единые иконки приложения |
| 0.5.6 | Описание и предпросмотр сайта |
| 0.5.7 | Восстановление авторизации |
| 0.5.8 | Копии неотправленных изменений |
| 0.5.9 | Анимации и переходы |
| 0.5.10 | Исправления GitHub Actions |
| 0.5.11 | Нейтральное приветствие |
| 0.5.12 | Прозрачная иконка в чате |
| 0.5.13 | Статус загрузки истории |

## Линейка 0.6.x

| Версия | Изменение |
| --- | --- |
| 0.6.0 | Полная локальная история |
| 0.6.1 | Резервные копии |
| 0.6.2 | Восстановление и отложенное удаление |
| 0.6.3 | Мобильные настройки |
| 0.6.4 | Новая схема нумерации |
| 0.6.5 | Полный журнал обновлений |
| 0.6.6 | Исправление запуска браузеров в GitHub Actions |
| 0.6.7 | Полный проект и стабильность браузерных проверок |
| 0.6.8 | Авторизация, сохранение настроек, интерфейс и ограничение ожидания ИИ |
| 0.6.9 | Выбор языка при входе, подтверждение почты и понятные ошибки |
| 0.6.10 | Плавный вывод ответа и компактные этапы обработки |

## Линейка 0.7.x

| Версия | Изменение |
| --- | --- |
| 0.7.0 | Форматирование и рабочее пространство |
| 0.7.1 | Стабильность потока, индикаторы и предпросмотр вложений |
| 0.7.2 | Восстановление локальной истории, мобильная компоновка и анализ видео по выборке кадров |

## 2.0.0 — Глобальный релиз

Только тизер. Не создавайте для него выпущенный Release и не ставьте эту версию в приложение.

Подробности: [CHANGELOG.md](CHANGELOG.md).

### 0.6.9
Выбор языка при входе, автоматическое завершение подтверждения почты и понятные сообщения об ошибках.

### 0.6.10
Световая волна, анимированные точки и мягкое появление ответа без курсора.
