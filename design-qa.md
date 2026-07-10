# Design QA

## Reference

- Source HTML: `C:/Users/Administrator/Downloads/ranking-sdr.html`
- Reference screenshot: `C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-f66cbcd3-b8b2-46d4-b7d2-0bdf20be049d.png`

## Rendered Checks

- Local URL: `http://127.0.0.1:5173/`
- Expanded SDR screenshot: `C:/Users/Administrator/Documents/SDR/design-qa-sdr-expanded-fixed-1024x640.png`
- Viewport: `1024x640`

## Result

- SDR/BDR table keeps `Reuniões` and `Progresso`, with no `Canal`.
- Podium supports top 5 visual columns in the order `4, 2, 1, 3, 5`.
- Expanded podium centers the first place when fewer than five SDRs are present and no longer overlaps the table.
- New SDR/BDR names from the sheet resolve local profile images when available; unknown names still fall back to initials.

## Podium, Crown And Monthly Goals - 2026-07-10

- Source visual truth: `C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-d593c268-caba-4228-80ac-770a999f958b.png`
- Implementation screenshot: `C:/Users/Administrator/Documents/SDR/design-qa-sdr-expanded-july-1280x720.png`
- Side-by-side comparison: `C:/Users/Administrator/Documents/SDR/design-qa-podium-reference-comparison-july.png`
- Viewport: `1280x720`
- State: expanded SDR podium with the five eligible July members and July monthly goals.

### Full-View Evidence

- Five podium tracks render in visual order `4, 2, 1, 3, 5` with no horizontal overflow.
- The podium list and classification table have `0px` overlap at the TV viewport.
- Names and metrics sit around the vertical center of their podium bodies instead of the base.
- The existing typography, palette, photos, table, effects, and expanded layout remain intact.

### Focused Evidence

- Crown animation uses `podium-crown-float` over `2.4s`; sampled transforms and vertical positions changed after `700ms`.
- Podium name-center ratios range from `0.41` to `0.59` of each stage height.
- July progress reads individual goals: Emanuella `4/14 = 29%`, Matheus Caruzo `2/14 = 14%`, and Daniel Dias `1/7 = 14%`.
- An explicit zero goal renders `0%` and announces `Meta mensal não definida` instead of comparing against the leader.
- Browser console reported no errors or warnings.

### Comparison History

- Earlier state: podium content used `justify-content: flex-end`, the crown was static, and progress used the period leader as its denominator.
- Fixes: centered stage content, added reduced-motion-safe crown animation, propagated each sheet goal into the ranking model, and capped individual progress at `100%`.
- Post-fix evidence: the July screenshot and DOM measurements above show all earlier P1/P2 findings resolved.

### Findings

- No actionable P0, P1, or P2 differences remain for the requested changes.
- P3: the reference uses placeholder initials while the implementation shows the real local profile photos; this is intentional product behavior.

final result: passed

## Current Month Selector And Compact Podium - 2026-07-10

- Requested reference: `C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-f68d1105-98cc-4bf3-9b29-4c9bc9480dd7.png`
- Desktop screenshot: `C:/Users/Administrator/Documents/SDR/design-qa-month-selector-podium-1920x1080.png`
- TV screenshot: `C:/Users/Administrator/Documents/SDR/design-qa-month-selector-podium-1280x720.png`
- Viewports: `1920x1080` and `1280x720`.

### Functional Evidence

- The monthly control is a native `select` with seven sheet periods and opens on `Julho/2026` for the current date.
- Selecting June loads `CDR JUNHO/26`; selecting July again loads `CDR JULHO/26`.
- Local Vite development reuses the project Cloudflare Function, so it no longer falls back to the static May fixture.
- Automatic refresh remains active every `10s`; without a manual selection the Function resolves the current Sao Paulo month on each request.

### Visual Evidence

- Normal first-place podium stage is `280px` high and `206px` wide at `1920x1080`, a `1.36` height/width ratio.
- Second and third stages are `220px` and `180px`, preserving the rank hierarchy without the previous stretched appearance.
- Podium-to-table overlap and horizontal page overflow are both `0px`.
- Expanded SDR podium still opens and closes normally at the TV viewport.
- Monthly progress announces `29%`, `38%`, and `14%` against individual July goals in the first three rows.
- Browser console reported no errors or warnings.

final result: passed

## Second Podium Compaction And Crown Ceiling - 2026-07-10

- User reference: `C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-fbabbacd-eae6-45fd-b5e1-0b72322c1378.png`
- Focused TV screenshot: `C:/Users/Administrator/Documents/SDR/design-qa-podium-compact-ceiling-focused-1280x720.png`
- Normal podium only; expanded mode keeps its independent sizing rules.

### Evidence

- The normal podium ceiling increased from `86px` to `116px`, leaving visible breathing room above the floating crown.
- At `1920x1080`, stage heights are `230px`, `195px`, `170px`, `150px`, and `158px` for positions one through five.
- First-place height/width ratio is `1.12`, down from `1.36` in the previous pass.
- At `1280x720`, content-driven heights remain compact without clipping names or metrics.
- Podium-to-table overlap and horizontal overflow remain `0px`.
- Browser console reported no errors or warnings.

final result: passed

## Podium Information Raised - 2026-07-10

- User reference: `C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-a8c7bbb5-311c-4d42-97fe-a546522f2d68.png`
- Normal podium content now uses top alignment below the avatar; expanded mode keeps centered alignment.

### Evidence

- Normal stage computed alignment is `flex-start` for every podium position.
- Name center ratios now range from `0.34` to `0.45` of each stage height at `1280x720`.
- First-place names begin `78px` below the stage top; other positions begin between `56px` and `66px` below it.
- Expanded SDR stage still computes to `justify-content: center`.
- Horizontal overflow remains `0px`, and the browser console reported no errors or warnings.

final result: passed
