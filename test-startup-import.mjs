/** Critical release gate: Node module linker catches duplicate ES import bindings.
 * V0.23.5 failed on a second bookStock import; node --check alone missed it.
 */
import assert from 'node:assert/strict';
const paths=['./modules/lagerhaus-app.js','./modules/lagerhaus-items-view.js','./modules/putzmanager-cleaning.js','./modules/putzmanager-ui.js'];
for(const path of paths){
  const module=await import(path);
  assert(module && Object.keys(module).length>0,'Module cannot load: '+path);
  console.log('PASS ESM linker: '+path);
}
