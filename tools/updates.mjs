import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const dir = process.env.BETA_DIR;
const repo = process.env.REPO;
const xpi = process.env.XPI_FILE;
if (!dir || !repo || !xpi) throw new Error("нужны BETA_DIR, REPO, XPI_FILE");

const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8"));
const { id } = manifest.browser_specific_settings.gecko;
const { version } = manifest;
const link = `https://github.com/${repo}/releases/download/v${version}/${basename(xpi)}`;

const file = "updates.json";
const data = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { addons: {} };
const slot = (data.addons[id] ??= { updates: [] });
slot.updates = slot.updates.filter((entry) => entry.version !== version);
slot.updates.push({ version, update_link: link });
slot.updates.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`${file}: ${id} ${version} → ${link}`);
