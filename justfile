set dotenv-load := true
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

artifacts := "web-ext-artifacts"
manifest := "manifest.json"

default:
    @just --list

version:
    @node -p "require('./{{ manifest }}').version"

check:
    @node --check background.js
    @node --check dialog.js
    @node --check popup.js
    @node --check i18n.js
    @node -e "JSON.parse(require('fs').readFileSync('{{ manifest }}'))"
    @just locales
    @echo "синтаксис в порядке"

locales:
    #!/usr/bin/env node
    const fs = require("fs");
    const read = (lang) => JSON.parse(fs.readFileSync(`_locales/${lang}/messages.json`, "utf8"));
    const en = read("en");
    const ru = read("ru");
    const missing = Object.keys(en).filter((key) => !(key in ru));
    const extra = Object.keys(ru).filter((key) => !(key in en));
    if (missing.length || extra.length) {
      if (missing.length) console.error("нет в ru: " + missing.join(", "));
      if (extra.length) console.error("нет в en: " + extra.join(", "));
      process.exit(1);
    }
    console.log(`локали в порядке: ключей ${Object.keys(en).length}`);

lint:
    npx --yes web-ext lint

build: check lint
    npx --yes web-ext build --overwrite-dest --ignore-files justfile README.md README.ru.md
    @ls -1 {{ artifacts }}/*.zip

zip:
    @mkdir -p {{ artifacts }}
    @ver=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' {{ manifest }} | head -1); \
      out="{{ artifacts }}/tab-groups-control-$ver.zip"; \
      rm -f "$out"; \
      zip -r -FS "$out" . -x '*.git*' '{{ artifacts }}/*' 'justfile' 'README.md' 'README.ru.md' 'updates.json' > /dev/null; \
      ls -1 "$out"

credentials:
    @test -n "${WEB_EXT_API_KEY:-}" || { echo "нет WEB_EXT_API_KEY — возьмите на addons.mozilla.org → Developer Hub → Manage API Keys" >&2; exit 1; }
    @test -n "${WEB_EXT_API_SECRET:-}" || { echo "нет WEB_EXT_API_SECRET" >&2; exit 1; }
    @echo "ключи AMO на месте"

sign-unlisted: check lint credentials
    npx --yes web-ext sign --channel=unlisted \
        --api-key="$WEB_EXT_API_KEY" --api-secret="$WEB_EXT_API_SECRET" \
        --ignore-files justfile README.md README.ru.md
    @ls -1 {{ artifacts }}/*.xpi

sign-listed: check lint credentials
    npx --yes web-ext sign --channel=listed \
        --api-key="$WEB_EXT_API_KEY" --api-secret="$WEB_EXT_API_SECRET" \
        --ignore-files justfile README.md README.ru.md

bump new:
    #!/usr/bin/env node
    const fs = require("fs");
    const next = "{{ new }}";
    if (!/^\d+\.\d+\.\d+$/.test(next)) {
      console.error("версия должна быть вида 1.3.0");
      process.exit(1);
    }
    const file = "{{ manifest }}";
    const text = fs.readFileSync(file, "utf8");
    const current = JSON.parse(text).version;
    const cmp = (a, b) => {
      const x = a.split(".").map(Number);
      const y = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
      return 0;
    };
    if (cmp(next, current) <= 0) {
      console.error(next + " не больше текущей " + current + " — AMO отклонит повтор");
      process.exit(1);
    }
    fs.writeFileSync(file, text.replace(/("version":\s*")[^"]+(")/, "$1" + next + "$2"));
    console.log(current + " → " + next);

xpi:
    @ls -1 {{ artifacts }}/*.xpi 2>/dev/null | tail -1 || { echo "подписанного .xpi нет — сначала just sign-unlisted" >&2; exit 1; }

updates repo:
    #!/usr/bin/env node
    const fs = require("fs");
    const m = JSON.parse(fs.readFileSync("{{ manifest }}"));
    const gecko = m.browser_specific_settings.gecko;
    const version = m.version;
    const repo = "{{ repo }}";
    const file = "updates.json";
    const link =
      "https://github.com/" + repo + "/releases/download/v" + version +
      "/tab_groups_control-" + version + ".xpi";
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { addons: {} };
    const slot = (data.addons[gecko.id] ??= { updates: [] });
    slot.updates = slot.updates.filter((u) => u.version !== version);
    slot.updates.push({ version, update_link: link });
    slot.updates.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    console.log("updates.json: " + gecko.id + " " + version);
    if (!gecko.update_url) {
      console.log("добавьте в manifest.json → browser_specific_settings.gecko:");
      console.log('  "update_url": "https://raw.githubusercontent.com/' + repo + '/main/updates.json"');
    }

release:
    @command -v gh > /dev/null || { echo "нужен gh (https://cli.github.com), либо приложите .xpi к релизу вручную" >&2; exit 1; }
    @test -d .git || { echo "каталог не под git — сначала git init и git remote add origin …" >&2; exit 1; }
    gh release create "v$(just version)" "$(just xpi)" \
        --title "Tab Groups Control $(just version)" \
        --notes "Подписанный .xpi. Установка: about:addons → шестерёнка → Установить дополнение из файла…"

publish-unlisted repo: sign-unlisted (updates repo) release

clean:
    rm -rf {{ artifacts }}
    @echo "{{ artifacts }} удалён"
