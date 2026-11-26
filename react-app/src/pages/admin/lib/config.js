export const API_BASE = (window.STUDYORBIT_ADMIN_API || "https://studyorbit247-api.studyorbit247.workers.dev/api").replace(/\/$/, "");
export const STORAGE_KEY = "studyorbit247.admin.questionDrafts.v1";
export const QUESTION_TYPES = [
 ["single_mcq","Single correct MCQ"],["multiple_mcq","Multiple correct MCQ"],["passage","Passage / comprehension"],["assertion_reason","Assertion and reason"],["match","Match the following"],["true_false","True / false"],["fill_blank","Fill in the blanks"],["numerical","Numerical answer"],["image","Image / diagram based"],["data_interpretation","Data interpretation"],["sequence","Sequence / arrangement"],["statement_set","Statement based"],["caselet","Caselet based"],["coding_decoding","Coding and decoding"],["other","Other / custom"]
];
