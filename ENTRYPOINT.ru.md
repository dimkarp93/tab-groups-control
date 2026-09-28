# Точки входа

- При установке, обновлении и старте браузера не выполняется ничего: обработчиков `runtime.onInstalled` и `runtime.onStartup` нет.
- При загрузке фонового скрипта (`manifest.json` → `background.scripts`: `i18n.js`, `background.js`) выполняется только код верхнего уровня — константы и регистрация трёх слушателей: `background.js:556`, `background.js:617`, `background.js:736`.
- Чтение хранилища (ключи `snapshots`, `activeSnapshot`) — лениво, при первом обращении: `readStore()` в `background.js:269`.
- При клике на иконку расширения (или `Ctrl+Alt+T` = `_execute_action`) открывается `popup.html`; входная точка кода — `popup.js:116-117` (`applyI18n()` + `render()`), состояние запрашивается сообщением `popup-state`.
- Горячие клавиши объявлены в `manifest.json` → `commands`; регистрация обработчика — `browser.commands.onCommand` в `background.js:617`, диспетчеризация по имени команды — `runCommand()` в `background.js:560`.
- Клавиши внутри popup обрабатываются локально: `popup.js:83` (`Escape`, цифры `0`–`9`).
- Клавиши внутри диалога: `dialog.js:653` (`Escape`, `Enter`); режимные — цифры в `add` (`dialog.js:184`), стрелки по палитре в `new` (`dialog.js:123`).
- Диалоговые окна открываются только из фона через `openDialog()` — `background.js:535` (`windows.create`, `type: "popup"`), режим передаётся в query-строке `dialog.html?mode=…`.
- Входная точка диалога — `dialog.js:663`: по `mode` из URL вызывается один из `setups` (`new`, `add`, `order`, `restore`, `delete`, `file`), таблица — `dialog.js:642`.
- Все сообщения от popup и диалога приходят в один обработчик `handleMessage()` — `background.js:621`.
