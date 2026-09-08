function readReturnRows_(){
  const sh=ensureDatabase_();
  const last=sh.getLastRow();
  if(last<2) return [];
  return sh.getRange(2,1,last-1,RETURN_HEADERS.length).getValues().map((r,i)=>rowToObject_(r,i+2));
}

function rowToObject_(r,rowNumber){
  return {
    rowNumber:rowNumber,
    salesDriveId:String(r[0]||''),
    orderNumber:String(r[1]||''),
    orderDate:dateIso_(r[2]),
    shop:String(r[3]||''),
    customer:String(r[4]||''),
    phone:String(r[5]||''),
    product:String(r[6]||''),
    sku:String(r[7]||''),
    amount:Number(r[8]||0),
    carrier:String(r[9]||''),
    ttn:String(r[10]||''),
    deliveryStatus:String(r[11]||''),
    deliveryCode:String(r[12]||''),
    isReturn:toBool_(r[13]),
    returnStartedAt:dateIso_(r[14]),
    arrivedAt:dateIso_(r[15]),
    supplier:String(r[16]||''),
    supplierOrder:String(r[17]||''),
    supplierTaken:toBool_(r[18]),
    closedAt:dateIso_(r[19]),
    updatedAt:dateIso_(r[20]),
    statusSource:String(r[21]||''),
    promId:String(r[22]||''),
    note:String(r[23]||'')
  };
}

function objectToRow_(o){
  return [
    o.salesDriveId||'',o.orderNumber||'',parseDate_(o.orderDate),o.shop||'',o.customer||'',o.phone||'',
    o.product||'',o.sku||'',Number(o.amount||0),o.carrier||'',o.ttn||'',o.deliveryStatus||'',o.deliveryCode||'',
    Boolean(o.isReturn),parseDate_(o.returnStartedAt),parseDate_(o.arrivedAt),o.supplier||'',o.supplierOrder||'',
    Boolean(o.supplierTaken),parseDate_(o.closedAt),new Date(),o.statusSource||'',o.promId||'',o.note||''
  ];
}
