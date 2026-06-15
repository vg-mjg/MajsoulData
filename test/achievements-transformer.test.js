import test from "node:test";
import assert from "node:assert/strict";

import { transformAchievements } from "../pipeline/achievements.js";
import { buildFixtureAchievementsCollection } from "./helpers/fixture-collection.js";

test("groups achievements by achievement group with localized text", () => {
  const groups = buildFixtureAchievementsCollection();
  assert.deepEqual(groups.map((group) => group.id), [1, 2]);
  assert.equal(groups[0].text.name.en, "The Journey");
  assert.deepEqual(groups[0].achievements.map((achievement) => achievement.id), [100002, 100001]);
  assert.equal(groups[0].counts.hidden, 1);
});

test("resolves achievement and group rewards to item ids, names, counts, and icons", () => {
  const [journey] = buildFixtureAchievementsCollection();
  assert.equal(journey.rewards[0].itemId, 600001);
  assert.equal(journey.rewards[0].count, 1);
  assert.equal(journey.rewards[0].text.name.en, "N/A");
  assert.match(journey.rewards[0].icon, /deco\/title\/notitle\/item\/notitle\.png$/);

  const hiddenPath = journey.achievements[0];
  assert.equal(hiddenPath.rewards[0].itemId, 100001);
  assert.equal(hiddenPath.rewards[0].text.name.en, "Jade");
  assert.match(hiddenPath.rewards[0].icon, /extendRes\/items\/jade\.png$/);
});

test("drops empty achievement groups while keeping non-empty groups", () => {
  const groups = transformAchievements(
    {
      achievement: [
        {
          id: 100001,
          group_id: 1,
          sort: 1,
          rare: 1,
          locked: 0,
          hidden: 0,
          deprecated: 0,
          segment_id: 0,
          base_task: 0,
          reward: "",
          name_en: "Kept achievement",
          desc_en: "Earned.",
        },
      ],
      achievementGroup: [
        { id: 1, sort: 1, deprecated: 0, percentage: 0, reward: "", name_en: "Kept group" },
        { id: 2, sort: 2, deprecated: 0, percentage: 0, reward: "", name_en: "Empty group" },
      ],
    },
    [],
  );

  assert.deepEqual(groups.map((group) => group.id), [1]);
  assert.equal(groups[0].counts.achievements, 1);
});
