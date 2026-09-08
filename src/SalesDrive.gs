const SALESDRIVE_CONFIG = Object.freeze({
  subdomainProperty: 'SALESDRIVE_SUBDOMAIN',
  apiKeyProperty: 'SALESDRIVE_ORDER_API_KEY',
  lastSyncProperty: 'SALESDRIVE_LAST_SYNC',
  defaultSubdomain: 'techwolves',
  pageSize: 100,
  maxPages: 40,
  throttleMs: 6200,
  initialLookbackDays: 60,
  regularLookbackDays: 21
});

function getSalesDriveState_(){
  const p=PropertiesService.getScriptProperties();
  return {
    subdomain:String(p.getProperty(SALESDRIVE_CONFIG.subdomainProperty)||SALESDRIVE_CONFIG.defaultSubdomain),
    configured:Boolean(p.getProperty(SALESDRIVE_CONFIG.apiKeyProperty)),
    lastSync:p.getProperty(SALESDRIVE_CONFIG.lastSyncProperty)||''
  };
}

function apiSalesDriveSettings(){
  return getSalesDriveState_();
}

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
  const lookbackDays=lastSync?SALESDRIVE_CONFIG.regularLookbackDays:SALESDRIVE_CONFIG.initialLookbackDays;
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

  const saved=upsertSalesDriveOrders_(unique);
  const detectedReturns=unique.filter(item=>item.isReturn).length;
  p.setProperty(SALESDRIVE_CONFIG.lastSyncProperty,now.toISOString());
  return {
    ok:true,
    received:received,
    usable:unique.length,
    detectedReturns:detectedReturns,
    statusCount:Object.keys(statusMap).length,
    inserted:saved.inserted,
    updated:saved.updated,
    pages:page,
    from:fromDate.toISOString(),
    to:toDate.toISOString()
  };
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
  try{
    payload=salesDriveRequestJson_('https://'+subdomain+'.salesdrive.me/api/statuses/',apiKey);
  }catch(_){
    return {};
  }

  const map={};
  const visited=new Set();
  const collect=value=>{
    if(value===null||value===undefined) return;
    if(Array.isArray(value)){
      value.forEach(collect);
      return;
    }
    if(typeof value!=='object') return;
    if(visited.has(value)) return;
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
  const deliveries=Array.isArray(raw.ord_delivery_data)?raw.ord_delivery_data:[];
  const usableDeliveries=deliveries.filter(item=>item&&item.trackingNumber);
  if(!usableDeliveries.length) return [];

  const contact=raw.primaryContact||((Array.isArray(raw.contacts)&&raw.contacts[0])||{});
  const customer=[contact.lName,contact.fName,contact.mName].map(v=>String(v||'').trim()).filter(Boolean).join(' ');
  const phone=Array.isArray(contact.phone)?contact.phone.join(', '):String(contact.phone||'');
  const products=Array.isArray(raw.products)?raw.products:[];
  const productText=products.map(item=>{
    const name=String(item.nameTranslate||item.text||item.documentName||'').trim();
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

  return usableDeliveries.map(delivery=>{
    const provider=String(delivery.provider||'').trim();
    const carrier=salesDriveCarrierName_(provider,raw.shipping_method);
    const code=delivery.statusCode===undefined||delivery.statusCode===null?'':String(delivery.statusCode);
    const deliveryStatus=compactText_(firstValue_(delivery,['statusText','status','statusDescription','deliveryStatus','state'])) || (code?'SalesDrive · код '+code:'');
    const combinedStatus=[orderStatusText,deliveryStatus].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
    const isReturn=orderStatusIsReturn||looksLikeReturn_(deliveryStatus);
    const noteParts=[];
    if(orderStatusText) noteParts.push('Статус SalesDrive: '+orderStatusText+(orderStatusId?' [ID '+orderStatusId+']':''));
    else if(orderStatusId) noteParts.push('Статус SalesDrive ID: '+orderStatusId);
    if(delivery.parentTrackingNumber) noteParts.push('Батьківська ТТН: '+delivery.parentTrackingNumber);
    return {
      salesDriveId:String(raw.id||raw.orderId||raw.order_id||''),
      orderNumber:externalId||String(raw.id||''),
      orderDate:raw.orderTime||raw.createTime||raw.createdAt||'',
      shop:campaign||String(raw.sajt||''),
      customer:customer,
      phone:phone,
      product:productText,
      sku:skuText,
      amount:Number(raw.paymentAmount||raw.total||raw.amount||0),
      carrier:carrier,
      ttn:String(delivery.trackingNumber||''),
      deliveryStatus:combinedStatus,
      deliveryCode:code,
      isReturn:isReturn,
      returnStartedAt:isReturn?(statusChangedAt||''):'',
      arrivedAt:delivery.deliveryDateAndTime||'',
      statusSource:'SalesDrive',
      promId:isProm?externalId:'',
      note:noteParts.join(' · ')
    };
  });
}

function salesDriveOrderStatusText_(raw,statusMap){
  raw=raw||{};
  statusMap=statusMap||{};
  const statusId=String(firstValue_(raw,['statusId','status_id','status.id','orderStatusId','currentStatusId'])||'').trim();
  const resolved=statusId&&statusMap[statusId]?String(statusMap[statusId]).trim():'';
  const values=[
    resolved,
    raw.statusName,
    raw.statusText,
    raw.orderStatusName,
    raw.currentStatusName,
    raw.stateName,
    compactText_(raw.status),
    compactText_(raw.orderStatus),
    compactText_(raw.currentStatus),
    compactText_(raw.statusData),
    compactText_(raw.status_data),
    compactText_(raw.state)
  ].map(value=>String(value||'').trim()).filter(Boolean);
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
