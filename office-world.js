/* IT Company Tycoon · Ultimate 2.0 · Etap A: Żyjące biuro
   Moduł działa offline. Stan biura w state.officeWorld, animacja jest tylko prezentacją. */
'use strict';
const OFFICE_TILE = 62;
const OFFICE_ROOM_SIZES = [{cols:8,rows:6},{cols:11,rows:8},{cols:15,rows:10},{cols:20,rows:14},{cols:27,rows:19}];
const OFFICE_FURNITURE = {
  desk:{name:'Biurko z komputerem',emoji:'🖥️',cost:850,upkeep:12,seat:true,description:'Stanowisko dla jednej osoby.'},
  premium:{name:'Stanowisko premium',emoji:'💻',cost:2100,upkeep:26,seat:true,description:'Przypisany pracownik pracuje o 12% szybciej.'},
  plant:{name:'Roślina biurowa',emoji:'🪴',cost:300,upkeep:0,morale:2,description:'+2 pkt komfortu, do limitu.'},
  coffee:{name:'Ekspres do kawy',emoji:'☕',cost:650,upkeep:20,morale:3,description:'+3 pkt komfortu.'},
  lounge:{name:'Strefa relaksu',emoji:'🛋️',cost:1750,upkeep:65,morale:5,description:'+5 pkt komfortu zespołu.'},
  meeting:{name:'Sala spotkań',emoji:'📋',cost:4250,upkeep:110,team:.06,description:'+6% wydajności firmy (maks. 28%).'},
  server:{name:'Szafa serwerowa',emoji:'🗄️',cost:3600,upkeep:130,team:.07,description:'+7% wydajności firmy (maks. 28%).'},
  art:{name:'Dekoracja / plakat',emoji:'🎨',cost:950,upkeep:0,morale:2,description:'+2 pkt komfortu.'}
};
const OFFICE_ZONES={
  normal:{name:'Przestrzeń pracy',cost:0,upkeep:0,color:'transparent'},
  meeting:{name:'Sala konferencyjna',cost:280,upkeep:5,color:'rgba(126,110,226,.20)'},
  lounge:{name:'Strefa socjalna',cost:230,upkeep:4,color:'rgba(71,196,147,.18)'},
  server:{name:'Serwerownia',cost:320,upkeep:8,color:'rgba(78,171,218,.20)'}
};
const OFFICE_RENOVATIONS=[
  {name:'Odświeżenie i ergonomia',price:2800,bonus:.03,morale:1},
  {name:'Oświetlenie i akustyka',price:14000,bonus:.04,morale:2},
  {name:'Siedziba premium',price:58000,bonus:.06,morale:3}
];
const OFFICE_MODES = [{id:'inspect',label:'Podgląd'},{id:'build',label:'Buduj'},{id:'zone',label:'Pomieszczenia'},{id:'move',label:'Przesuń'},{id:'assign',label:'Przypisz'},{id:'sell',label:'Sprzedaj'}];
const officeUI={mode:'inspect',type:'desk',zone:'meeting',worker:'founder',moving:null,selected:null,zoom:1};
let officeAnimationFrame=null;
const officeActors=new Map();
let officeLastFrame=0;

function officeDimensions(level=state.office){return OFFICE_ROOM_SIZES[clamp(Math.floor(level)||0,0,4)];}
function officeMemberKey(id){return String(id);}
function createOfficeWorld(level=0){
  return {version:2,nextObjectId:2,renovation:0,zones:[],objects:[{id:1,type:'desk',x:2,y:2,seat:'founder',paid:false}]};
}
function officeObjectValid(o,d,known){
  return o&&typeof o==='object'&&Number.isInteger(o.id)&&o.id>0&&
    OFFICE_FURNITURE[o.type]&&Number.isInteger(o.x)&&Number.isInteger(o.y)&&
    o.x>=0&&o.y>=0&&o.x<d.cols&&o.y<d.rows&&
    !known.has(o.x+','+o.y);
}
function normalizeOfficeWorld(s){
  const dimensions=officeDimensions(s.office);
  const incoming=s.officeWorld;
  const legacy=!incoming||!Array.isArray(incoming.objects);
  if(legacy){
    s.officeWorld=createOfficeWorld(s.office);
    // Migracja dawnych rozgrywek: biurka obecnych pracowników były już częścią wyposażenia.
    for(const employee of s.employees){
      const used=new Set(s.officeWorld.objects.map(o=>o.x+','+o.y));
      let placed=false;
      for(let y=1;y<dimensions.rows-1&&!placed;y++)for(let x=1;x<dimensions.cols-1&&!placed;x++){
        if(!used.has(x+','+y)){
          s.officeWorld.objects.push({id:s.officeWorld.nextObjectId++,type:'desk',x,y,seat:employee.id,paid:false});
          placed=true;
        }
      }
    }
    return;
  }
  const used=new Set(),ids=new Set(),members=new Set();
  const permitted=new Set(['founder',...s.employees.map(e=>String(e.id))]);
  const cleaned=[];
  for(const original of incoming.objects.slice(0,500)){
    if(!officeObjectValid(original,dimensions,used)||ids.has(original.id))continue;
    const o={id:original.id,type:original.type,x:original.x,y:original.y,paid:original.paid===true};
    if(OFFICE_FURNITURE[o.type].seat&&permitted.has(String(original.seat))&&!members.has(String(original.seat))){
      o.seat=original.seat;
      members.add(String(original.seat));
    }else o.seat=null;
    cleaned.push(o);used.add(o.x+','+o.y);ids.add(o.id);
  }
  if(!cleaned.some(o=>o.seat==='founder')){
    const seat=cleaned.find(o=>OFFICE_FURNITURE[o.type].seat&&!o.seat);
    if(seat)seat.seat='founder';
  }
  const zones=[],keys=new Set();
  if(Array.isArray(incoming.zones))for(const z of incoming.zones.slice(0,500)){
    if(!z||!Number.isInteger(z.x)||!Number.isInteger(z.y)||z.x<0||z.y<0||z.x>=dimensions.cols||z.y>=dimensions.rows||
       officeIsDoorAt(z.x,z.y,dimensions)||!OFFICE_ZONES[z.type]||z.type==='normal'||keys.has(z.x+','+z.y))continue;
    zones.push({x:z.x,y:z.y,type:z.type});keys.add(z.x+','+z.y);
  }
  const renovation=Number.isInteger(incoming.renovation)?clamp(incoming.renovation,0,3):0;
  s.officeWorld={version:2,nextObjectId:Math.max(2,...cleaned.map(o=>o.id+1)),renovation,zones,objects:cleaned};
}
function officeItems(){return state.officeWorld?.objects||[];}
function officeZones(){return state.officeWorld?.zones||[];}
function officeZoneAt(x,y){return officeZones().find(z=>z.x===x&&z.y===y)?.type||'normal';}
function officeIsDoorAt(x,y,d){return y===d.rows-1&&(x===0||x===1);}
function officeZoneBonus(){
  let comfort=0,team=0;
  for(const o of officeItems()){
    const zone=officeZoneAt(o.x,o.y);
    if(zone==='meeting'&&o.type==='meeting')team+=.025;
    if(zone==='server'&&o.type==='server')team+=.025;
    if(zone==='lounge'&&['lounge','coffee','plant'].includes(o.type))comfort+=2;
  }
  return {comfort:Math.min(6,comfort),team:Math.min(.10,team)};
}
function officeRenovationBonus(){return OFFICE_RENOVATIONS.slice(0,state.officeWorld?.renovation||0).reduce((s,r)=>s+r.bonus,0);}
function officeRenovate(){
  const next=OFFICE_RENOVATIONS[state.officeWorld.renovation];
  if(!next){toast('Siedziba została już w pełni zmodernizowana.');return;}
  if(!spend(next.price,'Modernizacja siedziby: '+next.name,'Biuro 2D'))return;
  state.officeWorld.renovation++;
  log('Modernizacja siedziby: '+next.name+'.','good');
  markChanged('Modernizacja zakończona — wydajność i komfort wzrosły.');
}
function officeSetZone(type){
  if(!OFFICE_ZONES[type])return;
  officeUI.zone=type;officeUI.mode='zone';officeUI.moving=null;render();
}
function officePaintZone(x,y){
  const d=officeDimensions(),type=officeUI.zone;
  if(!OFFICE_ZONES[type]||x<0||y<0||x>=d.cols||y>=d.rows||officeIsDoorAt(x,y,d)){toast('Nie można urządzić pomieszczenia w tym miejscu.',true);return;}
  const previous=officeZoneAt(x,y);
  if(previous===type){toast('To pole ma już wybraną strefę.');return;}
  const config=OFFICE_ZONES[type];
  if(config.cost&&!spend(config.cost,'Wydzielenie strefy: '+config.name,'Biuro 2D'))return;
  state.officeWorld.zones=officeZones().filter(z=>!(z.x===x&&z.y===y));
  if(type!=='normal')state.officeWorld.zones.push({x,y,type});
  markChanged('Zmieniono przeznaczenie pomieszczenia.');
}
function officeSeats(){return officeItems().filter(o=>OFFICE_FURNITURE[o.type]?.seat);}
function officeMemberSeat(id){return officeSeats().find(o=>String(o.seat)===officeMemberKey(id));}
function officeAssignedCount(){return officeSeats().filter(o=>o.seat!==null&&o.seat!==undefined).length;}
function officeComfort(){
  let bonus=0;
  for(const o of officeItems())bonus+=(OFFICE_FURNITURE[o.type]?.morale||0);
  return Math.min(22,bonus+officeZoneBonus().comfort+OFFICE_RENOVATIONS.slice(0,state.officeWorld?.renovation||0).reduce((s,r)=>s+r.morale,0));
}
function officeTeamBonus(){
  let bonus=0;
  for(const o of officeItems())bonus+=(OFFICE_FURNITURE[o.type]?.team||0);
  return Math.min(.44,Math.min(.28,bonus)+officeZoneBonus().team+officeRenovationBonus());
}
function officeDeskPower(id){
  const seat=officeMemberSeat(id);
  return !seat ? .68 : seat.type==='premium'?1.12:1;
}
function officeWeeklyUpkeep(){return officeItems().reduce((sum,o)=>sum+(OFFICE_FURNITURE[o.type]?.upkeep||0),0)+officeZones().reduce((sum,z)=>sum+(OFFICE_ZONES[z.type]?.upkeep||0),0)+(state.officeWorld?.renovation||0)*35;}
function officeWeeklyMorale(){
  const comfort=officeComfort();
  const shortage=Math.max(0,state.employees.length+1-officeAssignedCount());
  const overcrowd=officeSeats().length>0&&state.employees.length+1>officeSeats().length;
  const delta=clamp(Math.round(comfort/3),0,7)-(overcrowd?2:0)-(shortage>0?Math.min(3,shortage):0);
  for(const e of state.employees)e.happiness=clamp((Number(e.happiness)||70)+delta,30,100);
  return delta;
}
function officeSyncTeam(){
  const active=new Set(['founder',...state.employees.map(e=>String(e.id))]);
  for(const desk of officeSeats())if(desk.seat!=null&&!active.has(String(desk.seat)))desk.seat=null;
  officeAutoAssign(false);
}
function officeAutoAssign(notify=true){
  const taken=new Set(officeSeats().filter(o=>o.seat!=null).map(o=>String(o.seat)));
  let count=0;
  for(const member of ['founder',...state.employees.map(e=>e.id)]){
    if(taken.has(String(member)))continue;
    const free=officeSeats().find(o=>o.seat==null);
    if(!free)break;
    free.seat=member;taken.add(String(member));count++;
  }
  if(notify){save();render();toast(count?`Przydzielono ${count} stanowisk.`:'Brak wolnych biurek do przydzielenia.');}
  return count;
}
function officeOnFire(id){
  for(const o of officeSeats())if(String(o.seat)===String(id))o.seat=null;
  officeActors.delete(String(id));
}
function officeOnHire(){officeAutoAssign(false);}
function officeOnUpgrade(){
  officeActors.clear();
  officeUI.moving=null;officeUI.selected=null;
}
function officeItemAt(x,y){return officeItems().find(o=>o.x===x&&o.y===y);}
function officeIsDoor(x,y){return officeIsDoorAt(x,y,officeDimensions());}
function officeCellAllowed(x,y,ignoreId=null){
  const d=officeDimensions();
  return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<d.cols&&y<d.rows&&
    !officeIsDoor(x,y)&&!officeItems().some(o=>o.id!==ignoreId&&o.x===x&&o.y===y);
}
function officePlace(type,x,y){
  const f=OFFICE_FURNITURE[type];
  if(!f||!officeCellAllowed(x,y)){toast('Nie możesz tutaj postawić przedmiotu.',true);return;}
  if(officeItems().length>=400){toast('Limit wyposażenia biura został osiągnięty.',true);return;}
  if(!spend(f.cost,'Wyposażenie biura: '+f.name,'Biuro 2D'))return;
  const item={id:state.officeWorld.nextObjectId++,type,x,y,paid:true,seat:null};
  officeItems().push(item);
  if(f.seat)officeAutoAssign(false);
  log(`Kupiono: ${f.name} (${money(f.cost)}).`,'good');
  markChanged('Wyposażenie dodane do biura.');
}
function officeMove(id,x,y){
  const o=officeItems().find(o=>o.id===id);
  if(!o||!officeCellAllowed(x,y,id)){toast('To miejsce jest zajęte lub niedostępne.',true);return;}
  o.x=x;o.y=y;officeUI.moving=null;officeUI.selected=id;
  markChanged('Przedmiot został przeniesiony.');
}
function officeSell(id){
  const o=officeItems().find(o=>o.id===id);
  if(!o){toast('Wybierz przedmiot, który chcesz sprzedać.',true);return;}
  const f=OFFICE_FURNITURE[o.type];
  const refund=o.paid?Math.round(f.cost*.4):0;
  if(!confirm(`Sprzedać „${f.name}” za ${money(refund)}? ${o.seat!=null?'Pracownik straci przypisane stanowisko.':''}`))return;
  state.officeWorld.objects=officeItems().filter(i=>i.id!==id);
  if(refund){state.cash+=refund;state.ledger.unshift({day:state.day,amount:refund,title:'Sprzedaż wyposażenia: '+f.name,category:'Biuro 2D'});state.ledger=state.ledger.slice(0,100);}
  officeUI.selected=null;officeUI.moving=null;
  log('Sprzedano wyposażenie: '+f.name+'.');
  markChanged('Przedmiot sprzedany.');
}
function officeAssign(id,x,y){
  const obj=officeItemAt(x,y);
  if(!obj||!OFFICE_FURNITURE[obj.type].seat){toast('Wybierz biurko na planie biura.',true);return;}
  if(!['founder',...state.employees.map(e=>String(e.id))].includes(String(id))){toast('Nie znaleziono pracownika.',true);return;}
  const other=officeMemberSeat(id);
  if(other&&other.id!==obj.id)other.seat=null;
  obj.seat=id==='founder'?'founder':Number(id);
  officeUI.selected=obj.id;
  markChanged('Pracownik został przypisany do stanowiska.');
}
function officePerformClick(x,y){
  const item=officeItemAt(x,y);
  if(officeUI.mode==='build')return officePlace(officeUI.type,x,y);
  if(officeUI.mode==='zone')return officePaintZone(x,y);
  if(officeUI.mode==='move'){
    if(officeUI.moving!=null){
      if(item?.id===officeUI.moving){officeUI.moving=null;render();return;}
      return officeMove(officeUI.moving,x,y);
    }
    if(!item){toast('Kliknij przedmiot, który chcesz przesunąć.',true);return;}
    officeUI.moving=item.id;officeUI.selected=item.id;render();return;
  }
  if(officeUI.mode==='assign')return officeAssign(officeUI.worker,x,y);
  if(officeUI.mode==='sell')return officeSell(item?.id);
  officeUI.selected=item?.id||null;render();
}
function officeSetMode(mode,option){
  if(!OFFICE_MODES.some(m=>m.id===mode))return;
  officeUI.mode=mode;officeUI.moving=null;
  if(mode==='build'&&OFFICE_FURNITURE[option])officeUI.type=option;
  render();
}
function officeSetWorker(member){
  if(!['founder',...state.employees.map(e=>String(e.id))].includes(String(member)))return;
  officeUI.worker=String(member);officeUI.mode='assign';officeUI.moving=null;render();
}
function officeZoom(zoom){
  officeUI.zoom=clamp(Number(zoom)||1,.55,1.3);render();
}
function officeView2d(){
  const w=state.officeWorld;
  const seats=officeSeats();
  const assigned=officeAssignedCount();
  const active=officeUI.selected!=null?officeItems().find(o=>o.id===officeUI.selected):null;
  const missing=Math.max(0,state.employees.length+1-assigned);
  const renovation=OFFICE_RENOVATIONS[state.officeWorld.renovation];
  const tools=Object.entries(OFFICE_FURNITURE).map(([k,f])=>`<button class="office-shop-item ${officeUI.mode==='build'&&officeUI.type===k?'selected':''}" data-action="office-item" data-type="${k}" title="${esc(f.description)}"><span class="shop-emoji">${f.emoji}</span><span class="shop-copy"><b>${esc(f.name)}</b><small>${esc(f.description)}</small></span><strong>${money(f.cost)}</strong></button>`).join('');
  const members=[{id:'founder',name:'Ty — założyciel',role:'CEO / Programista'},...state.employees];
  const team=members.map(p=>`<button class="office-member ${officeUI.mode==='assign'&&String(officeUI.worker)===String(p.id)?'active':''}" data-action="office-member" data-member="${esc(p.id)}"><span class="office-avatar">${esc(p.name.charAt(0))}</span><span><b>${esc(p.name)}</b><small>${esc(p.role||'Pracownik')}</small></span><em class="${officeMemberSeat(p.id)?'positive':'warning'}">${officeMemberSeat(p.id)?'Przy biurku':'Bez biurka'}</em></button>`).join('');
  return `${header('Żyjące biuro 2D','Projektuj przestrzeń, obserwuj pracowników i podnoś wydajność firmy.',button('nav','Zmień siedzibę','secondary','data-view="office"','building'))}
  <div class="office-kpi-grid">
    ${metric('Wykorzystane biurka',`${assigned} / ${seats.length}`,'Z założycielem · '+(missing?missing+' osób bez biurka':'wszyscy mają miejsce'),'users','cyan')}
    ${metric('Premia zespołowa',`+${Math.round(officeTeamBonus()*100)}%`,'Wyposażenie, strefy i remonty','zap','green')}
    ${metric('Komfort biura',`${officeComfort()} / 22`,'Wpływa na morale co tydzień','building')}
    ${metric('Utrzymanie biura',money(officeWeeklyUpkeep()),'Dodatkowy koszt tygodniowy','wallet')}
  </div>
  <div class="office-playground">
    <section class="panel office-world-panel"><div class="panel-head office-world-head"><div><h2>${esc(OFFICES[state.office].name)}</h2><p>Klikaj pola na planie. Przesuwaj się po mapie na mniejszych ekranach.</p></div><div class="office-zoom">${[.7,1,1.3].map(z=>`<button data-action="office-zoom" data-zoom="${z}" class="office-zoom-button ${officeUI.zoom===z?'active':''}">${Math.round(z*100)}%</button>`).join('')}</div></div>
      <div class="office-tools" role="group" aria-label="Tryb projektowania biura">${OFFICE_MODES.map(m=>`<button class="office-tool ${officeUI.mode===m.id?'active':''}" data-action="office-mode" data-mode="${m.id}">${esc(m.label)}</button>`).join('')}</div>
      <div class="office-zones">${Object.entries(OFFICE_ZONES).map(([k,z])=>`<button class="office-zone-chip ${officeUI.mode==='zone'&&officeUI.zone===k?'active':''}" data-action="office-zone" data-zone="${k}"><i style="background:${z.color==='transparent'?'#345062':z.color}"></i>${esc(z.name)} · ${money(z.cost)}/pole</button>`).join('')}</div>
      <div class="office-hint" id="office-hint">${officeModeHint()}</div>
      <div class="office-scroll" id="office-scroll"><canvas id="office-canvas" aria-label="Interaktywny plan biura; kliknij pole, aby wykonać akcję" role="img"></canvas></div>
      <div class="office-legend"><span><i class="office-dot working"></i> Praca</span><span><i class="office-dot free"></i> Bez stanowiska</span><span><i class="office-dot break"></i> Przerwa</span><span>🚪 Wejście</span></div>
    </section>
    <aside class="office-side"><section class="panel"><div class="panel-head"><div><h2>Sklep z wyposażeniem</h2><p>Wybierz przedmiot, a potem wolne pole na planie.</p></div></div><div class="office-shop">${tools}</div></section>
      <section class="panel"><div class="panel-head"><div><h2>Przydziel pracowników</h2><p>Wybierz osobę, a następnie jej biurko.</p></div>${button('office-auto','Auto','secondary')}</div><div class="office-team-list">${team}</div></section>
      <section class="panel"><div class="panel-head"><div><h2>Wybrany przedmiot</h2><p>Szczegóły klikniętego wyposażenia</p></div></div>
       ${active?`<div class="office-selected-card"><span>${OFFICE_FURNITURE[active.type].emoji}</span><div><b>${esc(OFFICE_FURNITURE[active.type].name)}</b><small>Pozycja: ${active.x+1}, ${active.y+1}</small>${OFFICE_FURNITURE[active.type].seat?`<small>Stanowisko: ${esc(active.seat==='founder'?'Założyciel':state.employees.find(e=>String(e.id)===String(active.seat))?.name||'Wolne')}</small>`:''}</div></div>`:'<p class="tiny muted">Kliknij mebel w trybie „Podgląd”.</p>'}
      </section>
    </aside>
  </div>
  <section class="panel section-space"><div class="panel-head"><div><h2>Modernizacja powierzchni biurowej</h2><p>Remont obejmuje całą siedzibę. Bonusy sumują się, a koszty utrzymania rosną.</p></div><span class="pill ${renovation?'blue':'green'}">Etap ${state.officeWorld.renovation} / 3</span></div>
    <div class="office-renovate"><div><strong>${renovation?esc(renovation.name):'Pełna modernizacja ukończona'}</strong><p>${renovation?`Premia +${Math.round(renovation.bonus*100)}% wydajności i +${renovation.morale} komfortu · ${money(renovation.price)}.`:'Wszystkie dostępne modernizacje zostały ukończone.'}</p></div>${renovation?button('office-renovate','Modernizuj · '+money(renovation.price),'primary',state.cash<renovation.price?'disabled':'','zap'):''}</div>
  </section>
  <section class="panel section-space"><div class="panel-head"><div><h2>Jak działa wyposażenie?</h2><p>Ulepszenia mają rzeczywisty wpływ na symulację.</p></div></div><div class="office-explainer"><div><strong>Biurka</strong><p>Pracownik bez przypisanego biurka działa z wydajnością 68%. Stanowisko premium podnosi wydajność osoby o 12%.</p></div><div><strong>Komfort</strong><p>Rośliny, kawa i wypoczynek podnoszą morale przy rozliczeniu tygodnia. Braki stanowisk je obniżają.</p></div><div><strong>Infrastruktura</strong><p>Serwery i sale spotkań przyspieszają wszystkie projekty (łącznie maks. +28%). Każdy mebel może mieć koszt utrzymania.</p></div></div></section>`;
}
function officeModeHint(){
  if(officeUI.mode==='build')return `Tryb budowania: <strong>${esc(OFFICE_FURNITURE[officeUI.type].name)}</strong> — kliknij wolne pole. Cena ${money(OFFICE_FURNITURE[officeUI.type].cost)}.`;
  if(officeUI.mode==='zone')return `Pomieszczenia: <strong>${esc(OFFICE_ZONES[officeUI.zone].name)}</strong>. Maluj pola na podłodze. Strefy wzmacniają odpowiednie wyposażenie.`;
  if(officeUI.mode==='move')return officeUI.moving!=null?'Przesuwanie: wybierz nowe wolne pole. Kliknij przesuwany mebel ponownie, by anulować.':'Przesuwanie: wybierz mebel, następnie jego nowe miejsce (bez kosztów).';
  if(officeUI.mode==='assign')return `Przydział: <strong>${esc(officeUI.worker==='founder'?'Założyciel':state.employees.find(e=>String(e.id)===String(officeUI.worker))?.name||'Pracownik')}</strong> — kliknij biurko.`;
  if(officeUI.mode==='sell')return 'Sprzedaż: kliknij mebel i potwierdź. Zwrot wynosi 40% ceny płatnego wyposażenia.';
  return 'Podgląd: kliknij mebel, by sprawdzić szczegóły. Rozbudowę rozpocznij przez „Sklep z wyposażeniem”.';
}

// Rysowanie świata gry: jedna aktywna animacja, bez aktualizacji ekonomii w requestAnimationFrame.
function officeResizeCanvas(){
  const canvas=document.querySelector('#office-canvas');if(!canvas)return;
  const d=officeDimensions();
  const worldW=d.cols*OFFICE_TILE,worldH=d.rows*OFFICE_TILE;
  canvas.width=worldW;canvas.height=worldH;
  canvas.style.width=Math.round(worldW*officeUI.zoom)+'px';
  canvas.style.height=Math.round(worldH*officeUI.zoom)+'px';
  if(officeAnimationFrame===null){officeLastFrame=performance.now();officeAnimationFrame=requestAnimationFrame(officeLoop);}
}
function officeLoop(t){
  const canvas=document.getElementById('office-canvas');
  if(!canvas||!state||view!=='office2d'){officeAnimationFrame=null;return;}
  officeAnimationFrame=requestAnimationFrame(officeLoop);
  if(document.hidden){officeLastFrame=t;return;}
  const dt=Math.min(.06,Math.max(0,(t-officeLastFrame)/1000));
  officeLastFrame=t;
  officeDraw(canvas.getContext('2d'),dt,t);
}
function officeRounded(ctx,x,y,w,h,r=7){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
function officePaint(ctx,x,y,w,h,color,r=6){ctx.fillStyle=color;officeRounded(ctx,x,y,w,h,r);ctx.fill();}
function officeText(ctx,s,x,y,size=22,color='#f1f5ff'){
  ctx.fillStyle=color;ctx.font=`${size}px system-ui,Segoe UI Emoji,sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,x,y);
}
function officeDrawItem(ctx,o,t){
  const x=o.x*OFFICE_TILE,y=o.y*OFFICE_TILE;
  const f=OFFICE_FURNITURE[o.type];
  ctx.save();ctx.shadowColor='#04111b';ctx.shadowBlur=10;ctx.shadowOffsetY=4;
  if(o.type==='desk'||o.type==='premium'){
    officePaint(ctx,x+7,y+16,49,37,o.type==='premium'?'#395d83':'#785d54',7);
    ctx.shadowBlur=0;officePaint(ctx,x+15,y+9,32,23,o.type==='premium'?'#3ccad6':'#273f6b',4);
    officePaint(ctx,x+18,y+12,26,16,'#17253d',3);
    officePaint(ctx,x+25,y+32,12,3,'#e0e8f4',1);
    officePaint(ctx,x+15,y+49,33,6,'#384557',2);
    if(o.type==='premium'){ctx.strokeStyle='#6af1ed';ctx.lineWidth=2;ctx.strokeRect(x+18,y+12,26,16);}
  } else if(o.type==='plant'){
    officePaint(ctx,x+18,y+36,28,18,'#b9825b',5);officeText(ctx,'🌿',x+32,y+25,30);
  } else if(o.type==='coffee'){
    officePaint(ctx,x+9,y+18,45,31,'#425770',5);officeText(ctx,'☕',x+32,y+32,28);
  } else if(o.type==='lounge'){
    officePaint(ctx,x+5,y+15,54,37,'#436989',11);officePaint(ctx,x+7,y+9,50,17,'#507eaa',9);officePaint(ctx,x+9,y+26,45,18,'#648eb8',6);
  } else if(o.type==='server'){
    officePaint(ctx,x+16,y+5,31,53,'#2b3950',5);for(let i=0;i<4;i++){officePaint(ctx,x+21,y+10+i*11,21,8,'#131f32',2);officePaint(ctx,x+23,y+12+i*11,3,3,i%2?'#43d5a8':'#67b2f6',2);}
  } else if(o.type==='meeting'){
    officePaint(ctx,x+5,y+20,52,27,'#99745a',12);officePaint(ctx,x+18,y+10,24,8,'#445d7b',4);officePaint(ctx,x+18,y+50,24,7,'#445d7b',4);officeText(ctx,'📋',x+32,y+33,23);
  } else if(o.type==='art'){
    officePaint(ctx,x+10,y+10,43,43,'#895f93',4);officePaint(ctx,x+14,y+14,35,35,'#a9bce8',2);officeText(ctx,'✦',x+32,y+31,29,'#354c85');
  }
  ctx.restore();
  if(o.id===officeUI.selected||o.id===officeUI.moving){ctx.lineWidth=3;ctx.strokeStyle='#5aecd4';ctx.strokeRect(x+2,y+2,OFFICE_TILE-4,OFFICE_TILE-4);}
  if(f.seat&&o.seat==null){ctx.fillStyle='#80a0b8';ctx.beginPath();ctx.arc(x+53,y+10,4,0,7);ctx.fill();}
}
function officeGridOpen(x,y){
  const d=officeDimensions();return x>=0&&y>=0&&x<d.cols&&y<d.rows&&!officeItems().some(o=>o.x===x&&o.y===y);
}
function officeSeatNeighbour(o){
  const dirs=[[0,1],[1,0],[-1,0],[0,-1]];
  for(const [dx,dy] of dirs){if(officeGridOpen(o.x+dx,o.y+dy))return [o.x+dx,o.y+dy];}
  return [o.x,o.y];
}
function officePath(start,end){
  const d=officeDimensions();
  const s=[clamp(Math.round(start[0]),0,d.cols-1),clamp(Math.round(start[1]),0,d.rows-1)];
  const dest=[clamp(Math.round(end[0]),0,d.cols-1),clamp(Math.round(end[1]),0,d.rows-1)];
  const k=(x,y)=>x+','+y,root=k(...s),goal=k(...dest);
  if(root===goal)return [dest];
  const q=[s],prev=new Map([[root,null]]);
  for(let i=0;i<q.length&&i<d.cols*d.rows;i++){
    const [x,y]=q[i];
    for(const [dx,dy] of [[0,1],[1,0],[-1,0],[0,-1]]){
      const nx=x+dx,ny=y+dy,nk=k(nx,ny);
      if(prev.has(nk)||(!officeGridOpen(nx,ny)&&nk!==goal))continue;
      prev.set(nk,k(x,y));q.push([nx,ny]);if(nk===goal){
        const result=[];let current=nk;
        while(current&&current!==root){result.unshift(current.split(',').map(Number));current=prev.get(current);}
        return result;
      }
    }
  }
  return [dest];
}
function officeEntry(){const d=officeDimensions();return [1,d.rows-2];}
function officeActorTarget(member){
  const seat=officeMemberSeat(member);
  if(seat){return officeSeatNeighbour(seat);}
  const d=officeDimensions();
  const preferred=[1+Math.floor(Math.random()*(d.cols-2)),1+Math.floor(Math.random()*(d.rows-2))];
  return officeGridOpen(...preferred)?preferred:officeEntry();
}
function officeActorsSync(){
  const ids=['founder',...state.employees.map(e=>String(e.id))];
  const valid=new Set(ids);
  for(const k of officeActors.keys())if(!valid.has(k))officeActors.delete(k);
  for(const id of ids)if(!officeActors.has(id)){
    const seat=officeMemberSeat(id);
    const [x,y]=seat?officeSeatNeighbour(seat):officeEntry();
    officeActors.set(id,{x,y,path:[],next:0,cooldown:2+Math.random()*2,phase:Math.random()*6.3});
  }
}
function officeDrawActor(ctx,id,a,dt,t){
  a.cooldown-=dt;
  if(a.cooldown<=0&&!a.path.length){
    let dest=officeActorTarget(id);
    const seat=officeMemberSeat(id);
    // Zdarza się, że pracownik idzie po kawę lub na przerwę, a następnie wraca.
    if(seat&&Math.random()<.12){
      const social=officeItems().filter(o=>['lounge','coffee'].includes(o.type));
      if(social.length)dest=officeSeatNeighbour(pick(social));
    }
    a.path=officePath([a.x,a.y],dest);a.cooldown=4+Math.random()*4;
  }
  if(a.path.length){
    const target=a.path[0],dx=target[0]-a.x,dy=target[1]-a.y,dist=Math.hypot(dx,dy);
    const step=Math.min(dist,dt*1.7);
    if(dist<.04){a.x=target[0];a.y=target[1];a.path.shift();}
    else {a.x+=dx/dist*step;a.y+=dy/dist*step;}
  }
  const x=(a.x+.5)*OFFICE_TILE,y=(a.y+.55)*OFFICE_TILE;
  const employed=id!=='founder';
  const e=employed?state.employees.find(p=>String(p.id)===id):null;
  const hasSeat=!!officeMemberSeat(id);
  const atWork=hasSeat&&!a.path.length;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=7;
  ctx.fillStyle='#111e30';ctx.beginPath();ctx.ellipse(x,y+19,13,5,0,0,7);ctx.fill();
  ctx.shadowBlur=0;
  const bob=a.path.length?Math.sin(t/120+a.phase)*1.5:Math.sin(t/510+a.phase)*.5;
  officePaint(ctx,x-9,y+1+bob,18,19,id==='founder'?'#4cdbc4':(Number(id)%3===0?'#8498f0':Number(id)%3===1?'#e29f6c':'#5a93db'),6);
  ctx.fillStyle=employed?'#f4caaa':'#edc3a4';ctx.beginPath();ctx.arc(x,y-7+bob,9,0,7);ctx.fill();
  ctx.fillStyle=e?.happiness<48?'#775069':'#2a3047';ctx.beginPath();ctx.arc(x,y-11+bob,8,Math.PI,Math.PI*2);ctx.fill();
  if(atWork){
    officePaint(ctx,x+11,y-24,12,12,'#1c7f8b',4);officeText(ctx,'⌨',x+17,y-18,10,'#e0fffc');
  }else if(!hasSeat){officePaint(ctx,x+10,y-23,11,11,'#b67f39',4);officeText(ctx,'!',x+15,y-17,10);}
  if(e?.happiness<45){officeText(ctx,'☁',x-12,y-28,14,'#e98ca0');}
  ctx.restore();
}
function officeDraw(ctx,dt,t){
  if(!ctx)return;
  const d=officeDimensions(),W=d.cols*OFFICE_TILE,H=d.rows*OFFICE_TILE;
  const zoneMap=new Map(officeZones().map(z=>[z.x+','+z.y,z.type]));
  const zoneAt=(x,y)=>zoneMap.get(x+','+y)||'normal';
  ctx.clearRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#16283b');g.addColorStop(1,'#122039');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let y=0;y<d.rows;y++)for(let x=0;x<d.cols;x++){
    ctx.fillStyle=(x+y)%2?'#223a4c':'#264255';
    ctx.fillRect(x*OFFICE_TILE+2,y*OFFICE_TILE+2,OFFICE_TILE-4,OFFICE_TILE-4);
    ctx.fillStyle='rgba(124,172,194,.11)';ctx.fillRect(x*OFFICE_TILE+2,y*OFFICE_TILE+2,OFFICE_TILE-4,1);
    const zone=zoneAt(x,y);
    if(zone!=='normal'){ctx.fillStyle=OFFICE_ZONES[zone].color;ctx.fillRect(x*OFFICE_TILE+2,y*OFFICE_TILE+2,OFFICE_TILE-4,OFFICE_TILE-4);}
    if(officeIsDoor(x,y)){
      officePaint(ctx,x*OFFICE_TILE+5,y*OFFICE_TILE+5,OFFICE_TILE-10,OFFICE_TILE-10,'#1a5560',5);
      officeText(ctx,'🚪',x*OFFICE_TILE+31,y*OFFICE_TILE+31,27);
    }
  }
  // Delikatne ścianki wyznaczają granice pomieszczeń, pozostawiając przejścia.
  for(const z of officeZones()){
    const px=z.x*OFFICE_TILE,py=z.y*OFFICE_TILE;
    ctx.strokeStyle=z.type==='meeting'?'#8173c4':z.type==='lounge'?'#56b09c':'#4c8eae';
    ctx.lineWidth=3;
    if(zoneAt(z.x-1,z.y)!==z.type){ctx.beginPath();ctx.moveTo(px+3,py+4);ctx.lineTo(px+3,py+OFFICE_TILE-4);ctx.stroke();}
    if(zoneAt(z.x,z.y-1)!==z.type){ctx.beginPath();ctx.moveTo(px+4,py+3);ctx.lineTo(px+OFFICE_TILE-4,py+3);ctx.stroke();}
  }
  ctx.fillStyle='#7bb1bf';ctx.fillRect(0,0,W,6);ctx.fillRect(0,0,6,H);
  ctx.fillStyle='#385971';ctx.fillRect(W-7,0,7,H);ctx.fillRect(0,H-7,W,7);
  for(let x=1;x<d.cols-1;x+=3){officePaint(ctx,x*OFFICE_TILE+8,0,OFFICE_TILE-16,7,'#77d6ec',2);}
  for(const o of officeItems())officeDrawItem(ctx,o,t);
  officeActorsSync();
  const entries=[['founder',{name:'Założyciel'}],...state.employees.map(e=>[String(e.id),e])];
  for(const [id] of entries){const a=officeActors.get(id);if(a)officeDrawActor(ctx,id,a,dt,t);}
  if(officeUI.mode==='build'){
    // Ostatnio zaznaczone pole podświetlane jest przez hover w osobnej funkcji.
  }
}
function officeCanvasClick(e){
  const canvas=e.target.closest('#office-canvas');if(!canvas||!state||state.gameOver)return;
  const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  const x=Math.floor((e.clientX-r.left)/r.width*canvas.width/OFFICE_TILE);
  const y=Math.floor((e.clientY-r.top)/r.height*canvas.height/OFFICE_TILE);
  officePerformClick(x,y);
}
