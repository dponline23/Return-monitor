function buildDashboard_(){
  const all=readReturnRows_();
  const rows=all.filter(r=>r.isReturn||looksLikeReturn_(r.deliveryStatus));
  const counts={returning:0,arrived:0,waiting:0,closed:0,total:rows.length};

  rows.forEach(r=>{
    r.bucket=bucket_(r);
    counts[r.bucket]++;
    r.daysWaiting=r.arrivedAt&&!r.supplierTaken?daysBetween_(r.arrivedAt,new Date()):0;
  });

  rows.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  return {rows:rows,counts:counts,setup:getSetupStatus_(),generatedAt:new Date().toISOString()};
}

function bucket_(r){
  if(r.supplierTaken) return 'closed';
  if(r.arrivedAt&&r.supplier&&r.supplierOrder) return 'waiting';
  if(r.arrivedAt) return 'arrived';
  return 'returning';
}

function looksLikeReturn_(status){
  return /повер|відмов|не забра|відправник/i.test(String(status||''));
}
