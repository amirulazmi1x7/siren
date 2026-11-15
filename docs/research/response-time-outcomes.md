# Does a faster ambulance save lives? (for the "why care" number)

Checked 2026-11-14. Secondary or unverified items are marked.

## What the research says
- **Cardiac arrest: strong evidence, per-minute effect.** Each extra minute of EMS response lowers survival.
  - Resuscitation Outcomes Consortium (US/Canada): odds of survival to discharge × **0.92 per minute** (aOR 0.92; good neurological outcome 0.88). Bystander CPR did not remove the effect. (summary via search; verify in the paper before quoting exact CIs)
  - Japan, 553,426 cases: one-month neurologically intact survival aOR **0.89 per minute**. [PMC6015296](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6015296/)
  - Ontario (OPALS): odds of survival ≈ ×0.77 per minute of defibrillation response interval. [PubMed 8214853](https://pubmed.ncbi.nlm.nih.gov/8214853)
  - Overall range across studies is about **4–11% lower survival per minute**, depending on setting.
- **All emergencies: evidence exists but is weaker and varies.**
  - Wilde 2013, *Health Economics* (Utah, instrumental variable): response time significantly affects mortality. The "8–17% higher mortality per minute" figure is a reviewer's reading (unverified, secondary). [RePEc](https://ideas.repec.org/a/wly/hlthec/v22y2013i7p790-806.html)
  - Byrne et al., *JAMA Surgery* 2019 (car crashes, ~2,300 US counties): about 5 minutes slower (12 vs 7 min) → **46% higher odds of death** (via news coverage). [JEMS](https://www.jems.com/patient-care/study-examines-link-between-response-tim/)
  - Blanchard et al. 2012 (urban ALS system): no significant mortality difference at the 8-minute cutoff (7.1% vs 6.4%). [PubMed 11927452](https://pubmed.ncbi.nlm.nih.gov/11927452/)

## What our simulation gives (SIM, 10 runs, the agent's $900 plan: 5 nurse shifts)
| Night | Urgent calls | Urgent-patient minutes saved per night | Arrest-type calls (severity 1) | Est. extra survivors per night |
|---|---|---|---|---|
| Typical Friday | 82 | **70** | 2 | 0.012 |
| Holiday weekend Friday | 129 | **125** | 4 | 0.005 |
| Busy summer Friday | 93 | **58** | 2 | 0.004 |

Lives estimate method: survival odds × 0.92 per minute (ROC), anchored at 10% survival for an 8-minute response (a typical US out-of-hospital cardiac arrest survival rate; assumption). Applied only to severity-1 calls, which include arrest, choking and unconscious patients, so it is an approximation.

**Honest reading:** in this 3-ER area, on Friday nights only, the plan gives back about **1–2 hours of faster response to urgent patients each night**, but the lives-saved estimate is small: roughly **0.2–0.6 extra cardiac-arrest survivors per year of Friday nights**. Minutes saved is the strong, defensible number. Lives saved should only be quoted as a clearly labeled estimate, or scaled with stated assumptions (every night, more ERs).

Other sources from the search: [PMC12065030](https://pmc.ncbi.nlm.nih.gov/articles/PMC12065030/), [PMC12546963](https://pmc.ncbi.nlm.nih.gov/articles/PMC12546963), [PubMed 36646371](https://pubmed.ncbi.nlm.nih.gov/36646371/), [Healio: EMS delays and STEMI](https://cm.healio.com/news/cardiology/20190716/delays-in-ems-response-affect-treatment-outcomes-in-stemi), [TRID: crash fatality and EMS delays](https://trid.trb.org/View/2717857), [ISPOR: Does every minute count?](https://www.ispor.org/publications/journals/value-in-health/abstract/Volume-25--Issue-3/Does-Every-Minute-Really-Count--Road-Time-as-an-Indicator-for-the-Economic-Value-of-Emergency-Medical-Services).

## Update: what the page shows (export with 5 runs per option)
The $900 plan (5 nurse shifts) saves **58.5 / 130.0 / 67.3 urgent-patient minutes** on the typical / holiday / summer night. The per-option lives estimate (`arrest_survivors_per_year`) swings between about −0.2 and +0.4 a year, which is within simulation noise: there are too few arrest calls in 3 ERs on a Friday to measure it. So the page shows minutes saved plus the published per-minute survival effect, and says plainly that the local lives number is under 1 a year.
