function dateIso_(value){
  if(!value) return '';
  const d=parseDate_(value);
  return d&&d instanceof Date&&!isNaN(d.getTime())?d.toISOString():'';
}

function parseDate_(value){
  if(!value) return '';
  if(value instanceof Date) return isNaN(value.getTime())?'':value;

  const text=String(value).trim();
  if(!text) return '';

  // ISO / RFC formats first.
  const nativeDate=new Date(text);
  if(!isNaN(nativeDate.getTime())) return nativeDate;

  // Carrier APIs and SalesDrive also return localized dates such as
  // 03.09.2026 17:45:47. Parse those explicitly in the project timezone.
  const formats=[
    'dd.MM.yyyy HH:mm:ss',
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy',
    'dd-MM-yyyy HH:mm:ss',
    'dd-MM-yyyy HH:mm',
    'dd-MM-yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm'
  ];
  for(let i=0;i<formats.length;i++){
    try{
      const d=Utilities.parseDate(text,'Europe/Kyiv',formats[i]);
      if(d&&!isNaN(d.getTime())) return d;
    }catch(_){ }
  }
  return '';
}

function toBool_(value){
  const s=String(value).toLowerCase();
  return value===true||value===1||s==='true'||s==='так'||s==='yes';
}

function daysBetween_(a,b){
  const x=parseDate_(a),y=parseDate_(b);
  if(!x||!y) return 0;
  return Math.max(0,Math.floor((y.getTime()-x.getTime())/86400000));
}

function firstValue_(obj,paths){
  for(const path of paths){
    const value=path.split('.').reduce((v,key)=>v&&v[key]!==undefined?v[key]:undefined,obj);
    if(value!==undefined&&value!==null&&value!=='') return value;
  }
  return '';
}

function compactText_(value){
  if(Array.isArray(value)) return value.map(compactText_).filter(Boolean).join(', ');
  if(value&&typeof value==='object') return Object.values(value).map(compactText_).filter(Boolean).join(', ');
  return String(value||'').trim();
}