import {signature} from './workflow.mjs';
const layer=(kind,frequency,gain,decay,attack=0.004,pulses=1)=>({_type:'soundLayer',_key:`${kind}-${frequency}`,kind,frequency,gain,decay,attack,pulses});
const raw=[
 ['paper-rain','Paper rain','Tracing paper','Crumple, then release','A soft, scattered texture for imaginary rain against a window.',3.2,[layer('noise',4800,.7,.2,.01,16),layer('noise',430,.5,.6,.09,4)]],
 ['cup-bell','Cup bell','Enamel cup','Tap the rim','A bright, imperfect bell built from two inharmonic tones.',2.1,[layer('tone',740,.6,.5),layer('tone',1130,.3,.25)]],
 ['drawer-thud','Drawer thud','Wooden drawer','Close gently','A low transient with a short rattle. No actual drawer was recorded.',.8,[layer('tone',94,.8,.075),layer('noise',900,.6,.07,.002,1)]],
 ['pocket-train','Pocket train','Tin box + rice','Rock side to side','An uneven-sounding miniature railway, built from regular pulses and filtered noise.',4,[layer('noise',2600,.6,.08,.003,12),layer('tone',65,.25,.1,.006,12)]],
 ['key-comet','Key comet','A ring of keys','Let it swing','A little constellation of metallic overtones, without sampled audio.',2.8,[layer('tone',1420,.6,.16,.002,7),layer('tone',2070,.3,.12,.003,5)]],
 ['cardboard-wind','Cardboard wind','Corrugated card','Brush the ribs','A grainy, breath-like wash for cardboard landscapes.',4.5,[layer('noise',700,.8,.9,.3,3),layer('noise',2400,.4,.15,.09,9)]],
];
export const recipes=raw.map(([id,title,material,gesture,description,duration,layers],index)=>{
 const doc={_id:`recipe-${id}`,_type:'soundRecipe',title,material,gesture,description,duration,layers,order:index+1,reviewStatus:'approved',reviewedBy:'Demonstration seed (automated)',reviewedAt:'2026-09-28T09:00:00Z'};
 return {...doc,approvedSignature:signature(doc)};
});
const cue=(recipe,at,level=.8)=>({_key:`${recipe}-${at}`,_type:'sceneCue',recipe:{_type:'reference',_ref:`recipe-${recipe}`},at,level});
export const scenes=[
 {_id:'scene-last-train',_type:'soundScene',title:'The last train is a tin box',description:'A train crosses a paper storm. A cup marks the arrival.',order:1,cues:[cue('paper-rain',0,.7),cue('pocket-train',1,.85),cue('cup-bell',4.8,.8),cue('drawer-thud',6,.7)]},
 {_id:'scene-cardboard-orbit',_type:'soundScene',title:'Orbit of a cardboard moon',description:'An imaginary moon rises through corrugated wind and a falling key ring.',order:2,cues:[cue('cardboard-wind',0,.8),cue('key-comet',1.4,.7),cue('cup-bell',4,.5)]},
];
export const seedDocuments=[...recipes,...scenes];
