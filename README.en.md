# Tab Groups Control

*[Русская версия](README.ru.md)* · *[Developer guide](DEVELOP.en.md)*

A small Firefox extension that drives **native tab groups** (the `tabGroups` API) from the keyboard: collapsing and expanding groups, saving and restoring the window state, creating groups, adding tabs and reordering groups interactively.

Requires **Firefox 140+** (native tab groups, the `tabGroups` API and `data_collection_permissions`). Tested on Firefox 140 ESR.

The interface speaks English by default and switches to Russian when the browser UI language is Russian — see [Interface language](#how-it-works).

## Installing

**From the catalogue.** Open the extension page on [addons.mozilla.org](https://addons.mozilla.org/) → **Add to Firefox** → confirm the requested permissions. Updates arrive automatically.

**From an `.xpi`** (the beta channel, handed out through GitHub Releases):

1. Download the `.xpi` from the release page. Firefox offers to install it right on click only if the server serves the `application/x-xpinstall` type; GitHub serves `application/octet-stream`, so the file is simply saved to disk — that is normal.
2. Open `about:addons` → gear icon → **Install Add-on From File…** → pick the downloaded `.xpi`.
3. Confirm the permissions. Firefox verifies the signature; if the file is unsigned, the installation fails with a message about an unverified add-on.

The stable and the beta build carry different add-on ids, so they can live in the same Firefox at once, each with its own storage.

After installation the shortcuts are assigned automatically. To check and rebind them: `about:addons` → gear icon → **Manage Extension Shortcuts**.

Running the extension straight from the sources, building it and publishing it are covered in [DEVELOP.en.md](DEVELOP.en.md).

### When a shortcut does not fire

In many Linux environments (GNOME, Ubuntu) `Ctrl+Alt+T` is grabbed by the system and opens a terminal. System shortcuts take precedence over browser ones. Rebind it in `about:addons` → gear icon → **Manage Extension Shortcuts**. The direct `Ctrl+Alt+0…9` shortcuts work regardless of `Ctrl+Alt+T`.

`Alt+Shift+<digit>` is worth checking separately: on Linux, `Alt+Shift` combinations are often taken by the system keyboard layout switcher, and then they never reach the browser. The cure is the same — rebind in **Manage Extension Shortcuts** or change the layout settings of the system itself.

## Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Alt+T` | Open the group list; then press a digit `0`–`9` |
| `Ctrl+Alt+0` | Collapse/expand **all** groups |
| `Ctrl+Alt+1` … `Ctrl+Alt+9` | Collapse/expand the `i`-th group (expanding also switches to its first tab) |
| `Alt+Shift+1` … `Alt+Shift+9` | Go to the **first tab** of the `i`-th group |
| `Ctrl+Alt+S` | Save the window state into the extension storage |
| `Ctrl+Alt+R` | Restore the window state from the storage |
| `Ctrl+Alt+W` | Close every tab outside groups (pinned tabs excluded) |
| `Ctrl+Alt+C` | Clear the active profile (immediately, without confirmation) |
| `Ctrl+Alt+D` | Delete a profile (dialog with a picker and confirmation) |
| `Ctrl+Alt+N` | Create a new group for the current tab |
| `Ctrl+Alt+A` | Add the current tab to an existing group |
| `Ctrl+Alt+O` | Reorder groups interactively |
| `Ctrl+Alt+H` | Show the help window; inside the extension windows `Ctrl+Alt+?` works too |

Every extension window has a small **?** button in the top right corner that opens the help (general information and the list of shortcuts, in English or Russian depending on the browser language). Firefox does not allow `?` in the `commands` API, so the global shortcut is `Ctrl+Alt+H`; `Ctrl+Alt+?` is handled by the extension windows themselves.

The result of every command is shown as a badge on the extension icon (`✓` or `!`); the detailed message lives in the icon tooltip, and for snapshots and `Ctrl+Alt+W` also in a system notification.

**Why not `Ctrl+Alt+T+<digit>`.** The `commands` API in Firefox only accepts “modifier (+ a second modifier) + one key” — two-key chords cannot be registered. So the chord is emulated: `Ctrl+Alt+T` opens the popup, which waits for a digit `0`–`9`. The direct `Ctrl+Alt+0…9` shortcuts give the same result without the intermediate window.

## How it works

- **Group numbering.** Groups are numbered by their position in the tab strip, left to right (the order comes from tab indexes, not from `tabGroups.query()`, which guarantees no order). The first nine are reachable by shortcuts, the popup shows all of them.
- **Scope** — the current window only.
- **Going to a group** (`Alt+Shift+<digit>`) activates the tab of the group with the lowest index in the strip. If the group is collapsed, it is expanded first — otherwise Firefox would expand it itself, but only at the moment the tab is activated. The numbering is the same as for `Ctrl+Alt+<digit>`.
- **Expanding a group** (`Ctrl+Alt+<digit>` on a collapsed group, and clicking a row in the popup) not only opens it but also activates that same first tab. The difference from `Alt+Shift+<digit>`: pressing `Ctrl+Alt+<digit>` again collapses the group.
- **Collapsing a group that holds the active tab.** Before collapsing, focus moves to the first tab of the **nearest expanded group** — the one with the lowest number among the groups still open. If the last open group is being collapsed, a tab with the home page appears at the end of the strip (an existing empty tab at the end is reused).
- **Collapsing everything** (`Ctrl+Alt+0`) first opens a new tab outside groups at the end of the strip on the home page (from `browserSettings.homepageOverride`; a plain new tab if no home page is set) and makes it active, then collapses **every** group, including the one that held the active tab. If the last tab of the window is already outside groups and holds the home page or a blank page, no new tab is spawned — the existing one is simply activated.
- **Expanding everything** (`Ctrl+Alt+0` with collapsed groups) opens every group and then, if the active tab was an unpinned tab outside groups holding a blank or home page, closes it and activates the first tab of the first group. An ordinary tab outside groups with any other content stays active and is not closed.
- **Closing tabs outside groups** (`Ctrl+Alt+W`) closes every tab of the window that belongs to no group. Pinned tabs are left alone. If closing would leave the window without a single tab, the command refuses to run — the window would close. If the active tab is among those closed, focus is moved beforehand to a pinned tab or to a tab from an expanded group, so that Firefox does not expand a collapsed one.
- **Notifications.** Saving, restoring, importing a snapshot and closing tabs outside groups show a system notification with the result (in addition to the `✓`/`!` badge on the icon). The other commands still report through the badge only.
- **Saving** (`Ctrl+Alt+S`) fully overwrites the active profile in `storage.local`: **only tabs that belong to a group** make it into the snapshot. Everything outside groups, pinned tabs included, is skipped — the number of skipped tabs is shown in the message. The position of each group in the strip is stored alongside it.
- **Restoring** (`Ctrl+Alt+R`) shows a diff dialog first. After confirmation the snapshot tabs are created and grouped in the original strip order, then every tab that was in the window before is closed (pinned ones included) — what remains is exactly the snapshot contents. New tabs are created before the old ones are removed, so the window never closes. If some previous tab cannot be closed, the rest are closed anyway — removal falls back to one tab at a time.
- **Clearing a profile** (`Ctrl+Alt+C`) wipes the contents of the active profile: the profile itself stays in the list, but its snapshot becomes empty (`groups: []`) and there is nothing to restore from it. It asks for no confirmation; the result is a notification with how many groups and tabs were wiped. The **⌫ Clear active** button in the **Profiles / export…** dialog does the same.
- **Deleting a profile** (`Ctrl+Alt+D`) opens a dialog with a profile picker and a confirmation: Enter deletes, Esc cancels. Any profile can be deleted, including the only one — the storage is then left without a single snapshot.
- **Reordering** (`Ctrl+Alt+O`) applies the order through successive `tabGroups.move(id, {index: -1})` calls.
- **Interface language.** The extension is localized through the standard `_locales` mechanism: English is the default (`default_locale: "en"`), Russian is picked up automatically when the Firefox UI language is Russian. Every other locale gets the English strings. There is no language switch inside the extension: the language follows the Firefox language pack (`about:preferences` → Language) — the popup and dialogs, the notifications and the command descriptions in **Manage Extension Shortcuts** are all translated, and snapshot dates are formatted for the same locale. The catalogue is picked once, when the extension is loaded: changing the Firefox language afterwards does nothing until the extension is reloaded. `browser.i18n.getUILanguage()` and `getMessage("@@ui_locale")` both report the application locale, not the catalogue that was actually loaded — the honest check is `browser.i18n.getMessage("localeTag")`, a service key that holds `en` or `ru`.

## Snapshot format

```json
{
  "version": 1,
  "savedAt": "2026-07-27T00:38:00.000Z",
  "groups": [
    {
      "title": "work",
      "color": "blue",
      "collapsed": false,
      "position": 1,
      "tabs": [
        { "url": "https://example.com/", "title": "Example", "pinned": false, "active": true, "position": 1 }
      ]
    }
  ],
  "ungrouped": [
    { "url": "https://example.org/", "title": "Example", "pinned": true, "active": false, "position": 0 }
  ]
}
```

`position` is the index in the tab strip at the moment of saving; it restores the relative order of groups and of tabs outside groups. The `name` field is the profile the export was made from; on import it is used as the default name.

The `ungrouped` array is **always empty** in new saves — tabs outside groups are not stored. The field is kept in the format for compatibility: snapshots made by earlier versions or coming from an import are restored together with their tabs outside groups.

## Snapshot profiles

There can be several snapshots, each with its own name: `default`, `work`, `reading`. In `storage.local` they live in `snapshots` (a “name → snapshot” object), the active profile is in `activeSnapshot`.

- `Ctrl+Alt+S` writes into the **active** profile;
- `Ctrl+Alt+R` opens a dialog where the profile is picked from a dropdown — the diff is recalculated on every switch;
- `Ctrl+Alt+C` clears the active profile, `Ctrl+Alt+D` deletes the selected one;
- the active profile is changed by clicking a row in the **Profiles / export…** dialog (the `Ctrl+Alt+T` popup);
- any profile can be deleted, including the last remaining one.

The old storage layout (a single `snapshot` key) is migrated into the `default` profile automatically on first access.

## Moving to another computer and keeping snapshots in git

The **Profiles / export…** button in the popup → pick a profile → **⤓ Export to file…**. A system “Save as…” dialog opens (`downloads.download` with `saveAs: true`), so the file can go straight into a repository directory without being fished out of the downloads folder.

The file name is stable, without a timestamp: the `default` profile becomes `tab-groups.json`, the rest become `tab-groups-<slug>.json`, where the slug is the profile name in Latin letters (Cyrillic is transliterated: `работа` → `tab-groups-rabota.json`). Exporting again over the same file produces a normal `git diff` instead of an add/delete pair.

On the other machine: **⤒ Import from file** → pick the JSON → the profile name is taken from the `name` field in the file (or from the file name) → **Import** → `Ctrl+Alt+R` → pick the profile → **Restore**. A profile with the same name is overwritten.

Keep in mind that `savedAt`, the tab titles and the `active` flag change on every save, so the diff contains them even when the set of tabs is the same.

## Known limitations

- The extension cannot open internal pages (`about:config`, `about:addons`, `view-source:`, pages of other extensions) — such tabs are skipped when saving, and the number of skipped ones is shown in the icon tooltip.
- After reordering groups, tabs outside groups end up to the left of every group.
- Pinned tabs do not belong to groups in Firefox, so they are not saved and are closed together with the rest of the window tabs on restore.
- If every group in the snapshot is collapsed, restoring creates one empty tab outside groups on the home page — the active tab has nowhere else to live. When the snapshot has at least one expanded group, no extra tab appears.
- Adding a tab to a collapsed group expands it — that is how Firefox itself works.
- Restoring creates the tabs from scratch — the navigation history inside a tab and the form contents are not preserved.
- The data of a temporarily loaded extension usually survives a browser restart, but there is no guarantee. If a snapshot matters, export it to a file or set `keepUuidOnUninstall` and `keepStorageOnUninstall` to `true` in `about:config`.
- The export does not remember the directory: the path is chosen in the system dialog every time (Firefox suggests the last used one). There is no automatic file write on `Ctrl+Alt+S` — an extension cannot write to an arbitrary path without an explicit confirmation.
- The file name is built by transliteration, so the profiles `работа` and `rabota` produce the same file name — on export the second overwrites the first if both are saved into the same directory.

## License

[MIT](LICENSE). Mozilla and AMO policies put no restrictions on the license of an add-on — all they require is that the source code be available to the reviewer if the build is minified or produced from another source. Here the code is published as is, with no minification, so MIT contradicts nothing.
