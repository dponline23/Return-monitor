function refreshTracking_(){
  const rows=readReturnRows_()
    .filter(r=>(r.returnTtn||r.ttn)&&isReturnRecord_(r)&&(!r.supplierPickedUp||!r.supplierPickedUpAt||String(r.statusSource||'')==='SalesDrive'))
    .slice(0,100);
  let checked=0,updated=0,skipped=0,errors=0;

  rows.forEach(row=>{
    try{
      const trackingTtn=String(row.returnTtn||row.ttn||'').trim();
      if(!trackingTtn){ skipped++; return; }
      const result=trackShipment_(row.carrier,trackingTtn);
      if(!result||result.skipped){ skipped++; return; }
      result.ttn=trackingTtn;
      result.originalTtn=result.originalTtn||row.originalTtn||row.ttn||'';
      result.returnTtn=result.returnTtn||row.returnTtn||(result.isReturn?trackingTtn:'');
      checked++;
      applyCarrierTracking_(row,result);
      updated++;
    }catch(error){
      errors++;
      console.error('Tracking error',row.returnTtn||row.ttn,error);
    }
  });
  return {ok:errors===0,checked:checked,updated:updated,skipped:skipped,errors:errors};
}

function trackShipment_(carrier,ttn){
  const c=String(carrier||'').toLowerCase();
  if(/нова|novaposhta|nova post/.test(c)) return trackNovaPoshta_(ttn);
  if(/укр|ukrposhta/.test(c)) return trackUkrposhta_(ttn);
  if(/meest|міст/.test(c)) return trackTemplateProvider_('Meest','MEEST_TRACKING_URL_TEMPLATE','MEEST_TRACKING_TOKEN',ttn);
  if(/rozetka|розетка/.test(c)) return {skipped:true,source:'Rozetka',reason:'Rozetka tracking adapter pending'};
  return {skipped:true,source:carrier||'Unknown',reason:'Unknown carrier'};
}

function trackNovaPoshta_(ttn){
  const key=PropertiesService.getScriptProperties().getProperty('NOVA_POSHTA_API_KEY');
  if(!key) return {skipped:true,source:'Нова Пошта',reason:'NOVA_POSHTA_API_KEY not set'};

  const payload={
    apiKey:key,
    modelName:'TrackingDocument',
    calledMethod:'getStatusDocuments',
    methodProperties:{Documents:[{DocumentNumber:String(ttn),Phone:''}]}
  };
  const response=UrlFetchApp.fetch('https://api.novaposhta.ua/v2.0/json/',{
    method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true
  });
  const code=response.getResponseCode();
  const json=JSON.parse(response.getContentText()||'{}');
  if(code<200||code>=300||json.success===false){
    const errors=Array.isArray(json.errors)?json.errors.join('; '):('HTTP '+code);
    throw new Error('Нова Пошта API: '+errors);
  }

  const item=json&&json.data&&json.data[0]?json.data[0]:{};
  const status=compactText_(item.Status||item.StatusDescription||'');
  const statusCode=String(item.StatusCode===undefined||item.StatusCode===null?'':item.StatusCode);
  const queried=String(ttn||'').trim();
  const lightReturnOriginal=String(item.LightReturnNumber||'').trim();
  const explicitReturnText=/повернен|поверта|зворотн|відмов|return/i.test(status+' '+String(item.UndeliveryReasonsSubtypeDescription||''));

  const isEasyReturnLeg=Boolean(lightReturnOriginal&&lightReturnOriginal!==queried);
  const isReturn=isEasyReturnLeg||explicitReturnText;
  const delivered=/^(9|10|11)$/.test(statusCode)||/отриман|вручен|доставлен/i.test(status);
  const picked=isReturn&&delivered;
  const statusDate=firstValue_(item,['ActualDeliveryDate','RecipientDateTime','WarehouseRecipient','DateScan','ScheduledDeliveryDate']);
  const when=dateIso_(statusDate)||'';

  return {
    source:'Нова Пошта',
    authoritative:true,
    statusText:status||(statusCode?'Нова Пошта · код '+statusCode:''),
    statusCode:statusCode,
    isReturn:isReturn,
    returnStartedAt:isReturn?(when||new Date().toISOString()):'',
    arrivedAt:picked?(when||new Date().toISOString()):'',
    pickedUpAt:picked?(when||new Date().toISOString()):'',
    originalTtn:isEasyReturnLeg?lightReturnOriginal:'',
    returnTtn:isEasyReturnLeg?queried:'',
    raw:item
  };
}

function trackUkrposhta_(ttn){
  const p=PropertiesService.getScriptProperties();
  const token=cleanBearer_(
    p.getProperty('UKRPOSHTA_STATUS_BEARER_PROD')||
    p.getProperty('PRODUCTION BEARER StatusTracking')||
    p.getProperty('UKRPOSHTA_TRACKING_TOKEN')||''
  );
  if(!token) return {skipped:true,source:'Укрпошта',reason:'PRODUCTION BEARER StatusTracking not set'};

  const url='https://www.ukrposhta.ua/status-tracking/0.0.1/statuses?barcode='+encodeURIComponent(String(ttn));
  const response=UrlFetchApp.fetch(url,{
    method:'get',
    muteHttpExceptions:true,
    headers:{Accept:'application/json',Authorization:'Bearer '+token}
  });
  const httpCode=response.getResponseCode();
  const text=response.getContentText('UTF-8');
  let json=null;
  try{json=JSON.parse(text||'[]');}catch(_){json=null;}
  if(httpCode===401||httpCode===403) throw new Error('Укрпошта StatusTracking: перевірте PRODUCTION BEARER StatusTracking.');
  if(httpCode<200||httpCode>=300) throw new Error('Укрпошта StatusTracking HTTP '+httpCode+': '+String(text||'').slice(0,180));

  let history=[];
  if(Array.isArray(json)) history=json;
  else if(json&&Array.isArray(json.data)) history=json.data;
  else if(json&&json.barcode) history=[json];
  if(!history.length) return {skipped:true,source:'Укрпошта',reason:'Shipment not found'};

  history=history.slice().sort((a,b)=>{
    const ad=parseDate_(a&&a.date),bd=parseDate_(b&&b.date);
    if(ad&&bd&&ad.getTime()!==bd.getTime()) return ad-bd;
    return Number(a&&a.step||0)-Number(b&&b.step||0);
  });

  const returnIndex=history.findIndex(item=>String(item&&item.event||'').replace(/\s/g,'')==='31200');
  const returnEvent=returnIndex>=0?history[returnIndex]:null;
  const returnPhase=returnIndex>=0?history.slice(returnIndex+1):[];
  const returnedEvent=history.slice().reverse().find(item=>{
    const event=String(item&&item.event||'').replace(/\s/g,'');
    const reason=String(item&&item.eventReason_id||'').replace(/\s/g,'');
    return (event==='41000'&&reason==='10')||event==='35500';
  });
  const arrivedReturnEvent=returnPhase.slice().reverse().find(item=>{
    const event=String(item&&item.event||'').replace(/\s/g,'');
    return event==='21700'||event==='21400';
  });

  const latest=history[history.length-1]||{};
  const latestEvent=String(latest.event||'').replace(/\s/g,'');
  const latestReason=String(latest.eventReason_id||'').replace(/\s/g,'');
  const effectiveCode=(latestEvent==='41000'&&latestReason==='10')?'41010':latestEvent;
  const statusText=[compactText_(latest.eventName||''),compactText_(latest.eventReason||'')]
    .filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' · ');
  const returnedAt=returnedEvent?dateIso_(returnedEvent.date):'';
  const arrivedAt=returnedAt||(arrivedReturnEvent?dateIso_(arrivedReturnEvent.date):'');

  return {
    source:'Укрпошта',
    authoritative:true,
    statusText:statusText||(effectiveCode?'Укрпошта · код '+effectiveCode:''),
    statusCode:effectiveCode,
    isReturn:Boolean(returnEvent||returnedEvent),
    returnStartedAt:returnEvent?dateIso_(returnEvent.date):'',
    arrivedAt:arrivedAt,
    pickedUpAt:returnedAt,
    originalTtn:String(ttn||''),
    returnTtn:Boolean(returnEvent||returnedEvent)?String(ttn||''):'',
    raw:{latest:latest,history:history}
  };
}

function cleanBearer_(value){
  return String(value||'').trim().replace(/^Bearer\s+/i,'').trim();
}

function trackTemplateProvider_(name,urlProperty,tokenProperty,ttn){
  const p=PropertiesService.getScriptProperties();
  const template=p.getProperty(urlProperty);
  if(!template) return {skipped:true,source:name,reason:urlProperty+' not set'};
  const token=p.getProperty(tokenProperty)||'';
  const url=template.replace(/\{\{TOKEN\}\}/g,encodeURIComponent(token)).replace(/\{\{TTN\}\}/g,encodeURIComponent(String(ttn)));
  const response=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,headers:{Accept:'application/json'}});
  if(response.getResponseCode()<200||response.getResponseCode()>=300) throw new Error(name+' HTTP '+response.getResponseCode());
  const json=JSON.parse(response.getContentText()||'{}');
  const item=Array.isArray(json)?(json[0]||{}):(json.data||json.result||json.item||json);
  const status=compactText_(firstValue_(item,['status','statusText','statusDescription','description','state','event']));
  const code=compactText_(firstValue_(item,['statusCode','code','stateCode']));
  return trackingResult_(name,status,code,item);
}

function trackingResult_(source,status,statusCode,raw){
  const isReturn=looksLikeReturn_(status);
  const arrived=isReturn&&looksLikeReturnArrived_(status);
  const picked=arrived&&/відправник|return\s+to\s+sender/i.test(String(status||''));
  const now=new Date().toISOString();
  return {source:source,statusText:status,statusCode:statusCode,isReturn:isReturn,returnStartedAt:isReturn?now:'',arrivedAt:arrived?now:'',pickedUpAt:picked?now:'',raw:raw||{}};
}

function applyCarrierTracking_(row,tracking){
  const sh=returnSheetFast_();
  const raw=sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).getValues()[0];
  const current=rowToObject_(raw,row.rowNumber);

  const authoritative=tracking.authoritative===true;
  const isReturn=Boolean(tracking.isReturn);
  const arrivedAt=tracking.arrivedAt||'';
  const pickedUpAt=tracking.pickedUpAt||'';
  const originalTtn=tracking.originalTtn||current.originalTtn||current.ttn||'';
  const returnTtn=tracking.returnTtn||current.returnTtn||(isReturn?(tracking.ttn||current.ttn||''):'');

  const merged=Object.assign({},current,{
    deliveryStatus:tracking.statusText||current.deliveryStatus,
    deliveryCode:tracking.statusCode||current.deliveryCode,
    statusSource:tracking.source||current.statusSource,
    originalTtn:originalTtn,
    returnTtn:returnTtn,
    updatedAt:new Date().toISOString()
  });

  if(isReturn){
    if(!merged.returnNumber) merged.returnNumber=generateReturnNumber_();
    merged.returnStartedAt=tracking.returnStartedAt||merged.returnStartedAt||'';

    if(pickedUpAt){
      merged.arrivedAt=arrivedAt||pickedUpAt;
      merged.returnDate=merged.returnDate||arrivedAt||pickedUpAt;
      merged.supplierPickedUp=true;
      merged.supplierPickedUpAt=pickedUpAt;
      merged.supplierPickupStatus='picked_up';
      merged.returnStatus='completed';
    }else if(arrivedAt){
      merged.arrivedAt=arrivedAt;
      merged.returnStatus='arrived';
      merged.supplierPickupStatus=current.supplierPickedUp?'picked_up':'waiting_pickup';
      merged.returnDate=merged.returnDate||arrivedAt;
    }else if(!current.supplierPickedUp){
      merged.arrivedAt='';
      merged.returnStatus='in_transit';
      merged.supplierPickupStatus='not_handed_over';
      if(authoritative&&current.source==='salesdrive'&&current.statusSource==='SalesDrive') merged.returnDate=merged.returnStartedAt||'';
    }
  }else if(authoritative&&merged.returnNumber&&!current.supplierPickedUp){
    merged.arrivedAt='';
    merged.returnStatus='expected';
    merged.supplierPickupStatus='not_handed_over';
    if(current.source==='salesdrive') merged.returnDate='';
  }

  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalizeReturnState_(merged,false))]);
  return merged;
}
