set dotenv-load := true
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

artifacts := "web-ext-artifacts"
manifest := "manifest.json"
repo := "dimkarp93/tab-groups-control"
beta := "build/beta"
beta_id := "tab-groups-control-beta@dimkarp93.github.io"
localdir := "build/local"
ignore := "justfile '*.md' updates.json tools docs screenshots build 'tools/**' 'docs/**' 'screenshots/**' 'build/**'"

[group("development")]
[doc("List available recipes")]
default:
    @just --list

[group("development")]
[doc("Print the current extension version")]
version:
    @node -p "require('./{{ manifest }}').version"

[group("checks")]
[doc("Run all checks: syntax, locales, icons, lint")]
check: syntax locales icons-check lint
    @echo "all checks ok"

[group("checks")]
[doc("Check JS syntax and manifest JSON")]
syntax:
    @node --check background.js
    @node --check dialog.js
    @node --check popup.js
    @node --check i18n.js
    @node -e "JSON.parse(require('fs').readFileSync('{{ manifest }}'))"
    @echo "syntax ok"

[group("checks")]
[doc("Verify en and ru locale keys match")]
locales:
    #!/usr/bin/env node
    const fs = require("fs");
    const read = (lang) => JSON.parse(fs.readFileSync(`_locales/${lang}/messages.json`, "utf8"));
    const en = read("en");
    const ru = read("ru");
    const missing = Object.keys(en).filter((key) => !(key in ru));
    const extra = Object.keys(ru).filter((key) => !(key in en));
    if (missing.length || extra.length) {
      if (missing.length) console.error("missing in ru: " + missing.join(", "));
      if (extra.length) console.error("missing in en: " + extra.join(", "));
      process.exit(1);
    }
    console.log(`locales ok: ${Object.keys(en).length} keys`);

[group("development")]
[doc("Generate PNG icons from icons/icon.svg")]
icons:
    node tools/make-icons.mjs

[group("checks")]
[doc("Verify icon files referenced by the manifest exist")]
icons-check:
    #!/usr/bin/env node
    const fs = require("fs");
    const m = JSON.parse(fs.readFileSync("{{ manifest }}"));
    const files = new Set([...Object.values(m.icons), ...Object.values(m.action.default_icon)]);
    const missing = [...files].filter((f) => !fs.existsSync(f));
    if (missing.length) {
      console.error("missing icon files: " + missing.join(", ") + " — run just icons");
      process.exit(1);
    }
    console.log(`icons ok: ${files.size}`);

[group("checks")]
[doc("Lint the extension with web-ext")]
lint:
    npx --yes web-ext lint --ignore-files {{ ignore }}

[group("development")]
[doc("Run in Firefox ESR with optional UI language (en, ru)")]
run lang="":
    npx --yes web-ext run --firefox=firefox-esr \
        {{ if lang == "" { "" } else if lang == "en" { "--pref=intl.locale.requested=en-US" } else { "--pref=intl.locale.requested=" + lang } }} \
        --start-url 'about:debugging#/runtime/this-firefox'

[group("packaging")]
[doc("Build the zip package for AMO")]
build: check
    npx --yes web-ext build --overwrite-dest --ignore-files {{ ignore }}
    @realpath "$(ls -1t {{ artifacts }}/*.zip | head -1)"

[group("packaging")]
[doc("Build an unsigned .xpi for local install")]
xpi: check
    #!/usr/bin/env bash
    set -euo pipefail
    rm -rf {{ localdir }}
    mkdir -p {{ localdir }}
    npx --yes web-ext build --overwrite-dest \
        --artifacts-dir {{ localdir }} --ignore-files {{ ignore }}
    zip="$(ls -1t {{ localdir }}/*.zip | head -1)"
    out="{{ localdir }}/tab-groups-control-$(just version)-unsigned.xpi"
    mv "$zip" "$out"
    echo "ready: $(realpath "$out")"
    echo "unsigned package: installs only via about:debugging (temporary)"
    echo "or in Developer Edition / Nightly / unbranded ESR with xpinstall.signatures.required=false"

[group("publishing")]
[doc("Check that AMO API keys are set")]
credentials:
    @test -n "${WEB_EXT_API_KEY:-}" || { echo "WEB_EXT_API_KEY is not set — get it at addons.mozilla.org → Developer Hub → Manage API Keys" >&2; exit 1; }
    @test -n "${WEB_EXT_API_SECRET:-}" || { echo "WEB_EXT_API_SECRET is not set" >&2; exit 1; }
    @echo "AMO keys ok"

[group("publishing")]
[doc("Sign and submit the listed version to AMO")]
sign-listed: check credentials
    npx --yes web-ext sign --channel=listed \
        --api-key="$WEB_EXT_API_KEY" --api-secret="$WEB_EXT_API_SECRET" \
        --ignore-files {{ ignore }}

[group("packaging")]
[doc("Stage the beta build with its own id and update_url")]
stage-beta branch="master": check
    rm -rf {{ beta }}
    mkdir -p {{ beta }}
    rsync -a \
        --exclude '.git' --exclude '.gitignore' --exclude '.amo-upload-uuid' \
        --exclude 'build' --exclude '{{ artifacts }}' \
        --exclude 'tools' --exclude 'docs' --exclude 'screenshots' \
        --exclude 'justfile' --exclude '*.md' \
        --exclude 'updates.json' \
        ./ {{ beta }}/
    BETA_DIR={{ beta }} BETA_ID={{ beta_id }} REPO={{ repo }} BRANCH={{ branch }} \
        node tools/stage-beta.mjs

[group("publishing")]
[doc("Sign the staged beta build as unlisted")]
sign-unlisted: credentials
    @test -f {{ beta }}/manifest.json || { echo "{{ beta }} not found — run just stage-beta first" >&2; exit 1; }
    npx --yes web-ext sign --channel=unlisted \
        --source-dir {{ beta }} --artifacts-dir {{ artifacts }} \
        --api-key="$WEB_EXT_API_KEY" --api-secret="$WEB_EXT_API_SECRET"
    @ls -1 {{ artifacts }}/*.xpi

[group("publishing")]
[doc("Set a new manifest version, rejecting non-increasing ones")]
bump new:
    #!/usr/bin/env node
    const fs = require("fs");
    const next = "{{ new }}";
    if (!/^\d+\.\d+\.\d+$/.test(next)) {
      console.error("version must look like 1.3.0");
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
      console.error(next + " is not greater than current " + current + " — AMO rejects duplicates");
      process.exit(1);
    }
    fs.writeFileSync(file, text.replace(/("version":\s*")[^"]+(")/, "$1" + next + "$2"));
    console.log(current + " → " + next);

[group("publishing")]
[doc("Print the newest signed .xpi path")]
xpi-version:
    @ls -1t {{ artifacts }}/*.xpi 2>/dev/null | head -1 || { echo "no signed .xpi — run just stage-beta && just sign-unlisted first" >&2; exit 1; }

[group("publishing")]
[doc("Update updates.json with the signed .xpi link")]
updates:
    XPI_FILE="$(just xpi-version)" BETA_DIR={{ beta }} REPO={{ repo }} node tools/updates.mjs

[group("publishing")]
[doc("Create a GitHub release with the signed .xpi")]
release:
    @command -v gh > /dev/null || { echo "gh is required (https://cli.github.com), or attach the .xpi to the release manually" >&2; exit 1; }
    @test -d .git || { echo "not a git repository — run git init and git remote add origin … first" >&2; exit 1; }
    gh release create "v$(just version)" "$(just xpi-version)" \
        --title "Tab Groups Control $(just version) beta" \
        --notes "Signed beta build. Install: about:addons → gear icon → Install Add-on From File…"

[group("publishing")]
[doc("Stage, sign, update updates.json and release the beta")]
publish-beta branch="master": (stage-beta branch) sign-unlisted updates release

[group("development")]
[doc("Remove build outputs and signed artifacts")]
clean:
    rm -rf {{ artifacts }} build
    @echo "{{ artifacts }} and build removed"
