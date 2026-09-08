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
  if(o.supplierPickedUp){
    o.supplierPickupStatus='picked_up';
  }else if(o.returnStatus==='arrived'){
    o.supplierPickupStatus='waiting_pickup';
  }else if(o.supplierPickupStatus==='picked_up'||!o.supplierPickupStatus){
    o.supplierPickupStatus='not_handed_over';
  }
  return o;
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
