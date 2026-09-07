import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
function load(name, imports={}) {
  const text=fs.readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8');
  const output=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function('require','module','exports',output)((id)=>{if(id in imports)return imports[id];throw Error(`Unexpected dependency ${id}`)},module,module.exports);return module.exports;
}
const view=load('learning-view'),safety=load('request-safety');
const row=(id,score,attempts,reliability,name=id)=>({skill_id:id,score,attempts,reliability,skills:{slug:id,name,description:'Thinking with evidence'}});
test('New skill priors never appear as measured scores',()=>{
  assert.equal(view.evidenceLabel(row('a',50,0,.5)),'Not measured yet');
  assert.equal(view.evidenceLabel(row('a',0,4,.1)),'Early evidence');
  assert.equal(view.evidenceLabel(row('a',40,10,.8)),'More evidence');
});
test('Skill filtering is case-insensitive, non-mutating and measured-first',()=>{
  const rows=[row('new',0,0,0,'AI verification'),row('b',70,3,.3,'Reasoning'),row('a',25,3,.4,'Evidence')];const original=JSON.stringify(rows);
  assert.deepEqual(view.selectSkills(rows).map(x=>x.skill_id),['a','b','new']);
  assert.equal(view.selectSkills(rows,' AI ').length,1);assert.equal(view.selectSkills(rows,'','new').length,1);
  assert.equal(view.selectSkills(rows,'','practised').length,2);assert.equal(view.selectSkills(rows,'unmatched').length,0);assert.equal(JSON.stringify(rows),original);
});
test('Scores are clamped and invalid values cannot create malformed chart widths',()=>{assert.equal(view.boundedScore(NaN),0);assert.equal(view.boundedScore(Infinity),0);assert.equal(view.boundedScore(-1),0);assert.equal(view.boundedScore(125),100);});
test('Starting check progress counts only distinct questions in this session',()=>{
  const p=view.trainingPresentation({state:'diagnostic',challenges:[{id:'1'},{id:'2'}],answeredChallengeIds:['1','1','old']});assert.equal(p.progress,50);assert(p.detail.startsWith('1 of 2'));
});
test('Missing questions do not invent a question count or progress percentage',()=>{const p=view.trainingPresentation({state:'diagnostic'});assert.equal(p.progress,null);assert(!p.detail.includes('12'));});
test('Lesson, practice, completion and failure have different truthful next-state presentation',()=>{for(const state of ['lesson','training','complete','unavailable'])assert(view.trainingPresentation({state}).title);assert.equal(view.trainingPresentation({state:'complete'}).progress,100);assert.equal(view.trainingPresentation({state:'lesson'}).progress,null);});
const point=(date,score)=>({date,score,skillId:'a',skillName:'Evidence',reliability:.4,attempts:3,skillSlug:'evidence'});
test('History sorts unsorted dates and computes the actual first-to-last change',()=>{const data=[point('2026-09-03',65),point('2026-09-01',50),point('2026-09-02',60)];const out=view.historyTrends(data)[0];assert.equal(out.delta,15);assert.equal(out.observations,3);assert.equal(data[0].date,'2026-09-03');});
test('One observed day cannot be described as a trend; duplicate days do not add evidence',()=>{assert.equal(view.historyTrends([point('2026-09-01',0)]).length,0);assert.equal(view.historyTrends([point('2026-09-01',50),point('2026-09-01',60)]).length,0);assert.equal(view.historyTrends([point('invalid',50),point('2026-09-01',60)]).length,0);});
test('Legacy response cache is purged without reading private content',()=>{const removed=[];safety.removeLegacyResponseCache({removeItem:key=>removed.push(key),getItem:()=>assert.fail('Must not read legacy data')});assert.deepEqual(removed,['cogni:api-cache:/api/mobile/profile','cogni:api-cache:/api/mobile/today']);assert.doesNotThrow(()=>safety.removeLegacyResponseCache({removeItem(){throw Error('denied')}}));});
test('Account and request epochs reject old or signed-out ownership',()=>{assert.equal(safety.sameAccount('a','b'),false);assert.equal(safety.sameAccount('a',null),false);assert.equal(safety.sameAccount('a','a'),true);const e=safety.createRequestEpoch(),first=e.next(),second=e.next();assert(!e.isCurrent(first));assert(e.isCurrent(second));e.invalidate();assert(!e.isCurrent(second));});
test('Cancelled requests raise AbortError before using a cached response',()=>{const c=new AbortController();c.abort();assert.throws(()=>safety.throwIfCancelled(c.signal),{name:'AbortError'});});
function apiFixture(fetchImpl) {
  let user='a';let calls=0;
  const supabase={auth:{getSession:async()=>({data:{session:user ? {user:{id:user},access_token:`token-${user}`} : null}}),refreshSession:async()=>({data:{session:null}})}};
  const imports={'./request-safety':safety,'@/lib/copy':load('copy'),'@/lib/supabase':{supabase,SUPABASE_URL:'https://example.test',SUPABASE_PUBLISHABLE_KEY:'public-test'}};
  const source=fs.readFileSync(new URL('../lib/api.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports','fetch',code)(id=>imports[id],module,module.exports,async(...args)=>{calls++;return fetchImpl(...args)});
  return {...module.exports,setUser:id=>{user=id},calls:()=>calls};
}
test('Actual API rejects a response arriving after an account switch',async()=>{let f;f=apiFixture(async()=>{f.setUser('b');return new Response(JSON.stringify({privateName:'account a'}),{status:200})});await assert.rejects(f.apiFetch('/api/mobile/profile'),error=>error.code==='account_changed');assert.equal(f.calls(),1);});
test('Actual API retries reads once but never falls back to personal disk data',async()=>{const f=apiFixture(async()=>{throw Error('offline')});await assert.rejects(f.apiFetch('/api/mobile/profile'),error=>error.code==='connection_interrupted');assert.equal(f.calls(),2);});
test('Actual API never blindly retries an answer write after network failure',async()=>{const f=apiFixture(async()=>{throw Error('offline')});await assert.rejects(f.apiFetch('/api/mobile/answer',{method:'POST',body:'{}'}));assert.equal(f.calls(),1);});
test('Actual API propagates cancellation without a second request',async()=>{const c=new AbortController();const f=apiFixture(async(_url,options)=>{c.abort();assert(options.signal.aborted);throw Object.assign(Error('aborted'),{name:'AbortError'})});await assert.rejects(f.apiFetch('/api/mobile/today',{signal:c.signal}),{name:'AbortError'});assert.equal(f.calls(),1);});
test('Actual API returns a cleaned response after a single transient server failure',async()=>{let n=0;const f=apiFixture(async()=>new Response(JSON.stringify(++n===1 ? {error:'temporary'} : {title:'Line\\nnext'}),{status:n===1 ? 503 : 200}));assert.equal((await f.apiFetch('/api/mobile/today')).title,'Line\nnext');assert.equal(f.calls(),2);});
test('Support uses the real app version rather than a stale literal',()=>{const source=fs.readFileSync(new URL('../app/support.tsx',import.meta.url),'utf8');assert(source.includes('appVersion: appConfig.expo.version'));assert(!source.includes('appVersion: "0.4.0"'));});
