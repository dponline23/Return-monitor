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

    // "Днів очікування" рахуємо ТІЛЬКИ від фактичного прибуття
    // повернення у точку видачі постачальнику. Дата замовлення, створення
    // заявки або початку повернення тут не використовуються.
    row.daysWaiting=validSupplierWaitingDays_(row);
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

function validSupplierWaitingDays_(row){
  if(!row||row.supplierPickedUp||row.supplierPickupStatus!=='waiting_pickup') return 0;
  const arrived=parseDate_(row.arrivedAt);
  if(!arrived) return 0;

  const now=new Date();
  if(arrived.getTime()>now.getTime()) return 0;

  // Захист від старих помилкових даних: якщо "дата прибуття" раніша
  // за початок повернення, її не можна використовувати для лічильника.
  const started=parseDate_(row.returnStartedAt);
  if(started&&arrived.getTime()<started.getTime()) return 0;

  // Ще один захист для старих SalesDrive-записів, де дата замовлення
  // колись помилково могла потрапити в arrivedAt.
  const orderDate=parseDate_(row.orderDate);
  if(!started&&String(row.source||'').toLowerCase()==='salesdrive'&&orderDate){
    const delta=Math.abs(arrived.getTime()-orderDate.getTime());
    if(delta<36*60*60*1000) return 0;
  }

  return daysBetween_(arrived,now);
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
