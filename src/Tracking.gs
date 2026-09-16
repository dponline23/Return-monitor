function refreshTracking_(){
  const novaDiscovery=typeof discoverNovaPoshtaReturns_==='function'?discoverNovaPoshtaReturns_():{skipped:true};
  const rows=readReturnRows_()
    .filter(r=>(r.returnTtn||r.ttn)&&isReturnRecord_(r)&&!r.supplierPickedUp)
    .slice(0,100);
  let checked=0,updated=0,skipped=0,errors=0;

  rows.forEach(row=>{
    try{
      const resolved=resolveReturnTrackingLeg_(row);
      const rawTrackingTtn=String(resolved.ttn||'').trim();
      if(!rawTrackingTtn){ skipped++; return; }
      const carrier=resolved.carrier||inferCarrierFromTrackingNumber_(rawTrackingTtn,row.carrier);
      const trackingTtn=canonicalTrackingNumber_(carrier,rawTrackingTtn);
      const result=resolved.result||trackShipment_(carrier,trackingTtn,row);
      if(!result||result.skipped){ skipped++; return; }
      result.ttn=trackingTtn;
      result.originalTtn=canonicalTrackingNumber_(inferCarrierFromTrackingNumber_(row.ttn||row.originalTtn,row.carrier),result.originalTtn||row.ttn||row.originalTtn||'');
      result.returnTtn=canonicalTrackingNumber_(carrier,result.returnTtn||trackingTtn||row.returnTtn||'');
      checked++;
      applyCarrierTracking_(row,result);
      updated++;
    }catch(error){
      errors++;
      console.error('Tracking error',row.returnTtn||row.ttn,error);
    }
  });
  return {ok:errors===0,checked:checked,updated:updated,skipped:skipped,errors:errors,novaDiscovery:novaDiscovery};
}

function resolveReturnTrackingLeg_(row){
  const fallbackTtn=String(row&&row.returnTtn||row&&row.ttn||'').trim();
  const fallbackCarrier=inferCarrierFromTrackingNumber_(fallbackTtn,row&&row.carrier);

  const outbound=canonicalTrackingNumber_('Нова Пошта',row&&row.ttn||'');
  const storedReturn=canonicalTrackingNumber_('Нова Пошта',row&&row.returnTtn||'');
  const storedOriginal=canonicalTrackingNumber_('Нова Пошта',row&&row.originalTtn||'');

  // Legacy repair: older Easy Return discovery could swap the pair so that
  // returnTtn pointed back to the already-delivered SalesDrive EW. The document
  // tracker keeps OUTBOUND and RETURN as separate tracks; do the same here.
  if(/^\d{14}$/.test(outbound)&&storedReturn===outbound&&/^\d{14}$/.test(storedOriginal)&&storedOriginal!==outbound){
    const probe=trackNovaPoshta_(storedOriginal,row);
    const lightPrimary=canonicalTrackingNumber_('Нова Пошта',probe&&probe.raw?probe.raw.LightReturnNumber:'');
    if(lightPrimary===outbound){
      probe.isReturn=true;
      probe.originalTtn=outbound;
      probe.returnTtn=storedOriginal;
      return {ttn:storedOriginal,carrier:'Нова Пошта',result:probe,repaired:true};
    }
  }

  return {ttn:fallbackTtn,carrier:fallbackCarrier,result:null,repaired:false};
}

function inferCarrierFromTrackingNumber_(ttn,fallback){
  const n=normalizeTrackingNumber_(ttn).replace(/[^A-Z0-9]/g,'');
  if(/^\d{14}$/.test(n)) return 'Нова Пошта';
  if(/^0(?:42|50)\d{10}$/.test(n)||/^(?:42|50)\d{10}$/.test(n)) return 'Укрпошта';
  if(/^PRM-/i.test(String(ttn||'').trim())||/^201\d+/i.test(n)) return 'Rozetka Delivery';
  return String(fallback||'').trim();
}

function canonicalTrackingNumber_(carrier,ttn){
  let n=normalizeTrackingNumber_(ttn);
  const c=normalizeCarrierKey_(carrier);
  if(c==='ukr'&&/^(?:42|50)\d{10}$/.test(n)) n='0'+n;
  return n;
}

function trackShipment_(carrier,ttn,context){
  const inferred=inferCarrierFromTrackingNumber_(ttn,carrier);
  const normalized=canonicalTrackingNumber_(inferred,ttn);
  const c=String(inferred||'').toLowerCase();
  if(/нова|novaposhta|nova post/.test(c)) return trackNovaPoshta_(normalized,context);
  if(/укр|ukrposhta/.test(c)) return trackUkrposhta_(normalized,context);
  if(/meest|міст/.test(c)) return trackTemplateProvider_('Meest','MEEST_TRACKING_URL_TEMPLATE','MEEST_TRACKING_TOKEN',normalized);
  if(/rozetka|розетка/.test(c)) return trackRozetkaDelivery_(normalized,context);
  return {skipped:true,source:inferred||'Unknown',reason:'Unknown carrier'};
}

function trackNovaPoshta_(ttn,context){
  const key=PropertiesService.getScriptProperties().getProperty('NOVA_POSHTA_API_KEY');
  if(!key) return {skipped:true,source:'Нова Пошта',reason:'NOVA_POSHTA_API_KEY not set'};

  const queried=canonicalTrackingNumber_('Нова Пошта',ttn);
  const payload={
    apiKey:key,
    modelName:'TrackingDocument',
    calledMethod:'getStatusDocuments',
    methodProperties:{Documents:[{DocumentNumber:queried,Phone:''}]}
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
  const lightReturnOriginal=canonicalTrackingNumber_('Нова Пошта',String(item.LightReturnNumber||'').trim());
  const explicitReturnText=/повернен|поверта|зворотн|відмов|return/i.test(status+' '+String(item.UndeliveryReasonsSubtypeDescription||''));
  const knownReturn=Boolean(context&&context.returnNumber&&canonicalTrackingNumber_('Нова Пошта',context.returnTtn||'')===queried);

  const isEasyReturnLeg=Boolean(lightReturnOriginal&&lightReturnOriginal!==queried);
  const isReturn=knownReturn||isEasyReturnLeg||explicitReturnText;
  const delivered=/^(9|10|11)$/.test(statusCode)||/отриман|вручен|доставлен/i.test(status);
  const readyAtBranch=/прибув.{0,35}(відділен|пункт|поштомат)|готов.{0,25}(отриман|видач)|у\s+відділен/i.test(status);
  const arrived=isReturn&&(readyAtBranch||delivered);
  const statusDate=firstValue_(item,['ActualDeliveryDate','RecipientDateTime','WarehouseRecipient','DateScan','ScheduledDeliveryDate']);
  const when=dateIso_(statusDate)||'';

  return {
    source:'Нова Пошта',
    authoritative:true,
    statusText:status||(statusCode?'Нова Пошта · код '+statusCode:''),
    statusCode:statusCode,
    isReturn:isReturn,
    returnStartedAt:isReturn?(context&&context.returnStartedAt?context.returnStartedAt:(when||new Date().toISOString())):'',
    arrivedAt:arrived?(when||new Date().toISOString()):'',
    carrierDelivered:Boolean(delivered),
    originalTtn:isEasyReturnLeg?lightReturnOriginal:(context&&context.originalTtn?canonicalTrackingNumber_(inferCarrierFromTrackingNumber_(context.originalTtn,context.carrier),context.originalTtn):''),
    returnTtn:isReturn?queried:'',
    raw:item
  };
}

function trackUkrposhta_(ttn,context){
  const p=PropertiesService.getScriptProperties();
  const token=cleanBearer_(
    p.getProperty('UKRPOSHTA_STATUS_BEARER_PROD')||
    p.getProperty('PRODUCTION BEARER StatusTracking')||
    p.getProperty('UKRPOSHTA_TRACKING_TOKEN')||''
  );
  if(!token) return {skipped:true,source:'Укрпошта',reason:'PRODUCTION BEARER StatusTracking not set'};

  const queried=canonicalTrackingNumber_('Укрпошта',ttn);
  const url='https://www.ukrposhta.ua/status-tracking/0.0.1/statuses?barcode='+encodeURIComponent(queried);
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
  const knownReturn=Boolean(context&&context.returnNumber&&canonicalTrackingNumber_('Укрпошта',context.returnTtn||context.ttn||'')===queried);
  const isReturn=Boolean(returnEvent||returnedEvent||knownReturn);

  return {
    source:'Укрпошта',
    authoritative:true,
    statusText:statusText||(effectiveCode?'Укрпошта · код '+effectiveCode:''),
    statusCode:effectiveCode,
    isReturn:isReturn,
    returnStartedAt:returnEvent?dateIso_(returnEvent.date):(knownReturn?(context.returnStartedAt||''):''),
    arrivedAt:arrivedAt,
    carrierDelivered:Boolean(returnedEvent),
    originalTtn:canonicalTrackingNumber_('Укрпошта',context&&context.originalTtn?context.originalTtn:queried),
    returnTtn:isReturn?queried:'',
    raw:{latest:latest,history:history}
  };
}

function trackRozetkaDelivery_(ttn,context){
  const queried=String(ttn||'').trim();
  if(!queried) return {skipped:true,source:'Rozetka Delivery',reason:'Tracking number missing'};

  const url='https://rozetka.delivery/tracking/parcel?parcel_id='+encodeURIComponent(queried);
  const response=UrlFetchApp.fetch(url,{
    method:'get',
    muteHttpExceptions:true,
    followRedirects:true,
    headers:{
      Accept:'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language':'uk-UA,uk;q=0.9',
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36'
    }
  });
  const httpCode=response.getResponseCode();
  const html=response.getContentText('UTF-8');
  if(httpCode<200||httpCode>=300){
    throw new Error('Rozetka Delivery HTTP '+httpCode+': '+String(html||'').replace(/\s+/g,' ').slice(0,180));
  }

  const text=rozetkaTrackingText_(html);
  if(!text) return {skipped:true,source:'Rozetka Delivery',reason:'Empty tracking page'};

  const knownReturn=Boolean(context&&context.returnNumber);
  const returnedAtEvent=rozetkaTrackingEventDate_(text,['Повернуто']);
  const waitingSenderAt=rozetkaTrackingEventDate_(text,['Очікує відправника']);
  const returnBranchAt=rozetkaTrackingEventDate_(text,['У відділенні повернення']);
  const returningAt=rozetkaTrackingEventDate_(text,['Повертається']);
  const returnCreatedAt=rozetkaTrackingEventDate_(text,['Оформлено повернення']);
  const issueBlockedAt=rozetkaTrackingEventDate_(text,['Заборона видачі']);
  const refusedAt=rozetkaTrackingEventDate_(text,['Відмова одержувача','Відмова від одержання']);

  // Do not classify by a bare translated label: the SPA can contain its whole
  // dictionary in the HTML. A real event must have its timestamp next to it.
  const returned=Boolean(returnedAtEvent);
  const waitingSender=Boolean(waitingSenderAt);
  const returnBranch=Boolean(returnBranchAt);
  const returning=Boolean(returningAt);
  const returnCreated=Boolean(returnCreatedAt);
  const refused=Boolean(refusedAt);
  const issueBlocked=Boolean(issueBlockedAt);
  const hasReturn=returned||waitingSender||returnBranch||returning||returnCreated||refused||issueBlocked;
  const isReturn=hasReturn||knownReturn;

  let statusText='Rozetka Delivery';
  let statusCode='OTHER';
  if(returned){ statusText='Повернуто'; statusCode='RETURNED'; }
  else if(waitingSender){ statusText='Очікує відправника'; statusCode='RETURN_READY'; }
  else if(returnBranch){ statusText='У відділенні повернення'; statusCode='RETURN_BRANCH'; }
  else if(returning){ statusText='Повертається'; statusCode='RETURNING'; }
  else if(returnCreated){ statusText='Оформлено повернення'; statusCode='RETURN_CREATED'; }
  else if(issueBlocked){ statusText='Заборона видачі'; statusCode='ISSUE_BLOCKED'; }
  else if(refused){ statusText='Відмова одержувача'; statusCode='REFUSED'; }
  else if(rozetkaTrackingEventDate_(text,['У відділенні доставки'])){ statusText='У відділенні доставки'; statusCode='DELIVERY_BRANCH'; }
  else if(rozetkaTrackingEventDate_(text,['В дорозі'])){ statusText='В дорозі'; statusCode='TRANSIT'; }
  else if(rozetkaTrackingEventDate_(text,['Прийнято на відправку'])){ statusText='Прийнято на відправку'; statusCode='ACCEPTED'; }
  else if(rozetkaTrackingEventDate_(text,['Заплановано до відправки'])){ statusText='Заплановано до відправки'; statusCode='PLANNED'; }

  const arrived=isReturn&&(returned||waitingSender||returnBranch);
  const returnStartedAt=returningAt||returnCreatedAt||issueBlockedAt||refusedAt||
    (isReturn&&context&&context.returnStartedAt?context.returnStartedAt:'');
  const arrivedAt=arrived?(returnedAtEvent||waitingSenderAt||returnBranchAt||new Date().toISOString()):'';

  return {
    source:'Rozetka Delivery',
    authoritative:true,
    statusText:statusText,
    statusCode:statusCode,
    isReturn:isReturn,
    returnStartedAt:isReturn?(returnStartedAt||new Date().toISOString()):'',
    arrivedAt:arrivedAt,
    carrierDelivered:Boolean(returned),
    originalTtn:String(context&&context.originalTtn||context&&context.ttn||queried).trim(),
    returnTtn:isReturn?queried:'',
    raw:{url:url,text:text.slice(0,6000)}
  };
}

function rozetkaTrackingText_(html){
  let text=String(html||'');
  text=text.replace(/\\u([0-9a-fA-F]{4})/g,function(_,hex){
    return String.fromCharCode(parseInt(hex,16));
  });
  text=text.replace(/\\n|\\r|\\t/g,' ');
  text=text
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&quot;|&#34;/gi,'"')
    .replace(/&apos;|&#39;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&amp;/gi,'&');
  text=text.replace(/<[^>]+>/g,' ');
  return text.replace(/\s+/g,' ').trim();
}

function rozetkaTrackingEventDate_(text,labels){
  const source=String(text||'');
  for(let i=0;i<(labels||[]).length;i++){
    const label=String(labels[i]||'');
    if(!label) continue;
    const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const match=source.match(new RegExp(escaped+'[\\s\\S]{0,600}?(\\d{2}\\.\\d{2}\\.\\d{4}\\s+\\d{2}:\\d{2})','i'));
    if(match&&match[1]){
      const iso=dateIso_(match[1]);
      if(iso) return iso;
    }
  }
  return '';
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
  const now=new Date().toISOString();
  return {source:source,statusText:status,statusCode:statusCode,isReturn:isReturn,returnStartedAt:isReturn?now:'',arrivedAt:arrived?now:'',carrierDelivered:arrived,raw:raw||{}};
}

function applyCarrierTracking_(row,tracking){
  const sh=returnSheetFast_();
  const raw=sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).getValues()[0];
  const current=rowToObject_(raw,row.rowNumber);

  const authoritative=tracking.authoritative===true;
  const isReturn=Boolean(tracking.isReturn);
  const arrivedAt=tracking.arrivedAt||'';
  const originalTtn=tracking.originalTtn||current.originalTtn||current.ttn||'';
  const returnTtn=tracking.returnTtn||current.returnTtn||(isReturn?(tracking.ttn||current.ttn||''):'');
  const detectedCarrier=inferCarrierFromTrackingNumber_(returnTtn||tracking.ttn||current.ttn,tracking.source||current.carrier);

  const merged=Object.assign({},current,{
    carrier:detectedCarrier||current.carrier,
    deliveryStatus:tracking.statusText||current.deliveryStatus,
    deliveryCode:tracking.statusCode||current.deliveryCode,
    statusSource:tracking.source||current.statusSource,
    originalTtn:canonicalTrackingNumber_(inferCarrierFromTrackingNumber_(originalTtn,current.carrier),originalTtn),
    returnTtn:canonicalTrackingNumber_(detectedCarrier,returnTtn),
    updatedAt:new Date().toISOString()
  });

  if(isReturn){
    if(!merged.returnNumber) merged.returnNumber=generateReturnNumber_();
    merged.returnStartedAt=tracking.returnStartedAt||merged.returnStartedAt||'';

    if(arrivedAt){
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

  // Ніколи не змінюємо supplierPickedUp/supplierPickedUpAt із API перевізника.
  // Це окреме ручне підтвердження, що постачальник фізично забрав товар.
  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalizeReturnState_(merged,false))]);
  return merged;
}
