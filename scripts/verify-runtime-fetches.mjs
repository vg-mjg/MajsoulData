import { promises as fsp } from "node:fs";
import path from "node:path";

const SITE_DIR = path.resolve("_site");
const ALLOWED_URL_PREFIXES = [
  "https://files.riichi.moe/",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
  "https://github.com/vg-mjg/MajsoulData",
];
const REQUIRED_LOCAL_VENDOR_FILES = [
  "assets/vendor/spine-player/spine-player.min.js",
];
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".json"]);

async function* walk(dir) {
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function allowed(url) {
  return ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function resourceUrls(text, rel) {
  const urls = [];
  const ext = path.extname(rel);

  if (ext === ".html") {
    const attrPattern = /\b(?:src|data-audio|data-lightbox-src)\s*=\s*["'](https?:\/\/[^"']+)["']/g;
    for (const match of text.matchAll(attrPattern)) urls.push(match[1]);

    const linkPattern = /<link\b[^>]*\bhref\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/g;
    for (const match of text.matchAll(linkPattern)) urls.push(match[1]);
  }

  if (ext === ".css") {
    const cssUrlPattern = /url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/g;
    for (const match of text.matchAll(cssUrlPattern)) urls.push(match[1]);
  }

  if (ext === ".js" && !rel.startsWith("assets/vendor/")) {
    const fetchPattern = /\bfetch\(\s*["'](https?:\/\/[^"']+)["']/g;
    for (const match of text.matchAll(fetchPattern)) urls.push(match[1]);
    const scriptSourcePattern = /\.src\s*=\s*["'](https?:\/\/[^"']+)["']/g;
    for (const match of text.matchAll(scriptSourcePattern)) urls.push(match[1]);
  }

  return urls;
}

const disallowed = [];

for await (const file of walk(SITE_DIR)) {
  const rel = path.relative(SITE_DIR, file);
  if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
  const text = await fsp.readFile(file, "utf8");
  for (const url of resourceUrls(text, rel)) {
    if (!allowed(url)) {
      disallowed.push(`${rel} -> ${url}`);
    }
  }
}

for (const rel of REQUIRED_LOCAL_VENDOR_FILES) {
  const full = path.join(SITE_DIR, rel);
  try {
    const stat = await fsp.stat(full);
    if (!stat.isFile() || stat.size === 0) {
      disallowed.push(`${rel} is missing or empty`);
    }
  } catch {
    disallowed.push(`${rel} is missing`);
  }
}

if (disallowed.length > 0) {
  console.error(disallowed.join("\n"));
  process.exitCode = 1;
}
