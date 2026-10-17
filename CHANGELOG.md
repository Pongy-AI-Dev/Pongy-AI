# Журнал изменений Pongy AI


## 0.16.2

- Keep controls for previous messages available during streaming; preserve like-button focus and animate the reaction without replacing the message tree.
- Replace attachment excerpts with centered filenames, plus-icon previews and download controls; show file previews immediately, cancel stale fetches, and preserve complete download bytes.
- Retain download object URLs long enough for native save dialogs and prevent duplicate concurrent attachment downloads.
- Avoid automatic experimental native speech-package probes from error banners; offer the bundled on-device engine explicitly.
- Refine answer typography, quotes and tables with sanitized markup and reduced-motion support.

## 0.16.1

- Center and enlarge the voice-recovery close control with its own background.
- Accept 25 MiB photo inputs and 100 MiB local video inputs; preserve bounded normalization, two-minute frame sampling and cloud-document limits.
- Show immediate attachment cards, blob previews and actual upload progress; optimize large photos before transfer and spool server inputs to private temporary files with bounded concurrency.
- Remove full-height unclipping during streaming measurements, stabilize wrapper swaps, add cancellable smooth following and gentler incremental text reveal.
- Add provider-independent product/upgrade answers and verified product facts for model context.
- Use up to 12 free-only attempts, permit one short Retry-After recovery within that budget, and cache explicit shared quota cooldowns to avoid futile provider calls. These changes do not bypass provider quotas.

## 0.16.0

- Add bundled RU/EN on-device Vosk dictation as automatic recovery from unavailable browser speech services; retain drafts and microphone permission handling.
- Package model archives as upload-sized parts and stream them from fixed same-origin routes; isolate WebAssembly runtime bindings in a worker while retaining the strict main-page CSP.
- Reuse a loaded language model within the tab, stop microphone tracks on cancellation, and drive level bars from actual microphone samples.
- Replace the text developer emblem with a centered vector icon and add reduced-motion-aware, gentle download/button feedback.
- Use a bold localized download title and the qualified slogan about possible local-interface speed; retain platform signing disclosures.
- Add real audio recognition tests and archive/hash/CSP checks. Existing native 0.15.0 packages remain unchanged.

## 0.15.0

- Add real Windows x64 MSI and self-signed Android APK online clients with publisher metadata Pongy AI Dev; use browser sessions rather than embedded Google credential forms.
- Add public attachment download endpoints, versioned package URLs, byte lengths, SHA-256 hashes and an Android certificate fingerprint.
- Add localized header/settings download controls, platform choices and a close-only state after requesting a download.
- Hide installation controls in client sessions, show newer-native-package notices and display website/client versions in settings.
- Describe actual browser/internet requirements, unsigned Windows publisher warnings and OS-confirmed updates; make no unmeasured speed or quota claims.
- Separate public asset and dynamic API/authentication rate budgets so repeated page loads do not block login; retain authentication, chat and dynamic request limits.
- Exclude native build intermediates and private signing keys from release payloads; fail source checks if a private keystore is committed.

## 0.14.0

- Add a public work journal with supplied-context counts, planned steps, actual tool operations, syntax-check results and attached filenames; do not expose private reasoning or label plans as completed actions.
- Attach real named source files from complete code blocks automatically; safely highlight code and preserve copy/download bytes.
- Add account/chat-scoped saved project-file listing and paged text reading; retain accepted UTF-8 source text without silent truncation.
- Parse JavaScript and JSON without executing generated code; explicitly mark unsupported languages and runtime testing as not checked.
- Start browser speech recognition directly from the user gesture; provide explicit installed-local retry and keyboard fallback without automatic pack installation.
- Answer conversational developer-status questions from authenticated account facts and center the developer badge.
- Animate expandable journals, sources, pinned-message panels and long answers with reduced-motion support.

## 0.13.0

- Add account-isolated notes with SQLite/Firestore persistence, device drafts, optimistic revision checks, search, pinning, renaming and deletion.
- Add selection-only note formatting, font sizes, indents, spoiler text and attachment placement/replacement/removal tools.
- Add explicit-request note reading and confirmation-only note edit proposals; preserve attachments and reject stale proposals.
- Persist composer modes in sent messages and include the actual selected mode in model instructions.
- Preserve partial answers with localized red interruption markers; treat truncated streams without DONE as interrupted, not successful.
- Measure collapsed answers at whole visual-line boundaries and scroll to the latest message after sending.
- Add tactile button motion, a floating workspace switch and unclipped logo rotation, respecting reduced motion.
- Add indexed own-account history retrieval with character-level continuation and exact previous-answer replay.
- Include all fixes from 0.12.3 in the patch relative to 0.12.2.

## 0.12.3

- Answer own-account identity questions from authenticated facts without introducing the assistant or exposing other accounts.
- Cache verified Firebase registration dates and repair verified local identity flags; preserve unknown dates for legacy accounts.
- Advance duplicate-message protection only after a completed successful reply; failed, empty or interrupted responses remain retryable.
- Increase the default free-only candidate pool to ten (configurable ceiling: twelve), deduplicate candidates and distinguish shared minute quotas from per-model failures; external provider quotas are unchanged.
- Generate transparent browser/touch icons from the welcome logo and verify their pixels and ICO frames.
- Retain dynamic UI-suite discovery instead of a hard-coded suite count.

## 0.12.2

- Raise the bounded free-only candidate pool from six to eight; retain live zero-price checks and the free router reserve.
- Increase first-output budgets to 6/8 seconds, stream idle timeout to 18 seconds and overall deadline to 75 seconds; terminal account quota failures do not trigger futile retries.
- Respect per-model Retry-After cooldowns and distinguish explicit provider daily free-model quotas from transient model rate limits.
- Persist message timestamps locally and server-side; show localized times alongside message actions, with honest unknown-time labels for legacy messages.
- Commit theme and translated UI synchronously without staggered color transitions.
- Add an accessible five-turn logo animation followed by a title-letter wave, unified surface/control motion and complete modal exit timing; respect reduced motion.

## 0.12.1

- Compare requested settings with a fresh UI/account snapshot and suppress no-op proposals; recheck before applying stale cards.
- Add server-verified own-account answers for email, nickname, status, saved-chat count and account age with an explicit creation-date source.
- Add confirmation-only nickname, other-chat memory and animation actions; retain them across history reloads.
- Add a scoped explicit saved-chat reader with completeness metadata and stricter action-intent validation.
- Refine response-language instructions for mixed quotations and short follow-ups without translating code or proper names.
- Add bounded nested decoding and independent generated-code checks; preserve account isolation and safe-tool boundaries.
- Unify control geometry, focus indicators, code-card actions and restrained hover feedback with reduced-motion support.

## 0.12.0

- Add live zero-price verification across all pricing fields, curated task-specific candidates and a maximum of five reserves including the free router; paid models remain disabled.
- Shorten first-output waits for stalled providers and answer exact greetings locally after authentication, safety and message limits.
- Expand RU/EN contextual slang and response-format guidance; preserve account-isolated personalization and trusted developer facts.
- Allow requested source links in answer text, expose research tools for explicit link requests, and render Markdown URLs containing parentheses correctly.
- Increase the default answer budget, report token truncation honestly, and do not attach truncated code as a completed file.
- Block legacy paid-image activation while Plus is inactive; no free image-generation endpoint is claimed.

## 0.11.5

- Use a black/white theme-aware stop button with a centered opposite-color square.
- Prime the audio context from the user gesture and drive microphone bars from measured waveform RMS and speech-band energy, with smoothed attack/release and honest unavailable-state feedback.
- Preserve task animation phase across re-renders and strengthen visible shimmer/dot contrast without overriding reduced-motion preferences.

## 0.11.4

- Encode the stylesheet build version as a quoted CSS string to avoid numeric-token serialization differences between browser engines.
- Expose completed build-check state and non-secret UI/server/CSS version diagnostics; tests now wait for that state, independently of login/history readiness.
- Retain and extend warnings for mixed server versions, stale CSS and missing stylesheet build markers, including recovery checks.

## 0.11.3

- Wait for the actual visual viewport and responsive layout before scrolling settings in localization UI checks.
- Verify the full sign-out button is visible, padded and clickable across portrait, short and landscape mobile sizes in both interface languages.
- Preserve all existing localization, account-isolation and browser assertions.

## 0.11.2

- Route coding and mathematical tasks using conservative capability hints while retaining owner preferences, modality/context checks and free-only restrictions.
- Reuse stale model metadata immediately and cap cold catalogue waiting; cancelling one user no longer cancels the shared catalogue refresh.
- Remove the unrelated public-configuration dependency from validated history/preferences loading without bypassing authentication.

## 0.11.1

- Add a circular latest-message button without moving the composer.
- Add explicit system/full/reduced motion preferences and actual build-version diagnostics.
- Version frontend assets and disable stale caching for the main UI files.
- Prefer on-device speech when supported and its language pack is installed; provide explicit offline-pack installation and persistent recovery controls.
- Keep dictation drafts on browser-service errors and never silently upload audio to another provider.

## 0.11.0

- Add bounded exact local arithmetic, independent of model availability.
- Improve conversational/slang instructions without claiming universal language support.
- Reserve the free-only router fallback and bound time to first output.
- Preserve finer image and sampled-video detail within existing upload bounds.
- Remove the upload-file skill prefix; align the mode close icon and soften interactive feedback.
- Move unconfigured-payment errors to the final Pay action; never collect card details or fabricate QR codes without a provider.
- Add real-time animation and checkout regressions.

## 0.10.4

- Restore oauth 0.10.2 and all third-party lockfile entries after an application-version replacement accidentally modified dependency metadata.
- Change only root application versions when bumping package manifests.
- Retain the mobile sidebar and WebKit regression fixes from 0.10.3.

## 0.10.3

- Synchronize sidebar accessibility on breakpoint changes and page restoration.
- Await asynchronous mobile viewport state in the WebKit session test without removing inert or aria-expanded assertions.
- Include viewport and sidebar state in fixture diagnostics.

## 0.10.2
- Removed duplicate upload artifacts from the release and restored the complete environment template under its canonical dotfile name. A dry-run cleanup utility refuses to delete non-identical files.
- Deferred-delete browser assertions wait for the actual successful DELETE response rather than an unreliable fixed 300 ms delay.
- UI suites now run with named results, bounded execution and an aggregate failure report; no browser suite or security check is disabled. CI uploads the hidden diagnostic-log directory explicitly.
- Keepalive chat saves retain request deadlines; stalled AI startup hooks release their concurrency slots. Incomplete upstream streams no longer become completed saved answers.
- Account transitions clear unsent composer drafts. Export/import recheck account identity across pending local writes.
- Resending verification creates an encrypted HttpOnly pending verification session and restarts automatic confirmation polling without exposing refresh credentials.
- Specialized resources respect common external-service opt-out wording; email punctuation and coordinate signs remain significant.
- Attachment budgets count expanded model-bound text and image payloads rather than compressed ZIP sizes, including top-level attachments.
- IME confirmation does not prematurely submit; a closed mobile sidebar is inert and its trigger exposes expanded state.

## 0.10.1
- Complete release includes all UI suites, test fixtures and server modules; required files and script targets are checked before browser tests.
- Source checks resolve local server imports and worker entrypoints, validate syntax across the project and scan credential markers including tests and the environment template.
- Optional release-integrity check verifies every delivered file against SHA-256 and rejects missing, changed or additional files. Normal development checks do not require unchanged release hashes.
- Fixed a race that discarded local chat history after a fast session-server failure and a slower browser-storage response. Cached data never authorizes message sending.
- Session tests explicitly check required controls and hold the server response until cached-start assertions finish instead of racing a fixed delay.
- Prevented delayed attachment fetch/blob/text handlers from reopening another account’s preview after logout, account switching or closing the panel.
- Invalid primitive JSON from optional resource providers returns a bounded failure instead of rejecting the tool promise.

## 0.10.0
- Added optional Mediastack, Numverify, IPstack, Aviationstack, Positionstack, Countrylayer, Marketstack and Mailboxlayer tools, disabled until configured on the server.
- Prompt-specific tool availability, explicit personal-data arguments, account-scoped private caches, bounded HTTPS requests, sanitized output and source attribution.
- Global per-product cap of up to 100 attempts in a rolling 31-day window, durable SQLite counters, request coalescing, public caches and protective circuits. No automatic paid fallback, background refresh or HTTP downgrade.
- Integration intentionally exposes only supported bounded lookups, not universal geographic data, live forex/stock quotes, or proof of phone/email ownership.


## 0.9.1
- Навыки из меню «+» отображаются компактными метками внутри поля ввода перед текстом вместо полосы над чатом.
- Крестик удаления появляется при наведении или клавиатурном фокусе; на сенсорных устройствах всегда виден. Удаление метки не стирает текст и не удаляет вложения. Метки не добавляются в текст запроса.
- «Загрузить файл» открывает системный выбор файлов и добавляет отдельную метку, независимую от программирования или генерации изображений.


## 0.9.0
- Серверный антиспам: второе одинаковое сообщение подряд получает напоминание, третье и последующие отклоняются без обращения к ИИ. Статус «Не отправлено» сохраняется в истории. Пробелы и регистр нормализуются, вложения учитываются. Новый вопрос сбрасывает серию.
- Общий лимит аккаунта: 100 принятых отправок за сутки UTC; максимум 1000 записей пользователя и ИИ в чате. Второе повторение учитывается, отклонённые попытки — нет. Неудачные запросы к провайдеру учитываются как принятые отправки. Счётчики хранятся в SQLite: для сохранения после пересоздания сервиса нужен постоянный серверный диск.
- Сиреневая полоса выбранного режима над чатом с кнопкой отключения; одинаковые функции меню «+» на ПК и телефонах, загрузка через системный выбор файлов. Набор вариантов системного окна зависит от ОС и браузера.
- Чтение собственного сохранённого чата по явной просьбе: название без учёта регистра либо предыдущий чат. Содержимое вложений не подгружается автоматически; при превышении объёма контекста модель обязана сообщить о неполном чтении.
- Кнопки копирования и скачивания в шапке предпросмотра остаются иконками, файл скачивается полностью; убрана обрезка текста предпросмотра.

## 0.8.0 — Инструменты, общение и подтверждаемые изменения
- Дружелюбные локализованные ответы о продукте; инструкция против случайного смешения языков, без изменения кода и собственных названий.
- Подтверждаемое обратное действие для последнего применённого изменения ИИ: тема, язык, поиск, рассуждение, навигация и встроенный звук.
- Серверная проверка занятых адресов при регистрации и понятное сообщение о существующем аккаунте; связывание старого аккаунта не создаёт дубль.
- Признак разработчика только по подтверждённой сервером почте из публичного списка команды. Правила безопасности и изоляция аккаунтов одинаковы для всех.
- Пассивная самопроверка конфигурации и базовых функций по запросу разработчика, без произвольного выполнения кода.
- Меню «+»: вложения, программирование, создание изображения при настроенном провайдере. Мобильный выбор камеры, галереи или файлов.
- Контекст выбранной модели и фактической подписки; выбор в интерфейсе не предоставляет платный доступ.
- Проверки известных способов обфускации, скрытых инструкций во вложениях и вредоносного содержимого создаваемых файлов; это не гарантия полной защиты от всех обходов.
- Диктовка больше не ждёт индикатора микрофона; ограниченное ожидание запуска, защита от повторов и поздних событий отменённого сеанса.
- Стрелка раскрытия ответа без подписи, доступное название для скринридера; сохранение заголовка предпросмотра при запуске.
- Резервные контакты поддержки с честным указанием невозможности проверить доставку через mailto.

## 0.7.2 — История, мобильный экран и бесплатные модели
- Локальная история объединяется с серверной, даже если облако возвращает пустой список. Новые локальные записи и отметки удаления защищены от устаревших снимков.
- Неотправленные изменения больше не удаляются автоматически через семь дней; настройки сравниваются по времени изменения.
- Сохранённая локальная история показывается без блокирующего экрана. Проверка сессии проходит в фоне; до подтверждения отправка и управление недоступны. При отклонённой сессии локальное представление скрывается, но резервная копия не удаляется.
- Высота интерфейса учитывает видимую область браузера, экранную клавиатуру и безопасные отступы. Исправлены мобильное меню, альбомная ориентация и пересечение выбора языка с формой входа.
- Переходы без масштабирования текста авторизации; снижено количество повторных анимаций.
- До 9 моментов видео на трёх хронологических листах с временными метками; MP4/WebM до 20 МБ и 2 минут. Без анализа звука и гарантии полноты видеоряда.
- Бесплатный резервный router поддерживает изображения. Старые вложения не переводят несвязанные текстовые вопросы в vision-режим; контекст старых сообщений ограничен.
- Безопасная классификация лимитов и отказов провайдера; однократный повтор без tools при несовместимости параметров. Платные текстовые модели не подключаются автоматически.
- Общий срок обработки ограничен 60 секундами, ожидание данных от отдельной модели — 15 секундами. Доступность бесплатных внешних моделей не гарантируется.

## 0.7.1 — Стабильность чата и предпросмотр
- Анализ видео по 3 выбранным в браузере кадрам через vision-модели: MP4/WebM до 20 МБ и 2 минут, без анализа звука и всего видеоряда.
- Позиция чтения сохраняется при статусах и потоковом ответе; индикаторы обновляются без пересоздания всего чата.
- Постоянный анимированный статус во время ответа, световой блик, точки и контекстные значки.
- Убрана внутренняя обводка поля ввода; более спокойные переходы без масштабирования кнопок при нажатии.
- Иконки управления кодом, крестик закрытия, миниатюры вложений и текстовые выдержки.
- Предпросмотр MP4/WebM до 512 КБ, без обещания анализа видео нейросетью.
- Заголовок закреплений ведёт к сообщению, отдельная стрелка открывает список.
- Контекст текущих настроек и имени; каталог собственных чатов без их содержимого при запросах навигации.
- Резервное формирование подтверждения для однозначно распознанных действий с настройками.
- Сведения о продукте используются выборочно, без вывода всей базы.

## 0.7.0 — Форматирование и рабочее пространство
- Формулы KaTeX, кодовые карточки с копированием, скачиванием и боковым предпросмотром.
- Изолированный запуск HTML/JavaScript только по подтверждению; без выполнения кода на сервере.
- Широкие ответы без рамки, компактный шрифт, сворачивание длинных сообщений.
- Лайки и несколько закреплённых сообщений с сохранением в истории.
- Подтверждаемые действия ИИ: настройки, навигация по своим чатам, встроенный фоновый звук.
- Реальные этапы обработки, плавное появление текста и индикатор уровня микрофона.
- Резервные фото Wikipedia и поддержка image-ответов совместимых chat-моделей; генерация по-прежнему требует настройки провайдера.
- Кэширование формул и отсутствие ненужных инструментов на простых запросах снижают нагрузку.
- Фиксированные сведения о Pongy AI, локализация EN/RU и дополнительные проверки небезопасных запросов.
- Оплата не включена. Версия 2.0.0 остаётся будущим тизером.

## 0.6.10
- Световая волна индикатора ожидания и подпрыгивающие точки.
- Компактное раскрытие этапов обработки без отдельной карточки.
- Мягкое появление новых фрагментов ответа без мигающего курсора и повторной анимации старого текста.
- Поддержка уменьшенного движения в системных настройках.

## 0.6.9
- Добавлен компактный переключатель языка на странице входа и понятные сообщения об ошибках.
- Добавлен автоматический вход после подтверждения почты с краткосрочным HttpOnly cookie и зашифрованными учётными данными.
- Сохранены проверка подтверждения почты и блокировка операций при отказе облачного хранилища.

Новая подробная нумерация присвоена задним числом фактическим этапам разработки. Часть этапов поставлялась вместе в одном архиве: отдельная запись здесь **не означает отдельный ранее опубликованный GitHub Release или тег**. Даты выпусков не выдумываются. Каждый новый самостоятельный патч далее получает собственную запись.

## 2.0.0 — Глобальный релиз

**Не выпущен.** Будущий глобальный этап Pongy AI. Дата и функции пока не объявлены; в этом обновлении он не реализуется.

## 0.6.8 — Авторизация, настройки и интерфейс

- Исправлена установка защищённой OAuth-cookie за HTTPS-прокси Render; проверка Google state сохранена.
- Добавлены безопасные коды ошибок Google, Firebase и Firestore с русскими и английскими сообщениями.
- Срок сессии увеличен до 30 дней. Проверка отзыва и выход из аккаунта сохранены.
- Неподтверждённые настройки сохраняются на устройстве и повторно отправляются после восстановления соединения.
- Обновлены тёмная палитра, оформление автозаполнения и анимация переключения видимости пароля без сдвига кнопки.
- Добавлена раскрываемая панель этапов обработки ИИ с потоковыми статусами и локализацией; скрытое рассуждение модели не имитируется.
- Усилено ограничение ожидания потока ИИ и освобождение занятого слота после таймаута.
- Добавлены регрессионные тесты авторизации, оформления, настроек и отмены потока.

## 0.6.7 — Полный проект и стабильность браузерных проверок

- Исправлено зависание запроса постоянного хранилища: статус ожидания, ограниченное время ожидания и различение отказа, ошибки и отсутствия ответа.
- Разрешение и отказ хранилища проверяются отдельно; тесты не зависят от нативного диалога разрешений в headless Firefox/WebKit.
- Тесты ожидают реальную готовность авторизации и истории вместо предположения о готовности через 200 мс.
- Проверка сохранения ответа ожидает фактическую запись в базу, а не только завершение потокового вывода.
- CI закреплён на Ubuntu 24.04 и использует Playwright из установленных зависимостей проекта.
- Полный согласованный архив включает браузерный launcher, тестовые PDF/DOCX, все исходники, иконки, .gitignore и полный безопасный шаблон .env.example. Убраны дубликат env.example и случайный download.
- Оплата остаётся заглушкой; 2.0.0 остаётся тизером.

## 0.6.6 — Исправление запуска браузеров в GitHub Actions

- Удалён жёстко заданный локальный путь Chromium из Firebase UI-тестов.
- Все браузерные тесты используют единый запуск по BROWSER_ENGINE: Chromium, Firefox или WebKit.
- В CI используются браузеры, установленные Playwright; локальный CHROMIUM_PATH не подменяет Firefox/WebKit.
- Добавлены регрессионные тесты конфигурации запуска. Проверки не отключаются.
- Локально пройдены 109 автоматических тестов и 151 проверка Chromium. Дополнительно проверен полный UI-набор на Node.js 22 с CI=true и заведомо неверным CHROMIUM_PATH: используется браузер Playwright. Полные Firefox/WebKit прогоны здесь не проводились.

## 0.6.5 — Полный журнал обновлений

- Расширены записи по фактическим изменениям, выделены дополнительные патчи Tavily и CI repair; уточнено отличие этапов разработки от опубликованных GitHub Releases.

## 0.6.4 — Новая схема нумерации

- Журнал начинается с 0.1.0; большие функциональные изменения повышают второе число, исправления — третье. Добавлен тизер 2.0.0.

## 0.6.3 — Мобильные настройки

- Исправлены отступы нового раздела истории и обрезание кнопки выхода на телефоне.

## 0.6.2 — Восстановление и отложенное удаление

- Добавлены восстановление после очистки серверной базы, сохранение отметок удаления и запрос постоянного хранилища браузера.

## 0.6.1 — Резервные копии

- Добавлены экспорт и проверяемый импорт JSON. Совпадающие ID добавляются как отдельные чаты. Бинарные вложения в копию не входят.

## 0.6.0 — Полная локальная история

- Добавлено сохранение всей текстовой истории в IndexedDB отдельно для каждого аккаунта, в том числе после подтверждения сервером.

## 0.5.13 — Статус загрузки истории

- Исправлено сообщение о загрузке истории, которое оставалось после завершения загрузки.

## 0.5.12 — Прозрачная иконка в чате

- Логотип в начале чата отображается без фоновой плитки, обводки и CSS-тени.

## 0.5.11 — Нейтральное приветствие

- Удалено сравнение с Verity. Добавлено стандартное приветствие Pongy AI.

## 0.5.10 — Исправления GitHub Actions

- Отдельный CI repair добавил отсутствовавшие PDF/DOCX fixtures, независимые браузерные задания и сохранение диагностических журналов.

## 0.5.9 — Анимации и переходы

- Улучшены переходы темы, языка, окон и сообщений. Настройка уменьшения анимаций учитывается.

## 0.5.8 — Копии неотправленных изменений

- Добавлены отдельные для аккаунтов локальные копии, последовательные записи и повторные попытки сохранения.

## 0.5.7 — Восстановление авторизации

- Добавлен экран проверки сессии вместо преждевременного появления формы входа; временные сбои не выдаются за истечение авторизации.

## 0.5.6 — Описание и предпросмотр сайта

- Добавлены описание Pongy AI, canonical URL, Open Graph и Twitter metadata.

## 0.5.5 — Единые иконки приложения

- Унифицирован favicon, добавлены ICO и Apple touch icon; строгая CSP сохранена без unsafe-eval.

## 0.5.4 — Единый язык интерфейса

- Уточнены русские и английские подписи настроек, меню, режимов, авторизации и Plus.

## 0.5.3 — Выбор быстрых моделей

- Добавлен выбор успешно работающих моделей с учётом наблюдаемой скорости первого ответа.

## 0.5.2 — Поиск по необходимости

- Для вычислений и обычного общения поиск не обязателен. Внешние данные запрашиваются по необходимости.

## 0.5.1 — Альтернатива Brave Search

- Отдельный патч подключил Tavily и серверный выбор поискового провайдера. Лимиты и доступность зависят от сервиса.

## 0.5.0 — Чтение публичных веб-страниц

- Поиск расширен чтением публичных HTTPS-страниц и переходом по ссылкам с защитой от внутренних адресов. Это не интерактивный браузер с JavaScript, входом и формами.

## 0.4.4 — Проверка формата вложений

- Неподдерживаемые форматы отклоняются с уведомлением снизу. Генерация изображений доступна только при отдельной настройке владельцем.

## 0.4.3 — Создание файлов

- ИИ может прикреплять созданный текст, исходный код и ZIP-проекты. Выполнение созданного кода не обещается.

## 0.4.2 — Wiki и фотографии

- Добавлены инструменты поиска Wiki-страниц и фотографий Wikimedia Commons с авторами и лицензиями.

## 0.4.1 — Раскрываемые источники

- Добавлен список «Источники (N)» с удалением дублей и раскрытием ссылок.

## 0.4.0 — Поддержка ZIP

- Добавлена ограниченная обработка архивов с извлечением поддерживаемого текста, кода и документов.

## 0.3.8 — Восстановление интерфейса Plus

- Возвращены прежние преимущества и выбор способов оплаты. Реальная оплата по-прежнему не включена.

## 0.3.7 — Исправления повторной отправки

- Исправлены повтор и редактирование сообщений, дублирование ответов и ошибки смены модели.

## 0.3.6 — Очистка интерфейса сообщений

- Убраны аватары сообщений, исправлено расположение метаданных и значков функций.

## 0.3.5 — Необязательное облачное хранение

- Добавлено хранение чатов, настроек и вложений с разграничением по Firebase UID; облако требует настройки.

## 0.3.4 — Группировка истории

- Чаты сгруппированы по датам; обновлены действия и отображение длинных названий.

## 0.3.3 — Уточнение ответа

- Добавлена цитата ответа над строкой ввода и передача контекста уточнения.

## 0.3.2 — Анализ изображений

- Изображения передаются моделям с поддержкой vision. Доступность зависит от провайдера.

## 0.3.1 — Анализ документов

- Добавлена ограниченная по размеру обработка PDF и DOCX в отдельных рабочих процессах.

## 0.3.0 — Чаты и вложения

- Обновлены маршруты API, сообщения и работа с реальными вложениями.

## 0.2.5 — Проверка и отзыв сессий

- После связывания с Firebase убран старый парольный обход; обновляемые учётные данные защищены шифрованием, учитывается отзыв доступа.

## 0.2.4 — Совместимость аккаунтов

- Сохранены старые аккаунты и возможность Google OAuth при настроенных параметрах; связывание проверенных аккаунтов сохраняет чаты.

## 0.2.3 — Локализация форм входа

- Унифицированы русские и английские подписи регистрации, входа и восстановления пароля.

## 0.2.2 — Восстановление пароля

- Добавлена отправка ссылки на смену пароля и сообщения об ошибках и лимитах Firebase.

## 0.2.1 — Подтверждение почты

- Добавлены подтверждение адреса по ссылке и повторная отправка письма.

## 0.2.0 — Авторизация Firebase

- Подключены регистрация и вход по почте через Firebase REST.

## 0.1.5 — Исправления истории и панели

- Убраны непрозрачные фоны действий, исправлены длинные названия, закрепление, переименование и мобильная панель.

## 0.1.4 — Исправления авторизации

- Исправлены переключатели видимости пароля, восстановление пароля и формы на коротких экранах. Оплата оставлена заглушкой.

## 0.1.3 — Стабильность ответов ИИ

- Каталог бесплатных моделей, переключение при сбоях, ограничение времени запроса и исправления потокового ответа.

## 0.1.2 — Защита сессий и запросов

- HttpOnly cookies, защита Origin и CSRF, случайные секреты и отзыв сессий.

## 0.1.1 — Серверные ключи ИИ

- Ключ провайдера хранится на сервере; посетителю не нужно вводить собственный ключ.

## 0.1.0 — Первый запуск

- Начальный интерфейс Pongy AI: чат, вход, регистрация и настройки.

## Ограничения

- Оплата остаётся заглушкой. Внешние ИИ, поиск и OAuth требуют настройки и зависят от провайдеров.
- Локальная история не гарантируется навсегда: очистка браузера удаляет данные. Сохраняйте резервные копии вне браузера, а вложения скачивайте отдельно.
- Иконка и описание в поиске зависят от публикации и переобхода поисковиком.
- Проверки функциональной версии: 103 автоматических теста и 151 проверка Chromium. Это не гарантия отсутствия ошибок.
