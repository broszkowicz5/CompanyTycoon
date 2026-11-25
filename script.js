/* IT COMPANY TYCOON · REAL MARKET 3.0 · Giełda rzeczywista + giełda symulowana + biuro 2D */
'use strict';

const SAVE_KEY = 'it-company-tycoon-save-v1';
const DAY_MS = 2200; // 1 dzień gry = 2,2 sekundy czasu rzeczywistego przy 1×
const MAX_ACTIVE = 3;
const money = n => new Intl.NumberFormat('pl-PL', {maximumFractionDigits: 0}).format(Math.round(n)) + ' zł';
const number = n => new Intl.NumberFormat('pl-PL', {maximumFractionDigits: 0}).format(Math.round(n));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cl='') => `<svg class="ico ${cl}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const rand = (min,max) => Math.floor(Math.random() * (max-min+1)) + min;
const pick = a => a[rand(0,a.length-1)];
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const perc = (a,b) => b ? clamp(a / b * 100,0,100) : 0;
const rnd = n => Math.round(n / 50)*50;

const ROLES = [
  {name:'Junior Developer', wage:900, power:5.7, skill:'Kod', level:0},
  {name:'UI/UX Designer', wage:1100, power:5.8, skill:'Design', level:0},
  {name:'Tester QA', wage:950, power:5.4, skill:'Testy', level:0},
  {name:'Mid Developer', wage:1650, power:9.4, skill:'Kod', level:1},
  {name:'DevOps Engineer', wage:1750, power:9.5, skill:'Infrastruktura', level:1},
  {name:'Senior Developer', wage:2550, power:14.8, skill:'Kod', level:2},
  {name:'Cybersecurity Specialist', wage:2050, power:10.5, skill:'Bezpieczeństwo', level:2},
  {name:'Project Manager', wage:1950, power:7.2, skill:'Zarządzanie', level:2},
  {name:'AI Engineer', wage:2850, power:14.2, skill:'AI', level:4}
];
const PROJECT_TYPES = [
  {name:'Strona internetowa', work:65, reward:5400, days:21, level:0, skill:'Kod', desc:'Responsywna witryna firmowa z panelem administracyjnym.'},
  {name:'Sklep internetowy', work:115, reward:9800, days:26, level:0, skill:'Kod', desc:'Katalog produktów, koszyk, płatności i panel sprzedaży.'},
  {name:'Aplikacja mobilna', work:180, reward:17000, days:32, level:1, skill:'Kod', desc:'Aplikacja mobilna na dwie platformy z kontami użytkowników.'},
  {name:'System CRM', work:270, reward:27500, days:42, level:2, skill:'Zarządzanie', desc:'System obsługi klientów, zgłoszeń i raportowania.'},
  {name:'Sieć firmowa', work:175, reward:20000, days:32, level:1, skill:'Infrastruktura', desc:'Projekt sieci, konfiguracja serwerów i bezpieczeństwo dostępu.'},
  {name:'Audyt cyberbezpieczeństwa', work:195, reward:23500, days:34, level:2, skill:'Bezpieczeństwo', desc:'Przegląd zabezpieczeń, testy i raport z ryzykiem.'},
  {name:'Gra komputerowa', work:350, reward:42500, days:50, level:2, skill:'Kod', desc:'Produkcja gry 2D: mechaniki, grafika, testowanie.'},
  {name:'System AI', work:520, reward:84000, days:62, level:4, skill:'AI', desc:'Inteligentny asystent biznesowy i analiza dokumentów.'},
  {name:'Platforma SaaS', work:720, reward:119000, days:72, level:4, skill:'Infrastruktura', desc:'Aplikacja abonamentowa w chmurze z panelem klientów.'},
  {name:'System korporacyjny', work:1500, reward:285000, days:110, level:6, skill:'Zarządzanie', desc:'Globalna platforma informatyczna dla wielu oddziałów.'}
];
const OFFICES = [
  {name:'Domowe biuro', price:0, rent:300, capacity:2, detail:'Małe biuro, 1 komputer i skromny początek.'},
  {name:'Mały lokal', price:6000, rent:700, capacity:5, detail:'Pierwsze biuro z salą spotkań i miejscem dla zespołu.'},
  {name:'Nowoczesny open space', price:26000, rent:1700, capacity:12, detail:'Komfortowe stanowiska i przestrzeń do rozwoju.'},
  {name:'Duży biurowiec', price:105000, rent:4200, capacity:28, detail:'Profesjonalne piętra biurowe i rozbudowane zaplecze.'},
  {name:'Międzynarodowa siedziba', price:460000, rent:10500, capacity:80, detail:'Globalne centrum technologiczne z własnym kampusem.'}
];
const HARDWARE = [
  {name:'Podstawowy komputer', price:0, bonus:0, upkeep:0},
  {name:'Wydajne stacje robocze', price:3500, bonus:.16, upkeep:75},
  {name:'Serwery firmowe', price:14500, bonus:.33, upkeep:250},
  {name:'Profesjonalne centrum IT', price:62000, bonus:.58, upkeep:850},
  {name:'Własna infrastruktura cloud', price:260000, bonus:.9, upkeep:2300}
];
const TECHNOLOGIES = [
  {name:'Nowoczesne frameworki', cost:2300, bonus:.09, desc:'Wydajniejsze tworzenie stron i aplikacji.'},
  {name:'Automatyzacja procesów', cost:6400, bonus:.12, desc:'Automatyzacja powtarzalnych zadań zespołu.'},
  {name:'CI/CD i testy automatyczne', cost:15000, bonus:.14, desc:'Mniej błędów, szybsze wdrożenia.'},
  {name:'Asystenci programowania AI', cost:36000, bonus:.18, desc:'Wzmocnienie produktywności całej firmy.'},
  {name:'Centrum badawczo-rozwojowe', cost:130000, bonus:.24, desc:'Nowatorskie rozwiązania i przewaga na rynku.'}
];
const RESEARCH = [
  {id:'agile', name:'Zwinne zarządzanie', rp:15, cost:1700, level:0, bonus:.1, desc:'+10% tempa wszystkich projektów.'},
  {id:'quality', name:'Kontrola jakości', rp:32, cost:5200, level:1, bonus:0, desc:'+2 reputacji za ukończony kontrakt.'},
  {id:'cloud', name:'Architektura chmurowa', rp:65, cost:18000, level:2, bonus:.16, desc:'+16% wydajności realizacji zleceń.'},
  {id:'saas', name:'Własny produkt SaaS', rp:105, cost:39000, level:3, bonus:0, desc:'Odblokuj sprzedaż abonamentowego produktu IT.'},
  {id:'innovation', name:'Laboratorium innowacji', rp:200, cost:120000, level:5, bonus:.25, desc:'+25% wydajności wszystkich zespołów.'}
];
const LEVELS = [
  {name:'Freelancer', rep:0, revenue:0, employees:0},
  {name:'Mikrostartup', rep:8, revenue:5000, employees:0},
  {name:'Mała firma IT', rep:20, revenue:22000, employees:1},
  {name:'Software House', rep:45, revenue:75000, employees:3},
  {name:'Firma technologiczna', rep:90, revenue:180000, employees:5},
  {name:'Lider krajowego rynku', rep:175, revenue:430000, employees:9},
  {name:'Międzynarodowa korporacja', rep:300, revenue:1100000, employees:15},
  {name:'Globalny gigant IT', rep:550, revenue:3000000, employees:25}
];
const FIRST_NAMES = ['Anna','Katarzyna','Michał','Jakub','Zuzanna','Julia','Piotr','Kamil','Oliwia','Mateusz','Aleksandra','Tomasz','Patryk','Karolina','Jan','Natalia','Adam','Wiktoria','Maciej','Emilia'];
const LAST_NAMES = ['Nowak','Kowalski','Wiśniewski','Wójcik','Lewandowski','Mazur','Kaczmarek','Zieliński','Szymański','Dąbrowski','Król','Wieczorek','Jankowski','Pawlak','Wróbel'];
const CLIENTS = ['Nova Group','BlueOrbit','PixelHouse','DataFlow','GreenSoft','TechVision','Altura','MediPlus','OptiCloud','Polaris','Nexora','UrbanLabs','FinEdge','Atomix','HyperLink'];
const NAV = [
  ['dashboard','grid','Dashboard'],['projects','briefcase','Projekty'],['team','users','Pracownicy'],
  ['finance','wallet','Finanse'],['market','stocks','Giełda fikcyjna'],['realmarket','stocks','Giełda REAL'],['office','building','Biuro'],['office2d','floor','Biuro 2D'],['upgrades','zap','Ulepszenia'],
  ['research','flask','Badania i rozwój'],['stats','chart','Statystyki'],['settings','settings','Ustawienia']
];
const ACHIEVEMENTS = [
  {id:'first', title:'Pierwszy kontrakt', desc:'Ukończ pierwszy projekt.', test:s=>s.completed>=1},
  {id:'team', title:'Budowanie zespołu', desc:'Zatrudnij co najmniej 3 pracowników.', test:s=>s.employees.length>=3},
  {id:'money', title:'Pierwsze 100 tysięcy', desc:'Osiągnij 100 000 zł przychodu.', test:s=>s.totalRevenue>=100000},
  {id:'lab', title:'Pionier innowacji', desc:'Odkryj 3 technologie badawcze.', test:s=>s.researched.length>=3},
  {id:'big', title:'Wielka liga', desc:'Dotrzyj do poziomu Software House.', test:s=>levelIndex(s)>=3},
  {id:'global', title:'Globalny gracz', desc:'Osiągnij ostatni poziom rozwoju firmy.', test:s=>levelIndex(s)>=7},
  {id:'invest', title:'Pierwszy inwestor', desc:'Kup pierwszą akcję fikcyjnej spółki.', test:s=>s.market.trades.some(t=>t.side==='buy')},
  {id:'trader', title:'Inwestor aktywny', desc:'Zrealizuj 10 transakcji giełdowych.', test:s=>s.market.trades.length>=10},
  {id:'portfolio', title:'Portfel premium', desc:'Posiadaj akcje o wartości 50 000 zł.', test:s=>marketPortfolioValue(s.market)>=50000},
  {id:'dividend', title:'Pierwsza dywidenda', desc:'Otrzymaj dywidendę od spółki.', test:s=>s.market.dividendsEarned>0}
];


/* --- GIEŁDA: niezależna fikcyjna symulacja, bez zewnętrznych danych i API. --- */
const BROKER_FEE = .003;
const MARKET_HISTORY_LIMIT = 730;
const STOCK_CATALOG = [
  {ticker:'NOVA',name:'NovaSoft Systems',sector:'Oprogramowanie',cents:14520,cap:2800,health:78,growth:72,volatility:.022,dividend:.012},
  {ticker:'CYBR',name:'CyberNova Defense',sector:'Cyberbezpieczeństwo',cents:18940,cap:1950,health:81,growth:83,volatility:.030,dividend:0},
  {ticker:'QNTM',name:'Quantum AI Labs',sector:'Sztuczna inteligencja',cents:31280,cap:4300,health:70,growth:92,volatility:.049,dividend:0},
  {ticker:'SILI',name:'Silicore Micro',sector:'Półprzewodniki',cents:22760,cap:6100,health:73,growth:68,volatility:.034,dividend:.016},
  {ticker:'SOLA',name:'Solaris Energy',sector:'Energetyka',cents:9840,cap:1780,health:74,growth:62,volatility:.026,dividend:.028},
  {ticker:'VOLT',name:'Voltix Mobility',sector:'Motoryzacja',cents:12250,cap:2690,health:63,growth:78,volatility:.043,dividend:0},
  {ticker:'FINO',name:'Finora Banking',sector:'Bankowość',cents:17830,cap:8450,health:86,growth:50,volatility:.017,dividend:.045},
  {ticker:'SHOP',name:'ShopSphere',sector:'E-commerce',cents:20310,cap:3900,health:69,growth:77,volatility:.037,dividend:0},
  {ticker:'TELI',name:'Telion Networks',sector:'Telekomunikacja',cents:8650,cap:5500,health:84,growth:40,volatility:.015,dividend:.051},
  {ticker:'PIXL',name:'PixelForge Games',sector:'Gaming',cents:13280,cap:1260,health:68,growth:71,volatility:.041,dividend:0},
  {ticker:'CLDX',name:'CloudAxis',sector:'Chmura obliczeniowa',cents:28670,cap:7100,health:87,growth:76,volatility:.028,dividend:.008},
  {ticker:'GRID',name:'GridPulse Energy',sector:'Energetyka',cents:11540,cap:2320,health:72,growth:59,volatility:.027,dividend:.025},
  {ticker:'BION',name:'BioNet Analytics',sector:'Biotechnologia',cents:7590,cap:860,health:56,growth:89,volatility:.061,dividend:0},
  {ticker:'ARCI',name:'Arcadia Interactive',sector:'Gaming',cents:16490,cap:1810,health:76,growth:66,volatility:.038,dividend:.010},
  {ticker:'PAYX',name:'PayNexus',sector:'Fintech',cents:22420,cap:3270,health:82,growth:81,volatility:.031,dividend:.010},
  {ticker:'ROBO',name:'RoboMotion Works',sector:'Automatyka',cents:27450,cap:4580,health:67,growth:86,volatility:.046,dividend:0}
];
const MARKET_REGIMES = {
  bull:{label:'Hossa',drift:.0019,volMult:.90,color:'positive'},
  flat:{label:'Konsolidacja',drift:.0001,volMult:1,color:'warning'},
  bear:{label:'Bessa',drift:-.0028,volMult:1.25,color:'negative'}
};
const STOCK_EVENTS = [
  {title:'Popyt na rozwiązania AI',sector:'Sztuczna inteligencja',impact:.010,duration:14},
  {title:'Nowe regulacje bezpieczeństwa',sector:'Cyberbezpieczeństwo',impact:.009,duration:12},
  {title:'Niedobory układów scalonych',sector:'Półprzewodniki',impact:-.011,duration:13},
  {title:'Rosnące ceny energii',sector:'Energetyka',impact:.008,duration:12},
  {title:'Spadek popytu na gry',sector:'Gaming',impact:-.009,duration:16},
  {title:'Euforia zakupów internetowych',sector:'E-commerce',impact:.010,duration:13},
  {title:'Pogorszenie koniunktury bankowej',sector:'Bankowość',impact:-.009,duration:12},
  {title:'Rozwój usług chmurowych',sector:'Chmura obliczeniowa',impact:.009,duration:14},
  {title:'Rosnąca konkurencja fintech',sector:'Fintech',impact:-.008,duration:14},
  {title:'Inwestycje w robotyzację',sector:'Automatyka',impact:.009,duration:15}
];
let marketQuantity = 1;
let marketSide = 'buy';
const cashPLN = cents => Math.round(cents / 100);
const stockPrice = cents => new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
const pctChange = v => `${v>0?'+':''}${new Intl.NumberFormat('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}%`;
const profitMoney = v => `${v>0?'+':''}${money(v)}`;
const marketDayChange = stock => stock.previousCents ? (stock.cents/stock.previousCents-1)*100:0;
const marketHolding = (ticker, m=state.market) => m.holdings[ticker] || {qty:0,cost:0};
const marketPortfolioValue = m => Math.round(m.stocks.reduce((sum,s)=>sum+(m.holdings[s.ticker]?.qty||0)*s.cents,0)/100);
const marketUnrealized = m => marketPortfolioValue(m) - Object.values(m.holdings).reduce((sum,h)=>sum+h.cost,0);
const marketAllPnL = m => m.realizedPnL + marketUnrealized(m) + m.dividendsEarned;
function createMarket(day=1) {
  return {version:1,stocks:STOCK_CATALOG.map(s=>({...s,previousCents:s.cents,fairCents:s.cents,initialCents:s.cents,
    history:[{day,cents:s.cents}]})),holdings:{},trades:[],realizedPnL:0,feesPaid:0,dividendsEarned:0,
    regime:'flat',nextRegimeDay:day+rand(20,42),event:null,lastUpdatedDay:day,selectedTicker:'NOVA',range:30};
}
function normalizeMarket(s) {
  if(!s.market || !Array.isArray(s.market.stocks) || !s.market.holdings || !Array.isArray(s.market.trades)) {
    s.market=createMarket(s.day);return;
  }
  const m=s.market;
  m.regime=MARKET_REGIMES[m.regime]?m.regime:'flat';
  m.nextRegimeDay=Number.isFinite(m.nextRegimeDay)?m.nextRegimeDay:s.day+30;
  m.event=m.event && typeof m.event.sector==='string' && Number.isFinite(m.event.until)?m.event:null;
  m.lastUpdatedDay=Number.isInteger(m.lastUpdatedDay)?Math.min(s.day,m.lastUpdatedDay):s.day;
  m.realizedPnL=Number.isFinite(m.realizedPnL)?m.realizedPnL:0;
  m.feesPaid=Number.isFinite(m.feesPaid)?m.feesPaid:0;
  m.dividendsEarned=Number.isFinite(m.dividendsEarned)?m.dividendsEarned:0;
  const incoming=new Map(m.stocks.filter(x=>x&&typeof x.ticker==='string').map(x=>[x.ticker,x]));
  m.stocks=STOCK_CATALOG.map(base=>{
    const old=incoming.get(base.ticker);
    if(!old)return {...base,previousCents:base.cents,fairCents:base.cents,initialCents:base.cents,history:[{day:s.day,cents:base.cents}]};
    const cents=Number.isInteger(old.cents)&&old.cents>=100&&old.cents<1e9?old.cents:base.cents;
    const history=Array.isArray(old.history)?old.history.filter(h=>h&&Number.isInteger(h.day)&&Number.isInteger(h.cents)&&h.cents>=100&&h.cents<1e9).slice(-MARKET_HISTORY_LIMIT):[];
    return {...base,health:clamp(Number(old.health)||base.health,10,99),growth:clamp(Number(old.growth)||base.growth,0,100),
      cents,previousCents:Number.isInteger(old.previousCents)&&old.previousCents>=100?old.previousCents:cents,
      fairCents:Number.isInteger(old.fairCents)&&old.fairCents>=100?old.fairCents:cents,
      initialCents:base.cents,history:history.length?history:[{day:s.day,cents}]};
  });
  const validTickers=new Set(STOCK_CATALOG.map(x=>x.ticker));
  m.holdings=Object.fromEntries(Object.entries(m.holdings).filter(([ticker,h])=>validTickers.has(ticker)&&h&&Number.isSafeInteger(h.qty)&&h.qty>0&&Number.isSafeInteger(h.cost)&&h.cost>=0));
  m.trades=m.trades.filter(t=>t&&validTickers.has(t.ticker)).slice(0,120);
  m.selectedTicker=validTickers.has(m.selectedTicker)?m.selectedTicker:'NOVA';
  m.range=[7,30,90,'all'].includes(m.range)?m.range:30;
}
function marketStock(ticker) {return state.market.stocks.find(x=>x.ticker===ticker);}
function marketSelected() {return marketStock(state.market.selectedTicker)||state.market.stocks[0];}
function moveMarketCash(amount, title) {
  state.cash+=amount;
  state.ledger.unshift({day:state.day,amount,title,category:'Aktywa · giełda'});
  state.ledger=state.ledger.slice(0,100);
  // Zakup/sprzedaż aktywów nie są przychodem ani kosztem OPERACYJNYM.
}
function tradePreview(stock,qty,side) {
  const gross=cashPLN(stock.cents*qty);
  const fee=Math.max(1,Math.ceil(gross*BROKER_FEE));
  return {gross,fee,total:side==='buy'?gross+fee:gross-fee};
}
function marketTrade(ticker,rawQty,side) {
  const stock=marketStock(ticker);
  const qty=Number(rawQty);
  if(!stock||!['buy','sell'].includes(side)||!Number.isSafeInteger(qty)||qty<1||qty>1000000){toast('Podaj liczbę akcji od 1 do 1 000 000.',true);return false;}
  const order=tradePreview(stock,qty,side);
  const holding=marketHolding(ticker);
  if(side==='buy') {
    if(order.total>state.cash){toast('Za mało gotówki na zakup i prowizję.',true);return false;}
    moveMarketCash(-order.gross,`Zakup ${qty} × ${ticker}`);
    forceExpense(order.fee,`Prowizja maklerska · ${ticker}`,'Prowizje giełdowe');
    state.market.holdings[ticker]={qty:holding.qty+qty,cost:holding.cost+order.total};
  } else {
    if(qty>holding.qty){toast('Nie posiadasz tylu akcji.',true);return false;}
    // Koszt sprzedanych akcji rozliczany według średniej ceny nabycia.
    const releasedCost=qty===holding.qty?holding.cost:Math.round(holding.cost*qty/holding.qty);
    moveMarketCash(order.gross,`Sprzedaż ${qty} × ${ticker}`);
    forceExpense(order.fee,`Prowizja maklerska · ${ticker}`,'Prowizje giełdowe');
    state.market.realizedPnL+=order.total-releasedCost;
    if(qty===holding.qty)delete state.market.holdings[ticker];
    else state.market.holdings[ticker]={qty:holding.qty-qty,cost:holding.cost-releasedCost};
  }
  state.market.feesPaid+=order.fee;
  state.market.trades.unshift({day:state.day,ticker,name:stock.name,side,qty,priceCents:stock.cents,gross:order.gross,fee:order.fee,net:order.total});
  state.market.trades=state.market.trades.slice(0,120);
  state.records.peakCash=Math.max(state.records.peakCash,state.cash);
  log(`${side==='buy'?'Kupiono':'Sprzedano'} ${qty} akcji ${ticker} po ${stockPrice(stock.cents)}.`,'good');
  save();render();toast(side==='buy'?'Akcje kupione!':'Akcje sprzedane!');return true;
}
function marketStep() {
  const m=state.market;
  if(m.lastUpdatedDay>=state.day)return;
  if(state.day>=m.nextRegimeDay) {
    const options=m.regime==='bull'?['bull','flat','flat','bear']:m.regime==='bear'?['bear','flat','flat','bull']:['bull','flat','bear'];
    m.regime=pick(options);m.nextRegimeDay=state.day+rand(24,55);
    log(`Giełda: rozpoczął się okres „${MARKET_REGIMES[m.regime].label.toLowerCase()}”.`,m.regime==='bear'?'bad':'normal');
  }
  if(m.event && state.day>m.event.until)m.event=null;
  if(!m.event && state.day>7 && state.day%19===0 && Math.random()<.72){
    const event=pick(STOCK_EVENTS);
    m.event={title:event.title,sector:event.sector,impact:event.impact,until:state.day+event.duration};
    log(`Rynki: ${event.title} (${event.sector}).`,event.impact<0?'bad':'good');
  }
  const regime=MARKET_REGIMES[m.regime];
  for(const stock of m.stocks){
    stock.previousCents=stock.cents;
    const sectorDrift=m.event&&m.event.sector===stock.sector ? m.event.impact*.40 : 0;
    // Kondycja, wzrost, wycena i otoczenie wpływają na trend; szum odpowiada za krótkie wahania.
    stock.health=clamp(stock.health+(Math.random()-.5)*.55,10,99);
    const fundamentalDrift=(stock.growth-50)*.000035+(stock.health-60)*.000028;
    stock.fairCents=clamp(Math.round(stock.fairCents*Math.exp(fundamentalDrift+sectorDrift*.20)),100,5e8);
    const valuationGap=clamp(Math.log(stock.fairCents/stock.cents)*.025,-.008,.008);
    const dailyNoise=(Math.random()+Math.random()+Math.random()-1.5)*stock.volatility*regime.volMult;
    const change=clamp(regime.drift+sectorDrift+fundamentalDrift*.28+valuationGap+dailyNoise,-.125,.125);
    stock.cents=clamp(Math.round(stock.cents*Math.exp(change)),100,5e8);
    // Kapitalizacja jest zależna od kursu, nie generuje nowych środków w firmie gracza.
    stock.history.push({day:state.day,cents:stock.cents});
    if(stock.history.length>MARKET_HISTORY_LIMIT)stock.history.shift();
  }
  if(state.day%28===0){
    let paid=0;
    for(const stock of m.stocks){
      const holding=marketHolding(stock.ticker);
      if(!holding.qty||!stock.dividend)continue;
      const amount=cashPLN(stock.cents*holding.qty*stock.dividend/12);
      if(amount<1)continue;
      earn(amount,`Dywidenda ${stock.ticker}`,'Dywidendy');
      paid+=amount;
      m.dividendsEarned+=amount;
    }
    if(paid)log(`Dywidendy z portfela: +${money(paid)}.`,'good');
  }
  m.lastUpdatedDay=state.day;
}
function marketRangeData(s,range) {
  const history=s.history;
  return range==='all'?history:history.filter(p=>p.day>=state.day-Number(range)+1);
}

let state = null;
let view = 'dashboard';
let modal = null;
let currentTime = performance.now();
let elapsedDays = 0;

function log(message, tone='normal') {
  state.messages.unshift({text:message, day:state.day, tone});
  state.messages = state.messages.slice(0,32);
}
function transaction(amount, title, category) {
  const rounded = Math.round(amount);
  state.cash = Math.round(state.cash + rounded);
  state.ledger.unshift({day:state.day, amount:rounded, title, category});
  state.ledger = state.ledger.slice(0,100);
  if (rounded > 0) {state.totalRevenue += rounded; state.weekIncome += rounded;}
  if (rounded < 0) {state.totalExpenses -= rounded; state.weekExpenses -= rounded;}
}
function earn(amount,title,cat='Kontrakty') {transaction(Math.max(0,Math.round(amount)),title,cat);}
function spend(amount,title,cat='Inwestycje') {
  amount = Math.ceil(amount);
  if (!Number.isFinite(amount) || amount < 0 || state.cash < amount) {toast('Brak wystarczających środków na koncie.',true);return false;}
  transaction(-amount,title,cat);
  return true;
}
function forceExpense(amount,title,cat='Koszty') {transaction(-Math.max(0,Math.round(amount)),title,cat);}
function nextId() {return ++state.idSeq;}
function levelIndex(s=state) {
  let result = 0;
  for(let i=1;i<LEVELS.length;i++) {
    const l=LEVELS[i];
    if(s.reputation>=l.rep && s.totalRevenue>=l.revenue && s.employees.length>=l.employees) result=i;
    else break;
  }
  return result;
}
function currentLevel() {return LEVELS[levelIndex()];}
function companyValue() {return Math.max(0,Math.round(state.cash + marketPortfolioValue(state.market) + realMarketAssetValuePLN(state.realMarket) + state.totalRevenue*.29 + state.reputation*480 + state.employees.length*3500 + state.office*10000 + state.hardware*5000 - (state.loan?.balance||0)));}
function weeklyBurn() {return OFFICES[state.office].rent + HARDWARE[state.hardware].upkeep + officeWeeklyUpkeep() + state.employees.reduce((a,e)=>a+e.wage,0) + (state.loan?Math.min(state.loan.balance,state.loan.payment):0);}
function availableSlots() {return OFFICES[state.office].capacity - 1 - state.employees.length;}
function bonusMultiplier() {
  return 1 + HARDWARE[state.hardware].bonus + state.tech.reduce((a,i)=>a+TECHNOLOGIES[i].bonus,0) + state.researched.reduce((a,id)=>a+(RESEARCH.find(r=>r.id===id)?.bonus||0),0) + officeTeamBonus();
}
function workerPower(id, project) {
  if(id==='founder') return 9 * (project.skill === 'Kod' ? 1 : project.skill === 'Design' ? 0.75 : 0.5) * officeDeskPower('founder');
  const emp=state.employees.find(e=>String(e.id)===String(id));
  if(!emp) return 0;
  const matching=emp.skill===project.skill ? 1 : (emp.skill==='Zarządzanie'?.76:.55);
  return (emp.power+emp.training*1.5)*(emp.happiness/100*.55+.45)*matching*officeDeskPower(id);
}
function dailyPower(project) {return project.assigned.reduce((total,id)=>total+workerPower(id,project),0)*bonusMultiplier();}
function assignFreeFounder() {
  if(!state.projects.some(p=>p.assigned.includes('founder')) && state.projects.length) {
    state.projects[0].assigned.push('founder');
  }
}
function candidate(role) {
  const r = role || pick(ROLES.filter(x=>x.level<=levelIndex()));
  const exp=rand(0,3), happiness=rand(72,95);
  return {id:nextId(),name:pick(FIRST_NAMES)+' '+pick(LAST_NAMES),role:r.name,skill:r.skill,
    wage:rnd(r.wage*(.92+exp*.08)),power:+(r.power*(1+exp*.08)).toFixed(1),experience:exp,
    happiness,training:0};
}
function createOffer(type) {
  const level=levelIndex();
  const eligible=PROJECT_TYPES.filter(p=>p.level<=level);
  const p=type || pick(eligible);
  const v=.85+Math.random()*.38;
  const work=Math.round(p.work*v);
  const reward=rnd(p.reward*v*(1 + Math.min(state.reputation,450)*.0007));
  const duration=Math.round(p.days*(.91+Math.random()*.45));
  const client=pick(CLIENTS);
  return {id:nextId(),name:p.name,client,description:p.desc,skill:p.skill,work,reward,
    days:duration,level:p.level,difficulty:Math.min(5,1+Math.floor(p.level*.7)),rep:Math.max(3,Math.round(reward/1150)),
    penalty:5, expires:state.day+14};
}
function refillMarket() {
  state.offers=state.offers.filter(o=>o.expires>state.day);
  while(state.offers.length<4) state.offers.push(createOffer());
}
function refreshCandidates() {
  state.candidates=Array.from({length:5},()=>candidate());
}
function newGame(name) {
  state={version:4,name: name.trim().slice(0,30)||'Moja firma IT',day:1,speed:1,cash:10000,reputation:0,
    totalRevenue:0,totalExpenses:0,weekIncome:0,weekExpenses:0,history:[],ledger:[],messages:[],
    completed:0,failed:0,projects:[],offers:[],employees:[],candidates:[],office:0,hardware:0,
    tech:[],researched:[],researchPoints:0,saas:0,loan:null,idSeq:0,lastLevel:0,gameOver:false,
    records:{peakCash:10000,peakStaff:0},eventsSeen:0,market:createMarket(1),officeWorld:createOfficeWorld(0),realMarket:createRealMarket()};
  view='dashboard';modal=null;elapsedDays=0;
  state.offers=[createOffer(PROJECT_TYPES[0]),createOffer(PROJECT_TYPES[0]),createOffer(PROJECT_TYPES[1]),createOffer(PROJECT_TYPES[0])];
  refreshCandidates();
  log('Witaj w IT Company Tycoon! Zdobądź pierwszy kontrakt i rozpocznij przygodę.','good');
  save();render();
}
function save() {
  if(!state) return;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){console.warn('Nie można zapisać gry:',e);}
}
function restore() {
  try {
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    const s=JSON.parse(raw);
    if(!s || ![1,2,3,4].includes(s.version) || !Number.isFinite(s.day) || !Number.isFinite(s.cash) ||
      !Array.isArray(s.projects) || !Array.isArray(s.employees) || !Array.isArray(s.ledger) ||
      !Array.isArray(s.offers) || !Array.isArray(s.candidates) || !Array.isArray(s.messages) ||
      !Array.isArray(s.history) || !Array.isArray(s.tech) || !Array.isArray(s.researched) ||
      typeof s.name !== 'string') return false;
    normalizeMarket(s);
    normalizeOfficeWorld(s);
    normalizeRealMarket(s);
    if(s.version<4){
      // Kopia pierwszego napotkanego starszego zapisu, przed zastąpieniem go nowym formatem.
      try{if(!localStorage.getItem(SAVE_KEY+'-backup-before-real-market'))localStorage.setItem(SAVE_KEY+'-backup-before-real-market',raw);}catch(e){console.warn('Nie udało się utworzyć kopii starszego zapisu:',e);}
    }
    s.version=4;
    state=s;
    state.speed=[0,1,2,5].includes(s.speed)?s.speed:1;
    if(state.gameOver) state.speed=0;
    save(); // Migracja v1/v2/v3 -> v4; kopia starego zapisu zachowana.
    return true;
  } catch(e) {console.warn('Uszkodzony zapis:',e);return false;}
}
function toast(message,bad=false) {
  const target=document.querySelector('#toasts');
  const el=document.createElement('div');
  el.className='toast'+(bad?' bad':'');el.textContent=message;
  target.appendChild(el);
  setTimeout(()=>el.remove(),3400);
}
function updateLevel() {
  let now=levelIndex();
  if(now>state.lastLevel) {
    for(let i=state.lastLevel+1;i<=now;i++) log('Awans! Twoja firma osiągnęła poziom: '+LEVELS[i].name+'.','good');
    state.lastLevel=now;
    refillMarket();refreshCandidates();
    toast('Nowy poziom: '+LEVELS[now].name);
  }
}
function acceptOffer(id) {
  const o=state.offers.find(x=>x.id===id);
  if(!o) return;
  if(state.projects.length>=MAX_ACTIVE) {toast('Możesz prowadzić maksymalnie 3 projekty równocześnie.',true);return;}
  if(state.projects.some(p=>p.client===o.client&&p.name===o.name)) {toast('Masz już taki kontrakt od tego klienta.',true);return;}
  state.projects.push({...o,progress:0,deadline:state.day+o.days,started:state.day,assigned:[],lateWarning:false});
  state.offers=state.offers.filter(x=>x.id!==id);
  assignFreeFounder();
  log('Podpisano kontrakt: '+o.name+' dla '+o.client+'.');
  refillMarket();view='projects';save();render();toast('Zlecenie przyjęte!');
}
function completeProject(p) {
  let late=Math.max(0,state.day-p.deadline);
  const penalty=Math.min(.5,late*.05);
  const paid=Math.round(p.reward*(1-penalty));
  earn(paid,'Kontrakt: '+p.name+' — '+p.client);
  const rep=Math.max(1,Math.round(p.rep*(1-penalty))+(state.researched.includes('quality')?2:0));
  state.reputation+=rep;
  state.researchPoints+=Math.max(5,Math.round(p.work/15));
  state.completed++;
  log('Ukończono „'+p.name+'”! +'+money(paid)+' i +'+rep+' reputacji'+(late?' (opóźnienie '+late+' d.)':'')+'.','good');
  state.projects=state.projects.filter(x=>x.id!==p.id);
  assignFreeFounder();
  updateLevel();
}
function payWeekly() {
  forceExpense(OFFICES[state.office].rent,'Czynsz — '+OFFICES[state.office].name,'Biuro');
  if(HARDWARE[state.hardware].upkeep) forceExpense(HARDWARE[state.hardware].upkeep,'Serwis wyposażenia','Sprzęt');
  if(officeWeeklyUpkeep()) forceExpense(officeWeeklyUpkeep(),'Utrzymanie wyposażenia biura 2D','Biuro 2D');
  if(state.employees.length) forceExpense(state.employees.reduce((s,e)=>s+e.wage,0),'Wynagrodzenia zespołu','Pensje');
  if(state.loan) {
    const amount=Math.min(state.loan.balance,state.loan.payment);
    forceExpense(amount,'Rata kredytu','Kredyt');
    state.loan.balance-=amount;
    state.loan.remaining--;
    if(state.loan.balance<=0){state.loan=null;log('Kredyt został spłacony.','good');}
  }
  if(state.saas) earn(state.saas*1850,'Przychód abonamentowy SaaS','SaaS');
  state.history.push({week:Math.ceil(state.day/7),income:state.weekIncome,expenses:state.weekExpenses,cash:state.cash});
  state.history=state.history.slice(-52);
  const result=state.weekIncome-state.weekExpenses;
  log('Rozliczenie tygodnia: '+(result>=0?'+':'')+money(result)+'.',result>=0?'good':'bad');
  state.weekIncome=0;state.weekExpenses=0;
  state.candidates=Array.from({length:5},()=>candidate());
  if(state.cash<0) {
    state.gameOver=true;state.speed=0;modal=null;
    log('Bankructwo! Firma nie ma środków na pokrycie kosztów.','bad');
  }
}
const RANDOM_EVENTS = [
  {title:'Awaria infrastruktury',desc:'Serwer produkcyjny odmówił posłuszeństwa. Czy przeznaczysz środki na naprawę?',options:[
    {label:'Napraw teraz · 850 zł',cost:850,rep:1,note:'Szybka reakcja uratowała reputację.'},
    {label:'Pracujemy ręcznie · −3 reputacji',rep:-3,note:'Klienci skarżą się na opóźnienia.'}]},
  {title:'Nowy klient poleca firmę',desc:'Zadowolony klient opublikował pozytywną opinię o Twoim zespole.',options:[
    {label:'Promuj opinię · 500 zł',cost:500,rep:5,note:'Kampania wizerunkowa przyciąga zainteresowanie.'},
    {label:'Podziękuj · +2 reputacji',rep:2,note:'Dobry kontakt z klientami procentuje.'}]},
  {title:'Dotacja na innowacje',desc:'Pojawiła się możliwość pozyskania dodatkowego finansowania.',options:[
    {label:'Przyjmij dotację · +2 500 zł',cash:2500,note:'Pozyskano finansowanie rozwoju.'},
    {label:'Postaw na niezależność · +5 punktów B+R',rp:5,note:'Skupiasz się na własnym rozwoju.'}]},
  {title:'Hackathon w mieście',desc:'Zespół dostał zaproszenie na prestiżowy hackathon.',options:[
    {label:'Weź udział · 750 zł',cost:750,rp:18,rep:2,note:'Zespół wraca z nowymi pomysłami.'},
    {label:'Zostań przy projektach',note:'Firma skupia się na bieżących zleceniach.'}]},
  {title:'Premia motywacyjna',desc:'Zespół sugeruje uruchomienie programu motywacyjnego.',options:[
    {label:'Premia zespołowa · 1 000 zł',cost:1000,morale:16,note:'Satysfakcja pracowników wzrosła.'},
    {label:'Nie teraz · −8 zadowolenia',morale:-8,note:'Zespół przyjął decyzję bez entuzjazmu.'}]}
];
function maybeEvent() {
  if(state.day>7 && state.day%9===0 && Math.random()<.75 && !state.gameOver) {
    const item=pick(RANDOM_EVENTS);
    state.eventsSeen++;
    state.speed=0;
    modal={kind:'event',event:item};
    log('Wydarzenie: '+item.title+'.');
  }
}
function dayStep() {
  if(!state || state.gameOver)return;
  state.day++;
  marketStep();
  const completed=[];
  for(const project of state.projects) {
    project.progress=Math.min(project.work,project.progress+dailyPower(project));
    if(project.progress>=project.work) completed.push(project);
    if(state.day>project.deadline && !project.lateWarning){
      project.lateWarning=true;log('Opóźnienie: '+project.name+'. Kary rosną z każdym dniem!','bad');
    }
  }
  completed.forEach(p=>completeProject(p));
  state.offers=state.offers.filter(o=>o.expires>state.day);
  if(state.day%7===0) payWeekly();
  if(state.day%5===0) refillMarket();
  if(state.day%7===0){
    for(const e of state.employees)e.happiness=clamp(e.happiness-2,35,100);
    officeWeeklyMorale();
  }
  state.records.peakCash=Math.max(state.records.peakCash,state.cash);
  state.records.peakStaff=Math.max(state.records.peakStaff,state.employees.length);
  updateLevel();
  maybeEvent();
  save();render();
}
function resolveEvent(optionIndex) {
  if(modal?.kind!=='event')return;
  const e=modal.event.options[optionIndex];if(!e)return;
  if(e.cost && !spend(e.cost,'Wydarzenie: '+modal.event.title,'Wydarzenia'))return;
  if(e.cash)earn(e.cash,'Dotacja na rozwój','Dotacje');
  if(e.rep)state.reputation=Math.max(0,state.reputation+e.rep);
  if(e.rp)state.researchPoints+=e.rp;
  if(e.morale)state.employees.forEach(p=>p.happiness=clamp(p.happiness+e.morale,25,100));
  log(e.note,e.rep<0||e.morale<0?'bad':'good');
  modal=null;updateLevel();save();render();
}

/* Widoki i komponenty UI — każdy jest generowany z aktualnego stanu gry. */
function header(title,subtitle,actions='') {
  return `<div class="section-header"><div><div class="eyebrow">IT COMPANY TYCOON / ${esc(currentLevel().name)}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions?`<div class="header-actions">${actions}</div>`:''}</div>`;
}
function button(action,label,kind='secondary',attrs='',ico='') {
  return `<button class="btn ${kind}" data-action="${action}" ${attrs}>${ico?icon(ico):''}${label}</button>`;
}
function bar(current,total,variant='') {return `<div class="progress ${variant}"><span style="width:${perc(current,total).toFixed(1)}%"></span></div>`;}
function metric(label,value,sub,ico,tone='') {
  return `<article class="metric"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon ${tone}">${icon(ico)}</span></div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></article>`;
}
function revenueProfit() {return state.totalRevenue-state.totalExpenses;}
function balanceTone(n) {return n>=0?'positive':'negative';}
function metrics() {
  return `<div class="stats-grid">
    ${metric('Saldo firmy',money(state.cash),'Kapitał do dyspozycji','wallet')}
    ${metric('Wynik całkowity',`<span class="${balanceTone(revenueProfit())}">${revenueProfit()>0?'+':''}${money(revenueProfit())}</span>`,'Przychody minus wszystkie wydatki','chart','green')}
    ${metric('Zespół',`${state.employees.length+1} <span class="muted" style="font-size:16px">/ ${OFFICES[state.office].capacity}</span>`,'Z Tobą jako założycielem','users','cyan')}
    ${metric('Reputacja',`${number(state.reputation)} <span class="muted" style="font-size:15px">pkt</span>`,'Poziom: '+esc(currentLevel().name),'trophy','amber')}
  </div>`;
}
function projectCard(p) {
  const pct=perc(p.progress,p.work);
  const remaining=p.deadline-state.day;
  const members=p.assigned.map(id=>id==='founder'?'Założyciel':state.employees.find(e=>String(e.id)===String(id))?.name).filter(Boolean);
  return `<article class="project-card">
    <div class="card-title-row"><div><div class="offer-client">${esc(p.client)}</div><h3>${esc(p.name)}</h3></div><span class="pill ${remaining<0?'red':remaining<=5?'amber':'green'}">${remaining<0?'+'+Math.abs(remaining)+' dni po terminie':remaining+' dni do terminu'}</span></div>
    <p class="card-desc">${esc(p.description)}</p>
    <div class="flex-row small" style="margin-bottom:7px"><strong>Postęp realizacji</strong><strong>${Math.round(pct)}%</strong></div>
    ${bar(p.progress,p.work,remaining<0?'red':'')}
    <div class="card-meta"><span>${icon('clock','sm')} ${number(Math.ceil(p.work-p.progress))} pkt pracy pozostało</span><span>${icon('users','sm')} ${members.length} os. w projekcie</span><span>${icon('zap','sm')} ${dailyPower(p).toFixed(1)} pkt/dzień</span></div>
    <div class="card-footer"><span><span class="muted tiny">Wynagrodzenie</span><br/><strong class="positive">${money(p.reward)}</strong></span>${button('assign','Przydziel zespół','secondary',`data-id="${p.id}"`,'users')}</div>
    ${members.length?`<div class="tiny muted" style="margin-top:10px">Zespół: ${esc(members.join(', '))}</div>`:'<div class="tiny warning" style="margin-top:10px">Nikt nie pracuje nad tym projektem. Przydziel pracownika!</div>'}
  </article>`;
}
function offerCard(o) {
  return `<article class="offer-card"><div class="offer-topline"><span class="pill">Poziom trudności ${o.difficulty}/5</span><span class="muted tiny">Oferta do dnia ${o.expires}</span></div>
  <div class="flex-row" style="justify-content:flex-start;margin-bottom:9px"><span class="company-icon">${icon('briefcase','lg')}</span><div><div class="offer-client">${esc(o.client)}</div><h3>${esc(o.name)}</h3></div></div>
  <p class="card-desc">${esc(o.description)}</p>
  <div class="card-meta"><span>Wysiłek: <strong>${o.work} pkt</strong></span><span>Termin: <strong>${o.days} dni</strong></span><span>Specjalizacja: <strong>${esc(o.skill)}</strong></span><span>Reputacja: <strong>+${o.rep}</strong></span></div>
  <div class="card-footer"><div><div class="tiny muted">Wartość kontraktu</div><div class="reward">${money(o.reward)}</div></div>${button('accept','Przyjmij kontrakt','primary',`data-id="${o.id}" ${state.projects.length>=MAX_ACTIVE?'disabled':''}`,'plus')}</div></article>`;
}
function empty(title,description,buttonHtml='',ico='briefcase') {return `<div class="empty-state"><div class="empty-icon">${icon(ico)}</div><h3>${title}</h3><p>${description}</p>${buttonHtml}</div>`;}
function financeChart() {
  const weeks=state.history.slice(-9);
  const data=weeks.length?weeks:[{week:1,income:0,expenses:0}];
  const max=Math.max(1,...data.map(w=>Math.max(w.income,w.expenses)));
  return `<div class="charts" role="img" aria-label="Przychody i koszty w kolejnych tygodniach gry">${data.map(w=>`<div class="chart-col"><div class="chart-bars"><div title="Przychody: ${money(w.income)}" class="chart-bar" style="height:${Math.max(2,w.income/max*100)}%"></div><div title="Koszty: ${money(w.expenses)}" class="chart-bar expense" style="height:${Math.max(2,w.expenses/max*100)}%"></div></div><small>T${w.week}</small></div>`).join('')}</div>
    <div class="flex-row" style="margin-top:14px"><div class="legend"><span><i></i> Przychody</span><span><i class="expense"></i> Wydatki</span></div><span class="dim tiny">Ostatnie 9 tygodni</span></div>`;
}
function feed(limit=6) {return `<div class="card-list" style="gap:0">${state.messages.slice(0,limit).map(m=>`<div class="feed-row"><span class="feed-dot ${m.tone==='good'?'green':m.tone==='bad'?'red':''}"></span><div><p>${esc(m.text)}</p><time>Dzień ${m.day}</time></div></div>`).join('')}</div>`;}
function dashboard() {
  const next=LEVELS[levelIndex()+1];
  return `${header('Centrum dowodzenia',`Witaj w ${esc(state.name)}. Twoje technologiczne imperium zaczyna się tutaj.`,button('nav','Znajdź kontrakt','primary','data-view="projects"','plus'))}
    ${state.gameOver?bankruptcyBanner():''}${metrics()}
    <div class="info-banner"><div><div class="banner-label">ROZWÓJ TWOJEJ FIRMY</div><strong>${esc(currentLevel().name)}</strong><p>${next?`Następny poziom: ${esc(next.name)} · reputacja ${next.rep}, przychody ${money(next.revenue)}, pracownicy ${next.employees}`:'Osiągnięto najwyższy poziom rozwoju!'} </p></div><span class="pill green">${icon('trophy','sm')} Poziom ${levelIndex()+1} / 8</span></div>
    <div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Aktywne projekty</h2><p>${state.projects.length} / ${MAX_ACTIVE} jednocześnie</p></div>${button('nav','Wszystkie','secondary','data-view="projects"','arrow')}</div>
    ${state.projects.length?`<div class="card-list">${state.projects.map(projectCard).join('')}</div>`:empty('Brak aktywnych projektów','Przyjmij pierwsze zlecenie i zacznij zarabiać na swojej firmie.',button('nav','Przejdź do kontraktów','primary','data-view="projects"'),'briefcase')}
    </section><section class="panel"><div class="panel-head"><div><h2>Aktualności firmy</h2><p>Ostatnie wydarzenia i decyzje</p></div><span class="pill gray">${icon('bell','sm')} LIVE</span></div>${feed(8)}</section></div>
    <div class="two-col section-space"><section class="panel"><div class="panel-head"><div><h2>Przepływ finansów</h2><p>Zestawienie tygodniowych przychodów i wydatków</p></div>${button('nav','Finanse','ghost','data-view="finance"','arrow')}</div>${financeChart()}</section>
    <section class="panel"><div class="panel-head"><div><h2>Wskaźniki operacyjne</h2><p>Podsumowanie bieżącej działalności</p></div>${icon('chart','lg')}</div>
    <div class="line-row"><span>Koszty tygodniowe</span><strong class="negative">${money(weeklyBurn())}</strong></div>
    <div class="line-row"><span>Ukończone kontrakty</span><strong>${state.completed}</strong></div>
    <div class="line-row"><span>Punkty badań B+R</span><strong>${number(state.researchPoints)}</strong></div>
    <div class="line-row"><span>Wydajność firmy</span><strong class="positive">+${Math.round((bonusMultiplier()-1)*100)}%</strong></div>
    <div class="line-row"><span>Szacowana wartość firmy</span><strong>${money(companyValue())}</strong></div>
    <div class="line-row"><span>Portfel akcji</span><strong class="cyan">${money(marketPortfolioValue(state.market))}</strong></div>
    ${state.saas?`<div class="line-row"><span>Przychód tygodniowy SaaS</span><strong class="positive">${money(state.saas*1850)}</strong></div>`:''}</section></div>`;
}
function projectsView() {
  return `${header('Zarządzanie projektami','Przyjmuj kontrakty, przydzielaj specjalistów i pilnuj terminów.',button('refresh-offers','Odśwież oferty · 300 zł','secondary','','zap'))}
    ${state.projects.length>=MAX_ACTIVE?'<div class="notice">Osiągnięto limit 3 aktywnych projektów. Dokończ kontrakt, aby przyjąć kolejny.</div>':''}
    <section class="panel"><div class="panel-head"><div><h2>W realizacji</h2><p>Postęp zwiększa się w każdym dniu symulacji</p></div><span class="pill">${state.projects.length} / ${MAX_ACTIVE}</span></div>
      ${state.projects.length?`<div class="column-list">${state.projects.map(projectCard).join('')}</div>`:empty('Twój kalendarz jest pusty','Wybierz zlecenie z giełdy projektów poniżej.','')}
    </section>
    <section class="section-space"><div class="panel-head"><div><h2>Giełda zleceń</h2><p>Nowe oferty pojawiają się regularnie. Większe kontrakty odblokujesz wraz z rozwojem firmy.</p></div><span class="pill gray">${state.offers.length} dostępne</span></div>
    <div class="grid-offers">${state.offers.map(offerCard).join('')}</div></section>`;
}
function employeeCard(e) {
  const assigned=state.projects.find(p=>p.assigned.some(id=>String(id)===String(e.id)));
  const trainCost=1000+e.training*800;
  const bonusCost=500+Math.round(e.wage*.4);
  return `<article class="candidate-card"><div class="worker-card-top"><span class="avatar ${e.happiness>=80?'green':''}">${esc(e.name.split(' ').map(w=>w[0]).join(''))}</span><div style="flex:1"><h3>${esc(e.name)}</h3><div class="muted tiny">${esc(e.role)}</div></div><span class="pill ${assigned?'green':'gray'}">${assigned?'Pracuje':'Wolny'}</span></div>
  <div class="skills"><span class="skill-chip">${esc(e.skill)}</span><span class="skill-chip">Dośw. ${e.experience}</span><span class="skill-chip">Moc ${e.power.toFixed(1)}</span></div>
  <div class="worker-stat"><span>Zadowolenie</span><strong>${e.happiness}%</strong></div>${bar(e.happiness,100,e.happiness<50?'red':'green')}
  <div class="card-meta"><span>Pensja: <strong>${money(e.wage)}/tydz.</strong></span><span>${assigned?'Projekt: '+esc(assigned.name):'Dostępny do projektu'}</span></div>
  <div class="worker-actions">${button('train','Szkolenie · '+money(trainCost),'secondary',`data-id="${e.id}" ${state.cash<trainCost?'disabled':''}`,'flask')}${button('bonus','Premia · '+money(bonusCost),'secondary',`data-id="${e.id}" ${state.cash<bonusCost?'disabled':''}`,'coins')}${button('fire','Zwolnij','danger',`data-id="${e.id}"`,'x')}</div></article>`;
}
function candidateCard(e) {
  return `<article class="candidate-card"><div class="worker-card-top"><span class="avatar">${esc(e.name.split(' ').map(w=>w[0]).join(''))}</span><div style="flex:1"><h3>${esc(e.name)}</h3><div class="muted tiny">${esc(e.role)}</div></div><span class="pill gray">Kandydat</span></div><div class="skills"><span class="skill-chip">${esc(e.skill)}</span><span class="skill-chip">Dośw. ${e.experience}</span><span class="skill-chip">Moc ${e.power.toFixed(1)}</span></div>
  <div class="card-footer"><div><span class="tiny muted">Pensja tygodniowa</span><br/><strong>${money(e.wage)}</strong></div>${button('hire','Zatrudnij','primary',`data-id="${e.id}" ${availableSlots()<1?'disabled':''}`,'plus')}</div></article>`;
}
function teamView() {
  return `${header('Zespół i rekrutacja','Znajdź ekspertów, zadbaj o ich motywację i buduj kompetencje.',button('refresh-candidates','Nowi kandydaci · 350 zł','secondary','','users'))}
    <div class="stat-mini-row" style="margin-bottom:20px"><div class="stat-mini"><small>Pracownicy (bez Ciebie)</small><b>${state.employees.length}</b></div><div class="stat-mini"><small>Wolne stanowiska</small><b>${availableSlots()}</b></div><div class="stat-mini"><small>Pensje tygodniowe</small><b>${money(state.employees.reduce((s,e)=>s+e.wage,0))}</b></div></div>
    <section class="panel"><div class="panel-head"><div><h2>Twój zespół</h2><p>Wszystkie zatrudnione osoby i ich zadania</p></div><span class="pill green">${state.employees.length+1} osób z założycielem</span></div>
    <div class="founder-card flex-row"><div class="flex-row" style="justify-content:flex-start"><span class="avatar green">CEO</span><div><strong>Ty — założyciel firmy</strong><div class="tiny muted">Programowanie, strategia · 9 pkt/dzień przy projektach webowych</div></div></div><span class="pill">Bez pensji</span></div>
    ${state.employees.length?`<div class="worker-grid">${state.employees.map(employeeCard).join('')}</div>`:empty('Pracujesz samodzielnie','Zatrudnij pierwszego pracownika, aby szybciej realizować projekty.', '', 'users')}</section>
    <section class="section-space"><div class="panel-head"><div><h2>Dostępni kandydaci</h2><p>Lista kandydatów zmienia się co tydzień gry</p></div></div>
    ${availableSlots()<1?'<div class="notice">Biuro jest pełne. Ulepsz powierzchnię biurową, aby zatrudnić kolejne osoby.</div>':''}
    <div class="grid-offers">${state.candidates.map(candidateCard).join('')}</div></section>`;
}
function financeView() {
  const loan=state.loan;
  return `${header('Finanse przedsiębiorstwa','Kontroluj płynność, przychody, koszty i zobowiązania.')}
    ${metrics()}
    <div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Historia tygodni</h2><p>Realne wpływy i wydatki z symulacji</p></div></div>${financeChart()}
    <div class="divider"></div><div class="line-row"><span>Łączne przychody</span><strong class="positive">${money(state.totalRevenue)}</strong></div>
    <div class="line-row"><span>Wartość akcji (aktywa, nie gotówka)</span><strong class="cyan">${money(marketPortfolioValue(state.market))}</strong></div><div class="line-row"><span>Łączne wydatki</span><strong class="negative">${money(state.totalExpenses)}</strong></div><div class="line-row"><span>Wynik</span><strong class="${balanceTone(revenueProfit())}">${money(revenueProfit())}</strong></div></section>
    <section class="panel"><div class="panel-head"><div><h2>Zobowiązania i budżet</h2><p>Przewidywane koszty najbliższego tygodnia</p></div></div>
    <div class="line-row"><span>Czynsz biura</span><strong>${money(OFFICES[state.office].rent)}</strong></div>
    <div class="line-row"><span>Wynagrodzenia</span><strong>${money(state.employees.reduce((a,e)=>a+e.wage,0))}</strong></div>
    <div class="line-row"><span>Serwis sprzętu</span><strong>${money(HARDWARE[state.hardware].upkeep)}</strong></div>
    <div class="line-row"><span>Rata kredytu</span><strong>${money(loan?Math.min(loan.balance,loan.payment):0)}</strong></div>
    <div class="line-row"><span>Przychody z SaaS</span><strong class="positive">${money(state.saas*1850)}</strong></div>
    <div class="divider"></div><div class="flex-row"><span class="muted">Bilans stały na tydzień</span><strong class="${balanceTone(state.saas*1850-weeklyBurn())}">${money(state.saas*1850-weeklyBurn())}</strong></div>
    <div class="divider"></div><h3>Kredyt dla firmy</h3>
    ${loan?`<p>Do spłaty: <strong>${money(loan.balance)}</strong> · Rata ${money(loan.payment)} / tydzień · pozostało maks. ${loan.remaining} rozliczeń.</p>${button('repay-loan','Spłać wcześniej · '+money(loan.balance),'secondary',state.cash<loan.balance?'disabled':'','check')}`:
      `<p>Możesz jednorazowo zaciągnąć kredyt w wysokości 15 000 zł. Całkowita spłata: 18 000 zł w 12 tygodniach po 1 500 zł.</p>${button('take-loan','Weź kredyt · 15 000 zł','primary','','coins')}`}
    </section></div>
    <section class="panel section-space"><div class="panel-head"><div><h2>Historia transakcji</h2><p>Ostatnie 25 operacji w firmie</p></div><span class="pill gray">${state.ledger.length} zapisów</span></div>
    ${state.ledger.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Dzień</th><th>Operacja</th><th>Kategoria</th><th style="text-align:right">Kwota</th></tr></thead><tbody>${state.ledger.slice(0,25).map(l=>`<tr><td>${l.day}</td><td>${esc(l.title)}</td><td><span class="tag">${esc(l.category)}</span></td><td style="text-align:right" class="${balanceTone(l.amount)}">${l.amount>0?'+':''}${money(l.amount)}</td></tr>`).join('')}</tbody></table></div>`:empty('Brak transakcji','Pierwsze przychody i wydatki pojawią się tutaj.')}</section>`;
}
function officeView() {
  return `${header('Biuro i infrastruktura','Zwiększaj powierzchnię, aby móc rozwijać zespół.')}
  <div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Twoja siedziba</h2><p>Obecny poziom i dostępne miejsca pracy</p></div><span class="pill green">Aktywne</span></div>
  <div class="upgrade-hero" style="margin-bottom:20px"><span class="upgrade-icon">${icon('building','lg')}</span><div><h2>${OFFICES[state.office].name}</h2><p>${OFFICES[state.office].detail}</p></div></div>
  <div class="line-row"><span>Stanowiska zajęte</span><strong>${state.employees.length+1} / ${OFFICES[state.office].capacity}</strong></div>
  ${bar(state.employees.length+1,OFFICES[state.office].capacity)}
  <div class="line-row"><span>Czynsz / tydzień</span><strong class="negative">${money(OFFICES[state.office].rent)}</strong></div>
  <div class="line-row"><span>Wyposażenie / tydzień</span><strong class="negative">${money(officeWeeklyUpkeep())}</strong></div>
  <div style="margin-top:15px">${button('nav','Otwórz interaktywne biuro','primary','data-view="office2d"','arrow')}</div>
  <div class="line-row"><span>Wolne stanowiska</span><strong>${availableSlots()}</strong></div>
  </section><section class="panel"><div class="panel-head"><div><h2>Rozbudowa biura</h2><p>Przeprowadzaj firmę do większych lokali</p></div></div>
  <div class="office-timeline">${OFFICES.map((o,i)=>`<div class="office-tier ${i===state.office?'current':i===state.office+1?'next':''}"><div class="office-details"><h3>${i<state.office?'✓ ':''}${esc(o.name)}</h3><p>${o.capacity} stanowisk · ${money(o.rent)} / tydzień</p></div>${i===state.office?'<span class="pill green">Obecne</span>':i<state.office?'<span class="pill gray">Ukończono</span>':i===state.office+1?button('upgrade-office','Kup · '+money(o.price),'primary',`data-id="${i}" ${state.cash<o.price?'disabled':''}`,'arrow'):'<span class="pill gray">Zablokowane</span>'}</div>`).join('')}</div>
  </section></div>`;
}
function upgradesView() {
  const next=HARDWARE[state.hardware+1];
  return `${header('Ulepszenia technologiczne','Inwestuj w sprzęt i narzędzia, by zwiększać wydajność zespołu.')}
    <div class="stat-mini-row" style="margin-bottom:20px"><div class="stat-mini"><small>Łączna premia do pracy</small><b class="positive">+${Math.round((bonusMultiplier()-1)*100)}%</b></div><div class="stat-mini"><small>Poziom infrastruktury</small><b>${state.hardware+1}/5</b></div><div class="stat-mini"><small>Aktywne technologie</small><b>${state.tech.length}/5</b></div></div>
    <section class="panel"><div class="panel-head"><div><h2>Sprzęt komputerowy</h2><p>Jedno ulepszenie obejmuje wyposażenie całej firmy</p></div></div>
    <div class="upgrade-hero"><span class="upgrade-icon">${icon('zap','lg')}</span><div style="flex:1"><h3>${esc(HARDWARE[state.hardware].name)}</h3><p>Premia wydajności sprzętowej +${Math.round(HARDWARE[state.hardware].bonus*100)}% · Serwis ${money(HARDWARE[state.hardware].upkeep)}/tydz.</p>
    ${next?`<div class="line-row"><span>Następny poziom: <strong>${esc(next.name)}</strong></span><span class="positive">+${Math.round(next.bonus*100)}% łącznie</span></div>${button('upgrade-hardware','Ulepsz za '+money(next.price),'primary',state.cash<next.price?'disabled':'','arrow')}`:'<span class="pill green">Maksymalny poziom</span>'}</div></div>
    </section>
    <section class="section-space"><div class="panel-head"><div><h2>Technologie programistyczne</h2><p>Stałe korzyści, które sumują się z ulepszeniami sprzętu</p></div></div>
    <div class="upgrade-grid">${TECHNOLOGIES.map((t,i)=>{const bought=state.tech.includes(i);const locked=i>0&&!state.tech.includes(i-1);return `<article class="upgrade-card"><div class="upgrade-hero"><span class="upgrade-icon">${icon('zap','lg')}</span><div><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p></div></div><div class="card-footer"><span class="pill ${bought?'green':'gray'}">+${Math.round(t.bonus*100)}% wydajności</span>${bought?'<span class="pill green">Aktywne ✓</span>':button('buy-tech','Kup · '+money(t.cost),'primary',`data-id="${i}" ${locked||state.cash<t.cost?'disabled':''}`,'plus')}</div>${locked?'<p class="tiny warning" style="margin:8px 0 0">Najpierw odblokuj poprzednią technologię.</p>':''}</article>`}).join('')}</div></section>`;
}
function researchView() {
  return `${header('Badania i rozwój','Wymieniaj punkty B+R na trwałe przewagi konkurencyjne.')}
    <div class="info-banner"><div><div class="banner-label">KAPITAŁ INNOWACJI</div><h2 style="margin:5px 0">${number(state.researchPoints)} punktów B+R</h2><p>Punkty zdobywasz za kończenie projektów oraz specjalne wydarzenia.</p></div><span class="upgrade-icon">${icon('flask','lg')}</span></div>
    <div class="upgrade-grid">${RESEARCH.map((r,i)=>{const has=state.researched.includes(r.id);const locked=levelIndex()<r.level || (i>0&&!state.researched.includes(RESEARCH[i-1].id));const affordable=state.cash>=r.cost&&state.researchPoints>=r.rp;
       return `<article class="research-card"><div class="flex-row"><span class="upgrade-icon">${icon(r.id==='saas'?'coins':'flask','lg')}</span><span class="pill ${has?'green':locked?'gray':'amber'}">${has?'Odkryte':locked?'Zablokowane':'Do odkrycia'}</span></div><h3 style="margin-top:12px">${esc(r.name)}</h3><p>${esc(r.desc)}</p><div class="card-meta"><span>Wymagane: <strong>${r.rp} pkt B+R</strong></span><span><strong>${money(r.cost)}</strong></span><span>Poziom firmy: <strong>${r.level+1}</strong></span></div><div class="card-footer">${has?'<span class="pill green">Aktywne ✓</span>':button('research','Zbadaj technologię','primary',`data-id="${i}" ${locked||!affordable?'disabled':''}`,'flask')}</div></article>`;}).join('')}</div>
    <section class="panel section-space"><div class="panel-head"><div><h2>Własny produkt SaaS</h2><p>Stwórz rozwiązanie subskrypcyjne i otrzymuj regularny przychód</p></div><span class="pill green">${state.saas} produktów</span></div>
    <div class="flex-row" style="align-items:flex-start"><div><h3>Platforma abonamentowa</h3><p>Każdy produkt kosztuje 28 000 zł i zapewnia 1 850 zł przychodu tygodniowo. Możesz stworzyć do 5 produktów.</p></div>${button('create-saas','Uruchom produkt · 28 000 zł','primary',`${!state.researched.includes('saas')||state.cash<28000||state.saas>=5?'disabled':''}`,'plus')}</div>
    ${!state.researched.includes('saas')?'<div class="tiny warning">Najpierw odkryj technologię „Własny produkt SaaS”.</div>':''}
    </section>`;
}
function statsView() {
  const achieved=ACHIEVEMENTS.filter(a=>a.test(state)).length;
  return `${header('Statystyki i osiągnięcia','Zobacz, jak daleko zaszła Twoja firma oraz co jeszcze przed Tobą.')}
    <div class="stat-mini-row" style="margin-bottom:20px"><div class="stat-mini"><small>Ukończone kontrakty</small><b>${state.completed}</b></div><div class="stat-mini"><small>Wartość firmy</small><b>${money(companyValue())}</b></div><div class="stat-mini"><small>Osiągnięcia</small><b>${achieved}/${ACHIEVEMENTS.length}</b></div></div>
    <div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Statystyki kariery</h2><p>Historia Twojego przedsiębiorstwa</p></div></div>
    <div class="line-row"><span>Czas prowadzenia firmy</span><strong>${state.day} dni / ${Math.floor((state.day-1)/7)} pełnych tygodni</strong></div>
    <div class="line-row"><span>Najwyższy stan konta</span><strong>${money(state.records.peakCash)}</strong></div>
    <div class="line-row"><span>Największy zespół</span><strong>${state.records.peakStaff+1} os.</strong></div>
    <div class="line-row"><span>Poziom firmy</span><strong>${esc(currentLevel().name)}</strong></div>
    <div class="line-row"><span>Przychody łączne</span><strong class="positive">${money(state.totalRevenue)}</strong></div>
    <div class="line-row"><span>Aktywa giełdowe</span><strong>${money(marketPortfolioValue(state.market))}</strong></div>
    <div class="line-row"><span>Wynik inwestycji + dywidendy</span><strong class="${balanceTone(marketAllPnL(state.market))}">${profitMoney(marketAllPnL(state.market))}</strong></div>
    <div class="line-row"><span>Wydatki łączne</span><strong class="negative">${money(state.totalExpenses)}</strong></div>
    <div class="line-row"><span>Wydarzenia losowe</span><strong>${state.eventsSeen}</strong></div>
    <div class="line-row"><span>Technologie odkryte</span><strong>${state.researched.length}</strong></div>
    </section><section class="panel"><div class="panel-head"><div><h2>Wykres finansowy</h2><p>Przychody i wydatki według tygodni</p></div></div>${financeChart()}</section></div>
    <section class="section-space"><div class="panel-head"><div><h2>Osiągnięcia</h2><p>Odblokowane: ${achieved} / ${ACHIEVEMENTS.length}</p></div></div><div class="achievement-grid">${ACHIEVEMENTS.map(a=>`<article class="achievement ${a.test(state)?'':'locked'}"><span class="pill ${a.test(state)?'green':'gray'}">${icon(a.test(state)?'trophy':'shield','sm')} ${a.test(state)?'Zdobyte':'Nieodblokowane'}</span><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p></article>`).join('')}</div></section>`;
}
function settingsView() {
  return `${header('Ustawienia i zapis','Dostosuj rozgrywkę i zarządzaj swoimi postępami.')}
  <div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Stan zapisu</h2><p>Gra automatycznie zapisuje się lokalnie po każdej decyzji i dniu</p></div>${icon('save','lg')}</div>
    <div class="line-row"><span>Nazwa przedsiębiorstwa</span><strong>${esc(state.name)}</strong></div>
    <div class="line-row"><span>Aktualny dzień</span><strong>${state.day}</strong></div>
    <div class="line-row"><span>Miejsce zapisu</span><strong>localStorage (ta przeglądarka)</strong></div>
    <div class="divider"></div><div class="flex-wrap">${button('manual-save','Zapisz teraz','primary','','save')}${button('export-save','Eksportuj zapis .json','secondary','','arrow')}</div>
    <div class="divider"></div><label class="form-label" for="import-save">Importuj plik zapisu (.json)</label><input class="form-input" type="file" id="import-save" accept="application/json,.json"/><p class="tiny muted" style="margin-top:9px">Import nadpisuje aktualną rozgrywkę po potwierdzeniu.</p>
    </section><section class="panel"><div class="panel-head"><div><h2>Nowa rozgrywka</h2><p>Rozpocznij grę od 10 000 zł i poziomu Freelancer</p></div></div>
    <div class="notice red">Uwaga: rozpoczęcie nowej gry nadpisze aktualny zapis w tej przeglądarce. Najpierw możesz wyeksportować stan.</div>
    ${button('reset-game','Zacznij od nowa','danger','','x')}
    <div class="divider"></div><h3>Jak działa czas?</h3><p>Jedna jednostka dnia trwa 2,2 sekundy przy prędkości 1×. Co 7 dni pobierany jest czynsz i wypłacane są pensje. Gdy gra jest w pauzie, czas nie płynie.</p>
    <h3>Sterowanie</h3><p>Przyjmij kontrakt, przypisz założyciela i pracowników, a następnie uruchom czas. Ulepszaj biuro, aby zwiększać liczbę stanowisk.</p>
    <p class="tiny dim">Tryb fikcyjnej giełdy i biuro działają offline. Giełda REAL wymaga uprawnionej integracji z API (Netlify Functions).</p></section></div>`;
}
function bankruptcyBanner() {
 return `<div class="panel game-over" style="margin-bottom:20px"><h2>Firma ogłosiła bankructwo</h2><p>Nie udało się pokryć tygodniowych zobowiązań. Możesz przeanalizować statystyki albo rozpocząć nową grę.</p>${button('reset-game','Nowa rozgrywka','danger')}</div>`;
}
function startScreen() {
  return `<main class="start-screen"><section class="start-copy"><div class="brand"><span class="brand-icon">${icon('zap')}</span><div><strong>IT COMPANY</strong><span>TYCOON / SIMULATOR</span></div></div>
    <div class="eyebrow">SYMULATOR BIZNESU IT · OFFLINE + OPCJONALNA GIEŁDA REAL</div><h1>Od zera do <span class="gradient-text">technologicznego imperium.</span></h1>
    <p>Zakładaj firmę, zdobywaj kontrakty, zatrudniaj specjalistów i inwestuj w innowacje. Każda decyzja wpływa na przyszłość Twojej firmy.</p>
    <div class="start-features"><span>◈ Realna ekonomia</span><span>◈ Zespół IT</span><span>◈ Badania i rozwój</span><span>◈ Fikcyjna giełda</span><span>◈ Real Market · API</span><span>◈ Żyjące biuro 2D</span><span>◈ Automatyczny zapis</span></div>
  </section><section class="start-panel"><span class="start-logo">${icon('briefcase','lg')}</span><div class="eyebrow">NOWA HISTORIA</div><h2>Załóż własną firmę</h2><p>Każda wielka marka zaczynała od pomysłu. Jak będzie nazywać się Twoja?</p>
   <form id="new-game-form"><label for="company-input" class="form-label">Nazwa firmy technologicznej</label><input id="company-input" name="company" class="form-input" maxlength="30" required placeholder="np. Nexus Software" value="Nexus Software"/>
   <button type="submit" class="btn block" style="margin-top:18px">${icon('play')} Rozpocznij karierę ${icon('arrow')}</button></form>
   <div class="divider"></div><div class="start-tokens"><span>Kapitał na start</span><strong>10 000 zł</strong></div><div class="start-tokens"><span>Stanowiska w biurze</span><strong>2 miejsca</strong></div><div class="start-tokens"><span>Pracownicy</span><strong>0</strong></div>
  </section></main>`;
}
function sidebar() {
  return `<aside class="sidebar"><div class="brand"><span class="brand-icon">${icon('zap')}</span><div><strong>IT COMPANY</strong><span>TYCOON</span></div></div>
   <div class="nav-caption">ZARZĄDZANIE</div><nav class="nav" aria-label="Menu gry">${NAV.map(([key,ico,label])=>`<button class="nav-btn ${key===view?'active':''}" data-action="nav" data-view="${key}">${icon(ico)}${label}</button>`).join('')}</nav>
   <div class="sidebar-bottom"><div class="sidebar-tip"><span class="tip-icon">${icon('sparkles')}</span><strong>Wskazówka</strong><p>Pracownicy wymagają cotygodniowych pensji. Zanim rozbudujesz zespół, zadbaj o płynność finansową.</p></div><div class="tiny dim" style="margin-top:15px;text-align:center">IT Company Tycoon · Real Market 3.0</div></div></aside>`;
}
function topbar() {
  return `<header class="topbar"><div class="breadcrumbs"><strong>${esc(state.name)}</strong> <span class="dim"> / ${esc(NAV.find(n=>n[0]===view)?.[2]||'Dashboard')}</span><div class="tiny dim">${esc(currentLevel().name)}</div></div>
    <div class="top-controls"><div class="date-chip">${icon('clock','sm')} Dzień ${state.day} · Tydzień ${Math.ceil(state.day/7)}</div><div class="speed-group" role="group" aria-label="Prędkość symulacji">${[0,1,2,5].map(s=>`<button class="speed-btn ${state.speed===s?'active':''}" data-action="speed" data-speed="${s}" aria-label="${s===0?'Pauza':`Prędkość ${s} razy`}" title="${s===0?'Pauza':`${s}×`}">${s===0?icon('pause','sm'):s+'×'}</button>`).join('')}</div><span class="clock-chip">${icon(state.speed?'play':'pause','sm')} ${state.speed?'Gra trwa':'Pauza'}</span></div>
  </header>`;
}

/* --- EKRAN GIEŁDY I DYNAMICZNE WYKRESY SVG --- */
function stockChart(stock,range) {
  const data=marketRangeData(stock,range);
  const points=data.length?data:[{day:state.day,cents:stock.cents}];
  const min=Math.min(...points.map(p=>p.cents));
  const max=Math.max(...points.map(p=>p.cents));
  const pad=Math.max(70,(max-min)*.18);
  const low=Math.max(100,min-pad), high=max+pad;
  const width=940, height=258;
  const x=i=>30+(points.length===1?width/2:i*width/(points.length-1));
  const y=c=>10+(high-c)/(high-low)*height;
  const coords=points.map((p,i)=>`${x(i).toFixed(1)},${y(p.cents).toFixed(1)}`);
  const baseline=268;
  const color=points[points.length-1].cents>=points[0].cents?'var(--green)':'var(--red)';
  const polyline=coords.join(' ');
  const fill=points.length>1?`M ${coords.join(' L ')} L ${x(points.length-1).toFixed(1)} ${baseline} L ${x(0).toFixed(1)} ${baseline} Z`:'';
  const grid=[0,.25,.5,.75,1].map(t=>`<line x1="30" y1="${10+t*height}" x2="970" y2="${10+t*height}" class="stock-gridline"/><text x="973" y="${14+t*height}" text-anchor="end" class="stock-axis-label">${number((high-(high-low)*t)/100)}</text>`).join('');
  const first=points[0],last=points[points.length-1];
  return `<div class="market-chart-container"><svg id="market-svg" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-label="Wykres notowań spółki ${esc(stock.name)}; od dnia ${first.day} do ${last.day}" role="img">
    <defs><linearGradient id="stock-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".30"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}${fill?`<path d="${fill}" fill="url(#stock-grad)"/>`:''}
    <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(points.length-1)}" cy="${y(last.cents)}" r="4" fill="${color}"/>
    <line id="market-crosshair" x1="0" x2="0" y1="10" y2="268" stroke="var(--muted)" stroke-dasharray="4 5" visibility="hidden"/>
    <circle id="market-crosshair-dot" cx="0" cy="0" r="6" stroke="var(--bg)" stroke-width="3" fill="${color}" visibility="hidden"/>
    <rect class="market-hover-area" x="30" y="10" width="940" height="258" fill="transparent"/>
    <text x="30" y="292" class="stock-axis-label">Dzień ${first.day}</text><text x="968" y="292" text-anchor="end" class="stock-axis-label">Dzień ${last.day}</text>
  </svg><div id="market-tooltip" class="market-tooltip" hidden></div></div>
  <div class="tiny muted">Najedź kursorem lub przesuń palec po wykresie, by odczytać kurs z danego dnia. Cena w zł za 1 akcję.</div>`;
}
function updateMarketHover(area,e) {
  const stock=marketSelected();
  const data=marketRangeData(stock,state.market.range);
  if(!data.length)return;
  const bounds=area.getBoundingClientRect();
  const ratio=clamp((e.clientX-bounds.left)/bounds.width,0,1);
  const idx=Math.round(ratio*(data.length-1));
  const point=data[idx];
  const x=30+(data.length===1?470:idx*940/(data.length-1));
  const min=Math.min(...data.map(p=>p.cents)), max=Math.max(...data.map(p=>p.cents));
  const pad=Math.max(70,(max-min)*.18);
  const lo=Math.max(100,min-pad), hi=max+pad;
  const y=10+(hi-point.cents)/(hi-lo)*258;
  const line=document.getElementById('market-crosshair'),dot=document.getElementById('market-crosshair-dot'),tip=document.getElementById('market-tooltip');
  if(!line||!dot||!tip)return;
  line.setAttribute('x1',x);line.setAttribute('x2',x);line.setAttribute('visibility','visible');
  dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('visibility','visible');
  tip.textContent=`Dzień ${point.day} · ${stockPrice(point.cents)}`;
  tip.style.left=`${clamp(x/1000*100,18,82)}%`;
  tip.hidden=false;
}
function updateMarketPreview() {
  const el=document.getElementById('market-order-summary');
  const submit=document.getElementById('market-order-submit');
  if(!el||!submit)return;
  const stock=marketSelected();
  const valid=Number.isSafeInteger(marketQuantity)&&marketQuantity>=1&&marketQuantity<=1000000;
  if(!valid){el.textContent='Podaj poprawną liczbę całych akcji.';submit.disabled=true;return;}
  const q=tradePreview(stock,marketQuantity,marketSide);
  const ok=marketSide==='buy'?q.total<=state.cash:marketQuantity<=marketHolding(stock.ticker).qty;
  el.textContent=`Wartość: ${money(q.gross)} · Prowizja: ${money(q.fee)} · ${marketSide==='buy'?'Do zapłaty':'Otrzymasz'}: ${money(q.total)}`;
  submit.disabled=!ok||state.gameOver;
}
function marketView() {
  const m=state.market, stock=marketSelected(), h=marketHolding(stock.ticker);
  const value=marketPortfolioValue(m), unrealized=marketUnrealized(m), total=marketAllPnL(m);
  const change=marketDayChange(stock), invested=Object.values(m.holdings).reduce((sum,h)=>sum+h.cost,0);
  const allStocks=[...m.stocks].sort((a,b)=>marketDayChange(b)-marketDayChange(a));
  const order=Number.isSafeInteger(marketQuantity)&&marketQuantity>0?tradePreview(stock,Math.min(marketQuantity,1000000),marketSide):null;
  const canTrade=order&&marketQuantity<=1000000&&(marketSide==='buy'?order.total<=state.cash:marketQuantity<=h.qty);
  return `${header('Giełda papierów wartościowych','Inwestuj kapitał firmy w 16 fikcyjnych spółek. Symulowane notowania zmieniają się każdego dnia gry.',button('nav','Przejdź do finansów','secondary','data-view="finance"','wallet'))}
  <div class="stock-banner"><span class="stock-market-live"><span class="pulse-dot"></span> RYNEK SYMULOWANY · ${esc(MARKET_REGIMES[m.regime].label.toUpperCase())}</span>
    <span class="muted tiny">Kursy generowane lokalnie — nie są to rzeczywiste notowania ani porada inwestycyjna.</span></div>
  <div class="stats-grid">
    ${metric('Gotówka na koncie',money(state.cash),'Dostępna na zakup akcji','wallet')}
    ${metric('Wartość portfela',money(value),`Koszt zakupu ${money(invested)}`,'stocks','cyan')}
    ${metric('Wynik niezrealizowany',`<span class="${balanceTone(unrealized)}">${profitMoney(unrealized)}</span>`,'Zmiana wartości posiadanych akcji','chart',unrealized>=0?'green':'amber')}
    ${metric('Wynik łączny',`<span class="${balanceTone(total)}">${profitMoney(total)}</span>`,'Sprzedaże, wycena i dywidendy','coins',total>=0?'green':'amber')}
  </div>
  <div class="market-layout">
    <div class="market-column">
      <section class="panel"><div class="panel-head"><div><h2>${esc(stock.name)} <span class="ticker">${stock.ticker}</span></h2><p>${esc(stock.sector)} · kapitalizacja ${new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(stock.cap*stock.cents/stock.initialCents)} mln zł</p></div><span class="pill ${change>=0?'green':'red'}">${pctChange(change)} / dzień</span></div>
        <div class="market-price-line"><strong>${stockPrice(stock.cents)}</strong><span class="muted">1 akcja · dzień ${state.day}</span></div>
        <div class="market-chart-tabs" role="group" aria-label="Zakres wykresu">${[7,30,90,'all'].map(r=>`<button class="market-range ${m.range===r?'selected':''}" data-action="market-range" data-range="${r}">${r==='all'?'Całość':r+' dni'}</button>`).join('')}</div>
        ${stockChart(stock,m.range)}
        <div class="market-stock-facts"><div><span>Kondycja spółki</span><strong>${Math.round(stock.health)}/100</strong></div><div><span>Potencjał wzrostu</span><strong>${stock.growth}/100</strong></div><div><span>Ryzyko</span><strong>${stock.volatility>=.045?'Wysokie':stock.volatility>=.03?'Średnie':'Niższe'}</strong></div><div><span>Dywidenda roczna (model)</span><strong>${stock.dividend?`${(stock.dividend*100).toFixed(1)}%`:'Brak'}</strong></div></div>
      </section>
      <section class="panel section-space"><div class="panel-head"><div><h2>Notowania spółek</h2><p>Wybierz ticker, aby wyświetlić wykres i złożyć zlecenie</p></div><span class="pill gray">${m.stocks.length} spółek</span></div>
        <div class="table-wrap"><table class="data-table market-quotes"><thead><tr><th>Spółka</th><th>Sektor</th><th>Kurs</th><th>Zmiana dzienna</th><th>Twoje akcje</th></tr></thead><tbody>${m.stocks.map(s=>{const c=marketDayChange(s),held=marketHolding(s.ticker).qty;return `<tr class="${stock.ticker===s.ticker?'stock-selected':''}"><td><button class="stock-select" data-action="market-select" data-ticker="${s.ticker}"><strong>${s.ticker}</strong><small>${esc(s.name)}</small></button></td><td>${esc(s.sector)}</td><td class="nowrap"><strong>${stockPrice(s.cents)}</strong></td><td><span class="${balanceTone(c)}">${pctChange(c)}</span></td><td>${number(held)}</td></tr>`;}).join('')}</tbody></table></div>
      </section>
      <section class="panel section-space"><div class="panel-head"><div><h2>Historia transakcji</h2><p>Zakupy i sprzedaże zlecone przez Twoją firmę</p></div><span class="pill gray">${m.trades.length} ostatnich operacji</span></div>
        ${m.trades.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Dzień</th><th>Operacja</th><th>Spółka</th><th>Liczba</th><th>Kurs</th><th>Kwota brutto</th><th>Prowizja</th></tr></thead><tbody>${m.trades.slice(0,35).map(t=>`<tr><td>${t.day}</td><td class="${t.side==='buy'?'negative':'positive'}">${t.side==='buy'?'Kupno':'Sprzedaż'}</td><td><strong>${t.ticker}</strong></td><td>${number(t.qty)}</td><td>${stockPrice(t.priceCents)}</td><td>${money(t.gross)}</td><td>${money(t.fee)}</td></tr>`).join('')}</tbody></table></div>`:empty('Brak transakcji','Kup pierwsze akcje, aby zobaczyć historię swoich inwestycji.','','stocks')}
      </section>
    </div>
    <div class="market-column">
      <section class="panel market-order-panel"><div class="panel-head"><div><h2>Złóż zlecenie</h2><p>${esc(stock.name)} · ${stock.ticker}</p></div><span class="pill gray">Prowizja 0,3%</span></div>
        <div class="market-side-tabs"><button class="${marketSide==='buy'?'buy-active':''}" data-action="market-mode" data-side="buy">Kup</button><button class="${marketSide==='sell'?'sell-active':''}" data-action="market-mode" data-side="sell">Sprzedaj</button></div>
        <label for="market-quantity" class="form-label">Liczba akcji (całkowita)</label><div class="stock-qty-row"><input type="number" id="market-quantity" class="form-input" min="1" step="1" max="1000000" inputmode="numeric" value="${marketQuantity}"/><button data-action="market-max" class="btn secondary" title="Maksymalna dostępna ilość">MAX</button></div>
        <div class="market-order-summary" id="market-order-summary">${order?`Wartość: ${money(order.gross)} · Prowizja: ${money(order.fee)} · ${marketSide==='buy'?'Do zapłaty':'Otrzymasz'}: ${money(order.total)}`:'Podaj poprawną liczbę akcji.'}</div>
        ${button('market-trade',marketSide==='buy'?'Kup akcje':'Sprzedaj akcje',marketSide==='buy'?'primary':'green',`id="market-order-submit" ${!canTrade||state.gameOver?'disabled':''}`,'stocks')}
        <div class="divider"></div><div class="line-row"><span>Posiadane akcje</span><strong>${number(h.qty)} szt.</strong></div><div class="line-row"><span>Wartość pozycji</span><strong>${money(cashPLN(h.qty*stock.cents))}</strong></div><div class="line-row"><span>Łączny koszt pozycji</span><strong>${money(h.cost)}</strong></div>
        <p class="tiny muted" style="margin:14px 0 0">Środki inwestowane na giełdzie pozostają aktywami firmy. Nie możesz zapłacić za pensje samymi akcjami — potrzebujesz gotówki.</p>
      </section>
      <section class="panel section-space"><div class="panel-head"><div><h2>Twój portfel</h2><p>Aktualne inwestycje i niezrealizowany wynik</p></div></div>
        ${Object.entries(m.holdings).length?`<div class="portfolio-list">${Object.entries(m.holdings).map(([ticker,h])=>{const s=marketStock(ticker);const v=cashPLN(h.qty*s.cents);const diff=v-h.cost;return `<button class="portfolio-position" data-action="market-select" data-ticker="${ticker}"><span><strong>${ticker}</strong><small>${h.qty} akcji · koszt ${money(h.cost)}</small></span><span class="portfolio-position-values"><strong>${money(v)}</strong><small class="${balanceTone(diff)}">${profitMoney(diff)}</small></span></button>`;}).join('')}</div>`:empty('Portfel jest pusty','Kup akcje wybranej spółki, aby zbudować swój portfel inwestycyjny.','','stocks')}
        <div class="divider"></div><div class="line-row"><span>Zrealizowany wynik</span><strong class="${balanceTone(m.realizedPnL)}">${profitMoney(m.realizedPnL)}</strong></div>
        <div class="line-row"><span>Otrzymane dywidendy</span><strong class="positive">${money(m.dividendsEarned)}</strong></div>
        <div class="line-row"><span>Zapłacone prowizje</span><strong class="negative">${money(m.feesPaid)}</strong></div>
      </section>
      <section class="panel section-space"><div class="panel-head"><div><h2>Nastroje rynku</h2><p>Symulacja cyklu i trendów sektorowych</p></div></div>
        <div class="stock-regime ${m.regime}"><strong>${esc(MARKET_REGIMES[m.regime].label)}</strong><span>Zmiana otoczenia nie wcześniej niż w dniu ${m.nextRegimeDay}</span></div>
        ${m.event?`<div class="stock-news"><strong>${esc(m.event.title)}</strong><p>Sektor: ${esc(m.event.sector)} · wpływ do dnia ${m.event.until}</p></div>`:'<p class="tiny muted">Obecnie brak dodatkowego wydarzenia sektorowego. Rynek może zmienić kierunek w kolejnych dniach.</p>'}
        <div class="divider"></div><h3>Liderzy wzrostów</h3>${allStocks.slice(0,3).map(s=>`<div class="line-row"><span>${s.ticker}</span><strong class="${balanceTone(marketDayChange(s))}">${pctChange(marketDayChange(s))}</strong></div>`).join('')}
        <h3 style="margin-top:15px">Największe spadki</h3>${allStocks.slice(-3).reverse().map(s=>`<div class="line-row"><span>${s.ticker}</span><strong class="${balanceTone(marketDayChange(s))}">${pctChange(marketDayChange(s))}</strong></div>`).join('')}
      </section>
    </div>
  </div>`;
}

function renderModal() {
  if(!modal)return '';
  if(modal.kind==='event') {
    const e=modal.event;
    return `<div class="modal-overlay" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-label="Wydarzenie losowe"><div class="eyebrow">WYDARZENIE LOSOWE · DZIEŃ ${state.day}</div><h2>${esc(e.title)}</h2><p style="margin:13px 0 0">${esc(e.desc)}</p><div class="modal-options">${e.options.map((o,i)=>button('event-choice',esc(o.label),i===0?'primary':'secondary',`data-id="${i}" ${o.cost&&state.cash<o.cost?'disabled':''}`)).join('')}</div><p class="tiny dim" style="margin-top:16px;margin-bottom:0">Czas został wstrzymany do podjęcia decyzji.</p></section></div>`;
  }
  if(modal.kind==='assign') {
    const p=state.projects.find(x=>x.id===modal.projectId);
    if(!p){modal=null;return '';}
    const team=[{id:'founder',name:'Ty (założyciel)',role:'Programista / CEO',skill:'Kod'},...state.employees];
    return `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="Przydział pracowników"><div class="modal-head"><div><div class="eyebrow">PRZYDZIAŁ ZESPOŁU</div><h2>${esc(p.name)}</h2><p style="margin:5px 0 0">Kompetencja kluczowa: ${esc(p.skill)}</p></div><button class="modal-x" data-action="close-modal" aria-label="Zamknij">${icon('x')}</button></div>
     <div class="notice" style="margin-top:13px">Każda osoba może pracować tylko nad jednym projektem. Zmiana przydziału przenosi ją z poprzedniego projektu.</div>
     ${team.map(e=>{const on=p.assigned.some(x=>String(x)===String(e.id));const other=state.projects.find(x=>x.id!==p.id && x.assigned.some(x=>String(x)===String(e.id)));return `<div class="assign-row ${on?'checked':''}"><div><strong>${esc(e.name)}</strong><p>${esc(e.role)} · ${esc(e.skill)} · ${workerPower(e.id,p).toFixed(1)} pkt/dzień</p>${other?`<p class="warning">Aktualnie: ${esc(other.name)}</p>`:''}</div>${button('toggle-assignment',on?'Usuń':'Przydziel',on?'secondary':'primary',`data-id="${esc(e.id)}" data-project="${p.id}"`)}</div>`;}).join('')}
     <div class="divider"></div><div class="flex-row"><span class="muted">Tempo projektu</span><strong class="positive">${dailyPower(p).toFixed(1)} pkt / dzień</strong></div><div style="margin-top:18px">${button('auto-assign','Auto-przydział dostępnych','secondary',`data-id="${p.id}"`,'users')}</div></section></div>`;
  }
  return '';
}
function render() {
  const app=document.getElementById('app');
  if(!state){app.innerHTML=startScreen();return;}
  // Symulacja odświeża ekran co dzień; nie wyrywaj fokusu z wpisywanego zlecenia.
  const restoreQuantityFocus=view==='market' && !modal && document.activeElement?.id==='market-quantity';
  const realFocusId=view==='realmarket' && ['real-search','real-qty'].includes(document.activeElement?.id)?document.activeElement.id:null;
  const realFocusValue=realFocusId?document.activeElement.value:null;
  const realCaret=realFocusId?document.activeElement.selectionStart:null;
  const officeScroll=view==='office2d'?document.getElementById('office-scroll'):null;
  const previousScroll=officeScroll?{x:officeScroll.scrollLeft,y:officeScroll.scrollTop}:null;
  const pages={dashboard,projects:projectsView,team:teamView,finance:financeView,office:officeView,office2d:officeView2d,
    upgrades:upgradesView,research:researchView,stats:statsView,settings:settingsView,market:marketView,realmarket:realView};
  app.innerHTML=`<div class="app-layout">${sidebar()}<div class="main-area">${topbar()}<main class="content">${(pages[view]||dashboard)()}<div class="footer-note">IT COMPANY TYCOON · tryb offline + opcjonalny Real Market · stan zapisuje się automatycznie ${icon('save','sm')}</div></main></div></div>${renderModal()}`;
  if(view==='office2d'){
    officeResizeCanvas();
    const el=document.getElementById('office-scroll');
    if(previousScroll&&el){el.scrollLeft=previousScroll.x;el.scrollTop=previousScroll.y;}
  }
  if(restoreQuantityFocus)document.getElementById('market-quantity')?.focus({preventScroll:true});
  if(realFocusId){const target=document.getElementById(realFocusId);if(target){target.value=realFocusValue;target.focus({preventScroll:true});try{target.setSelectionRange(realCaret,realCaret);}catch(e){}}}
}

/* Akcje gracza — jedno miejsce obsługi wszystkich interakcji. */
function markChanged(message='') {
  updateLevel();save();render();if(message)toast(message);
}
function hire(id) {
  const c=state.candidates.find(x=>x.id===id);
  if(!c)return;
  if(availableSlots()<1) {toast('Brak stanowisk. Ulepsz biuro.',true);return;}
  state.employees.push({...c});
  officeOnHire(c.id);
  state.candidates=state.candidates.filter(x=>x.id!==id);
  // Nowa osoba trafia automatycznie do pierwszego projektu z wolnymi zadaniami.
  if(state.projects.length) state.projects[0].assigned.push(c.id);
  state.records.peakStaff=Math.max(state.records.peakStaff,state.employees.length);
  log('Zatrudniono: '+c.name+' ('+c.role+').','good');
  markChanged('Nowy pracownik dołączył do firmy!');
}
function fire(id) {
  const emp=state.employees.find(e=>e.id===id);
  if(!emp)return;
  if(!confirm('Zwolnić '+emp.name+'? Nie będzie już pracować nad projektami.'))return;
  state.employees=state.employees.filter(x=>x.id!==id);
  officeOnFire(id);
  state.projects.forEach(p=>p.assigned=p.assigned.filter(x=>x!==id));
  state.reputation=Math.max(0,state.reputation-1);
  log('Zwolniono '+emp.name+'. Reputacja −1.','bad');
  markChanged('Pracownik został zwolniony.');
}
function train(id) {
  const e=state.employees.find(x=>x.id===id);if(!e)return;
  const cost=1000+e.training*800;
  if(!spend(cost,'Szkolenie: '+e.name))return;
  e.training++;e.happiness=clamp(e.happiness+7,25,100);
  log(e.name+' ukończył/a szkolenie. Wydajność wzrosła.','good');
  markChanged('Szkolenie zakończone.');
}
function giveBonus(id) {
  const e=state.employees.find(x=>x.id===id);if(!e)return;
  const cost=500+Math.round(e.wage*.4);
  if(!spend(cost,'Premia: '+e.name,'Premie'))return;
  e.happiness=clamp(e.happiness+20,25,100);
  log('Wypłacono premię dla '+e.name+'.','good');
  markChanged('Zadowolenie pracownika wzrosło.');
}
function toggleAssignment(pid,memberId) {
  const p=state.projects.find(x=>x.id===pid);if(!p)return;
  const id=memberId==='founder'?'founder':Number(memberId);
  if(id!=='founder'&&!state.employees.some(e=>e.id===id))return;
  const active=p.assigned.some(x=>x===id);
  state.projects.forEach(project=>project.assigned=project.assigned.filter(x=>x!==id));
  if(!active)p.assigned.push(id);
  save();render();
}
function autoAssign(pid) {
  const p=state.projects.find(x=>x.id===pid);if(!p)return;
  const occupied=new Set(state.projects.flatMap(x=>x.assigned));
  const idle=['founder',...state.employees.map(e=>e.id)].filter(id=>!occupied.has(id));
  idle.sort((a,b)=>workerPower(b,p)-workerPower(a,p));
  for(const id of idle)p.assigned.push(id);
  markChanged(idle.length?'Przydzielono wolnych pracowników.':'Wszyscy pracownicy mają już zadania.');
}
function upgradeOffice(idx) {
  if(idx!==state.office+1)return;
  const o=OFFICES[idx];if(!o||!spend(o.price,'Zakup biura: '+o.name,'Biuro'))return;
  state.office=idx;officeOnUpgrade();log('Nowa siedziba: '+o.name+'.','good');markChanged('Firma przeprowadziła się do nowego biura!');
}
function upgradeHardware() {
  const n=HARDWARE[state.hardware+1];if(!n||!spend(n.price,'Wyposażenie: '+n.name,'Sprzęt'))return;
  state.hardware++;log('Zmodernizowano sprzęt: '+n.name+'.','good');markChanged('Wydajność zespołu wzrosła.');
}
function buyTech(idx) {
  const t=TECHNOLOGIES[idx];if(!t||state.tech.includes(idx)||(idx>0&&!state.tech.includes(idx-1)))return;
  if(!spend(t.cost,'Technologia: '+t.name,'Technologie'))return;
  state.tech.push(idx);log('Wdrożono technologię: '+t.name+'.','good');markChanged('Nowa technologia działa!');
}
function researchTech(idx) {
  const r=RESEARCH[idx];
  if(!r||state.researched.includes(r.id)||levelIndex()<r.level||(idx>0&&!state.researched.includes(RESEARCH[idx-1].id)))return;
  if(state.researchPoints<r.rp){toast('Potrzebujesz więcej punktów B+R.',true);return;}
  if(!spend(r.cost,'Badania: '+r.name,'Badania'))return;
  state.researchPoints-=r.rp;state.researched.push(r.id);
  log('Zakończono badania: '+r.name+'.','good');markChanged('Odkryto nową technologię!');
}
function createSaas() {
  if(!state.researched.includes('saas')||state.saas>=5)return;
  if(!spend(28000,'Uruchomienie produktu SaaS','Produkt'))return;
  state.saas++;log('Uruchomiono produkt SaaS. +1 850 zł przychodu / tydzień.','good');markChanged('Produkt abonamentowy uruchomiony!');
}
function takeLoan() {
  if(state.loan)return;
  state.cash+=15000;state.loan={balance:18000,payment:1500,remaining:12};
  state.ledger.unshift({day:state.day,amount:15000,title:'Wpływ kredytu',category:'Finansowanie'});
  log('Pozyskano 15 000 zł kredytu. Do spłaty 18 000 zł.','good');
  markChanged('Kredyt wpłynął na konto.');
}
function repayLoan() {
  if(!state.loan)return;
  const bal=state.loan.balance;
  if(!spend(bal,'Wcześniejsza spłata kredytu','Kredyt'))return;
  state.loan=null;log('Spłacono cały kredyt przed terminem.','good');markChanged('Kredyt zamknięty.');
}
function exportSave() {
  save();
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='it-company-tycoon-save.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  toast('Plik zapisu został przygotowany.');
}
function importSave(file) {
  if(!file)return;
  if(!confirm('Import nadpisze obecny zapis. Kontynuować?'))return;
  const reader=new FileReader();
  reader.onload=()=>{
    try {
      const obj=JSON.parse(reader.result);
      const backup=localStorage.getItem(SAVE_KEY);
      localStorage.setItem(SAVE_KEY,JSON.stringify(obj));
      if(!restore()) {
        if(backup!==null)localStorage.setItem(SAVE_KEY,backup);else localStorage.removeItem(SAVE_KEY);
        throw Error('Nieprawidłowa struktura zapisu.');
      }
      view='dashboard';modal=null;elapsedDays=0;render();toast('Zapis zaimportowano pomyślnie.');
    } catch(e){toast('Nie można wczytać pliku zapisu.',true);}
  };
  reader.onerror=()=>toast('Nie udało się odczytać pliku.',true);
  reader.readAsText(file);
}
function resetGame() {
  if(!confirm('Usunąć aktualny zapis i rozpocząć od nowa? Tej operacji nie można cofnąć.'))return;
  localStorage.removeItem(SAVE_KEY);state=null;view='dashboard';modal=null;elapsedDays=0;
  render();toast('Rozpocznij nową karierę!');
}

// Event delegation: przyciski są dynamiczne, więc nie gubią zdarzeń przy zmianie widoku.
document.getElementById('app').addEventListener('click',e=>{
  const btn=e.target.closest('[data-action]');
  if(!btn||btn.disabled)return;
  const action=btn.dataset.action;
  const id=Number(btn.dataset.id);
  if(!state)return;
  if(action==='reset-game'){resetGame();return;}
  if(action==='nav'){view=btn.dataset.view||'dashboard';modal=null;render();window.scrollTo(0,0);if(view==='realmarket')realOnOpen();return;}
  if(action==='close-modal'){if(modal?.kind!=='event'){modal=null;render();}return;}
  if(action==='event-choice'){resolveEvent(id);return;}
  if(state.gameOver){toast('Rozgrywka zakończona. Możesz rozpocząć nową grę.',true);return;}
  if(modal?.kind==='event')return;
  if(action.startsWith('real-')&&realAction(btn))return;
  switch(action){
    case 'speed':state.speed=Number(btn.dataset.speed);elapsedDays=0;save();render();break;
    case 'accept':acceptOffer(id);break;
    case 'market-select':if(marketStock(btn.dataset.ticker)){state.market.selectedTicker=btn.dataset.ticker;save();render();}break;
    case 'market-range':{const range=btn.dataset.range==='all'?'all':Number(btn.dataset.range);if([7,30,90,'all'].includes(range)){state.market.range=range;save();render();}break;}
    case 'market-mode':marketSide=btn.dataset.side==='sell'?'sell':'buy';render();break;
    case 'market-max':{const s=marketSelected();marketQuantity=marketSide==='sell'?marketHolding(s.ticker).qty:Math.min(1000000,Math.max(0,Math.floor(state.cash/(s.cents/100*(1+BROKER_FEE)+.6))));render();break;}
    case 'market-trade':marketTrade(state.market.selectedTicker,marketQuantity,marketSide);break;
    case 'refresh-offers':
      if(spend(300,'Odświeżenie ofert','Marketing')){state.offers=[];refillMarket();markChanged('Nowe kontrakty na giełdzie!');}break;
    case 'hire':hire(id);break;
    case 'fire':fire(id);break;
    case 'train':train(id);break;
    case 'bonus':giveBonus(id);break;
    case 'refresh-candidates':
      if(spend(350,'Rekrutacja','HR')){refreshCandidates();markChanged('Nowi kandydaci dostępni.');}break;
    case 'assign':modal={kind:'assign',projectId:id};render();break;
    case 'toggle-assignment':toggleAssignment(Number(btn.dataset.project),btn.dataset.id);break;
    case 'auto-assign':autoAssign(id);break;
    case 'office-mode':officeSetMode(btn.dataset.mode);break;
    case 'office-item':officeSetMode('build',btn.dataset.type);break;
    case 'office-member':officeSetWorker(btn.dataset.member);break;
    case 'office-zoom':officeZoom(btn.dataset.zoom);break;
    case 'office-zone':officeSetZone(btn.dataset.zone);break;
    case 'office-renovate':officeRenovate();break;
    case 'office-auto':officeAutoAssign(true);break;
    case 'upgrade-office':upgradeOffice(id);break;
    case 'upgrade-hardware':upgradeHardware();break;
    case 'buy-tech':buyTech(id);break;
    case 'research':researchTech(id);break;
    case 'create-saas':createSaas();break;
    case 'take-loan':takeLoan();break;
    case 'repay-loan':repayLoan();break;
    case 'manual-save':save();toast('Rozgrywka zapisana.');break;
    case 'export-save':exportSave();break;
  }
});

document.getElementById('app').addEventListener('click',officeCanvasClick);

document.getElementById('app').addEventListener('submit',e=>{
  if(e.target.id!=='new-game-form')return;
  e.preventDefault();
  const name=e.target.querySelector('[name="company"]').value;
  newGame(name);
});
document.getElementById('app').addEventListener('input',e=>{
  if(e.target.id==='market-quantity'){marketQuantity=Number(e.target.value);updateMarketPreview();}
  if(e.target.id==='real-search'||e.target.id==='real-qty')realInput(e);
});
document.getElementById('app').addEventListener('pointermove',e=>{
  const area=e.target.closest('.market-hover-area');if(area)updateMarketHover(area,e);
});
document.getElementById('app').addEventListener('pointerleave',e=>{
  if(e.target.classList?.contains('market-hover-area')){const tooltip=document.getElementById('market-tooltip');if(tooltip)tooltip.hidden=true;}
},true);
document.getElementById('app').addEventListener('change',e=>{
  if(e.target.id==='import-save'&&e.target.files?.[0])importSave(e.target.files[0]);
});

// Monotoniczny, stały krok: postęp nie zależy od klatek renderowania ani odświeżania monitora.
setInterval(()=>{
  const now=performance.now();
  const delta=Math.min(1000,Math.max(0,now-currentTime));
  currentTime=now;
  if(!state||state.gameOver||state.speed===0||modal?.kind==='event')return;
  elapsedDays+=(delta*state.speed)/DAY_MS;
  // Limit 10 kroków w iteracji chroni przed lawinowym odtwarzaniem czasu po powrocie do karty.
  let steps=0;
  while(elapsedDays>=1&&steps<10&&state&&!state.gameOver&&state.speed>0){
    elapsedDays--;steps++;dayStep();
    if(modal?.kind==='event')break;
  }
},200);

if(restore())render();else render();
