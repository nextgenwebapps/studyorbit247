export function emptyAnswer(question) {
  if (["multi", "gateMsq"].includes(question.type)) return [];
  if (["match", "ordering", "matrix"].includes(question.type)) return {};
  return "";
}

export function hasAnswer(answer) {
  if (Array.isArray(answer)) return answer.length > 0;
  if (answer && typeof answer === "object") return Object.values(answer).some((value) => value !== "");
  return Boolean(String(answer ?? "").trim());
}

export function displayAnswer(answer) {
  if (!hasAnswer(answer)) return "Not attempted";
  if (Array.isArray(answer)) return answer.join(", ");
  return typeof answer === "object" ? JSON.stringify(answer) : answer;
}

export function scoreQuestion(q, a) {
  const c = q.correct;
  const norm = (x) =>
    String(x ?? "")
      .trim()
      .toLowerCase();
  if (["multi", "gateMsq"].includes(q.type))
    return Array.isArray(a) && Array.isArray(c) && a.length === c.length && a.every((x) => c.includes(x));
  if (["match", "ordering", "matrix"].includes(q.type)) {
    let keys = Object.keys(c || {});
    return keys.length > 0 && keys.every((k) => String(a[k] ?? "") === String(c[k]));
  }
  if (Array.isArray(c)) return c.some((x) => norm(x) === norm(a));
  return norm(a) === norm(c);
}
