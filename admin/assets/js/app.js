import { requireAdmin, signOut } from "./auth.js";
import { initBuilder } from "./builder.js";
import { validateQuestion, typeLabel } from "./question-model.js";
import { renderPreview } from "./preview.js";
import { STORAGE_KEY } from "./config.js";
import { parseImportFile, csvTemplate } from "./bulk-import.js";
import { api } from "./api.js";

window.__parseImportFile = parseImportFile;
window.__csvTemplate = csvTemplate;

const $ = selector => document.querySelector(selector);
const toast = $("#toast");
const showToast = message => {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
};
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
let drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let published = [];
let builder;

function save(list) {
  drafts = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  refresh();
}
function refresh() {
  $("#stat-drafts").textContent = drafts.length;
  $("#stat-ready").textContent = drafts.filter(q => validateQuestion(q).length === 0).length;
  $("#stat-errors").textContent = drafts.filter(q => validateQuestion(q).length > 0).length;
  $("#stat-published").textContent = published.length;
  const recent = $("#recent-drafts");
  recent.innerHTML = drafts.length
    ? drafts.slice(-5).reverse().map(q => `<div class="question-row"><div><strong>${escapeHtml(q.question?.en || "Untitled question")}</strong><small>${escapeHtml(typeLabel(q.type))} · ${escapeHtml(q.subject || "No subject")}</small></div><span class="draft-pill">Draft</span></div>`).join("")
    : '<div class="empty-state">No drafts yet. Start by adding a question.</div>';
  renderList();
  renderReview();
}
function renderList() {
  const list = $("#question-list");
  if (!list) return;
  const search = $("#question-search")?.value.toLowerCase() || "";
  const status = $("#status-filter")?.value || "all";
  const type = $("#type-filter")?.value || "all";
  const filtered = drafts.filter(q =>
    (q.question?.en || "").toLowerCase().includes(search) &&
    (status === "all" || status === (validateQuestion(q).length ? "draft" : "ready")) &&
    (type === "all" || q.type === type)
  );
  list.innerHTML = filtered.length ? filtered.map(q => `
    <div class="question-row">
      <div><strong>${escapeHtml(q.question?.en || "Untitled question")}</strong>
      <small>${escapeHtml(typeLabel(q.type))} · ${escapeHtml(q.subject || "No subject")} · ${validateQuestion(q).length ? "Needs attention" : "Ready for review"}</small></div>
      <button class="text-button" data-remove="${escapeHtml(q.id)}">Delete</button>
    </div>`).join("") : '<div class="empty-state">No matching questions.</div>';
  list.querySelectorAll("[data-edit-question]").forEach(button => button.onclick = () => {\n    const question = drafts.find(item => item.id === button.dataset.editQuestion);\n    nav("create", "single");\n    builder.loadQuestion(question);\n    renderPreview(question, $("#preview-stage"), $(".device-switch .selected")?.dataset.device || "mobile");\n  });\n  list.querySelectorAll("[data-remove]").forEach(button => button.onclick = () => {
    if (confirm("Delete this local draft?")) save(drafts.filter(q => q.id !== button.dataset.remove));
  });
}
function renderReview() {
  const list = $("#review-list");
  if (!list) return;
  if (!drafts.length) {
    list.innerHTML = '<div class="empty-state">No drafts waiting for review. Add questions first.</div>';
    return;
  }
  list.innerHTML = drafts.map(q => {
    const errors = validateQuestion(q);
    return `<article class="question-row review-row">
      <div><strong>${escapeHtml(q.question?.en || "Untitled question")}</strong>
      <small>${escapeHtml(typeLabel(q.type))} · ${escapeHtml(q.subject || "No subject")} · ${errors.length ? errors.length + " validation issue(s)" : "Basic checks passed"}</small></div>
      <div class="review-actions"><span class="draft-pill">${errors.length ? "Needs review" : "Ready"}</span>
      <button class="text-button" data-preview="${escapeHtml(q.id)}">Preview</button>
      <button class="text-button" data-publish-one="${escapeHtml(q.id)}" ${errors.length ? "disabled" : ""}>Publish demo</button></div>
    </article>`;
  }).join("") + '<div class="review-footer"><button class="primary" id="publish-all-demo">Publish all ready (demo)</button><small>Demo publishing only changes local browser data. Nothing is sent to the live website.</small></div>';
  list.querySelectorAll("[data-preview]").forEach(button => button.onclick = () => {
    const q = drafts.find(item => item.id === button.dataset.preview);
    nav("create", "single");
    builder.loadQuestion?.(q);
    renderPreview(q, $("#preview-stage"), $(".device-switch .selected")?.dataset.device || "mobile");
  });
  list.querySelectorAll("[data-publish-one]").forEach(button => button.onclick = () => publish([button.dataset.publishOne]));
  $("#publish-all-demo").onclick = () => publish(drafts.filter(q => validateQuestion(q).length === 0).map(q => q.id));
}
async function publish(ids) {
  if (!ids.length) return showToast("No validated questions selected.");
  if (!confirm("Demo publish selected questions in this browser only? They will NOT go live on StudyOrbit247.")) return;
  const result = await api.publish(ids);
  drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  published = await api.getPublished();
  refresh();
  showToast(result.count + " question(s) marked as demo-published locally.");
}
const nav = (view, mode) => {
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === "view-" + view));
  document.querySelectorAll(".nav-link[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = ({ overview: "Overview", questions: "Question bank", create: "Add questions", review: "Review & publish" })[view];
  $("#sidebar").classList.remove("open");
  if (view === "create" && mode) builder.setMode(mode);
};
document.querySelectorAll("[data-view]").forEach(button => button.onclick = () => nav(button.dataset.view));
document.querySelectorAll("[data-go]").forEach(button => button.onclick = () => nav(button.dataset.go, button.dataset.mode));
$("#menu-toggle").onclick = () => $("#sidebar").classList.toggle("open");
$("#logout").onclick = signOut;
$("#question-search").oninput = renderList;
$("#status-filter").onchange = renderList;

builder = initBuilder({
  onPreview: question => renderPreview(question, $("#preview-stage"), $(".device-switch .selected")?.dataset.device || "mobile"),
  onChanged: save,
  onToast: showToast
});
$("#validate-btn").onclick = () => {
  const box = $("#validation-results");
  const all = builder.saveCurrent();
  const problems = all.map((question, index) => ({ index, errors: validateQuestion(question) })).filter(item => item.errors.length);
  box.hidden = false;
  box.innerHTML = problems.length
    ? '<b class="bad">' + problems.length + ' question(s) need attention</b>' + problems.map(item => '<p>Question ' + (item.index + 1) + ': ' + item.errors.map(escapeHtml).join(" ") + '</p>').join("")
    : '<b class="ok">All ' + all.length + ' saved questions passed the basic checks.</b><p>Human review is still recommended for translation accuracy and answer correctness.</p>';
};
$("#save-drafts-btn").onclick = async () => {
  const all = builder.saveCurrent();
  if (!all.length) return showToast("Add at least one question first.");
  await api.saveDrafts(all);
  drafts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  refresh();
  showToast(all.length + " question(s) saved in this browser.");
};
$("#type-filter").innerHTML = '<option value="all">All types</option>' +
  Array.from(new Set(drafts.map(q => q.type))).map(type => '<option value="' + escapeHtml(type) + '">' + escapeHtml(typeLabel(type)) + '</option>').join("");

try {
  const session = await requireAdmin();
  $("#admin-email-label").textContent = session.email + " · Demo";
  published = await api.getPublished();
  refresh();
} catch (error) {
  // requireAdmin redirects to the login screen.
}
