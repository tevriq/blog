import test from "node:test";
import assert from "node:assert/strict";
import { scanDirectives, scanTasks, stripAiTaskMarkers } from "../scripts/ai-directives.mjs";

test("scans full-width and ASCII directives without false positives", () => {
  const text = "AI is a word\n@AI：京都的感悟\n@AI: add photos";
  assert.deepEqual(scanDirectives(text, "x.md").map((x) => [x.line, x.instruction]), [[2, "京都的感悟"], [3, "add photos"]]);
});
test("parses task status and strips only project markers", () => {
  const source = "before\n<!--\nAI_TASK:\n  id: ai-1\n  status: resolved\n  instruction: test\n-->\n\nactual <!-- keep -->\n";
  assert.equal(scanTasks(source)[0].status, "resolved");
  assert.equal(stripAiTaskMarkers(source), "before\n\nactual <!-- keep -->\n");
});
