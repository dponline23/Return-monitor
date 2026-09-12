const SALESDRIVE_CONFIG = Object.freeze({
  subdomainProperty: 'SALESDRIVE_SUBDOMAIN',
  apiKeyProperty: 'SALESDRIVE_ORDER_API_KEY',
  lastSyncProperty: 'SALESDRIVE_LAST_SYNC',
  defaultSubdomain: 'techwolves',
  pageSize: 100,
  maxPages: 40,
  throttleMs: 6200,
  initialLookbackDays: 60,
  regularLookbackDays: 21,
  maxActiveLookbackDays: 60
});

function getSalesDriveState_(){
  const p=PropertiesService.getScriptProperties();
  return {
    subdomain:String(p.getProperty(SALESDRIVE_CONFIG.subdomainProperty)||SALESDRIVE_CONFIG.defaultSubdomain),
    configured:Boolean(p.getProperty(SALESDRIVE_CONFIG.apiKeyProperty)),
    lastSync:p.getProperty(SALESDRIVE_CONFIG.lastSyncProperty)||''
  };
}

function apiSalesDriveSettings(){ return getSalesDriveState_(); }

function apiSaveSalesDriveSettings(payload){
  payload=payload||{};
  const p=PropertiesService.getScriptProperties();
  const subdomain=String(payload.subdomain||p.getProperty(SALESDRIVE_CONFIG.subdomainProperty)||SALESDRIVE_CONFIG.defaultSubdomain)
    .trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\.salesdrive\.me.*$/i,'').replace(/[^a-z0-9-]/g,'');
  if(!subdomain) throw new Error('Вкажіть субдомен SalesDrive.');
  p.setProperty(SALESDRIVE_CONFIG.subdomainProperty,subdomain);

  const apiKey=String(payload.apiKey||'').trim();
  if(apiKey){
    if(apiKey.length<20) throw new Error('API-ключ SalesDrive виглядає надто коротким.');
    p.setProperty(SALESDRIVE_CONFIG.apiKeyProperty,apiKey);
  }
  if(payload.clearKey===true) p.deleteProperty(SALESDRIVE_CONFIG.apiKeyProperty);
  return getSalesDriveState_();
}

function apiTestSalesDrive(){
  const state=getSalesDriveState_();
  const p=PropertiesService.getScriptProperties();
  const apiKey=p.getProperty(SALESDRIVE_CONFIG.apiKeyProperty)||'';
  if(!apiKey) throw new Error('Спочатку збережіть API-ключ заявок SalesDrive.');
  const statusMap=salesDriveStatusMap_(state.subdomain,apiKey);
  const url='https://'+state.subdomain+'.salesdrive.me/api/order/list/?page=1&limit=1';
  const payload=salesDriveRequestJson_(url,apiKey);
  const first=Array.isArray(payload.data)&&payload.data.length?payload.data[0]:null;
  return {
    ok:true,
    sampleOrderId:first?String(first.id||''):'',
    sampleExternalId:first?String(first.externalId||''):'',
    sampleStatus:first?salesDriveOrderStatusText_(first,statusMap):'',
    statusCount:Object.keys(statusMap).length,
    state:getSalesDriveState_()
  };
}

function syncSalesDrive_(){
  const p=PropertiesService.getScriptProperties();
  const state=getSalesDriveState_();
  const apiKey=p.getProperty(SALESDRIVE_CONFIG.apiKeyProperty)||'';
  if(!apiKey) return {ok:false,skipped:true,reason:'SALESDRIVE_ORDER_API_KEY not set'};

  const now=new Date();
  const lastSync=parseDate_(state.lastSync);
  const lookbackDays=lastSync?salesDriveActiveLookbackDays_():SALESDRIVE_CONFIG.initialLookbackDays;
  const fromDate=new Date(now.getTime()-lookbackDays*86400000);
  const toDate=new Date(now.getTime()+86400000);
  const normalized=[];
  const statusMap=salesDriveStatusMap_(state.subdomain,apiKey);
  let received=0,page=1;

  while(page<=SALESDRIVE_CONFIG.maxPages){
    const url=salesDriveOrdersUrl_(state.subdomain,page,fromDate,toDate);
    const payload=salesDriveRequestJson_(url,apiKey);
    const rows=Array.isArray(payload&&payload.data)?payload.data:[];
    received+=rows.length;
    rows.forEach(raw=>normalizeSalesDriveOrders_(raw,statusMap).forEach(item=>normalized.push(item)));
    if(rows.length<SALESDRIVE_CONFIG.pageSize) break;
    Utilities.sleep(SALESDRIVE_CONFIG.throttleMs);
    page++;
  }

  const unique=[];
  const seen=new Set();
  normalized.forEach(item=>{
    const key=String(item.salesDriveId||'')+'|'+String(item.ttn||'');
    if(!item.salesDriveId||!item.ttn||seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });

  preserveKnownSeparateReturnLegs_(unique);

  const returnItems=unique.filter(item=>item.isReturn);
  const saved=upsertSalesDriveOrders_(returnItems);
  const imageSaved=saveSalesDriveProductImages_(returnItems);
  const detectedReturns=returnItems.length;
  p.setProperty(SALESDRIVE_CONFIG.lastSyncProperty,now.toISOString());
  return {
    ok:true,
    received:received,
    usable:returnItems.length,
    detectedReturns:detectedReturns,
    imagesUpdated:imageSaved,
    statusCount:Object.keys(statusMap).length,
    inserted:saved.inserted,
    updated:saved.updated,
    pages:page,
    lookbackDays:lookbackDays,
    from:fromDate.toISOString(),
    to:toDate.toISOString()
  };
}

function saveSalesDriveProductImages_(orders){
  const withImage=(orders||[]).filter(item=>item.productImage&&item.salesDriveId&&item.ttn);
  if(!withImage.length) return 0;
  const rows=readReturnRows_();
  const byKey=new Map(rows.filter(r=>r.salesDriveId&&r.ttn).map(r=>[String(r.salesDriveId)+'|'+normalizeTrackingNumber_(r.ttn),r]));
  const sh=returnSheetFast_();
  const col=RETURN_KEYS.indexOf('productImage')+1;
  let updated=0;
  withImage.forEach(item=>{
    const row=byKey.get(String(item.salesDriveId)+'|'+normalizeTrackingNumber_(item.ttn));
    if(!row) return;
    const current=String(row.productImage||'').trim();
    if(current&&salesDriveStableImageUrl_(current)) return;
    const source=String(item.productImage||current||'').trim();
    if(!source) return;
    const stable=salesDrivePersistProductImage_(source,row.id||item.salesDriveId);
    const next=stable||current||source;
    if(!next||next===current) return;
    sh.getRange(row.rowNumber,col).setValue(next);
    row.productImage=next;
    updated++;
  });
  return updated;
}

function salesDriveStableImageUrl_(url){
  const value=String(url||'').trim();
  if(!value) return false;
  if(/^data:image\//i.test(value)) return true;
  return /(?:drive\.google\.com\/uc|drive\.usercontent\.google\.com|lh3\.googleusercontent\.com\/d\/)/i.test(value);
}

function salesDrivePersistProductImage_(imageUrl,rowId){
  const raw=String(imageUrl||'').trim();
  if(!raw) return '';
  if(salesDriveStableImageUrl_(raw)) return raw;
  if(!/^https?:\/\//i.test(raw)) return '';
  try{
    const response=UrlFetchApp.fetch(raw,{method:'get',muteHttpExceptions:true,followRedirects:true,headers:{'User-Agent':'Mozilla/5.0','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}});
    const code=response.getResponseCode();
    if(code<200||code>=300) return '';
    const blob=response.getBlob();
    const mime=String(blob.getContentType()||'').toLowerCase();
    if(!/^image\//i.test(mime)) return '';
    const bytes=blob.getBytes();
    if(!bytes.length||bytes.length>5*1024*1024) return '';
    const ext=mime.indexOf('png')>=0?'png':(mime.indexOf('webp')>=0?'webp':(mime.indexOf('gif')>=0?'gif':'jpg'));
    const folder=getReturnImagesFolder_();
    const safeId=String(rowId||Utilities.getUuid()).replace(/[^A-Za-z0-9_-]+/g,'-').slice(0,80);
    const file=folder.createFile(Utilities.newBlob(bytes,mime,'salesdrive-'+safeId+'-'+Date.now()+'.'+ext));
    try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(_){ }
    return 'https://drive.google.com/uc?export=view&id='+file.getId();
  }catch(_){
    return '';
  }
}

function preserveKnownSeparateReturnLegs_(items){
  if(!items||!items.length) return items||[];
  let current=[];
  try{ current=readReturnRows_(); }catch(_){ return items; }
  const byShipment=new Map();
  current.forEach(row=>{
    const key=String(row.salesDriveId||'')+'|'+normalizeTrackingNumber_(row.ttn||'');
    if(row.salesDriveId&&row.ttn) byShipment.set(key,row);
  });

  items.forEach(item=>{
    const old=byShipment.get(String(item.salesDriveId||'')+'|'+normalizeTrackingNumber_(item.ttn||''));
    if(!old) return;
    const knownReturn=normalizeTrackingNumber_(old.returnTtn||'');
    const shipment=normalizeTrackingNumber_(item.ttn||'');
    if(!knownReturn||knownReturn===shipment) return;

    item.isReturn=true;
    item.returnTtn=old.returnTtn;
    item.originalTtn=old.originalTtn||old.ttn||item.originalTtn||item.ttn;
    item.carrier=old.carrier||item.carrier;
    item.deliveryStatus=old.deliveryStatus||item.deliveryStatus;
    item.deliveryCode=old.deliveryCode||item.deliveryCode;
    item.statusSource=old.statusSource||item.statusSource;
    item.returnStartedAt=old.returnStartedAt||item.returnStartedAt||'';
    item.arrivedAt=old.arrivedAt||item.arrivedAt||'';
    item.productImage=old.productImage||item.productImage||'';
  });
  return items;
}

function salesDriveActiveLookbackDays_(){
  let days=SALESDRIVE_CONFIG.regularLookbackDays;
  try{
    const now=Date.now();
    readReturnRows_().forEach(row=>{
      if(String(row.source||'').toLowerCase()!=='salesdrive'||row.supplierPickedUp||!isReturnRecord_(row)) return;
      const d=parseDate_(row.orderDate||row.createdAt);
      if(!d) return;
      const age=Math.ceil((now-d.getTime())/86400000)+2;
      if(age>days) days=age;
    });
  }catch(_){ }
  return Math.max(SALESDRIVE_CONFIG.regularLookbackDays,Math.min(SALESDRIVE_CONFIG.maxActiveLookbackDays,days));
}

function salesDriveRequestJson_(url,apiKey){
  const response=UrlFetchApp.fetch(url,{
    method:'get',
    headers:{Accept:'application/json','X-Api-Key':apiKey},
    muteHttpExceptions:true,
    followRedirects:true
  });
  const code=response.getResponseCode();
  const text=response.getContentText('UTF-8');
  let payload=null;
  try{payload=JSON.parse(text||'{}');}catch(_){payload=null;}
  if(code===401) throw new Error('SalesDrive відхилив API-ключ. Потрібен ключ бази заявок з правом «Заявки — читання».');
  if(code===429) throw new Error('SalesDrive обмежив частоту запитів. Повторіть синхронізацію приблизно через хвилину.');
  if(code<200||code>=300||!payload||payload.status==='error'){
    const message=payload&&payload.message?String(payload.message):('HTTP '+code);
    throw new Error('SalesDrive API: '+message.slice(0,250));
  }
  return payload;
}

function salesDriveOrdersUrl_(subdomain,page,fromDate,toDate){
  const format=date=>Utilities.formatDate(date,'Europe/Kyiv','yyyy-MM-dd HH:mm:ss');
  const params={
    page:page,
    limit:SALESDRIVE_CONFIG.pageSize,
    'filter[orderTime][from]':format(fromDate),
    'filter[orderTime][to]':format(toDate),
    'filter[statusId]':'__ALL__'
  };
  const query=Object.keys(params).map(key=>encodeURIComponent(key)+'='+encodeURIComponent(params[key])).join('&');
  return 'https://'+subdomain+'.salesdrive.me/api/order/list/?'+query;
}

function salesDriveStatusMap_(subdomain,apiKey){
  const cache=CacheService.getScriptCache();
  const cacheKey='SALESDRIVE_STATUS_MAP_'+String(subdomain||'').toLowerCase();
  const cached=cache.get(cacheKey);
  if(cached){
    try{return JSON.parse(cached)||{};}catch(_){ }
  }

  let payload=null;
  try{ payload=salesDriveRequestJson_('https://'+subdomain+'.salesdrive.me/api/statuses/',apiKey); }
  catch(_){ return {}; }

  const map={};
  const visited=new Set();
  const collect=value=>{
    if(value===null||value===undefined) return;
    if(Array.isArray(value)){ value.forEach(collect); return; }
    if(typeof value!=='object'||visited.has(value)) return;
    visited.add(value);

    const id=firstValue_(value,['id','statusId','status_id','value','key']);
    const name=compactText_(firstValue_(value,['name','title','label','text','statusName','status_name']));
    if(id!==''&&id!==null&&id!==undefined&&name) map[String(id)]=name;

    Object.keys(value).forEach(key=>{
      const child=value[key];
      if(/^\d+$/.test(key)&&typeof child==='string'&&child.trim()) map[String(key)]=child.trim();
      if(child&&typeof child==='object') collect(child);
    });
  };
  collect(payload);

  if(Object.keys(map).length){
    try{cache.put(cacheKey,JSON.stringify(map),21600);}catch(_){ }
  }
  return map;
}

function normalizeSalesDriveOrders_(raw,statusMap){
  raw=raw||{};
  statusMap=statusMap||{};
  const usableDeliveries=salesDriveCollectDeliveries_(raw);
  if(!usableDeliveries.length) return [];

  const contact=raw.primaryContact||((Array.isArray(raw.contacts)&&raw.contacts[0])||{});
  const customer=[contact.lName,contact.fName,contact.mName].map(v=>String(v||'').trim()).filter(Boolean).join(' ');
  const phone=Array.isArray(contact.phone)?contact.phone.join(', '):String(contact.phone||'');
  const products=Array.isArray(raw.products)?raw.products:[];
  const firstProduct=products.length?products[0]:{};
  const directProductImage=salesDriveFindImageUrl_(firstProduct);
  const productText=products.map(item=>{
    const name=String(item.nameTranslate||item.text||item.documentName||item.name||'').trim();
    const qty=Number(item.amount||1);
    return name+(qty>1?' ×'+qty:'');
  }).filter(Boolean).join('; ');
  const skuText=products.map(item=>String(item.sku||item.parameter||'').trim()).filter(Boolean).join(', ');
  const externalId=String(raw.externalId||'');
  const campaign=String(raw.utmCampaign||raw.utmSource||'').trim();
  const isProm=/prom/i.test(campaign);
  const orderStatusId=String(firstValue_(raw,['statusId','status_id','status.id','orderStatusId','currentStatusId'])||'').trim();
  const orderStatusText=salesDriveOrderStatusText_(raw,statusMap);
  const orderStatusIsReturn=looksLikeReturn_(orderStatusText);
  const statusChangedAt=firstValue_(raw,['statusChangedAt','statusChangeTime','updateAt','updateTime','updatedAt','editTime','modifiedAt']);
  const primaryCarrier=salesDriveCarrierName_('',raw.shipping_method);

  const meta=usableDeliveries.map((delivery,index)=>{
    const provider=String(delivery.provider||'').trim();
    const carrier=salesDriveCarrierName_(provider,raw.shipping_method);
    const code=delivery.statusCode===undefined||delivery.statusCode===null?'':String(delivery.statusCode);
    const deliveryStatus=compactText_(firstValue_(delivery,['statusText','status','statusDescription','deliveryStatus','state'])) || (code?'SalesDrive · код '+code:'');
    const trackingNumber=String(firstValue_(delivery,['trackingNumber','EN','barcode','ttn','number'])||'').trim();
    const parentTracking=String(firstValue_(delivery,['parentTrackingNumber','parentEN','parentBarcode','parentTtn'])||'').trim();
    const explicit=salesDriveDeliveryReturnSignal_(carrier,code,deliveryStatus);
    const redirection=salesDriveDeliveryIsRedirection_(carrier,code,deliveryStatus,orderStatusText);
    let score=0;
    if(explicit) score+=40;
    if(parentTracking&&parentTracking!==trackingNumber&&!redirection) score+=100;
    if(orderStatusIsReturn&&carrier&&primaryCarrier&&carrier!==primaryCarrier&&!redirection) score+=70;
    if(isCarrierReturnedToSender_({carrier:carrier,deliveryCode:code,deliveryStatus:deliveryStatus})) score+=80;
    if(/повернен|поверта|зворотн/i.test(deliveryStatus)) score+=50;
    if(/відмов/i.test(deliveryStatus)) score+=20;
    const changed=parseDate_(firstValue_(delivery,['dateStatusUpdate','statusChangedAt','updatedAt','deliveryDateAndTime','recipientDateTime']));
    if(changed) score+=Math.min(10,changed.getTime()/1e12);
    return {index:index,delivery:delivery,provider:provider,carrier:carrier,code:code,deliveryStatus:deliveryStatus,trackingNumber:trackingNumber,parentTracking:parentTracking,explicit:explicit,redirection:redirection,score:score};
  });

  let selected=new Set();
  const explicitCandidates=meta.filter(x=>x.explicit&&!x.redirection);
  if(orderStatusIsReturn){
    const candidates=(explicitCandidates.length?explicitCandidates:meta.filter(x=>!x.redirection));
    if(candidates.length){
      const best=candidates.slice().sort((a,b)=>b.score-a.score)[0];
      selected.add(best.index);
    }
  }else{
    explicitCandidates.forEach(x=>selected.add(x.index));
  }

  const productImage=selected.size?(directProductImage||salesDriveProductPageImage_(firstProduct)):directProductImage;

  return meta.map(m=>{
    const isReturn=selected.has(m.index);
    const combinedStatus=[orderStatusText,m.deliveryStatus].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
    const returnArrived=isReturn&&salesDriveReturnArrived_(m.carrier,m.code,combinedStatus);
    const returnedToSender=isReturn&&isCarrierReturnedToSender_({carrier:m.carrier,deliveryCode:m.code,deliveryStatus:combinedStatus});
    const noteParts=[];
    if(orderStatusText) noteParts.push('Статус SalesDrive: '+orderStatusText+(orderStatusId?' [ID '+orderStatusId+']':''));
    else if(orderStatusId) noteParts.push('Статус SalesDrive ID: '+orderStatusId);
    if(m.parentTracking) noteParts.push('Батьківська ТТН: '+m.parentTracking);

    const statusTime=firstValue_(m.delivery,['dateStatusUpdate','statusChangedAt','updatedAt'])||statusChangedAt||'';
    const arrivalTime=returnArrived?(firstValue_(m.delivery,['deliveryDateAndTime','dateStatusUpdate','statusChangedAt'])||statusChangedAt||''):'';

    return {
      salesDriveId:String(raw.id||raw.orderId||raw.order_id||''),
      orderNumber:externalId||String(raw.id||''),
      orderDate:raw.orderTime||raw.createTime||raw.createdAt||'',
      shop:campaign||String(raw.sajt||''),
      customer:customer,
      phone:phone,
      product:productText,
      productImage:productImage,
      sku:skuText,
      amount:Number(raw.paymentAmount||raw.total||raw.amount||0),
      carrier:m.carrier,
      ttn:m.trackingNumber,
      originalTtn:m.parentTracking||m.trackingNumber,
      returnTtn:isReturn?m.trackingNumber:'',
      deliveryStatus:combinedStatus,
      deliveryCode:m.code,
      isReturn:isReturn,
      returnStartedAt:isReturn?(statusTime||''):'',
      arrivedAt:returnArrived?(arrivalTime||''):'',
      returnedToSender:returnedToSender,
      statusSource:'SalesDrive',
      promId:isProm?externalId:'',
      note:noteParts.join(' · ')
    };
  });
}

function salesDriveFindImageUrl_(product){
  if(!product||typeof product!=='object') return '';
  const directKeys=['image','imageUrl','imageURL','photo','photoUrl','photoURL','picture','pictureUrl','pictureURL','thumbnail','thumbnailUrl','mainImage','mainPhoto','images','photos','pictures'];
  const normalize=value=>{
    if(typeof value!=='string') return '';
    let url=value.trim().replace(/^['\"]|['\"]$/g,'');
    if(!url) return '';
    if(/^\/\//.test(url)) url='https:'+url;
    if(/^\//.test(url)) url='https://'+getSalesDriveState_().subdomain+'.salesdrive.me'+url;
    return /^https?:\/\//i.test(url)?url:'';
  };
  const inspect=(value,depth)=>{
    if(depth>3||value===null||value===undefined) return '';
    if(typeof value==='string') return normalize(value);
    if(Array.isArray(value)){
      for(let i=0;i<value.length;i++){
        const found=inspect(value[i],depth+1);
        if(found) return found;
      }
      return '';
    }
    if(typeof value!=='object') return '';
    for(let i=0;i<directKeys.length;i++){
      const key=directKeys[i];
      if(Object.prototype.hasOwnProperty.call(value,key)){
        const found=inspect(value[key],depth+1);
        if(found) return found;
      }
    }
    const keys=Object.keys(value).filter(key=>/image|photo|picture|thumb/i.test(key));
    for(let i=0;i<keys.length;i++){
      const found=inspect(value[keys[i]],depth+1);
      if(found) return found;
    }
    return '';
  };
  return inspect(product,0);
}

function salesDriveProductPageImage_(product){
  product=product||{};
  let href=String(firstValue_(product,['href','url','link','productUrl','productURL'])||'').trim();
  if(!href) return '';
  if(/^\/\//.test(href)) href='https:'+href;
  if(/^\//.test(href)) href='https://'+getSalesDriveState_().subdomain+'.salesdrive.me'+href;
  if(!/^https?:\/\//i.test(href)) return '';

  const cache=CacheService.getScriptCache();
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,href,Utilities.Charset.UTF_8);
  const key='RM_IMG_'+Utilities.base64EncodeWebSafe(digest).replace(/=+$/,'').slice(0,32);
  const cached=cache.get(key);
  if(cached!==null) return cached==='-'?'':cached;

  let image='';
  try{
    const response=UrlFetchApp.fetch(href,{method:'get',muteHttpExceptions:true,followRedirects:true,headers:{'User-Agent':'Mozilla/5.0'}});
    if(response.getResponseCode()>=200&&response.getResponseCode()<400){
      const html=response.getContentText('UTF-8').slice(0,500000);
      const patterns=[
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i
      ];
      for(let i=0;i<patterns.length&&!image;i++){
        const match=html.match(patterns[i]);
        if(match&&match[1]) image=String(match[1]).replace(/&amp;/g,'&').trim();
      }
      if(image&&/^\/\//.test(image)) image='https:'+image;
      if(image&&/^\//.test(image)){
        const origin=href.match(/^(https?:\/\/[^\/]+)/i);
        if(origin) image=origin[1]+image;
      }
      if(image&&!/^https?:\/\//i.test(image)) image='';
    }
  }catch(_){ image=''; }
  try{cache.put(key,image||'-',21600);}catch(_){ }
  return image;
}

function salesDriveCollectDeliveries_(raw){
  const byTracking=new Map();
  const add=(value,providerHint)=>{
    if(!value) return;
    if(Array.isArray(value)){ value.forEach(item=>add(item,providerHint)); return; }
    if(typeof value!=='object') return;
    const tracking=String(firstValue_(value,['trackingNumber','EN','barcode','ttn','number'])||'').trim();
    if(!tracking) return;
    const key=tracking.replace(/\s+/g,'').toUpperCase();
    const provider=String(value.provider||providerHint||'').trim();
    const incoming=Object.assign({},value);
    incoming.trackingNumber=tracking;
    if(!incoming.provider&&provider) incoming.provider=provider;
    if(incoming.statusText===undefined&&incoming.status!==undefined) incoming.statusText=incoming.status;

    const existing=byTracking.get(key);
    if(!existing){ byTracking.set(key,incoming); return; }
    const merged=Object.assign({},existing);
    Object.keys(incoming).forEach(k=>{
      const v=incoming[k];
      if(v!==undefined&&v!==null&&String(v)!=='') merged[k]=v;
    });
    byTracking.set(key,merged);
  };

  add(raw.ord_delivery_data,'');
  add(raw.ord_delivery,'');
  add(raw.ord_novaposhta,'novaposhta');
  add(raw.ord_ukrposhta,'ukrposhta');
  add(raw.ord_rozetka,'rozetka');
  add(raw.ord_rozetka_delivery,'rozetka');
  add(raw.ord_meest,'meest');
  add(raw.ord_meest_express,'meest');
  return Array.from(byTracking.values());
}

function salesDriveDeliveryReturnSignal_(carrier,code,status){
  const c=String(carrier||'').toLowerCase();
  const normalizedCode=String(code||'').replace(/\s+/g,'');
  const text=String(status||'');
  if(salesDriveDeliveryIsRedirection_(carrier,code,status,'')) return false;
  if(looksLikeReturn_(text)||looksLikeReturnArrived_(text)) return true;
  if(/нова|novaposhta/.test(c)&&normalizedCode==='102') return true;
  if(/укр|ukrposhta/.test(c)&&(/^(31200|41010|4100010|35500)$/.test(normalizedCode))) return true;
  if(/rozetka|розетка/.test(c)&&/^(50011|50020|60040)$/.test(normalizedCode)) return true;
  return false;
}

function salesDriveDeliveryIsRedirection_(carrier,code,status,orderStatusText){
  const c=String(carrier||'').toLowerCase();
  const normalizedCode=String(code||'').replace(/\s+/g,'');
  const text=[status,orderStatusText].filter(Boolean).join(' · ').toLowerCase();
  if(/переадрес|змінен[оа]\s+адрес|змін[а-яіїєґ]*\s+адрес|redirect|address\s+chang/i.test(text)&&!/відмов|повернен|return\s+to\s+sender/i.test(text)) return true;
  if(/нова|novaposhta/.test(c)&&normalizedCode==='104'&&!/відмов|повернен/i.test(text)) return true;
  return false;
}

function salesDriveReturnArrived_(carrier,code,status){
  if(isCarrierReturnedToSender_({carrier:carrier,deliveryCode:code,deliveryStatus:status})) return true;
  const text=String(status||'').toLowerCase();
  return /повернен.{0,45}прибул.{0,30}(відділен|точк|пункт)|прибул.{0,30}(відділен|точк|пункт).{0,45}повернен/i.test(text)||looksLikeReturnArrived_(text);
}

function salesDriveOrderStatusText_(raw,statusMap){
  raw=raw||{};
  statusMap=statusMap||{};
  const statusId=String(firstValue_(raw,['statusId','status_id','status.id','orderStatusId','currentStatusId'])||'').trim();
  const resolved=statusId&&statusMap[statusId]?String(statusMap[statusId]).trim():'';
  const values=[resolved,raw.statusName,raw.statusText,raw.orderStatusName,raw.currentStatusName,raw.stateName,compactText_(raw.status),compactText_(raw.orderStatus),compactText_(raw.currentStatus),compactText_(raw.statusData),compactText_(raw.status_data),compactText_(raw.state)]
    .map(value=>String(value||'').trim()).filter(Boolean);
  return values.filter((value,index)=>values.indexOf(value)===index).join(' · ');
}

function salesDriveCarrierName_(provider,shippingMethod){
  const value=String(provider||'').toLowerCase();
  if(value==='novaposhta'||/нова\s*пошта|nova\s*poshta/.test(value)) return 'Нова Пошта';
  if(value==='ukrposhta'||/укрпошт/.test(value)) return 'Укрпошта';
  if(value==='meest'||/міст|meest/.test(value)) return 'Meest';
  if(value==='rozetka'||/rozetka|розетка/.test(value)) return 'Rozetka Delivery';
  const byId={9:'Нова Пошта',16:'Укрпошта',17:'Meest',18:'Rozetka Delivery',22:'Нова Пошта',26:'Укрпошта'};
  return byId[String(shippingMethod)]||provider||String(shippingMethod||'');
}
