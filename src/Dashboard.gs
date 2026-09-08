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
    row.daysWaiting=row.arrivedAt&&!picked?daysBetween_(row.arrivedAt,new Date()):0;
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

function looksLikeReturn_(status){
  return /повер|відмов|не забра|відправник|переадрес/i.test(String(status||''));
}

function looksLikeReturnArrived_(status){
  const text=String(status||'').toLowerCase();
  if(!text) return false;
  return /повернен.{0,45}(отрим|видан)|отриман.{0,45}(відправник|повернен)|видан.{0,45}(відправник|повернен)|повернул.{0,45}(відправник|одержувач)|отримано відправником|вручено відправнику/.test(text);
}
