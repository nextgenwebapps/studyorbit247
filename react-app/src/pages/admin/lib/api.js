import { API_BASE, STORAGE_KEY } from "./config.js";

const PUBLISHED_KEY = "studyorbit247.admin.demoPublished.v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof Blob ? {} : options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export const api = {
  async login(email, password) {
    return request("/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  async me() { return request("/admin/me"); },
  async logout() { return request("/admin/logout", { method: "POST" }); },
  async startUpload({ key, size, contentType, fileName }) {
    return request("/admin/uploads/start", { method: "POST", body: JSON.stringify({ key, size, contentType, fileName }) });
  },
  async getUploadHistory(limit = 20) {
    const query = new URLSearchParams({ limit: String(limit) });
    return request("/admin/uploads/history?" + query);
  },
  async getQuestionHistory(limit = 20, questionId = "") {
    const query = new URLSearchParams({ limit: String(limit) });
    if (questionId) query.set("questionId", questionId);
    return request("/admin/questions/history?" + query);
  },
  async getTaxonomy() { return request("/admin/taxonomy"); },
  async createTaxonomy(item) {
    return request("/admin/taxonomy", { method: "POST", body: JSON.stringify(item) });
  },
  async nextQuestionId({ subjectCode, chapterCode, topicCode, level }) {
    return request("/admin/questions/next-id", { method: "POST", body: JSON.stringify({ subjectCode, chapterCode, topicCode, level }) });
  },
  async uploadPart({ key, uploadId, partNumber, body }) {
    const query = new URLSearchParams({ key });
    return request(`/admin/uploads/${encodeURIComponent(uploadId)}/parts/${partNumber}?${query}`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body,
    });
  },
  async completeUpload({ key, uploadId, parts }) {
    return request("/admin/uploads/complete", { method: "POST", body: JSON.stringify({ key, uploadId, parts }) });
  },
  async abortUpload({ key, uploadId }) {
    return request("/admin/uploads/abort", { method: "POST", body: JSON.stringify({ key, uploadId }) });
  },
  async saveDrafts(questions) {
    const existing = read(STORAGE_KEY, []);
    const byId = new Map(existing.map(q => [q.id, q]));
    questions.forEach(q => byId.set(q.id, { ...q, status: "draft", updatedAt: new Date().toISOString() }));
    const saved = [...byId.values()];
    write(STORAGE_KEY, saved);
    return { success: true, count: questions.length, questions: saved };
  },
  async publish(ids) {
    const drafts = read(STORAGE_KEY, []);
    const published = read(PUBLISHED_KEY, []);
    const selected = drafts.filter(q => ids.includes(q.id));
    const ready = selected.filter(q => q.question?.en?.trim() && q.question?.hi?.trim());
    const next = [...published.filter(q => !ids.includes(q.id)), ...ready.map(q => ({ ...q, status: "published", publishedAt: new Date().toISOString() }))];
    write(PUBLISHED_KEY, next);
    write(STORAGE_KEY, drafts.filter(q => !ready.some(p => p.id === q.id)));
    return { success: true, count: ready.length, demo: true };
  },
  async getPublished() { return read(PUBLISHED_KEY, []); }
};
