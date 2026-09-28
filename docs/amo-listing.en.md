# AMO listing

*[Русская версия](amo-listing.ru.md)*

Material for the extension page on addons.mozilla.org. The file never enters the package
(`--ignore-files docs`) and is edited together with the listing.
The Russian column is in [`amo-listing.ru.md`](amo-listing.ru.md).

Channel: **listed**, id `tab-groups-control@dimkarp93.github.io`.
The beta channel (unlisted, `tab-groups-control-beta@dimkarp93.github.io`) has no listing.

At submission time: platform **Firefox for Desktop**, leave the *Firefox for Android* box
unchecked — the add-on is built around shortcuts and `tabGroups`, which makes no sense on Android.
That is also where the remaining `web-ext lint` warning about
`KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` comes from.

## Name

```
Tab Groups Control
```

## Summary (250 characters max)

```
Drive native Firefox tab groups from the keyboard: collapse and expand groups, jump to a group, save and restore the window state, create groups and reorder them. Everything stays in your browser.
```

## Description

```
Tab Groups Control drives the native tab groups of Firefox (the tabGroups API) entirely from the keyboard — no sidebar, no separate tab manager, no account.

WHAT IT DOES

• Collapse and expand a group by number, or all groups at once
• Jump straight to the first tab of any group
• Create a new group for the current tab, with a name and a colour that is not yet used in this window
• Add the current tab to an existing group
• Reorder groups by dragging rows in a dialog
• Save the state of the window and restore it later — including group names, colours, collapsed state and the order of tabs
• Keep several named snapshot profiles (default, work, reading, …), switch between them, clear or delete them
• Export a profile to a JSON file and import it on another machine

SHORTCUTS

Ctrl+Alt+T — open the group list, then press a digit
Ctrl+Alt+0 — collapse or expand every group
Ctrl+Alt+1 … Ctrl+Alt+9 — collapse or expand the N-th group
Alt+Shift+1 … Alt+Shift+9 — go to the first tab of the N-th group
Ctrl+Alt+N — new group for the current tab
Ctrl+Alt+A — add the current tab to a group
Ctrl+Alt+O — reorder groups
Ctrl+Alt+S / Ctrl+Alt+R — save / restore the window state
Ctrl+Alt+W — close every tab outside groups
Ctrl+Alt+C / Ctrl+Alt+D — clear the active profile / delete a profile

Every shortcut can be rebound in about:addons → gear → Manage Extension Shortcuts. On Linux some of the defaults are taken by the desktop environment (Ctrl+Alt+T often opens a terminal, Alt+Shift switches the keyboard layout) — rebinding solves it.

PRIVACY

No data leaves your browser. Snapshots are kept in the local extension storage; export happens only when you press the export button and pick a file yourself. There are no network requests, no analytics and no accounts.

REQUIREMENTS

Firefox 140 or newer, desktop. Groups are handled in the current window.

The interface is in English by default and switches to Russian when the Firefox UI language is Russian.

Source code: https://github.com/dimkarp93/tab-groups-control
```

## The other fields

These are shared by every language and are not translated.

| Field | Value |
|---|---|
| Categories | `Tabs` (primary); a second one is optional |
| License | MIT (same as `LICENSE`) |
| Support email | `dimkarp93@gmail.com` |
| Support site | `https://github.com/dimkarp93/tab-groups-control` |
| Homepage | `https://github.com/dimkarp93/tab-groups-control` |
| Privacy policy | not required — nothing leaves the browser, `data_collection_permissions.required = ["none"]` |
| Tags | `tab groups`, `tabs`, `keyboard`, `shortcuts`, `productivity` |

## Screenshots

1280×800 (or any other 1.6:1 ratio), PNG. One set of images for every language; only the captions are localized — the Russian ones are in [`amo-listing.ru.md`](amo-listing.ru.md).

| # | What to capture | Caption |
|---|---|---|
| 1 | The `Ctrl+Alt+T` popup with a list of 3–4 groups | Group list: press a digit to collapse or expand |
| 2 | The `Ctrl+Alt+N` dialog — name and colour palette | Create a group for the current tab |
| 3 | The `Ctrl+Alt+R` dialog with the restore diff | Restore the window state with a diff preview |
| 4 | The profiles / export dialog | Named snapshot profiles, export and import |

Capture them in `just run` on a clean profile, with meaningful group names (work, reading, docs).

## Notes for Reviewers

Submitted in English, in the *Notes for Reviewers* field when uploading a version.

```
The extension manages native Firefox tab groups from the keyboard. No network requests, no remote code, no analytics, no accounts. The submitted package is the complete source: plain ES2020, no build step, no bundler, no external dependencies, nothing minified or transpiled.

Permission justification:

• tabGroups, tabs — the core of the add-on: enumerate groups, collapse/expand them, activate tabs, move tabs into and between groups, reorder groups (background.js).
• storage — storage.local only. Window snapshots ("profiles") are kept locally. Nothing is synced or uploaded.
• notifications — one call site, background.js: reports the result of saving/restoring a snapshot and of closing ungrouped tabs.
• downloads — one call site, dialog.js: downloads.download({ saveAs: true }) exports a snapshot profile to a JSON file, only after the user presses the export button and picks the destination.
• browserSettings — one call site, background.js: browserSettings.homepageOverride.get({}), READ ONLY. When every group is collapsed, the add-on opens one tab outside the groups and points it at the user's own home page instead of a blank page. Nothing is ever written through this API.

manifest.json declares browser_specific_settings.gecko.data_collection_permissions.required = ["none"] — the add-on collects nothing.

Source repository: https://github.com/dimkarp93/tab-groups-control

To reproduce the package: `just build` (uses web-ext, no other tooling). The icons in icons/*.png are generated from icons/icon.svg by `just icons` (tools/make-icons.mjs, Node standard library only); the generator is excluded from the package.
```
