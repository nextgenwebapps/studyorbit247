import { STORAGE_KEY } from "./config.js";

const SESSION_KEY = "studyorbit247.admin.demoSession";
const DEMO_EMAIL = "abc@gmail.com";
const DEMO_PASSWORD = "12345678";
const DRAFTS_KEY = STORAGE_KEY;
const PUBLISHED_KEY = "studyorbit247.admin.demoPublished.v1";

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export const api = {
  async login(email, password) {
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      throw new Error("Email ya password sahi nahi hai.");
    }
    const session = { email: DEMO_EMAIL, demo: true, signedInAt: new Date().toISOString() };
    write(SESSION_KEY, session);
    return session;
  },
  async me() {
    const session = read(SESSION_KEY, null);
    if (!session?.demo || session.email !== DEMO_EMAIL) throw new Error("Please sign in.");
    return session;
  },
  async logout() {
    localStorage.removeItem(SESSION_KEY);
    return { success: true };
  },
  async saveDrafts(questions) {
    const existing = read(DRAFTS_KEY, []);
    const byId = new Map(existing.map(q => [q.id, q]));
    questions.forEach(q => byId.set(q.id, { ...q, status: "draft", updatedAt: new Date().toISOString() }));
    const saved = [...byId.values()];
    write(DRAFTS_KEY, saved);
    return { success: true, count: questions.length, questions: saved };
  },
  async publish(ids) {
    const drafts = read(DRAFTS_KEY, []);
    const published = read(PUBLISHED_KEY, []);
    const selected = drafts.filter(q => ids.includes(q.id));
    const ready = selected.filter(q => q.question?.en?.trim() && q.question?.hi?.trim());
    const next = [...published.filter(q => !ids.includes(q.id)), ...ready.map(q => ({ ...q, status: "published", publishedAt: new Date().toISOString() }))];
    write(PUBLISHED_KEY, next);
    write(DRAFTS_KEY, drafts.filter(q => !ready.some(p => p.id === q.id)));
    return { success: true, count: ready.length, demo: true };
  },
  async getPublished() { return read(PUBLISHED_KEY, []); }
};
