function readReturnRows_(){
  const sh=ensureDatabase_();
  const last=sh.getLastRow();
  if(last<2) return [];
  return sh.getRange(2,1,last-1,RETURN_HEADERS.length).getValues().map((r,i)=>rowToObject_(r,i+2));
}

function rowToObject_(row,rowNumber){
  const result={rowNumber:rowNumber};
  RETURN_FIELDS.forEach((field,index)=>{ result[field.key]=row[index]; });
  ['amount'].forEach(key=>result[key]=Number(result[key]||0));
  ['supplierPickedUp','supplierNotified'].forEach(key=>result[key]=toBool_(result[key]));
  ['supplierPickedUpAt','supplierNotifiedAt','returnDate','createdAt','updatedAt','orderDate','returnStartedAt','arrivedAt'].forEach(key=>result[key]=dateIso_(result[key]));
  RETURN_KEYS.filter(key=>!['amount','supplierPickedUp','supplierNotified','supplierPickedUpAt','supplierNotifiedAt','returnDate','createdAt','updatedAt','orderDate','returnStartedAt','arrivedAt'].includes(key))
    .forEach(key=>result[key]=String(result[key]||''));
  return normalizeReturnState_(result,false);
}

function objectToRow_(input){
  const o=Object.assign({},input||{});
  return RETURN_FIELDS.map(field=>{
    const key=field.key;
    if(key==='amount') return Number(o[key]||0);
    if(key==='supplierPickedUp'||key==='supplierNotified') return Boolean(o[key]);
    if(['supplierPickedUpAt','supplierNotifiedAt','returnDate','createdAt','updatedAt','orderDate','returnStartedAt','arrivedAt'].includes(key)) return parseDate_(o[key]);
    return o[key]===undefined||o[key]===null?'':o[key];
  });
}

function normalizeReturnState_(input,applyDefaults){
  const o=Object.assign({},input||{});
  if(applyDefaults){
    if(!o.returnStatus) o.returnStatus='expected';
    if(!o.supplierPickupStatus) o.supplierPickupStatus='not_handed_over';
    if(!o.source) o.source='manual';
  }

  // ВАЖЛИВО: статус перевізника ніколи сам не означає, що постачальник
  // фактично забрав товар. "Забрано" ставиться лише окремою дією користувача.
  if(o.supplierPickedUp){
    o.returnStatus=o.returnStatus==='cancelled'?'cancelled':'completed';
    o.supplierPickupStatus='picked_up';
  }else if(o.returnStatus==='arrived'){
    o.supplierPickupStatus='waiting_pickup';
  }else if(o.supplierPickupStatus==='picked_up'||!o.supplierPickupStatus){
    o.supplierPickupStatus='not_handed_over';
  }
  return o;
}

function isCarrierReturnedToSender_(row){
  row=row||{};
  const carrier=String(row.carrier||'').toLowerCase();
  const code=String(row.deliveryCode||'').replace(/\s+/g,'');
  const text=String(row.deliveryStatus||'').toLowerCase();

  if(/укр|ukrposhta/.test(carrier)){
    if(code==='41010'||code==='4100010'||code==='35500') return true;
    if(/^41000(?:10)$/.test(code)) return true;
  }

  return /вручено\s+відправнику|вручено:\s*відправнику|повернен.{0,40}вручено.{0,30}відправник|повернут.{0,40}відправник|отримано\s+відправником/i.test(text);
}

function isReturnRecord_(row){
  if(!row) return false;
  if(String(row.source||'').toLowerCase()==='manual') return true;

  // A generated RTN number / generic in_transit status is not proof of a return.
  // For synced SalesDrive rows require a real return signal from logistics/status,
  // a separate return TTN, or an already confirmed user action.
  if(row.supplierPickedUp||row.supplierNotified||row.arrivedAt) return true;
  if(looksLikeReturn_(row.deliveryStatus)) return true;

  const original=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
  const returned=normalizeTrackingNumber_(row.returnTtn||'');
  if(returned&&original&&returned!==original) return true;

  return false;
}

function findReturnById_(id){
  const target=String(id||'').trim();
  if(!target) return null;
  return readReturnRows_().find(row=>row.id===target)||null;
}

function supplierById_(id){
  const target=String(id||'').trim();
  return getSuppliers_().find(item=>item.id===target)||null;
}

function returnReasonById_(id){
  const target=String(id||'').trim();
  return getReturnReasons_().find(item=>item.id===target)||null;
}
