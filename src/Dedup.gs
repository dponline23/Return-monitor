function reconcileReturnData_(){
  const dedupe=deduplicateShipmentRows_();
  const legs=reconcileSalesDriveReturnLegs_();
  return {dedupe:dedupe,legs:legs};
}

function deduplicateShipmentRows_(){
  const sh=returnSheetFast_();
  const rows=readReturnRows_();
  const groups=new Map();

  rows.forEach(row=>{
    const ttn=normalizeTrackingNumber_(row.ttn||row.returnTtn||'');
    if(!ttn) return;
    const carrier=normalizeCarrierKey_(row.carrier);
    const key=carrier+'|'+ttn;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row);
  });

  const deleteRows=[];
  let mergedCount=0;
  groups.forEach(group=>{
    if(group.length<2) return;
    const ordered=group.slice().sort((a,b)=>shipmentRowScore_(b)-shipmentRowScore_(a));
    const winner=Object.assign({},ordered[0]);
    ordered.slice(1).forEach(loser=>mergeReturnAnnotations_(winner,loser));
    winner.updatedAt=new Date().toISOString();
    sh.getRange(winner.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalizeReturnState_(winner,false))]);
    ordered.slice(1).forEach(loser=>deleteRows.push(loser.rowNumber));
    mergedCount+=ordered.length-1;
  });

  Array.from(new Set(deleteRows)).sort((a,b)=>b-a).forEach(rowNumber=>sh.deleteRow(rowNumber));
  return {removed:deleteRows.length,merged:mergedCount};
}

function reconcileSalesDriveReturnLegs_(){
  const sh=returnSheetFast_();
  const rows=readReturnRows_();
  const groups=new Map();
  rows.forEach(row=>{
    const id=String(row.salesDriveId||'').trim();
    if(!id) return;
    if(!groups.has(id)) groups.set(id,[]);
    groups.get(id).push(row);
  });

  let corrected=0;
  groups.forEach(group=>{
    if(group.length<2) return;
    const children=group.filter(row=>{
      const t=normalizeTrackingNumber_(row.ttn);
      const parent=normalizeTrackingNumber_(row.originalTtn);
      return t&&parent&&t!==parent;
    });
    if(!children.length) return;

    const canonical=children.slice().sort((a,b)=>shipmentRowScore_(b)-shipmentRowScore_(a))[0];
    const merged=Object.assign({},canonical);
    group.filter(row=>row.rowNumber!==canonical.rowNumber).forEach(row=>mergeReturnAnnotations_(merged,row));
    if(!merged.returnNumber) merged.returnNumber=generateReturnNumber_();
    merged.returnTtn=merged.ttn||canonical.returnTtn||'';
    merged.originalTtn=canonical.originalTtn||merged.originalTtn||'';
    merged.updatedAt=new Date().toISOString();
    sh.getRange(canonical.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(normalizeReturnState_(merged,false))]);

    group.forEach(row=>{
      if(row.rowNumber===canonical.rowNumber||row.supplierPickedUp) return;
      const clean=Object.assign({},row,{
        returnNumber:'',
        returnStatus:'',
        supplierPickupStatus:'not_handed_over',
        returnDate:'',
        returnStartedAt:'',
        arrivedAt:'',
        returnTtn:'',
        supplierNotified:false,
        supplierNotifiedAt:'',
        updatedAt:new Date().toISOString()
      });
      sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(clean)]);
      corrected++;
    });
  });
  return {corrected:corrected};
}

function mergeReturnAnnotations_(target,source){
  const copyIfEmpty=['returnNumber','supplierId','supplierName','supplierOrderNumber','supplierOrderUrl','productImage','returnReason','returnReasonComment','returnDate','returnStartedAt','arrivedAt','originalTtn','returnTtn'];
  copyIfEmpty.forEach(key=>{ if(!target[key]&&source[key]) target[key]=source[key]; });
  if(!target.productName&&source.productName) target.productName=source.productName;
  if(!target.amount&&source.amount) target.amount=source.amount;
  if(source.supplierNotified&&!target.supplierNotified){
    target.supplierNotified=true;
    target.supplierNotifiedAt=source.supplierNotifiedAt||target.supplierNotifiedAt||'';
  }
  if(source.supplierPickedUp&&!target.supplierPickedUp){
    target.supplierPickedUp=true;
    target.supplierPickedUpAt=source.supplierPickedUpAt||target.supplierPickedUpAt||'';
    target.supplierPickupStatus='picked_up';
  }
  if(!target.returnStatus&&source.returnStatus) target.returnStatus=source.returnStatus;
  if(!target.note&&source.note) target.note=source.note;
  return target;
}

function shipmentRowScore_(row){
  let score=0;
  if(row.supplierPickedUp) score+=1000;
  if(row.returnNumber) score+=500;
  if(row.supplierNotified) score+=120;
  if(row.supplierName) score+=80;
  if(row.returnReason) score+=60;
  if(row.supplierOrderNumber) score+=40;
  if(normalizeTrackingNumber_(row.originalTtn)&&normalizeTrackingNumber_(row.originalTtn)!==normalizeTrackingNumber_(row.ttn)) score+=250;
  if(/видален|deleted/i.test(String(row.deliveryStatus||''))) score-=200;
  const date=parseDate_(row.updatedAt||row.orderDate||row.createdAt);
  if(date) score+=Math.min(50,date.getTime()/1e12);
  return score;
}

function normalizeTrackingNumber_(value){
  return String(value||'').trim().replace(/\s+/g,'').toUpperCase();
}

function normalizeCarrierKey_(value){
  const c=String(value||'').trim().toLowerCase();
  if(/нова|novaposhta|nova post/.test(c)) return 'nova';
  if(/укр|ukrposhta/.test(c)) return 'ukr';
  if(/meest|міст/.test(c)) return 'meest';
  if(/rozetka|розетка/.test(c)) return 'rozetka';
  return c||'unknown';
}
