function upsertSalesDriveOrders_(orders){
  if(!orders||!orders.length) return {inserted:0,updated:0};
  const sh=ensureDatabase_();
  const current=readReturnRows_();
  const shipmentKey=r=>String(r.salesDriveId||'')+'|'+String(r.ttn||'');
  const byShipment=new Map(current.filter(r=>r.salesDriveId&&r.ttn).map(r=>[shipmentKey(r),r]));
  const byOrder=new Map();
  current.forEach(r=>{ if(r.salesDriveId&&!byOrder.has(r.salesDriveId)) byOrder.set(r.salesDriveId,r); });
  let inserted=0,updated=0;

  orders.forEach(order=>{
    const salesDriveId=String(order.salesDriveId||'');
    const ttn=String(order.ttn||'');
    if(!salesDriveId||!ttn) return;
    const old=byShipment.get(salesDriveId+'|'+ttn);
    const previous=old||byOrder.get(salesDriveId)||{};
    const oldWasReturn=Boolean(old&&isReturnRecord_(old));
    const detectedReturn=oldWasReturn||Boolean(order.isReturn)||looksLikeReturn_(order.deliveryStatus);
    const arrivedAt=detectedReturn?((old&&old.arrivedAt)||order.arrivedAt||''):'';
    const base={
      id:old&&old.id?old.id:('sd_'+salesDriveId+'_'+ttn),
      returnNumber:old&&old.returnNumber?old.returnNumber:'',
      supplierId:previous.supplierId||'',
      supplierName:previous.supplierName||'',
      supplierOrderNumber:previous.supplierOrderNumber||'',
      supplierOrderUrl:previous.supplierOrderUrl||'',
      productName:(old&&old.productName)||String(order.product||''),
      productImage:(old&&old.productImage)||'',
      returnReason:(old&&old.returnReason)||'',
      returnReasonComment:(old&&old.returnReasonComment)||'',
      amount:Number(order.amount||((old&&old.amount)||0)),
      returnStatus:(old&&old.returnStatus)||'',
      supplierPickupStatus:(old&&old.supplierPickupStatus)||'not_handed_over',
      supplierPickedUp:Boolean(old&&old.supplierPickedUp),
      supplierPickedUpAt:(old&&old.supplierPickedUpAt)||'',
      returnDate:detectedReturn?((old&&old.returnDate)||arrivedAt||order.returnStartedAt||''):((old&&old.returnDate)||''),
      source:'salesdrive',
      createdAt:(old&&old.createdAt)||order.orderDate||new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      salesDriveId:salesDriveId,
      orderNumber:String(order.orderNumber||''),
      orderDate:order.orderDate||'',
      shop:String(order.shop||''),
      carrier:String(order.carrier||''),
      ttn:ttn,
      deliveryStatus:String(order.deliveryStatus||''),
      deliveryCode:String(order.deliveryCode||''),
      returnStartedAt:(old&&old.returnStartedAt)||order.returnStartedAt||'',
      arrivedAt:arrivedAt,
      statusSource:String(order.statusSource||'SalesDrive'),
      promId:String(order.promId||''),
      note:String(order.note||((old&&old.note)||'')),
      originalTtn:(old&&old.originalTtn)||String(order.originalTtn||ttn),
      returnTtn:(old&&old.returnTtn)||String(order.returnTtn||''),
      supplierNotified:Boolean(old&&old.supplierNotified),
      supplierNotifiedAt:(old&&old.supplierNotifiedAt)||''
    };

    if(detectedReturn&&!base.returnNumber) base.returnNumber=generateReturnNumber_();
    if(detectedReturn&&!base.returnTtn) base.returnTtn=ttn;
    if(base.supplierPickedUp){
      base.supplierPickupStatus='picked_up';
    }else if(arrivedAt){
      base.returnStatus='arrived';
      base.supplierPickupStatus='waiting_pickup';
    }else if(detectedReturn){
      base.returnStatus=base.returnStatus==='arrived'?'in_transit':(base.returnStatus||'in_transit');
      if(base.supplierPickupStatus==='waiting_pickup') base.supplierPickupStatus='not_handed_over';
    }

    const normalized=normalizeReturnState_(base,false);
    if(old){
      sh.getRange(old.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalized)]);
      updated++;
    }else{
      sh.appendRow(objectToRow_(normalized));
      const newRow=rowToObject_(objectToRow_(normalized),sh.getLastRow());
      byShipment.set(salesDriveId+'|'+ttn,newRow);
      if(!byOrder.has(salesDriveId)) byOrder.set(salesDriveId,newRow);
      inserted++;
    }
  });
  return {inserted:inserted,updated:updated};
}

function updateTrackingRow_(row,tracking){
  const sh=returnSheetFast_();
  const raw=sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).getValues()[0];
  const current=rowToObject_(raw,row.rowNumber);
  const isReturn=Boolean(tracking.isReturn)||looksLikeReturn_(tracking.statusText);
  const arrivedAt=tracking.arrivedAt||'';
  const merged=Object.assign({},current,{
    deliveryStatus:tracking.statusText||current.deliveryStatus,
    deliveryCode:tracking.statusCode||current.deliveryCode,
    statusSource:tracking.source||current.statusSource,
    returnStartedAt:current.returnStartedAt||tracking.returnStartedAt||'',
    arrivedAt:arrivedAt,
    originalTtn:current.originalTtn||tracking.originalTtn||current.ttn||'',
    returnTtn:current.returnTtn||tracking.returnTtn||(isReturn?(tracking.ttn||current.ttn||''):''),
    updatedAt:new Date().toISOString()
  });
  if(isReturn&&!merged.returnNumber) merged.returnNumber=generateReturnNumber_();
  if(arrivedAt&&!merged.supplierPickedUp){
    merged.returnStatus='arrived';
    merged.supplierPickupStatus='waiting_pickup';
    merged.returnDate=merged.returnDate||arrivedAt;
  }else if(isReturn&&!merged.supplierPickedUp){
    merged.returnStatus='in_transit';
    if(merged.supplierPickupStatus==='waiting_pickup') merged.supplierPickupStatus='not_handed_over';
  }
  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalizeReturnState_(merged,false))]);
}

function saveReturn_(payload,isCreate){
  payload=payload||{};
  const createLock=isCreate?LockService.getUserLock():null;
  if(createLock) createLock.waitLock(15000);
  try{
    const sh=ensureDatabase_();
    const supplier=supplierById_(payload.supplierId);
    if(!supplier) throw new Error('Оберіть постачальника зі списку.');

    const reason=String(payload.returnReason||'').trim();
    if(reason&&reason!=='other'&&!returnReasonById_(reason)) throw new Error('Невідома причина повернення.');
    const status=String(payload.returnStatus||'expected').trim();
    if(!RETURN_STATUS_CONFIG[status]) throw new Error('Невідомий статус повернення.');

    let current={};
    let rowNumber=0;
    if(!isCreate){
      current=findReturnById_(payload.id);
      if(!current) throw new Error('Повернення не знайдено.');
      rowNumber=current.rowNumber;
    }

    const now=new Date();
    const cleanUrl=safeHttpUrl_(payload.supplierOrderUrl);
    const cleanAmount=payload.amount===''||payload.amount===null||payload.amount===undefined?0:Number(payload.amount);
    if(!Number.isFinite(cleanAmount)||cleanAmount<0) throw new Error('Сума повернення має бути числом 0 або більше.');

    const originalTtn=String(payload.originalTtn||current.originalTtn||current.ttn||'').trim();
    const returnTtn=String(payload.returnTtn||current.returnTtn||'').trim();
    const duplicateKey=isCreate?manualDuplicateKey_({supplierId:supplier.id,supplierOrderNumber:payload.supplierOrderNumber,productName:payload.productName,amount:cleanAmount,originalTtn:originalTtn,returnTtn:returnTtn}):'';
    if(isCreate&&duplicateKey){
      const cached=CacheService.getUserCache().get(duplicateKey);
      if(cached) return cached;
    }

    const next=Object.assign({},current,{
      id:isCreate?Utilities.getUuid():current.id,
      returnNumber:isCreate?generateReturnNumber_():(current.returnNumber||generateReturnNumber_()),
      supplierId:supplier.id,
      supplierName:supplier.name,
      supplierOrderNumber:String(payload.supplierOrderNumber||'').trim(),
      supplierOrderUrl:cleanUrl,
      productName:String(payload.productName||'').trim(),
      productImage:String(payload.productImage||current.productImage||'').trim(),
      returnReason:reason,
      returnReasonComment:reason==='other'?String(payload.returnReasonComment||'').trim():'',
      amount:cleanAmount,
      returnStatus:status,
      returnDate:dateIso_(payload.returnDate)||current.returnDate||'',
      source:isCreate?'manual':(current.source||'manual'),
      createdAt:isCreate?now.toISOString():(current.createdAt||now.toISOString()),
      updatedAt:now.toISOString(),
      note:String(payload.note||'').trim(),
      originalTtn:originalTtn,
      returnTtn:returnTtn,
      supplierNotified:Boolean(current.supplierNotified),
      supplierNotifiedAt:current.supplierNotifiedAt||''
    });

    if(payload.productImageData) next.productImage=saveReturnImage_(payload.productImageData,next.id);
    if(!next.supplierPickedUp) next.supplierPickupStatus=status==='arrived'?'waiting_pickup':'not_handed_over';
    const normalized=normalizeReturnState_(next,true);
    if(isCreate){
      sh.appendRow(objectToRow_(normalized));
      if(duplicateKey) CacheService.getUserCache().put(duplicateKey,normalized.id,120);
    }else{
      sh.getRange(rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalized)]);
    }
    return normalized.id;
  }finally{
    if(createLock) createLock.releaseLock();
  }
}

function markSupplierPickedUp_(id,taken){
  const row=findReturnByIdFast_(id);
  if(!row) throw new Error('Повернення не знайдено.');
  const now=new Date();
  row.supplierPickedUp=Boolean(taken);
  row.supplierPickedUpAt=taken?now.toISOString():'';
  row.supplierPickupStatus=taken?'picked_up':(row.returnStatus==='arrived'?'waiting_pickup':'not_handed_over');
  row.updatedAt=now.toISOString();
  return writeReturnFast_(row);
}

function markSupplierNotified_(id,notified){
  const row=findReturnByIdFast_(id);
  if(!row) throw new Error('Повернення не знайдено.');
  const now=new Date();
  row.supplierNotified=Boolean(notified);
  row.supplierNotifiedAt=notified?now.toISOString():'';
  row.updatedAt=now.toISOString();
  return writeReturnFast_(row);
}

function returnSheetFast_(){
  const sh=db_().getSheetByName(RETURN_MONITOR.returnsSheet);
  if(!sh) throw new Error('Аркуш повернень не знайдено.');
  return sh;
}

function findReturnByIdFast_(id){
  const target=String(id||'').trim();
  if(!target) return null;
  const sh=returnSheetFast_();
  const last=sh.getLastRow();
  if(last<2) return null;
  const finder=sh.getRange(2,1,last-1,1).createTextFinder(target).matchEntireCell(true).findNext();
  if(!finder) return null;
  const rowNumber=finder.getRow();
  return rowToObject_(sh.getRange(rowNumber,1,1,RETURN_HEADERS.length).getValues()[0],rowNumber);
}

function writeReturnFast_(row){
  const sh=returnSheetFast_();
  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(row)]);
  return rowToObject_(objectToRow_(row),row.rowNumber);
}

function manualDuplicateKey_(data){
  const raw=['RETURN_CREATE',data.supplierId||'',data.supplierOrderNumber||'',data.productName||'',Number(data.amount||0),data.originalTtn||'',data.returnTtn||'']
    .map(value=>String(value).trim().toLowerCase()).join('|');
  if(!raw.replace(/\|/g,'')) return '';
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8);
  return 'RM_DUP_'+Utilities.base64EncodeWebSafe(digest).replace(/=+$/,'').slice(0,40);
}

function generateReturnNumber_(){
  const lock=LockService.getScriptLock();
  lock.waitLock(10000);
  try{
    const sh=ensureDatabase_();
    const year=new Date().getFullYear();
    const col=RETURN_KEYS.indexOf('returnNumber')+1;
    const last=sh.getLastRow();
    const values=last>1?sh.getRange(2,col,last-1,1).getDisplayValues().flat():[];
    let max=0;
    const re=new RegExp('^RTN-'+year+'-(\\d+)$');
    values.forEach(value=>{
      const m=String(value||'').match(re);
      if(m) max=Math.max(max,Number(m[1]||0));
    });
    return 'RTN-'+year+'-'+String(max+1).padStart(4,'0');
  }finally{
    lock.releaseLock();
  }
}

function safeHttpUrl_(value){
  const url=String(value||'').trim();
  if(!url) return '';
  if(!/^https?:\/\//i.test(url)) throw new Error('Посилання на замовлення має починатися з http:// або https://');
  return url;
}

function saveReturnImage_(dataUrl,returnId){
  const value=String(dataUrl||'');
  const match=value.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match) throw new Error('Підтримуються фото PNG, JPG або WEBP.');
  const bytes=Utilities.base64Decode(match[2]);
  if(bytes.length>3*1024*1024) throw new Error('Фото має бути не більше 3 МБ.');
  const ext=match[1]==='image/png'?'png':(match[1]==='image/webp'?'webp':'jpg');
  const folder=getReturnImagesFolder_();
  const file=folder.createFile(Utilities.newBlob(bytes,match[1],'return-'+String(returnId||Utilities.getUuid())+'.'+ext));
  try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW); }catch(_){ }
  return 'https://drive.google.com/uc?export=view&id='+file.getId();
}

function getReturnImagesFolder_(){
  const p=PropertiesService.getScriptProperties();
  const key='RETURN_MONITOR_IMAGE_FOLDER_ID';
  const stored=p.getProperty(key);
  if(stored){
    try{return DriveApp.getFolderById(stored);}catch(_){ }
  }
  const folder=DriveApp.createFolder('Return Monitor Images');
  p.setProperty(key,folder.getId());
  return folder;
}


// PRODUCT_IMAGE_FALLBACK_V1
function apiGetProductImageData(imageUrl){
  const raw=String(imageUrl||'').trim();
  if(!raw) return '';
  let m=raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/i);
  if(!m) m=raw.match(/\/d\/([A-Za-z0-9_-]{10,})/i);
  if(!m) return '';
  try{
    const file=DriveApp.getFileById(m[1]);
    let blob=null;
    try{ blob=file.getThumbnail(); }catch(_){ }
    if(!blob) blob=file.getBlob();
    const bytes=blob.getBytes();
    if(bytes.length>4*1024*1024) return '';
    return 'data:'+String(blob.getContentType()||'image/jpeg')+';base64,'+Utilities.base64Encode(bytes);
  }catch(_){
    return '';
  }
}
