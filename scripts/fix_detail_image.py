from pathlib import Path

# Patch Index.html: detail images must be loaded through Apps Script/Drive first,
# rather than by making a second browser request to Google Drive.
p = Path('src/Index.html')
s = p.read_text(encoding='utf-8')

start = s.index('function hydrateDetailProductImage(imageUrl){')
end = s.index('function mobileCardHtml(row){', start)
hydrate = r'''function hydrateDetailProductImage(imageUrl){
  const shell=document.getElementById('detailProductImageShell');
  const raw=String(imageUrl||'').trim();
  if(!shell||!raw)return;

  function placeholder(){
    if(!shell||!shell.isConnected)return;
    shell.classList.remove('loading');
    shell.innerHTML='<div class="detailImagePlaceholder">▧</div>';
  }

  function directFallback(){
    if(!shell||!shell.isConnected)return;
    shell.classList.remove('loading');
    const html=productImageTag(raw,'detailProductImage');
    shell.innerHTML=html||'<div class="detailImagePlaceholder">▧</div>';
  }

  shell.classList.add('loading');
  shell.innerHTML='<div class="detailImagePlaceholder">▧</div>';

  google.script.run
    .withSuccessHandler(function(dataUrl){
      if(!shell||!shell.isConnected)return;
      if(dataUrl && /^data:image\//i.test(String(dataUrl))){
        const img=document.createElement('img');
        img.className='detailProductImage';
        img.alt='';
        img.decoding='async';
        img.onload=function(){ if(shell&&shell.isConnected)shell.classList.remove('loading'); };
        img.onerror=directFallback;
        img.src=dataUrl;
        shell.replaceChildren(img);
      }else{
        directFallback();
      }
    })
    .withFailureHandler(directFallback)
    .apiGetProductImageData(raw);
}
'''
s = s[:start] + hydrate + s[end:]

# renderDetails currently uses productImageTag directly. Replace that with a shell.
lines = s.splitlines()
out = []
replaced_detail = False
for line in lines:
    if 'const detailImage=row.productImage?productImageTag' in line:
        continue
    if 'const productBlock=(row.productName||row.productImage)?' in line:
        out.append("  const productBlock=(row.productName||row.productImage)?`<section class=\"detailSection\"><h3>Товар</h3><div class=\"detailProduct\">${row.productImage?'<div class=\"detailImageShell loading\" id=\"detailProductImageShell\"><div class=\"detailImagePlaceholder\">▧</div></div>':'<div class=\"detailImagePlaceholder\">▧</div>'}<div><strong>${esc(row.productName||'Товар')}</strong></div></div></section>`:'';")
        replaced_detail = True
        continue
    out.append(line)
if not replaced_detail:
    raise SystemExit('detail productBlock target not found')
s = '\n'.join(out) + '\n'

# Ensure exactly one hydrate call at the end of renderDetails.
s = s.replace('\n  if(row.productImage)hydrateDetailProductImage(row.productImage);\n}\nfunction togglePickupMenu()', '\n}\nfunction togglePickupMenu()', 1)
marker = '\n}\nfunction togglePickupMenu()'
if marker not in s:
    raise SystemExit('renderDetails end marker not found')
s = s.replace(marker, '\n  if(row.productImage)hydrateDetailProductImage(row.productImage);\n}\nfunction togglePickupMenu()', 1)
p.write_text(s, encoding='utf-8')

# Patch DataActions.gs: always return a browser-safe data:image URL.
p = Path('src/DataActions.gs')
s = p.read_text(encoding='utf-8')
start = s.index('function apiGetProductImageData(imageUrl){')
server = r'''function apiGetProductImageData(imageUrl){
  const raw=String(imageUrl||'').trim();
  if(!raw) return '';
  let m=raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/i);
  if(!m) m=raw.match(/\/d\/([A-Za-z0-9_-]{10,})/i);
  if(!m) return '';
  try{
    const file=DriveApp.getFileById(m[1]);
    let blob=null;
    try{ blob=file.getThumbnail(); }catch(_){ }
    if(!blob) blob=file.getBlob();

    let mime=String(blob.getContentType()||'').toLowerCase();
    if(!/^image\//i.test(mime)) mime=String(file.getMimeType()||'').toLowerCase();
    if(!/^image\//i.test(mime)){
      const name=String(file.getName()||'').toLowerCase();
      if(name.endsWith('.png')) mime='image/png';
      else if(name.endsWith('.webp')) mime='image/webp';
      else if(name.endsWith('.gif')) mime='image/gif';
      else mime='image/jpeg';
    }

    const bytes=blob.getBytes();
    return 'data:'+mime+';base64,'+Utilities.base64Encode(bytes);
  }catch(err){
    return '';
  }
}
'''
# apiGetProductImageData is the last function in DataActions.gs in this project.
s = s[:start] + server
p.write_text(s, encoding='utf-8')
