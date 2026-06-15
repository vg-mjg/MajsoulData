import test from "node:test";
import assert from "node:assert/strict";

import { buildFixtureCatChatCollection } from "./helpers/fixture-collection.js";

function byId() {
  const map = new Map();
  for (const activity of buildFixtureCatChatCollection()) map.set(activity.id, activity);
  return map;
}

test("groups CatChat threads by activity and resolves names inline", () => {
  const catchat = buildFixtureCatChatCollection();
  assert.deepEqual(catchat.map((activity) => activity.id), [9003, 9002, 9001]);

  const activity = byId().get(9001);
  assert.equal(activity.threads.length, 2);
  assert.equal(activity.summary.entries, 5);
  assert.equal(activity.summary.disabled, 1);

  const post = activity.threads[0];
  assert.equal(post.author.name.en, "Ichihime");
  assert.equal(post.unlock.name.en, "Gift Token");
  assert.equal(post.unlock.count, 2);
  assert.equal(post.text.content.en, "Hello Player!\nFresh image post.");

  const reply = post.children[0];
  assert.equal(reply.author.name.en, "Mystery Cat");
  assert.equal(reply.replyTo.name.en, "Ichihime");
  assert.equal(reply.isPrivate, true);

  assert.equal(post.children[1].author.kind, "player");
  assert.equal(post.children[1].choiceId, 1);
  assert.equal(post.children[1].sourceChoiceId, 1);
  assert.equal(post.children[2].author.kind, "player");
  assert.equal(post.children[2].choiceId, 2);
  assert.equal(post.children[2].sourceChoiceId, 1);
});

test("resolves CatChat images per locale from unity_raw within the ref directory", () => {
  const post = byId().get(9001).threads[0];
  const image = post.images[0].image;
  assert.equal(typeof image, "object");
  assert.match(image.en, /catchat\/main\/pic_scattered\/en_en\/newpost\.png$/);
  assert.match(image.chs, /catchat\/main\/pic_scattered\/chs\/newpost\.png$/);
  assert.match(image.cn, /catchat\/main\/pic_scattered\/chs_t\/newpost\.png$/);
  assert.match(image.jp, /raw%20assets\/v0\.11\.53\.w\/jp\/myres\/sns\/newpost\.jpg$/);
  assert.match(image.kr, /raw%20assets\/v0\.11\.54\.w\/kr\/myres\/sns\/newpost\.jpg$/);
});

test("fills CatChat images from legacy raw assets by file and by activity fallback", () => {
  const post = byId().get(9001).threads[0];
  const perFile = post.images[1].image;
  assert.match(perFile.en, /raw%20assets\/v0\.11\.50\.w\/en\/myres\/sns\/legacy_file\.png$/);
  assert.match(perFile.chs, /raw%20assets\/v0\.11\.51\.w\/chs\/myres\/sns\/legacy_file\.png$/);
  assert.match(perFile.cn, /raw%20assets\/v0\.11\.52\.w\/chs_t\/myres\/sns\/legacy_file\.png$/);
  assert.match(perFile.jp, /raw%20assets\/v0\.11\.53\.w\/jp\/myres\/sns\/legacy_file\.png$/);
  assert.match(perFile.kr, /raw%20assets\/v0\.11\.54\.w\/kr\/myres\/sns\/legacy_file\.png$/);

  const fallback = post.children[0].images[0].image;
  assert.match(fallback.en, /raw%20assets\/v0\.11\.50\.w\/en\/myres\/sns\/activity_fallback\.png$/);
  assert.match(fallback.chs, /raw%20assets\/v0\.11\.51\.w\/chs\/myres\/sns\/activity_fallback\.png$/);
  assert.match(fallback.cn, /raw%20assets\/v0\.11\.52\.w\/chs_t\/myres\/sns\/activity_fallback\.png$/);
});

test("keeps entries when images are unresolved and avoids cross-directory basename matching", () => {
  const post = byId().get(9003).threads[0];
  const missing = post.images[0];
  assert.equal(missing.ref, "ui/activity/extend/catchat/main/pic_scattered/lonely_missing.png");
  assert.equal(missing.image, "");
  assert.equal(post.text.content.en, "Unresolved image survives");
});
