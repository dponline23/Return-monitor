const RETURN_FIELDS = Object.freeze([
  Object.freeze({key:'id',header:'ID'}),
  Object.freeze({key:'returnNumber',header:'№ повернення'}),
  Object.freeze({key:'supplierId',header:'Постачальник ID'}),
  Object.freeze({key:'supplierName',header:'Постачальник'}),
  Object.freeze({key:'supplierOrderNumber',header:'№ замовлення постачальника'}),
  Object.freeze({key:'supplierOrderUrl',header:'URL замовлення постачальника'}),
  Object.freeze({key:'productName',header:'Товар'}),
  Object.freeze({key:'productImage',header:'Фото'}),
  Object.freeze({key:'returnReason',header:'Причина'}),
  Object.freeze({key:'returnReasonComment',header:'Коментар причини'}),
  Object.freeze({key:'amount',header:'Сума'}),
  Object.freeze({key:'returnStatus',header:'Статус повернення'}),
  Object.freeze({key:'supplierPickupStatus',header:'Статус забору'}),
  Object.freeze({key:'supplierPickedUp',header:'Забрано постачальником'}),
  Object.freeze({key:'supplierPickedUpAt',header:'Дата/час забору'}),
  Object.freeze({key:'returnDate',header:'Дата повернення'}),
  Object.freeze({key:'source',header:'Джерело'}),
  Object.freeze({key:'createdAt',header:'Створено'}),
  Object.freeze({key:'updatedAt',header:'Оновлено'}),
  Object.freeze({key:'salesDriveId',header:'SalesDrive ID'}),
  Object.freeze({key:'orderNumber',header:'№ замовлення джерела'}),
  Object.freeze({key:'orderDate',header:'Дата замовлення'}),
  Object.freeze({key:'shop',header:'Магазин'}),
  Object.freeze({key:'carrier',header:'Перевізник'}),
  Object.freeze({key:'ttn',header:'ТТН'}),
  Object.freeze({key:'deliveryStatus',header:'Статус доставки'}),
  Object.freeze({key:'deliveryCode',header:'Код статусу'}),
  Object.freeze({key:'returnStartedAt',header:'Дата початку повернення'}),
  Object.freeze({key:'arrivedAt',header:'Дата прибуття'}),
  Object.freeze({key:'statusSource',header:'Джерело статусу'}),
  Object.freeze({key:'promId',header:'Prom ID'}),
  Object.freeze({key:'note',header:'Примітка'}),
  Object.freeze({key:'originalTtn',header:'Першочергова ТТН'}),
  Object.freeze({key:'returnTtn',header:'ТТН повернення'}),
  Object.freeze({key:'supplierNotified',header:'Постачальника сповіщено'}),
  Object.freeze({key:'supplierNotifiedAt',header:'Дата/час сповіщення'})
]);

const RETURN_HEADERS = Object.freeze(RETURN_FIELDS.map(item=>item.header));
const RETURN_KEYS = Object.freeze(RETURN_FIELDS.map(item=>item.key));
const PREVIOUS_RETURN_HEADERS = Object.freeze(RETURN_HEADERS.slice(0,RETURN_HEADERS.length-4));
const SUPPLIER_HEADERS = Object.freeze(['ID','Назва','Активний','Створено','Оновлено']);
const SETTINGS_HEADERS = Object.freeze(['Тип','ID','Назва','Активний','Порядок']);
const LEGACY_RETURN_HEADERS = Object.freeze(['SalesDrive ID','№ замовлення','Дата','Магазин','Клієнт','Телефон','Товар','Артикул','Сума','Перевізник','ТТН','Статус доставки','Код статусу','Повернення','Дата початку повернення','Дата прибуття','Постачальник','№ замовлення постачальника','Забрано постачальником','Дата закриття','Оновлено','Джерело статусу','Prom ID','Примітка']);

function db_(){ return SpreadsheetApp.openById(RETURN_MONITOR.spreadsheetId); }

function ensureDatabase_(){
  const ss=db_();
  let sh=ss.getSheetByName(RETURN_MONITOR.returnsSheet);
  if(!sh) sh=ss.insertSheet(RETURN_MONITOR.returnsSheet);

  const lastCol=Math.max(sh.getLastColumn(),1);
  const existing=sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(v=>String(v||'').trim());
  const existingJoined=existing.filter(Boolean).join('|');

  if(!existingJoined){
    sh.getRange(1,1,1,RETURN_HEADERS.length).setValues([RETURN_HEADERS]);
  }else if(existing.slice(0,RETURN_HEADERS.length).join('|')!==RETURN_HEADERS.join('|')){
    if(existing.slice(0,PREVIOUS_RETURN_HEADERS.length).join('|')===PREVIOUS_RETURN_HEADERS.join('|')){
      upgradeReturnHeadersV2_(sh);
    }else if(existing.slice(0,LEGACY_RETURN_HEADERS.length).join('|')===LEGACY_RETURN_HEADERS.join('|')){
      migrateLegacyReturns_(sh);
    }else{
      throw new Error('Аркуш «'+RETURN_MONITOR.returnsSheet+'» має невідому структуру колонок. Автоматичну міграцію зупинено, щоб не пошкодити дані.');
    }
  }

  sh.setFrozenRows(1);
  ensureSuppliersSheet_();
  ensureSettingsSheet_();
  syncSupplierDirectoryFromReturns_(sh);
  return sh;
}

function upgradeReturnHeadersV2_(sh){
  const start=PREVIOUS_RETURN_HEADERS.length+1;
  const added=RETURN_HEADERS.slice(PREVIOUS_RETURN_HEADERS.length);
  sh.getRange(1,start,1,added.length).setValues([added]);
  const last=sh.getLastRow();
  if(last<2) return;

  const ttnCol=PREVIOUS_RETURN_HEADERS.indexOf('ТТН')+1;
  const statusCol=PREVIOUS_RETURN_HEADERS.indexOf('Статус доставки')+1;
  const returnNumberCol=PREVIOUS_RETURN_HEADERS.indexOf('№ повернення')+1;
  const ttns=sh.getRange(2,ttnCol,last-1,1).getDisplayValues();
  const statuses=sh.getRange(2,statusCol,last-1,1).getDisplayValues();
  const numbers=sh.getRange(2,returnNumberCol,last-1,1).getDisplayValues();
  const values=ttns.map((r,i)=>{
    const ttn=String(r[0]||'').trim();
    const isReturn=Boolean(String(numbers[i][0]||'').trim())||looksLikeReturn_(statuses[i][0]);
    return [ttn,isReturn?ttn:'',false,''];
  });
  sh.getRange(2,start,values.length,added.length).setValues(values);
}

function migrateLegacyReturns_(sh){
  const last=sh.getLastRow();
  const legacyRows=last>1?sh.getRange(2,1,last-1,LEGACY_RETURN_HEADERS.length).getValues():[];
  let seq=1;
  const now=new Date();
  const migrated=legacyRows.map(r=>{
    const deliveryStatus=String(r[11]||'');
    const isReturn=toBool_(r[13])||looksLikeReturn_(deliveryStatus);
    const supplierPickedUp=toBool_(r[18]);
    const arrivedAt=dateIso_(r[15]);
    const returnStartedAt=dateIso_(r[14]);
    const ttn=String(r[10]||'');
    const id=String(r[0]||'')&&ttn?('sd_'+String(r[0])+'_'+ttn):Utilities.getUuid();
    const obj={
      id:id,
      returnNumber:isReturn?legacyReturnNumber_(now,seq++):'',
      supplierId:'',
      supplierName:String(r[16]||''),
      supplierOrderNumber:String(r[17]||''),
      supplierOrderUrl:'',
      productName:String(r[6]||''),
      productImage:'',
      returnReason:'',
      returnReasonComment:'',
      amount:Number(r[8]||0),
      returnStatus:supplierPickedUp?'completed':(isReturn?(arrivedAt?'arrived':'in_transit'):''),
      supplierPickupStatus:supplierPickedUp?'picked_up':(isReturn&&arrivedAt?'waiting_pickup':'not_handed_over'),
      supplierPickedUp:supplierPickedUp,
      supplierPickedUpAt:dateIso_(r[19]),
      returnDate:isReturn?(arrivedAt||returnStartedAt||''):'',
      source:String(r[0]||'')?'salesdrive':'manual',
      createdAt:dateIso_(r[2])||now.toISOString(),
      updatedAt:dateIso_(r[20])||now.toISOString(),
      salesDriveId:String(r[0]||''),
      orderNumber:String(r[1]||''),
      orderDate:dateIso_(r[2]),
      shop:String(r[3]||''),
      carrier:String(r[9]||''),
      ttn:ttn,
      deliveryStatus:deliveryStatus,
      deliveryCode:String(r[12]||''),
      returnStartedAt:returnStartedAt,
      arrivedAt:arrivedAt,
      statusSource:String(r[21]||''),
      promId:String(r[22]||''),
      note:String(r[23]||''),
      originalTtn:ttn,
      returnTtn:isReturn?ttn:'',
      supplierNotified:false,
      supplierNotifiedAt:''
    };
    return objectToRow_(obj);
  });

  sh.clearContents();
  sh.getRange(1,1,1,RETURN_HEADERS.length).setValues([RETURN_HEADERS]);
  if(migrated.length) sh.getRange(2,1,migrated.length,RETURN_HEADERS.length).setValues(migrated);
}

function legacyReturnNumber_(date,seq){
  const year=(date instanceof Date?date:new Date()).getFullYear();
  return 'RTN-'+year+'-'+String(seq).padStart(4,'0');
}

function ensureSuppliersSheet_(){
  const ss=db_();
  let sh=ss.getSheetByName(RETURN_MONITOR.suppliersSheet);
  if(!sh) sh=ss.insertSheet(RETURN_MONITOR.suppliersSheet);
  const current=sh.getRange(1,1,1,SUPPLIER_HEADERS.length).getDisplayValues()[0];
  if(current.join('|')!==SUPPLIER_HEADERS.join('|')) sh.getRange(1,1,1,SUPPLIER_HEADERS.length).setValues([SUPPLIER_HEADERS]);
  sh.setFrozenRows(1);
  return sh;
}

function ensureSettingsSheet_(){
  const ss=db_();
  let sh=ss.getSheetByName(RETURN_MONITOR.settingsSheet);
  if(!sh) sh=ss.insertSheet(RETURN_MONITOR.settingsSheet);
  const current=sh.getRange(1,1,1,SETTINGS_HEADERS.length).getDisplayValues()[0];
  const legacySettings=['Ключ','Значення','Опис','Секрет'];
  if(current.slice(0,legacySettings.length).join('|')===legacySettings.join('|')) sh.clearContents();
  const refreshed=sh.getRange(1,1,1,SETTINGS_HEADERS.length).getDisplayValues()[0];
  if(refreshed.join('|')!==SETTINGS_HEADERS.join('|')) sh.getRange(1,1,1,SETTINGS_HEADERS.length).setValues([SETTINGS_HEADERS]);
  sh.setFrozenRows(1);
  seedDefaultReturnReasons_(sh);
  return sh;
}

function seedDefaultReturnReasons_(sh){
  const last=sh.getLastRow();
  const rows=last>1?sh.getRange(2,1,last-1,SETTINGS_HEADERS.length).getValues():[];
  if(rows.some(r=>String(r[0]||'')==='return_reason')) return;
  const values=DEFAULT_RETURN_REASONS.map((item,index)=>['return_reason',item.id,item.name,true,index+1]);
  if(values.length) sh.getRange(sh.getLastRow()+1,1,values.length,SETTINGS_HEADERS.length).setValues(values);
}

function getReturnReasons_(){
  const sh=ensureSettingsSheet_();
  const last=sh.getLastRow();
  if(last<2) return DEFAULT_RETURN_REASONS.map(item=>({id:item.id,name:item.name}));
  return sh.getRange(2,1,last-1,SETTINGS_HEADERS.length).getValues()
    .filter(r=>String(r[0]||'')==='return_reason'&&toBool_(r[3]))
    .map(r=>({id:String(r[1]||''),name:String(r[2]||''),order:Number(r[4]||0)}))
    .filter(item=>item.id&&item.name)
    .sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,'uk'));
}

function getSuppliers_(){
  const sh=ensureSuppliersSheet_();
  const last=sh.getLastRow();
  if(last<2) return [];
  return sh.getRange(2,1,last-1,SUPPLIER_HEADERS.length).getValues()
    .map((r,i)=>({rowNumber:i+2,id:String(r[0]||''),name:String(r[1]||''),active:r[2]===''?true:toBool_(r[2]),createdAt:dateIso_(r[3]),updatedAt:dateIso_(r[4])}))
    .filter(item=>item.id&&item.name&&item.active)
    .sort((a,b)=>a.name.localeCompare(b.name,'uk'));
}

function saveSupplier_(payload){
  payload=payload||{};
  const name=String(payload.name||'').trim();
  if(!name) throw new Error('Вкажіть назву постачальника.');
  const sh=ensureSuppliersSheet_();
  const last=sh.getLastRow();
  const rows=last>1?sh.getRange(2,1,last-1,SUPPLIER_HEADERS.length).getValues():[];
  const requestedId=String(payload.id||'').trim();
  let index=-1;
  if(requestedId) index=rows.findIndex(r=>String(r[0]||'')===requestedId);
  if(index<0) index=rows.findIndex(r=>String(r[1]||'').trim().toLowerCase()===name.toLowerCase());
  const now=new Date();
  if(index>=0){
    const id=String(rows[index][0]||requestedId||Utilities.getUuid());
    sh.getRange(index+2,1,1,SUPPLIER_HEADERS.length).setValues([[id,name,true,rows[index][3]||now,now]]);
    return {id:id,name:name,active:true};
  }
  const id=requestedId||Utilities.getUuid();
  sh.appendRow([id,name,true,now,now]);
  return {id:id,name:name,active:true};
}

function syncSupplierDirectoryFromReturns_(returnsSheet){
  const supplierSh=ensureSuppliersSheet_();
  const suppliers=getSuppliers_();
  const known=new Map(suppliers.map(item=>[item.name.toLowerCase(),item]));
  const last=returnsSheet.getLastRow();
  if(last<2) return;
  const supplierNameCol=RETURN_KEYS.indexOf('supplierName')+1;
  const supplierIdCol=RETURN_KEYS.indexOf('supplierId')+1;
  const names=returnsSheet.getRange(2,supplierNameCol,last-1,1).getValues();
  const ids=returnsSheet.getRange(2,supplierIdCol,last-1,1).getValues();
  const now=new Date();
  let supplierRows=[];
  names.forEach((r,i)=>{
    const name=String(r[0]||'').trim();
    if(!name) return;
    const key=name.toLowerCase();
    let item=known.get(key);
    if(!item){
      item={id:Utilities.getUuid(),name:name,active:true};
      known.set(key,item);
      supplierRows.push([item.id,item.name,true,now,now]);
    }
    if(!ids[i][0]) ids[i][0]=item.id;
  });
  if(supplierRows.length) supplierSh.getRange(supplierSh.getLastRow()+1,1,supplierRows.length,SUPPLIER_HEADERS.length).setValues(supplierRows);
  if(ids.some(r=>r[0])) returnsSheet.getRange(2,supplierIdCol,last-1,1).setValues(ids);
}
