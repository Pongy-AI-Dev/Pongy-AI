# Нативные сборки Pongy AI 0.29.4

## Windows

- MSI: Pongy-AI-0.29.4-windows-x64.msi.
- Сборка выполнена с WebView2 SDK 1.0.3537.50 и WiX Toolset.
- Проверено административное извлечение MSI; внутри находится PongyAI.exe версии 0.29.4 и WebView2Loader.dll.
- MSI не подписан Authenticode: Windows может показать стандартное предупреждение. Для доверенной подписи требуется сертификат Code Signing с закрытым ключом. Самоподписанный сертификат не используется.

## Android

- APK: Pongy-AI-0.29.4-android.apk, versionCode=294.
- WebView JavaScript bridge, User-Agent and both startup/retry URLs now identify 0.29.4; the bridge metadata is covered by the Android compatibility test.
- Подпись проверена инструментом Android Build Tools; схемы v1, v2 и v3 действительны.
- SHA-256 сертификата совпадает с ранее опубликованным сертификатом Pongy AI Dev. Существующая идентичность подписи сохранена.

## PongX

- Версия PongX повышена до 0.1.1 после изменения исходников.
- Новый архив: `PongX-0.1.1-windows-x64.zip`; прежний `PongX-0.1.0-windows-x64.zip` восстановлен из предыдущего выпуска и оставлен неизменным.
- Разные имена файлов исключают выдачу старого ZIP из долгоживущего immutable-кэша.

## Обновление расширения

ZIP Pongy-Wake-Focus-0.29.4.zip собран из native/browser-focus; тест сравнивает каждый файл архива с исходником и проверяет manifest v3.
