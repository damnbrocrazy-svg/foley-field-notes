// Approval is tied to content, not just a mutable status flag. No credentials here.
export function signature(doc) {
  return JSON.stringify({title:doc.title, material:doc.material, gesture:doc.gesture, description:doc.description, duration:doc.duration, layers:(doc.layers||[]).map(({kind,frequency,gain,decay,attack,pulses})=>({kind,frequency,gain,decay,attack,pulses}))});
}
export function isApproved(doc) { return doc.reviewStatus === 'approved' && doc.approvedSignature === signature(doc); }
export function transition(doc, next, actor, at) {
  const allowed = {draft:['review'],review:['approved','draft'],approved:['draft','review']};
  const status = doc.reviewStatus || 'draft';
  if (!allowed[status]?.includes(next)) throw new Error(`Cannot move ${status} to ${next}`);
  if (!actor || !at || !Number.isFinite(Date.parse(at))) throw new Error('Actor and timestamp required');
  return {...doc, reviewStatus:next, approvedSignature:next==='approved'?signature(doc):'', reviewedBy:next==='approved'?actor:'', reviewedAt:next==='approved'?at:null};
}
