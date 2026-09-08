function upsertSalesDriveOrders_(orders){
  if(!orders||!orders.length) return {inserted:0,updated:0};
  const sh=ensureDatabase_();
  const current=readReturnRows_();
  const byId=new Map(current.filter(r=>r.salesDriveId).map(r=>[r.salesDriveId,r]));
  let inserted=0,updated=0;

  orders.forEach(order=>{
    const id=String(order.salesDriveId||'');
    if(!id) return;
    const old=byId.get(id);
    if(old){
      const merged=Object.assign({},old,order,{
        supplier:old.supplier,
        supplierOrder:old.supplierOrder,
        supplierTaken:old.supplierTaken,
        closedAt:old.closedAt,
        returnStartedAt:old.returnStartedAt||order.returnStartedAt,
        arrivedAt:old.arrivedAt||order.arrivedAt
      });
      sh.getRange(old.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(merged)]);
      updated++;
    }else{
      sh.appendRow(objectToRow_(order));
      inserted++;
    }
  });
  return {inserted:inserted,updated:updated};
}

function updateTrackingRow_(row,tracking){
  const sh=ensureDatabase_();
  const raw=sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).getValues()[0];
  const current=rowToObject_(raw,row.rowNumber);
  const merged=Object.assign({},current,{
    deliveryStatus:tracking.statusText||current.deliveryStatus,
    deliveryCode:tracking.statusCode||current.deliveryCode,
    statusSource:tracking.source||current.statusSource,
    isReturn:current.isReturn||Boolean(tracking.isReturn),
    returnStartedAt:current.returnStartedAt||tracking.returnStartedAt||'',
    arrivedAt:current.arrivedAt||tracking.arrivedAt||''
  });
  sh.getRange(row.rowNumber,1,1,RETURN_HEADERS.length).setValues([objectToRow_(merged)]);
}

function updateSupplierFields_(rowNumber,supplier,supplierOrder){
  const sh=ensureDatabase_();
  sh.getRange(rowNumber,17,1,2).setValues([[supplier,supplierOrder]]);
  sh.getRange(rowNumber,21).setValue(new Date());
}

function markSupplierTaken_(rowNumber,taken){
  const sh=ensureDatabase_();
  sh.getRange(rowNumber,19).setValue(Boolean(taken));
  sh.getRange(rowNumber,20).setValue(taken?new Date():'');
  sh.getRange(rowNumber,21).setValue(new Date());
}
