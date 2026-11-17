/* FG09: Offline fertility observations. Estimates, NOT diagnosis, contraception, or ovulation confirmation.
 * Data supplied from existing FG08 and F-series records; no migration/duplicate storage. */
const ISO=/^\d{4}-\d{2}-\d{2}$/;
export function validIso(s){if(typeof s!=='string'||!ISO.test(s))return false;const n=Date.parse(s+'T12:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s;}
const epoch=s=>Date.parse(s+'T12:00:00Z');
export const addDays=(s,n)=>new Date(epoch(s)+n*86400000).toISOString().slice(0,10);
export const dayDiff=(a,b)=>Math.round((epoch(b)-epoch(a))/86400000);
export const labelDate=s=>validIso(s)?s.slice(8)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'–';
export const normTemp=t=>{const s=String(t??'').trim().replace(',','.');if(!/^\d{2}(?:\.\d{1,2})?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)&&n>=33&&n<=42?n:null;};
export function temperatureReadings(studies){const entries=(Array.isArray(studies)?studies:[]).filter(x=>x?.topic==='temperatur'&&validIso(x.date)&&normTemp(x.details?.temperature)!==null);
 const grouped=new Map();for(const x of entries.sort((a,b)=>String(a.updated||a.created||'').localeCompare(String(b.updated||b.created||'')))){
  const d=x.details||{};grouped.set(x.date,{date:x.date,value:normTemp(d.temperature),method:d.method||'',valid:d.measuredAfterWake==='ja'&&['vaginal','oral','rektal'].includes(d.method)&&(!d.disturbed||d.disturbed==='nein'),disturbed:d.disturbed||'',id:x.id});}
 return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
// Deliberately conservative heuristic: six consecutive comparable low values, followed by three
// consecutive higher values, all measured under comparable conditions. It is NOT a validated
// symptothermal rule or proof of ovulation. No result on isolated readings.
export function detectTemperaturePattern(readings,currentStart='',today='9999-12-31'){
 const rs=(Array.isArray(readings)?readings:[]).filter(x=>x.valid&&x.date<=today&&(!currentStart||x.date>=currentStart));
 for(let i=rs.length-3;i>=6;i--){const seq=rs.slice(i-6,i+3);if(seq.length!==9||seq.some((x,j)=>j&&dayDiff(seq[j-1].date,x.date)!==1)||new Set(seq.map(x=>x.method)).size!==1)continue;
  const low=seq.slice(0,6),high=seq.slice(6,9),ceiling=Math.max(...low.map(x=>x.value));
  if(high.every(x=>x.value>ceiling)&&high[2].value>=ceiling+0.2-0.000001){return {firstHigh:high[0].date,verifiedThrough:high[2].date,method:high[0].method,lowCeiling:ceiling};}
 }
 return null;
}
export function analyzeFertility({cycle={},entries=[],studies=[],today,manualStart}={}){
 const now=validIso(today)?today:new Date().toISOString().slice(0,10);
 const periodBeginnings=[...new Set((Array.isArray(entries)?entries:[]).filter(x=>x?.category==='periode'&&x.details?.periodEvent==='beginn'&&validIso(x.date)&&x.date<=now).map(x=>x.date))].sort();
 const intervals=periodBeginnings.slice(1).map((x,i)=>dayDiff(periodBeginnings[i],x)).filter(n=>n>=18&&n<=60).slice(-6);
 const configured=Number(cycle?.length),average=intervals.length>=2?Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length):null;
 const len=average||(Number.isInteger(configured)&&configured>=18&&configured<=60?configured:null);
 const starts=[...periodBeginnings,manualStart,cycle?.manualStart,cycle?.start].filter(validIso).filter(x=>x<=now).sort();
 const start=starts.at(-1)||null;const day=start?dayDiff(start,now)+1:null;
 const fresh=!!(start&&len&&day>=1&&day<=len+7);
 const irregular=intervals.length>=3&&Math.max(...intervals)-Math.min(...intervals)>7;
 const predictedOvulation=fresh&&!irregular?addDays(start,len-15):null;
 const fertileStart=predictedOvulation?addDays(predictedOvulation,-5):null;
 const fertileEnd=predictedOvulation;
 const predictedPeriod=fresh?addDays(start,len):null;
 const reading=temperatureReadings(studies);
 const pattern=detectTemperaturePattern(reading,start||'',now);
 const lh=(Array.isArray(studies)?studies:[]).filter(x=>x?.topic==='lh'&&validIso(x.date)&&x.date<=now).sort((a,b)=>a.date.localeCompare(b.date));
 const lhPositive=lh.filter(x=>x.details?.lhResult==='positiv'&&(!start||x.date>=start));
 const lhLast=lhPositive.at(-1)||null;
 const mucus=(Array.isArray(studies)?studies:[]).filter(x=>x?.topic==='ausfluss'&&validIso(x.date)&&x.date<=now).map(x=>({...x,origin:'eigenstudie'}));
 const legacyMucus=(Array.isArray(entries)?entries:[]).filter(x=>x?.category==='ausfluss'&&validIso(x.date)&&x.date<=now).map(x=>({...x,origin:'tagebuch'}));
 const mucusEntries=[...mucus,...legacyMucus].sort((a,b)=>a.date.localeCompare(b.date));
 const positiveMucus=mucusEntries.filter(x=>{const d=x.details||{};return ['dehnbar','fluessig','spinnbar'].includes(d.consistency||d.texture)&&(!d.color||['klar','weiss'].includes(d.color))&&d.itching!=='ja'&&d.burning!=='ja'&&d.odor!=='auffaellig';});
 return {today:now,start,day,len,estimatedLengthSource:average?'historie':'manuell',periodBeginnings,intervals,irregular,fresh,predictedOvulation,fertileStart,fertileEnd,predictedPeriod,readings:reading,pattern,lh,lhLast,mucusEntries,positiveMucus};
}
export function dayFertilityInfo(analysis,date){
 const a=analysis; const temp=a.readings.find(x=>x.date===date);const lh=a.lh.filter(x=>x.date===date);
 const mucus=a.mucusEntries.filter(x=>x.date===date);const isFertile=!!(a.fertileStart&&date>=a.fertileStart&&date<=a.fertileEnd);
 const isLHWindow=!!(a.lhLast&&date>=a.lhLast.date&&date<=addDays(a.lhLast.date,2));
 return {date,temp,lh,mucus,isFertile,isLHWindow,estimatedOvulation:a.predictedOvulation===date,temperaturePattern:a.pattern?.verifiedThrough===date,periodForecast:a.predictedPeriod===date};
}
