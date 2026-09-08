function refreshTracking_(){
  const rows=readReturnRows_().filter(r=>(r.returnTtn||r.ttn)&&!r.supplierPickedUp&&isReturnRecord_(r)).slice(0,80);
  let checked=0,updated=0,skipped=0,errors=0;

  rows.forEach(row=>{
    try{
      const trackingTtn=row.returnTtn||row.ttn;
      const result=trackShipment_(row.carrier,trackingTtn);
      if(!result||result.skipped){ skipped++; return; }
      result.ttn=trackingTtn;
      result.originalTtn=row.originalTtn||row.ttn||'';
      result.returnTtn=row.returnTtn||trackingTtn;
      checked++;
      updateTrackingRow_(row,result);
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
  if(/укр|ukrposhta/.test(c)) return trackTemplateProvider_('Укрпошта','UKRPOSHTA_TRACKING_URL_TEMPLATE','UKRPOSHTA_TRACKING_TOKEN',ttn);
  if(/meest|міст/.test(c)) return trackTemplateProvider_('Meest','MEEST_TRACKING_URL_TEMPLATE','MEEST_TRACKING_TOKEN',ttn);
  if(/rozetka|розетка/.test(c)) return {skipped:true,source:'Rozetka',reason:'Rozetka tracking adapter pending'};
  return {skipped:true,source:carrier||'Unknown',reason:'Unknown carrier'};
}

function trackNovaPoshta_(ttn){
  const key=PropertiesService.getScriptProperties().getProperty('NOVA_POSHTA_API_KEY');
  if(!key) return {skipped:true,source:'Нова Пошта',reason:'NOVA_POSHTA_API_KEY not set'};
  const payload={apiKey:key,modelName:'TrackingDocument',calledMethod:'getStatusDocuments',methodProperties:{Documents:[{DocumentNumber:String(ttn),Phone:''}]}};
  const response=UrlFetchApp.fetch('https://api.novaposhta.ua/v2.0/json/',{method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true});
  const json=JSON.parse(response.getContentText()||'{}');
  const item=json&&json.data&&json.data[0]?json.data[0]:{};
  const status=String(item.Status||item.StatusDescription||'');
  return trackingResult_('Нова Пошта',status,String(item.StatusCode||''),item);
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
  const arrived=looksLikeReturnArrived_(status);
  const now=new Date().toISOString();
  return {source:source,statusText:status,statusCode:statusCode,isReturn:isReturn,returnStartedAt:isReturn?now:'',arrivedAt:arrived?now:'',raw:raw||{}};
}
