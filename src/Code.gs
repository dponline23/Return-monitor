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

function include_(name){
  let content=HtmlService.createHtmlOutputFromFile(name).getContent();
  if(name==='Styles'){
    // Repair the accidentally committed literal "\\n" sequences in the mobile CSS block.
    content=content.replace(/\\n/g,'\n');
    // Final mobile overrides keep the header composition aligned with the approved reference.
    content += `<style>
@media(max-width:760px){
  .dashboardHero{overflow:visible!important}
  .heroCopy h1 span{display:block!important}
  .heroSetup{margin-left:-82px!important;width:calc(100% + 82px)!important;max-width:none!important}
  .periodSyncCard{width:100%!important}
  .heroSettings,.heroAdd{min-width:0!important}
  .heroStats .statCard{position:relative!important}
  .heroStats .statChevron{left:auto!important;right:13px!important;top:13px!important}
}
@media(max-width:390px){
  .heroSetup{margin-left:-71px!important;width:calc(100% + 71px)!important}
}
</style>`;
  }
  return content;
}

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
  const id=saveReturn_(payload,true);
  return findReturnByIdFast_(id);
}
function apiUpdateReturn(payload){
  const id=saveReturn_(payload,false);
  return findReturnByIdFast_(id);
}
function apiSetSupplierPickedUp(payload){
  if(!payload||!payload.id) throw new Error('Не вказано повернення.');
  return markSupplierPickedUp_(String(payload.id),Boolean(payload.taken));
}
function apiSetSupplierNotified(payload){
  if(!payload||!payload.id) throw new Error('Не вказано повернення.');
  return markSupplierNotified_(String(payload.id),Boolean(payload.notified));
}
function apiSaveSupplier(payload){ saveSupplier_(payload); return buildDashboard_(); }
function apiSetupStatus(){ return getSetupStatus_(); }

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
