"""BW06: 100 original, reproducible vector card illustrations.
Art is procedurally generated from original shapes and hand-curated creative prompts; no
third-party licensed characters or brand logos. Run `python DOKUMENTATION/BW06_Kartenquellen_Generator.py`.
SVG art is distinct from HTML card frames, names, prices and rarity rules.
"""
from pathlib import Path
import json,random,math,html
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets'/'card-art'
CATEGORIES=['anime-frauen','anime-tiere','maschinen','monster']
NAMES={
'anime-frauen':[
'Ayla Nebelwind','Mira Sternenpfad','Talia Morgenrot','Neria Silbersang','Lyra Frostlicht',
'Vera Kristallbach','Selina Wolkentanz','Runa Nachtblüte','Elyra Sonnenhain','Kira Blauschweif',
'Elina Sturmfeder','Liora Glanzsee','Aris Mondbrücke','Nyla Funkenflug','Marelle Windtor',
'Yuna Schimmerfels','Leni Auroraborn','Reva Wolkenschmied','Zora Eisglanz','Anira Feuerblatt',
'Serena Nachthafen','Iris Lichtwächterin','Veyla Himmelsrose','Maela Sternenkrone','Astra Morgenstern'],
'anime-tiere':[
'Fino Moosfuchs','Lumi Wolkenkatze','Nori Seeotter','Pipo Blattsperling','Kumo Nachtluchs',
'Bela Silberhase','Riko Zapfenbär','Mori Waldhirsch','Tiko Funkenmaus','Momo Schneeeule',
'Feli Traumfuchs','Piru Flussdrache','Paxi Bambuspanda','Nila Korallenrobbe','Taro Windhase',
'Yuki Mondwolf','Bomo Honigdachs','Cleo Kristallkrähe','Rumi Lichtotter','Suri Goldfink',
'Kibi Sternenschildkröte','Fora Nebelreh','Lino Wolkenalpaka','Oko Glutpanther','Mika Polarfüchsin'],
'maschinen':[
'Feldstern 24','Komet-Kleintraktor','Moorschlepper Grün','Waldbiber 400','Kiesfalke Loader',
'Sonnenpflüger 6','Ackerwind Kompakt','Dampfschlepper Altgold','Bergkran Titan','Sturmsaat Mähdrescher',
'Heckenmeister Elektro','Waldriese Rückezug','Gartenmaus Mini','Wiesenfuchs Mäher','Raupenpflug Zeta',
'Silberwalze 90','Kornsammler Orbit','Moosmulcher MX','Feldhase Transporter','Steinbeißer Bagger',
'Torfschaufel TR','Hydrotraktor Aqua','Kronenlader Upsilon','Blaustern Ernter','Dämmerungsschlepper X'],
'monster':[
'Nebelwisp','Bernsteinpfote','Kieshörnchen','Mondfloh','Schimmerkröter',
'Rauchtatz','Echowächter','Blutbirnengeist','Frostmim','Drachenwurzel',
'Tauglimmer','Basaltgroll','Wolkensammler','Funkengreif','Schilfschlund',
'Lavakobold','Schattenmähne','Kristallzahn','Sternenhüter','Dornenschwanz',
'Donnergeweih','Tiefenauge','Saphirphönix','Uhrwerkgigant','Auroradrache']
}
assert all(len(x)==25 and len(set(x))==25 for x in NAMES.values())
RANKS=['gewoehnlich']*9+['ungewoehnlich']*6+['selten']*4+['episch']*3+['legendaer','mythisch','diamant']
PALETTES={
'anime-frauen': [('#2a3c84','#d275c8','#ebd5b5'),('#272b66','#65afd2','#f4c39f'),('#422465','#fe977a','#e2ac8e'),('#123961','#83e2d4','#f1c5ac'),('#392d75','#b7a0ec','#ecc4a5')],
'anime-tiere': [('#19436a','#5fe4af','#f4d0a7'),('#193b59','#ffd47d','#d8c0ad'),('#254967','#c5b8f8','#c59b6c'),('#173f49','#75c4fe','#e9d5c0'),('#233969','#ffacbb','#f2d9a9')],
'maschinen': [('#14364b','#72b8db','#f0af4a'),('#243a43','#9ac772','#f3d071'),('#1b3553','#d6a36c','#b9c3d8'),('#30304e','#8aaff0','#f28b5b'),('#244041','#7fddc0','#edc166')],
'monster': [('#241a52','#a76ff7','#9cecf4'),('#142650','#68c5f0','#fec280'),('#371c4d','#f08cb6','#f8d372'),('#162f46','#83da99','#deacff'),('#332046','#fa9b70','#91c1ff')]
}
def E(x):return html.escape(str(x),quote=True)
def rrect(x,y,w,h,fill,rx=14,stroke='none',sw=0):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def circle(x,y,r,fill,stroke='none',sw=0):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def path(d,fill,stroke='none',sw=0):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def ellipse(x,y,rx,ry,fill):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}"/>'
def star(x,y,s,col):return path(f'M{x} {y-s}L{x+s*.3} {y-s*.3}L{x+s} {y}L{x+s*.3} {y+s*.3}L{x} {y+s}L{x-s*.3} {y+s*.3}L{x-s} {y}L{x-s*.3} {y-s*.3}Z',col)
def scene(category,index):
 rng=random.Random(index*1741+CATEGORIES.index(category)*893+97)
 p=PALETTES[category][index%5];bg,shine,accent=p
 out=[]
 out.append('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="360" height="540" viewBox="0 0 360 540" role="img" aria-label="'+E(NAMES[category][index])+'">')
 out.append('<defs>')
 out.append(f'<linearGradient id="sky" x2="1" y2="1"><stop stop-color="{bg}"/><stop offset=".57" stop-color="#172944"/><stop offset="1" stop-color="#071626"/></linearGradient>')
 out.append(f'<radialGradient id="glow"><stop stop-color="{shine}" stop-opacity=".72"/><stop offset="1" stop-color="{shine}" stop-opacity="0"/></radialGradient>')
 out.append('<linearGradient id="skin" x2="1" y2="1"><stop stop-color="#ffe8cf"/><stop offset=".6" stop-color="#ebbaa9"/><stop offset="1" stop-color="#bf8f91"/></linearGradient>')
 out.append(f'<linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fff7cb"/><stop offset=".18" stop-color="{accent}"/><stop offset=".6" stop-color="{shine}"/><stop offset="1" stop-color="#394d60"/></linearGradient>')
 out.append(f'<linearGradient id="cloth" x2="0" y2="1"><stop stop-color="{shine}"/><stop offset="1" stop-color="#182c59"/></linearGradient>')
 out.append('<pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#ffffff" stroke-opacity=".055"/></pattern>')
 out.append('</defs>')
 out.append(rrect(0,0,360,540,'url(#sky)',0));out.append(rrect(0,0,360,540,'url(#grid)',0))
 out.append(circle(180+rng.randrange(-50,50),230+rng.randrange(-50,50),250,'url(#glow)'))
 for i in range(28):
  x=rng.randrange(12,350);y=rng.randrange(8,450);s=rng.choice([1,1,2,2,3,4]);out.append(circle(x,y,s,shine if i%3 else '#edf9ff'))
 for z in range(5):
  x=rng.randrange(0,340);y=rng.randrange(100,460);s=rng.randrange(5,13)
  if z%2==0:out.append(star(x,y,s,'#f2faff'))
 out.append(path('M0 440 Q70 390 145 449 Q225 391 360 435V540H0Z','#08192e'))
 out.append(ellipse(180,483,143,20,'#060e20'))
 if category=='anime-frauen':
  hair=rng.choice(['#261b35','#d1c78b','#698cc7','#b35b78','#774f41','#d6c8ec','#218e95','#a864be'])
  coat=rng.choice(['#2b3766','#682f75','#296367','#6b364d','#254884'])
  # Draped hair behind shoulders, cape and mirrored face.
  out.append(path('M104 229 Q88 144 148 125 Q216 99 255 168 Q286 240 266 391 Q231 450 117 409 Q92 343 104 229Z',hair,'#0a2037',6))
  out.append(path('M58 506 Q62 398 124 355 L232 355Q300 398 302 506Z','url(#cloth)','#aeccea',5))
  out.append(path('M89 502L125 369 178 421 238 366 268 503Z',coat,'#97cee2',3))
  out.append(path('M166 348 L166 391 Q182 405 194 389 L195 348Z','url(#skin)'))
  out.append(ellipse(181,265,80,111,'url(#skin)'))
  out.append(path('M99 243 Q84 178 134 149 Q156 108 200 137 Q249 140 266 208 L265 254 Q237 221 228 175 Q212 222 175 228Q129 217 105 265Z',hair,'#141f3c',5))
  for q in range(2):
   xx=146+65*q;out.append(ellipse(xx,277,14,19,'#f5feff'));out.append(ellipse(xx+((-1)**q)*3,278,7,13,shine));out.append(circle(xx+1,272,3,'#ffffff'))
  out.append(path('M163 321Q181 332 199 319','none','#ad6079',4))
  out.append(path('M140 246L155 242M208 243L224 247','none',hair,6))
  accessory=index%6
  if accessory==0:out.append(path('M181 140l9 -35 12 34 29 9 -28 12 -12 31 -11 -27 -30 -11Z',shine,'#fbfcff',2))
  elif accessory==1:out.append(circle(112,238,15,'#ffe2a2','#eee5ea',3))
  elif accessory==2:out.append(path('M107 375L80 420 99 429 130 380Z','#d5caef','#a9e0ee',3))
  elif accessory==3:out.append(star(245,162,20,'#f5efff'))
  elif accessory==4:out.append(path('M148 391L182 410 216 390 206 431 179 442 155 426Z','#d7e9ef','#627faf',4))
  else:out.append(circle(181,427,13,shine,'#e4f8ff',3))
  out.append(path('M109 350Q86 397 90 470','none',hair,16));out.append(path('M250 341Q276 390 268 463','none',hair,16))
 elif category=='anime-tiere':
  species=['fox','cat','otter','bird','lynx','rabbit','bear','deer','mouse','owl','fox','dragon','panda','seal','rabbit','wolf','badger','bird','otter','bird','turtle','deer','alpaca','panther','fox'][index]
  fur=rng.choice(['#f4cb9a','#bdcee7','#bba2e0','#d89d85','#acd9bc','#f5e8cc','#9eb7d9'])
  if species in ('fox','wolf'):fur=['#eeb67b','#90b6d2','#e1cfba','#b8a5d7'][index%4]
  if species=='panther':fur='#7d83af'
  dark=rng.choice(['#634f79','#344f67','#606077','#5c626a','#465b57'])
  if species in ('bird','owl'):
   out.append(path('M115 414Q72 351 105 276 Q134 200 180 217Q235 203 264 273Q295 345 254 422 Q185 470 115 414Z',fur,dark,7))
   out.append(path('M118 335L70 300Q63 391 124 403M242 336L291 303Q301 392 243 407',shine,dark,7))
   if species=='owl':out.append(path('M113 263L106 196 154 237M207 238L263 198 253 261',fur,dark,7))
   for x in [145,218]:out.append(circle(x,302,31,'#fbf9e5'));out.append(circle(x,305,18,'#23354b'));out.append(circle(x-5,296,7,'white'))
   out.append(path('M165 335L182 366 200 337Z','#e5a55f','#704e48',4))
   for i in range(3):out.append(path(f'M{144+i*19} 403L{137+i*22} 430','none','#f2d2a5',5))
  elif species=='turtle':
   out.append(ellipse(180,380,135,108,'#4d7d76'));out.append(ellipse(180,363,103,87,fur))
   out.append(path('M131 323L181 296 230 322 238 370 185 395 130 374Z','#91a882','#3b6562',6))
   out.append(ellipse(181,264,74,66,'#a3d3ae'))
   for x in [155,207]:out.append(circle(x,265,13,'#263857'));out.append(circle(x-4,260,5,'white'))
   out.append(path('M166 296Q181 310 198 296','none','#537d64',5))
   for x in [106,255]:out.append(circle(x,443,30,'#a3d3ae'))
  else:
   out.append(ellipse(180,412,103,100,'url(#cloth)'))
   if species in ('fox','cat','lynx','wolf','panther','dragon'):
    out.append(path('M93 251L93 140Q129 157 145 220 L214 220 264 140 264 259Z',fur,dark,8))
   elif species=='rabbit':
    out.append(path('M110 241Q70 137 106 85Q167 143 158 234M207 233Q225 132 263 84Q298 149 249 258',fur,dark,7))
    out.append(path('M127 218L114 133 146 217 M225 219L252 135 238 230','none','#ffc1ba',14))
   elif species=='deer':
    out.append(path('M109 249Q75 224 65 178Q123 181 148 239M216 239Q252 188 298 178Q299 224 255 254',fur,dark,6))
    out.append(path('M138 211L115 140 89 125M115 140 155 164M222 208L254 141 285 129M254 141 216 167','none','#e6d3aa',12))
   elif species=='mouse':
    out.append(circle(98,231,60,fur,dark,5));out.append(circle(264,232,60,fur,dark,5))
   elif species=='alpaca':
    out.append(path('M135 363L121 233Q111 195 169 170Q239 168 244 238L225 375Z',fur,dark,6))
    for x,y in [(122,199),(157,183),(197,184),(225,204)]:out.append(circle(x,y,25,fur))
   elif species in ('bear','panda','badger','otter','seal'):
    out.append(circle(100,244,39,fur,dark,5));out.append(circle(261,244,39,fur,dark,5))
   out.append(ellipse(180,291,108,118,fur))
   if species in ('panda','badger'):
    out.append(ellipse(137,291,34,42,'#64748b'));out.append(ellipse(220,291,34,42,'#64748b'))
   else:
    out.append(ellipse(137,291,27,37,'#fff7ee'));out.append(ellipse(220,291,27,37,'#fff7ee'))
   for x in [139,221]:out.append(ellipse(x,295,16,24,'#18334c'));out.append(circle(x-5,285,5,'white'))
   if species=='alpaca':out.append(ellipse(181,343,43,62,'#fff3e4'))
   elif species=='seal':out.append(ellipse(181,348,53,37,'#f8e9de'))
   else:out.append(ellipse(181,343,53,40,'#fff3e4'))
   out.append(path('M169 335Q180 322 194 335 L181 350Z',dark))
   out.append(path('M180 349Q167 369 154 356M180 349Q195 370 209 357','none',dark,4))
   if species in ('otter','seal','mouse','lynx'):
    for side in [-1,1]:
     xx=180+side*28
     out.append(path(f'M{xx} 346L{xx+side*62} 341M{xx} 355L{xx+side*67} 368','none','#d9ecee',3))
   out.append(path('M86 430Q65 390 57 426 M272 429Q299 391 311 433','none',fur,25))
   out.append(path('M110 409Q181 440 247 403L231 463Q178 488 129 458Z',shine,dark,4))
   for x in [127,237]:out.append(circle(x,359,10,'#ee9eb7'))
   if species=='dragon':out.append(path('M84 370Q25 326 44 263L81 298M271 375Q342 306 315 260L275 296',shine,dark,7))
   if index%3==0:out.append(star(181,436,22,'#fff1b5'))
   elif index%3==1:out.append(circle(182,449,14,'#cee3ff','#fff9d8',3))
   else:out.append(path('M161 444L179 425 199 444 179 468Z','#f8f1af'))
 elif category=='maschinen':
  mode=index%5
  field=rng.choice(['#31464c','#375342','#4b4739','#313c53'])
  out.append(path('M0 416Q120 368 360 401V540H0Z',field))
  out.append(path('M20 469L348 469M0 504L360 504','none','#91a26c',4))
  # geometric vehicle with cabin, visible metalwork and 3D-tilted outline
  cabx=152+mode*4
  out.append(path(f'M{cabx} 324L{cabx+16} 223 259 223 283 326Z','#6fa4b5','#071b2e',8))
  out.append(path(f'M{cabx+27} 245H246L263 313H{cabx+11}Z','#d3eff6','#456b8b',5))
  out.append(path('M69 316Q68 293 112 284L184 290 213 324H311L328 365 305 415H67Z','url(#metal)','#26344c',8))
  out.append(path('M100 336H194L209 386H88Z',shine,'#f7f0d3',6))
  out.append(path('M68 370L32 364 41 339 72 335Z',accent,'#1f3249',5))
  if mode==0:out.append(path('M309 354L348 338 359 365 334 400 314 402','url(#metal)','#213448',6))
  elif mode==1:out.append(path('M55 315L30 272 65 254 85 308','url(#metal)','#1e3248',6))
  elif mode==2:out.append(path('M317 346Q335 285 354 252','none','#efd488',14))
  elif mode==3:out.append(path('M48 355L26 323 27 392 49 419Z',shine,'#213448',4))
  else:out.append(path('M285 290L324 243 339 258 309 328','url(#metal)','#213448',5))
  for x,y,r in [(106,420,43),(279,421,51)]:
   out.append(circle(x,y,r,'#15202b','#a0bed1',8));out.append(circle(x,y,r-13,'#354454','#0f1825',5));out.append(circle(x,y,12,'url(#metal)'))
  out.append(rrect(101,307,67,12,'#e8f7ff',4));out.append(path('M148 319L196 319','none','#f5ffff',7))
  out.append(rrect(143,205,15,67,'#303942',2));out.append(circle(154,204,8,'#e0e9ea'))
 elif category=='monster':
  kind=index%5
  body=rng.choice(['#73bde3','#be8cdf','#e59487','#7abc99','#b3a2dc'])
  dark=rng.choice(['#342457','#264a68','#5a426a','#3a4b55'])
  if kind==0:out.append(path('M95 309Q35 177 76 138Q111 213 157 237M208 236Q253 155 302 141Q321 242 267 320',shine,dark,6))
  if kind==1:out.append(path('M104 227L73 150 130 180 169 226M213 218L266 163 286 204 257 262',body,dark,7))
  if kind==2:out.append(path('M110 242L115 113 153 198 M220 198L247 112 274 259',shine,dark,8))
  if kind==3:out.append(path('M99 306Q69 265 56 195Q125 215 141 289 M228 270Q295 218 310 191Q301 282 260 320',body,dark,6))
  if kind==4:out.append(path('M123 246Q95 184 88 121Q167 156 178 231M197 231Q231 176 260 120Q281 212 245 270',shine,dark,8))
  out.append(path('M88 343Q84 235 178 222Q270 215 282 333Q299 413 259 452L203 477 131 467 90 433Q65 381 88 343Z',body,dark,10))
  out.append(ellipse(177,310,77,66,'#f4faf6'))
  eyes=1+index%3
  for e in range(eyes):
   xx=177+(e-(eyes-1)/2)*52;yy=304 if e<2 else 315
   out.append(ellipse(xx,yy,16,24,'#17253b'));out.append(circle(xx-5,yy-8,5,'#fffef0'))
  out.append(path('M147 375Q181 397 210 376','none','#2a344b',8))
  if index%2:out.append(path('M146 376L156 397 170 387 182 402 194 389 207 378Z','#f1f9f8'))
  out.append(path('M110 419L73 462M248 423L288 460','none',body,23))
  out.append(circle(97,226,10,shine));out.append(star(270,218,19,'#f0e9ff'))
 # universal ornamental particles / aura
 out.append(path('M18 18V70 M18 18H70M342 470V522M342 522H288','none','#f2f6ff',3))
 out.append(f'<g opacity=".77">{star(48,97,15,shine)}{star(317,94,12,accent)}{star(47,362,10,accent)}</g>')
 out.append('</svg>')
 return ''.join(out)

def meta(category,index):
 name=NAMES[category][index]
 rarity=RANKS[index]
 place=['Nebelgärten','Sterneninseln','Wolkentäler','Kristallwald','Morgenebene'][index%5]
 if category=='anime-frauen':
  roles=['Sternensucherin','Waldhüterin','Lichtweberin','Himmelsbotin','Traumarchitektin']
  details={'figur':roles[index%5],'welt':place}
  description=f'{name} begleitet die Reisenden durch die {place} und schützt verborgene Wege.'
 elif category=='anime-tiere':
  species=['Fabeltier','Waldtier','Nachtgefährte','Lichtwesen','Bergtier']
  details={'tierart':species[index%5],'lebensraum':place}
  description=f'{name} wohnt nahe den {place}; sein Leuchten weist Freunden den Weg.'
 elif category=='maschinen':
  types=['Allradtraktor','Erntefahrzeug','Raupengerät','Waldmaschine','Speziallader']
  details={'marke':'Fiktive Serie','modell':types[index%5]+' '+str(index+1),'leistung':str(40+index*11)+' PS (Fantasiewert)'}
  description=f'{name} ist eine erfundene Arbeitsmaschine für außergewöhnliche Einsätze in den {place}.'
 else:
  elements=['Nebel','Glut','Eis','Sternenstaub','Wald']
  abilities=['Dämmerungssprung','Glutmantel','Frostschild','Sternenschweif','Wurzelruf']
  details={'element':elements[index%5],'faehigkeit':abilities[index%5]}
  description=f'{name} durchstreift die {place} und entfaltet die Kraft {abilities[index%5]}.'
 return {'categoryId':category,'number':index+1,'name':name,'rarity':rarity,'description':description,'details':details,
         'imageAsset':f'./assets/card-art/{category}/{index+1:03d}.svg',
         'templateId':f'template:{category}:v1','eventCard':False}

def main():
 all_cards=[]
 for category in CATEGORIES:
  folder=ART/category;folder.mkdir(parents=True,exist_ok=True)
  for index in range(25):
   source=scene(category,index)
   (folder/f'{index+1:03d}.svg').write_text(source,encoding='utf-8')
   all_cards.append(meta(category,index))
 output=ROOT/'assets'/'reward-series-data.js'
 # JS structure is versioned, with a frozen public catalog and no runtime generation.
 output.write_text('/** BW06: 100 original, fictional starter-card records; artwork separate from card frames. */\n'
   'export const BW06_STARTER_CARDS = Object.freeze('+json.dumps(all_cards,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8')
 (ROOT/'DOKUMENTATION'/'BW06_100_Karten_Daten.json').write_text(json.dumps(all_cards,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Generated',len(all_cards),'SVG cards across',len(CATEGORIES),'categories')
 print('Size',sum(p.stat().st_size for p in ART.rglob('*.svg')),'bytes')
if __name__=='__main__':main()
