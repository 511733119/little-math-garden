import { needsRegroup, type Level, type Mode, type Question, type QuestionRecord } from './math';
export type Session = { id: string; level: Level; mode: Mode; questions: Question[]; records: QuestionRecord[]; index: number; attempts: number[]; hintUsed: boolean; resolved: boolean; input: string };
export type Saved = { version: 1; session: Session | null; flowers: number; history: { id: string; date: string; correct: number; total: number }[] };
export const empty = (): Saved => ({ version: 1, session: null, flowers: 0, history: [] });
const key = 'little-math-garden-v1';
const int = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 100;
const attempt = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 999;
function question(v: Question): boolean { return !!v && typeof v.id === 'string' && int(v.a) && int(v.b) && (v.op === '+' || v.op === '-') && int(v.answer) && v.answer === (v.op === '+' ? v.a + v.b : v.a - v.b) && Array.isArray(v.choices) && v.choices.length === 4 && v.choices.every(int) && new Set(v.choices).size === 4 && v.choices.includes(v.answer); }
export function validSaved(v: Saved): boolean {
 if (!v || v.version !== 1 || !Number.isInteger(v.flowers) || v.flowers < 0 || !Array.isArray(v.history) || v.history.length > 50 || !v.history.every(h => h && typeof h.id === 'string' && typeof h.date === 'string' && int(h.correct) && int(h.total) && h.correct <= h.total)) return false;
 const s = v.session; if (s === null) return true;
 if (!s || typeof s.id !== 'string' || !['sprout','bloom','garden','star'].includes(s.level) || !['keypad','choice'].includes(s.mode) || !Array.isArray(s.questions) || s.questions.length < 1 || s.questions.length > 20 || !s.questions.every(question) || !Number.isInteger(s.index) || s.index < 0 || s.index > s.questions.length || !Array.isArray(s.records) || s.records.length !== s.index || !Array.isArray(s.attempts) || s.attempts.length > 2 || !s.attempts.every(attempt) || typeof s.hintUsed !== 'boolean' || typeof s.resolved !== 'boolean' || typeof s.input !== 'string' || !/^\d{0,3}$/.test(s.input)) return false;
 return s.records.every((r,i) => r && question(r.question) && r.question.id === s.questions[i].id && Array.isArray(r.attempts) && r.attempts.length > 0 && r.attempts.length <= 2 && r.attempts.every(attempt) && typeof r.hintUsed === 'boolean') && s.questions.every(q => q.answer <= (s.level === 'sprout' || s.level === 'bloom' ? 20 : 100) && needsRegroup(q.a,q.b,q.op) === (s.level === 'bloom' || s.level === 'star'));
}
export function load(): Saved { try { const text = localStorage.getItem(key); if (!text) return empty(); const v = JSON.parse(text); return validSaved(v) ? v : empty(); } catch { return empty(); } }
export function save(value: Saved): boolean { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
