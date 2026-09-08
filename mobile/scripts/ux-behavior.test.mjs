import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const cache = new Map();
function load(relative) {
  const filename = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', relative);
  if (cache.has(filename)) return cache.get(filename);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} }; cache.set(filename, module.exports);
  const localRequire = (name) => name === 'react-native' ? { Platform: { OS: 'android' } } : name.startsWith('.') ? load(path.relative(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), path.resolve(path.dirname(filename), name + '.ts'))) : require(name);
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports);
  return module.exports;
}
const { TONES, SAMPLE_RATE, writeWav } = load('lib/feedback-sounds.ts');
const { createFeedbackAudio, createPreferenceWriter, isSoundCue } = load('lib/feedback-runtime.ts');
const { getTrainingAction } = load('lib/training-action.ts');
const { cleanDisplayCopy, cleanDisplayPayload } = load('lib/copy.ts');
const { gradients } = load('lib/theme.ts');
const deferred = () => { let resolve; let reject; const promise = new Promise((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = () => new Promise((resolve) => setImmediate(resolve));
function fixture(overrides = {}) {
  const log = []; const errors = [];
  const players = Object.fromEntries(Object.keys(TONES).map((cue) => [cue, {
    pause() { log.push(`pause:${cue}`); }, play() { log.push(`play:${cue}`); },
    async seekTo(value) { assert.equal(value,0); log.push(`seek:${cue}`); },
    release() { log.push(`release:${cue}`); },
  }]));
  const audio = createFeedbackAudio({ configure: async () => {}, createPlayer: (cue) => players[cue], onError: (error) => errors.push(error), ...overrides });
  return { audio, players, log, errors };
}
for (const [cue, notes] of Object.entries(TONES)) test(`WAV ${cue}: exact buffer, valid PCM, zero endpoints, restrained duration`, () => {
  const wav = writeWav(notes); const view = new DataView(wav.buffer);
  const samples = notes.reduce((n,t) => n + Math.ceil(t.durationMs*SAMPLE_RATE/1000) + Math.ceil((t.gapMs??0)*SAMPLE_RATE/1000),0);
  assert.equal(wav.length,44+samples*2); assert.equal(view.getUint32(4,true),wav.length-8); assert.equal(view.getUint32(40,true),wav.length-44);
  assert.equal(new TextDecoder().decode(wav.slice(0,4)),'RIFF'); assert.equal(new TextDecoder().decode(wav.slice(8,12)),'WAVE');
  assert.equal(view.getUint16(22,true),1); assert.equal(view.getUint32(24,true),SAMPLE_RATE); assert.equal(view.getUint16(34,true),16);
  assert.equal(view.getInt16(44,true),0); assert.equal(view.getInt16(wav.length-2,true),0);
  assert(samples/SAMPLE_RATE < 0.4); let peak=0; for(let i=44;i<wav.length;i+=2) peak=Math.max(peak,Math.abs(view.getInt16(i,true)));
  assert(peak>0 && peak<32767*0.25);
});
test('WAV rejects invalid and oversized input rather than allocating unbounded audio', () => {
  for(const frequency of [-1,NaN,Infinity,SAMPLE_RATE]) assert.throws(()=>writeWav([{frequency,durationMs:30}]));
  assert.throws(()=>writeWav([{frequency:440,durationMs:6000}]));
});
test('Selections have no sound', () => { assert.equal(isSoundCue('selection'),false); assert.equal(isSoundCue('correct'),true); assert(!Object.hasOwn(TONES,'selection')); });
test('Latest outcome wins, never layer simultaneous queued outcomes', async () => {
  const f=fixture(); f.audio.setEnabled(true); await f.audio.prepare();
  await Promise.all([f.audio.play('correct'),f.audio.play('incorrect'),f.audio.play('complete')]);
  assert.deepEqual(f.log.filter(x=>x.startsWith('play:')),['play:complete']); f.audio.dispose();
});
for (const interrupt of ['mute','background','dispose']) test(`${interrupt} during a seek cancels pending playback`, async () => {
  const f=fixture(); const seek=deferred(); f.players.correct.seekTo=()=>seek.promise;
  f.audio.setEnabled(true); await f.audio.prepare(); const playing=f.audio.play('correct'); await flush();
  if(interrupt==='mute') f.audio.setEnabled(false); else if(interrupt==='background') f.audio.setActive(false); else f.audio.dispose();
  seek.resolve(); await playing; assert.equal(f.log.filter(x=>x.startsWith('play:')).length,0); f.audio.dispose();
});
test('Dispose during preparation releases late player and never prepares more', async () => {
  const pending=deferred(); let released=0,created=0;
  const f=fixture({createPlayer:async()=>{created++;await pending.promise;return {pause(){},play(){assert.fail('disposed audio played')},async seekTo(){},release(){released++;}};}});
  f.audio.setEnabled(true); const preparing=f.audio.prepare(); await flush(); f.audio.dispose(); pending.resolve(); await preparing;
  assert.equal(created,1);assert.equal(released,1);f.audio.dispose();assert.equal(released,1);
});
test('Mute while configuring creates no players; re-enable can retry', async () => {
  const configure=deferred(); const f=fixture({configure:()=>configure.promise});
  f.audio.setEnabled(true);const first=f.audio.prepare();f.audio.setEnabled(false);configure.resolve();await first;
  assert.equal(f.log.length,0);f.audio.setEnabled(true);await f.audio.play('review');assert(f.log.includes('play:review'));f.audio.dispose();
});
test('All loaded players are released once even if one native release throws',async()=>{
  const f=fixture();f.players.correct.release=()=>{f.log.push('release:correct');throw new Error('native release')};
  f.audio.setEnabled(true);await f.audio.prepare();f.audio.dispose();f.audio.dispose();
  assert.equal(f.log.filter(x=>x.startsWith('release:')).length,4);assert.equal(f.errors.length,1);
});
test('Preparation failure stays non-blocking and recovers on the next request',async()=>{
  let attempt=0;const f=fixture({configure:async()=>{if(attempt++===0)throw new Error('not available')}});
  f.audio.setEnabled(true);await f.audio.prepare();assert.equal(f.errors.length,1);
  await f.audio.play('correct');assert(f.log.includes('play:correct'));f.audio.dispose();
});
test('Rapid preference changes persist in order and failed writes do not block later choices',async()=>{
  const gate=deferred();const seen=[];const errors=[];
  const write=createPreferenceWriter(async(key,value)=>{seen.push(`${key}:${value}`);if(value==='true')await gate.promise;if(value==='bad')throw new Error('storage');},error=>errors.push(error));
  const a=write('sound','true');const b=write('sound','false');await flush();assert.deepEqual(seen,['sound:true']);gate.resolve();await Promise.all([a,b]);
  await Promise.all([write('sound','bad'),write('sound','false')]);assert.deepEqual(seen,['sound:true','sound:false','sound:bad','sound:false']);assert.equal(errors.length,1);
});
test('Home training action reflects actual progress and opens next activity directly',()=>{
  assert.equal(getTrainingAction({state:'diagnostic',answeredChallengeIds:[]}).label,'Start your check');
  assert.equal(getTrainingAction({state:'diagnostic',answeredChallengeIds:['a']}).label,'Continue starting check');
  assert.equal(getTrainingAction({state:'training',session:{answeredChallengeIds:[]}}).label,'Train now');
  assert.equal(getTrainingAction({state:'training',session:{answeredChallengeIds:['a']}}).label,'Continue training');
  for(const state of ['diagnostic','training']) assert.equal(getTrainingAction({state}).href,'/(tabs)/train/session');
  assert.equal(getTrainingAction({state:'lesson'}).href,'/(tabs)/train/lesson');assert.equal(getTrainingAction({state:'complete'}).href,'/(tabs)/skills');
  assert.equal(getTrainingAction({state:'unavailable'}).href,null);assert.equal(getTrainingAction(null).href,null);
});
test('Display repair fixes nested escaped whitespace without mutating the original',()=>{
  const input={title:' Hello\\nworld ',options:['A\\r\\nB','C\\tD'],nested:{prompt:'More\\n\\n\\ntext'},id:'stable-id'};
  const result=cleanDisplayPayload(input);
  assert.equal(result.title,'Hello\nworld');assert.deepEqual(result.options,['A\nB','C D']);assert.equal(result.nested.prompt,'More\n\ntext');
  assert.equal(input.title,' Hello\\nworld ');assert.equal(result.id,'stable-id');assert.equal(cleanDisplayCopy('hello\r\n world'),'hello\nworld');
});
function luminance(rgb){ return rgb.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0); }
test('Primary action white text meets 4.5:1 across every gradient segment',()=>{
  const rgb=gradients.primary.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
  for(let segment=0;segment<rgb.length-1;segment++)for(let t=0;t<=1;t+=.025){const pixel=rgb[segment].map((v,i)=>v*(1-t)+rgb[segment+1][i]*t);assert(1.05/(luminance(pixel)+.05)>=4.5);}
});

 test('Display repair never rewrites identifiers, URLs, keys or submitted user input',()=>{
 const input={id:'a\\nb',url:'https://example.test/\\test',token:' token\\n',correctAnswer:'a\\n',full_name:'  User  ',responsePayload:'x\\n',options:['A\\nB'],nested:{prompt:'C\\nD'}};
 const result=cleanDisplayPayload(input);
 for(const key of ['id','url','token','correctAnswer','full_name','responsePayload'])assert.equal(result[key],input[key]);
 assert.equal(result.options[0],'A\nB');assert.equal(result.nested.prompt,'C\nD');
});
test('Inline and fenced code retains meaningful literal escapes',()=>{
 const inline='Use `"hello\\nworld"` in code.';const fenced='```js\nconsole.log("a\\nb")\n```';
 assert.equal(cleanDisplayCopy(inline),inline);assert.equal(cleanDisplayCopy(fenced),fenced);
});
