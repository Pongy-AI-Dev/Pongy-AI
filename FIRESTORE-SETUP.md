# Постоянная история Pongy AI на Render

Этот шаг обязателен, если у сервиса Render нет постоянного диска. Обновление файлов само по себе не превращает временный диск в постоянный.

1. Откройте https://console.firebase.google.com/ и проект **pongy-ai-86e15**.
2. **Build → Firestore Database → Create database**. Создайте базу **(default)** в production mode. Если база уже есть — не создавайте новую.
3. Откройте **Rules**, вставьте правила ниже и нажмите **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pongyUsers/{userId}/{document=**} {
      allow read, write: if request.auth != null
                        && request.auth.uid == userId
                        && request.auth.token.email_verified == true;
    }
  }
}
```

4. **Authentication → Sign-in method**: включите **Email/Password** и **Google**. Для Google выберите контактную почту. Если методы уже включены — не выключайте их.
5. **Authentication → Settings → Authorized domains**: добавьте `pongy-ai.devs.surf`, если его ещё нет.
6. Откройте **Render → pongy-server → Environment**. Добавьте или измените только:

```text
FIREBASE_FIRESTORE_ENABLED=true
FIREBASE_PROJECT_ID=pongy-ai-86e15
```

`FIREBASE_API_KEY` оставьте существующим ключом этого проекта. `JWT_SECRET` и `SESSION_SECRET` должны быть постоянными, разными и минимум 32 символа. Если они уже заданы — **не меняйте их**. Остальные переменные сохраните.

7. Загрузите патч 1.4.5 поверх 1.4.4 с сохранением папок. **Manual Deploy → Deploy latest commit**, дождитесь **Live**.
8. Войдите заново **один раз**. Доступные старые локальные чаты и вложения перенесутся в облако при входе; уже потерянные данные с временного диска восстановить нельзя.
9. Проверьте https://pongy-ai.devs.surf/api/config: поле `cloudHistory` должно быть `true`. Это означает включение режима, но не проверяет правила базы. Затем создайте тестовый чат, дождитесь сохранения, обновите страницу и откройте сайт в другом браузере под тем же аккаунтом. Он должен появиться.

Не используйте правила `allow read, write: if true`. У Firestore есть бесплатная квота, а не неограниченное хранение. При ошибке правил/квоты сайт должен показать ошибку сохранения, а не сообщить об успехе. OAuth Client ID/Secret и callback Google Cloud остаются отдельными настройками; включение Google в Firebase не заменяет их.
