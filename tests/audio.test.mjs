import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRecipe,renderScene,encodeWav,SAMPLE_RATE} from '../src/lib/audio.mjs';
import {recipes,scenes} from '../src/lib/pack.mjs';
import {isApproved,transition} from '../src/lib/workflow.mjs';
const map=new Map(recipes.map(r=>[r._id,r]));
for(const recipe of recipes)test(`${recipe.title}: deterministic, non-silent, bounded and faded`,()=>{
 const audio=renderRecipe(recipe),again=renderRecipe(recipe);
 assert.deepEqual(audio,again);
 assert.equal(audio.length,Math.ceil(recipe.duration*SAMPLE_RATE));
 let energy=0,peak=0;for(const s of audio){assert.ok(Number.isFinite(s));energy+=s*s;peak=Math.max(peak,Math.abs(s));}
 assert.ok(energy/audio.length>0.000001);assert.ok(peak<=1);assert.equal(audio[0],0);assert.ok(Math.abs(audio.at(-1))<.003);
});
test('scene schedules silence and correct duration',()=>{
 const r=recipes[2],a=renderRecipe(r),audio=renderScene([{recipeId:r._id,at:.5,level:.5}],map);
 assert.equal(audio.length,12000+a.length);assert.ok(audio.slice(0,12000).every(v=>v===0));
 assert.ok(Math.abs(audio[12000+200]-a[200]*.5)<1e-7);
});
test('overlapping cues are normalized below full scale',()=>{
 const out=renderScene(Array.from({length:16},()=>({recipeId:recipes[1]._id,at:0,level:1})),map);
 assert.ok(Math.max(...out.map(Math.abs))<=.850001);
});
test('all scene references resolve and export valid mono PCM headers',()=>{
 for(const scene of scenes){const audio=renderScene(scene.cues.map(c=>({recipeId:c.recipe._ref,at:c.at,level:c.level})),map);const buf=encodeWav(audio),v=new DataView(buf);
 assert.equal(new TextDecoder().decode(buf.slice(0,4)),'RIFF');assert.equal(v.getUint32(4,true),buf.byteLength-8);assert.equal(v.getUint32(24,true),SAMPLE_RATE);assert.equal(v.getUint32(40,true),audio.length*2);assert.equal(v.getUint16(22,true),1);}
});
test('invalid content and runaway scenes fail explicitly',()=>{
 for(const duration of [NaN,Infinity,0,11])assert.throws(()=>renderRecipe({...recipes[0],duration}));
 assert.throws(()=>renderScene([{recipeId:'absent',at:0,level:1}],map));
 assert.throws(()=>renderScene([{recipeId:recipes[0]._id,at:29,level:1}],map));
 assert.throws(()=>renderScene([{recipeId:recipes[0]._id,at:-1,level:1}],map));
 assert.throws(()=>encodeWav(new Float32Array([NaN])));
});
test('approval invalidates on content edit and transitions require review',()=>{
 assert.ok(isApproved(recipes[0]));assert.equal(isApproved({...recipes[0],duration:2}),false);
 assert.equal(isApproved({...recipes[0],title:'Edited'}),false);
 const draft=transition(recipes[0],'draft','editor','2026-09-28T10:00:00Z');
 assert.throws(()=>transition(draft,'approved','editor','2026-09-28T10:00:00Z'));
 const review=transition(draft,'review','editor','2026-09-28T10:00:00Z');
 const approved=transition(review,'approved','editor','2026-09-28T10:00:00Z');assert.ok(isApproved(approved));
});
