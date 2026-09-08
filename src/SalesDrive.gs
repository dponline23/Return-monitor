function syncSalesDrive_(){
  const p=PropertiesService.getScriptProperties();
  const template=p.getProperty('SALESDRIVE_API_URL_TEMPLATE');
  if(!template) return {ok:false,skipped:true,reason:'SALESDRIVE_API_URL_TEMPLATE not set'};

  const token=p.getProperty('SALESDRIVE_API_TOKEN')||'';
  const url=template.replace(/\{\{TOKEN\}\}/g,encodeURIComponent(token));
  const response=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,headers:{Accept:'application/json'}});
  const code=response.getResponseCode();
  if(code<200||code>=300) return {ok:false,httpCode:code,message:response.getContentText().slice(0,300)};

  const json=JSON.parse(response.getContentText()||'{}');
  const source=Array.isArray(json)?json:(json.data||json.orders||json.items||json.list||[]);
  const orders=source.map(normalizeSalesDriveOrder_).filter(o=>o.salesDriveId&&o.ttn);
  const saved=upsertSalesDriveOrders_(orders);
  return {ok:true,received:source.length,usable:orders.length,inserted:saved.inserted,updated:saved.updated};
}

function normalizeSalesDriveOrder_(raw){
  const products=firstValue_(raw,['products','items','orderProducts','productData']);
  const delivery=firstValue_(raw,['delivery','shipping','deliveryData','shippingData'])||{};
  const client=firstValue_(raw,['client','customer','contact'])||{};
  const status=compactText_(firstValue_(raw,['deliveryStatus','shippingStatus','statusDelivery','delivery.status','shipping.status']));

  return {
    salesDriveId:String(firstValue_(raw,['id','orderId','order_id','requestId'])||''),
    orderNumber:String(firstValue_(raw,['number','orderNumber','order_number','id'])||''),
    orderDate:firstValue_(raw,['createdAt','created_at','dateCreated','date','created']),
    shop:compactText_(firstValue_(raw,['shop','source','site','marketplace','formName'])),
    customer:compactText_(firstValue_(raw,['client.name','customer.name','contact.name','name','fio'])),
    phone:compactText_(firstValue_(raw,['client.phone','customer.phone','contact.phone','phone'])),
    product:compactText_(products),
    sku:compactText_(firstValue_(raw,['sku','article','vendorCode','products.0.sku','items.0.sku'])),
    amount:Number(firstValue_(raw,['total','amount','totalPrice','price'])||0),
    carrier:compactText_(firstValue_(raw,['deliveryService','carrier','shippingService','delivery.service','shipping.service'])),
    ttn:compactText_(firstValue_(raw,['ttn','trackingNumber','tracking_number','declaration','delivery.ttn','shipping.ttn','delivery.trackingNumber'])),
    deliveryStatus:status,
    deliveryCode:compactText_(firstValue_(raw,['deliveryStatusCode','shippingStatusCode','delivery.statusCode'])),
    isReturn:looksLikeReturn_(status),
    statusSource:'SalesDrive',
    promId:String(firstValue_(raw,['promId','promOrderId','externalId'])||''),
    note:''
  };
}
