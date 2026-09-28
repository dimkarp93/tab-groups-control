# Публикация

*[English version](PUBLICATION.en.md)*

Минимум, который нужен, чтобы расширение стало публично доступным на addons.mozilla.org.
Тексты листинга и notes for reviewers лежат в [`docs/amo-listing.en.md`](docs/amo-listing.en.md), русская колонка — в [`docs/amo-listing.ru.md`](docs/amo-listing.ru.md); рецепты и устройство сборки — в [DEVELOP.ru.md](DEVELOP.ru.md).

## Что уже сделано

| | |
|---|---|
| ✅ | `gecko.id` = `tab-groups-control@dimkarp93.github.io` — публичный, менять нельзя |
| ✅ | `strict_min_version` = `140.0`, `data_collection_permissions.required` = `["none"]` |
| ✅ | `update_url` в корневом манифесте отсутствует (для listed он запрещён) |
| ✅ | иконки PNG 16…128 в `icons/` |
| ✅ | код не минифицирован, зависимостей нет → отдельный архив исходников не нужен |
| ✅ | `just build` даёт чистый пакет: 22 файла, без `tools/`, `docs/`, документации и `justfile` |
| ✅ | тексты листинга на en и ru, notes for reviewers |

## Что нужно от вас

| | Что | Где взять |
|---|---|---|
| 1 | Mozilla Account | https://addons.mozilla.org → Register |
| 2 | `WEB_EXT_API_KEY` и `WEB_EXT_API_SECRET` в `.env` | Developer Hub → **Manage API Keys** (нужны только для релизов по CLI, для первой подачи — нет) |
| 3 | Скриншоты 1280×800 PNG, минимум 1 | снять руками в `just run`, список кадров — в `docs/amo-listing.en.md` |

`.env` в каталоге расширения (`justfile` подхватывает сам, файл в `.gitignore`):

```sh
WEB_EXT_API_KEY=user:12345:67
WEB_EXT_API_SECRET=...
```

## Первая публикация

1. **Снять скриншоты.** `just run` → создать 3–4 группы с осмысленными именами (work, reading, docs) → снять 4 кадра по списку из `docs/amo-listing.en.md`, сложить в `screenshots/`.
2. **Собрать пакет.** `just build` → `web-ext-artifacts/tab_groups_control-1.3.0.zip`.
   Ожидаемо: 0 ошибок, 1 предупреждение про Android — так и должно быть.
3. **Открыть** https://addons.mozilla.org/developers/ → **Submit a New Add-on**.
4. **Канал** — *On this site* (listed).
5. **Загрузить zip**, дождаться автовалидации.
6. **Платформы** — только *Firefox for Desktop*. Галочку *Firefox for Android* не ставить.
7. **Минифицированный код?** — *No*.
8. **Заполнить листинг** из `docs/amo-listing.en.md`: name, summary, description, categories (`Tabs`), support email и site, лицензия MIT, теги.
9. **Notes for Reviewers** — блок из конца `docs/amo-listing.en.md`.
10. **Submit Version.**
11. **Скриншоты** — Developer Hub → Edit listing → загрузить кадры и подписи.
12. **Русский листинг** — Edit listing → **Translate** → тексты из `docs/amo-listing.ru.md` для name, summary, description и подписей к скриншотам.
13. **Slug** — проверить `addons.mozilla.org/firefox/addon/<slug>/`, при желании поправить (в отличие от id, slug меняется).
14. **Ждать ревью.** Автовалидация — до суток, ручное ревью первой версии — обычно дни. Итог придёт письмом.

## Каждая следующая версия

```sh
just bump 1.3.1
just sign-listed
```

Листинг заполнять заново не нужно. Требования: версия строго больше предыдущей, `update_url` в манифесте по-прежнему нет.

## Beta-канал (не обязателен)

Отдельное дополнение с id `tab-groups-control-beta@dimkarp93.github.io`, в каталог не попадает, раздаётся через GitHub Releases:

```sh
just publish-beta
```

Это `stage-beta` → `sign-unlisted` → `updates` → `release`. Корневой манифест не меняется; стабильная и beta-сборка уживаются в одном Firefox, у каждой своё хранилище.

## Чеклист перед любой подачей

- [ ] `just check` — синтаксис, локали, иконки
- [ ] `just lint` — 0 ошибок
- [ ] версия поднята (`just bump x.y.z`)
- [ ] `git diff manifest.json` — нет `update_url`
- [ ] проверено вживую: `about:debugging` → Load Temporary Add-on → zip; горячие клавиши, попап, диалоги, экспорт профиля
