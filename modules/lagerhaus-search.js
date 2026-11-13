/** LUX03: Deterministic, offline inventory lookup with small typo tolerance.
 *  No indexes or cloud service, no changes to stock or IDs. */
export function normalizeSearch(value){
 return String(value??'').toLocaleLowerCase('de-AT').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
}
/** Edit distance at most 1, with early rejection. Only used for tokens length >=5. */
export function oneEditApart(a,b){
 if(a===b)return true;
 if(Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,errors=0;
 while(i<a.length&&j<b.length){
  if(a[i]===b[j]){i++;j++;continue;}
  if(++errors>1)return false;
  if(a.length>b.length)i++;
  else if(a.length<b.length)j++;
  else {i++;j++;}
 }
 return errors+(a.length-i)+(b.length-j)<=1;
}
function tokenMatch(query,word){
 if(word.includes(query))return true;
 if(query.length<5||word.length<5||word.length>80)return false;
 // German compound nouns (Nitrilhandschuhe) and a common singular/plural ending.
 // A typo may occur within a compound; never permit more than one edit.
 const variants=word.endsWith('e')?[word,word.slice(0,-1)]:[word];
 for(const variant of variants){
  for(const len of [query.length-1,query.length,query.length+1]){
   if(len<5||len>variant.length)continue;
   for(let pos=0;pos+len<=variant.length;pos++)if(oneEditApart(query,variant.slice(pos,pos+len)))return true;
  }
 }
 return false;
}
export function matchesSmartQuery(text,query){
 const tokens=normalizeSearch(query).split(' ').filter(Boolean);
 if(!tokens.length)return true;
 const words=normalizeSearch(text).split(' ').filter(Boolean);
 return tokens.every(token=>words.some(word=>tokenMatch(token,word)));
}
export function itemSearchText(item,locationLabels='',categoryAliases=''){
 return [item.name,item.code,item.category,item.brand,item.articleNumber,item.note,item.useArea,
  (item.tags||[]).join(' '),categoryAliases,...Object.values(item.properties||{}),locationLabels,
  ...(item.containers||[]).flatMap(c=>[c.code,c.label]),
  ...(item.devices||[]).flatMap(d=>[d.code,d.label,d.serialNumber])].filter(Boolean).join(' ');
}
export function searchInventory(items,query,{locationLabel=()=>'',categoryAliases=()=>'',limit=12}={}){
 const q=normalizeSearch(query);
 if(!q)return [];
 return items.filter(item=>matchesSmartQuery(itemSearchText(item,locationLabel(item),categoryAliases(item)),q))
  .sort((a,b)=>{
   const score=item=>{const name=normalizeSearch(item.name),code=normalizeSearch(item.code);if(name===q||code===q)return 0;if(name.startsWith(q))return 1;if(name.includes(q))return 2;return 3;};
   return score(a)-score(b)||a.name.localeCompare(b.name,'de');
  }).slice(0,Math.max(0,Math.min(200,limit)));
}
