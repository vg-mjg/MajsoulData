import { rm } from "node:fs/promises";

import Eleventy from "@11ty/eleventy";

const attemptedFetches = [];

globalThis.fetch = async (input) => {
  const target = typeof input === "string" ? input : input?.url || String(input);
  attemptedFetches.push(target);
  throw new Error(`Build attempted a remote fetch: ${target}`);
};

await rm("_site", { recursive: true, force: true });

const elev = new Eleventy("src", "_site", {
  configPath: "eleventy.config.js",
  quietMode: true,
});

await elev.write();

if (attemptedFetches.length > 0) {
  throw new Error(`Build attempted remote fetches: ${attemptedFetches.join(", ")}`);
}
