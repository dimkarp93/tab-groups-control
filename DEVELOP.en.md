# Development

*[Русская версия](DEVELOP.ru.md)* · *[User guide](README.en.md)*

Everything about running the extension from the sources, the `just` recipes, building and publishing. The user-facing part — shortcuts, snapshots, profiles — lives in [README.en.md](README.en.md); the step-by-step AMO submission procedure lives in [PUBLICATION.en.md](PUBLICATION.en.md).

## Running from the sources

Straight from the sources, without building or signing anything — load it as a temporary add-on, no build step and no dependencies required.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Pick the `manifest.json` file from this directory.
4. The extension shows up in the list and works right away; the **Inspect** button next to it opens the background script console where errors appear.

A temporary add-on disappears when Firefox restarts — just repeat steps 1–3.

`just run` does the same in one command, on a throwaway profile; `just run en` / `just run ru` force the interface language without touching your own profile.

## Smoke-test checklist

1. Create 2–3 groups by hand: right-click a tab → *Add Tab to New Group*.
2. `Ctrl+Alt+1`, `Ctrl+Alt+2` — the matching groups collapse and expand; expanding activates the first tab of the group, collapsing moves focus to the first tab of the nearest group that is still expanded.
3. `Ctrl+Alt+0` — everything collapses; pressing it again expands everything and moves focus to the first tab of the first group if the active tab was an empty tab outside groups (that tab is closed).
4. `Alt+Shift+1`, `Alt+Shift+2` — focus jumps to the first tab of the matching group; a collapsed group is expanded first.
5. `Ctrl+Alt+T` — the group list opens, pressing a digit does the same thing.
6. `Ctrl+Alt+N` — a name field and a palette of color swatches; the first color not yet used by the groups of this window is preselected. The current tab lands in the new group.
7. `Ctrl+Alt+A` — pick an existing group, the tab moves into it.
8. `Ctrl+Alt+O` — drag the rows, press “Apply”, and the group order in the tab strip changes.
9. `Ctrl+Alt+S`, then change the window (close or open tabs, pin one), then `Ctrl+Alt+R` — a dialog with the diff; after confirming, the window holds exactly the snapshot contents: no tabs outside groups and no pinned tabs are left. Both saving and restoring show a system notification with the result.
10. `Ctrl+Alt+W` — every tab outside groups is closed, only groups and pinned tabs remain.
11. `Ctrl+Alt+0` with expanded groups — a tab with the home page appears at the end of the strip outside groups, becomes active, and every group collapses without exception.
12. `Ctrl+Alt+C` — a notification about how many groups and tabs were wiped; the popup says “no snapshot yet”, and `Ctrl+Alt+R` for that profile reports there is nothing to restore.
13. `Ctrl+Alt+D` — a dialog with a profile picker: Esc cancels, Enter deletes the selected profile.

## Contents

```
manifest.json     MV3, permissions: tabs, tabGroups, storage, notifications, browserSettings, downloads
background.js     commands, all the tab group logic, the message handler
popup.html/js     the Ctrl+Alt+T popup: group list, digits 0–9, snapshot and profile buttons
dialog.html/js    the dialog window: new | add | order | restore | delete | file (profiles, export/import)
i18n.js           t() / uiLocale() / applyI18n() — string substitution driven by data-i18n attributes
_locales/         en (default) and ru: interface strings, notifications and command descriptions
common.css        shared styles
icons/            icon.svg (the source) and icon-16…128.png generated from it
tools/            make-icons.mjs, stage-beta.mjs, updates.mjs — build helpers (not part of the package)
docs/             amo-listing.en.md / .ru.md: the AMO listing texts and the notes for reviewers (not part of the package)
justfile          build, signing and publishing recipes (not part of the package)
README.*.md       the user guide, .en.md and .ru.md; README.md is a symlink to the English one (not part of the package)
DEVELOP.*.md      this page, .en.md and .ru.md; DEVELOP.md is a symlink to the English one (not part of the package)
PUBLICATION.*.md  the AMO submission procedure, .en.md and .ru.md; PUBLICATION.md is a symlink to the English one (not part of the package)
ENTRYPOINT.ru.md  the code entry points, Russian only (not part of the package)
LICENSE           MIT
```

## `just` recipes

Every step below is wrapped in the [`justfile`](justfile) — `just --list` prints them. The commands from the next sections are also given in raw form, in case you would rather not install `just`.

| Recipe | What it does |
|---|---|
| `just check` | `node --check` over every script + parsing `manifest.json` + comparing the locales + checking that the icon files exist |
| `just locales` | verify that the key sets in `_locales/en` and `_locales/ru` match |
| `just icons` | regenerate `icons/icon-*.png` from `icons/icon.svg` (`tools/make-icons.mjs`, Node standard library only) |
| `just icons-check` | verify that every icon named in the manifest is on disk |
| `just lint` | `web-ext lint` |
| `just run` | a separate Firefox on a throwaway profile with the extension already loaded; `just run en` / `just run ru` force the interface language |
| `just build` | `check` + `lint` + a ZIP without the documentation files, `justfile`, `tools/`, `docs/` and `screenshots/` |
| `just xpi` | `check` + `lint` + an unsigned `.xpi` in `build/local/` — no AMO, no listing |
| `just version` | the current version from the manifest |
| `just bump 1.3.0` | raise the version; refuses if the new one is not greater or the format is not `x.y.z` |
| `just credentials` | check that `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` are set |
| `just sign-listed` | submission of a new version to the AMO catalogue |
| `just stage-beta` | a copy of the extension in `build/beta/` with the beta id, the `(beta)` name suffix and an `update_url` |
| `just sign-unlisted` | signature of `build/beta/` for self-distribution → `.xpi` |
| `just xpi-version` | path to the latest signed `.xpi` |
| `just updates` | add the current beta version to `updates.json` |
| `just release` | a GitHub Release with the `.xpi` (needs `gh`) |
| `just publish-beta` | `stage-beta` → `sign-unlisted` → `updates` → `release` in one command |
| `just clean` | remove `web-ext-artifacts/` and `build/` |

The list of files excluded from the package is the `ignore` variable at the top of the `justfile`, shared by `lint`, `build` and `sign-listed`. `stage-beta` keeps its own copy of that list in rsync syntax.

The recipes read the AMO keys from the environment; the `justfile` picks up a `.env` in the extension directory:

```sh
WEB_EXT_API_KEY=user:12345:67
WEB_EXT_API_SECRET=...
```

That file must never be committed — it is listed in `.gitignore`.

## The manifest

- **`browser_specific_settings.gecko.id` is `tab-groups-control@dimkarp93.github.io`** and is fixed from now on: after the first publication the id cannot be changed — that would be a different add-on. The `@` is not an email address, just a namespace separator; the domain never has to resolve.
- **Bump `version` before every upload** — AMO does not accept a version that has already been uploaded (`just bump 1.3.0`).
- `strict_min_version: "140.0"` and `data_collection_permissions: { required: ["none"] }` are already filled in; the latter has been mandatory for AMO since 2025 and only exists from Firefox 140 on, which is what sets the lower bound.
- **`update_url` must never appear in this manifest** — the AMO validator rejects a listed version that carries one. Self-distributed beta builds get it from `just stage-beta`, which patches a copy of the manifest in `build/beta/` and leaves the original untouched.

## Building the package

`web-ext` does not need to be installed into the project, `npx` is enough (Node is required for this step only):

```sh
just build
```

The same without `just` — first the manifest and code check (a mandatory step before signing), then the build into `web-ext-artifacts/tab_groups_control-1.3.0.zip`:

```sh
npx --yes web-ext lint
npx --yes web-ext build
```

`web-ext` excludes `.git`, `node_modules` and `web-ext-artifacts` by itself. The `just build` recipe additionally throws out the README, DEVELOP and PUBLICATION files, `justfile`, `updates.json` and the `tools/`, `docs/`, `screenshots/`, `build/` directories, leaving only the extension files in the package — that is what the `--ignore-files` flag is for. The result is 22 files: the scripts, the markup, `_locales/`, `icons/` and `LICENSE`.

`lint` currently reports **0 errors and 1 warning**: `data_collection_permissions` only appeared in Firefox for Android 142, while the manifest says `strict_min_version: "140.0"`. This does not block anything — the add-on is submitted for desktop only, the *Firefox for Android* box is left unchecked.

The package is a plain ZIP, so it can be built without Node at all:

```sh
zip -r -FS web-ext-artifacts/tab_groups_control-1.3.0.zip . \
  -x '*.git*' 'web-ext-artifacts/*' 'build/*' 'tools/*' 'docs/*' 'screenshots/*' \
     justfile '*.md' updates.json
```

Such a ZIP still has to be signed through AMO — no Node is needed there, the upload goes through the Developer Hub.

## A local `.xpi` without AMO

```sh
just xpi
```

Drops `build/local/tab-groups-control-<version>-unsigned.xpi`: the very ZIP `just build` produces, renamed and put in a separate directory so it never gets mixed up with the signed artifacts in `web-ext-artifacts/` (those are what `just xpi-version` looks for). No AMO, no keys, no network.

The `.xpi` format is just a ZIP, so renaming *is* the whole build step; Firefox tells packages apart by the file extension, not by the contents.

Where such a file can be installed:

| How | Works in | Survives a restart |
|---|---|---|
| `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → pick the `.xpi` | everywhere, plain Release included | no |
| `about:addons` → gear → **Install Add-on From File…** | Developer Edition, Nightly and unbranded builds only, with `xpinstall.signatures.required=false` in `about:config` | yes |
| The enterprise `ExtensionSettings` policy with `installation_mode: force_installed` | Release/ESR under an admin | yes |

In a regular Firefox (Release, Beta, ESR) the second row will not work: signature enforcement is hard-wired there and `xpinstall.signatures.required` is ignored. So an unsigned `.xpi` is fine for yourself, a fellow developer or CI — but not for handing out to users.

Handing it out needs the **unlisted** channel: `just publish-beta` (or `just stage-beta && just sign-unlisted`). The add-on is not published on AMO and never shows up in search — it only goes through automated validation and signing, and you distribute the `.xpi` yourself. That is what "without a listing" looks like in practice.

## Signing and publishing

Ordinary Firefox (Release, Beta, ESR) installs signed add-ons only, and the check cannot be turned off there (`xpinstall.signatures.required` only works in Developer Edition, Nightly and unbranded ESR builds). An unsigned `.xpi` published on GitHub simply will not install for a third-party user. Signing is free and goes through addons.mozilla.org (AMO) in both scenarios below.

Create an account on [addons.mozilla.org](https://addons.mozilla.org/developers/) and get a JWT issuer / secret pair in Developer Hub → **Manage API Keys**.

Two channels are in use, and they are **two separate add-ons on AMO**, each with its own id.

| | Stable — listed | Beta — unlisted |
|---|---|---|
| Id | `tab-groups-control@dimkarp93.github.io` | `tab-groups-control-beta@dimkarp93.github.io` |
| Where it lives | a public page on addons.mozilla.org | an `.xpi` attached to a GitHub Release |
| Who finds it | anyone, through AMO search and Firefox itself | only whoever gets the link |
| Review | automatic validation **plus** a code review by a human | automatic validation only |
| Updates | Firefox pulls them from AMO | `update_url` → `updates.json` in the repository |
| `update_url` in the manifest | forbidden, the validator rejects the version | required |

### A — the AMO catalogue (listed)

The very first submission goes through the web form: Developer Hub → **Submit a New Add-on** → *On this site* → upload `web-ext-artifacts/tab_groups_control-<version>.zip`. The full procedure is in [PUBLICATION.en.md](PUBLICATION.en.md). The listing metadata — name, summary, description, categories, screenshots, licence, *Notes for Reviewers* — is prepared in [`docs/amo-listing.en.md`](docs/amo-listing.en.md), the Russian column in [`docs/amo-listing.ru.md`](docs/amo-listing.ru.md); the Russian translations are added afterwards through Developer Hub → Edit listing → **Translate**. Answer *No* to the question about minified code: the package is the source itself.

The first publication goes through a manual review (usually days); because of the `tabs`, `downloads` and `browserSettings` permissions the reviewer may ask for clarifications — the prepared notes explain every one of them.

Every later version goes over the API, the listing stays as it is:

```sh
just bump 1.3.1
just sign-listed
```

The same without `just`:

```sh
npx --yes web-ext sign --channel=listed \
  --api-key='user:12345:67' --api-secret='...'
```

### B — a beta over GitHub Releases (unlisted)

The extension is not in the catalogue, you hand out the link yourself; signing is automatic and takes minutes. `just stage-beta` builds `build/beta/` — a copy of the sources whose manifest carries the beta id, the `Tab Groups Control (beta)` name and the `update_url`. The manifest in the repository root is never touched, so a stable and a beta build can live in the same Firefox at once, each with its own storage.

```sh
just publish-beta
```

That is `stage-beta` → `sign-unlisted` → `updates` → `release`. Step by step, if the whole chain is not wanted:

```sh
just stage-beta          # build/beta/ with the beta id and update_url
just sign-unlisted       # web-ext sign --channel=unlisted --source-dir build/beta
just updates             # the entry for this version in updates.json
just release             # gh release create with the .xpi attached
```

`updates.json` is what makes the beta update itself:

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

The links must be `https`. `just updates` adds the entry for the current version — the file is created on the first call, and running it again on the same version does not produce duplicates. The listed version needs none of this: AMO distributes those updates.

**Without a signature at all** the extension can only be installed in two ways: temporarily through `about:debugging` (gone after a restart), or in Developer Edition / Nightly / unbranded ESR with `xpinstall.signatures.required` set to `false` in `about:config`. Neither is suitable for handing the extension to other people.
