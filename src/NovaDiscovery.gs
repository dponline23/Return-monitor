function discoverNovaPoshtaReturns_(){
  const imageMirror=mirrorSalesDriveReturnImages_();
  const key=PropertiesService.getScriptProperties().getProperty('NOVA_POSHTA_API_KEY');
  if(!key) return {ok:false,skipped:true,reason:'NOVA_POSHTA_API_KEY not set',imagesMirrored:imageMirror.updated||0};

  const now=Date.now();
  const maxAgeMs=21*86400000;
  const rows=readReturnRows_().filter(row=>{
    if(String(row.source||'').toLowerCase()!=='salesdrive') return false;
    const ttn=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
    if(!/^\d{14}$/.test(ttn)) return false;
    const date=parseDate_(row.orderDate||row.createdAt||row.updatedAt);
    return !date||now-date.getTime()<=maxAgeMs;
  }).sort((a,b)=>{
    const ad=parseDate_(a.orderDate||a.createdAt),bd=parseDate_(b.orderDate||b.createdAt);
    return (bd?bd.getTime():0)-(ad?ad.getTime():0);
  }).slice(0,180);

  const parentNumbers=[];
  const seenParents=new Set();
  rows.forEach(row=>{
    const n=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
    if(!n||seenParents.has(n)) return;
    seenParents.add(n);parentNumbers.push(n);
  });
  const parentItems=parentNumbers.length?novaPoshtaStatusBatch_(key,parentNumbers):[];
  const parentByNumber=novaStatusMap_(parentItems);

  const childNumbers=[];
  const seenChildren=new Set();
  parentItems.forEach(item=>{
    const parent=novaStatusNumber_(item);
    const child=normalizeTrackingNumber_(firstValue_(item,['LastCreatedOnTheBasisNumber','lastCreatedOnTheBasisNumber'])||'');
    if(!child||child===parent||seenChildren.has(child)) return;
    seenChildren.add(child);childNumbers.push(child);
  });
  const childItems=novaPoshtaStatusBatch_(key,childNumbers);
  const childByNumber=novaStatusMap_(childItems);

  let returnsFound=0,updated=0,redirections=0,ambiguous=0;
  rows.forEach(row=>{
    const parentNumber=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
    const parent=parentByNumber.get(parentNumber);
    if(!parent) return;

    const childNumber=normalizeTrackingNumber_(firstValue_(parent,['LastCreatedOnTheBasisNumber','lastCreatedOnTheBasisNumber'])||'');
    const child=childNumber?childByNumber.get(childNumber):null;
    const relation=novaReturnRelation_(parent,child,parentNumber,childNumber);
    const direct=novaStatusIsExplicitReturn_(parent);

    if(relation==='redirection'){
      redirections++;
      return;
    }

    if(relation==='return'&&child){
      const result=novaTrackingResultFromItem_(child,childNumber,row);
      result.isReturn=true;
      result.originalTtn=parentNumber;
      result.returnTtn=childNumber;
      result.distinctReturnLeg=true;
      if(!result.returnStartedAt){
        result.returnStartedAt=dateIso_(firstValue_(parent,['LastCreatedOnTheBasisDateTime','lastCreatedOnTheBasisDateTime']))||row.returnStartedAt||new Date().toISOString();
      }
      novaApplyDiscoveredReturn_(row,result);
      returnsFound++;updated++;
      return;
    }

    if(direct){
      const result=novaTrackingResultFromItem_(parent,parentNumber,row);
      result.isReturn=true;
      result.originalTtn=parentNumber;
      result.returnTtn=parentNumber;
      novaApplyDiscoveredReturn_(row,result);
      returnsFound++;updated++;
      return;
    }

    if(childNumber&&relation==='') ambiguous++;
  });

  const easyReturn=novaDiscoverEasyReturns_(key,rows);
  returnsFound+=Number(easyReturn&&easyReturn.returnsFound||0);
  updated+=Number(easyReturn&&easyReturn.updated||0);

  return {ok:true,checked:parentNumbers.length,children:childNumbers.length,returnsFound:returnsFound,updated:updated,redirections:redirections,ambiguous:ambiguous,easyReturn:easyReturn,imagesMirrored:imageMirror.updated||0,imageErrors:imageMirror.errors||0};
}

function novaDiscoverEasyReturns_(apiKey,rows){
  try{
    const parentRows=new Map();
    (rows||[]).forEach(row=>{
      const parent=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
      if(parent) parentRows.set(parent,row);
    });

    const incomingNumbers=novaPoshtaIncomingDocumentNumbers_(apiKey,21);
    if(!incomingNumbers.length) return {ok:true,checkedIncoming:0,returnsFound:0,updated:0};

    const statusItems=novaPoshtaStatusBatch_(apiKey,incomingNumbers);
    let returnsFound=0,updated=0,salesDriveLookups=0,salesDriveMatches=0;
    statusItems.forEach(item=>{
      const returnTtn=novaStatusNumber_(item);
      const originalTtn=normalizeTrackingNumber_(firstValue_(item,['LightReturnNumber','lightReturnNumber'])||'');
      if(!returnTtn||!originalTtn||returnTtn===originalTtn) return;

      let row=parentRows.get(originalTtn)||null;
      if(!row){
        salesDriveLookups++;
        row=novaFindSalesDriveShipmentByTtn_(originalTtn);
        if(row){
          parentRows.set(originalTtn,row);
          salesDriveMatches++;
        }
      }
      if(!row) return;

      const result=novaTrackingResultFromItem_(item,returnTtn,row);
      result.isReturn=true;
      result.originalTtn=originalTtn;
      result.returnTtn=returnTtn;
      result.distinctReturnLeg=true;
      if(!result.returnStartedAt){
        result.returnStartedAt=dateIso_(firstValue_(item,['DateCreated','DateScan','ScheduledDeliveryDate']))||row.returnStartedAt||new Date().toISOString();
      }

      if(!row.rowNumber){
        row=novaEnsureStoredSalesDriveReturn_(row,result);
        if(!row) return;
      }

      novaApplyDiscoveredReturn_(row,result);
      returnsFound++;updated++;
    });

    return {ok:true,checkedIncoming:incomingNumbers.length,statusesChecked:statusItems.length,returnsFound:returnsFound,updated:updated,salesDriveLookups:salesDriveLookups,salesDriveMatches:salesDriveMatches};
  }catch(error){
    console.error('Nova Poshta Easy Return discovery error',error);
    return {ok:false,checkedIncoming:0,returnsFound:0,updated:0,error:error&&error.message?error.message:String(error)};
  }
}

function novaFindSalesDriveShipmentByTtn_(ttn){
  const target=normalizeTrackingNumber_(ttn);
  if(!target) return null;
  try{
    const state=getSalesDriveState_();
    const p=PropertiesService.getScriptProperties();
    const apiKey=p.getProperty(SALESDRIVE_CONFIG.apiKeyProperty)||'';
    if(!apiKey) return null;

    const now=new Date();
    const fromDate=new Date(now.getTime()-Math.max(21,SALESDRIVE_CONFIG.regularLookbackDays||21)*86400000);
    const toDate=new Date(now.getTime()+86400000);
    const statusMap=salesDriveStatusMap_(state.subdomain,apiKey);

    for(let page=1;page<=SALESDRIVE_CONFIG.maxPages;page++){
      const payload=salesDriveRequestJson_(salesDriveOrdersUrl_(state.subdomain,page,fromDate,toDate),apiKey);
      const rawRows=Array.isArray(payload&&payload.data)?payload.data:[];
      for(let i=0;i<rawRows.length;i++){
        const items=normalizeSalesDriveOrders_(rawRows[i],statusMap);
        for(let j=0;j<items.length;j++){
          if(normalizeTrackingNumber_(items[j].ttn)===target) return items[j];
        }
      }
      if(rawRows.length<SALESDRIVE_CONFIG.pageSize) break;
      Utilities.sleep(SALESDRIVE_CONFIG.throttleMs);
    }
  }catch(error){
    console.error('Easy Return SalesDrive lookup error',target,error);
  }
  return null;
}

function novaEnsureStoredSalesDriveReturn_(candidate,result){
  if(!candidate) return null;
  if(candidate.rowNumber) return candidate;
  const promoted=Object.assign({},candidate,{
    isReturn:true,
    originalTtn:result.originalTtn||candidate.originalTtn||candidate.ttn||'',
    returnTtn:result.returnTtn||'',
    returnStartedAt:result.returnStartedAt||candidate.returnStartedAt||'',
    arrivedAt:result.arrivedAt||'',
    deliveryStatus:result.statusText||candidate.deliveryStatus||'',
    deliveryCode:result.statusCode||candidate.deliveryCode||'',
    statusSource:result.source||'Нова Пошта',
    carrier:'Нова Пошта'
  });

  upsertSalesDriveOrders_([promoted]);
  try{saveSalesDriveProductImages_([promoted]);}catch(_){ }

  const salesDriveId=String(promoted.salesDriveId||'');
  const ttn=normalizeTrackingNumber_(promoted.ttn||'');
  return readReturnRows_().find(row=>String(row.salesDriveId||'')===salesDriveId&&normalizeTrackingNumber_(row.ttn||'')===ttn)||null;
}

function novaPoshtaOwnSenderRefs_(apiKey){
  const refs=[];
  const seen=new Set();
  for(let page=1;page<=3;page++){
    const json=novaPoshtaApiRequest_(apiKey,'Counterparty','getCounterparties',{CounterpartyProperty:'Sender',Page:String(page)});
    const data=Array.isArray(json.data)?json.data:[];
    data.forEach(item=>{
      const ref=String(item&&item.Ref||'').trim();
      if(ref&&!seen.has(ref)){seen.add(ref);refs.push(ref);}
    });
    if(!data.length||data.length<100) break;
  }
  return refs;
}

function novaPoshtaIncomingDocumentNumbers_(apiKey,daysBack){
  const numbers=[];
  const seen=new Set();
  const now=new Date();
  const from=new Date(now.getTime()-Math.max(1,Number(daysBack)||21)*86400000);
  const dateFrom=novaPoshtaApiDate_(from);
  const dateTo=novaPoshtaApiDate_(now);

  const addDocuments=data=>{
    (Array.isArray(data)?data:[]).forEach(item=>{
      const number=normalizeTrackingNumber_(firstValue_(item||{},['IntDocNumber','Number','DocumentNumber','TTN'])||'');
      if(!number||seen.has(number)) return;
      seen.add(number);numbers.push(number);
    });
  };

  for(let page=1;page<=8&&numbers.length<600;page++){
    const props={
      DateTimeFrom:dateFrom,
      DateTimeTo:dateTo,
      Page:String(page),
      OrderField:'DateTime',
      OrderDirection:'DESC'
    };
    const json=novaPoshtaApiRequest_(apiKey,'InternetDocument','getDocumentList',props);
    const data=Array.isArray(json.data)?json.data:[];
    addDocuments(data);
    if(!data.length||data.length<100) break;
  }

  // Fallback for accounts where getDocumentList needs an explicit recipient ref.
  // Exact LightReturnNumber matching below still prevents unrelated shipments.
  if(numbers.length<600){
    let refs=[];
    try{refs=novaPoshtaOwnSenderRefs_(apiKey);}catch(_){refs=[];}
    refs.slice(0,10).forEach(recipientRef=>{
      for(let page=1;page<=3&&numbers.length<600;page++){
        const props={
          RecipientRef:recipientRef,
          DateTimeFrom:dateFrom,
          DateTimeTo:dateTo,
          Page:String(page),
          OrderField:'DateTime',
          OrderDirection:'DESC'
        };
        const json=novaPoshtaApiRequest_(apiKey,'InternetDocument','getDocumentList',props);
        const data=Array.isArray(json.data)?json.data:[];
        addDocuments(data);
        if(!data.length||data.length<100) break;
      }
    });
  }

  return numbers.slice(0,600);
}

function novaPoshtaApiDate_(value){
  const date=value instanceof Date?value:new Date(value);
  const tz=Session.getScriptTimeZone()||'Europe/Kyiv';
  return Utilities.formatDate(date,tz,'dd.MM.yyyy');
}

function novaPoshtaApiRequest_(apiKey,modelName,calledMethod,methodProperties){
  const payload={apiKey:apiKey,modelName:modelName,calledMethod:calledMethod,methodProperties:methodProperties||{}};
  const response=UrlFetchApp.fetch('https://api.novaposhta.ua/v2.0/json/',{
    method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true
  });
  const http=response.getResponseCode();
  let json={};
  try{json=JSON.parse(response.getContentText()||'{}');}catch(_){json={};}
  if(http<200||http>=300||json.success===false){
    const errors=Array.isArray(json.errors)?json.errors.join('; '):('HTTP '+http);
    throw new Error('Нова Пошта API '+modelName+'.'+calledMethod+': '+errors);
  }
  return json;
}

function novaApplyDiscoveredReturn_(row,result){
  // Old versions could mark the ORIGINAL outbound shipment as "supplier picked up"
  // before the distinct return EN was discovered. Repair only that stale case.
  // Carrier delivery itself must NEVER set supplierPickedUp.
  if(result&&result.distinctReturnLeg&&row&&row.id){
    const fresh=findReturnByIdFast_(row.id);
    if(fresh){
      const oldReturn=normalizeTrackingNumber_(fresh.returnTtn||'');
      const parent=normalizeTrackingNumber_(result.originalTtn||'');
      const child=normalizeTrackingNumber_(result.returnTtn||'');
      const staleParentReturn=!oldReturn||oldReturn===parent;
      const pickupAt=parseDate_(fresh.supplierPickedUpAt);
      const returnStart=parseDate_(result.returnStartedAt||fresh.returnStartedAt);
      const pickupPredatesReturn=Boolean(pickupAt&&returnStart&&pickupAt.getTime()<=returnStart.getTime());
      if(child&&parent&&child!==parent&&staleParentReturn&&fresh.supplierPickedUp&&pickupPredatesReturn){
        fresh.supplierPickedUp=false;
        fresh.supplierPickedUpAt='';
        fresh.returnStatus='in_transit';
        fresh.supplierPickupStatus='not_handed_over';
        fresh.arrivedAt='';
        fresh.returnTtn=child;
        fresh.originalTtn=parent;
        writeReturnFast_(fresh);
      }
    }
  }
  return applyCarrierTracking_(row,result);
}

function mirrorSalesDriveReturnImages_(){
  let rows=[];
  try{
    rows=readReturnRows_().filter(row=>{
      if(String(row.source||'').toLowerCase()!=='salesdrive'||!isReturnRecord_(row)) return false;
      const url=String(row.productImage||'').trim();
      if(!/^https?:\/\//i.test(url)) return false;
      if(/drive\.google\.com|googleusercontent\.com/i.test(url)) return false;
      return true;
    }).slice(0,40);
  }catch(_){ return {updated:0,errors:0}; }
  if(!rows.length) return {updated:0,errors:0};

  const cache=CacheService.getScriptCache();
  const pending=[];
  rows.forEach(row=>{
    const url=String(row.productImage||'').trim();
    const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,url,Utilities.Charset.UTF_8);
    const cacheKey='RM_IMG_MIRROR_'+Utilities.base64EncodeWebSafe(digest).replace(/=+$/,'').slice(0,28);
    if(cache.get(cacheKey)==='fail') return;
    pending.push({row:row,url:url,cacheKey:cacheKey});
  });
  if(!pending.length) return {updated:0,errors:0};

  const requests=pending.map(item=>({
    url:item.url,
    method:'get',
    muteHttpExceptions:true,
    followRedirects:true,
    headers:{'User-Agent':'Mozilla/5.0','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}
  }));

  let responses=[];
  try{responses=UrlFetchApp.fetchAll(requests);}catch(_){return {updated:0,errors:pending.length};}

  const sh=returnSheetFast_();
  const imageCol=RETURN_KEYS.indexOf('productImage')+1;
  const folder=getReturnImagesFolder_();
  let updated=0,errors=0;

  responses.forEach((response,index)=>{
    const item=pending[index];
    try{
      const http=response.getResponseCode();
      if(http<200||http>=400) throw new Error('HTTP '+http);
      const blob=response.getBlob();
      const bytes=blob.getBytes();
      if(!bytes.length||bytes.length>3*1024*1024) throw new Error('bad image size');
      let mime=String(blob.getContentType()||response.getHeaders()['Content-Type']||'').split(';')[0].trim().toLowerCase();
      if(!/^image\//.test(mime)) throw new Error('not image');
      if(mime==='image/jpg') mime='image/jpeg';
      const ext=mime==='image/png'?'png':(mime==='image/webp'?'webp':(mime==='image/gif'?'gif':'jpg'));
      const safeId=String(item.row.salesDriveId||item.row.id||Utilities.getUuid()).replace(/[^a-zA-Z0-9_-]/g,'_');
      blob.setName('salesdrive-'+safeId+'-'+Utilities.getUuid().slice(0,8)+'.'+ext);
      const file=folder.createFile(blob);
      try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(_){ }
      const driveUrl='https://drive.google.com/uc?export=view&id='+file.getId();
      sh.getRange(item.row.rowNumber,imageCol).setValue(driveUrl);
      try{cache.put(item.cacheKey,'ok',21600);}catch(_){ }
      updated++;
    }catch(_){
      errors++;
      try{cache.put(item.cacheKey,'fail',3600);}catch(__){ }
    }
  });
  return {updated:updated,errors:errors};
}

function novaPoshtaStatusBatch_(apiKey,numbers){
  const unique=[];
  const seen=new Set();
  (numbers||[]).forEach(value=>{
    const n=normalizeTrackingNumber_(value);
    if(!n||seen.has(n)) return;
    seen.add(n);unique.push(n);
  });
  if(!unique.length) return [];

  let out=[];
  for(let offset=0;offset<unique.length;offset+=80){
    const chunk=unique.slice(offset,offset+80);
    const payload={
      apiKey:apiKey,
      modelName:'TrackingDocument',
      calledMethod:'getStatusDocuments',
      methodProperties:{Documents:chunk.map(number=>({DocumentNumber:number,Phone:''}))}
    };
    const response=UrlFetchApp.fetch('https://api.novaposhta.ua/v2.0/json/',{
      method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true
    });
    const http=response.getResponseCode();
    let json={};
    try{json=JSON.parse(response.getContentText()||'{}');}catch(_){json={};}
    if(http<200||http>=300||json.success===false){
      const errors=Array.isArray(json.errors)?json.errors.join('; '):('HTTP '+http);
      throw new Error('Нова Пошта API: '+errors);
    }
    if(Array.isArray(json.data)) out=out.concat(json.data);
  }
  return out;
}

function novaStatusMap_(items){
  const map=new Map();
  (items||[]).forEach(item=>{
    const n=novaStatusNumber_(item);
    if(n) map.set(n,item);
  });
  return map;
}

function novaStatusNumber_(item){
  return normalizeTrackingNumber_(firstValue_(item||{},['Number','DocumentNumber','IntDocNumber','TTN','TrackingNumber'])||'');
}

function novaReturnRelation_(parent,child,parentNumber,childNumber){
  parent=parent||{};child=child||{};
  if(!childNumber||childNumber===parentNumber) return '';

  const lightPrimary=normalizeTrackingNumber_(firstValue_(child,['LightReturnNumber','lightReturnNumber'])||'');
  if(lightPrimary&&lightPrimary===parentNumber) return 'return';

  const relationText=[
    firstValue_(parent,['LastCreatedOnTheBasisDocumentType','lastCreatedOnTheBasisDocumentType']),
    firstValue_(child,['CreatedOnTheBasis','createdOnTheBasis']),
    firstValue_(child,['LastCreatedOnTheBasisDocumentType','lastCreatedOnTheBasisDocumentType']),
    firstValue_(child,['Status','StatusDescription']),
    firstValue_(child,['UndeliveryReasonsSubtypeDescription','UndeliveryReasonsDescription'])
  ].map(v=>String(v||'')).join(' · ').toLowerCase();

  const returnSignal=/легк.{0,12}повер|повернен|поверта|return|відмов|refusal|undeliver/i.test(relationText);
  const redirectSignal=/переадрес|redirect|змінен[оа]\s+адрес|змін[а-яіїєґ]*\s+адрес/i.test(relationText);
  if(redirectSignal&&!returnSignal) return 'redirection';
  if(returnSignal) return 'return';
  if(novaStatusIsExplicitReturn_(parent)) return 'return';
  return '';
}

function novaStatusIsExplicitReturn_(item){
  item=item||{};
  const code=String(firstValue_(item,['StatusCode','statusCode'])||'').trim();
  const text=[
    firstValue_(item,['Status','StatusDescription']),
    firstValue_(item,['UndeliveryReasonsSubtypeDescription','UndeliveryReasonsDescription'])
  ].map(v=>String(v||'')).join(' · ');
  if(code==='102') return true;
  return /повернен|поверта|відмов|return\s+to\s+sender|refusal/i.test(text);
}

function novaTrackingResultFromItem_(item,number,context){
  item=item||{};
  const status=compactText_(firstValue_(item,['Status','StatusDescription'])||'');
  const statusCode=String(firstValue_(item,['StatusCode','statusCode'])||'');
  const delivered=/^(9|10|11)$/.test(statusCode)||/отриман|вручен|доставлен/i.test(status);
  const readyAtBranch=/прибув.{0,35}(відділен|пункт|поштомат)|готов.{0,25}(отриман|видач)|у\s+відділен/i.test(status);
  const statusDate=firstValue_(item,['ActualDeliveryDate','RecipientDateTime','DateScan','ScheduledDeliveryDate','DateCreated']);
  const when=dateIso_(statusDate)||'';
  return {
    source:'Нова Пошта',
    authoritative:true,
    statusText:status||(statusCode?'Нова Пошта · код '+statusCode:''),
    statusCode:statusCode,
    isReturn:true,
    returnStartedAt:(context&&context.returnStartedAt)||when||new Date().toISOString(),
    arrivedAt:(readyAtBranch||delivered)?(when||new Date().toISOString()):'',
    carrierDelivered:Boolean(delivered),
    originalTtn:context&&context.originalTtn?normalizeTrackingNumber_(context.originalTtn):'',
    returnTtn:normalizeTrackingNumber_(number),
    raw:item
  };
}