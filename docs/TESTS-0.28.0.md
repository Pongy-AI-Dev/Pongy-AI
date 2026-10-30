# Проверки Pongy AI 0.28.0

## Итог и границы проверки

- `npm test`: **771/771**, 0 ошибок, 0 пропусков.
- Chromium: **62 разных UI-набора** имеют успешный последний результат. Это общий прогон 61 набора плюс повторные прогоны исправленных/изменённых разделов и новый набор 0.28.0, а не один непрерывный чистый прогон 62 наборов.
- Начальный общий UI-прогон во время разработки: 57/61. Найдены четыре несовместимости: общий лимит чтений блокировал запись настроек; старый тест пытался нажать честно отключённую оплату; старый тест ожидал видимые листы кадров вместо одного видео; старый тест ожидал ошибку скачивания, хотя речевая модель уже доступна из кэша. Причины разобраны, корректное поведение проверено повторно.
- Заключительная регрессия изменённых разделов: **13/13**. Дополнительно повторно пройден `speech-ui.cjs`, **21 проверка**, с настоящим локальным Vosk RU/EN, перезапуском worker без повторного скачивания, явным удалением кэша и ошибкой доступа к микрофону.
- Меню навыков дополнительно запускалось повторно: реальный hover, клавиатура, touch, медленный ответ и 503 при переключении. Не используются force click и отключение проверок.
- MP4 проверен настоящим скачиванием и сигнатурой `ftyp`, когда кодек поддерживается. Неподдерживаемая запись не выдаётся за готовое видео.
- Структура/синтаксис и полный MANIFEST проверяются `npm run check:release`; наложение ZIP дополнительно сверяется с полной исходной базой 0.27.0 по SHA-256.

**Не проверялось:** Firefox/WebKit в локальном окружении (движки не установлены), сборка/установка MSI/APK, шёпот и шум на реальном микрофоне, реальные банковские списания, верификация Google и доступность Render у российских провайдеров. Большинство AI/платёжных интеграционных тестов использует контролируемые ответы провайдера; это не доказательство доступности живой внешней модели. Браузерная модель распознавания и декодирование тестовых аудио/видео — реальные.

## Последний результат по UI-наборам

| Набор | Результат | Прогон |
|---|---|---|
| `activity-wake-ui.cjs` | PASS | общий прогон |
| `api-persistence-ui.cjs` | PASS | финальный повтор |
| `app-downloads-ui.cjs` | PASS | общий прогон |
| `application-ui.cjs` | PASS | общий прогон |
| `attachments-layout-ui.cjs` | PASS | общий прогон |
| `auth-polish-ui.cjs` | PASS | общий прогон |
| `auth-verification-ui.cjs` | PASS | общий прогон |
| `brand-time-ui.cjs` | PASS | общий прогон |
| `branding-ui.cjs` | PASS | общий прогон |
| `capabilities-ui.cjs` | PASS | общий прогон |
| `chat-policy-ui.cjs` | PASS | общий прогон |
| `connections-ui.cjs` | PASS | финальный повтор |
| `delivery-ui.cjs` | PASS | общий прогон |
| `display-settings-ui.cjs` | PASS | общий прогон |
| `documents-notes-ui.cjs` | PASS | общий прогон |
| `extensions-ui.cjs` | PASS | финальный повтор |
| `firebase-ui.cjs` | PASS | общий прогон |
| `focus-download-ui.cjs` | PASS | общий прогон |
| `focus-extension-ui.cjs` | PASS | общий прогон |
| `homework-ui.cjs` | PASS | общий прогон |
| `i18n-ui.cjs` | PASS | финальный повтор |
| `image-experience-ui.cjs` | PASS | общий прогон |
| `installer-language-ui.cjs` | PASS | общий прогон |
| `mobile-reminders-ui.cjs` | PASS | общий прогон |
| `motion-style-ui.cjs` | PASS | общий прогон |
| `motion-ui.cjs` | PASS | общий прогон |
| `motion-video-ui.cjs` | PASS | финальный повтор |
| `native-files-ui.cjs` | PASS | общий прогон |
| `notes-ui.cjs` | PASS | общий прогон |
| `notifications-offline-ui.cjs` | PASS | общий прогон |
| `notifications-popover-ui.cjs` | PASS | общий прогон |
| `preferences-persistence-ui.cjs` | PASS | финальный повтор |
| `product-ui.cjs` | PASS | общий прогон |
| `products-ui.cjs` | PASS | финальный повтор |
| `recovery-ui.cjs` | PASS | общий прогон |
| `reliability-ui.cjs` | PASS | общий прогон |
| `reminder-flow-ui.cjs` | PASS | общий прогон |
| `reminder-lifecycle-ui.cjs` | PASS | общий прогон |
| `reminders-ui.cjs` | PASS | общий прогон |
| `response-recovery-ui.cjs` | PASS | общий прогон |
| `security-beta-ui.cjs` | PASS | общий прогон |
| `service-warnings-ui.cjs` | PASS | общий прогон |
| `session-ui.cjs` | PASS | общий прогон |
| `settings-navigation-ui.cjs` | PASS | финальный повтор |
| `settings-tools-ui.cjs` | PASS | общий прогон |
| `skill-menu-ui.cjs` | PASS | финальный повтор |
| `speech-origin-ui.cjs` | PASS | финальный повтор |
| `speech-ui.cjs` | PASS | финальный повтор, реальный Vosk RU/EN |
| `stability-ui.cjs` | PASS | финальный повтор |
| `startup-ui.cjs` | PASS | общий прогон |
| `tools-ui.cjs` | PASS | общий прогон |
| `ui.cjs` | PASS | финальный повтор |
| `update-023-ui.cjs` | PASS | общий прогон |
| `update-0231-ui.cjs` | PASS | общий прогон |
| `update-028-ui.cjs` | PASS | финальный повтор |
| `upload-scroll-ui.cjs` | PASS | общий прогон |
| `voice-mode-ui.cjs` | PASS | общий прогон |
| `voice-scroll-ui.cjs` | PASS | общий прогон |
| `wake-enrollment-ui.cjs` | PASS | общий прогон |
| `wake-word-ui.cjs` | PASS | общий прогон |
| `workbench-ui.cjs` | PASS | общий прогон |
| `workspace-ui.cjs` | PASS | общий прогон |
