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
  const url='https://'+state.subdomain+'.salesdrive.me/api/order/list/?page=1&limit=1';
  const payload=salesDriveRequestJson_(url,apiKey);
  const first=Array.isArray(payload.data)&&payload.data.length?payload.data[0]:null;
  return {
    ok:true,
    sampleOrderId:first?String(first.id||''):'',
    sampleExternalId:first?String(first.externalId||''):'',
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
  let received=0,page=1;

  while(page<=SALESDRIVE_CONFIG.maxPages){
    const url=salesDriveOrdersUrl_(state.subdomain,page,fromDate,toDate);
    const payload=salesDriveRequestJson_(url,apiKey);
    const rows=Array.isArray(payload&&payload.data)?payload.data:[];
    received+=rows.length;
    rows.forEach(raw=>normalizeSalesDriveOrders_(raw).forEach(item=>normalized.push(item)));
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
  p.setProperty(SALESDRIVE_CONFIG.lastSyncProperty,now.toISOString());
  return {
    ok:true,
    received:received,
    usable:unique.length,
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

function normalizeSalesDriveOrders_(raw){
  raw=raw||{};
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

  return usableDeliveries.map(delivery=>{
    const provider=String(delivery.provider||'').trim();
    const carrier=salesDriveCarrierName_(provider,raw.shipping_method);
    const code=delivery.statusCode===undefined||delivery.statusCode===null?'':String(delivery.statusCode);
    const status=compactText_(firstValue_(delivery,['statusText','status','statusDescription','deliveryStatus','state'])) || (code?'SalesDrive · код '+code:'');
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
      deliveryStatus:status,
      deliveryCode:code,
      isReturn:looksLikeReturn_(status),
      returnStartedAt:'',
      arrivedAt:delivery.deliveryDateAndTime||'',
      statusSource:'SalesDrive',
      promId:isProm?externalId:'',
      note:delivery.parentTrackingNumber?('Батьківська ТТН: '+delivery.parentTrackingNumber):''
    };
  });
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
