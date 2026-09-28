# Разработка

*[English version](DEVELOP.en.md)* · *[Руководство пользователя](README.ru.md)*

Всё про запуск расширения из исходников, рецепты `just`, сборку и публикацию. Пользовательская часть — горячие клавиши, снимки, профили — в [README.ru.md](README.ru.md); пошаговая процедура подачи на AMO — в [PUBLICATION.ru.md](PUBLICATION.ru.md).

## Запуск из исходников

Прямо из исходников, без сборки и подписи — расширение загружается как временное дополнение, никаких зависимостей не нужно.

1. Откройте `about:debugging#/runtime/this-firefox`.
2. Нажмите **Load Temporary Add-on…** («Загрузить временное дополнение…»).
3. Выберите файл `manifest.json` из этого каталога.
4. Расширение появится в списке и сразу заработает; кнопка **Inspect** рядом с ним открывает консоль фонового скрипта — там видно ошибки.

Временное дополнение исчезает при перезапуске Firefox — просто повторите шаги 1–3.

`just run` делает то же самое одной командой, на одноразовом профиле; `just run en` / `just run ru` задают язык интерфейса, не трогая ваш собственный профиль.

## Чек-лист проверки

1. Создайте вручную 2–3 группы: ПКМ по вкладке → *Добавить вкладку в новую группу*.
2. `Ctrl+Alt+1`, `Ctrl+Alt+2` — соответствующие группы сворачиваются и разворачиваются; при разворачивании активной становится первая вкладка группы, при сворачивании — первая вкладка ближайшей оставшейся развёрнутой группы.
3. `Ctrl+Alt+0` — сворачиваются все, повторное нажатие разворачивает и переводит фокус на первую вкладку первой группы, если активной была пустая вкладка вне групп (она при этом закрывается).
4. `Alt+Shift+1`, `Alt+Shift+2` — фокус переходит на первую вкладку соответствующей группы; свёрнутая группа при этом разворачивается.
5. `Ctrl+Alt+T` — открывается список групп, нажатие цифры делает то же самое.
6. `Ctrl+Alt+N` — окно ввода имени и палитра цветов квадратиками; предвыбран первый цвет, ещё не занятый группами этого окна. Текущая вкладка попадает в новую группу.
7. `Ctrl+Alt+A` — выбор существующей группы, вкладка переезжает в неё.
8. `Ctrl+Alt+O` — перетащите строки, «Применить» — порядок групп в панели вкладок меняется.
9. `Ctrl+Alt+S`, затем измените окно (закройте или откройте вкладки, закрепите одну), затем `Ctrl+Alt+R` — диалог с диффом, после подтверждения в окне остаётся ровно содержимое снимка: вкладок вне групп и закреплённых не остаётся. И сохранение, и восстановление показывают системную нотификацию с итогом.
10. `Ctrl+Alt+W` — все вкладки вне групп закрываются, остаются только группы и закреплённые вкладки.
11. `Ctrl+Alt+0` при развёрнутых группах — в конце панели появляется вкладка с домашней страницей вне групп, она становится активной, и сворачиваются все группы без исключения.
12. `Ctrl+Alt+C` — нотификация о том, сколько групп и вкладок стёрто; попап показывает «снимок ещё не сохранён», а `Ctrl+Alt+R` для этого профиля сообщает, что восстанавливать нечего.
13. `Ctrl+Alt+D` — диалог с выбором профиля: Esc отменяет, Enter удаляет выбранный профиль.

## Состав

```
manifest.json     MV3, permissions: tabs, tabGroups, storage, notifications, browserSettings, downloads
background.js     команды, вся логика работы с группами, обработчик сообщений
popup.html/js     попап Ctrl+Alt+T: список групп, цифры 0–9, кнопки снимка и профилей
dialog.html/js    окно-диалог: new | add | order | restore | delete | file (профили, экспорт/импорт)
i18n.js           t() / uiLocale() / applyI18n() — подстановка строк по атрибутам data-i18n
_locales/         en (по умолчанию) и ru: тексты интерфейса, нотификаций и описаний команд
common.css        общие стили
icons/            icon.svg (источник) и сгенерированные из него icon-16…128.png
tools/            make-icons.mjs, stage-beta.mjs, updates.mjs — вспомогательные скрипты (в пакет не входят)
docs/             amo-listing.en.md / .ru.md: тексты листинга AMO и notes for reviewers (в пакет не входит)
justfile          рецепты сборки, подписи и публикации (в пакет не входит)
README.*.md       руководство пользователя, .en.md и .ru.md; README.md — симлинк на английскую версию (в пакет не входит)
DEVELOP.*.md      эта страница, .en.md и .ru.md; DEVELOP.md — симлинк на английскую версию (в пакет не входит)
PUBLICATION.*.md  процедура подачи на AMO, .en.md и .ru.md; PUBLICATION.md — симлинк на английскую версию (в пакет не входит)
ENTRYPOINT.ru.md  точки входа кода, только по-русски (в пакет не входит)
LICENSE           MIT
```

## Рецепты `just`

Все шаги ниже завёрнуты в [`justfile`](justfile) — `just --list` покажет их список. Команды из следующих разделов приведены и в «сыром» виде, если `just` ставить не хочется.

| Рецепт | Что делает |
|---|---|
| `just check` | `node --check` по всем скриптам + разбор `manifest.json` + сверка локалей + проверка наличия иконок |
| `just locales` | проверить, что наборы ключей в `_locales/en` и `_locales/ru` совпадают |
| `just icons` | перегенерировать `icons/icon-*.png` из `icons/icon.svg` (`tools/make-icons.mjs`, только стандартная библиотека Node) |
| `just icons-check` | проверить, что все иконки из манифеста лежат на диске |
| `just lint` | `web-ext lint` |
| `just run` | отдельный Firefox на одноразовом профиле с уже загруженным расширением; `just run en` / `just run ru` задают язык интерфейса |
| `just build` | `check` + `lint` + сборка ZIP без файлов документации, `justfile`, `tools/`, `docs/` и `screenshots/` |
| `just xpi` | `check` + `lint` + неподписанный `.xpi` в `build/local/` — без AMO и без листинга |
| `just version` | текущая версия из манифеста |
| `just bump 1.3.0` | поднять версию; откажет, если новая не больше текущей или формат не `x.y.z` |
| `just credentials` | проверить, что заданы `WEB_EXT_API_KEY` и `WEB_EXT_API_SECRET` |
| `just sign-listed` | отправка новой версии в каталог AMO |
| `just stage-beta` | копия расширения в `build/beta/` с beta-id, суффиксом `(beta)` в имени и `update_url` |
| `just sign-unlisted` | подпись `build/beta/` для самостоятельной раздачи → `.xpi` |
| `just xpi-version` | путь к последнему подписанному `.xpi` |
| `just updates` | добавить текущую beta-версию в `updates.json` |
| `just release` | GitHub Release с `.xpi` (нужен `gh`) |
| `just publish-beta` | `stage-beta` → `sign-unlisted` → `updates` → `release` одной командой |
| `just clean` | удалить `web-ext-artifacts/` и `build/` |

Список исключаемых из пакета файлов — переменная `ignore` в шапке `justfile`, общая для `lint`, `build` и `sign-listed`. У `stage-beta` своя копия того же списка в синтаксисе rsync.

Ключи AMO рецепты читают из окружения; `justfile` подхватывает `.env` в каталоге расширения:

```sh
WEB_EXT_API_KEY=user:12345:67
WEB_EXT_API_SECRET=...
```

Этот файл нельзя коммитить — он уже перечислен в `.gitignore`.

## Манифест

- **`browser_specific_settings.gecko.id` — это `tab-groups-control@dimkarp93.github.io`**, и менять его больше нельзя: после первой публикации другой id означает уже другое дополнение. `@` здесь не почта, а разделитель пространства имён; домен никуда не резолвится.
- **Поднимайте `version` перед каждой загрузкой** — AMO не принимает повторно уже загруженную версию (`just bump 1.3.0`).
- `strict_min_version: "140.0"` и `data_collection_permissions: { required: ["none"] }` уже заполнены; второе с 2025 года обязательно для AMO и существует только начиная с Firefox 140 — отсюда и нижняя граница.
- **`update_url` в этом манифесте быть не должно** — валидатор AMO отклонит listed-версию с этим полем. Beta-сборки для самораздачи получают его от `just stage-beta`, который патчит копию манифеста в `build/beta/`, не трогая оригинал.

## Сборка пакета

`web-ext` ставить в проект не нужно, достаточно `npx` (Node требуется только для этого шага):

```sh
just build
```

То же без `just` — сначала проверка манифеста и кода (обязательный шаг перед подписью), затем сборка в `web-ext-artifacts/tab_groups_control-1.3.0.zip`:

```sh
npx --yes web-ext lint
npx --yes web-ext build
```

`web-ext` сам исключает `.git`, `node_modules` и `web-ext-artifacts`. Рецепт `just build` дополнительно выбрасывает файлы README, DEVELOP и PUBLICATION, `justfile`, `updates.json` и каталоги `tools/`, `docs/`, `screenshots/`, `build/`, оставляя в пакете только файлы расширения — для этого и нужен флаг `--ignore-files`. В итоге 22 файла: скрипты, разметка, `_locales/`, `icons/` и `LICENSE`.

`lint` сейчас даёт **0 ошибок и 1 предупреждение**: `data_collection_permissions` появился в Firefox для Android только в 142, а в манифесте стоит `strict_min_version: "140.0"`. Ничему это не мешает — дополнение подаётся только для десктопа, галочка *Firefox for Android* при подаче не ставится.

Пакет — это обычный ZIP, так что собрать его можно и вовсе без Node:

```sh
zip -r -FS web-ext-artifacts/tab_groups_control-1.3.0.zip . \
  -x '*.git*' 'web-ext-artifacts/*' 'build/*' 'tools/*' 'docs/*' 'screenshots/*' \
     justfile '*.md' updates.json
```

Подписать такой ZIP всё равно придётся через AMO — там Node уже не нужен, загрузка идёт через Developer Hub.

## Локальный `.xpi` без AMO

```sh
just xpi
```

Кладёт `build/local/tab-groups-control-<версия>-unsigned.xpi`: тот же ZIP из `just build`, только с другим расширением и в отдельном каталоге, чтобы не путаться с подписанными артефактами в `web-ext-artifacts/` (их ищет `just xpi-version`). AMO, ключи и сеть не нужны.

Формат `.xpi` — это просто ZIP, так что переименование и есть вся «сборка»; Firefox отличает пакет по расширению файла, а не по содержимому.

Куда такой файл ставится:

| Как | Где работает | Переживает перезапуск |
|---|---|---|
| `about:debugging#/runtime/this-firefox` → **Загрузить временное дополнение…** → выбрать `.xpi` | везде, включая обычный Release | нет |
| `about:addons` → шестерёнка → **Установить дополнение из файла…** | только Developer Edition, Nightly и unbranded-сборки с `xpinstall.signatures.required=false` в `about:config` | да |
| Корпоративная политика `ExtensionSettings` с `installation_mode: force_installed` | Release/ESR под управлением админа | да |

В обычном Firefox (Release, Beta, ESR) второй способ не сработает: проверка подписи там прибита намертво, `xpinstall.signatures.required` игнорируется. Так что неподписанный `.xpi` годится для себя, коллеги-разработчика или CI — но не для раздачи пользователям.

Для раздачи нужен канал **unlisted**: `just publish-beta` (или `just stage-beta && just sign-unlisted`). Дополнение при этом на AMO не публикуется и в поиске не появляется — проходит только автовалидация и подпись, а `.xpi` вы раздаёте сами. Это и есть «без листинга» в рабочем виде.

## Подпись и публикация

Обычный Firefox (Release, Beta, ESR) устанавливает только подписанные дополнения, отключить проверку в них нельзя (`xpinstall.signatures.required` работает лишь в Developer Edition, Nightly и ESR-сборках с unbranded-версией). Неподписанный `.xpi`, выложенный на GitHub, у стороннего пользователя просто не установится. Подпись бесплатна и делается через addons.mozilla.org (AMO) в обоих сценариях ниже.

Заведите аккаунт на [addons.mozilla.org](https://addons.mozilla.org/developers/) и в Developer Hub → **Manage API Keys** получите пару JWT issuer / secret.

Каналов два, и это **два разных дополнения на AMO**, у каждого свой id.

| | Стабильный — listed | Beta — unlisted |
|---|---|---|
| Id | `tab-groups-control@dimkarp93.github.io` | `tab-groups-control-beta@dimkarp93.github.io` |
| Где живёт | публичная страница на addons.mozilla.org | `.xpi`, приложенный к GitHub Release |
| Кто найдёт | любой — через поиск AMO и внутри Firefox | только тот, кому дали ссылку |
| Проверка | автовалидация **плюс** ручное ревью кода | только автовалидация |
| Обновления | Firefox тянет их с AMO | `update_url` → `updates.json` в репозитории |
| `update_url` в манифесте | запрещён, валидатор отклонит версию | обязателен |

### A — каталог AMO (listed)

Самая первая подача идёт через веб-форму: Developer Hub → **Submit a New Add-on** → *On this site* → загрузить `web-ext-artifacts/tab_groups_control-<версия>.zip`. Полная процедура — в [PUBLICATION.ru.md](PUBLICATION.ru.md). Метаданные листинга — name, summary, description, категории, скриншоты, лицензия, *Notes for Reviewers* — подготовлены в [`docs/amo-listing.en.md`](docs/amo-listing.en.md), русская колонка — в [`docs/amo-listing.ru.md`](docs/amo-listing.ru.md); русские переводы добавляются потом через Developer Hub → Edit listing → **Translate**. На вопрос о минифицированном коде — *No*: пакет и есть исходники.

Первая публикация проходит ручное ревью (обычно дни); из-за разрешений `tabs`, `downloads` и `browserSettings` рецензент может запросить пояснения — заготовленные notes объясняют каждое.

Каждая следующая версия уходит по API, листинг при этом не трогается:

```sh
just bump 1.3.1
just sign-listed
```

То же без `just`:

```sh
npx --yes web-ext sign --channel=listed \
  --api-key='user:12345:67' --api-secret='...'
```

### B — beta через GitHub Releases (unlisted)

В каталоге её нет, ссылку вы раздаёте сами; подпись автоматическая и занимает минуты. `just stage-beta` собирает `build/beta/` — копию исходников, в манифесте которой стоят beta-id, имя `Tab Groups Control (beta)` и `update_url`. Манифест в корне репозитория при этом не меняется, поэтому стабильная и beta-сборка спокойно живут в одном Firefox одновременно, каждая со своим хранилищем.

```sh
just publish-beta
```

Это `stage-beta` → `sign-unlisted` → `updates` → `release`. По шагам, если вся цепочка не нужна:

```sh
just stage-beta          # build/beta/ с beta-id и update_url
just sign-unlisted       # web-ext sign --channel=unlisted --source-dir build/beta
just updates             # запись за эту версию в updates.json
just release             # gh release create с приложенным .xpi
```

Обновляться beta умеет благодаря `updates.json`:

```json
{
  "addons": {
    "tab-groups-control-beta@dimkarp93.github.io": {
      "updates": [
        {
          "version": "1.3.0",
          "update_link": "https://github.com/dimkarp93/tab-groups-control/releases/download/v1.3.0/tab_groups_control_beta-1.3.0.xpi"
        }
      ]
    }
  }
}
```

Ссылки обязаны быть `https`. Запись за текущую версию добавляет `just updates` — файл создаётся при первом вызове, повторный запуск на той же версии не плодит дублей. У listed-версии всего этого не нужно — обновления раздаёт AMO.

**Без подписи вообще** расширение можно поставить только двумя способами: временно через `about:debugging` (исчезает при перезапуске) или в Developer Edition / Nightly / unbranded-ESR, выставив `xpinstall.signatures.required` в `false` в `about:config`. Для раздачи другим людям оба варианта не годятся.
