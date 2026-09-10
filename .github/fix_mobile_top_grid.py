from pathlib import Path

path = Path('src/Styles.html')
s = path.read_text(encoding='utf-8')
marker = '/* MOBILE_TOP_GRID_FIX */'
if marker in s:
    raise SystemExit(0)

block = r'''
<style>
/* MOBILE_TOP_GRID_FIX */
@media (max-width:760px){
  .dashboardHero .heroActions{
    display:grid!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    grid-template-rows:auto auto!important;
    grid-template-areas:none!important;
    grid-auto-columns:0!important;
    gap:10px!important;
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    margin:14px 0 0!important;
    align-items:stretch!important;
    justify-items:stretch!important;
  }
  .dashboardHero .heroActions > .periodSyncCard{
    grid-column:1 / 3!important;
    grid-row:1!important;
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    justify-self:stretch!important;
    margin:0!important;
  }
  .dashboardHero .heroActions > .heroSettings{
    grid-column:1!important;
    grid-row:2!important;
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    justify-self:stretch!important;
    margin:0!important;
  }
  .dashboardHero .heroActions > .heroAdd{
    grid-column:2!important;
    grid-row:2!important;
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    justify-self:stretch!important;
    margin:0!important;
  }
  .dashboardHero .heroActions > .heroAdd::before,
  .dashboardHero .heroActions > .heroAdd::after,
  .dashboardHero .heroActions > .heroSettings::before,
  .dashboardHero .heroActions > .heroSettings::after{
    content:none!important;
    display:none!important;
  }
  .dashboardHero .heroCopy h1{
    font-size:25px!important;
    line-height:1!important;
    margin:0 0 8px!important;
  }
  .dashboardHero .heroCopy p{
    font-size:12.5px!important;
    line-height:1.28!important;
  }
  .dashboardHero .heroBrandIcon{
    width:50px!important;
    height:50px!important;
    min-width:50px!important;
  }
  .dashboardHero .heroBrandIcon svg{
    width:29px!important;
    height:29px!important;
  }
  .dashboardHero .periodSyncCard,
  .dashboardHero .heroPeriod,
  .dashboardHero .heroSync{
    min-height:80px!important;
  }
  .dashboardHero .heroSettings,
  .dashboardHero .heroAdd{
    height:54px!important;
    min-height:54px!important;
    font-size:15px!important;
  }
}
@media (max-width:390px){
  .dashboardHero .heroCopy h1{font-size:24px!important}
  .dashboardHero .heroCopy p{font-size:12px!important}
  .dashboardHero .heroBrandIcon{width:47px!important;height:47px!important;min-width:47px!important}
  .dashboardHero .heroBrandIcon svg{width:28px!important;height:28px!important}
  .dashboardHero .periodSyncCard,.dashboardHero .heroPeriod,.dashboardHero .heroSync{min-height:76px!important}
  .dashboardHero .heroSettings,.dashboardHero .heroAdd{height:50px!important;min-height:50px!important;font-size:14px!important}
}
</style>
'''
path.write_text(s.rstrip() + '\n' + block.strip() + '\n', encoding='utf-8')
