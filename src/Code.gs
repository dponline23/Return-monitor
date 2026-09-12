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
  .tableHead>div,.dataRow>div{justify-self:center!important;text-align:center!important}
  .tableHead .right,.dataRow .right{text-align:center!important}
  .dataRow .productMini{justify-content:center!important}
  .dataRow .productMini>div{text-align:left!important}
  .dataRow .actionsCell{justify-content:center!important}
  .heroStats .statChevron{display:none!important}
  .statCard{min-height:96px!important;padding:14px 16px!important}
}

.detailsDrawer.refDetails .refMore{display:none!important}
.detailsDrawer.refDetails .drawerHead{grid-template-columns:42px minmax(0,1fr)!important}
.refProductInner img{object-fit:contain!important;object-position:center!important;background:#fff!important;padding:3px!important}
.refPickupBox .refPickupIcon{display:grid!important;place-items:center!important;line-height:0!important}
.refPickupBox .refPickupIcon svg{display:block!important;margin:0!important}
.rmTrackingLink,.compactCardReturnTtn{cursor:pointer!important}
.rmTrackingLink strong,.compactCardReturnTtn strong{color:#1769d7!important;text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:2px!important}
.compactCardReturnTtn{text-decoration:none!important}

@media(max-width:760px){
  .dashboardHero{overflow:visible!important;margin-bottom:9px!important}
  .heroCopy h1 span{display:block!important}
  .heroSetup{margin-left:-82px!important;width:calc(100% + 82px)!important;max-width:none!important}

  .dashboardHero .heroActions{
    grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr)!important;
    gap:8px!important;
    margin-top:8px!important;
  }
  .dashboardHero .periodSyncCard{
    width:100%!important;
    min-height:60px!important;
    border-radius:15px!important;
  }
  .dashboardHero .periodSyncCard::before{margin:10px 0!important}
  .dashboardHero .heroPeriod{
    min-height:60px!important;
    grid-template-columns:31px minmax(0,1fr) 16px!important;
    gap:7px!important;
    padding:7px 10px!important;
    border-radius:15px 0 0 15px!important;
  }
  .dashboardHero .heroActionIcon{width:31px!important;height:31px!important}
  .dashboardHero .heroActionIcon svg{width:27px!important;height:27px!important}
  .dashboardHero .heroPeriodText small{font-size:9.5px!important;line-height:1!important;margin-bottom:2px!important}
  .dashboardHero .heroPeriodText strong{font-size:16px!important;line-height:1.05!important}
  .dashboardHero .periodChevronSvg{display:grid!important;place-items:center!important;width:16px!important;height:16px!important;color:#667085!important}
  .dashboardHero .periodChevronSvg svg{width:13px!important;height:13px!important;fill:none!important;stroke:currentColor!important;stroke-width:2.1!important;stroke-linecap:round!important;stroke-linejoin:round!important}
  .dashboardHero .heroSync{
    min-height:60px!important;
    padding:6px 8px!important;
    border-radius:0 15px 15px 0!important;
    font-size:10.5px!important;
  }
  .dashboardHero .heroSyncIcon{font-size:24px!important;line-height:1!important}
  .dashboardHero .heroSettings,.dashboardHero .heroAdd{
    height:44px!important;
    min-height:44px!important;
    border-radius:13px!important;
    font-size:13.5px!important;
    gap:8px!important;
  }
  .dashboardHero .heroSettings{background:#fff!important;border:1px solid #e4e7ec!important}
  .dashboardHero .heroAdd{
    background:#eef9f2!important;
    border:1px solid #c9e9d5!important;
    color:#087a3d!important;
    box-shadow:0 4px 10px rgba(16,24,40,.035)!important;
  }
  html body .dashboardHero .heroAdd .heroAddIcon{
    width:28px!important;
    height:28px!important;
    border-radius:9px!important;
    background:#087a3d!important;
    color:#fff!important;
    display:grid!important;
    place-items:center!important;
    flex:0 0 28px!important;
    transform:translateX(-70%)!important;
  }
  .dashboardHero .heroAddIcon svg{width:16px!important;height:16px!important;fill:none!important;stroke:currentColor!important;stroke-width:2.2!important;stroke-linecap:round!important}
  .dashboardHero .heroSettings .heroBtnIcon{font-size:16px!important}

  .detailsDrawer.refDetails .drawerHead{grid-template-columns:34px minmax(0,1fr)!important}

  .heroStats{gap:7px!important;margin-bottom:10px!important}
  .heroStats .statCard{
    position:relative!important;
    min-height:82px!important;
    padding:9px 10px!important;
    gap:8px!important;
    border-radius:14px!important;
  }
  .heroStats .statIcon{width:34px!important;height:34px!important;border-radius:10px!important;font-size:15px!important;display:grid!important;place-items:center!important;line-height:0!important}
  .heroStats .statIcon svg{display:block!important;width:19px!important;height:19px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.85!important;stroke-linecap:round!important;stroke-linejoin:round!important;margin:0!important}
  .heroStats .statWaitingCard .statIcon svg{width:23px!important;height:23px!important;stroke-width:1.9!important}
  .heroStats .statAmountCard .statIcon svg{width:20px!important;height:20px!important}
  .heroStats .statValue{font-size:22px!important;margin:1px 0 4px!important}
  .heroStats .statLabel{font-size:11px!important;line-height:1.2!important}
  .heroStats .statChevron{display:none!important}

  .compactCardProduct{grid-template-columns:54px minmax(0,1fr)!important;gap:10px!important}
  .compactCardPhoto{
    width:54px!important;
    height:54px!important;
    object-fit:contain!important;
    object-position:center!important;
    padding:2px!important;
    background:#fff!important;
  }
  .compactCardMeta{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    align-items:end!important;
    gap:10px!important;
    margin-top:8px!important;
    padding-top:7px!important;
    text-align:initial!important;
  }
  .compactCardReturnTtn{
    min-width:0!important;
    display:inline-flex!important;
    align-items:center!important;
    gap:4px!important;
    justify-self:start!important;
    align-self:end!important;
    color:#344054!important;
    font-size:11.5px!important;
    line-height:1.2!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  .compactCardReturnTtn strong{font-weight:750!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .compactCardTtnIcon{color:#087a3d!important;font-size:13px!important;font-weight:800!important}
  .compactCardTtnLabel{color:#98a2b3!important;font-size:10px!important;font-weight:750!important;text-transform:uppercase!important;letter-spacing:.03em!important}
  .compactCardTtnEmpty{display:block!important;min-width:0!important}
  .compactCardMetaRight{
    display:flex!important;
    flex-direction:column!important;
    align-items:flex-end!important;
    gap:2px!important;
    min-width:0!important;
    text-align:right!important;
  }
  .compactCardSupplierBottom,.compactCardDateBottom{display:block!important;text-align:right!important}
}
@media(max-width:390px){
  .heroSetup{margin-left:-71px!important;width:calc(100% + 71px)!important}
  .dashboardHero .periodSyncCard,.dashboardHero .heroPeriod,.dashboardHero .heroSync{min-height:57px!important}
  .dashboardHero .heroSettings,.dashboardHero .heroAdd{height:42px!important;min-height:42px!important;font-size:13px!important}
  .heroStats .statCard{min-height:78px!important;padding:8px 9px!important}
  .compactCardProduct{grid-template-columns:52px minmax(0,1fr)!important}
  .compactCardPhoto{width:52px!important;height:52px!important}
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

document.addEventListener('DOMContentLoaded',function(){
  var period=document.querySelector('.dashboardHero .heroPeriod');
  var periodText=period&&period.querySelector('.heroPeriodText');
  if(periodText)periodText.innerHTML='<small>Період</small><strong>За період</strong>';
  if(period&&!period.querySelector('.periodChevronSvg')){
    var chevron=document.createElement('span');
    chevron.className='periodChevronSvg';
    chevron.setAttribute('aria-hidden','true');
    chevron.innerHTML='<svg viewBox="0 0 20 20"><path d="m5 7 5 6 5-6"></path></svg>';
    var panel=period.querySelector('.periodInputs');
    period.insertBefore(chevron,panel||null);
  }

  var add=document.querySelector('.dashboardHero .heroAdd');
  if(add){
    add.innerHTML='<span class="heroAddIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></span><span>Додати</span>';
  }

  var totalIcon=document.querySelector('.statTotalCard .statIcon');
  if(totalIcon) totalIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5 12 4l7 3.5v8L12 20l-7-4.5Z"></path><path d="m5 7.5 7 4 7-4M12 11.5V20"></path><path d="M9 14.5H6.5V12"></path><path d="M6.5 14.5a4.8 4.8 0 0 0 4 2.4"></path></svg>';
  var waitingIcon=document.querySelector('.statWaitingCard .statIcon');
  if(waitingIcon) waitingIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5v5l3.5 2"></path></svg>';
  var amountIcon=document.querySelector('.statAmountCard .statIcon');
  if(amountIcon) amountIcon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle><path d="M6 9h.01M18 15h.01"></path></svg>';
});

document.addEventListener('DOMContentLoaded',function(){
  var baseMobileCardHtml=window.mobileCardHtml;
  if(typeof baseMobileCardHtml!=='function')return;
  window.mobileCardHtml=function(row){
    var html=baseMobileCardHtml(row);
    var ttn='<span class="compactCardTtnEmpty"></span>';
    if(row&&row.returnTtn){
      var url=rmTrackingUrl_(row.returnTtn);
      var inner='<span class="compactCardTtnIcon">↩</span><span class="compactCardTtnLabel">ТТН</span><strong>'+esc(row.returnTtn)+'</strong>';
      ttn=url
        ? '<a class="compactCardReturnTtn" href="'+attr(url)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()" ontouchstart="event.stopPropagation()">'+inner+'</a>'
        : '<span class="compactCardReturnTtn">'+inner+'</span>';
    }
    var marker='<div class="compactCardMeta">';
    var start=html.indexOf(marker);
    if(start<0)return html;
    var innerStart=start+marker.length;
    var end=html.indexOf('</div>',innerStart);
    if(end<0)return html;
    var inner=html.slice(innerStart,end);
    return html.slice(0,start)+marker+ttn+'<span class="compactCardMetaRight">'+inner+'</span>'+html.slice(end);
  };
  if(window.innerWidth<=760&&typeof window.renderRows==='function')window.renderRows();
});

window.addEventListener('load',function(){
  var baseRenderDetails=window.renderDetails;
  if(typeof baseRenderDetails==='function'){
    window.renderDetails=function(){
      baseRenderDetails();
      var copyButton=document.querySelector('#drawerBody .refCopyAll');
      if(copyButton){
        copyButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect></svg> Знімок повернення';
      }
    };
  }

  window.copySupplierData=async function(id){
    var row=(model.rows||[]).find(function(item){return item.id===id;});
    if(!row)return;
    var statusItem=(model.config.returnStatuses||[]).find(function(item){return item.id===row.returnStatus;});
    var pickupItem=(model.config.pickupStatuses||[]).find(function(item){return item.id===row.supplierPickupStatus;});
    var supplierOrder=row.supplierOrderNumber?('#'+row.supplierOrderNumber):'—';
    if(row.supplierOrderUrl)supplierOrder+=' '+row.supplierOrderUrl;
    var dateValue=row.returnDate||row.arrivedAt||row.returnStartedAt||'';
    var text=[
      'Повернення '+(row.returnNumber||'—'),
      '',
      'Постачальник: '+(row.supplierName||'—'),
      'Замовлення джерела: '+(row.orderNumber?('#'+row.orderNumber):'—'),
      'Товар: '+(row.productName||'—'),
      '',
      'Причина: '+(reasonLabel(row.returnReason,row.returnReasonComment)||'—'),
      'Статус повернення: '+(statusItem?statusItem.label:'—'),
      'Забір постачальником: '+(pickupItem?pickupItem.label:(row.supplierPickedUp?'Забрано':'—')),
      '',
      'Першочергова ТТН: '+(row.originalTtn||row.ttn||'—'),
      'ТТН повернення: '+(row.returnTtn||'—'),
      'Замовлення на сайті постачальника: '+supplierOrder,
      '',
      'Сума: '+money(row.amount),
      'Дата повернення: '+(dateValue?fmtDateTimeShort(dateValue):'—')
    ].join('\n');
    var done=function(){toast('Знімок повернення скопійовано');};
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);done();return;}
    }catch(_){ }
    var area=document.createElement('textarea');
    area.value=text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    done();
  };
});

function rmNormalizeTtn_(value){
  return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function rmRowForTtn_(ttn){
  var needle=rmNormalizeTtn_(ttn);
  if(!needle||!window.model)return null;
  return (model.rows||[]).find(function(row){
    return [row.returnTtn,row.originalTtn,row.ttn].some(function(value){return rmNormalizeTtn_(value)===needle;});
  })||null;
}
function rmTrackingUrl_(ttn){
  var n=rmNormalizeTtn_(ttn);
  if(!n)return '';
  var row=rmRowForTtn_(n);
  var carrier=String(row&&row.carrier||'').toLowerCase();
  var digitsOnly=/^[0-9]+$/.test(n);
  var novaByNumber=digitsOnly&&n.length===14;
  var ukrByNumber=digitsOnly&&((n.length===13&&(n.indexOf('042')===0||n.indexOf('050')===0))||(n.length===12&&(n.indexOf('42')===0||n.indexOf('50')===0)));
  if(/нова|novaposhta|nova post/.test(carrier)||novaByNumber) return 'https://novaposhta.ua/tracking/'+encodeURIComponent(n);
  if(/укр|ukrposhta/.test(carrier)||ukrByNumber){
    if(n.length===12&&(n.indexOf('42')===0||n.indexOf('50')===0)) n='0'+n;
    return 'https://track.ukrposhta.ua/tracking_UA.html?barcode='+encodeURIComponent(n);
  }
  return '';
}
function rmMarkTrackingLinks_(){
  document.querySelectorAll('#drawerBody .refRow').forEach(function(row){
    var label=row.querySelector('.refRowLabel');
    var value=row.querySelector('.refRowValue');
    if(!label||!value)return;
    var text=String(label.textContent||'').trim();
    if(text!=='Першочергова ТТН'&&text!=='ТТН повернення')return;
    var ttn=String(value.textContent||'').trim();
    if(!ttn||ttn==='—')return;
    value.classList.add('rmTrackingLink');
    value.dataset.ttn=ttn;
    value.title='Відкрити відстеження';
  });
}
document.addEventListener('click',function(event){
  var link=event.target&&event.target.closest?event.target.closest('.compactCardReturnTtn'):null;
  if(!link)return;
  var href=link.getAttribute('href')||'';
  if(!href){
    var strong=link.querySelector('strong');
    href=rmTrackingUrl_(strong?strong.textContent:'');
  }
  if(!href)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.open(href,'_blank','noopener');
},true);
document.addEventListener('click',function(event){
  var target=event.target&&event.target.closest?event.target.closest('.rmTrackingLink'):null;
  if(!target)return;
  var ttn=target.dataset.ttn||target.textContent||'';
  var url=rmTrackingUrl_(ttn);
  if(!url)return;
  event.preventDefault();
  event.stopPropagation();
  window.open(url,'_blank','noopener');
},true);
window.addEventListener('load',function(){
  setTimeout(function(){
    var finalRender=window.renderDetails;
    if(typeof finalRender==='function'&&!finalRender.__rmTrackingWrapped){
      var wrapped=function(){finalRender();rmMarkTrackingLinks_();};
      wrapped.__rmTrackingWrapped=true;
      window.renderDetails=wrapped;
    }
    rmMarkTrackingLinks_();
  },0);
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