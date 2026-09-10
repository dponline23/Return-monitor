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

  // Carrier status has priority over a stale internal status. Ukrposhta exposes
  // returned-to-sender as event 41000 + eventReason_id 10 (= 41010). SalesDrive
  // can store that pair as 4100010, so recognize both forms.
  if(!o.supplierPickedUp&&isCarrierReturnedToSender_(o)){
    o.returnStatus='arrived';
    o.supplierPickupStatus='waiting_pickup';
    if(!o.returnNumber&&o.source!=='manual') o.returnNumber='';
  }

  if(o.supplierPickedUp){
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
  if(row.source==='manual') return true;
  if(row.returnNumber||row.returnStartedAt||row.returnStatus) return true;
  return looksLikeReturn_(row.deliveryStatus);
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
