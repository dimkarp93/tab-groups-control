import { readFileSync, writeFileSync } from "node:fs";

const dir = process.env.BETA_DIR;
const id = process.env.BETA_ID;
const repo = process.env.REPO;
const branch = process.env.BRANCH || "master";
if (!dir || !id || !repo) throw new Error("нужны BETA_DIR, BETA_ID, REPO");

const file = `${dir}/manifest.json`;
const manifest = JSON.parse(readFileSync(file, "utf8"));
manifest.name = `${manifest.name} (beta)`;
manifest.browser_specific_settings.gecko.id = id;
manifest.browser_specific_settings.gecko.update_url =
  `https://raw.githubusercontent.com/${repo}/${branch}/updates.json`;
writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
console.log(`${file}: ${id} ${manifest.version}`);
