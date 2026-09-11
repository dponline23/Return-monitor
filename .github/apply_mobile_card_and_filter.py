from pathlib import Path
import re

# 1) Mobile return card markup
index = Path('src/Index.html')
s = index.read_text(encoding='utf-8')
new_card = r'''function mobileCardHtml(row){
  const supplierName=row.supplierName||'Постачальник не вказаний';
  const notified=row.supplierNotified?'<span class="mobileReturnNotified">✓ сповіщено</span>':'';
  const orderNumber=row.supplierOrderNumber?('#'+esc(row.supplierOrderNumber)):'—';
  const orderHtml=row.supplierOrderUrl
    ?`<a class="mobileReturnOrder" href="${attr(row.supplierOrderUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${orderNumber}</a>`
    :`<span class="mobileReturnOrder">${orderNumber}</span>`;
  const image=row.productImage
    ?`<img src="${attr(row.productImage)}" alt="" onerror="this.remove()">`
    :'<span class="mobileReturnImagePlaceholder">▧</span>';
  return `<article class="returnCard mobileReturnCard" onclick="openDetails('${jsq(row.id)}')">
    <div class="mobileReturnHeader">
      <div class="mobileReturnIdentity">
        <div class="mobileReturnLine">
          <span class="mobileReturnIcon mobileReturnDocIcon">▤</span>
          <strong class="mobileReturnNumber">${esc(row.returnNumber||'—')}</strong>
        </div>
        <div class="mobileReturnLine mobileReturnSupplierLine">
          <span class="mobileReturnIcon mobileReturnShopIcon">⌂</span>
          <div class="mobileReturnSupplierWrap"><strong class="mobileReturnSupplier">${esc(supplierName)}</strong>${notified}</div>
        </div>
        <div class="mobileReturnOrderLine">${orderHtml}</div>
      </div>
      <div class="mobileReturnAmount">${money(row.amount)}</div>
    </div>

    <div class="mobileReturnDivider"></div>

    <div class="mobileReturnProduct">
      <div class="mobileReturnImage">${image}</div>
      <div class="mobileReturnProductName">${esc(row.productName||'Товар не вказано')}</div>
    </div>

    <div class="mobileReturnBadges">
      <span class="reasonPill mobileReturnReason">${esc(reasonLabel(row.returnReason,row.returnReasonComment)||'Причина не вказана')}</span>
      ${statusBadge(row.returnStatus)}
      ${pickupBadge(row.supplierPickupStatus)}
    </div>

    <div class="mobileReturnDate"><span class="mobileReturnClock">◷</span><span>${fmtDateTimeShort(row.returnDate||row.arrivedAt||row.returnStartedAt)}</span></div>
  </article>`;
}'''
pattern = r'function mobileCardHtml\(row\)\{.*?\nfunction emptyStateHtml\(\)'
m = re.search(pattern, s, flags=re.S)
if not m:
    raise SystemExit('mobileCardHtml block not found')
s = s[:m.start()] + new_card + '\nfunction emptyStateHtml()' + s[m.end():]
index.write_text(s, encoding='utf-8')

# 2) Strong mobile card CSS overrides
styles = Path('src/Styles.html')
s = styles.read_text(encoding='utf-8')
marker = '/* MOBILE_RETURN_CARD_V4 */'
# Remove older V4 block if re-run
s = re.sub(r'<style>\s*/\* MOBILE_RETURN_CARD_V4 \*/.*?</style>\s*', '', s, flags=re.S)
css = r'''
<style>
/* MOBILE_RETURN_CARD_V4 */
@media(max-width:760px){
  .mobileCards{gap:14px!important}
  .returnCard.mobileReturnCard{
    background:#fff!important;
    border:1px solid #edf0f3!important;
    border-radius:22px!important;
    padding:16px!important;
    box-shadow:0 8px 26px rgba(16,24,40,.045)!important;
    overflow:hidden!important;
  }
  .mobileReturnHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
  .mobileReturnIdentity{min-width:0;flex:1 1 auto;display:grid;gap:12px}
  .mobileReturnLine{display:flex;align-items:center;gap:12px;min-width:0}
  .mobileReturnIcon{
    width:44px;height:44px;border-radius:13px;background:#f3f6fa;color:#7b8799;
    display:grid;place-items:center;flex:0 0 44px;font-size:20px;font-weight:800
  }
  .mobileReturnNumber{font-size:19px;line-height:1.1;font-weight:800;letter-spacing:-.02em;word-break:break-word}
  .mobileReturnSupplierWrap{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
  .mobileReturnSupplier{font-size:17px;line-height:1.15;font-weight:800;word-break:break-word}
  .mobileReturnNotified{
    display:inline-flex;align-items:center;min-height:30px;padding:6px 10px;border-radius:999px;
    background:#e5f8ec;color:#118246;font-size:12px;font-weight:800;white-space:nowrap
  }
  .mobileReturnOrderLine{margin-left:56px;min-height:18px;color:#8a94a6;font-size:13px;font-weight:700}
  .mobileReturnOrder{color:#8a94a6!important;text-decoration:none!important}
  .mobileReturnAmount{
    flex:0 0 auto;padding:13px 15px;border-radius:16px;background:#f3f6fa;
    font-size:18px;line-height:1;font-weight:800;white-space:nowrap
  }
  .mobileReturnDivider{height:1px;background:#edf0f3;margin:15px 0}
  .mobileReturnProduct{display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center;gap:14px}
  .mobileReturnImage{
    width:64px;height:64px;border-radius:14px;background:#f3f6fa;overflow:hidden;
    display:grid;place-items:center;color:#98a2b3
  }
  .mobileReturnImage img{width:100%;height:100%;object-fit:cover;display:block}
  .mobileReturnImagePlaceholder{font-size:20px;color:#98a2b3}
  .mobileReturnProductName{font-size:16px;line-height:1.32;font-weight:700;word-break:break-word}
  .mobileReturnBadges{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .mobileReturnBadges .reasonPill,.mobileReturnBadges .badge{
    display:inline-flex!important;align-items:center!important;min-height:32px!important;
    padding:7px 11px!important;border-radius:999px!important;font-size:12px!important;
    line-height:1!important;font-weight:700!important;white-space:nowrap!important
  }
  .mobileReturnDate{display:flex;align-items:center;gap:8px;margin-top:14px;color:#7b8493;font-size:13px;font-weight:600}
  .mobileReturnClock{font-size:18px;line-height:1}
  .returnCard.mobileReturnCard>.pickupAction{display:none!important}
}
@media(max-width:430px){
  .returnCard.mobileReturnCard{padding:14px!important;border-radius:20px!important}
  .mobileReturnIdentity{gap:10px}
  .mobileReturnIcon{width:40px;height:40px;flex-basis:40px;border-radius:12px;font-size:18px}
  .mobileReturnNumber{font-size:17px}
  .mobileReturnSupplier{font-size:15px}
  .mobileReturnNotified{min-height:28px;padding:6px 9px;font-size:11px}
  .mobileReturnOrderLine{margin-left:52px;font-size:12px}
  .mobileReturnAmount{padding:12px 13px;font-size:16px;border-radius:14px}
  .mobileReturnProduct{grid-template-columns:58px minmax(0,1fr);gap:12px}
  .mobileReturnImage{width:58px;height:58px;border-radius:13px}
  .mobileReturnProductName{font-size:14.5px}
  .mobileReturnBadges .reasonPill,.mobileReturnBadges .badge{min-height:30px!important;padding:6px 10px!important;font-size:11.5px!important}
  .mobileReturnDate{font-size:12px}
}
</style>
'''
s = s.rstrip() + '\n' + css.strip() + '\n'
styles.write_text(s, encoding='utf-8')

# 3) Tighten what counts as a return in dashboard, so previously auto-created ordinary shipments disappear.
data_model = Path('src/DataModel.gs')
s = data_model.read_text(encoding='utf-8')
old = r'''function isReturnRecord_(row){
  if(!row) return false;
  if(row.source==='manual') return true;
  if(row.returnNumber||row.returnStartedAt||row.returnStatus) return true;
  return looksLikeReturn_(row.deliveryStatus);
}'''
new = r'''function isReturnRecord_(row){
  if(!row) return false;
  if(String(row.source||'').toLowerCase()==='manual') return true;

  // A generated RTN number / generic in_transit status is not proof of a return.
  // For synced SalesDrive rows require a real return signal from logistics/status,
  // a separate return TTN, or an already confirmed user action.
  if(row.supplierPickedUp||row.supplierNotified||row.arrivedAt) return true;
  if(looksLikeReturn_(row.deliveryStatus)) return true;

  const original=normalizeTrackingNumber_(row.originalTtn||row.ttn||'');
  const returned=normalizeTrackingNumber_(row.returnTtn||'');
  if(returned&&original&&returned!==original) return true;

  return false;
}'''
if old not in s:
    raise SystemExit('isReturnRecord_ block not found')
s = s.replace(old, new)
data_model.write_text(s, encoding='utf-8')

# 4) Do not create/update ordinary SalesDrive shipments as return rows in future.
sd = Path('src/SalesDrive.gs')
s = sd.read_text(encoding='utf-8')
old = '''  const saved=upsertSalesDriveOrders_(unique);\n  const imageSaved=saveSalesDriveProductImages_(unique);\n  const detectedReturns=unique.filter(item=>item.isReturn).length;'''
new = '''  const returnItems=unique.filter(item=>item.isReturn);\n  const saved=upsertSalesDriveOrders_(returnItems);\n  const imageSaved=saveSalesDriveProductImages_(returnItems);\n  const detectedReturns=returnItems.length;'''
if old not in s:
    raise SystemExit('SalesDrive upsert block not found')
s = s.replace(old, new)
s = s.replace('    usable:unique.length,', '    usable:returnItems.length,')
sd.write_text(s, encoding='utf-8')

print('Applied mobile card V4 and return-only SalesDrive filter')
