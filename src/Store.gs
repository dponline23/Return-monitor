const RETURN_HEADERS = ['SalesDrive ID','№ замовлення','Дата','Магазин','Клієнт','Телефон','Товар','Артикул','Сума','Перевізник','ТТН','Статус доставки','Код статусу','Повернення','Дата початку повернення','Дата прибуття','Постачальник','№ замовлення постачальника','Забрано постачальником','Дата закриття','Оновлено','Джерело статусу','Prom ID','Примітка'];

function db_(){ return SpreadsheetApp.openById(RETURN_MONITOR.spreadsheetId); }

function ensureDatabase_(){
  const ss=db_();
  let sh=ss.getSheetByName(RETURN_MONITOR.returnsSheet);
  if(!sh) sh=ss.insertSheet(RETURN_MONITOR.returnsSheet);
  if(sh.getRange(1,1,1,RETURN_HEADERS.length).getDisplayValues()[0].join('|')!==RETURN_HEADERS.join('|')) sh.getRange(1,1,1,RETURN_HEADERS.length).setValues([RETURN_HEADERS]);
  sh.setFrozenRows(1);
  return sh;
}
