export const STORAGE_KEY = 'steady.habits.v1';
export const COLORS = Object.freeze({sage: 'Sage', lavender: 'Lavender', peach: 'Peach', blue: 'Sky', rose: 'Rose', sand: 'Sand'});
export const LIMITS = Object.freeze({habits: 100, todos: 100, fileBytes: 8 * 1024 * 1024});
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseDay(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function addDays(key, amount) {
  const date = parseDay(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}
export function isDay(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && key >= '2000-01-01' && key <= '9999-12-31' && dateKey(parseDay(key)) === key;
}
export function goalDate(habit) { return addDays(habit.createdOn, habit.goalDays - 1); }
export function currentStreak(habit, today = dateKey()) {
  let cursor = Object.hasOwn(habit.entries, today) ? today : addDays(today, -1);
  let streak = 0;
  while (Object.hasOwn(habit.entries, cursor)) { streak++; cursor = addDays(cursor, -1); }
  return streak;
}
export function bestStreak(habit) {
  let best = 0, run = 0, previous = '';
  for (const date of Object.keys(habit.entries).sort()) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run); previous = date;
  }
  return best;
}
export function monthKeys(habit, today = dateKey()) {
  const cursor = parseDay(habit.createdOn); cursor.setDate(1);
  const end = today.slice(0, 7), result = [];
  while (dateKey(cursor).slice(0, 7) <= end) {
    result.push(dateKey(cursor).slice(0, 7)); cursor.setMonth(cursor.getMonth() + 1);
  }
  return result;
}
export function freshData() { return {version: 1, nickname: 'Habit keeper', habits: []}; }
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{1,60}$/.test(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
export function validateData(input, today = dateKey()) {
  const fail = message => { throw new Error(message); };
  if (!record(input) || input.version !== 1) fail('This is not a supported Steady backup (version 1).');
  if (!cleanText(input.nickname, 32)) fail('The nickname must contain 1–32 characters.');
  if (!Array.isArray(input.habits) || input.habits.length > LIMITS.habits) fail('A backup can contain up to 100 habits.');
  const ids = new Set();
  const habits = input.habits.map(h => {
    if (!record(h) || !validId(h.id) || ids.has(h.id)) fail('A habit has an invalid or duplicate ID.');
    ids.add(h.id);
    if (!cleanText(h.name, 80) || !['p1','p2','p3'].includes(h.priority) || !Object.hasOwn(COLORS, h.color)) fail('A habit has an invalid name, priority, or color.');
    if (!Number.isInteger(h.goalDays) || h.goalDays < 1 || h.goalDays > 3650) fail('Goal length must be between 1 and 3,650 days.');
    if (!isDay(h.createdOn) || h.createdOn > today) fail('A habit has an invalid creation date.');
    if (!Array.isArray(h.todos) || h.todos.length > LIMITS.todos) fail('A habit can have up to 100 to-do items.');
    const todoIds = new Set();
    const todos = h.todos.map(t => {
      if (!record(t) || !validId(t.id) || todoIds.has(t.id) || !cleanText(t.text, 120)) fail('A to-do item is invalid.');
      todoIds.add(t.id); return {id: t.id, text: t.text.trim()};
    });
    if (!record(h.entries) || Object.keys(h.entries).length > 36600) fail('A habit has an invalid history.');
    const entries = {};
    for (const [date, entry] of Object.entries(h.entries)) {
      if (!isDay(date) || date < h.createdOn || date > today || !record(entry) || !Array.isArray(entry.items) || entry.items.length > LIMITS.todos) fail('A check-in has an invalid date or item list.');
      const itemIds = new Set();
      entries[date] = {items: entry.items.map(item => {
        if (!record(item) || !validId(item.id) || itemIds.has(item.id) || !cleanText(item.text, 120)) fail('A completed to-do item is invalid.');
        itemIds.add(item.id); return {id: item.id, text: item.text.trim()};
      })};
    }
    return {id: h.id, name: h.name.trim(), priority: h.priority, color: h.color, goalDays: h.goalDays, createdOn: h.createdOn, todos, entries};
  });
  return {version: 1, nickname: input.nickname.trim(), habits};
}
