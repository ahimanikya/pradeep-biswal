export const labels={approved:'Approved as suggested',suggested:'Alternative wording suggested',comment:'Needs discussion',keep:'Keep the original',pending:'Reopened for review'};
export function latestResponses(responses,item){
 const sorted=responses.filter(r=>r.itemId===item.id).sort((a,b)=>(b.createdAt?.toMillis?.()??b.millis??0)-(a.createdAt?.toMillis?.()??a.millis??0)||b.id.localeCompare(a.id));
 const seen=new Set();return sorted.filter(r=>{if(seen.has(r.reviewerId))return false;seen.add(r.reviewerId);return true;});
}
export function ownResponse(responses,item,actor){return latestResponses(responses,item).find(r=>r.reviewerId===actor);}
export function matchesState(item,responses,actor,state){
 const latest=latestResponses(responses,item),mine=latest.find(r=>r.reviewerId===actor),current=mine?.version===item.version;
 if(state==='pending')return !current||mine.status==='pending';
 if(state==='approved')return current&&mine.status==='approved';
 if(state==='discussion'){const valid=latest.filter(r=>r.version===item.version);return valid.some(r=>['comment','suggested'].includes(r.status))||new Set(valid.map(r=>r.status)).size>1;}
 return true;
}
export function validateResponse(status,comment,alternative){
 if(!Object.hasOwn(labels,status))return 'Choose a response.';
 if(status==='comment'&&!comment.trim())return 'Please add your comment.';
 if(status==='suggested'&&!alternative.trim())return 'Please add your alternative wording.';
 if(comment.length>12000||alternative.length>12000)return 'Please keep each response within 12,000 characters.';
 return '';
}
