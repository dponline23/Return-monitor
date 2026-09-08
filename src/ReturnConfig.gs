const RETURN_STATUS_CONFIG = Object.freeze({
  expected: Object.freeze({label:'Очікується повернення', tone:'warning'}),
  in_transit: Object.freeze({label:'В дорозі', tone:'info'}),
  arrived: Object.freeze({label:'Прибуло', tone:'success-soft'}),
  completed: Object.freeze({label:'Завершено', tone:'success'}),
  cancelled: Object.freeze({label:'Скасовано', tone:'neutral'})
});

const SUPPLIER_PICKUP_CONFIG = Object.freeze({
  not_handed_over: Object.freeze({label:'Не передано', tone:'danger-soft'}),
  waiting_pickup: Object.freeze({label:'Очікує забору', tone:'warning'}),
  picked_up: Object.freeze({label:'Забрано', tone:'success'})
});

const DEFAULT_RETURN_REASONS = Object.freeze([
  Object.freeze({id:'not_picked_up', name:'Не забрали'}),
  Object.freeze({id:'customer_refusal', name:'Відмова клієнта'}),
  Object.freeze({id:'not_fit', name:'Не підійшов товар'}),
  Object.freeze({id:'not_liked', name:'Не сподобався товар'}),
  Object.freeze({id:'damaged', name:'Пошкодження'}),
  Object.freeze({id:'defect', name:'Брак'}),
  Object.freeze({id:'packing_error', name:'Помилка комплектації'}),
  Object.freeze({id:'other', name:'Інше'})
]);

const RETURN_SOURCE_VALUES = Object.freeze(['manual','salesdrive','nova_poshta','ukrposhta','meest','rozetka','api']);

function publicReturnConfig_(){
  return {
    returnStatuses:Object.keys(RETURN_STATUS_CONFIG).map(id=>({id:id,label:RETURN_STATUS_CONFIG[id].label,tone:RETURN_STATUS_CONFIG[id].tone})),
    pickupStatuses:Object.keys(SUPPLIER_PICKUP_CONFIG).map(id=>({id:id,label:SUPPLIER_PICKUP_CONFIG[id].label,tone:SUPPLIER_PICKUP_CONFIG[id].tone})),
    sources:RETURN_SOURCE_VALUES.slice()
  };
}
