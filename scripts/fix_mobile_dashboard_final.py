from pathlib import Path
import re

path = Path('src/Styles.html')
s = path.read_text(encoding='utf-8')

# Remove the accidentally committed escaped CSS block that starts with literal \\n<style>.
escaped_marker = r'\n<style>\n/* MOBILE_TOP_V2 */'
idx = s.find(escaped_marker)
if idx != -1:
    real_final = s.find('\n\n<style>\n/* MOBILE_TOP_FINAL */', idx)
    if real_final != -1:
        s = s[:idx] + s[real_final + 2:]
    else:
        # Fallback: remove escaped payload to end if no real style block follows.
        s = s[:idx]

# Remove every previous real final mobile override block.
s = re.sub(r'\n?<style>\s*/\* MOBILE_TOP_FINAL(?:_V2)? \*/.*?</style>\s*', '\n', s, flags=re.S)

block = r'''
<style>
/* MOBILE_TOP_FINAL_V2 */
@media (max-width:760px){
  html,body{width:100%!important;max-width:100%!important;overflow-x:hidden!important;background:#f4f7f8!important}
  .app{width:100%!important;max-width:100%!important;padding:16px 14px 12px!important}

  .dashboardHero{display:block!important;position:relative!important;margin:0 0 12px!important;padding:0!important;overflow:visible!important}
  .dashboardHero::before,.dashboardHero::after{pointer-events:none!important;z-index:-1!important;opacity:.35!important}

  .heroBrand{display:grid!important;grid-template-columns:52px minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:12px!important;row-gap:0!important;align-items:start!important;width:100%!important}
  .heroBrandIcon{grid-column:1!important;grid-row:1!important;width:52px!important;height:52px!important;min-width:52px!important;border-radius:17px!important;margin:2px 0 0!important;background:#e8faee!important;box-shadow:none!important}
  .heroBrandIcon svg{width:31px!important;height:31px!important;stroke-width:1.9!important}
  .heroCopy{grid-column:2!important;grid-row:1!important;min-width:0!important}
  .heroCopy h1{margin:0 0 8px!important;font-size:27px!important;line-height:.98!important;letter-spacing:-.035em!important;font-weight:800!important;color:#0c142b!important}
  .heroCopy h1 span{display:block!important}
  .heroCopy p{margin:0!important;max-width:300px!important;font-size:13px!important;line-height:1.28!important;color:#6b7486!important;letter-spacing:0!important}
  .heroSetup{grid-column:1/-1!important;grid-row:2!important;width:100%!important;margin:14px 0 0!important;display:flex!important;align-items:center!important;gap:8px!important;font-size:12px!important;line-height:1.2!important;color:#717b8d!important;white-space:nowrap!important;overflow:hidden!important}
  .heroSetup>span:last-child{display:block!important;min-width:0!important;white-space:nowrap!important}
  .heroSetup strong{color:#0a9a4a!important;font-weight:700!important}
  .setupLinkIcon{width:28px!important;height:28px!important;min-width:28px!important;flex:0 0 28px!important;border-radius:50%!important;background:#e5f9eb!important;color:#0a9a4a!important;display:grid!important;place-items:center!important;font-size:15px!important;line-height:1!important;transform:none!important}

  .heroActions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;grid-template-areas:'period period' 'settings add'!important;gap:10px!important;width:100%!important;margin:14px 0 0!important;align-items:stretch!important}
  .periodSyncCard{grid-area:period!important;display:grid!important;grid-template-columns:minmax(0,1.35fr) 1px minmax(104px,.75fr)!important;align-items:stretch!important;width:100%!important;min-width:0!important;min-height:82px!important;margin:0!important;background:#fff!important;border:1px solid #e7ebef!important;border-radius:18px!important;box-shadow:0 6px 18px rgba(16,24,40,.04)!important;overflow:visible!important}
  .periodSyncCard::before{content:''!important;display:block!important;grid-column:2!important;grid-row:1!important;width:1px!important;margin:14px 0!important;background:#e9edf1!important}

  .heroPeriod{grid-column:1!important;grid-row:1!important;position:relative!important;display:grid!important;grid-template-columns:40px minmax(0,1fr)!important;align-items:center!important;gap:9px!important;width:auto!important;min-width:0!important;height:auto!important;min-height:82px!important;padding:12px 13px!important;margin:0!important;border:0!important;border-radius:18px 0 0 18px!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;cursor:pointer!important}
  .heroPeriod::before,.heroPeriod::after{content:none!important;display:none!important}
  .heroActionIcon{display:grid!important;width:40px!important;height:40px!important;place-items:center!important;color:#68748c!important;margin:0!important}
  .heroActionIcon svg{width:34px!important;height:34px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important}
  .heroPeriodText{display:grid!important;min-width:0!important;margin:0!important}
  .heroPeriodText small{display:block!important;margin:0!important;font-size:11.5px!important;line-height:1!important;color:#7b8597!important;font-weight:500!important}
  .heroPeriodText strong{display:block!important;margin:4px 0 0!important;font-size:22px!important;line-height:1!important;color:#11182b!important;font-weight:700!important;letter-spacing:-.025em!important;white-space:nowrap!important}
  .periodChevron{display:inline!important;margin-left:3px!important;font-size:18px!important;line-height:1!important}
  .periodInputs{display:none!important;position:absolute!important;left:10px!important;right:-118px!important;top:78px!important;z-index:80!important;padding:8px!important;background:#fff!important;border:1px solid #e2e7eb!important;border-radius:12px!important;box-shadow:0 14px 34px rgba(16,24,40,.16)!important;grid-template-columns:1fr auto 1fr!important;align-items:center!important;gap:6px!important}
  .heroPeriod.periodOpen .periodInputs{display:grid!important}
  .periodInputs input{display:block!important;width:100%!important;min-width:0!important;height:35px!important;padding:0 6px!important;margin:0!important;border:1px solid #e1e5ea!important;border-radius:8px!important;background:#fff!important;font-size:11px!important;color:#11182b!important;opacity:1!important}
  .periodInputs .periodDash{display:block!important;margin:0!important;color:#7b8597!important;text-align:center!important}

  .heroSync{grid-column:3!important;grid-row:1!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;min-width:0!important;min-height:82px!important;padding:9px 6px!important;margin:0!important;border:0!important;border-radius:0 18px 18px 0!important;background:#fff!important;color:#687386!important;font-size:11px!important;line-height:1.05!important;font-weight:500!important;box-shadow:none!important;cursor:pointer!important}
  .heroSyncIcon{display:block!important;margin:0!important;color:#07994b!important;font-size:31px!important;line-height:.85!important;font-weight:500!important}

  .heroSettings{grid-area:settings!important}.heroAdd{grid-area:add!important}
  .heroSettings,.heroAdd{display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;min-width:0!important;min-height:56px!important;height:56px!important;padding:8px 10px!important;margin:0!important;border-radius:16px!important;font-size:15.5px!important;line-height:1!important;font-weight:700!important;box-shadow:0 5px 14px rgba(16,24,40,.035)!important;white-space:nowrap!important;transform:none!important}
  .heroSettings{background:#fff!important;border:1px solid #e7ebef!important;color:#11182b!important}
  .heroAdd{background:#078b42!important;border:1px solid #078b42!important;color:#fff!important}
  .heroSettings::before,.heroSettings::after,.heroAdd::before,.heroAdd::after{content:none!important;display:none!important}
  .heroBtnIcon{display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:20px!important;line-height:1!important}
  .heroPlus{display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:25px!important;line-height:1!important;font-weight:300!important}

  .heroStats{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;margin:0 0 12px!important}
  .heroStats .statCard{position:relative!important;display:block!important;min-width:0!important;min-height:112px!important;padding:12px!important;border:1px solid #edf0f3!important;border-radius:17px!important;background:#fff!important;box-shadow:0 6px 18px rgba(16,24,40,.035)!important;overflow:hidden!important}
  .heroStats .statCard::after{content:''!important;display:block!important;position:absolute!important;width:88px!important;height:64px!important;right:-27px!important;bottom:-29px!important;border-radius:50%!important;background:#e8faee!important;opacity:.88!important;pointer-events:none!important}
  .heroStats .statWaitingCard::after{background:#fff5d9!important}.heroStats .statAmountCard::after{background:#edf1f5!important}
  .heroStats .statIcon{position:relative!important;z-index:1!important;display:grid!important;place-items:center!important;width:33px!important;height:33px!important;margin:0 0 9px!important;border-radius:10px!important;font-size:15px!important}
  .heroStats .statChevron{display:block!important;position:absolute!important;right:10px!important;top:8px!important;z-index:2!important;color:#5f6b82!important;font-size:23px!important;line-height:1!important;font-weight:300!important}
  .heroStats .statBody{position:relative!important;z-index:1!important;min-width:0!important}
  .heroStats .statValue{margin:0 0 4px!important;font-size:27px!important;line-height:1!important;font-weight:800!important;letter-spacing:-.035em!important;color:#101828!important;white-space:nowrap!important}
  .heroStats .statLabel{margin:0!important;max-width:150px!important;font-size:12px!important;line-height:1.15!important;font-weight:500!important;color:#5f6b80!important}
  .heroStats .statHint{display:none!important}
}
@media (max-width:390px){
  .app{padding:14px 12px 10px!important}
  .heroBrand{grid-template-columns:48px minmax(0,1fr)!important;column-gap:11px!important}
  .heroBrandIcon{width:48px!important;height:48px!important;min-width:48px!important;border-radius:15px!important}
  .heroBrandIcon svg{width:29px!important;height:29px!important}
  .heroCopy h1{font-size:25px!important}
  .heroCopy p{font-size:12.5px!important}
  .heroSetup{font-size:11.5px!important;margin-top:12px!important}
  .periodSyncCard,.heroPeriod,.heroSync{min-height:78px!important}
  .heroPeriod{grid-template-columns:36px minmax(0,1fr)!important;padding:10px 11px!important;gap:8px!important}
  .heroActionIcon{width:36px!important;height:36px!important}.heroActionIcon svg{width:31px!important;height:31px!important}
  .heroPeriodText strong{font-size:20px!important}.heroSyncIcon{font-size:29px!important}.heroSync{font-size:10.5px!important}
  .heroSettings,.heroAdd{height:52px!important;min-height:52px!important;font-size:14.5px!important;border-radius:15px!important}
  .heroStats .statCard{min-height:106px!important;padding:11px!important}.heroStats .statValue{font-size:25px!important}.heroStats .statLabel{font-size:11.5px!important}
}
</style>
'''

s = s.rstrip() + '\n' + block.strip() + '\n'
path.write_text(s, encoding='utf-8')
