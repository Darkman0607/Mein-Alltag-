/** LUX07 – permanently remove one article and its private data in one IndexedDB transaction.
 * Does not touch other articles, locations, or the increasing article sequence.
 */
import {mutateModuleValuesWithDeletes} from '../assets/database.js';
import {ITEM_KEY,deleteItem} from './lagerhaus-items.js';
import {MOVEMENT_KEY} from './lagerhaus-stock.js';
import {PHOTO_INDEX_KEY,photoKey} from './lagerhaus-photos.js';
import {serviceReceiptKeys} from './lagerhaus-service.js';

/** Pure deletion plan: exercised independently from the IndexedDB wrapper. */
export function planPermanentArticleDeletion(id,records,photos,events){
 if(!id||typeof id!=='string')throw new Error('Ungültige Artikel-ID.');
 const target=records.find(item=>item.id===id);
 if(!target)throw new Error('Artikel existiert nicht mehr. Bitte Ansicht aktualisieren.');
 const remaining=deleteItem(records,id);
 const removedPhotos=photos.filter(photo=>photo.ownerType==='item'&&photo.ownerId===id);
 const otherReceipts=serviceReceiptKeys(remaining);
 const removedReceipts=[...serviceReceiptKeys([target])].filter(key=>!otherReceipts.has(key));
 return {
  write:[[ITEM_KEY,remaining],[PHOTO_INDEX_KEY,photos.filter(p=>!(p.ownerType==='item'&&p.ownerId===id))],[MOVEMENT_KEY,events.filter(e=>e.itemId!==id)]],
  remove:[...removedPhotos.map(p=>photoKey(p.id)),...removedReceipts],
  deleted:{name:target.name,photos:removedPhotos.length,bookings:events.filter(e=>e.itemId===id).length}
 };
}
export async function deleteLagerArticlePermanently(id){
 let deleted;
 await mutateModuleValuesWithDeletes('lagerhaus',[ITEM_KEY,PHOTO_INDEX_KEY,MOVEMENT_KEY],values=>{
  const plan=planPermanentArticleDeletion(id,
   Array.isArray(values[ITEM_KEY])?values[ITEM_KEY]:[],
   Array.isArray(values[PHOTO_INDEX_KEY])?values[PHOTO_INDEX_KEY]:[],
   Array.isArray(values[MOVEMENT_KEY])?values[MOVEMENT_KEY]:[]);
  deleted=plan.deleted;
  return {write:plan.write,remove:plan.remove};
 });
 return deleted;
}
