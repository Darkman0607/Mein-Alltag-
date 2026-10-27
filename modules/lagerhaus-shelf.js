/** L12: pure 3D-shelf projection of the EXISTING stock ledger.
 * No simulated inventory, no copying of item quantities and no database migration.
 */
import {stockPositions} from './lagerhaus-stock.js';
import {containerState} from './lagerhaus-tracking.js';
const number=v=>Number(v)||0;
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formatAmount=n=>String(Math.round(number(n)*1000)/1000).replace('.',',');
export function shelfLines(furniture,items=[]){
 const ids=new Set([furniture.id,...(furniture.compartments||[]).map(c=>c.id)]);
 const result=[];
 for(const item of items){
  for(const pos of stockPositions(item)){
   if(!ids.has(pos.locationId)||!(number(pos.quantity)>0))continue;
   const all=(item.containers||[]).filter(c=>c.locationId===pos.locationId);
   const detail={full:all.filter(c=>containerState(c)==='full').length,open:all.filter(c=>containerState(c)==='open').length,empty:all.filter(c=>containerState(c)==='empty').length,containers:all.filter(c=>number(c.remaining)>0).map(c=>({id:c.id,remaining:c.remaining,capacity:c.capacity,label:c.label||c.code,opened:containerState(c)==='open'}))};
   result.push({itemId:item.id,name:item.name,code:item.code,unit:item.unit,quantity:number(pos.quantity),locationId:pos.locationId,compartment:(furniture.compartments||[]).find(c=>c.id===pos.locationId)||null,detail,packSize:number(item.packSize)||1});
  }
 }
 return result;
}
export function roomUnassigned(room,items=[]){
 return items.flatMap(item=>stockPositions(item).filter(p=>p.locationId===room.id&&number(p.quantity)>0).map(p=>({itemId:item.id,name:item.name,code:item.code,unit:item.unit,quantity:number(p.quantity)})));
}
export function shelfTotal(furniture,items=[]){return shelfLines(furniture,items).reduce((s,c)=>s+c.quantity,0);}
/** Small symbolic packages on the isometric shelves. Counts reflect article records, not invented packaging. */
export function shelfPackagesSvg(furniture,items=[],p,poly,w,d,dim){
 const entries=shelfLines(furniture,items);
 if(!entries.length)return '';
 const tiers=Math.max(1,(furniture?.compartments?.length||0),3);
 const count=Math.min(entries.length,8),x=Math.max(0,Number(furniture.x)||0),z=Math.max(0,Number(furniture.z)||0);
 let out='';
 for(let index=0;index<count;index++){
  const line=entries[index],tier=index%Math.min(tiers,4),slot=Math.floor(index/Math.min(tiers,4));
  const x0=x+w*(.17+slot*.27),z0=z+d*.14,h=Math.min(dim[2]-.13,dim[2]*(tier+.30)/(Math.min(tiers,4)+.1));
  const bw=Math.min(w*.23,.24),bd=Math.min(d*.3,.15),bh=.17;
  const A=p(x0,z0,h),B=p(x0+bw,z0,h),C=p(x0+bw,z0+bd,h),D=p(x0,z0+bd,h);
  const Ah=p(x0,z0,h+bh),Bh=p(x0+bw,z0,h+bh),Ch=p(x0+bw,z0+bd,h+bh),Dh=p(x0,z0+bd,h+bh);
  out+=`<g class="lager-stock-cube" aria-label="${e(line.name)}: ${e(formatAmount(line.quantity))} ${e(line.unit)}">${poly([A,B,Bh,Ah],'#d1ae76','#3e586a')}${poly([B,C,Ch,Bh],'#b18a5c','#3e586a')}${poly([Ah,Bh,Ch,Dh],'#f3d49a','#4b5c6b')}<title>${e(line.name)} · ${e(formatAmount(line.quantity))} ${e(line.unit)}</title></g>`;
 }
 if(entries.length>count){const anchor=p(x+w*.53,z+d*.13,Math.min(dim[2]+.13,2.4));out+=`<g><circle cx="${anchor[0]}" cy="${anchor[1]}" r="11" fill="#1d4252" stroke="#ffda8c"/><text x="${anchor[0]}" y="${anchor[1]+3.5}" text-anchor="middle" font-size="10" fill="#fff">+${entries.length-count}</text></g>`;}
 return out;
}