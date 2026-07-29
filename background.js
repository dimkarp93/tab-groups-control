const NONE = browser.tabGroups.TAB_GROUP_ID_NONE;
const SNAPSHOT_KEY = "snapshot";
const STORE_KEY = "snapshots";
const ACTIVE_KEY = "activeSnapshot";
const DEFAULT_PROFILE = "default";
const COLORS = ["blue", "cyan", "green", "grey", "orange", "pink", "purple", "red", "yellow"];

let dialogWindowId = null;
let badgeTimer = null;

async function targetWindowId() {
  const windows = await browser.windows.getAll({ windowTypes: ["normal"] });
  if (!windows.length) return null;
  const focused = windows.find((w) => w.focused);
  return (focused || windows[windows.length - 1]).id;
}

async function activeTab(windowId) {
  const [tab] = await browser.tabs.query({ windowId, active: true });
  return tab || null;
}

async function orderedGroups(windowId) {
  const tabs = await browser.tabs.query({ windowId });
  tabs.sort((a, b) => a.index - b.index);
  const order = [];
  const counts = new Map();
  for (const tab of tabs) {
    if (tab.groupId === undefined || tab.groupId === NONE) continue;
    if (!counts.has(tab.groupId)) {
      order.push(tab.groupId);
      counts.set(tab.groupId, 0);
    }
    counts.set(tab.groupId, counts.get(tab.groupId) + 1);
  }
  const groups = [];
  for (const id of order) {
    const group = await browser.tabGroups.get(id);
    groups.push({
      id,
      title: group.title || "",
      color: group.color,
      collapsed: group.collapsed,
      count: counts.get(id)
    });
  }
  return groups;
}

function isUngrouped(tab) {
  return tab.groupId === undefined || tab.groupId === NONE;
}

async function firstTabInGroup(windowId, groupId) {
  const tabs = await browser.tabs.query({ windowId });
  const inGroup = tabs.filter((t) => t.groupId === groupId).sort((a, b) => a.index - b.index);
  return inGroup[0] || null;
}

async function moveActiveOutOf(windowId, groupId) {
  const active = await activeTab(windowId);
  if (!active || active.groupId !== groupId) return;
  const groups = await orderedGroups(windowId);
  const open = groups.find((g) => g.id !== groupId && !g.collapsed);
  const first = open ? await firstTabInGroup(windowId, open.id) : null;
  if (!first) {
    await openLooseTab(windowId);
    return;
  }
  await browser.tabs.update(first.id, { active: true });
}

async function homepageUrl() {
  try {
    const { value } = await browser.browserSettings.homepageOverride.get({});
    const first = String(value || "").split("|")[0].trim();
    if (first && !/^about:(home|newtab|blank)$/i.test(first)) return first;
  } catch (error) {
    return null;
  }
  return null;
}

function isBlankUrl(url) {
  return !url || /^about:(home|newtab|blank)$/i.test(url);
}

async function openLooseTab(windowId) {
  const url = await homepageUrl();
  const tabs = await browser.tabs.query({ windowId });
  tabs.sort((a, b) => a.index - b.index);
  const last = tabs[tabs.length - 1];
  if (last && isUngrouped(last) && !last.pinned && (url ? last.url === url : isBlankUrl(last.url))) {
    await browser.tabs.update(last.id, { active: true });
    return last;
  }
  const created = await browser.tabs.create({
    windowId,
    active: true,
    index: tabs.length,
    ...(url ? { url } : {})
  });
  if (!isUngrouped(created)) await browser.tabs.ungroup([created.id]);
  return created;
}

async function isDisposableLooseTab(tab) {
  if (!tab || tab.pinned || !isUngrouped(tab)) return false;
  if (isBlankUrl(tab.url)) return true;
  const url = await homepageUrl();
  return Boolean(url) && tab.url === url;
}

async function leaveLooseTab(windowId, groupId) {
  const active = await activeTab(windowId);
  if (!(await isDisposableLooseTab(active))) return;
  const first = await firstTabInGroup(windowId, groupId);
  if (!first || first.id === active.id) return;
  await browser.tabs.update(first.id, { active: true });
  await browser.tabs.remove(active.id);
}

async function applyCollapsed(windowId, groupIds, collapsed) {
  for (const id of groupIds) {
    if (collapsed) await moveActiveOutOf(windowId, id);
    await browser.tabGroups.update(id, { collapsed });
  }
}

async function toggleAll(windowId) {
  const groups = await orderedGroups(windowId);
  if (!groups.length) return { ok: false, message: t("msgNoGroups") };
  const collapse = groups.some((g) => !g.collapsed);
  if (collapse) await openLooseTab(windowId);
  for (const group of groups) {
    await browser.tabGroups.update(group.id, { collapsed: collapse });
  }
  if (!collapse) await leaveLooseTab(windowId, groups[0].id);
  return {
    ok: true,
    message: t(collapse ? "msgCollapsedAll" : "msgExpandedAll", groups.length)
  };
}

async function closeUngrouped(windowId) {
  const tabs = await browser.tabs.query({ windowId });
  tabs.sort((a, b) => a.index - b.index);
  const targets = tabs.filter((t) => isUngrouped(t) && !t.pinned);
  if (!targets.length) return { ok: false, message: t("msgNoUngrouped") };
  const keep = tabs.filter((t) => !targets.includes(t));
  if (!keep.length) {
    return { ok: false, message: t("msgAllUngrouped") };
  }

  const active = tabs.find((t) => t.active);
  if (active && targets.includes(active)) {
    const pinned = keep.find((t) => t.pinned);
    const collapsedIds = new Set(
      (await orderedGroups(windowId)).filter((g) => g.collapsed).map((g) => g.id)
    );
    const visible = keep.find((t) => !isUngrouped(t) && !collapsedIds.has(t.groupId));
    const next = pinned || visible || keep[0];
    await browser.tabs.update(next.id, { active: true });
  }

  await browser.tabs.remove(targets.map((t) => t.id));
  return { ok: true, message: t("msgClosedUngrouped", targets.length) };
}

async function toggleNth(windowId, position) {
  const groups = await orderedGroups(windowId);
  const group = groups[position - 1];
  if (!group) return { ok: false, message: t("msgNoGroupN", position) };
  await applyCollapsed(windowId, [group.id], !group.collapsed);
  if (group.collapsed) {
    const first = await firstTabInGroup(windowId, group.id);
    if (first) await browser.tabs.update(first.id, { active: true });
  }
  const name = group.title || t("msgGroupFallbackName", position);
  return { ok: true, message: t(group.collapsed ? "msgGroupExpanded" : "msgGroupCollapsed", name) };
}

async function focusNth(windowId, position) {
  const groups = await orderedGroups(windowId);
  const group = groups[position - 1];
  if (!group) return { ok: false, message: t("msgNoGroupN", position) };
  const first = await firstTabInGroup(windowId, group.id);
  const name = group.title || t("msgGroupFallbackName", position);
  if (!first) return { ok: false, message: t("msgGroupEmpty", name) };
  if (group.collapsed) await browser.tabGroups.update(group.id, { collapsed: false });
  await browser.tabs.update(first.id, { active: true });
  return { ok: true, message: t("msgFocused", name) };
}

function isRestorable(url) {
  if (!url) return false;
  if (url === "about:blank" || url === "about:newtab") return true;
  return /^(https?|ftp|file|data):/i.test(url);
}

async function buildSnapshot(windowId) {
  const tabs = await browser.tabs.query({ windowId });
  tabs.sort((a, b) => a.index - b.index);
  const order = [];
  const byGroup = new Map();
  const positions = new Map();
  let skipped = 0;
  let loose = 0;
  for (const tab of tabs) {
    if (isUngrouped(tab)) {
      loose += 1;
      continue;
    }
    if (!isRestorable(tab.url)) {
      skipped += 1;
      continue;
    }
    const entry = {
      url: tab.url,
      title: tab.title || "",
      pinned: Boolean(tab.pinned),
      active: Boolean(tab.active),
      position: tab.index
    };
    if (!byGroup.has(tab.groupId)) {
      order.push(tab.groupId);
      byGroup.set(tab.groupId, []);
      positions.set(tab.groupId, tab.index);
    }
    byGroup.get(tab.groupId).push(entry);
  }
  const groups = [];
  for (const id of order) {
    const group = await browser.tabGroups.get(id);
    groups.push({
      title: group.title || "",
      color: group.color,
      collapsed: group.collapsed,
      position: positions.get(id),
      tabs: byGroup.get(id)
    });
  }
  return {
    snapshot: { version: 1, savedAt: new Date().toISOString(), groups, ungrouped: [] },
    skipped,
    loose
  };
}

function isValidSnapshot(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.version === 1 &&
      Array.isArray(value.groups) &&
      Array.isArray(value.ungrouped) &&
      value.groups.every((g) => Array.isArray(g.tabs))
  );
}

function countTabs(snapshot) {
  return snapshot.groups.reduce((sum, g) => sum + g.tabs.length, 0) + snapshot.ungrouped.length;
}

function normalizeName(value) {
  const name = String(value === undefined || value === null ? "" : value).trim();
  return name.slice(0, 60) || DEFAULT_PROFILE;
}

async function readStore() {
  const stored = await browser.storage.local.get([STORE_KEY, ACTIVE_KEY, SNAPSHOT_KEY]);
  const snapshots = {};
  const raw = stored[STORE_KEY];
  if (raw && typeof raw === "object") {
    for (const [name, snapshot] of Object.entries(raw)) {
      if (isValidSnapshot(snapshot)) snapshots[name] = snapshot;
    }
  }
  let migrated = false;
  if (!Object.keys(snapshots).length && isValidSnapshot(stored[SNAPSHOT_KEY])) {
    snapshots[DEFAULT_PROFILE] = { ...stored[SNAPSHOT_KEY], name: DEFAULT_PROFILE };
    migrated = true;
  }
  const names = Object.keys(snapshots);
  let active = typeof stored[ACTIVE_KEY] === "string" ? stored[ACTIVE_KEY] : null;
  if (!active || !snapshots[active]) active = names[0] || DEFAULT_PROFILE;
  if (migrated) {
    await browser.storage.local.set({ [STORE_KEY]: snapshots, [ACTIVE_KEY]: active });
    await browser.storage.local.remove(SNAPSHOT_KEY);
  }
  return { snapshots, active };
}

async function writeStore(snapshots, active) {
  await browser.storage.local.set({ [STORE_KEY]: snapshots, [ACTIVE_KEY]: active });
}

async function readSnapshot(name) {
  const { snapshots, active } = await readStore();
  const snapshot = snapshots[name === undefined || name === null ? active : normalizeName(name)];
  return isValidSnapshot(snapshot) ? snapshot : null;
}

async function listProfiles() {
  const { snapshots, active } = await readStore();
  return {
    active,
    profiles: Object.entries(snapshots)
      .map(([name, snapshot]) => ({
        name,
        savedAt: snapshot.savedAt,
        groups: snapshot.groups.length,
        tabs: countTabs(snapshot)
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
  };
}

async function setActiveProfile(name) {
  const { snapshots } = await readStore();
  const target = normalizeName(name);
  if (!snapshots[target]) return { ok: false, message: t("msgProfileMissing", target) };
  await browser.storage.local.set({ [ACTIVE_KEY]: target });
  return { ok: true, message: t("msgActiveProfile", target) };
}

async function deleteProfile(name) {
  const { snapshots, active } = await readStore();
  const target = normalizeName(name);
  if (!snapshots[target]) return { ok: false, message: t("msgProfileMissing", target) };
  delete snapshots[target];
  const rest = Object.keys(snapshots);
  await writeStore(snapshots, rest.includes(active) ? active : rest[0] || DEFAULT_PROFILE);
  return { ok: true, message: t("msgProfileDeleted", target) };
}

async function clearProfile() {
  const { snapshots, active } = await readStore();
  const snapshot = snapshots[active];
  if (!snapshot) return { ok: false, message: t("msgProfileAlreadyEmpty", active) };
  const groups = snapshot.groups.length;
  const tabs = countTabs(snapshot);
  snapshots[active] = {
    version: 1,
    savedAt: new Date().toISOString(),
    name: active,
    groups: [],
    ungrouped: []
  };
  await writeStore(snapshots, active);
  return { ok: true, message: t("msgProfileCleared", active, groups, tabs) };
}

async function writeProfile(name, snapshot) {
  const { snapshots, active } = await readStore();
  const target = normalizeName(name);
  const existed = Boolean(snapshots[target]);
  snapshots[target] = { ...snapshot, name: target };
  await writeStore(snapshots, snapshots[active] ? active : target);
  return { target, existed };
}

async function saveState(windowId, name) {
  const { active } = await readStore();
  const target = normalizeName(name === undefined || name === null ? active : name);
  const { snapshot, skipped, loose } = await buildSnapshot(windowId);
  await writeProfile(target, snapshot);
  const tail =
    (loose ? t("msgSavedLoose", loose) : "") + (skipped ? t("msgSavedSkipped", skipped) : "");
  return {
    ok: true,
    message: t("msgSaved", target, snapshot.groups.length, countTabs(snapshot)) + tail
  };
}

async function createTab(windowId, entry, pinned) {
  try {
    const tab = await browser.tabs.create({
      windowId,
      url: entry.url,
      active: false,
      pinned: Boolean(pinned)
    });
    return tab.id;
  } catch (error) {
    return null;
  }
}

async function removeTabs(ids) {
  if (!ids.length) return 0;
  try {
    await browser.tabs.remove(ids);
    return ids.length;
  } catch (error) {
    let removed = 0;
    for (const id of ids) {
      try {
        await browser.tabs.remove(id);
        removed += 1;
      } catch (inner) {
        continue;
      }
    }
    return removed;
  }
}

async function restoreSnapshot(windowId, name) {
  const snapshot = await readSnapshot(name);
  if (!snapshot) return { ok: false, message: t("msgNoSnapshot") };
  if (!countTabs(snapshot)) return { ok: false, message: t("msgSnapshotEmpty") };

  const oldIds = (await browser.tabs.query({ windowId })).map((t) => t.id);
  const collapse = [];
  const created = [];
  let failed = 0;
  let activeId = null;
  let expandedId = null;

  const units = [];
  snapshot.groups.forEach((group, index) => {
    units.push({ position: typeof group.position === "number" ? group.position : index, group });
  });
  snapshot.ungrouped.forEach((entry, index) => {
    const fallback = snapshot.groups.length + index;
    units.push({ position: typeof entry.position === "number" ? entry.position : fallback, entry });
  });
  units.sort((a, b) => a.position - b.position);

  for (const unit of units) {
    if (unit.entry) {
      const id = await createTab(windowId, unit.entry, unit.entry.pinned);
      if (id === null) {
        failed += 1;
        continue;
      }
      created.push(id);
      if (unit.entry.active) activeId = id;
      if (expandedId === null) expandedId = id;
      continue;
    }
    const ids = [];
    for (const entry of unit.group.tabs) {
      const id = await createTab(windowId, entry, false);
      if (id === null) {
        failed += 1;
        continue;
      }
      ids.push(id);
      created.push(id);
      if (entry.active) activeId = id;
      if (!unit.group.collapsed && expandedId === null) expandedId = id;
    }
    if (!ids.length) continue;
    const groupId = await browser.tabs.group({ tabIds: ids, createProperties: { windowId } });
    await browser.tabGroups.update(groupId, { title: unit.group.title, color: unit.group.color });
    if (unit.group.collapsed) collapse.push(groupId);
  }

  if (!created.length) {
    return { ok: false, message: t("msgRestoreNothing") };
  }

  await browser.tabs.update(activeId ?? expandedId ?? created[0], { active: true });
  await removeTabs(oldIds);

  for (const groupId of collapse) {
    await moveActiveOutOf(windowId, groupId);
    await browser.tabGroups.update(groupId, { collapsed: true });
  }

  const tail = failed ? t("msgRestoredFailed", failed) : "";
  return {
    ok: true,
    message:
      (snapshot.name
        ? t("msgRestored", snapshot.name, snapshot.groups.length, created.length)
        : t("msgRestoredUnnamed", snapshot.groups.length, created.length)) + tail
  };
}

async function createGroup(windowId, tabId, title, color) {
  const groupId = await browser.tabs.group({ tabIds: [tabId], createProperties: { windowId } });
  await browser.tabGroups.update(groupId, {
    title: title || "",
    color: COLORS.includes(color) ? color : "blue"
  });
  return { ok: true, message: t("msgGroupCreated", title || t("msgUnnamedGroup")) };
}

async function addToGroup(tabId, groupId) {
  await browser.tabs.group({ tabIds: [tabId], groupId });
  const group = await browser.tabGroups.get(groupId);
  return { ok: true, message: t("msgTabAdded", group.title || t("msgUnnamedGroup")) };
}

async function reorderGroups(windowId, order) {
  for (const groupId of order) {
    await browser.tabGroups.move(groupId, { index: -1 });
  }
  return { ok: true, message: t("msgOrderUpdated", order.length) };
}

async function flash(ok, message) {
  await browser.action.setBadgeText({ text: ok ? "✓" : "!" });
  await browser.action.setBadgeBackgroundColor({ color: ok ? "#1f8b3a" : "#b3261e" });
  await browser.action.setTitle({ title: t("badgeTitle", message) });
  if (badgeTimer !== null) clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    badgeTimer = null;
    browser.action.setBadgeText({ text: "" });
    browser.action.setTitle({ title: t("extActionTitle") });
  }, 2500);
}

async function notify(ok, message) {
  try {
    await browser.notifications.create(`tab-groups-${Date.now()}`, {
      type: "basic",
      title: t(ok ? "notifyTitle" : "notifyTitleFail"),
      message
    });
  } catch (error) {
    return;
  }
}

async function announce(result) {
  await flash(result.ok, result.message);
  await notify(result.ok, result.message);
  return result;
}

async function openDialog(mode, params, width, height) {
  if (dialogWindowId !== null) {
    try {
      await browser.windows.remove(dialogWindowId);
    } catch (error) {
      dialogWindowId = null;
    }
    dialogWindowId = null;
  }
  const url = new URL(browser.runtime.getURL("dialog.html"));
  url.searchParams.set("mode", mode);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const created = await browser.windows.create({
    url: url.href,
    type: "popup",
    width,
    height
  });
  dialogWindowId = created.id;
}

browser.windows.onRemoved.addListener((windowId) => {
  if (windowId === dialogWindowId) dialogWindowId = null;
});

async function runCommand(command) {
  const windowId = await targetWindowId();
  if (windowId === null) return;

  if (command === "toggle-all") return flashResult(await toggleAll(windowId));

  const nth = command.match(/^toggle-group-([1-9])$/);
  if (nth) return flashResult(await toggleNth(windowId, Number(nth[1])));

  const focus = command.match(/^focus-group-([1-9])$/);
  if (focus) return flashResult(await focusNth(windowId, Number(focus[1])));

  if (command === "save-state") return announce(await saveState(windowId));

  if (command === "close-ungrouped") return announce(await closeUngrouped(windowId));

  if (command === "restore-state") {
    const { profiles } = await listProfiles();
    if (!profiles.length) return announce({ ok: false, message: t("msgNoSnapshot") });
    return openDialog("restore", { windowId }, 460, 440);
  }

  if (command === "clear-profile") return announce(await clearProfile());

  if (command === "delete-profile") {
    const { profiles } = await listProfiles();
    if (!profiles.length) return announce({ ok: false, message: t("msgNoProfiles") });
    return openDialog("delete", { windowId }, 420, 360);
  }

  if (command === "new-group") {
    const tab = await activeTab(windowId);
    if (!tab) return;
    return openDialog("new", { windowId, tabId: tab.id }, 420, 360);
  }

  if (command === "add-to-group") {
    const tab = await activeTab(windowId);
    if (!tab) return;
    const groups = await orderedGroups(windowId);
    if (!groups.length) return flashResult({ ok: false, message: t("msgNoGroups") });
    return openDialog("add", { windowId, tabId: tab.id }, 420, 420);
  }

  if (command === "reorder-groups") {
    const groups = await orderedGroups(windowId);
    if (groups.length < 2) {
      return flashResult({ ok: false, message: t("msgNeedTwoGroups") });
    }
    return openDialog("order", { windowId }, 420, 480);
  }
}

function flashResult(result) {
  return flash(result.ok, result.message);
}

browser.commands.onCommand.addListener((command) => {
  runCommand(command).catch((error) => flash(false, String(error && error.message ? error.message : error)));
});

async function handleMessage(message) {
  switch (message.type) {
    case "popup-state": {
      const windowId = await targetWindowId();
      const { active, profiles } = await listProfiles();
      const current = profiles.find((p) => p.name === active) || null;
      return {
        windowId,
        groups: windowId === null ? [] : await orderedGroups(windowId),
        activeProfile: active,
        profiles,
        savedAt: current ? current.savedAt : null
      };
    }
    case "toggle": {
      const result = message.position === 0
        ? await toggleAll(message.windowId)
        : await toggleNth(message.windowId, message.position);
      await flash(result.ok, result.message);
      return result;
    }
    case "save": {
      return announce(await saveState(message.windowId, message.name));
    }
    case "close-ungrouped": {
      return announce(await closeUngrouped(message.windowId));
    }
    case "restore-preview": {
      const { active, profiles } = await listProfiles();
      const name = message.name === undefined || message.name === null ? active : message.name;
      const snapshot = await readSnapshot(name);
      const tabs = await browser.tabs.query({ windowId: message.windowId });
      const groups = await orderedGroups(message.windowId);
      return {
        profiles,
        name,
        snapshot: snapshot
          ? {
              savedAt: snapshot.savedAt,
              groups: snapshot.groups.map((g) => ({
                title: g.title,
                color: g.color,
                count: g.tabs.length
              })),
              ungrouped: snapshot.ungrouped.length,
              tabs: countTabs(snapshot)
            }
          : null,
        current: { tabs: tabs.length, groups: groups.length }
      };
    }
    case "restore-apply": {
      return announce(await restoreSnapshot(message.windowId, message.name));
    }
    case "groups": {
      return { groups: await orderedGroups(message.windowId), colors: COLORS };
    }
    case "create-group": {
      const result = await createGroup(message.windowId, message.tabId, message.title, message.color);
      await flash(result.ok, result.message);
      return result;
    }
    case "add-to-group": {
      const result = await addToGroup(message.tabId, message.groupId);
      await flash(result.ok, result.message);
      return result;
    }
    case "reorder": {
      const result = await reorderGroups(message.windowId, message.order);
      await flash(result.ok, result.message);
      return result;
    }
    case "read-snapshot": {
      return { snapshot: await readSnapshot(message.name) };
    }
    case "list-snapshots": {
      return listProfiles();
    }
    case "set-active-snapshot": {
      return announce(await setActiveProfile(message.name));
    }
    case "delete-snapshot": {
      return announce(await deleteProfile(message.name));
    }
    case "clear-snapshot": {
      return announce(await clearProfile());
    }
    case "write-snapshot": {
      if (!isValidSnapshot(message.snapshot)) {
        return announce({ ok: false, message: t("msgBadSnapshotFile") });
      }
      const { target, existed } = await writeProfile(message.name, message.snapshot);
      return announce({
        ok: true,
        message: t(
          existed ? "msgProfileOverwritten" : "msgProfileCreated",
          target,
          message.snapshot.groups.length,
          countTabs(message.snapshot)
        )
      });
    }
    case "open-dialog": {
      const windowId = message.windowId ?? (await targetWindowId());
      if (windowId === null) return { ok: false };
      const sizes = { restore: [460, 440], file: [460, 480], order: [420, 480], delete: [420, 360] };
      const [width, height] = sizes[message.mode] || [420, 400];
      await openDialog(message.mode, { windowId }, width, height);
      return { ok: true };
    }
    default:
      return { ok: false, message: t("msgUnknownMessage", message.type) };
  }
}

browser.runtime.onMessage.addListener((message) => handleMessage(message));
