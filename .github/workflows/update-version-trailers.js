import { readFileSync } from "node:fs";
import path from "node:path";

const VERSION_FILE = path.resolve(process.cwd(), "src/_data/version.json");
const REGION_ORDER = ["en", "cn", "jp", "kr"];

function readVersions() {
  return JSON.parse(readFileSync(VERSION_FILE, "utf8"));
}

function regionTrailer(region, metadata) {
  return [
    region.toUpperCase(),
    `${metadata.product_version || "?"}/${metadata.resource_version || "?"}`,
  ].join(": ");
}

const versions = readVersions();
const trailers = REGION_ORDER.filter((region) => versions[region]).map((region) =>
  regionTrailer(region, versions[region]),
);

process.stdout.write(trailers.join("\n") || "Version: unknown");
