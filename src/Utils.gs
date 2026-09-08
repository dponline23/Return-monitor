function dateIso_(value){
  if(!value) return '';
  const d=value instanceof Date?value:new Date(value);
  return isNaN(d.getTime())?'':d.toISOString();
}

function parseDate_(value){
  if(!value) return '';
  const d=value instanceof Date?value:new Date(value);
  return isNaN(d.getTime())?'':d;
}

function toBool_(value){
  const s=String(value).toLowerCase();
  return value===true||value===1||s==='true'||s==='так'||s==='yes';
}

function daysBetween_(a,b){
  const x=new Date(a),y=new Date(b);
  if(isNaN(x.getTime())||isNaN(y.getTime())) return 0;
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
