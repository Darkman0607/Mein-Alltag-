/** BW14 – Last five original anime women's portraits: identity, uniqueness, local fallback, offline delivery. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STARTER_CARDS, safeStarterAsset, starterAssetPath} from './assets/reward-series.js';
const women=STARTER_CARDS.filter(c=>c.categoryId==='anime-frauen').sort((a,b)=>a.number-b.number);
assert.equal(women.length,25);
const sw=readFileSync('sw.js','utf8');
const hashes=new Set();
for(const item of women){
  const path=safeStarterAsset(item);
  assert.equal(starterAssetPath(item.categoryId,item.number),item.imageAsset);
  assert.equal(path,`./assets/card-art/anime-frauen/${String(item.number).padStart(3,'0')}.webp`);
  assert(existsSync(path.slice(2)),`Missing artwork ${path}`);
  const image=readFileSync(path.slice(2));
  assert.equal(image.toString('latin1',0,4),'RIFF');
  assert.equal(image.toString('latin1',8,12),'WEBP');
  assert(image.length>15000 && image.length<120000,`WebP size for ${item.number}`);
  assert(sw.includes(`'${path}'`),`WebP not in offline preload: ${path}`);
  hashes.add(createHash('sha256').update(image).digest('hex'));
  assert.equal(safeStarterAsset({...item,imageAsset:'https://other.invalid/custom.webp'}),null);
}
assert.equal(hashes.size,25,'Image assets must all differ');
for(const id of [21,22,23,24,25]) {
 const card=women[id-1];assert(card.number===id);
 assert(['episch','legendaer','mythisch','diamant'].includes(card.rarity));
}
assert.match(sw,/mein-alltag-v0-25-5/);
assert.equal(JSON.parse(readFileSync('version.json')).version,'0.25.5');
assert.match(readFileSync('assets/app.js','utf8'),/APP_VERSION='0\.25\.5'/);
assert.match(readFileSync('assets/reward-album-ui.js','utf8'),/hasSafeImage\?image:starter/);
assert.match(readFileSync('assets/reward-pack-stage.js','utf8'),/safeStarterAsset\(card\)/);
assert.match(readFileSync('assets/reward-shop-ui.js','utf8'),/safeStarterAsset\(card\)/);
const next=STARTER_CARDS.filter(x=>x.categoryId==='anime-tiere');
assert(next.length===25 && next.every(x=>safeStarterAsset(x)===x.imageAsset));
console.log('PASS BW14: all 25 distinct anime portraits, five final cards, stable catalogue IDs, custom-picture priority, offline and pack rendering.');
