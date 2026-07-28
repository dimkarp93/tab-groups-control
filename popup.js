const list = document.getElementById("list");
const savedLine = document.getElementById("saved");
let state = { windowId: null, groups: [] };

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("ru-RU");
}

function makeRow(position, color, name, meta) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.className = "row";
  button.dataset.position = String(position);

  const key = document.createElement("span");
  key.className = "key";
  key.textContent = position === null ? "" : String(position);

  const dot = document.createElement("span");
  dot.className = "dot";
  if (color) dot.dataset.color = color;

  const title = document.createElement("span");
  title.className = "name";
  title.textContent = name;

  const info = document.createElement("span");
  info.className = "meta";
  info.textContent = meta;

  button.append(key, dot, title, info);
  item.append(button);
  return item;
}

async function toggle(position) {
  if (state.windowId === null) return;
  await browser.runtime.sendMessage({ type: "toggle", windowId: state.windowId, position });
  window.close();
}

async function render() {
  state = await browser.runtime.sendMessage({ type: "popup-state" });
  list.textContent = "";

  if (!state.groups.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "В этом окне нет групп вкладок.";
    list.append(empty);
  } else {
    const all = makeRow(0, null, "Все группы", `${state.groups.length} шт.`);
    all.querySelector(".dot").remove();
    list.append(all);
    state.groups.forEach((group, index) => {
      const position = index < 9 ? index + 1 : null;
      list.append(
        makeRow(
          position,
          group.color,
          group.title || "Без имени",
          `${group.count} · ${group.collapsed ? "свёрнута" : "развёрнута"}`
        )
      );
    });
  }

  const profile = state.activeProfile ? `Профиль «${state.activeProfile}»` : "Профиль не выбран";
  savedLine.textContent = state.savedAt
    ? `${profile} · снимок от ${formatDate(state.savedAt)}`
    : `${profile} · снимок ещё не сохранён`;
}

list.addEventListener("click", (event) => {
  const row = event.target.closest(".row");
  if (!row || !row.dataset.position) return;
  toggle(Number(row.dataset.position));
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key === "Escape") {
    window.close();
    return;
  }
  if (!/^[0-9]$/.test(event.key)) return;
  const position = Number(event.key);
  if (position > state.groups.length) return;
  event.preventDefault();
  toggle(position);
});

document.getElementById("save").addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "save", windowId: state.windowId });
  window.close();
});

document.getElementById("close-ungrouped").addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "close-ungrouped", windowId: state.windowId });
  window.close();
});

document.getElementById("restore").addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "open-dialog", mode: "restore", windowId: state.windowId });
  window.close();
});

document.getElementById("file").addEventListener("click", async () => {
  await browser.runtime.sendMessage({ type: "open-dialog", mode: "file", windowId: state.windowId });
  window.close();
});

render();
