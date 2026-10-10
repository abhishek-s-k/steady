import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey, parseDay, addDays, isDay, goalDate, currentStreak, bestStreak, monthKeys, freshData, validateData} from '../dist/core.mjs';

const habit = (entries = {}) => ({id:'habit-1',name:'Read',priority:'p2',color:'sage',goalDays:3,createdOn:'2026-10-10',todos:[{id:'task-1',text:'One chapter'}],entries});
const checked = (keys) => Object.fromEntries(keys.map(key=>[key,{items:[]}]));
const backup = h => ({...freshData(),habits:[h]});

test('local calendar dates round trip; reject normalized impossible dates',()=>{
  assert.equal(dateKey(parseDay('2026-10-10')),'2026-10-10');
  assert.equal(isDay('2026-02-29'),false);assert.equal(isDay('2024-02-29'),true);
  assert.equal(isDay('2026-13-01'),false);assert.equal(isDay('2026-10-00'),false);
  assert.equal(isDay('__proto__'),false);
});
test('date arithmetic crosses months, years, leap days, and DST calendar days',()=>{
  assert.equal(addDays('2024-02-28',1),'2024-02-29');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.equal(addDays('2026-03-08',1),'2026-03-09');
  assert.equal(addDays('2026-11-01',-1),'2026-10-31');
});
test('goal uses inclusive day one and can be outside the displayed month',()=>{
  assert.equal(goalDate(habit()),'2026-10-12');
  assert.equal(goalDate({...habit(),goalDays:1}),'2026-10-10');
  assert.equal(goalDate({...habit(),createdOn:'2026-10-31'}),'2026-11-02');
});
test('current streak allows unfinished today but resets after a missed full day',()=>{
  const h = habit(checked(['2026-10-10','2026-10-11','2026-10-12']));
  assert.equal(currentStreak(h,'2026-10-12'),3);
  assert.equal(currentStreak(h,'2026-10-13'),3);
  assert.equal(currentStreak(h,'2026-10-14'),0);
  assert.equal(currentStreak(habit(),'2026-10-10'),0);
});
test('best streak handles gaps and month boundaries',()=>{
  const h = habit(checked(['2026-10-10','2026-10-12','2026-10-30','2026-10-31','2026-11-01']));
  assert.equal(bestStreak(h),3);assert.equal(bestStreak(habit()),0);
});
test('history includes creation month through current month, including year rollover',()=>{
  assert.deepEqual(monthKeys({...habit(),createdOn:'2025-12-30'},'2026-02-10'),['2025-12','2026-01','2026-02']);
});
test('valid backup retains historical wording independent of current to-do list',()=>{
  const h = habit({'2026-10-10':{items:[{id:'task-deleted',text:'Original wording'}]}});
  const restored = validateData(backup(h),'2026-10-10');
  assert.equal(restored.habits[0].entries['2026-10-10'].items[0].text,'Original wording');
});
test('schema copies only known fields and treats HTML-looking content as text',()=>{
  const h = {...habit(),name:'<img src=x onerror=alert(1)>',unexpected:'discard'};
  const restored = validateData({...backup(h),email:'discard'},'2026-10-10');
  assert.equal(restored.habits[0].name,h.name);assert.equal('unexpected' in restored.habits[0],false);assert.equal('email' in restored,false);
  assert.notEqual(restored.habits[0],h);
});
test('invalid imports reject versions, duplicate IDs, future records, and malformed fields',()=>{
  assert.throws(()=>validateData({version:2}));
  assert.throws(()=>validateData({...backup(habit()),habits:[habit(),habit()]},'2026-10-10'));
  assert.throws(()=>validateData(backup({...habit(),color:'url(evil)'}),'2026-10-10'));
  assert.throws(()=>validateData(backup({...habit(),goalDays:1.5}),'2026-10-10'));
  assert.throws(()=>validateData(backup({...habit(),createdOn:'2026-10-11'}),'2026-10-10'));
  assert.throws(()=>validateData(backup(habit({'2026-10-09':{items:[]}})),'2026-10-10'));
  assert.throws(()=>validateData(backup(habit({'2026-10-11':{items:[]}})),'2026-10-10'));
  assert.throws(()=>validateData(backup({...habit(),name:'a'.repeat(81)}),'2026-10-10'));
  assert.throws(()=>validateData(backup({...habit(),name:'a\u0000b'}),'2026-10-10'));
  assert.throws(()=>validateData(backup({...habit(),todos:[{id:'task-1',text:'a'},{id:'task-1',text:'b'}]}),'2026-10-10'));
});
test('prototype properties in a parsed backup are never copied',()=>{
  const raw = JSON.parse(JSON.stringify(backup(habit())).replace('"version":1','"__proto__":{"polluted":true},"version":1'));
  const clean = validateData(raw,'2026-10-10');assert.equal(Object.hasOwn(clean,'__proto__'),false);assert.equal({}.polluted,undefined);
});
