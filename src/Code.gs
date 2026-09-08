const RETURN_MONITOR = Object.freeze({
  name: 'Відстеження повернень',
  spreadsheetId: '1mOZ93xQIR_gfFoqZq_hrkbZc3hcGBV6pGzX7g_79B-M',
  returnsSheet: 'Повернення',
  suppliersSheet: 'Постачальники',
  settingsSheet: 'Налаштування',
  syncFunction: 'syncAll',
  syncEveryMinutes: 60
});

function doGet(){
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(RETURN_MONITOR.name)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}

function include_(name){ return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function onOpen(){
  try{
    SpreadsheetApp.getUi().createMenu('Повернення')
      .addItem('Відкрити налаштування','showSetupInfo')
      .addItem('Синхронізувати зараз','syncAll')
      .addItem('Встановити автооновлення','installAutomation')
      .addToUi();
  }catch(_){ }
}

function showSetupInfo(){
  const status=getSetupStatus_();
  SpreadsheetApp.getUi().alert('Відстеження повернень',
    'SalesDrive: '+(status.salesDrive?'налаштовано':'не налаштовано')+'\n'+
    'Нова Пошта: '+(status.novaPoshta?'налаштовано':'не налаштовано')+'\n'+
    'Укрпошта: '+(status.ukrposhta?'налаштовано':'не налаштовано')+'\n'+
    'Prom: '+(status.prom?'налаштовано':'не налаштовано'),SpreadsheetApp.getUi().ButtonSet.OK);
}

function setupProject(){
  ensureDatabase_();
  installAutomation();
  return getSetupStatus_();
}

function installAutomation(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===RETURN_MONITOR.syncFunction).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(RETURN_MONITOR.syncFunction).timeBased().everyHours(1).create();
  return {ok:true,intervalMinutes:RETURN_MONITOR.syncEveryMinutes};
}

function apiDashboard(){ return buildDashboard_(); }
function apiSync(){ syncAll(); return buildDashboard_(); }
function apiCreateReturn(payload){
  const lock=LockService.getUserLock();
  lock.waitLock(30000);
  try{
    const duplicate=findRecentManualDuplicate_(payload);
    if(!duplicate) saveReturn_(payload,true);
    return buildDashboard_();
  }finally{
    lock.releaseLock();
  }
}
function apiUpdateReturn(payload){ saveReturn_(payload,false); return buildDashboard_(); }
function apiSetSupplierPickedUp(payload){
  if(!payload||!payload.id) throw new Error('Не вказано повернення.');
  markSupplierPickedUp_(String(payload.id),Boolean(payload.taken));
  return buildDashboard_();
}
function apiSaveSupplier(payload){ saveSupplier_(payload); return buildDashboard_(); }
function apiSetupStatus(){ return getSetupStatus_(); }

function findRecentManualDuplicate_(payload){
  payload=payload||{};
  const now=Date.now();
  const supplierId=String(payload.supplierId||'').trim();
  const supplierOrderNumber=String(payload.supplierOrderNumber||'').trim();
  const productName=String(payload.productName||'').trim().toLowerCase();
  const reason=String(payload.returnReason||'').trim();
  const amount=payload.amount===''||payload.amount===null||payload.amount===undefined?0:Number(payload.amount||0);
  const returnDate=dateIso_(payload.returnDate)||'';
  const note=String(payload.note||'').trim().toLowerCase();

  return readReturnRows_().find(row=>{
    if(row.source!=='manual') return false;
    const created=parseDate_(row.createdAt);
    if(!created||now-created.getTime()>120000) return false;
    if(String(row.supplierId||'')!==supplierId) return false;
    if(String(row.supplierOrderNumber||'').trim()!==supplierOrderNumber) return false;
    if(String(row.productName||'').trim().toLowerCase()!==productName) return false;
    if(String(row.returnReason||'').trim()!==reason) return false;
    if(Number(row.amount||0)!==Number(amount||0)) return false;
    if((dateIso_(row.returnDate)||'')!==returnDate) return false;
    if(String(row.note||'').trim().toLowerCase()!==note) return false;
    return true;
  })||null;
}

function getSetupStatus_(){
  const p=PropertiesService.getScriptProperties();
  const salesDriveState=typeof getSalesDriveState_==='function'?getSalesDriveState_():{configured:false,subdomain:''};
  return {
    salesDrive:Boolean(salesDriveState.configured),
    salesDriveSubdomain:salesDriveState.subdomain||'',
    salesDriveLastSync:salesDriveState.lastSync||'',
    novaPoshta:Boolean(p.getProperty('NOVA_POSHTA_API_KEY')),
    ukrposhta:Boolean(p.getProperty('UKRPOSHTA_TRACKING_URL_TEMPLATE')),
    meest:Boolean(p.getProperty('MEEST_TRACKING_URL_TEMPLATE')),
    prom:Boolean(p.getProperty('PROM_API_TOKEN')),
    spreadsheetId:RETURN_MONITOR.spreadsheetId
  };
}

function syncAll(){
  ensureDatabase_();
  const started=new Date();
  const result={ok:true,salesDrive:syncSalesDrive_(),tracking:refreshTracking_(),startedAt:started.toISOString(),finishedAt:new Date().toISOString()};
  return result;
}
