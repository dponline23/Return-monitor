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
      note:String(order.note||((old&&old.note)||''))
    };

    if(detectedReturn&&!base.returnNumber) base.returnNumber=generateReturnNumber_();
    if(base.supplierPickedUp){
      base.supplierPickupStatus='picked_up';
    }else if(arrivedAt){
      base.returnStatus=base.returnStatus||'arrived';
      base.supplierPickupStatus='waiting_pickup';
    }else if(detectedReturn&&!base.returnStatus){
      base.returnStatus='in_transit';
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
  const sh=ensureDatabase_();
  const raw=sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).getValues()[0];
  const current=rowToObject_(raw,row.rowNumber);
  const isReturn=Boolean(tracking.isReturn)||looksLikeReturn_(tracking.statusText);
  const arrivedAt=current.arrivedAt||tracking.arrivedAt||'';
  const merged=Object.assign({},current,{
    deliveryStatus:tracking.statusText||current.deliveryStatus,
    deliveryCode:tracking.statusCode||current.deliveryCode,
    statusSource:tracking.source||current.statusSource,
    returnStartedAt:current.returnStartedAt||tracking.returnStartedAt||'',
    arrivedAt:arrivedAt,
    updatedAt:new Date().toISOString()
  });
  if(isReturn&&!merged.returnNumber) merged.returnNumber=generateReturnNumber_();
  if(isReturn&&!merged.returnStatus) merged.returnStatus='in_transit';
  if(arrivedAt&&!merged.supplierPickedUp){
    merged.returnStatus='arrived';
    merged.supplierPickupStatus='waiting_pickup';
    merged.returnDate=merged.returnDate||arrivedAt;
  }
  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalizeReturnState_(merged,false))]);
}

function saveReturn_(payload,isCreate){
  payload=payload||{};
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
    note:String(payload.note||'').trim()
  });

  if(payload.productImageData){ next.productImage=saveReturnImage_(payload.productImageData,next.id); }
  if(!next.supplierPickedUp){
    next.supplierPickupStatus=status==='arrived'?'waiting_pickup':'not_handed_over';
  }
  const normalized=normalizeReturnState_(next,true);
  if(isCreate){
    sh.appendRow(objectToRow_(normalized));
  }else{
    sh.getRange(rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalized)]);
  }
  return normalized.id;
}

function markSupplierPickedUp_(id,taken){
  const sh=ensureDatabase_();
  const row=findReturnById_(id);
  if(!row) throw new Error('Повернення не знайдено.');
  const now=new Date();
  row.supplierPickedUp=Boolean(taken);
  row.supplierPickedUpAt=taken?now.toISOString():'';
  row.supplierPickupStatus=taken?'picked_up':(row.returnStatus==='arrived'?'waiting_pickup':'not_handed_over');
  row.updatedAt=now.toISOString();
  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(row)]);
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
