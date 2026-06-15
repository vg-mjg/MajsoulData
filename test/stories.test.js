import test from "node:test";
import assert from "node:assert/strict";

import { buildFixtureStoriesCollection } from "./helpers/fixture-collection.js";
import { loadStoriesCollection } from "../pipeline/stories.js";

test("parses story scenario spots, scenes, speakers, choices, and rewards", () => {
  const stories = buildFixtureStoriesCollection();
  const story = stories["yiji/100004"];

  assert.equal(story.contentPath, "yiji/100004");
  assert.deepEqual(story.summary, {
    spotCount: 1,
    sceneCount: 2,
    chooseSceneCount: 1,
    endSceneCount: 1,
    entryCount: 2,
  });

  const [scene] = story.spots[0].scenes;
  assert.equal(scene.id, 10);
  assert.equal(scene.speaker.en, "Narrator");
  assert.equal(scene.text.en, "Hello\nworld");
  assert.equal(scene.options[0].text.en, "Follow the cat");
  assert.equal(scene.options[0].eventParam, 2);
  assert.equal(scene.options[0].consume.itemId, 100001);
  assert.equal(scene.rewards[0].text.en, "Unlock Ending - Cat");
  assert.equal(scene.rewards[0].items[0].itemId, 100001);
  assert.equal(scene.rewards[0].items[0].count, 2);
  assert.equal(scene.rewards[0].items[0].text.name.en, "Jade");
});

test("resolves each story text map through the language fallback chain", () => {
  const scene = buildFixtureStoriesCollection()["yiji/100004"].spots[0].scenes[1];

  assert.equal(scene.text.jp, "JP fallback line");
  assert.equal(scene.speaker.jp, "先生");
  assert.equal(scene.text.en, "JP fallback line");
  assert.equal(scene.speaker.en, "先生");
  assert.equal(scene.text.chs, "繁中備援");
  assert.equal(scene.speaker.chs, "繁中旁白");
  assert.equal(scene.text.kr, "JP fallback line");
});


test("story collection loader warns and skips a missing scenario", async () => {
  const fixture = buildFixtureStoriesCollection()["yiji/100004"];
  const warnings = [];
  const stories = await loadStoriesCollection(["yiji/100004", "missing/story"], [], [], {
    warn: (message) => warnings.push(message),
    readJson: async (relPath) => {
      if (relPath.endsWith("yiji/100004.json")) return { Spots: fixture.spots.map((spot) => ({ spotid: spot.id, SceneMap: [] })) };
      return null;
    },
    readText: async () => null,
  });

  assert.deepEqual(Object.keys(stories), ["yiji/100004"]);
  assert.match(warnings.join("\n"), /missing\/story\.json missing; skipped/);
});
