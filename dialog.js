const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");
const windowId = params.get("windowId") === null ? null : Number(params.get("windowId"));
const tabId = params.get("tabId") === null ? null : Number(params.get("tabId"));

const titleEl = document.getElementById("title");
const hintEl = document.getElementById("hint");
const bodyEl = document.getElementById("body");
const applyEl = document.getElementById("apply");
const cancelEl = document.getElementById("cancel");

let apply = async () => {};

const COLOR_NAMES = {
  blue: "синий",
  cyan: "голубой",
  green: "зелёный",
  grey: "серый",
  orange: "оранжевый",
  pink: "розовый",
  purple: "фиолетовый",
  red: "красный",
  yellow: "жёлтый"
};

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("ru-RU");
}

function groupRow(group, position) {
  const item = document.createElement("li");
  const row = document.createElement("div");
  row.className = "row";
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.dataset.groupId = String(group.id);

  const key = document.createElement("span");
  key.className = "key";
  key.textContent = position === null ? "·" : String(position);

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.dataset.color = group.color;

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = group.title || "Без имени";

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${group.count} вкл.`;

  row.append(key, dot, name, meta);
  item.append(row);
  return item;
}

async function setupNew() {
  titleEl.textContent = "Новая группа для текущей вкладки";
  hintEl.textContent = "Enter — создать, Esc — отмена. Цвет — клик или стрелки.";
  applyEl.textContent = "Создать";

  const { colors, groups } = await browser.runtime.sendMessage({ type: "groups", windowId });
  const used = new Set(groups.map((group) => group.color));

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Название группы";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Например: работа";
  nameLabel.append(input);

  const colorField = document.createElement("div");
  colorField.className = "field";
  const colorTitle = document.createElement("div");
  colorTitle.className = "field-title";
  colorTitle.textContent = "Цвет";
  const grid = document.createElement("div");
  grid.className = "swatches";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Цвет группы");

  const free = colors.filter((color) => !used.has(color));
  let selected = free.length ? free[0] : colors[0];

  const buttons = colors.map((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.dataset.color = color;
    if (used.has(color)) {
      button.classList.add("used");
      button.title = "Цвет уже используется в этом окне";
    }

    const box = document.createElement("span");
    box.className = "swatch-box";

    const name = document.createElement("span");
    name.className = "swatch-name";
    name.textContent = COLOR_NAMES[color] || color;

    button.append(box, name);
    button.addEventListener("click", () => choose(color));
    button.addEventListener("focus", () => choose(color));
    grid.append(button);
    return button;
  });

  const choose = (color) => {
    selected = color;
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.color === color));
    });
  };

  grid.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const index = (colors.indexOf(selected) + step + colors.length) % colors.length;
    choose(colors[index]);
    buttons[index].focus();
  });

  colorField.append(colorTitle, grid);
  bodyEl.append(nameLabel, colorField);
  choose(selected);
  input.focus();

  apply = async () => {
    await browser.runtime.sendMessage({
      type: "create-group",
      windowId,
      tabId,
      title: input.value.trim(),
      color: selected
    });
    window.close();
  };
}

async function setupAdd() {
  titleEl.textContent = "Добавить вкладку в группу";
  hintEl.textContent = "Цифра, стрелки + Enter или клик мышью.";
  applyEl.textContent = "Добавить";

  const { groups } = await browser.runtime.sendMessage({ type: "groups", windowId });
  const list = document.createElement("ul");
  list.className = "list";
  groups.forEach((group, index) => list.append(groupRow(group, index < 9 ? index + 1 : null)));
  bodyEl.append(list);

  const rows = [...list.querySelectorAll(".row")];
  let selected = 0;

  const highlight = () => {
    rows.forEach((row, index) => row.setAttribute("aria-selected", String(index === selected)));
    if (rows[selected]) rows[selected].focus();
  };

  const send = async (index) => {
    const row = rows[index];
    if (!row) return;
    await browser.runtime.sendMessage({
      type: "add-to-group",
      tabId,
      groupId: Number(row.dataset.groupId)
    });
    window.close();
  };

  list.addEventListener("click", (event) => {
    const row = event.target.closest(".row");
    if (row) send(rows.indexOf(row));
  });

  document.addEventListener("keydown", (event) => {
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      send(Number(event.key) - 1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      selected = (selected + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length;
      highlight();
    }
  });

  highlight();
  apply = () => send(selected);
}

async function setupOrder() {
  titleEl.textContent = "Порядок групп вкладок";
  hintEl.textContent = "Перетаскивайте строки мышью или двигайте кнопками ↑ ↓, затем «Применить».";
  applyEl.textContent = "Применить";

  const { groups } = await browser.runtime.sendMessage({ type: "groups", windowId });
  const list = document.createElement("ul");
  list.className = "list";
  bodyEl.append(list);

  const renumber = () => {
    [...list.children].forEach((item, index) => {
      item.querySelector(".key").textContent = String(index + 1);
    });
  };

  groups.forEach((group, index) => {
    const item = groupRow(group, index + 1);
    item.draggable = true;
    const row = item.querySelector(".row");

    const up = document.createElement("button");
    up.className = "icon";
    up.textContent = "↑";
    up.title = "Выше";
    const down = document.createElement("button");
    down.className = "icon";
    down.textContent = "↓";
    down.title = "Ниже";

    up.addEventListener("click", (event) => {
      event.stopPropagation();
      if (item.previousElementSibling) item.previousElementSibling.before(item);
      renumber();
    });
    down.addEventListener("click", (event) => {
      event.stopPropagation();
      if (item.nextElementSibling) item.nextElementSibling.after(item);
      renumber();
    });

    row.append(up, down);
    item.addEventListener("dragstart", () => item.classList.add("dragging"));
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      renumber();
    });
    list.append(item);
  });

  list.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = list.querySelector(".dragging");
    if (!dragging) return;
    const target = [...list.children].find((item) => {
      if (item === dragging) return false;
      const box = item.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    if (target) list.insertBefore(dragging, target);
    else list.append(dragging);
  });

  apply = async () => {
    const order = [...list.querySelectorAll(".row")].map((row) => Number(row.dataset.groupId));
    await browser.runtime.sendMessage({ type: "reorder", windowId, order });
    window.close();
  };
}

async function setupRestore() {
  titleEl.textContent = "Восстановление состояния";
  hintEl.textContent = "Текущие вкладки этого окна будут закрыты и заменены снимком.";
  applyEl.textContent = "Восстановить";

  const first = await browser.runtime.sendMessage({ type: "restore-preview", windowId });
  let selected = first.name;

  const picker = document.createElement("div");
  picker.className = "field";
  const pickerTitle = document.createElement("div");
  pickerTitle.className = "field-title";
  pickerTitle.textContent = "Профиль";
  const select = document.createElement("select");
  for (const profile of first.profiles) {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = `${profile.name} — ${profile.groups} гр., ${profile.tabs} вкл.`;
    option.selected = profile.name === selected;
    select.append(option);
  }
  picker.append(pickerTitle, select);

  const preview = document.createElement("div");
  bodyEl.append(picker, preview);

  const render = (data) => {
    preview.textContent = "";
    if (!data.snapshot) {
      preview.textContent = "Сохранённого состояния нет.";
      applyEl.disabled = true;
      return;
    }
    if (!data.snapshot.tabs) {
      preview.textContent = "Профиль пуст — восстанавливать нечего.";
      applyEl.disabled = true;
      return;
    }
    applyEl.disabled = false;

    const diff = document.createElement("div");
    diff.className = "diff";
    const saved = document.createElement("div");
    const savedDate = document.createElement("b");
    savedDate.textContent = formatDate(data.snapshot.savedAt);
    saved.append("Снимок от ", savedDate);
    const plus = document.createElement("div");
    const loose = data.snapshot.ungrouped ? ` (вне групп: ${data.snapshot.ungrouped})` : "";
    plus.textContent = `+ открыть: ${data.snapshot.tabs} вкл. в ${data.snapshot.groups.length} гр.${loose}`;
    const minus = document.createElement("div");
    minus.textContent = `− закрыть: ${data.current.tabs} текущих вкл. (${data.current.groups} гр.)`;
    diff.append(saved, plus, minus);

    const list = document.createElement("ul");
    list.className = "list";
    data.snapshot.groups.forEach((group, index) => {
      list.append(groupRow({ id: index, color: group.color, title: group.title, count: group.count }, index + 1));
    });
    [...list.querySelectorAll(".row")].forEach((row) => {
      row.removeAttribute("tabindex");
      row.removeAttribute("role");
      row.style.cursor = "default";
    });

    preview.append(diff, list);
  };

  select.addEventListener("change", async () => {
    selected = select.value;
    render(await browser.runtime.sendMessage({ type: "restore-preview", windowId, name: selected }));
  });

  render(first);
  if (!applyEl.disabled) applyEl.focus();

  apply = async () => {
    applyEl.disabled = true;
    await browser.runtime.sendMessage({ type: "restore-apply", windowId, name: selected });
    window.close();
  };
}

async function setupDelete() {
  titleEl.textContent = "Удаление профиля";
  hintEl.textContent = "Enter — удалить безвозвратно, Esc — отмена.";
  applyEl.textContent = "Удалить";

  const { active, profiles } = await browser.runtime.sendMessage({ type: "list-snapshots" });
  let selected = active;

  const picker = document.createElement("div");
  picker.className = "field";
  const pickerTitle = document.createElement("div");
  pickerTitle.className = "field-title";
  pickerTitle.textContent = "Профиль";
  const select = document.createElement("select");
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.name;
    option.textContent = `${profile.name} — ${profile.groups} гр., ${profile.tabs} вкл.`;
    option.selected = profile.name === selected;
    select.append(option);
  }
  picker.append(pickerTitle, select);

  const details = document.createElement("div");
  details.className = "diff";
  bodyEl.append(picker, details);

  const render = () => {
    const profile = profiles.find((p) => p.name === selected);
    details.textContent = "";
    if (!profile) {
      applyEl.disabled = true;
      details.textContent = "Профилей нет.";
      return;
    }
    applyEl.disabled = false;
    const line = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = profile.name;
    line.append("Будет удалён профиль ", name);
    const meta = document.createElement("div");
    meta.textContent = `${profile.groups} гр., ${profile.tabs} вкл., снимок от ${formatDate(profile.savedAt)}`;
    const warn = document.createElement("div");
    warn.textContent = "Отменить удаление нельзя.";
    details.append(line, meta, warn);
  };

  select.addEventListener("change", () => {
    selected = select.value;
    render();
  });

  render();
  if (!applyEl.disabled) applyEl.focus();

  apply = async () => {
    applyEl.disabled = true;
    await browser.runtime.sendMessage({ type: "delete-snapshot", name: selected });
    window.close();
  };
}

const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya"
};

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => TRANSLIT[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fileNameFor(name) {
  const slug = slugify(name);
  if (!slug) return "tab-groups-snapshot.json";
  if (slug === "default") return "tab-groups.json";
  return `tab-groups-${slug}.json`;
}

function profileFromFileName(fileName) {
  const match = /^tab-groups(?:-(.+))?\.json$/i.exec(fileName || "");
  if (!match) return "";
  return match[1] || "default";
}

async function downloadSnapshot(snapshot, name, status) {
  const blob = new Blob([JSON.stringify({ ...snapshot, name }, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  try {
    const id = await browser.downloads.download({
      url,
      filename: fileNameFor(name),
      saveAs: true
    });
    const done = (delta) => {
      if (delta.id !== id || !delta.state) return;
      if (delta.state.current === "complete" || delta.state.current === "interrupted") {
        browser.downloads.onChanged.removeListener(done);
        URL.revokeObjectURL(url);
      }
    };
    browser.downloads.onChanged.addListener(done);
    status.textContent = `Экспорт «${name}» → ${fileNameFor(name)}`;
  } catch (error) {
    URL.revokeObjectURL(url);
    status.textContent = "Экспорт отменён";
  }
}

async function setupFile() {
  titleEl.textContent = "Профили снимков: экспорт и импорт";
  hintEl.textContent = "Клик по строке делает профиль активным — в него пишет Ctrl+Alt+S.";
  applyEl.hidden = true;
  cancelEl.textContent = "Закрыть (Esc)";

  const status = document.createElement("p");
  status.className = "hint";
  const list = document.createElement("ul");
  list.className = "list";

  const buttons = document.createElement("div");
  buttons.className = "actions";
  buttons.style.borderTop = "none";
  const exportButton = document.createElement("button");
  exportButton.textContent = "⤓ Экспорт в файл…";
  const clearButton = document.createElement("button");
  clearButton.textContent = "⌫ Очистить активный";
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "✕ Удалить профиль";
  buttons.append(exportButton, clearButton, deleteButton);

  const importField = document.createElement("div");
  importField.className = "field";
  const importTitle = document.createElement("div");
  importTitle.className = "field-title";
  importTitle.textContent = "⤒ Импорт из файла";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  const nameInput = document.createElement("input");
  fileInput.style.marginBottom = "6px";
  nameInput.type = "text";
  nameInput.placeholder = "Имя профиля";
  nameInput.disabled = true;
  const importButton = document.createElement("button");
  importButton.textContent = "Импортировать";
  importButton.disabled = true;
  importButton.style.marginTop = "6px";
  importField.append(importTitle, fileInput, nameInput, importButton);

  bodyEl.append(status, list, buttons, importField);

  let selected = null;
  let parsed = null;

  const render = async () => {
    const { active, profiles } = await browser.runtime.sendMessage({ type: "list-snapshots" });
    if (selected === null || !profiles.some((p) => p.name === selected)) selected = active;
    list.textContent = "";

    if (!profiles.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Профилей пока нет — сохраните состояние (Ctrl+Alt+S).";
      list.append(empty);
      exportButton.disabled = true;
      clearButton.disabled = true;
      deleteButton.disabled = true;
      return;
    }

    exportButton.disabled = false;
    clearButton.disabled = false;
    deleteButton.disabled = false;

    for (const profile of profiles) {
      const item = document.createElement("li");
      const row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.dataset.name = profile.name;
      row.setAttribute("aria-selected", String(profile.name === selected));

      const key = document.createElement("span");
      key.className = "key";
      key.textContent = profile.name === active ? "✓" : "·";
      key.title = profile.name === active ? "Активный профиль" : "";

      const title = document.createElement("span");
      title.className = "name";
      title.textContent = profile.name;

      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = `${profile.groups} гр. · ${profile.tabs} вкл. · ${formatDate(profile.savedAt)}`;

      row.append(key, title, meta);
      item.append(row);
      list.append(item);
    }
  };

  list.addEventListener("click", async (event) => {
    const row = event.target.closest(".row");
    if (!row) return;
    selected = row.dataset.name;
    const result = await browser.runtime.sendMessage({
      type: "set-active-snapshot",
      name: selected
    });
    status.textContent = result.message;
    await render();
  });

  exportButton.addEventListener("click", async () => {
    const { snapshot } = await browser.runtime.sendMessage({ type: "read-snapshot", name: selected });
    if (!snapshot) {
      status.textContent = "Профиль пуст";
      return;
    }
    await downloadSnapshot(snapshot, selected, status);
  });

  clearButton.addEventListener("click", async () => {
    const result = await browser.runtime.sendMessage({ type: "clear-snapshot" });
    status.textContent = result.message;
    await render();
  });

  deleteButton.addEventListener("click", async () => {
    const result = await browser.runtime.sendMessage({ type: "delete-snapshot", name: selected });
    status.textContent = result.message;
    selected = null;
    await render();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    parsed = null;
    nameInput.disabled = true;
    importButton.disabled = true;
    if (!file) return;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      status.textContent = "Не удалось разобрать JSON";
      return;
    }
    nameInput.value = parsed.name || profileFromFileName(file.name) || "imported";
    nameInput.disabled = false;
    importButton.disabled = false;
    status.textContent = `Файл прочитан, профиль «${nameInput.value}» — нажмите «Импортировать»`;
  });

  importButton.addEventListener("click", async () => {
    if (!parsed) return;
    const result = await browser.runtime.sendMessage({
      type: "write-snapshot",
      name: nameInput.value.trim(),
      snapshot: parsed
    });
    status.textContent = result.message;
    if (result.ok) {
      parsed = null;
      fileInput.value = "";
      nameInput.disabled = true;
      importButton.disabled = true;
      selected = null;
      await render();
    }
  });

  await render();
  status.textContent = status.textContent || "Выберите профиль в списке";
}

const setups = {
  new: setupNew,
  add: setupAdd,
  order: setupOrder,
  restore: setupRestore,
  delete: setupDelete,
  file: setupFile
};

applyEl.addEventListener("click", () => apply());
cancelEl.addEventListener("click", () => window.close());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") window.close();
  if (event.key === "Enter" && !applyEl.hidden && !applyEl.disabled) {
    event.preventDefault();
    apply();
  }
});

(setups[mode] || (async () => {
  titleEl.textContent = "Неизвестный режим";
  applyEl.hidden = true;
}))();
