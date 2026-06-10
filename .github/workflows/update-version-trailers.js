"use strict";

const fs = require("fs");
const path = require("path");

const VERSION_FILE = path.resolve(process.cwd(), "web/version.json");
const REGION_ORDER = ["en", "cn", "jp", "kr"];

function readVersions() {
  return JSON.parse(fs.readFileSync(VERSION_FILE, "utf8"));
}

function regionTrailer(region, metadata) {
  return [
    region.toUpperCase(),
    `${metadata.product_version || "?"}/${metadata.resource_version || "?"}`,
  ].join(": ");
}

function main() {
  const versions = readVersions();
  const trailers = REGION_ORDER.filter((region) => versions[region]).map(
    (region) => regionTrailer(region, versions[region]),
  );

  process.stdout.write(trailers.join("\n") || "Version: unknown");
}

main();
