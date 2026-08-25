const DIRECTIVE_RE = /^\s*@AI\s*[:：]\s*(.+?)\s*$/u;
const TASK_RE = /<!--\s*\n?AI_TASK:\s*\n([\s\S]*?)\n?\s*-->/gu;

export function scanDirectives(text, file = "") {
  return text.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(DIRECTIVE_RE);
    return match ? [{ file, line: index + 1, instruction: match[1], unresolved: true }] : [];
  });
}

export function scanTasks(text, file = "") {
  return [...text.matchAll(TASK_RE)].map((match) => {
    const fields = Object.fromEntries([...match[1].matchAll(/^\s{2,}(id|status|instruction):\s*(.*?)\s*$/gmu)].map((m) => [m[1], m[2]]));
    return { file, id: fields.id ?? "", status: fields.status ?? "unresolved", instruction: fields.instruction ?? "", raw: match[0] };
  });
}

export function stripAiTaskMarkers(text) {
  return text.replace(TASK_RE, "").replace(/\n{3,}/g, "\n\n").trimStart();
}

export function hasVisibleDirective(text) { return scanDirectives(text).length > 0; }
