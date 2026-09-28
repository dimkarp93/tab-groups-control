# Publication

*[Русская версия](PUBLICATION.ru.md)*

The minimum needed to make the extension publicly available on addons.mozilla.org.
The listing texts and the notes for reviewers are in [`docs/amo-listing.en.md`](docs/amo-listing.en.md), the Russian column in [`docs/amo-listing.ru.md`](docs/amo-listing.ru.md); the recipes and how the build works are in [DEVELOP.en.md](DEVELOP.en.md).

## Already done

| | |
|---|---|
| ✅ | `gecko.id` = `tab-groups-control@dimkarp93.github.io` — public, must never change |
| ✅ | `strict_min_version` = `140.0`, `data_collection_permissions.required` = `["none"]` |
| ✅ | no `update_url` in the root manifest (it is forbidden for a listed version) |
| ✅ | PNG icons 16…128 in `icons/` |
| ✅ | the code is not minified and has no dependencies → no separate source archive is needed |
| ✅ | `just build` produces a clean package: 22 files, without `tools/`, `docs/`, the documentation and the `justfile` |
| ✅ | listing texts in en and ru, notes for reviewers |

## What is needed from you

| | What | Where to get it |
|---|---|---|
| 1 | A Mozilla Account | https://addons.mozilla.org → Register |
| 2 | `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` in `.env` | Developer Hub → **Manage API Keys** (only needed for CLI releases, not for the first submission) |
| 3 | Screenshots, 1280×800 PNG, at least one | taken by hand in `just run`, the shot list is in `docs/amo-listing.en.md` |

`.env` in the extension directory (the `justfile` picks it up on its own, the file is in `.gitignore`):

```sh
WEB_EXT_API_KEY=user:12345:67
WEB_EXT_API_SECRET=...
```

## The first publication

1. **Take the screenshots.** `just run` → create 3–4 groups with meaningful names (work, reading, docs) → take the 4 shots from the list in `docs/amo-listing.en.md`, put them into `screenshots/`.
2. **Build the package.** `just build` → `web-ext-artifacts/tab_groups_control-1.3.0.zip`.
   Expected: 0 errors, 1 warning about Android — that is how it should be.
3. **Open** https://addons.mozilla.org/developers/ → **Submit a New Add-on**.
4. **Channel** — *On this site* (listed).
5. **Upload the zip**, wait for the automatic validation.
6. **Platforms** — *Firefox for Desktop* only. Leave the *Firefox for Android* box unchecked.
7. **Minified code?** — *No*.
8. **Fill in the listing** from `docs/amo-listing.en.md`: name, summary, description, categories (`Tabs`), support email and site, MIT license, tags.
9. **Notes for Reviewers** — the block at the end of `docs/amo-listing.en.md`.
10. **Submit Version.**
11. **Screenshots** — Developer Hub → Edit listing → upload the shots and their captions.
12. **The Russian listing** — Edit listing → **Translate** → the texts from `docs/amo-listing.ru.md` for name, summary, description and the screenshot captions.
13. **Slug** — check `addons.mozilla.org/firefox/addon/<slug>/` and adjust it if you like (unlike the id, the slug can be changed).
14. **Wait for the review.** Automatic validation — up to a day; the manual review of the first version usually takes days. The verdict arrives by email.

## Every following version

```sh
just bump 1.3.1
just sign-listed
```

The listing does not have to be filled in again. Requirements: the version must be strictly greater than the previous one, and the manifest must still carry no `update_url`.

## The beta channel (optional)

A separate add-on with the id `tab-groups-control-beta@dimkarp93.github.io`; it never enters the catalogue and is handed out through GitHub Releases:

```sh
just publish-beta
```

That is `stage-beta` → `sign-unlisted` → `updates` → `release`. The root manifest is not touched; a stable and a beta build live together in the same Firefox, each with its own storage.

## Checklist before any submission

- [ ] `just check` — syntax, locales, icons
- [ ] `just lint` — 0 errors
- [ ] the version is raised (`just bump x.y.z`)
- [ ] `git diff manifest.json` — no `update_url`
- [ ] verified live: `about:debugging` → Load Temporary Add-on → zip; shortcuts, popup, dialogs, profile export
