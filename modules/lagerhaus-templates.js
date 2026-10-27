/** L06 – lokale Artikel-Feldvorlagen; keine Synchronisierung und keine eigene Datenbank. */
export const ARTICLE_TEMPLATES=Object.freeze({
 geraet:[
  {id:'geraet-akkuschrauber',title:'Akkuschrauber',values:{name:'Akkuschrauber',category:'Elektrowerkzeuge',unit:'stk',quantity:1,condition:'gut'}},
  {id:'geraet-rasenmaeher',title:'Rasenmäher',values:{name:'Rasenmäher',category:'Gartengeräte',unit:'stk',quantity:1,condition:'gut'}},
  {id:'geraet-heckenschere',title:'Heckenschere',values:{name:'Heckenschere',category:'Gartengeräte',unit:'stk',quantity:1,condition:'gut'}}
 ],
 verbrauch:[
  {id:'verbrauch-reiniger',title:'Reinigungsmittel',values:{name:'Reinigungsmittel',category:'Reinigung',unit:'l',quantity:1,condition:'neu'}},
  {id:'verbrauch-schrauben',title:'Schrauben',values:{name:'Schrauben',category:'Kleinteile',unit:'stk',quantity:1,condition:'neu'}},
  {id:'verbrauch-klebeband',title:'Klebeband',values:{name:'Klebeband',category:'Material',unit:'stk',quantity:1,condition:'neu'}}
 ],
 einzel:[
  {id:'einzel-ersatzteil',title:'Ersatzteil',values:{name:'Ersatzteil',category:'Ersatzteile',unit:'stk',quantity:1,condition:'gut'}},
  {id:'einzel-werkzeugkoffer',title:'Werkzeugkoffer',values:{name:'Werkzeugkoffer',category:'Werkzeuge',unit:'stk',quantity:1,condition:'gut'}}
 ],
 sonstiges:[]
});
export const TYPE_PROPERTIES=Object.freeze({
 geraet:[
  {key:'model',label:'Modellbezeichnung',kind:'text',max:100,hint:'z. B. GSR 18V-55'},
  {key:'serialNumber',label:'Seriennummer',kind:'text',max:100},
  {key:'purchaseDate',label:'Kaufdatum',kind:'date'},
  {key:'serviceNote',label:'Wartungshinweis',kind:'text',max:240}
 ],
 verbrauch:[
  {key:'material',label:'Material / Inhalt',kind:'text',max:100},
  {key:'expiryDate',label:'Haltbar bis',kind:'date'},
  {key:'storageNote',label:'Lagerhinweis',kind:'text',max:240}
 ],
 einzel:[
  {key:'color',label:'Farbe',kind:'text',max:60},
  {key:'material',label:'Material',kind:'text',max:100},
  {key:'dimensions',label:'Abmessungen',kind:'text',max:100},
  {key:'identifier',label:'Eigene Kennzeichnung',kind:'text',max:100}
 ],
 sonstiges:[]
});
export function templatesFor(type){return ARTICLE_TEMPLATES[type]||[];}
export function propertiesFor(type){return TYPE_PROPERTIES[type]||[];}
export function templateById(type,id){return templatesFor(type).find(t=>t.id===id)||null;}
function isActualDate(iso){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
 const [y,m,d]=iso.split('-').map(Number);
 if(y<1900||y>2100||m<1||m>12||d<1||d>31)return false;
 const candidate=new Date(Date.UTC(y,m-1,d));
 return candidate.getUTCFullYear()===y && candidate.getUTCMonth()===m-1 && candidate.getUTCDate()===d;
}
/** Strip unknown keys; validate extra fields without altering legacy L05 records. */
export function normalizeProperties(type,input={}){
 const result={};
 const data=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 for(const prop of propertiesFor(type)){
  const value=String(data[prop.key]??'').trim();
  if(!value)continue;
  if(prop.kind==='date'){
   if(!isActualDate(value))throw new Error(`Ungültiges Datum bei „${prop.label}“. Bitte TT.MM.JJJJ prüfen.`);
  }else if(value.length>prop.max){throw new Error(`„${prop.label}“ darf maximal ${prop.max} Zeichen haben.`);}
  result[prop.key]=value;
 }
 return result;
}
export function detailedProperties(item){
 return propertiesFor(item.type).flatMap(p=>item.properties?.[p.key]?[{label:p.label,value:String(item.properties[p.key])}]:[]);
}
