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
    content=content.replace(/\\n/g,'\n');
    content += `<style>
/* Last-resort header normalization. It is intentionally appended after Styles.html. */
@media (min-width:761px){
  .app{width:100%!important;max-width:none!important;margin:0!important;padding:18px 20px 24px!important}
  .dashboardHero{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:22px!important;margin:0 0 16px!important;padding:0!important;overflow:visible!important}
  .dashboardHero .heroBrand{display:flex!important;align-items:center!important;gap:14px!important;min-width:330px!important;flex:1 1 auto!important;margin:0!important}
  .dashboardHero .heroBrandIcon{width:48px!important;height:48px!important;min-width:48px!important;border-radius:16px!important}
  .dashboardHero .heroBrandIcon svg{width:28px!important;height:28px!important}
  .dashboardHero .heroCopy{min-width:0!important;margin:0!important;padding:0!important}
  .dashboardHero .heroCopy h1{display:block!important;margin:0 0 5px!important;font-size:28px!important;line-height:1.08!important;letter-spacing:-.02em!important;font-weight:800!important;white-space:nowrap!important}
  .dashboardHero .heroSetup{display:flex!important;align-items:center!important;gap:5px!important;margin:0!important;width:auto!important;max-width:none!important;font-size:11px!important;line-height:1.2!important;color:#7b8493!important;white-space:nowrap!important}
  .dashboardHero .heroSetup>span:last-child{display:block!important;white-space:nowrap!important}
  .dashboardHero .setupLinkIcon{display:inline!important;width:auto!important;height:auto!important;min-width:0!important;background:transparent!important;border-radius:0!important;font-size:11px!important;line-height:1!important}

  .dashboardHero .heroActions{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:10px!important;flex:0 0 auto!important;width:auto!important;margin:0!important;flex-wrap:nowrap!important}
  .dashboardHero .periodSyncCard{display:flex!important;align-items:center!important;gap:8px!important;width:auto!important;min-width:0!important;height:auto!important;min-height:0!important;margin:0!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}
  .dashboardHero .periodSyncCard::before{content:none!important;display:none!important}
  .dashboardHero .heroPeriod{display:flex!important;align-items:center!important;gap:6px!important;width:auto!important;min-width:0!important;height:42px!important;min-height:42px!important;padding:0 9px!important;margin:0!important;border:1px solid #e4e7ec!important;border-radius:11px!important;background:#fff!important;box-shadow:0 1px 2px rgba(16,24,40,.02)!important;overflow:visible!important;cursor:default!important}
  .dashboardHero .heroPeriod::before,.dashboardHero .heroPeriod::after{content:none!important;display:none!important}
  .dashboardHero .heroActionIcon,.dashboardHero .heroPeriodText{display:none!important}
  .dashboardHero .periodInputs{display:grid!important;position:static!important;left:auto!important;right:auto!important;top:auto!important;z-index:auto!important;padding:0!important;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;grid-template-columns:124px auto 124px!important;align-items:center!important;gap:6px!important}
  .dashboardHero .periodInputs input{display:block!important;width:124px!important;min-width:124px!important;height:40px!important;padding:0 4px!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;font-size:12px!important;color:#101828!important;opacity:1!important;font-weight:650!important}
  .dashboardHero .periodInputs .periodDash{display:block!important;color:#667085!important;font-size:12px!important}
  .dashboardHero .heroSync{display:inline-flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:5px!important;width:auto!important;min-width:118px!important;height:42px!important;min-height:42px!important;padding:0 12px!important;margin:0!important;border:1px solid #e4e7ec!important;border-radius:11px!important;background:#fff!important;box-shadow:0 1px 2px rgba(16,24,40,.02)!important;color:#101828!important;font-size:12px!important;line-height:1!important;font-weight:700!important}
  .dashboardHero .heroSyncIcon{display:inline!important;margin:0!important;color:#101828!important;font-size:15px!important;line-height:1!important;font-weight:600!important}
  .dashboardHero .heroSettings,.dashboardHero .heroAdd{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;width:auto!important;height:42px!important;min-height:42px!important;margin:0!important;padding:0 14px!important;border-radius:11px!important;font-size:12px!important;line-height:1!important;white-space:nowrap!important}
  .dashboardHero .heroBtnIcon,.dashboardHero .heroPlus{font-size:13px!important;line-height:1!important}

  .detailsDrawer.refDetails{width:min(680px,48vw)!important;max-width:680px!important}
  .tableRow{grid-template-columns:125px 145px 160px minmax(290px,2fr) 145px 145px 150px 100px 112px 46px!important;min-width:1140px!important}
  .tableRow>.checkCell{display:none!important}
  .heroStats .statChevron{display:none!important}
  .statCard{min-height:96px!important;padding:14px 16px!important}
}
@media(max-width:760px){
  .dashboardHero{overflow:visible!important}
  .heroCopy h1 span{display:block!important}
  .heroSetup{margin-left:-82px!important;width:calc(100% + 82px)!important;max-width:none!important}
  .periodSyncCard{width:100%!important}
  .heroSettings,.heroAdd{min-width:0!important}
  .heroStats .statCard{position:relative!important}
  .heroStats .statChevron{display:none!important}
}
@media(max-width:390px){
  .heroSetup{margin-left:-71px!important;width:calc(100% + 71px)!important}
}
.carrierApiState{margin:12px 0;padding:11px 12px;border:1px solid #e4e7ec;border-radius:11px;background:#f8fafb;color:#667085;font-size:12px}
.carrierApiState.ok{background:#f2fbf5;border-color:#ccebd7;color:#117a42}
</style>
<script>
document.addEventListener('DOMContentLoaded',function(){
  var dialog=document.getElementById('settingsDialog');
  var tabs=dialog&&dialog.querySelector('.settingsTabs');
  if(!dialog||!tabs||document.getElementById('settingsNova')) return;

  var novaTab=document.createElement('button');
  novaTab.type='button';novaTab.className='settingsTab';novaTab.dataset.settingsTab='nova';novaTab.textContent='Нова Пошта';novaTab.onclick=function(){rmCarrierTab('nova');};
  var ukrTab=document.createElement('button');
  ukrTab.type='button';ukrTab.className='settingsTab';ukrTab.dataset.settingsTab='ukr';ukrTab.textContent='Укрпошта';ukrTab.onclick=function(){rmCarrierTab('ukr');};
  tabs.appendChild(novaTab);tabs.appendChild(ukrTab);

  var nova=document.createElement('section');
  nova.className='settingsPane';nova.id='settingsNova';
  nova.innerHTML='<p class="settingsText">Ключ Нової Пошти зберігається у Script Properties. Тут можна перевірити стан або замінити ключ.</p><div class="carrierApiState" id="novaApiState">Перевіряємо…</div><form onsubmit="saveNovaCarrier(event)"><label class="field"><span>API key Нової Пошти</span><input id="novaApiKeyInput" type="password" autocomplete="new-password" placeholder="Залиште порожнім, щоб не змінювати"></label><div class="modalActions compact"><button class="btn primary" type="submit">Зберегти</button></div></form>';
  dialog.appendChild(nova);

  var ukr=document.createElement('section');
  ukr.className='settingsPane';ukr.id='settingsUkr';
  ukr.innerHTML='<p class="settingsText">Для відстеження потрібен PRODUCTION BEARER StatusTracking. Значення зберігається у Script Properties.</p><div class="carrierApiState" id="ukrApiState">Перевіряємо…</div><form onsubmit="saveUkrCarrier(event)"><label class="field"><span>PRODUCTION BEARER StatusTracking</span><input id="ukrBearerInput" type="password" autocomplete="new-password" placeholder="Залиште порожнім, щоб не змінювати"></label><div class="modalActions compact"><button class="btn primary" type="submit">Зберегти</button></div></form>';
  dialog.appendChild(ukr);

  var oldSet=window.setSettingsTab;
  window.setSettingsTab=function(tab){
    if(oldSet) oldSet(tab);
    var a=document.getElementById('settingsNova'),b=document.getElementById('settingsUkr');
    if(a)a.classList.remove('active');if(b)b.classList.remove('active');
  };
  var oldOpen=window.openSettings;
  window.openSettings=function(){if(oldOpen)oldOpen();refreshCarrierApiState();};
  refreshCarrierApiState();
});

function rmCarrierTab(tab){
  document.querySelectorAll('.settingsTab').forEach(function(el){el.classList.toggle('active',el.dataset.settingsTab===tab);});
  document.querySelectorAll('#settingsDialog .settingsPane').forEach(function(el){el.classList.remove('active');});
  var pane=document.getElementById(tab==='nova'?'settingsNova':'settingsUkr');if(pane)pane.classList.add('active');
  refreshCarrierApiState();
}
function refreshCarrierApiState(){
  if(!window.google||!google.script||!google.script.run)return;
  google.script.run.withSuccessHandler(function(s){
    var n=document.getElementById('novaApiState'),u=document.getElementById('ukrApiState');
    if(n){n.textContent=s&&s.novaPoshtaConfigured?'API-ключ збережено · готово до трекінгу':'API-ключ не знайдено';n.classList.toggle('ok',Boolean(s&&s.novaPoshtaConfigured));}
    if(u){u.textContent=s&&s.ukrposhtaConfigured?'PRODUCTION StatusTracking збережено · готово до трекінгу':'PRODUCTION StatusTracking не знайдено';u.classList.toggle('ok',Boolean(s&&s.ukrposhtaConfigured));}
  }).apiCarrierSettings();
}
function saveNovaCarrier(event){event.preventDefault();var input=document.getElementById('novaApiKeyInput');google.script.run.withSuccessHandler(function(){input.value='';refreshCarrierApiState();if(window.loadData)loadData();if(window.toast)toast('Ключ Нової Пошти збережено');}).withFailureHandler(function(e){if(window.showError)showError(e&&e.message?e.message:String(e));}).apiSaveNovaPoshtaSettings({apiKey:input.value});}
function saveUkrCarrier(event){event.preventDefault();var input=document.getElementById('ukrBearerInput');google.script.run.withSuccessHandler(function(){input.value='';refreshCarrierApiState();if(window.loadData)loadData();if(window.toast)toast('Ключ Укрпошти збережено');}).withFailureHandler(function(e){if(window.showError)showError(e&&e.message?e.message:String(e));}).apiSaveUkrposhtaSettings({bearer:input.value});}
</script>`;
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
    ukrposhta:Boolean(p.getProperty('UKRPOSHTA_STATUS_BEARER_PROD')||p.getProperty('PRODUCTION BEARER StatusTracking')||p.getProperty('UKRPOSHTA_TRACKING_TOKEN')),
    meest:Boolean(p.getProperty('MEEST_TRACKING_URL_TEMPLATE')),
    prom:Boolean(p.getProperty('PROM_API_TOKEN')),
    spreadsheetId:RETURN_MONITOR.spreadsheetId
  };
}

function syncAll(){
  ensureDatabase_();
  const started=new Date();
  const salesDrive=syncSalesDrive_();
  const reconcile=typeof reconcileReturnData_==='function'?reconcileReturnData_():{};
  const tracking=refreshTracking_();
  return {
    ok:Boolean(!salesDrive||salesDrive.ok!==false)&&Boolean(!tracking||tracking.ok!==false),
    salesDrive:salesDrive,
    reconcile:reconcile,
    tracking:tracking,
    startedAt:started.toISOString(),
    finishedAt:new Date().toISOString()
  };
}
