function discoverNovaPoshtaReturns_(){
  const key=PropertiesService.getScriptProperties().getProperty('NOVA_POSHTA_API_KEY');
  if(!key) return {ok:false,skipped:true,reason:'NOVA_POSHTA_API_KEY not set'};

  const now=Date.now();
  const maxAgeMs=21*86400000;
  const rows=readReturnRows_().filter(row=>{
    if(String(row.source||'').toLowerCase()!=='salesdrive') return false;
    if(row.supplierPickedUp) return false;
    const ttn=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
    if(!/^\d{14}$/.test(ttn)) return false;
    const date=parseDate_(row.orderDate||row.createdAt||row.updatedAt);
    return !date||now-date.getTime()<=maxAgeMs;
  }).sort((a,b)=>{
    const ad=parseDate_(a.orderDate||a.createdAt),bd=parseDate_(b.orderDate||b.createdAt);
    return (bd?bd.getTime():0)-(ad?ad.getTime():0);
  }).slice(0,140);

  if(!rows.length) return {ok:true,checked:0,children:0,returnsFound:0,updated:0};

  const parentNumbers=[];
  const seenParents=new Set();
  rows.forEach(row=>{
    const n=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
    if(!n||seenParents.has(n)) return;
    seenParents.add(n);parentNumbers.push(n);
  });
  const parentItems=novaPoshtaStatusBatch_(key,parentNumbers);
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

    const direct=novaStatusIsExplicitReturn_(parent);
    const childNumber=normalizeTrackingNumber_(firstValue_(parent,['LastCreatedOnTheBasisNumber','lastCreatedOnTheBasisNumber'])||'');
    const child=childNumber?childByNumber.get(childNumber):null;
    const relation=novaReturnRelation_(parent,child,parentNumber,childNumber);

    if(relation==='redirection'){
      redirections++;
      return;
    }

    if(direct){
      const result=novaTrackingResultFromItem_(parent,parentNumber,row);
      result.isReturn=true;
      result.originalTtn=parentNumber;
      result.returnTtn=parentNumber;
      applyCarrierTracking_(row,result);
      returnsFound++;updated++;
      return;
    }

    if(relation==='return'&&child){
      const result=novaTrackingResultFromItem_(child,childNumber,row);
      result.isReturn=true;
      result.originalTtn=parentNumber;
      result.returnTtn=childNumber;
      if(!result.returnStartedAt){
        result.returnStartedAt=dateIso_(firstValue_(parent,['LastCreatedOnTheBasisDateTime','lastCreatedOnTheBasisDateTime']))||row.returnStartedAt||new Date().toISOString();
      }
      applyCarrierTracking_(row,result);
      returnsFound++;updated++;
      return;
    }

    if(childNumber&&relation==='') ambiguous++;
  });

  return {ok:true,checked:parentNumbers.length,children:childNumbers.length,returnsFound:returnsFound,updated:updated,redirections:redirections,ambiguous:ambiguous};
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
    pickedUpAt:delivered?(when||new Date().toISOString()):'',
    originalTtn:context&&context.originalTtn?normalizeTrackingNumber_(context.originalTtn):'',
    returnTtn:normalizeTrackingNumber_(number),
    raw:item
  };
}
