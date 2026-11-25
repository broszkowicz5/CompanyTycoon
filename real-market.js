/* IT COMPANY TYCOON · Real Market 3.1 · wirtualny handel na rzeczywistych danych.
   Cena nigdy nie jest generowana losowo. Brak API = brak aktualnego kursu. */
'use strict';

const REAL_CATALOG = [
  ['AAPL.US','Apple','USA','USD'],['MSFT.US','Microsoft','USA','USD'],['NVDA.US','NVIDIA','USA','USD'],
  ['TSLA.US','Tesla','USA','USD'],['AMZN.US','Amazon','USA','USD'],['GOOGL.US','Alphabet','USA','USD'],
  ['META.US','Meta Platforms','USA','USD'],['NFLX.US','Netflix','USA','USD'],['AMD.US','AMD','USA','USD'],
  ['INTC.US','Intel','USA','USD'],['KO.US','Coca-Cola','USA','USD'],['JPM.US','JPMorgan Chase','USA','USD'],
  ['V.US','Visa','USA','USD'],['WMT.US','Walmart','USA','USD'],['IBM.US','IBM','USA','USD'],
  ['CDR.WAR','CD Projekt','GPW','PLN'],['PKN.WAR','ORLEN','GPW','PLN'],['PKO.WAR','PKO Bank Polski','GPW','PLN'],
  ['KGH.WAR','KGHM','GPW','PLN'],['PZU.WAR','PZU','GPW','PLN'],['DNP.WAR','Dino Polska','GPW','PLN'],
  ['ALE.WAR','Allegro','GPW','PLN'],['ACP.WAR','Asseco Poland','GPW','PLN'],['OPL.WAR','Orange Polska','GPW','PLN'],
  ['MBK.WAR','mBank','GPW','PLN'],['LPP.WAR','LPP','GPW','PLN'],['BDX.WAR','Budimex','GPW','PLN'],
  ['KTY.WAR','Grupa Kęty','GPW','PLN'],['JSW.WAR','JSW','GPW','PLN'],['PGE.WAR','PGE','GPW','PLN']
].map(([symbol,name,exchange,currency])=>({symbol,name,exchange,currency}));
const REAL_BY_SYMBOL = new Map(REAL_CATALOG.map(s=>[s.symbol,s]));
const REAL_API = '/.netlify/functions/real-market';
const REAL_REFRESH_MS = 5*60*1000; // 5 min, a nie co klatkę gry; dostosuj do wykupionej licencji.
const REAL_QUOTE_MAX_AGE_MS=45*60*1000; // Tylko bieżące dane mogą służyć do wirtualnego handlu.
const REAL_FX_MAX_AGE_MS=4*24*60*60*1000;
const realUi={loading:false,historyLoading:false,error:'',status:null,lastAttempt:0,exchange:'USA',search:'',qty:1,side:'buy',refreshing:false,lastSyncTime:0};
const plnCents=n=>new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
const nativeCents=(cents,currency)=>new Intl.NumberFormat('pl-PL',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
const realFormatDate=ms=>ms?new Date(ms).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'brak';
const realPct=n=>Number.isFinite(n)?`${n>=0?'+':''}${n.toFixed(2).replace('.',',')}%`:'—';
function createRealMarket(){return {version:1,holdings:{},trades:[],quotes:{},history:{},watch:[],selected:'AAPL.US',range:30,
  realizedCents:0,feesCents:0,fx:null,cashRemainderCents:0};}
function normalizeRealMarket(s){
  const def=createRealMarket(), old=s.realMarket;
  if(!old||typeof old!=='object'||Array.isArray(old)){s.realMarket=def;return;}
  const m={...def,...old};
  m.holdings={};
  if(old.holdings && typeof old.holdings==='object')for(const [sym,h] of Object.entries(old.holdings)){
    if(!REAL_BY_SYMBOL.has(sym)||!h||!Number.isSafeInteger(h.qty)||h.qty<=0||h.qty>100000000||!Number.isSafeInteger(h.costCents)||h.costCents<0)continue;
    m.holdings[sym]={qty:h.qty,costCents:h.costCents};
  }
  m.quotes={};
  if(old.quotes&&typeof old.quotes==='object')for(const [sym,q] of Object.entries(old.quotes)){
    if(!REAL_BY_SYMBOL.has(sym)||!q||!Number.isSafeInteger(q.priceCents)||q.priceCents<=0||!Number.isFinite(q.timestamp)||q.timestamp<1262304000000)continue;
    m.quotes[sym]={symbol:sym,priceCents:q.priceCents,previousCents:Number.isSafeInteger(q.previousCents)?q.previousCents:null,
      timestamp:q.timestamp,changePct:Number.isFinite(q.changePct)?q.changePct:null,source:'EODHD Live (Delayed)',kind:'delayed'};
  }
  m.history={};
  if(old.history&&typeof old.history==='object')for(const [sym,entry] of Object.entries(old.history).slice(-5)){
    if(!REAL_BY_SYMBOL.has(sym)||!entry||!Array.isArray(entry.points))continue;
    const points=entry.points.slice(-400).filter(p=>p&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isSafeInteger(p.closeCents)&&p.closeCents>0)
      .map(p=>({date:p.date,closeCents:p.closeCents,openCents:p.openCents,highCents:p.highCents,lowCents:p.lowCents,volume:p.volume}));
    m.history[sym]={points,fetchedAt:Number(entry.fetchedAt)||0};
  }
  m.trades=Array.isArray(old.trades)?old.trades.filter(t=>t&&REAL_BY_SYMBOL.has(t.symbol)&&['buy','sell'].includes(t.side)&&Number.isSafeInteger(t.qty)&&t.qty>0&&Number.isSafeInteger(t.grossCents)&&Number.isFinite(t.time)).slice(0,250):[];
  m.watch=Array.isArray(old.watch)?old.watch.filter(v=>REAL_BY_SYMBOL.has(v)).slice(0,20):[];
  m.selected=REAL_BY_SYMBOL.has(old.selected)?old.selected:def.selected;
  m.range=[7,30,90,365,'all'].includes(old.range)?old.range:30;
  m.fx=old.fx&&Number.isFinite(old.fx.rate)&&old.fx.rate>0&&/^\d{4}-\d{2}-\d{2}$/.test(old.fx.effectiveDate||'')?old.fx:null;
  m.realizedCents=Number.isSafeInteger(old.realizedCents)?old.realizedCents:0;
  m.feesCents=Number.isSafeInteger(old.feesCents)?old.feesCents:0;
  m.cashRemainderCents=Number.isSafeInteger(old.cashRemainderCents)?Math.max(0,Math.min(99,old.cashRemainderCents)):0;
  m.version=1;s.realMarket=m;
}
function realMarketValueCents(m){
  if(!m)return 0;
  return Object.entries(m.holdings||{}).reduce((sum,[sym,h])=>{
    const stock=REAL_BY_SYMBOL.get(sym),q=m.quotes[sym],rate=stock.currency==='PLN'?1:m.fx?.rate;
    // Brak kursu: jedynie koszt księgowy, a nie zmyślona aktualna wycena.
    return sum+(q&&rate?Math.round(q.priceCents*h.qty*rate):h.costCents);
  },0);
}
function realMarketAssetValuePLN(m){return Math.round(realMarketValueCents(m)/100);}
function realSession(symbol,now=Date.now()){
  const stock=REAL_BY_SYMBOL.get(symbol);if(!stock)return false;
  const zone=stock.exchange==='GPW'?'Europe/Warsaw':'America/New_York';
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'2-digit',minute:'2-digit',weekday:'short',hour12:false}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
  if(['Sat','Sun'].includes(parts.weekday))return false;
  const mins=(Number(parts.hour)%24)*60+Number(parts.minute);
  return stock.exchange==='GPW'?mins>=540&&mins<1020:mins>=570&&mins<960;
}
function realIsQuoteFresh(symbol){const q=state.realMarket.quotes[symbol];return !!q&&q.timestamp<=Date.now()+60000&&Date.now()-q.timestamp<=REAL_QUOTE_MAX_AGE_MS;}
function realFxValid(stock){if(stock.currency==='PLN')return true;const fx=state.realMarket.fx;
  const date=fx?Date.parse(fx.effectiveDate+'T00:00:00Z'):NaN;
  return !!fx&&Date.now()-(fx.fetchedAt||0)<24*60*60*1000&&Number.isFinite(date)&&Date.now()-date<REAL_FX_MAX_AGE_MS&&fx.rate>0;}
function realCanTrade(symbol){return !!realUi.status?.ready&&Date.now()-realUi.lastSyncTime<6*60*1000&&realSession(symbol)&&realIsQuoteFresh(symbol)&&realFxValid(REAL_BY_SYMBOL.get(symbol))&&!state.gameOver;}
function realOrderPreview(sym,qty,side){
  const stock=REAL_BY_SYMBOL.get(sym),q=state.realMarket.quotes[sym];
  if(!stock||!q||!Number.isSafeInteger(qty)||qty<1||qty>1000000)return null;
  const fx=stock.currency==='USD'?state.realMarket.fx?.rate:1;
  if(!(fx>0))return null;
  const grossCents=Math.round(q.priceCents*qty*fx);
  if(!Number.isSafeInteger(grossCents)||grossCents<=0)return null;
  const feeCents=Math.max(1,Math.ceil(grossCents*.003));
  return {grossCents,feeCents,netCents:side==='buy'?grossCents+feeCents:grossCents-feeCents,fx};
}
function realTrade(side,qty,symbol){
  if(!realCanTrade(symbol)){toast('Handel wyłączony: sesja zamknięta, nieaktualny kurs lub brak ważnego kursu walut.',true);return false;}
  if(!Number.isSafeInteger(qty)||qty<1||qty>1000000){toast('Liczba akcji musi być całkowita (1–1 000 000).',true);return false;}
  const preview=realOrderPreview(symbol,qty,side);if(!preview||preview.netCents<0)return false;
  const m=state.realMarket, hold=m.holdings[symbol]||{qty:0,costCents:0};
  const before=state.cash*100+m.cashRemainderCents;
  if(side==='buy'&&before<preview.netCents){toast('Za mało środków firmowych na zakup.',true);return false;}
  if(side==='sell'&&qty>hold.qty){toast('Nie posiadasz tylu akcji.',true);return false;}
  const q=m.quotes[symbol],stamp=q.timestamp,rate=preview.fx;
  let realizedCents=0;
  if(side==='buy'){
    hold.qty+=qty;hold.costCents+=preview.netCents;
    m.holdings[symbol]=hold;
  } else {
    const costSold=qty===hold.qty?hold.costCents:Math.round(hold.costCents*qty/hold.qty);
    realizedCents=preview.netCents-costSold;
    hold.qty-=qty;hold.costCents-=costSold;
    if(hold.qty===0)delete m.holdings[symbol];else m.holdings[symbol]=hold;
    m.realizedCents+=realizedCents;
  }
  const after=before+(side==='buy'?-preview.netCents:preview.netCents);
  state.cash=Math.floor(after/100);m.cashRemainderCents=after%100;
  m.feesCents+=preview.feeCents;
  const stock=REAL_BY_SYMBOL.get(symbol);
  m.trades.unshift({time:Date.now(),day:state.day,side,symbol,qty,priceCents:q.priceCents,
    currency:stock.currency,fxRate:rate,quoteAt:stamp,source:q.source,grossCents:preview.grossCents,
    feeCents:preview.feeCents,netCents:preview.netCents,realizedCents});
  m.trades=m.trades.slice(0,250);
  state.ledger.unshift({day:state.day,amount:(side==='buy'?-1:1)*Math.round(preview.netCents/100),
    title:(side==='buy'?'Kupno':'Sprzedaż')+' akcji '+symbol,category:'Obrót aktywami (nieoperacyjny)'});
  state.ledger=state.ledger.slice(0,100);
  log(`${side==='buy'?'Kupiono':'Sprzedano'} ${qty} akcji ${stock.name} po ${nativeCents(q.priceCents,stock.currency)} · dane EODHD.`,side==='buy'?'normal':'good');
  markChanged(side==='buy'?'Zapisano wirtualny zakup akcji.':'Zapisano wirtualną sprzedaż akcji.');
  return true;
}
async function realApi(action,params={}){
  if(location.protocol==='file:')throw Error('Real Market wymaga uruchomienia na Netlify z funkcją serwerową. Tryb offline pozostaje dostępny.');
  const u=new URL(REAL_API,location.origin);u.searchParams.set('action',action);
  for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
  const response=await fetch(u,{headers:{Accept:'application/json'},cache:'no-store'});
  let data;try{data=await response.json();}catch(e){throw new Error('Serwer nie zwrócił prawidłowego JSON.');}
  if(!response.ok||!data.ok)throw new Error(data.error||`Błąd HTTP ${response.status}`);
  return data;
}
async function realRefresh(force=false){
  if(!state||realUi.loading)return;
  if(!force&&Date.now()-realUi.lastAttempt<REAL_REFRESH_MS)return;
  const snapshot=state;realUi.loading=true;realUi.error='';realUi.lastAttempt=Date.now();if(view==='realmarket')render();
  try {
    const status=await realApi('status');if(state!==snapshot)return;realUi.status=status;
    if(!status.ready)throw Error(status.message);
    const results=await Promise.allSettled([
      realApi('quotes',{symbols:REAL_CATALOG.map(s=>s.symbol).join(',')}),realApi('fx')
    ]);
    if(state!==snapshot)return;
    const warnings=[];
    if(results[0].status==='fulfilled'){
      const quotes=results[0].value.items||[];
      for(const q of quotes)if(REAL_BY_SYMBOL.has(q.symbol)&&q.priceCents>0&&q.timestamp>0){
        snapshot.realMarket.quotes[q.symbol]=q;
      }
      realUi.lastSyncTime=quotes.length?Date.now():0;
      if(!quotes.length)warnings.push('API nie zwróciło notowań.');
      if(results[0].value.partial)warnings.push('Część zapytań nie powiodła się — wyświetlam dostępne dane.');
      if(results[0].value.returned < results[0].value.requested)warnings.push(`Dane dostępne dla ${results[0].value.returned}/${results[0].value.requested} instrumentów.`);
    }else {realUi.lastSyncTime=0;warnings.push('Notowania: '+results[0].reason.message);}
    if(results[1].status==='fulfilled')snapshot.realMarket.fx=results[1].value;
    else warnings.push('USD/PLN: '+results[1].reason.message);
    realUi.error=warnings.join(' ');
    save();
  } catch(e){realUi.error=e.message;realUi.lastSyncTime=0;}
  finally {realUi.loading=false;if(state===snapshot&&view==='realmarket'){render();if(realUi.status?.ready&&!state.realMarket.history[state.realMarket.selected])realLoadHistory(state.realMarket.selected);}}
}
async function realLoadHistory(symbol,force=false){
  if(!state||!REAL_BY_SYMBOL.has(symbol)||realUi.historyLoading)return;
  const m=state.realMarket,previous=m.history[symbol];
  if(!force&&previous&&Date.now()-previous.fetchedAt<12*60*60*1000)return;
  const snapshot=state;realUi.historyLoading=true;if(view==='realmarket')render();
  try{
    const data=await realApi('history',{symbol});
    if(state!==snapshot)return;
    m.history[symbol]={points:data.points||[],fetchedAt:Date.now()};
    const keys=Object.keys(m.history);while(keys.length>5)delete m.history[keys.shift()];
    save();
  }catch(e){realUi.error='Historia notowań: '+e.message;}
  finally{realUi.historyLoading=false;if(state===snapshot&&view==='realmarket')render();}
}
function realOnOpen(){
  realRefresh(false);const symbol=state.realMarket.selected;
  if(realUi.status?.ready)realLoadHistory(symbol);
}
function realQuoteText(sym){
  const c=REAL_BY_SYMBOL.get(sym),q=state.realMarket.quotes[sym];
  return q?nativeCents(q.priceCents,c.currency):'Brak danych';
}
function realStockChange(sym){
  const q=state.realMarket.quotes[sym];if(!q)return null;
  return Number.isFinite(q.changePct)?q.changePct:q.previousCents?((q.priceCents/q.previousCents)-1)*100:null;
}
function realVisibleHistory(){
  const m=state.realMarket,entry=m.history[m.selected];if(!entry)return [];
  const pts=entry.points||[];if(m.range==='all'||!pts.length)return pts;
  const cutoff=Date.parse(pts[pts.length-1].date+'T00:00:00Z')-(Number(m.range)-1)*86400000;
  return pts.filter(p=>Date.parse(p.date+'T00:00:00Z')>=cutoff);
}
function realChart(){
  const pts=realVisibleHistory();if(pts.length<2)return `<div class="real-chart-empty">${realUi.historyLoading?'Pobieram historię…':'Brak historii. Po konfiguracji API użyj przycisku „Pobierz wykres”.'}</div>`;
  const hi=Math.max(...pts.map(p=>p.closeCents)),lo=Math.min(...pts.map(p=>p.closeCents)),diff=Math.max(1,hi-lo),height=190,width=930;
  const xy=pts.map((p,i)=>({x:35+(i/(pts.length-1))*width,y:25+(hi-p.closeCents)/diff*height,p}));
  const path=xy.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last=pts.at(-1),first=pts[0],currency=REAL_BY_SYMBOL.get(state.realMarket.selected).currency;
  return `<div class="real-chart"><svg viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-label="Historyczny wykres kursu, ${pts.length} sesji">
    ${[0,1,2,3,4].map(i=>`<line x1="35" y1="${25+i*47.5}" x2="965" y2="${25+i*47.5}" stroke="rgba(125,157,199,.14)"/><text x="970" y="${22+i*47.5}" text-anchor="end" class="stock-axis-label">${nativeCents(Math.round(hi-diff*i/4),currency)}</text>`).join('')}
    <path d="${path}" fill="none" stroke="#4de0cf" stroke-width="3.2" stroke-linejoin="round"/>
    ${xy.filter((p,i)=>i%Math.max(1,Math.floor(pts.length/26))===0||i===pts.length-1).map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.6" fill="#4de0cf"><title>${p.p.date} — ${nativeCents(p.p.closeCents,currency)}</title></circle>`).join('')}
    <text x="35" y="247" class="stock-axis-label">${first.date}</text><text x="965" y="247" text-anchor="end" class="stock-axis-label">${last.date}</text>
  </svg></div>`;
}
function realView(){
  const m=state.realMarket,selected=REAL_BY_SYMBOL.get(m.selected),q=m.quotes[m.selected];
  const positions=Object.entries(m.holdings);
  const asset=realMarketValueCents(m),cost=positions.reduce((sum,[,h])=>sum+h.costCents,0);
  const change=realStockChange(selected.symbol),preview=realOrderPreview(selected.symbol,realUi.qty,realUi.side);
  const owned=m.holdings[selected.symbol]?.qty||0;
  const balance=state.cash*100+m.cashRemainderCents;
  const tradable=realCanTrade(selected.symbol),isOpen=realSession(selected.symbol),hasQuote=realIsQuoteFresh(selected.symbol);
  const ready=!!realUi.status?.ready;
  const validOrder=!!preview&&tradable&&realUi.qty>0&&(realUi.side==='buy'?preview.netCents<=balance:realUi.qty<=owned);
  const filtered=REAL_CATALOG.filter(s=>s.exchange===realUi.exchange&&(s.name+' '+s.symbol).toLowerCase().includes(realUi.search.toLowerCase()));
  const updated=Object.values(m.quotes).map(q=>q.timestamp).filter(Boolean).sort((a,b)=>b-a)[0];
  const stalePositions=positions.filter(([sym])=>!realIsQuoteFresh(sym));
  return `${header('Real Stock Market 3.0','Inwestuj w rzeczywiste spółki za wirtualne złotówki. Notowania pochodzą z EODHD, a USD/PLN z NBP.')}
    <div class="real-disclaimer"><strong>Symulacja, nie prawdziwy rachunek maklerski.</strong> To nie są transakcje rzeczywiste ani porady inwestycyjne. Dane mogą być opóźnione; nigdy nie są sztucznie generowane.</div>
    <div class="real-toolbar"><span class="pill ${ready?'green':'red'}">${ready?'API skonfigurowane':'API nieskonfigurowane'}</span>
      <span class="tiny muted">Ostatnie notowanie: ${realFormatDate(updated)} · sesje prawdziwego rynku, nie zegar gry</span>
      ${button('real-refresh',realUi.loading?'Pobieranie…':'Odśwież notowania','secondary',`${realUi.loading?'disabled':''}`,'stocks')}
    </div>
    ${realUi.error?`<div class="notice ${ready?'':'red'} real-notice">${esc(realUi.error)}${!ready?' Przeczytaj plik README.md, aby uruchomić pobieranie notowań przez Netlify.':''}</div>`:''}
    ${stalePositions.length?`<div class="notice real-notice"><strong>Uwaga:</strong> ${stalePositions.length} pozycje mają nieaktualne lub niedostępne notowania. Wycena nie jest bieżącą ceną transakcyjną.</div>`:''}
    <div class="metric-grid real-metrics">
      ${metric('Aktywa Real Market',plnCents(asset),'Ostatnie dostępne kursy lub koszt historyczny — nie zawsze bieżące','stocks','cyan')}
      ${metric('Gotówka firmy',plnCents(balance),'Wspólne saldo obu giełd','wallet','blue')}
      ${metric('Wynik niezrealizowany',plnCents(asset-cost),'Zmienna wycena przy dostępnych danych','chart',asset>=cost?'green':'red')}
      ${metric('Wynik zrealizowany',plnCents(m.realizedCents),`Prowizje łącznie: ${plnCents(m.feesCents)}`,'coins',m.realizedCents>=0?'green':'red')}
    </div>
    <div class="real-grid">
      <section class="panel real-company-list"><div class="panel-head"><div><h2>Spółki giełdowe</h2><p>30 firm · notowania USA i GPW</p></div></div>
        <div class="real-switch">${['USA','GPW'].map(x=>`<button data-action="real-exchange" data-exchange="${x}" class="${realUi.exchange===x?'active':''}">${x==='USA'?'USA · NYSE/NASDAQ':'Polska · GPW'}</button>`).join('')}</div>
        <label for="real-search" class="form-label">Szukaj spółki</label><input id="real-search" type="search" class="form-input" placeholder="Nazwa lub ticker" value="${esc(realUi.search)}"/>
        <div class="real-list">${filtered.length?filtered.map(s=>{const quoted=m.quotes[s.symbol],d=realStockChange(s.symbol);
          return `<button data-action="real-select" data-symbol="${s.symbol}" class="real-list-item ${s.symbol===m.selected?'active':''}"><span><strong>${esc(s.symbol.replace('.WAR','').replace('.US',''))}</strong><small>${esc(s.name)}</small></span><span><b>${realQuoteText(s.symbol)}</b><small class="${d>=0?'positive':'negative'}">${quoted?realPct(d):'Oczekiwanie na API'}</small></span></button>`;
        }).join(''):`<div class="tiny muted" style="padding:12px">Brak wyników wyszukiwania.</div>`}</div>
      </section>
      <section class="real-main">
        <section class="panel"><div class="panel-head"><div><h2>${esc(selected.name)} <span class="ticker">${esc(selected.symbol)}</span></h2><p>${selected.exchange==='GPW'?'GPW Warszawa':'USA · NYSE/NASDAQ'} · ${selected.currency}</p></div>
          ${button('real-watch',m.watch.includes(selected.symbol)?'★ Obserwujesz':'☆ Obserwuj','secondary')}</div>
          <div class="real-price-row"><div><strong>${q?nativeCents(q.priceCents,selected.currency):'Brak notowań'}</strong><span class="${change>=0?'positive':'negative'}">${realPct(change)} od poprzedniego zamknięcia</span></div><span class="pill ${hasQuote?'green':'gray'}">${hasQuote?'Notowanie dostępne':'Brak świeżego kursu'}</span></div>
          <p class="tiny muted">Źródło: ${esc(q?.source||'EODHD')} · czas kursu: ${realFormatDate(q?.timestamp)} · dane opóźnione, bez gwarancji real-time.</p>
          <div class="real-ranges">${[7,30,90,365,'all'].map(r=>`<button data-action="real-range" data-range="${r}" class="${m.range===r?'active':''}">${r==='all'?'MAX':r===365?'1R':r===90?'3M':r===30?'1M':'7D'}</button>`).join('')}
            ${button('real-history',realUi.historyLoading?'Pobieranie…':'Pobierz wykres','secondary',realUi.historyLoading?'disabled':'','chart')}</div>
          ${realChart()}
          <div class="real-facts"><span>Ostatnia aktualizacja NBP: <b>${esc(m.fx?.effectiveDate||'brak')}</b></span><span>USD/PLN: <b>${m.fx?m.fx.rate.toFixed(4).replace('.',','):'brak kursu'}</b></span><span>Sesja: <b>${isOpen?'godziny regularne':'zamknięta'}</b></span></div>
        </section>
        <section class="panel section-space"><div class="panel-head"><div><h2>Portfel Real Market</h2><p>Oddzielny od fikcyjnego portfela, wspólna gotówka firmy</p></div></div>
          ${positions.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Spółka</th><th>Akcje</th><th>Koszt</th><th>Wycena</th><th>Wynik</th></tr></thead><tbody>${positions.map(([sym,h])=>{
            const x=REAL_BY_SYMBOL.get(sym),latest=m.quotes[sym],fx=x.currency==='USD'?m.fx?.rate:1;
            const val=latest&&fx?Math.round(latest.priceCents*h.qty*fx):h.costCents;
            return `<tr><td><button class="stock-select" data-action="real-select" data-symbol="${sym}"><strong>${sym}</strong><small>${esc(x.name)}</small></button></td><td>${number(h.qty)}</td><td>${plnCents(h.costCents)}</td><td>${plnCents(val)}${!latest?'<small class="muted"> (koszt, brak notowań)</small>':!realIsQuoteFresh(sym)?'<small class="muted"> (ostatni kurs — nieaktualny)</small>':''}</td><td class="${val>=h.costCents?'positive':'negative'}">${plnCents(val-h.costCents)}</td></tr>`;
          }).join('')}</tbody></table></div>`:empty('Brak aktywów','Po włączeniu API możesz kupić pierwsze akcje prawdziwych spółek.','','stocks')}
        </section>
        <section class="panel section-space"><div class="panel-head"><div><h2>Historia wirtualnych transakcji</h2><p>Wszystkie kwoty w PLN; dane do rozliczeń zapisane w groszach</p></div>
          ${m.trades.length?button('real-export-csv','Eksport CSV','secondary','','save'):''}</div>
          ${m.trades.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Typ</th><th>Spółka</th><th>Ilość</th><th>Cena</th><th>Kwota z prowizją</th></tr></thead><tbody>${m.trades.slice(0,25).map(t=>`<tr><td class="nowrap">${realFormatDate(t.time)}</td><td class="${t.side==='sell'?'positive':'negative'}">${t.side==='buy'?'Kupno':'Sprzedaż'}</td><td><strong>${t.symbol}</strong></td><td>${t.qty}</td><td>${nativeCents(t.priceCents,t.currency)}</td><td>${plnCents(t.netCents)}</td></tr>`).join('')}</tbody></table></div>`:empty('Brak transakcji','Kup lub sprzedaj akcje w czasie prawdziwej sesji giełdowej.','','stocks')}
        </section>
      </section>
      <aside class="real-trade-col"><section class="panel"><div class="panel-head"><div><h2>Wirtualne zlecenie</h2><p>${esc(selected.symbol)}</p></div><span class="pill gray">0,3% prowizji</span></div>
        <div class="real-switch">${['buy','sell'].map(x=>`<button class="${realUi.side===x?'active':''}" data-action="real-side" data-side="${x}">${x==='buy'?'Kupno':'Sprzedaż'}</button>`).join('')}</div>
        <label for="real-qty" class="form-label">Liczba akcji</label><input type="number" min="1" max="1000000" step="1" id="real-qty" class="form-input" value="${realUi.qty}"/>
        <div class="line-row"><span>Cena 1 akcji</span><strong>${realQuoteText(selected.symbol)}</strong></div>
        <div class="line-row"><span>Wartość zlecenia</span><strong>${preview?plnCents(preview.grossCents):'—'}</strong></div>
        <div class="line-row"><span>Prowizja</span><strong>${preview?plnCents(preview.feeCents):'—'}</strong></div>
        <div class="line-row"><span>${realUi.side==='buy'?'Razem do zapłaty':'Otrzymasz'}</span><strong>${preview?plnCents(preview.netCents):'—'}</strong></div>
        ${button('real-trade',realUi.side==='buy'?'Kup akcje':'Sprzedaj akcje',realUi.side==='buy'?'primary':'green',validOrder?'':'disabled','stocks')}
        <div class="real-help">${!isOpen?'Giełda nie prowadzi obecnie regularnej sesji.':!hasQuote?'Czekam na świeże notowanie (maks. 45 minut).':!realFxValid(selected)?'Brak aktualnego kursu USD/PLN.':!validOrder?'Sprawdź saldo i liczbę akcji.':'Wirtualne zlecenie gotowe. Handel odbywa się według ostatniej dostępnej ceny.'}</div>
        <div class="divider"></div><div class="line-row"><span>Posiadane akcje</span><strong>${owned} szt.</strong></div>
        <div class="line-row"><span>Wartość pozycji</span><strong>${plnCents(q?(Math.round(q.priceCents*owned*(selected.currency==='USD'?(m.fx?.rate||0):1))):0)}</strong></div>
      </section><section class="panel section-space"><div class="panel-head"><div><h2>Obserwowane</h2></div></div>
        ${m.watch.length?m.watch.map(sym=>`<button class="real-watch-row" data-action="real-select" data-symbol="${sym}"><strong>${sym}</strong><span>${realQuoteText(sym)}</span></button>`).join(''):'<p class="muted tiny">Dodaj spółki do obserwowanych za pomocą ☆.</p>'}
      </section></aside>
    </div>`;
}
function realExportCSV(){
  const header=['data','dzien_gry','operacja','symbol','liczba_akcji','cena_centy_waluta','waluta','USDPLN','wartosc_brutto_grosze','prowizja_grosze','kwota_netto_grosze','wynik_zrealizowany_grosze','czas_notowania','zrodlo'];
  const lines=[header,...state.realMarket.trades.map(t=>[new Date(t.time).toISOString(),t.day,t.side,t.symbol,t.qty,t.priceCents,t.currency,t.fxRate,t.grossCents,t.feeCents,t.netCents,t.realizedCents,new Date(t.quoteAt).toISOString(),t.source])];
  const csv='\ufeff'+lines.map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='it-company-tycoon-real-market.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function realAction(btn){
  const act=btn.dataset.action,m=state.realMarket;
  switch(act){
    case 'real-exchange':realUi.exchange=btn.dataset.exchange==='GPW'?'GPW':'USA';realUi.search='';render();return true;
    case 'real-select':if(!REAL_BY_SYMBOL.has(btn.dataset.symbol))return true;
      m.selected=btn.dataset.symbol;realUi.exchange=REAL_BY_SYMBOL.get(m.selected).exchange;realUi.qty=1;realUi.search='';
      save();render();if(realUi.status?.ready)realLoadHistory(m.selected);return true;
    case 'real-watch':m.watch=m.watch.includes(m.selected)?m.watch.filter(x=>x!==m.selected):[...m.watch,m.selected];save();render();return true;
    case 'real-side':realUi.side=btn.dataset.side==='sell'?'sell':'buy';render();return true;
    case 'real-range':m.range=btn.dataset.range==='all'?'all':Number(btn.dataset.range);save();render();return true;
    case 'real-refresh':realRefresh(true);return true;
    case 'real-history':realLoadHistory(m.selected,true);return true;
    case 'real-export-csv':realExportCSV();toast('Historia CSV została przygotowana.');return true;
    case 'real-trade':realTrade(realUi.side,realUi.qty,m.selected);return true;
    default:return false;
  }
}
function realInput(e){
  if(e.target.id==='real-search'){realUi.search=e.target.value;render();return true;}
  if(e.target.id==='real-qty'){realUi.qty=Number(e.target.value);render();return true;}
  return false;
}
// Czas rzeczywisty notowań nie jest sterowany zegarem symulacji.
setInterval(()=>{if(state&&view==='realmarket'&&!document.hidden)realRefresh(false);},60000);
