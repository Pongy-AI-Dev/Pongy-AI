# Google OAuth для Pongy: точные настройки и диагностика

## 1. Не путайте вход и подключение сервисов

Кнопка входа Google использует `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` и права профиля/email. Подключения Drive/Gmail/Calendar используют отдельную пару `CONNECTION_GOOGLE_CLIENT_ID` / `CONNECTION_GOOGLE_CLIENT_SECRET`. Если ОБА значения этой пары пусты, код использует обычную пару GOOGLE. Не оставляйте заполненной только половину пары и не смешивайте ID и Secret разных клиентов.

Поэтому ранее настроенный вход Google не означает, что Gmail/Drive уже разрешены. Ошибка с именем приложения `pongy-server.onrender.com` сама по себе не доказывает неверный хост: это может быть старое Branding/Application name OAuth-проекта.

## 2. Сначала запишите фактическую конфигурацию Render

Render → сервис → Environment. Нужны только НЕСЕКРЕТНЫЕ значения:

- `FRONTEND_URL`
- `PUBLIC_API_ORIGIN` (или «не задан»)
- `GOOGLE_CALLBACK_URL` (или «не задан»)

Client Secret, API-ключи, cookies, authorization codes и refresh tokens не публикуйте и не присылайте в чат. ID клиента можно сравнить локально с Clients в Google Cloud.

Не меняйте домен и переменные наугад. Код строит адреса так:

- сервисные callback: `(PUBLIC_API_ORIGIN, если задан, иначе FRONTEND_URL)/api/connections/{service}/callback`;
- вход Google: `GOOGLE_CALLBACK_URL`, если задан; иначе `(PUBLIC_API_ORIGIN, если задан, иначе FRONTEND_URL)/auth/google/callback`.

`FRONTEND_URL` — адрес сайта, не путь к callback. `PUBLIC_API_ORIGIN` — адрес API, не адрес Google. Значения должны начинаться с HTTPS в продакшене.

### Пример: сайт и API на https://pongy-ai.devs.surf

Только если API действительно доступен на этом же домене:

```text
FRONTEND_URL=https://pongy-ai.devs.surf
PUBLIC_API_ORIGIN=https://pongy-ai.devs.surf
GOOGLE_CALLBACK_URL=https://pongy-ai.devs.surf/auth/google/callback
```

В Google OAuth Client типа **Web application** → Authorized redirect URIs:

```text
https://pongy-ai.devs.surf/auth/google/callback
https://pongy-ai.devs.surf/api/connections/google-drive/callback
https://pongy-ai.devs.surf/api/connections/gmail/callback
https://pongy-ai.devs.surf/api/connections/google-calendar/callback
```

В Authorized JavaScript origins при необходимости указывается только origin `https://pongy-ai.devs.surf`, без путей. Для этого серверного OAuth основное значение имеют точные redirect URI. JavaScript origins не заменяют их.

Если `PUBLIC_API_ORIGIN=https://pongy-server.onrender.com`, сервисные callback должны начинаться именно с `https://pongy-server.onrender.com/api/connections/...`. Обычный вход при явно заданном GOOGLE_CALLBACK_URL может иметь другой адрес. Не копируйте пример выше без сверки.

## 3. Откройте именно используемый Google Cloud проект

Google Cloud Console → выберите проект → Google Auth Platform → **Clients**. У используемого клиента должны совпадать Client ID и Secret с соответствующей парой Render. Для входа и сервисов могут использоваться разные клиенты/проекты: тогда настраивать нужно каждый фактически используемый проект.

Не создавайте новый проект и не перевыпускайте ключи просто ради ошибки «не прошло проверку»: сначала найдите существующий Client ID.

## 4. Включите API

В том же проекте: APIs & Services → Library → включить необходимые интеграции:

- Google Drive API;
- Gmail API, если нужна почта;
- Google Calendar API.

## 5. Google Auth Platform → Audience

Для личной проверки: External → Testing → **Test users** → добавить точный Google-аккаунт, которым подключаете сервис. Сохранить и использовать именно этот аккаунт.

Это тестовый доступ, а не разрешение всем пользователям. В режиме Testing refresh token для прав Drive/Gmail/Calendar обычно истекает через 7 дней: повторное подключение в таком случае не означает потерю токена Pongy. Исключение для одних базовых прав профиля/email не распространяется на эти интеграции.

Для публичного доступа: подготовить Branding, Data Access и необходимые проверки, затем публиковать согласно требованиям консоли. Само нажатие Publish/Production не означает, что приложение проверено Google. Не обходите предупреждения безопасности и не просите пользователей делать это.

## 6. Data Access: права, которые реально запрашивает текущий код

```text
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/calendar.events.readonly
```

Запрашивается одно соответствующее право при подключении каждого сервиса. Не добавляйте Gmail send/modify или полный доступ к календарю: Pongy их не использует.

`gmail.readonly` — restricted scope. Публичная проверка такого приложения сложнее обычного Google-входа; хранение/передача restricted-данных через сервер требует security assessment по правилам Google. Эти требования не устраняются кодом, названием приложения или переключением Testing → Production. Рассматривайте Gmail как отдельную интеграцию, если сначала хотите запустить менее сложные подключения; отключение её UI требует отдельного изменения, а не только удаления scope в консоли.

## 7. Branding и проверка

Заполнить реальное имя **Pongy AI**, support email и контакты разработчика. Указать настоящий адрес главной страницы, публичную политику конфиденциальности и условия, соответствующие действительной работе проекта. Не указывайте несуществующие `/privacy`/`terms`: в текущем патче такие юридические страницы не создаются за владельца.

В политике нужно честно описать чтение писем/файлов по запросу, хранение токенов, отключение доступа и возможную передачу выбранных данных настроенному ИИ. Проверьте правила Google Limited Use и условия AI-провайдеров: нельзя обещать отсутствие хранения/обучения третьими сторонами, не подтвердив их реальные условия.

Authorized domains / Search Console: выполняйте требования консоли для домена, которым действительно управляете. Для бесплатного поддомена `pongy-ai.devs.surf` не заявляйте владение всем `devs.surf`. Если Google требует подтверждение, недоступное через ваш сервис поддоменов, зафиксируйте это как отдельный блокер публичной проверки, а не обходите его. Домен этим патчем не меняется.

Для проверки могут потребоваться обоснование каждого scope, демонстрационное видео реального пользовательского потока и security assessment. Сроки и одобрение определяет Google.

## 8. Проверка после сохранения

1. Если меняли Environment Render — дождаться redeploy.
2. Войти в Pongy на том Google-аккаунте, который добавлен в Test users.
3. Подключать Drive, Calendar и Gmail по одному. Разрешать нужное право на экране согласия.
4. Проверить запрос чтения реального тестового файла/события/письма, не только галочку «Подключено».
5. Перезагрузить сайт, проверить повторное чтение. Позже проверить обновление access token.

Не отключайте все прежние подключения сразу. Переподключайте только проблемный сервис после изменения клиента/разрешений. Удаление существующего grant у Google разорвёт действующее подключение.

## 9. Как различить ошибки

- «Не прошло проверку», `access_denied`, неразрешённый пользователь Testing: сверить проект, Audience, Test users, статус verification и точную причину Google.
- Если проект/тестер совпадают, но доступ всё равно заблокирован: проверьте полный текст причины, ограничения Google Workspace, Advanced Protection и тип аккаунта. Test users не отменяет политики администратора/Google.
- `redirect_uri_mismatch`: URI должен совпасть символ в символ с кодом/Environment и Clients. Изменение JavaScript origins здесь не поможет.
- «API has not been used / disabled»: включить нужный API в правильном проекте.
- `invalid_client`: неверная/смешанная пара ID/Secret.
- `invalid_grant`: код/токен истёк, отозван или не соответствует клиенту; в Testing проверить семидневное ограничение.
- `CONNECTION_STATE`: инициировавшая вкладка/аккаунт/сессия изменились или запрос просрочен. Начать подключение заново из Pongy, не открывать callback вручную.
- `ERR_CONNECTION_RESET`, TLS timeout до открытия Google/Pongy: отдельная проблема сети; OAuth-настройками её не исправить.

## Официальные источники

- https://developers.google.com/identity/protocols/oauth2 — срок refresh token в Testing.
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification — проверка restricted scopes.
- https://developers.google.com/workspace/gmail/api/auth/scopes — классификация Gmail scope и security assessment.
