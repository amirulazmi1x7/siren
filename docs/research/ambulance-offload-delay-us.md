# Ambulance offload delay ("wall time") in the US (checked 2026-11-14)

Question: is ambulance patient offload time (APOT), the interval from ambulance arrival at the ED until the ED takes over the patient, a real and widespread US problem?

Short answer: **real and severe in specific places, not uniform nationally.** The best national dataset finds the typical offload is short, and the problem is concentrated in a minority of mostly urban, high-volume EMS systems. California has the best data and is the clearest case. Labels used below: "primary" means we read the study abstract, statute, or agency document ourselves. "(unverified, secondary)" means we only saw a news or secondary write-up, or could not open the primary document.

## Bottom line for the pitch

- **Wall time is concentrated, not universal.** A 2024 national dataset (ESO, about 7.2M 911 transports) found median offload of about 7-11 minutes. Only 3.3% of agencies (67 of 2,020) had 1 in 4 or more transports over 30 minutes, and those agencies were more urban and busier [3]. Say "a serious problem in busy urban systems," not "a national crisis."
- **Where it happens, it is bad.** Across 5.9M California offloads (2021 to mid-2023), the volume-weighted 90th-percentile offload time was 42.8 min, above the state's 30-min standard. 16 of 34 local EMS agencies were above 30 min, and they handled 79% of offloads [1].
- **California is still over its own standard after the law took effect.** From Oct 2024 to Mar 2025, the statewide 90th-percentile offload ran 38.7 to 49.1 min a month. 17.3% of offloads exceeded 30 min, adding up to about 16,000 hours of delay beyond 30 min over 6 months [4].
- **The cause is mostly upstream of the ED door.** ED boarding and full inpatient beds drive it. US hospital occupancy rose from 63.9% (2009-2019) to 75.3% after the pandemic, mainly because staffed beds fell from about 802k to about 674k [27]. National ED boarding rose from 5.1% of visits in 2001 to 11.3% in 2022 [28].
- **Few states regulate it.** California sets a 30-min, 90%-of-the-time standard with hospital protocols and state reporting, but no penalties were found [4][11][12][10]. Georgia set a non-binding 20-min/90% goal with required EMS reporting [7][8]. Mississippi has a 30-min administrative rule (unverified, secondary) [13]. Louisiana and Maryland created study bodies or monitoring [14][15][16]. A Washington bill to cap wall time at 30 min died in committee [18].
- **The "20-minute national benchmark" is a convention, not a standard.** Georgia's health department calls it "widely accepted," but says there is no federal standard [7]. We found no NHTSA, NEMSQA, ACEP, or NAEMSP document that sets it.
- **The link to slower 911 responses for other patients is plausible but only modestly measured.** The best study (Calgary) found hourly response times rose by about 0:18 to 4:16 (min:sec) between a light-stress and a heavy-stress scenario [22]. Queensland found a positive association [24]. We found no peer-reviewed US study that quantifies this.
- **Fixes have mixed evidence, so "pick the cheapest lever per site" is a fair framing.** A dedicated offload area plus an offload nurse cut one California ED's 90th-percentile offload from about 80 to 31-34 min [38]. Ontario has funded offload nurses since 2008, but its auditor found wait times *rose* at 20% of funded hospitals and the program had never been evaluated [34][35].

## 1. National size of the problem

**National data (thin).**
- **ESO national study [3] (primary, abstract).** This was a retrospective analysis of the 2024 ESO Research Collaborative dataset, 7,237,606 911-response transports. Median (IQR) offload depended on which timestamp was used:
  - arrival to receiving-facility signature: 10.9 min (6.6-17.5)
  - arrival to "transfer of care": 6.6 min (4.4-13.1)
  - arrival to incident closed: 19.7 min (13.1-30.6)
  - composite: 8.7 min (4.4-15.3)

  Among agencies with at least 100 transports a year (n = 2,020), only 67 (3.3%) had at least 25% of transports over 30 min. Those agencies were more urban (79.1% vs 58.9%) with higher 911 volume. The authors conclude APOT problems are "not widespread nationally" but are "prevalent in a subset of EMS systems."
  - Caveats: ESO is one ePCR vendor, so this is not all US agencies, and two authors are ESO staff. The data cover 2024 only, with no trend. Timestamp quality varies, and no 90th percentile is reported in the abstract.
- **NEMSIS 2023, news analysis [10] (unverified, secondary).** InvestigateTV analyzed 2023 NEMSIS data. It reported:
  - more than 890,000 crew-reported delays returning to service due to ED backups
  - about 1 in 5 of those delays lasted 1 hour or more
  - about 5,600 lasted 3 hours or more
  - more than 300 lasted 12 hours or more
  - when a delay was flagged, median arrival-to-back-in-service was just over 40 min, about double the median for calls with no delay

  This is journalism, not peer-reviewed, and the exact NEMSIS fields used are not stated. Treat it as indicative only.
- **No peer-reviewed national NEMSIS median or 90th percentile, and no 2019-2025 national trend, was found.** We searched PubMed and the web. The National EMS Advisory Council (NEMSAC) wrote to the federal interagency EMS committee (FICEMS) in Nov 2024. It reportedly said offload delays have reached "a critical tipping point" and named hospital and ED crowding, including boarding, as the main driver [9]. We could not open the PDF (access denied), so that wording is (unverified, secondary).

**Trend around COVID.**
- **US.** We found no national trend data. Georgia's Office of EMS says delays "began to rise substantially during the COVID-19 public health emergency" [8]; this is a primary state statement, not data.
- **California.** The weighted mean of hospital-month 90th percentiles was flat-to-slightly-up: 41.8 min (2021), 43.5 (2022), 43.1 (Jan-Jun 2023). 20 of 33 agencies were worse in 2023 than in 2021 [1].
- **Outside the US (for context only).**
  - Queensland: the share offloaded within 30 min fell from 74% before COVID to 57% after [24].
  - Melbourne: one health service saw offload delays rise after COVID, then fall below pre-COVID projections [42].
  - Ontario: the government claims a roughly 65% drop since an October 2022 peak, with no stated method [36] (unverified, secondary).

**California JAMA paper [1] (primary).** Feldmeier et al., *JAMA Netw Open* 2024;7(12):e2451022, DOI 10.1001/jamanetworkopen.2024.51022.
- Scope: 5,913,399 offloads, 34 local EMS agencies, Jan 2021 to Jun 2023. The outcome is APOT-1, the 90th-percentile offload time.
- Volume-weighted statewide mean of APOT-1: 42.8 min (SD 27.3). Median hospital-month APOT-1: 28.9 min (IQR 14.9-46.3).
- 16 of 34 agencies (47.1%, covering 79.2% of offloads) were above 30 min. Agency means ranged from 6.2 min (North Coast) to 66.8 min (Sacramento).
- Note: the "~6 million" in news coverage is 5.9M, and 42.8 min is an average of 90th percentiles, not a typical patient's wait.
- A companion paper on the same data found that the share of Black residents was most associated with longer APOT. A 3.3-point rise in Black residents was linked to an adjusted increase of 11.75 min (95% CI 1.9-21.6) [2].
- A 2026 paper covering 310 California EDs, before AB 40, predicted APOT-1 of 9.7-19.3 min for rural EDs and 19.4-38.7 min for urban EDs [6].

**California after AB 40 [4] (primary, EMSA report to the Commission on EMS, June 2025, CEMSIS data).**
- Statewide 90th percentile, Oct 2024 to Mar 2025: 38:42, 38:58, 45:00, 49:07, 44:13, 39:10 (min:sec, monthly). The winter peak was in January.
- Of 1,310,954 offloads, 63.0% were within 20 min, 32.4% took 20-60 min, 3.9% took 60-120 min, 0.6% took 120-180 min and 0.2% took over 180 min.
- 17.3% of offloads exceeded 30 min, for 16,022 cumulative hours of delay beyond 30 min. Los Angeles alone accounted for about 4,279 of those hours.
- Hardest-hit agencies by monthly 90th percentile: Los Angeles (up to 1:03:12), San Diego (up to 1:04:34), Riverside (up to 1:01:56), Alameda (up to 0:59:14) and Kern (up to 0:54:49). Rural agencies are mostly under 15 min.
- Caveat: not all providers report to CEMSIS.
- Earlier baseline [5]: in 2017 data from 9 California agencies (830,637 transports, 126 hospitals), three-quarters of hospitals held a crew more than 1 hour at least once, and one-third more than 3 hours.

**Benchmarks.**
- **20 min.** Georgia DPH: "There is no federally mandated standard for APOT; however, a widely accepted national benchmark is 20 minutes or less" [7]. Georgia's own goal is 20 min, 90% of the time [8]. California EMSA reports a "within 20 minutes" bin [4], and Sacramento County is stepping its standard down to 20 min by 2027 [44] (from our earlier claims-check note, not re-verified). We found no national body that formally sets or endorses 20 min.
- **30 min (California).** Each local EMS agency must adopt a standard of no more than 30 min, 90% of the time [11][4]. Ontario's ministry has historically treated over 30 min as an "offload delay" [34].
- **Measurement.** There is no national definition. The ESO paper shows four timestamp choices give medians from 6.6 to 19.7 min [3]. California and Georgia both define APOT with NEMSIS fields eTimes.11 (arrival) to eTimes.12 (transfer of care) [4][8].

## 2. Causes

- **ED boarding and inpatient capacity (strongest evidence).**
  - ACEP's Boarding Summit report says boarding and crowding "stem from broader health system dysfunction," not ED inefficiency. It lists bed capacity, mental-health care gaps, post-acute placement, payment and nursing workforce as causes [29].
  - AHRQ's Oct 2024 boarding summit report (released Mar 2025) likewise places the causes at the hospital or health-system level [30] (unverified, secondary; we could not open the page).
  - In Queensland, longer offload was strongly associated with access block, meaning admitted patients unable to get a ward bed [24].
- **Bed supply.** National hospital occupancy was 63.9% (2009-2019) vs 75.3% (May 2023 to Apr 2024). Staffed beds fell from about 802k to about 674k while daily census stayed near 510k. The authors project 85% occupancy around 2032 for adult beds [27].
- **Boarding trend.** National ED boarding rose from 5.1% (2001) to 11.3% (2022) in NHAMCS data. It is highest for behavioral-health transfers and rising fastest in rural hospitals [28].
- **Nurse staffing.** The Maryland Hospital Association (a hospital-side advocacy source) cites about 1 in 4 hospital nursing positions vacant, plus behavioral-health gaps and difficulty discharging to post-acute care [17]. Georgia's EMS office also cites "workforce shortages and resource limitations" [8]. See `claims-check.md` for ED nurse-shortage survey data.
- **ED closures.** Hospital-based EDs fell from 4,500 to 4,460 between 2005 and 2015 (200 closures, 138 mergers, 160 openings). Visits per ED rose 28.6% while inpatient beds stayed flat [31]. This is volume concentration rather than mass closure.
- **Hospital-level structure.** In California, urban location and more ED treatment stations were associated with longer APOT-1 [6], which likely tracks busier, more crowded hospitals.
- **Federal lever.** CMS adopted an "Emergency Care Access & Timeliness" eCQM for the Hospital OQR program. Reporting is voluntary in CY2027 and mandatory in CY2028 [32]. The measure page does not mention EMS or offload.

## 3. States

| State | What exists | Year | Binding? | Source |
|---|---|---|---|---|
| California | AB 40: each local EMS agency must set an APOT standard of at most 30 min, 90% of the time; EMSA sets statewide method and reporting (HSC 1797.120); each hospital with an ED must file an APOT reduction protocol by Sept 1, 2024 (HSC 1797.120.6) | 2023 law; earlier voluntary APOT reporting from 2017 [5] | Standard and reporting yes. No penalties found [10] | [11][12][4][5] |
| Georgia | DPH APOT Taskforce goal: offload within 20 min, 90% of the time; EMS agencies "required to document and report"; monthly reporting from July 2026 | 2025 | Goal only; no statute or rule cited [7] | [7][8] |
| Mississippi | Admin rule: transfer of care "no longer than 30 minutes after arrival"; violations cannot cost EMS certification | 2022 | Rule (unverified, secondary; we could not open the code text) | [13][10] |
| Louisiana | HB 372 (Act 691, 2024) creates an Ambulance Patient Offload Delay Collaborative to study the problem and collect data. A Senate amendment removed mandatory 30-min data reporting | 2024 | Study body only | [14] |
| Maryland | HB 1143 (Ch. 844, 2024) created an ED Wait Time Reduction Commission (offload not named). MIEMSS sends weekly transfer-time reports to hospitals; about 40% of EDs meet a 35-min target more than 90% of the time | 2024 to FY2026 | Monitoring, no mandate | [15][16] |
| Texas | GETAC (governor's EMS and trauma advisory council) wall-time white paper and task force: says wall time is "a healthcare system problem" and that acceptable APOT should be set locally | 2024-2025 | Advisory (unverified, secondary; PDF would not load) | [19] |
| Massachusetts | Banned ambulance diversion statewide in 2009. Boston-area turnaround time fell 2.2 min afterwards, with no rise in ED length of stay. No APOT standard found | 2009 | Diversion ban, not APOT | [20] |
| Washington | HB 2466 would have required acceptance within 30 min plus reimbursement for longer waits; it died after a committee hearing | 2024 | Not enacted | [18] |
| NY, FL, CO, AZ, OR, NC, NJ | No statewide APOT statute or standard found in our searches. Local or regional policies may exist. Absence is not proof | n/a | n/a | n/a |

Which states are worst cannot be ranked nationally from the data we found. California's large urban agencies are the best-documented hot spots [1][4]. InvestigateTV reported cases in Tennessee (Knox County) and Mississippi (Hinds County) [10] (unverified, secondary). Federally, CMS's 2006 memo S&C-06-21 says EMTALA obligations begin when an EMS patient presents at the ED, and that "parking" patients on EMS stretchers "may result in a violation" of EMTALA [21] (primary).

## 4. Does offload delay slow 911 responses to other patients?

Overall: the mechanism is obvious, and agencies, CMS and Georgia all assert it [21][8], but the measured effect is modest and correlational. Treat it as **likely but weakly quantified**, with no US causal estimate.
- **Calgary, 2014-2017 [22] (primary, abstract).** This study covered 301,105 EMS episodes over 26,193 one-hour periods, with a median hourly offload of 55.3 min. Going from a "light" scenario (30-min offload, low volume, summer) to a "heavy" one (90-min offload, high volume, winter), median hourly response time rose by 0:18 to 4:16 (min:sec), depending on time of day. The authors call the relationship "complex." It is correlational and from a Canadian system.
- **Queensland, 25 hospitals, 2018-2022 [24].** Regression showed a positive relationship between offload (patient off-stretcher time) and ambulance response time. The size of the effect is not in the abstract.
- **Los Angeles, 2001-2002 [23].** The study counted 21,240 out-of-service waits over 15 min, about 1 in 8 transports; 8.4% exceeded 1 hour, and the median wait was 27 min. It measured lost availability, not response times.
- **NAEMSP (2011).** Its resource document says offload delay "may have more impact on ambulance turnaround time than ambulance diversion" [33]. That is expert opinion.
- **Patient harm from the delay itself is unproven.** A 2026 systematic review found only 4 studies, all from Australia and Canada. Delays were consistently linked to longer ED stays, but clinical harm "remains unclear" [25]. A Calgary propensity-matched study found no higher mortality in delayed high-acuity patients [26].
- **Gap.** We found no US study that links APOT data to CAD response-time data. That makes this a credible research hook for a planner that models response-time impact, but it cannot be cited as an established fact.

## 5. Fixes in use and their evidence

- **Dedicated offload nurse or offload zone.**
  - **Sacramento-area ED, 2026 QI study [38] (pre/post, single site).** A dedicated ambulance receiving area, a dedicated nurse and staff training cut mean monthly 90th-percentile APOT from 80.0 to 30.6 min (Sacramento County arrivals) and from 81.6 to 33.7 min (Sierra-Sacramento Valley arrivals), even though ambulance volume rose.
  - **Ontario.** The program has run since 2008. It cost $40M CAD from 2008/09 to 2012/13 and was not evaluated by the ministry. The auditor found wait times *increased* at 20% of funded hospitals [34], and the 2015 follow-up still found no value-for-money evaluation [35]. In 2023 the province added $51M over 3 years (about 800k nurse hours) [36] (unverified, secondary: MPP repost of a government release). The 65% reduction claim [36] has no stated method.
  - **Queensland trial [37].** A trial offload nurse role made a small improvement in time to be seen (34 to 31 min), and most gains disappeared when the role was removed.
  - **Scoping review [41].** Offload zones reduced offload delays, and early clinician assessment reduced both offload delays and ED crowding.
- **EMS hospital liaison.** In Howard County, MD, a liaison program was associated with a 16.3% lower adjusted offload time at one hospital, about 3 min for the sickest patients [39]. This is a preliminary, single-site analysis.
- **Diversion policy.** In San Diego County (22 hospitals), replacing hospital-initiated diversion with County-EMS-initiated diversion cut the median daily 90th-percentile APOT from 53.9 to 40.3 min. Suspending diversion entirely left it unchanged (51.7 min) [40]. In Massachusetts, the statewide diversion ban did not worsen turnaround [20].
- **Regional coordination and transfer centers.**
  - Maryland shares hospital-level transfer-time data monthly with its rate regulator, the Health Services Cost Review Commission (HSCRC) [16].
  - Crowded referral hospitals accept fewer transfers (odds ratio 0.71 at the worst boarding) [45], which shows load-balancing has limits.
  - We found no outcome study of a US regional offload-coordination center.
- **Fines and penalties.** We found no US jurisdiction that fines hospitals for wall time. California AB 40 reportedly has no penalties [10], Mississippi's rule says violations cannot cost EMS certification [13], and Washington's reimbursement bill failed [18]. The EMTALA route exists in principle [21], but we found no enforcement data.
- **NHS England (comparison).** The 2025/26 plan sets a maximum 45-min handover standard, with 15 min still the target [43]. This comes from our earlier claims-check and was not re-verified here.

## Weak spots / what we can't claim

- **Do not say "a national crisis everywhere."** The only large national dataset says the median is short and the problem is concentrated in about 3% of agencies [3].
- **Do not cite a national 90th percentile or a national post-COVID trend.** We found neither in peer-reviewed or federal sources.
- **The 890,000 figure [10] is a news analysis of NEMSIS**, not peer-reviewed. Cite it as reported by InvestigateTV if at all.
- **The "20-min national benchmark" has no identified issuing body.** Say "commonly cited 20-min benchmark (Georgia DPH)" [7].
- **Don't call 42.8 min "the average California wait."** It is a volume-weighted mean of hospital-month 90th percentiles [1].
- **There is no US causal estimate of offload delay on other patients' 911 response times.** The best evidence is Canadian and correlational [22].
- **Patient harm from offload delay itself is not established** [25][26].
- **Offload-nurse evidence is mixed.** One strong single-site US result [38] sits against Ontario's unevaluated program with rising waits at some hospitals [34]. Avoid "offload nurses solve it."
- **Unopened primary documents.** We could not open the NEMSAC letter [9], the Texas GETAC white paper [19], the Mississippi rule text [13], the AHRQ report [30] or the AB 40 bill text on leginfo [11]. AB 40's 30-min/90% terms were confirmed via the hospital-protocol statute text [12], the EMSA report [4], and `claims-check.md`.
- **State coverage is not exhaustive.** "No law found" for NY, FL, CO, AZ, OR, NC and NJ reflects our searches only.

## Sources

1. Feldmeier M, et al. Patterns in California Ambulance Patient Offload Times by Local EMS Agency. JAMA Netw Open 2024;7(12):e2451022. https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2828075 (PMC: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11650417/)
2. Shteyler VM, et al. Racial and Socioeconomic Disparities in California Ambulance Patient Offload Times. JAMA Netw Open 2025;8(5):e2510325. https://pubmed.ncbi.nlm.nih.gov/40372755/
3. Shaw MR, et al. "On the Wall": A Descriptive Analysis of Ambulance Patient Offload Times in the United States. Prehosp Emerg Care 2026;30(5):716-722. https://pubmed.ncbi.nlm.nih.gov/40689683/
4. California EMS Authority. Report to Commission: Ambulance Patient Offload Delays (June 2025). https://emsa.ca.gov/wp-content/uploads/sites/71/2025/07/Ambulance-Patient-Offload-Delays-Report-to-the-Commission-on-EMS-June-2025.pdf
5. Backer HD, et al. Statewide Method of Measuring Ambulance Patient Offload Times. Prehosp Emerg Care 2019;23(3):319-326. https://pubmed.ncbi.nlm.nih.gov/30257596/
6. Melgoza E, et al. When ambulances wait at the emergency department: hospital factors and offload times in California. Health Aff Sch 2026;4(5):qxag103. https://pubmed.ncbi.nlm.nih.gov/42205358/
7. Georgia DPH. Ambulance Patient Offload Time (APOT). https://dph.georgia.gov/node/60561
8. Georgia DPH Office of EMS and Trauma. APOT letter to hospital CEOs and EMS agency directors, Jan 13, 2025. https://dph.georgia.gov/document/document/apot-letter-forhospital-ems-agencies-jan-2025/download
9. NEMSAC. Letter to FICEMS re: EMS Wall Times Crisis in America, Nov 2024 (could not open). https://www.ems.gov/assets/FINAL-se-Letter-to-FICEMS-RE-EMS-Wall-Times-Crisis-in-America-2024.11.07.pdf
10. InvestigateTV. "On Hold: Dire delays at hospital ERs create long waits for ambulance crews," Sept 30, 2024. https://www.investigatetv.com/2024/09/30/hold-dire-delays-hospital-ers-create-long-waits-ambulance-crews-put-patients-risk/
11. California AB 40 (2023), chaptered text. https://legiscan.com/CA/text/AB40/2023 (also https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB40)
12. Cal. Health & Safety Code 1797.120.6 (hospital APOT reduction protocol). https://california.public.law/codes/health_and_safety_code_section_1797.120.6
13. Mississippi Admin. Code, Title 15, Pt. 12, Subpt. 31, Ch. 2, R. 2.1.7 (2022 wall-time rule; text not opened). Index: https://www.law.cornell.edu/regulations/mississippi/15-Miss-Code-R-12-31-2.1.7
14. Louisiana HB 372 (2024), House summary of Senate amendments. https://legis.la.gov/legis/ViewDocument.aspx?d=1378469 ; enacted as La. R.S. 40:1134: https://legis.la.gov/Legis/Law.aspx?d=97060
15. Maryland HB 1143 (2024), Ch. 844. https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/hb1143?ys=2024RS
16. MIEMSS FY2026 budget testimony. https://dbm.maryland.gov/budget/FY2026Testimony/D53T00.pdf
17. Maryland Hospital Association. Myths vs Facts: Ambulance Patient Offload Times (2024). https://mhaonline.org/wp-content/uploads/2024/05/Myths-vs-Facts-Ambulance-Patient-Offload-Times.pdf
18. Washington HB 2466 (2024), "Addressing ambulance wait times," bill history. https://app.leg.wa.gov/billsummary?BillNumber=2466&Year=2024
19. Texas GETAC. EMS Wall Time white paper (2024; could not open). https://www.dshs.texas.gov/sites/default/files/emstraumasystems/GETAC/PDF/EMS-Wall-Time-2024.pdf
20. Burke LG, et al. The effect of an ambulance diversion ban on ED length of stay and ambulance turnaround time. Ann Emerg Med 2013;61(3):303-311. https://pubmed.ncbi.nlm.nih.gov/23352752/
21. CMS. S&C-06-21, EMTALA: "Parking" of Emergency Medical Service Patients in Hospitals, July 13, 2006. https://www.pwwemslaw.com/sites/default/files/attachments/pww-article-patient-parking-and-emtala/07.13.06-cms-baltimore-emtala-patient-parking-memo_1.pdf
22. Blanchard IE, et al. The association between paramedic service system hospital offload time and response time. CJEM 2023;25(9):736-741. https://pubmed.ncbi.nlm.nih.gov/37208561/
23. Eckstein M, Chan LS. The effect of emergency department crowding on paramedic ambulance availability. Ann Emerg Med 2004;43(1):100-105. https://pubmed.ncbi.nlm.nih.gov/14707948/
24. Yoon HJ, et al. The Association Between Access Block and Ambulance Ramping, and the Impact of COVID-19 (25 Queensland hospitals). Med J Aust 2026;224(2):e70141. https://pubmed.ncbi.nlm.nih.gov/41665071/
25. Fouche PF, et al. Ambulance offload delays and patient outcomes: a systematic review. Emerg Med J 2026. https://pubmed.ncbi.nlm.nih.gov/42242732/
26. Stewart D, et al. Are EMS offload delay patients at increased risk of adverse outcomes? CJEM 2019;21(4):505-512. https://pubmed.ncbi.nlm.nih.gov/30841940/
27. Leuchter RK, et al. Health Care Staffing Shortages and Potential National Hospital Bed Shortage. JAMA Netw Open 2025;8(2):e2460645. https://pmc.ncbi.nlm.nih.gov/articles/PMC11840646/
28. Bermudez ES, et al. National Trends in ED Boarding and Interfacility Transfers by Rurality. J Rural Health 2026;42(4):e70222. https://pubmed.ncbi.nlm.nih.gov/42788596/
29. ACEP. Summit on Boarding, final report. https://www.acep.org/siteassets/new-pdfs/advocacy/acep-boarding-summit-final-report.pdf
30. AHRQ. Report on the Summit to Address Emergency Department Boarding (newsletter; could not open). https://www.ahrq.gov/news/newsletters/e-newsletter/951.html
31. Venkatesh AK, et al. National trends in ED closures, mergers, and utilization, 2005-2015. PLoS One 2021;16(5):e0251729. https://pubmed.ncbi.nlm.nih.gov/34015007/
32. CMS / eCQI. Emergency Care Access & Timeliness (ECAT) eCQM, Hospital OQR. https://ecqi.healthit.gov/upcoming-emergency-care-access-and-timeliness-ecat-ecqm-hospital-oqr-program
33. Cooney DR, et al. Ambulance diversion and ED offload delay: NAEMSP resource document. Prehosp Emerg Care 2011;15(4):555-561. https://pubmed.ncbi.nlm.nih.gov/21870947/
34. Office of the Auditor General of Ontario. 2013 Annual Report, 3.04 Land Ambulance Services. https://www.auditor.on.ca/en/content/annualreports/arreports/en13/304en13.pdf
35. Office of the Auditor General of Ontario. 2015 follow-up, 4.04 Land Ambulance Services. https://www.auditor.on.ca/en/content/annualreports/arreports/en15/4.04en15.pdf
36. Ontario government release (MPP repost), Sept 9, 2025, "Ontario Connecting More People to Faster Emergency Care." https://sylviajonesmpp.ca/ontario-connecting-more-people-to-faster-emergency-care/
37. Greaves T, et al. The impact of an ED ambulance offload nurse role. Int Emerg Nurs 2017;32:39-44. https://pubmed.ncbi.nlm.nih.gov/28285102/
38. Manguil WJ, et al. Rapid Offload to Avoid Delays to Mitigate Ambulance Patient Offload Time. J Emerg Nurs 2026 (online ahead of print). https://pubmed.ncbi.nlm.nih.gov/42955035/
39. Scharf BM, et al. Impacts of an EMS Hospital Liaison Program on Ambulance Offload Times. Prehosp Disaster Med 2022;37(1):45-50. https://pubmed.ncbi.nlm.nih.gov/34852868/
40. Farah J, et al. Association of Ambulance Diversion Policy on EMS Transport and APOT: A Comparison of Three Strategies. Prehosp Emerg Care 2024;28(8):1053-1057. https://pubmed.ncbi.nlm.nih.gov/38776421/
41. Svikers A, et al. Initiatives to reduce ambulance offload delays in EDs: a scoping review. BMC Emerg Med 2026;26:135. https://pubmed.ncbi.nlm.nih.gov/41913109/
42. Stacey E, et al. Declining Ambulance Offload Delays and Stabilised ED Length of Stay Post-COVID. Clin Exp Emerg Med 2026. https://pubmed.ncbi.nlm.nih.gov/41928702/
43. NHS England. Urgent and Emergency Care Plan 2025/26. https://www.england.nhs.uk/long-read/urgent-and-emergency-care-plan-2025-26
44. Sacramento County EMS. Policy PP-2521, Ambulance Patient Offload Time (APOT). https://dhs.saccounty.gov/PUB/EMS/Documents/PoliciesProceduresProtocols/2000/PP-2521%20Ambulance%20Patient%20Offload%20Time%20(APOT).pdf
45. Greenwood-Ericksen M, et al. ED Boarding, Inpatient Census, and Interhospital Transfer Acceptances. JAMA Netw Open 2025;8(5):e2512299. https://pubmed.ncbi.nlm.nih.gov/40434774/
