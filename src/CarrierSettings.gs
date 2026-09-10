function apiCarrierSettings(){
  const p=PropertiesService.getScriptProperties();
  return {
    novaPoshtaConfigured:Boolean(p.getProperty('NOVA_POSHTA_API_KEY')),
    ukrposhtaConfigured:Boolean(p.getProperty('UKRPOSHTA_STATUS_BEARER_PROD')||p.getProperty('UKRPOSHTA_TRACKING_TOKEN'))
  };
}

function apiSaveNovaPoshtaSettings(payload){
  payload=payload||{};
  const key=String(payload.apiKey||'').trim();
  if(key) PropertiesService.getScriptProperties().setProperty('NOVA_POSHTA_API_KEY',key);
  return apiCarrierSettings();
}

function apiSaveUkrposhtaSettings(payload){
  payload=payload||{};
  const bearer=String(payload.bearer||'').trim().replace(/^Bearer\s+/i,'').trim();
  if(bearer) PropertiesService.getScriptProperties().setProperty('UKRPOSHTA_STATUS_BEARER_PROD',bearer);
  return apiCarrierSettings();
}
