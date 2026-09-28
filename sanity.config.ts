import {defineConfig,defineField,defineType,useClient,useCurrentUser,type DocumentActionComponent} from 'sanity';
import {structureTool} from 'sanity/structure';
import {useState} from 'react';
import {isApproved,transition} from './src/lib/workflow.mjs';
import {validateRecipe} from './src/lib/audio.mjs';

const recipe=defineType({name:'soundRecipe',title:'Sound recipe',type:'document',
 initialValue:{reviewStatus:'draft',duration:2,order:1},
 fields:[
  defineField({name:'title',type:'string',validation:r=>r.required().max(80)}),
  defineField({name:'material',type:'string',validation:r=>r.required()}),
  defineField({name:'gesture',type:'string',validation:r=>r.required()}),
  defineField({name:'description',type:'text',rows:3,validation:r=>r.required().max(400)}),
  defineField({name:'duration',type:'number',description:'Seconds (0.05–10)',validation:r=>r.required().min(.05).max(10)}),
  defineField({name:'layers',type:'array',of:[{type:'soundLayer'}],validation:r=>r.required().min(1).max(8)}),
  defineField({name:'order',type:'number'}),
  defineField({name:'reviewStatus',type:'string',readOnly:true,description:'Use the workflow actions below. Content edits invalidate previous approval.',options:{list:['draft','review','approved']}}),
  defineField({name:'approvedSignature',type:'text',hidden:true}),
  defineField({name:'reviewedBy',type:'string',readOnly:true}),
  defineField({name:'reviewedAt',type:'datetime',readOnly:true}),
 ],preview:{select:{title:'title',subtitle:'reviewStatus'}},
});
const layer=defineType({name:'soundLayer',title:'Synthesis layer',type:'object',fields:[
 defineField({name:'kind',type:'string',options:{list:['tone','noise']},validation:r=>r.required()}),
 defineField({name:'frequency',type:'number',description:'Tone Hz or noise low-pass cutoff',validation:r=>r.required().min(30).max(8000)}),
 defineField({name:'gain',type:'number',validation:r=>r.required().min(0).max(1)}),
 defineField({name:'attack',type:'number',description:'Seconds',validation:r=>r.required().min(.001).max(2)}),
 defineField({name:'decay',type:'number',description:'Seconds',validation:r=>r.required().min(.02).max(10)}),
 defineField({name:'pulses',type:'number',validation:r=>r.required().integer().min(1).max(20)}),
],preview:{select:{title:'kind',frequency:'frequency'},prepare:({title,frequency})=>({title:`${title} · ${frequency}Hz`})}});
const scene=defineType({name:'soundScene',title:'Scene cue sheet',type:'document',fields:[
 defineField({name:'title',type:'string',validation:r=>r.required().max(90)}),
 defineField({name:'description',type:'text',rows:3,validation:r=>r.required().max(400)}),
 defineField({name:'order',type:'number'}),
 defineField({name:'cues',type:'array',of:[{type:'sceneCue'}],validation:r=>r.required().min(1).max(16)}),
]});
const cue=defineType({name:'sceneCue',title:'Cue',type:'object',fields:[
 defineField({name:'recipe',type:'reference',to:[{type:'soundRecipe'}],validation:r=>r.required()}),
 defineField({name:'at',type:'number',description:'Start in seconds. Total scene must fit 30 seconds.',validation:r=>r.required().min(0).max(29.95)}),
 defineField({name:'level',type:'number',validation:r=>r.required().min(0).max(1)}),
],preview:{select:{title:'recipe.title',at:'at'},prepare:({title,at})=>({title,subtitle:`at ${at}s`})}});

function workflowAction(next:string,label:string):DocumentActionComponent {
 return function Workflow(props){
  const client=useClient({apiVersion:'2026-09-01'}),user=useCurrentUser();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const doc=props.draft||props.published;
  const state=doc?.reviewStatus||'draft';
  const valid=next==='review'?['draft','approved'].includes(state as string):next==='approved'?state==='review':state!=='draft';
  return {label:busy?'Saving…':label,disabled:!doc||!valid||busy,tone:next==='approved'?'positive':'default',
   onHandle:async()=>{setBusy(true);try{
    const fresh=await client.getDocument(doc!._id);
    if(!fresh)throw Error('Document disappeared. Refresh and retry.');
    if(next!=='draft')validateRecipe(fresh);
    const updated=transition(fresh,next,user?.name||user?.id||'Studio member',new Date().toISOString());
    const fields={reviewStatus:updated.reviewStatus,approvedSignature:updated.approvedSignature,reviewedBy:updated.reviewedBy,reviewedAt:updated.reviewedAt};
    await client.patch(fresh._id).ifRevisionId(fresh._rev).set(fields).commit();props.onComplete();
   }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}},
   dialog:error?{type:'dialog',header:'Could not update review',content:error,onClose:()=>setError('')}:undefined,
  };
 };
}
const requestReview=workflowAction('review','Request review');
const approve=workflowAction('approved','Approve for playback');
const returnDraft=workflowAction('draft','Return to draft');
export default defineConfig({name:'default',title:'Foley Field Notes',projectId:'vkj2ioma',dataset:'production',
 plugins:[structureTool()],schema:{types:[recipe,layer,scene,cue]},
 document:{actions:(prev,ctx)=>ctx.schemaType==='soundRecipe'?[...prev.map(Action=>{
  if(Action.action!=='publish')return Action;
  const Guard:DocumentActionComponent=props=>{const result=Action(props);const doc=props.draft||props.published;return result?{...result,disabled:result.disabled||!doc||!isApproved(doc),title:doc&&isApproved(doc)?result.title:'Request review and approve the current content before publishing.'}:null;};
  Guard.action=Action.action;return Guard;
 }),requestReview,approve,returnDraft]:prev},
});
