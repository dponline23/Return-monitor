from pathlib import Path

styles_path = Path('src/Styles.html')
css = styles_path.read_text(encoding='utf-8')

marker = '/* MOBILE_TOP_FINAL */'
if marker in css:
    raise SystemExit(0)

block = r'''
<style>
/* MOBILE_TOP_FINAL */
@media (max-width:760px){
  html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important;background:#f4f7f8!important}
  .app{width:100%!important;max-width:100%!important;padding:18px 16px 12px!important}

  .dashboardHero{display:block!important;position:relative!important;margin:0 0 14px!important;padding:0!important;overflow:visible!important}
  .dashboardHero::before,.dashboardHero::after{display:block!important;pointer-events:none!important;z-index:-1!important}
  .dashboardHero::before{width:150px!important;height:125px!important;right:-70px!important;top:-34px!important;opacity:.55!important}
  .dashboardHero::after{width:105px!important;height:110px!important;right:-38px!important;top:70px!important;opacity:.35!important}

  .heroBrand{display:grid!important;grid-template-columns:56px minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:14px!important;row-gap:0!important;align-items:start!important;width:100%!important}
  .heroBrandIcon{grid-column:1!important;grid-row:1!important;width:56px!important;height:56px!important;min-width:56px!important;border-radius:18px!important;margin:2px 0 0!important;background:#e8faee!important;box-shadow:none!important}
  .heroBrandIcon svg{width:34px!important;height:34px!important;stroke-width:1.9!important}
  .heroCopy{grid-column:2!important;grid-row:1!important;min-width:0!important}
  .heroCopy h1{margin:0 0 10px!important;font-size:30px!important;line-height:.98!important;letter-spacing:-.035em!important;font-weight:800!important;color:#0b132b!important}
  .heroCopy h1 span{display:block!important}
  .heroCopy p{margin:0!important;max-width:285px!important;font-size:14px!important;line-height:1.28!important;color:#697386!important;letter-spacing:0!important}
  .heroSetup{grid-column:1/-1!important;grid-row:2!important;width:100%!important;margin:16px 0 0!important;display:flex!important;align-items:center!important;gap:9px!important;font-size:12.5px!important;line-height:1.2!important;color:#717b8d!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:clip!important}
  .heroSetup>span:last-child{display:block!important;min-width:0!important;white-space:nowrap!important}
  .heroSetup strong{color:#0a9a4a!important;font-weight:700!important}
  .setupLinkIcon{width:30px!important;height:30px!important;min-width:30px!important;flex:0 0 30px!important;border-radius:50%!important;background:#e5f9eb!important;color:#0a9a4a!important;display:grid!important;place-items:center!important;font-size:16px!important;line-height:1!important;transform:none!important}

  .heroActions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;width:100%!important;margin:16px 0 0!important}
  .periodSyncCard{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(0,1.35fr) 1px minmax(104px,.75fr)!important;align-items:stretch!important;width:100%!important;min-height:86px!important;background:#fff!important;border:1px solid #e7ebef!important;border-radius:20px!important;box-shadow:0 7px 22px rgba(16,24,40,.045)!important;overflow:visible!important}
  .periodSyncCard::before{content:''!important;display:block!important;grid-column:2!important;grid-row:1!important;width:1px!important;margin:15px 0!important;background:#e9edf1!important}

  .heroPeriod{grid-column:1!important;grid-row:1!important;position:relative!important;display:grid!important;grid-template-columns:42px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;width:auto!important;min-width:0!important;height:auto!important;min-height:86px!important;padding:13px 14px!important;margin:0!important;border:0!important;border-radius:20px 0 0 20px!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;cursor:pointer!important}
  .heroPeriod::before,.heroPeriod::after{content:none!important;display:none!important}
  .heroActionIcon{display:grid!important;width:42px!important;height:42px!important;place-items:center!important;color:#69758c!important;margin:0!important}
  .heroActionIcon svg{width:36px!important;height:36px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important}
  .heroPeriodText{display:grid!important;min-width:0!important;margin:0!important}
  .heroPeriodText small{display:block!important;margin:0!important;font-size:12px!important;line-height:1!important;color:#7b8597!important;font-weight:500!important}
  .heroPeriodText strong{display:block!important;margin:5px 0 0!important;font-size:23px!important;line-height:1!important;color:#11182b!important;font-weight:700!important;letter-spacing:-.025em!important;white-space:nowrap!important}
  .periodChevron{display:inline!important;margin-left:4px!important;font-size:20px!important;line-height:1!important}
  .periodInputs{display:none!important;position:absolute!important;left:10px!important;right:-116px!important;top:82px!important;z-index:80!important;padding:9px!important;background:#fff!important;border:1px solid #e2e7eb!important;border-radius:12px!important;box-shadow:0 14px 34px rgba(16,24,40,.16)!important;grid-template-columns:1fr auto 1fr!important;align-items:center!important;gap:6px!important}
  .heroPeriod.periodOpen .periodInputs{display:grid!important}
  .periodInputs input{display:block!important;width:100%!important;min-width:0!important;height:36px!important;padding:0 6px!important;margin:0!important;border:1px solid #e1e5ea!important;border-radius:8px!important;background:#fff!important;font-size:11px!important;color:#11182b!important;opacity:1!important}
  .periodInputs .periodDash{display:block!important;margin:0!important;color:#7b8597!important;text-align:center!important}

  .heroSync{grid-column:3!important;grid-row:1!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-width:0!important;min-height:86px!important;padding:10px 7px!important;margin:0!important;border:0!important;border-radius:0 20px 20px 0!important;background:#fff!important;color:#687386!important;font-size:11.5px!important;line-height:1.1!important;font-weight:500!important;box-shadow:none!important;cursor:pointer!important}
  .heroSync::before,.heroSync::after{content:none!important;display:none!important}
  .heroSyncIcon{display:block!important;margin:0!important;color:#07994b!important;font-size:34px!important;line-height:.85!important;font-weight:500!important}

  .heroSettings,.heroAdd{grid-column:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;width:100%!important;min-width:0!important;min-height:58px!important;height:58px!important;padding:9px 12px!important;margin:0!important;border-radius:17px!important;font-size:16px!important;line-height:1!important;font-weight:700!important;box-shadow:0 5px 16px rgba(16,24,40,.035)!important;white-space:nowrap!important}
  .heroSettings{background:#fff!important;border:1px solid #e7ebef!important;color:#11182b!important}
  .heroAdd{background:#078b42!important;border:1px solid #078b42!important;color:#fff!important}
  .heroSettings::after,.heroAdd::after,.headerActions>.primary::after{content:none!important;display:none!important}
  .heroBtnIcon{display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:22px!important;line-height:1!important}
  .heroPlus{display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:28px!important;line-height:1!important;font-weight:300!important}

  .heroStats{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin:0 0 14px!important}
  .heroStats .statCard{position:relative!important;display:block!important;min-width:0!important;min-height:116px!important;padding:13px!important;border:1px solid #edf0f3!important;border-radius:18px!important;background:#fff!important;box-shadow:0 7px 20px rgba(16,24,40,.04)!important;overflow:hidden!important}
  .heroStats .statCard::after{content:''!important;display:block!important;position:absolute!important;width:92px!important;height:68px!important;right:-28px!important;bottom:-30px!important;border-radius:50%!important;background:#e8faee!important;opacity:.9!important;pointer-events:none!important}
  .heroStats .statWaitingCard::after{background:#fff5d9!important}
  .heroStats .statAmountCard::after{background:#edf1f5!important}
  .heroStats .statIcon{position:relative!important;z-index:1!important;display:grid!important;place-items:center!important;width:34px!important;height:34px!important;margin:0 0 10px!important;border-radius:10px!important;font-size:16px!important}
  .heroStats .statChevron{display:block!important;position:absolute!important;right:11px!important;top:9px!important;z-index:2!important;color:#5f6b82!important;font-size:24px!important;line-height:1!important;font-weight:300!important}
  .heroStats .statBody{position:relative!important;z-index:1!important;min-width:0!important}
  .heroStats .statValue{margin:0 0 5px!important;font-size:28px!important;line-height:1!important;font-weight:800!important;letter-spacing:-.035em!important;color:#101828!important;white-space:nowrap!important}
  .heroStats .statLabel{margin:0!important;max-width:150px!important;font-size:12.5px!important;line-height:1.16!important;font-weight:500!important;color:#5f6b80!important}
  .heroStats .statHint{display:none!important}
}

@media (max-width:390px){
  .app{padding:15px 12px 10px!important}
  .heroBrand{grid-template-columns:52px minmax(0,1fr)!important;column-gap:12px!important}
  .heroBrandIcon{width:52px!important;height:52px!important;min-width:52px!important;border-radius:16px!important}
  .heroBrandIcon svg{width:31px!important;height:31px!important}
  .heroCopy h1{font-size:28px!important}
  .heroCopy p{font-size:13px!important}
  .heroSetup{font-size:11.5px!important;gap:7px!important;margin-top:14px!important}
  .setupLinkIcon{width:27px!important;height:27px!important;min-width:27px!important;flex-basis:27px!important;font-size:14px!important}
  .periodSyncCard{min-height:80px!important;grid-template-columns:minmax(0,1.32fr) 1px minmax(98px,.72fr)!important}
  .heroPeriod{min-height:80px!important;grid-template-columns:38px minmax(0,1fr)!important;gap:8px!important;padding:11px 12px!important}
  .heroActionIcon{width:38px!important;height:38px!important}.heroActionIcon svg{width:32px!important;height:32px!important}
  .heroPeriodText small{font-size:11px!important}.heroPeriodText strong{font-size:21px!important}.periodChevron{font-size:18px!important}
  .heroSync{min-height:80px!important;font-size:10.5px!important}.heroSyncIcon{font-size:31px!important}
  .heroSettings,.heroAdd{height:54px!important;min-height:54px!important;border-radius:16px!important;font-size:15px!important}
  .heroBtnIcon{font-size:20px!important}.heroPlus{font-size:26px!important}
  .heroStats .statCard{min-height:110px!important;padding:12px!important}
  .heroStats .statIcon{width:32px!important;height:32px!important;margin-bottom:9px!important}
  .heroStats .statValue{font-size:26px!important}.heroStats .statLabel{font-size:12px!important}
}
</style>
'''

# Keep all previous working styles, but make this final block authoritative.
css += '\n' + block
styles_path.write_text(css, encoding='utf-8')
