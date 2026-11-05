/** BW12: unique bundled artwork, non-destructive mapped upgrade and cache completeness. */
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STARTER_CARDS,starterAssetPath,safeStarterAsset,previewStarterImport} from './assets/reward-series.js';
const women=STARTER_CARDS.filter(c=>c.categoryId==='anime-frauen').sort((a,b)=>a.number-b.number);
assert.equal(STARTER_CARDS.length,100);
assert.equal(women.length,25);
assert.equal(previewStarterImport(STARTER_CARDS).toAdd,0);
const ids=new Set(),hashes=new Set(),urls=[];
for(const def of women){
 const source=starterAssetPath(def.categoryId,def.number);
 assert.equal(source,def.imageAsset,'Keep original BW06 content paths stable in the DB');
 const active=safeStarterAsset(def);
 assert(active && existsSync(active.slice(2)),`Missing card ${def.number}`);
 if(def.number<=20){
  assert.match(active,/\.webp$/);
  const data=readFileSync(active.slice(2));
  assert.equal(data.toString('latin1',0,4),'RIFF');assert.equal(data.toString('latin1',8,12),'WEBP');
  hashes.add(createHash('sha256').update(data).digest('hex'));
  assert(data.length<110000,'Optimized picture too large for offline cache');urls.push(active);
 }else assert.match(active,/\.svg$/);
 assert(!ids.has(`${def.categoryId}:${def.number}`));ids.add(`${def.categoryId}:${def.number}`);
 assert.equal(safeStarterAsset({...def,imageAsset:'https://evil.example/card.webp'}),null,'Never use arbitrary non-local sources');
}
assert.equal(hashes.size,20,'Every picture must be unique');
const other=STARTER_CARDS.find(c=>c.categoryId==='anime-tiere');assert.equal(safeStarterAsset(other),other.imageAsset);
const shell=readFileSync('sw.js','utf8'),album=readFileSync('assets/reward-album-ui.js','utf8'),opening=readFileSync('assets/reward-pack-stage.js','utf8'),shop=readFileSync('assets/reward-shop-ui.js','utf8');
for(const u of urls)assert(shell.includes(`'${u}'`),`Offline pre-cache missed ${u}`);
assert.equal(new Set(urls).size,20);
assert.match(album,/hasSafeImage\?image:starter/,'Personalized images must have priority');
assert.match(opening,/safeStarterAsset\(card\)/);
assert.match(shop,/safeStarterAsset\(card\)/);
assert.match(shell,/mein-alltag-v0-25-4/);
assert.equal(JSON.parse(readFileSync('version.json')).version,'0.25.4');
assert.match(readFileSync('assets/app.js','utf8'),/APP_VERSION='0\.25\.4'/);
console.log('PASS BW12: 20 different WebP artworks, 100 existing card slots, non-destructive image mapping, custom-image priority, booster and album integration, offline cache + version.');
