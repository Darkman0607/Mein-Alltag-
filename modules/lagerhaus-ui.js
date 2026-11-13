/** LUX04 – accessible, consistent inventory icons and pure room-list projection. */
const paths=Object.freeze({
 verbrauch:'<path d="M9 3h6v3H9z M10 6v3l-4 5v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5l-4-5V6 M9 14h6"/>',
 geraet:'<path d="m15 5 4 4-3 3-4-4 M11 9l-7 7v4h4l7-7 M7 17l2 2 M15 3l6 6"/>',
 einzel:'<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M4 11h16M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
 sonstiges:'<path d="m3 8 9-5 9 5v10l-9 5-9-5z M3 8l9 5 9-5 M12 13v10"/>'
});
export const ITEM_TYPE_DESCRIPTIONS=Object.freeze({verbrauch:'Bestand und Verbrauch',geraet:'Zustand, Wartung und Geräteakte',einzel:'Einzelstück und Lagerort',sonstiges:'Allgemeiner Lagerartikel'});
export function inventoryIcon(type){return `<svg class="lager-lux04-svg" viewBox="0 0 24 24" role="presentation" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[type]||paths.sonstiges}</svg>`;}
/** List includes room itself, shelves, drawers and floor zones with unmodified stock quantities. */
export function inventoryRowsForRoom(room,items){
 const ids=new Set([room?.id,...(room?.furniture||[]).flatMap(f=>[f.id,...(f.compartments||[]).map(c=>c.id)]),...(room?.floorObjects||[]).filter(o=>o.kind==='zone').map(o=>o.id)]);
 return (items||[]).flatMap(item=>{
  const positions=Array.isArray(item.stockLocations)?item.stockLocations:[{locationId:item.locationId||'',quantity:Number(item.quantity)||0}];
  return positions.filter(p=>ids.has(p.locationId)&&Number(p.quantity)>0).map(p=>({item,locationId:p.locationId,quantity:Number(p.quantity)}));
 });
}
