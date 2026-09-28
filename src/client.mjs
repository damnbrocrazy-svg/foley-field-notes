import {createClient} from '@sanity/client';
import {recipes as sampleRecipes,scenes as sampleScenes} from './lib/pack.mjs';
import {renderRecipe,renderScene,encodeWav,SAMPLE_RATE,validateRecipe} from './lib/audio.mjs';
import {isApproved} from './lib/workflow.mjs';

const $=id=>document.getElementById(id);
const client=createClient({projectId:'vkj2ioma',dataset:'production',apiVersion:'2026-09-01',useCdn:true,perspective:'published',timeout:8000});
const query='*[_type in ["soundRecipe","soundScene"]] | order(order asc)';
let recipes=[],scenes=[],cues=[],context,source,masterGain,playGeneration=0,loadGeneration=0;
const status=message=>{$('play-status').textContent=message;};
const el=(tag,attrs={},text)=>{const node=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));if(text!==undefined)node.textContent=text;return node;};
const map=()=>new Map(recipes.map(r=>[r._id,r]));
function wave(canvas,samples,color='#527553'){
 const width=Math.max(100,Math.round(canvas.getBoundingClientRect().width));canvas.width=width*2;canvas.height=76*2;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.clearRect(0,0,width,76);ctx.strokeStyle=color;ctx.lineWidth=1.3;
 ctx.beginPath();for(let x=0;x<width;x+=3){let peak=0;const start=Math.floor(x/width*samples.length),end=Math.floor((x+3)/width*samples.length);for(let i=start;i<end&&i<samples.length;i++)peak=Math.max(peak,Math.abs(samples[i]));const h=Math.max(1,peak*50);ctx.moveTo(x,38-h);ctx.lineTo(x,38+h);}ctx.stroke();
}
function stop(){playGeneration++;if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}if(masterGain){masterGain.disconnect();masterGain=null;}status('Playback stopped.');}
async function play(samples,title){
 stop();const generation=playGeneration;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('This browser cannot play audio. You can still download a WAV.');context ||= new Audio();await context.resume();if(generation!==playGeneration)return;
 const buffer=context.createBuffer(1,samples.length,SAMPLE_RATE);buffer.copyToChannel(samples,0);
 const gain=context.createGain();masterGain=gain;gain.gain.value=Number($('volume').value);source=context.createBufferSource();source.buffer=buffer;source.connect(gain);gain.connect(context.destination);source.onended=()=>{gain.disconnect();masterGain=null;source=null;status(`Finished: ${title}`);};source.start();wave($('waveform'),samples);status(`Playing: ${title}`);
 }catch(e){status(e.message);}
}
function drawRecipes(){
 $('recipes').replaceChildren();recipes.forEach((r,index)=>{
  const card=el('article',{class:'recipe'}),top=el('div',{class:'recipe-top'});top.append(el('span',{},String(index+1).padStart(2,'0')),el('span',{},`${r.duration.toFixed(1)} SEC`));card.append(top,el('p',{class:'material'},r.material),el('h3',{},r.title),el('p',{class:'desc'},r.description));
  const canvas=el('canvas',{class:'mini-wave','aria-hidden':'true'});card.append(canvas);const actions=el('div',{class:'recipe-actions'}),audition=el('button',{class:'audition','aria-label':`Play ${r.title}`},'▶ Listen'),add=el('button',{class:'add','aria-label':`Add ${r.title} to scene`},'+ Add to scene');
  audition.addEventListener('click',()=>play(renderRecipe(r),r.title));add.addEventListener('click',()=>{
   if(cues.length>=16){status('The scene already has 16 cues. Remove one before adding another.');return;}
   const end=cues.reduce((end,c)=>Math.max(end,c.at+(map().get(c.recipeId)?.duration||0)),0);
   const at=Math.min(Math.round(end*10)/10,Math.floor((30-r.duration)*10)/10);
   cues.push({id:crypto.randomUUID(),recipeId:r._id,at,level:.8});$('scene-select').value='';$('scene-description').textContent='Your arrangement — adjust when each sound enters.';drawCues();status(`Added ${r.title}.`);
  });actions.append(audition,add);card.append(actions);$('recipes').append(card);wave(canvas,renderRecipe(r));
 });
}
function drawCues(){
 $('cue-list').replaceChildren();$('cue-count').textContent=`${cues.length} / 16`;$('empty-scene').hidden=!!cues.length;for(const id of ['play-scene','export','clear'])$(id).disabled=!cues.length;
 cues.forEach((cue,index)=>{
  const recipe=map().get(cue.recipeId),li=el('li',{class:'cue'}),top=el('div',{class:'cue-top'});top.append(el('strong',{},`${String(index+1).padStart(2,'0')} · ${recipe.title}`));const remove=el('button',{class:'remove','aria-label':`Remove cue ${index+1}: ${recipe.title}`},'×');remove.onclick=()=>{stop();cues=cues.filter(c=>c.id!==cue.id);drawCues();};top.append(remove);
  const controls=el('div',{class:'cue-controls'}),atLabel=el('label',{},'Enter at'),at=el('input',{type:'number',min:'0',max:String(Math.floor((30-recipe.duration)*10)/10),step:'.1',value:String(cue.at),'aria-label':`Cue ${index+1} start seconds`});
  at.onchange=()=>{const value=Number(at.value);if(at.value===''||!Number.isFinite(value)||value<0||value+recipe.duration>30){at.value=String(cue.at);status('That cue would fall outside the 30-second scene.');return;}cue.at=value;stop();};atLabel.append(at,el('span',{},'s'));
  const levelLabel=el('label',{},'Level'),level=el('input',{type:'range',min:'0',max:'1',step:'.05',value:String(cue.level),'aria-label':`Cue ${index+1} level`});level.oninput=()=>{cue.level=Number(level.value);};levelLabel.append(level);controls.append(atLabel,levelLabel);li.append(top,controls);$('cue-list').append(li);
 });
}
function drawScenes(){
 const selected=$('scene-select').value;$('scene-select').replaceChildren(el('option',{value:''},'Your own scene'));
 scenes.forEach(s=>$('scene-select').append(el('option',{value:s._id},s.title)));$('scene-select').value=selected;
}
function applyDocuments(documents,origin){
 const valid=[];for(const doc of documents){if(doc._type==='soundRecipe'&&isApproved(doc)){try{validateRecipe(doc);valid.push(doc);}catch{}}}
 if(!valid.length)throw Error('The live collection has no approved recipes yet.');
 recipes=valid;const ids=new Set(recipes.map(r=>r._id));scenes=documents.filter(d=>d._type==='soundScene'&&Array.isArray(d.cues)&&d.cues.length&&d.cues.length<=16&&d.cues.every(c=>ids.has(c.recipe?._ref)));
 const old=cues.length;cues=cues.filter(c=>ids.has(c.recipeId)&&c.at+map().get(c.recipeId).duration<=30);
 drawRecipes();drawScenes();drawCues();$('source-status').textContent=origin;
 if(old!==cues.length)status('The collection changed. Unavailable cues were removed from this scene.');
}
async function refresh(){
 const generation=++loadGeneration;$('refresh').disabled=true;
 try{const docs=await client.fetch(query);if(generation!==loadGeneration)return;applyDocuments(docs,`Live collection · ${docs.filter(d=>d._type==='soundRecipe'&&isApproved(d)).length} approved recipes`);}
 catch(e){if(generation!==loadGeneration)return;if(!recipes.length)applyDocuments([...sampleRecipes,...sampleScenes],'Offline demonstration · bundled sample pack');else $('source-status').textContent='Refresh unavailable · keeping your current collection';}
 finally{if(generation===loadGeneration)$('refresh').disabled=false;}
}
$('scene-select').onchange=()=>{stop();const scene=scenes.find(s=>s._id===$('scene-select').value);if(!scene)return;cues=scene.cues.map(c=>({id:crypto.randomUUID(),recipeId:c.recipe._ref,at:c.at,level:c.level}));$('scene-description').textContent=scene.description;drawCues();};
$('play-scene').onclick=()=>{try{play(renderScene(cues,map()),'your scene');}catch(e){status(e.message);}};
$('stop').onclick=stop;$('clear').onclick=()=>{stop();cues=[];$('scene-select').value='';$('scene-description').textContent='Add a recipe from the collection. Set when each sound enters.';drawCues();};
$('volume').oninput=()=>{const value=Number($('volume').value);$('volume-value').textContent=`${Math.round(value/.6*100)}%`;if(masterGain&&context)masterGain.gain.setTargetAtTime(value,context.currentTime,.02);};
$('export').onclick=()=>{try{const audio=renderScene(cues,map()),url=URL.createObjectURL(new Blob([encodeWav(audio)],{type:'audio/wav'})),a=el('a',{href:url,download:'foley-field-notes.wav'});a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);status(`Exported ${(audio.length/SAMPLE_RATE).toFixed(1)} seconds as WAV.`);wave($('waveform'),audio);}catch(e){status(e.message);}};
$('refresh').onclick=refresh;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){stop();return;}if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable)return;const index=Number(e.key)-1;if(index>=0&&index<6&&recipes[index])play(renderRecipe(recipes[index]),recipes[index].title);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
refresh();
