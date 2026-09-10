from pathlib import Path

index = Path('src/Index.html')
s = index.read_text(encoding='utf-8')
s = s.replace('<h1><span>Відстеження</span><span>повернень</span></h1>\n        <p>Контроль повернень та отримання їх постачальниками</p>', '<h1>Відстеження повернень</h1>')
index.write_text(s, encoding='utf-8')

styles = Path('src/Styles.html')
s = styles.read_text(encoding='utf-8')
marker = '/* MOBILE_TITLE_COMPACT_V1 */'
if marker not in s:
    block = r'''
<style>
/* MOBILE_TITLE_COMPACT_V1 */
@media (max-width:760px){
  .dashboardHero .heroBrand{
    grid-template-columns:50px minmax(0,1fr)!important;
    grid-template-rows:auto auto!important;
    column-gap:11px!important;
    row-gap:0!important;
    align-items:center!important;
  }
  .dashboardHero .heroBrandIcon{
    width:50px!important;
    height:50px!important;
    min-width:50px!important;
    margin:0!important;
  }
  .dashboardHero .heroCopy{
    align-self:center!important;
    min-width:0!important;
  }
  .dashboardHero .heroCopy h1{
    display:block!important;
    margin:0!important;
    font-size:clamp(19px,5.65vw,22px)!important;
    line-height:1!important;
    letter-spacing:-.035em!important;
    font-weight:800!important;
    white-space:nowrap!important;
    overflow:visible!important;
  }
  .dashboardHero .heroCopy h1 span{
    display:inline!important;
  }
  .dashboardHero .heroCopy p{
    display:none!important;
  }
  .dashboardHero .heroSetup{
    grid-column:1/-1!important;
    grid-row:2!important;
    margin:8px 0 0!important;
    padding:0!important;
  }
  .dashboardHero .heroActions{
    margin-top:10px!important;
  }
}
@media (max-width:390px){
  .dashboardHero .heroBrand{
    grid-template-columns:47px minmax(0,1fr)!important;
    column-gap:10px!important;
  }
  .dashboardHero .heroBrandIcon{
    width:47px!important;
    height:47px!important;
    min-width:47px!important;
  }
  .dashboardHero .heroCopy h1{
    font-size:clamp(18px,5.45vw,21px)!important;
  }
  .dashboardHero .heroSetup{
    margin-top:6px!important;
  }
}
</style>
'''
    s = s.rstrip() + '\n' + block.strip() + '\n'
styles.write_text(s, encoding='utf-8')
