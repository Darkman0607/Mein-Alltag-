/** L13 – independent category taxonomy, tags, favorites and deterministic searching. */
export const CATEGORY_KEY='items.categories.v1';
export const CATEGORY_COLORS=Object.freeze({slate:'#64748b',blue:'#2563eb',teal:'#0f766e',green:'#15803d',amber:'#b45309',violet:'#7c3aed',rose:'#be185d'});
export const CATEGORY_STARTERS=Object.freeze([
 {name:'Werkzeuge',icon:'🛠️',color:'slate'},
 {name:'Reinigung',icon:'🧽',color:'teal'},
 {name:'Garten',icon:'🌱',color:'green'},
 {name:'Schutzkleidung',icon:'🧤',color:'blue'},
 {name:'Ersatzteile',icon:'⚙️',color:'amber'},
 {name:'Haushalt',icon:'🏠',color:'violet'}
]);
const trim=(v,n)=>String(v??'').trim().slice(0,n);
export function searchKey(text){return String(text??'').toLocaleLowerCase('de-AT').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function cleanTags(input){
 const arr=Array.isArray(input)?input:String(input??'').split(/[,;\n]+/);
 const names=arr.map(x=>trim(x,32)).filter(Boolean);const used=new Set();
 return names.filter(x=>{const k=searchKey(x);if(!k||used.has(k))return false;used.add(k);return true;}).slice(0,15);
}
export function categoryLabel(category,categories){
 return categoryAncestors(category.id,categories).join(' / ')||category.name;
}
export function categoryAncestors(id,categories){
 const names=[];const visited=new Set();let current=categories.find(c=>c.id===id);
 while(current&&!visited.has(current.id)){visited.add(current.id);names.unshift(current.name);current=categories.find(c=>c.id===current.parentId);}
 return names;
}
export function categoryAndChildren(id,categories){
 const found=new Set([id]);let changed=true;
 while(changed){changed=false;for(const c of categories)if(found.has(c.parentId)&&!found.has(c.id)){found.add(c.id);changed=true;}}
 return found;
}
export function validateCategory(values,categories,existingId=''){
 const name=trim(values.name,55);if(!name)throw Error('Kategoriename fehlt.');
 const parentId=trim(values.parentId,100);
 if(parentId&&!categories.some(c=>c.id===parentId))throw Error('Übergeordnete Kategorie fehlt.');
 if(existingId&&(parentId===existingId||categoryAndChildren(existingId,categories).has(parentId)))throw Error('Kategorie darf nicht ihre eigene Unterkategorie werden.');
 if(categories.some(c=>c.id!==existingId&&c.parentId===parentId&&searchKey(c.name)===searchKey(name)))throw Error('Diese Kategorie existiert in dieser Ebene bereits.');
 const icon=trim(values.icon,12)||'📦';
 const color=Object.hasOwn(CATEGORY_COLORS,values.color)?values.color:'slate';
 const aliases=cleanTags(values.aliases);
 return {name,parentId,icon,color,aliases};
}
export function addCategory(categories,values,makeId){
 const data=validateCategory(values,categories);const id=String(makeId());
 if(!id||categories.some(c=>c.id===id))throw Error('Doppelte Kategorienkennung.');
 return [...categories,{id,...data}];
}
export function editCategory(categories,items,id,values){
 if(!categories.some(c=>c.id===id))throw Error('Kategorie fehlt.');
 const data=validateCategory(values,categories,id);
 const next=categories.map(c=>c.id===id?{...c,...data}:c);
 return {categories:next,items:items.map(i=>i.categoryId===id?{...i,category:data.name}:i)};
}
export function removeCategory(categories,items,id){
 if(items.some(i=>i.categoryId===id))throw Error('Kategorie wird noch von Artikeln verwendet. Zuerst umordnen.');
 if(categories.some(c=>c.parentId===id))throw Error('Kategorie hat Unterkategorien. Zuerst Unterkategorien verschieben.');
 return categories.filter(c=>c.id!==id);
}
export function bulkAssign(items,selectedIds,categoryId,categories){
 if(categoryId&&!categories.some(c=>c.id===categoryId))throw Error('Zielkategorie ist nicht vorhanden.');
 const ids=new Set(selectedIds);if(!ids.size)throw Error('Bitte Artikel auswählen.');
 const category=categories.find(c=>c.id===categoryId);
 return items.map(i=>ids.has(i.id)?{...i,categoryId:categoryId||'',category:category?.name||'Allgemein'}:i);
}
export function toggleFavorite(items,id){
 if(!items.some(i=>i.id===id))throw Error('Artikel wurde gelöscht.');
 return items.map(i=>i.id===id?{...i,favorite:!i.favorite}:i);
}
/** Legacy L05-L12 article categories become real stable-ID taxonomy entries once.
 * Empty legacy categories remain uncategorized. Only changes categorization metadata. */
export function migrateCategories(items,existing=[],makeId){
 const categories=Array.isArray(existing)?existing.map(c=>({...c})):[];
 let changed=false;
 const next=items.map(item=>{
  let id=trim(item.categoryId,100);
  if(id&&categories.some(c=>c.id===id))return item;
  let categoryName=trim(item.category,55);
  if(!categoryName||searchKey(categoryName)==='allgemein'){
   if(id||item.categoryId!==''||item.category!=='Allgemein'){changed=true;return {...item,categoryId:'',category:'Allgemein'};}
   return item;
  }
  let found=categories.find(c=>!c.parentId&&searchKey(c.name)===searchKey(categoryName));
  if(!found){const value=validateCategory({name:categoryName,icon:'📦',color:'slate'},categories);found={id:String(makeId()),...value};categories.push(found);changed=true;}
  if(item.categoryId!==found.id||item.category!==found.name){changed=true;return {...item,categoryId:found.id,category:found.name};}
  return item;
 });
 return {items:next,categories,changed};
}
export function matchesItem(item,search,categories=[]){
 const category=categories.find(c=>c.id===item.categoryId);
 const path=category?categoryAncestors(category.id,categories).join(' '):item.category;
 const terms=[item.name,item.code,item.category,path,category?.aliases?.join(' '),item.tags?.join(' '),item.brand,item.articleNumber,item.note,
  ...Object.values(item.properties||{}),...(item.containers||[]).flatMap(c=>[c.code,c.label]),...(item.devices||[]).flatMap(d=>[d.code,d.label,d.serialNumber])];
 const text=searchKey(terms.join(' ')),tokens=searchKey(search).split(' ').filter(Boolean);
 return tokens.every(token=>text.includes(token));
}
export function filterItems(items,filters={},categories=[]){
 const catSet=filters.categoryId?categoryAndChildren(filters.categoryId,categories):null;
 const filtered=items.filter(i=>matchesItem(i,filters.search||'',categories)
  &&(!catSet||catSet.has(i.categoryId))
  &&(!filters.type||i.type===filters.type)
  &&(!filters.favorites||i.favorite===true)
  &&(!filters.tag||cleanTags(i.tags).some(tag=>searchKey(tag).includes(searchKey(filters.tag)))));
 const sort=filters.sort||'name';
 return filtered.sort((a,b)=>{
  if(sort==='name-desc')return b.name.localeCompare(a.name,'de');
  if(sort==='recent')return String(b.createdAt||'').localeCompare(String(a.createdAt||''))||a.name.localeCompare(b.name,'de');
  if(sort==='quantity')return Number(a.quantity||0)-Number(b.quantity||0)||a.name.localeCompare(b.name,'de');
  return a.name.localeCompare(b.name,'de');
 });
}
