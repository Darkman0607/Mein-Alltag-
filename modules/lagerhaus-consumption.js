/** H04 – Einheitenumrechnung ohne Änderung der gespeicherten Lager-Grundeinheiten. */
export function pairEligible(item){
 return item?.unit==='stk'&&item?.type==='verbrauch'&&(item.pairCounting==='yes'||(item.pairCounting!=='no'&&/handschuh|gloves?|nitril|latex/i.test(item.name||'')));
}
export function pairsLabel(quantity){
 const pieces=Number(quantity);if(!Number.isFinite(pieces)||pieces<0)return '';
 const fullPairs=Math.floor((pieces+1e-8)/2),singles=Math.max(0,Math.round((pieces-fullPairs*2)*1000)/1000);
 return `${fullPairs} Paar${singles?` + ${singles} einzelner Handschuh${singles===1?'':'e'}`:''}`;
}
export function consumptionQuantity(item,quantity,mode='units'){
 const input=Number(quantity);
 if(quantity===''||!Number.isFinite(input)||input<=0||input>1000000)throw new Error('Ungültige Verbrauchsmenge.');
 if(mode==='pairs'){
  if(!pairEligible(item))throw new Error('Paarzählung ist für diesen Artikel nicht aktiviert.');
  if(!Number.isInteger(input))throw new Error('Paare müssen als ganze Zahl gebucht werden.');
  return input*2;
 }
 if(mode!=='units')throw new Error('Unbekannte Verbrauchseinheit.');
 if(item.unit==='stk'&&!Number.isInteger(input))throw new Error('Stück nur als ganze Zahl buchen.');
 return input;
}
