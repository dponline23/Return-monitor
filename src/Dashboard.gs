function buildDashboard_(){
  const rows=readReturnRows_().filter(isReturnRecord_);
  const counts={all:rows.length,waiting:0,arrived:0,pickup:0,picked:0};
  let amount=0;

  rows.forEach(row=>{
    const picked=Boolean(row.supplierPickedUp);
    if(!picked&&row.returnStatus!=='completed'&&row.returnStatus!=='cancelled') counts.waiting++;
    if(!picked&&row.returnStatus==='arrived') counts.arrived++;
    if(!picked&&row.supplierPickupStatus==='waiting_pickup') counts.pickup++;
    if(picked) counts.picked++;
    amount+=Number(row.amount||0);

    // Лічильник показує, скільки календарних днів повернення вже лежить
    // у точці видачі та очікує, поки постачальник його забере.
    // Єдине джерело для відліку — arrivedAt.
    row.daysWaiting=supplierWaitingCalendarDays_(row);
  });

  rows.sort((a,b)=>{
    const ad=new Date(a.returnDate||a.updatedAt||a.createdAt||0).getTime()||0;
    const bd=new Date(b.returnDate||b.updatedAt||b.createdAt||0).getTime()||0;
    return bd-ad;
  });

  return {
    rows:rows,
    counts:counts,
    stats:{total:rows.length,waiting:counts.waiting,picked:counts.picked,amount:amount},
    suppliers:getSuppliers_(),
    reasons:getReturnReasons_(),
    config:publicReturnConfig_(),
    setup:getSetupStatus_(),
    generatedAt:new Date().toISOString()
  };
}

function supplierWaitingCalendarDays_(row){
  if(!row||row.supplierPickedUp||row.supplierPickupStatus!=='waiting_pickup') return 0;
  const arrived=parseDate_(row.arrivedAt);
  if(!arrived) return 0;

  const now=new Date();
  if(arrived.getTime()>now.getTime()) return 0;

  // Рахуємо календарні дні у часовому поясі України, а не повні 24 години.
  // Напр., прибуло вчора ввечері -> сьогодні вже "1 дн. очікування".
  const tz='Europe/Kyiv';
  const a=Utilities.formatDate(arrived,tz,'yyyy-MM-dd').split('-').map(Number);
  const b=Utilities.formatDate(now,tz,'yyyy-MM-dd').split('-').map(Number);
  const aUtc=Date.UTC(a[0],a[1]-1,a[2]);
  const bUtc=Date.UTC(b[0],b[1]-1,b[2]);
  return Math.max(0,Math.floor((bUtc-aUtc)/86400000));
}

function looksLikeReturn_(status){
  const text=String(status||'').toLowerCase();
  if(!text) return false;

  // Customer-initiated redirection / address change is a normal delivery flow,
  // not a refusal and not a parcel returning to the sender.
  const redirectionOnly=/переадрес|змінен[оа]\s+адрес|змін[а-яіїєґ]*\s+адрес|redirect|address\s+chang/i.test(text);
  const explicitReturn=/повер|відмов|не\s*забра|не\s*отрим|вручено\s+відправнику|отримано\s+відправником|повернуто\s+відправнику|return\s+to\s+sender/i.test(text);
  if(redirectionOnly&&!explicitReturn) return false;
  return explicitReturn;
}

function looksLikeReturnArrived_(status){
  const text=String(status||'').toLowerCase();
  if(!text) return false;

  // Ukrposhta final return status is 41010. SalesDrive can expose the raw
  // event/reason pair 41000 + 10 as the combined code 4100010.
  if(/(^|\D)(41010|4100010|35500)(\D|$)/.test(text)) return true;

  return /повернен.{0,45}(отрим|видан)|отриман.{0,45}(відправник|повернен)|видан.{0,45}(відправник|повернен)|повернул.{0,45}(відправник|одержувач)|отримано відправником|вручено відправнику/.test(text);
}
