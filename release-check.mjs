import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 furnitureModelCount, FURNITURE, FURNITURE_SIZES, FURNITURE_MATERIALS,
 furnitureVariant, furnitureFootprint, placementValid, constrainedPosition,
 pointerToGridDelta, firstFreeSpot
} from './modules/lagerhaus-app.js';
import {ensureHierarchy,getAllCodes,allocateCode,relocateCompartment,findCompartment,locationPath,defaultCompartmentLabels} from './modules/lagerhaus-hierarchy.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const version=JSON.parse(read('version.json')).version;
const sw=read('sw.js'), app=read('assets/app.js');
assert.equal(version,'0.9.0');
assert.match(app,/export const APP_VERSION='0.9.0'/);
assert.match(sw,/const CACHE='mein-alltag-v0-9-0'/);
assert.match(sw,/version.json/);
assert.match(sw,/lagerhaus-hierarchy.js/);
assert.equal(furnitureModelCount(),15);
assert.equal(Object.keys(FURNITURE).length,15);
assert.equal(Object.keys(FURNITURE_SIZES).length,3);
assert.equal(Object.keys(FURNITURE_MATERIALS).length,3);
for(const [id,model] of Object.entries(FURNITURE)) {
 const obj={id:'one',type:id,variantSize:'standard',x:0,z:0,rot:0};
 assert.equal(furnitureVariant(obj).model.name,model.name);
 assert(placementValid(obj,[]),`can't place ${id}`);
 const rotated={...obj,rot:1};
 assert(furnitureFootprint(rotated).w>0 && furnitureFootprint(rotated).d>0);
 const start=firstFreeSpot(obj,[{...obj,id:'other'}]);
 assert(start!==null,`no other free spot for ${id}`);
 assert(placementValid({...obj,...start},[{...obj,id:'other'}]));
}
const item={id:'f1',type:'regal',x:0,z:0,rot:0};
assert(!placementValid({...item,x:0,z:0},[{...item,id:'f2',x:0,z:0}]));
assert(!placementValid({...item,x:-3},[]));
assert(!placementValid({...item,z:-3},[]));
assert(constrainedPosition(item,[],3,2).valid);
assert.equal(typeof pointerToGridDelta(50,20).x,'number');
const assets=sw.slice(sw.indexOf('const ASSETS=[')+14,sw.indexOf('];')).match(/'\.\/[^']+'/g)||[];
for(const ref of assets){const f=ref.slice(1,-1).replace(/^\.\//,'');assert(fs.existsSync(path.join(root,f)),`missing asset ${f}`);}
const html=read('index.html');assert.match(html,/manifest.webmanifest/);assert.match(html,/assets\/app.js/);
const m=JSON.parse(read('manifest.webmanifest'));assert.equal(m.display,'standalone');assert.equal(m.icons.length,2);
for(const i of m.icons) assert(fs.existsSync(path.join(root,i.src)));
assert.equal(read('assets/database.js').includes("export const DB_NAME = 'mein-alltag-v0'"),true);
console.log(`PASS: version ${version}, ${furnitureModelCount()} models, placement/collision, assets, manifest, DB unchanged`);

// L04: migrate pre-existing V0.3.1 rooms without recreating IDs or furniture.
const legacy=[{id:'room-old',name:'Alte Garage',type:'garage',furniture:[{id:'furn-old',type:'regal',name:'Regal alt',x:0,z:0,rot:0}]}];
const areas=[];let nextId=0;const id=()=>`uuid-${++nextId}`;
assert.equal(ensureHierarchy(legacy,areas,id),true);
assert.equal(areas.length,1);
assert.equal(legacy[0].areaId,areas[0].id);
assert.equal(legacy[0].id,'room-old');
assert.equal(legacy[0].furniture[0].id,'furn-old');
assert.match(legacy[0].code,/^R-\d{4}$/);
assert.match(legacy[0].furniture[0].code,/^M-\d{4}$/);
assert.equal(ensureHierarchy(legacy,areas,id),false);
const knownCodes=getAllCodes(legacy,areas);
const nextCode=allocateCode('F',knownCodes);
assert.match(nextCode,/^F-\d{4}$/);
legacy[0].furniture[0].compartments.push({id:'comp-old',code:nextCode,name:'Schrauben',kind:'fach',marker:{saved:123}});
legacy.push({id:'room-next',name:'Keller',areaId:areas[0].id,furniture:[{id:'furn-next',type:'schrank',name:'Schrank',x:0,z:0,rot:0,compartments:[]} ]});
assert(ensureHierarchy(legacy,areas,id));
const before=JSON.stringify(findCompartment(legacy,'comp-old').compartment);
relocateCompartment(legacy,'comp-old','furn-next');
assert.equal(findCompartment(legacy,'comp-old').room.id,'room-next');
assert.equal(JSON.stringify(findCompartment(legacy,'comp-old').compartment),before);
assert.equal(locationPath(legacy,areas,'room-next','furn-next','comp-old'),`${areas[0].name} / Keller / Schrank / Schrauben`);
legacy[1].furniture[0].name='Schrank neu';
assert.equal(findCompartment(legacy,'comp-old').compartment.code,nextCode);
const restored=structuredClone({rooms:legacy,areas});
assert.equal(ensureHierarchy(restored.rooms,restored.areas,id),false);
assert.equal(findCompartment(restored.rooms,'comp-old').compartment.marker.saved,123);
assert.throws(()=>relocateCompartment(legacy,'comp-old','not-found'),/Zielmöbel/);
assert.equal(findCompartment(legacy,'comp-old').furniture.id,'furn-next');
assert.equal(defaultCompartmentLabels({type:'schubladen'}).length,5);
assert.equal(defaultCompartmentLabels({type:'regal'}).length,4);
assert.equal(defaultCompartmentLabels({type:'box'}).length,1);
const allCodes=Array.from(getAllCodes(legacy,areas));assert.equal(new Set(allCodes).size,allCodes.length);
console.log('PASS L04: stable global codes, legacy migration, reloading, nested compartments, renaming, atomic move data intact');
