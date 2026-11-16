# SIREN: 3-minute pitch script (practice version)

Two speakers. **A** = story. **B** = demo (drives the laptop).
About 360 spoken words: 2:45 at a calm pace, leaving room for clicks. Numbers in **bold** are the only ones to say out loud.
Start state: page on the **Brief**, **Typical** night, budget **$900**, chat server running, full screen.

Flow in one line: **the problem → the proof → why it's hard → watch Siren plan it → what it's worth → what's next.**

---

## 0:00 to 0:20 · The problem (A)
> Ambulances in New York don't always reach patients fast enough. One big reason: they're stuck at the ER.
> The crew can't leave until the ER takes their patient, so that ambulance can't answer the next 911 call.
>
> We built **SIREN**, an AI agent that finds the cheapest way to cut that delay.

*(Pause after "stuck at the ER".)*

## 0:20 to 0:40 · The proof, from real data (A)
> We dug into about **34,000** real 911 calls from Brooklyn Friday nights.
> On one real Friday, near three ERs, **26 of 79** urgent patients waited over ten minutes for an ambulance.
> That night, ambulances spent **113 hours** at those ERs instead of on the road.

*(B points at the "26 of 79" line already on screen.)*

## 0:40 to 0:55 · Why not just fix it? (A)
> Hiring more nurses or buying ambulances sounds obvious. But ERs are already short-staffed and budgets are thin.
> So the real question is: **where, and when, does a small budget help most?**

*(This answers the mentors' "why not just hire more staff?" before anyone asks.)*

## 0:55 to 2:05 · Watch Siren plan it (B)
> I run operations at this ER, and tonight I have **$900**. *(clicks **Plan this night**)*
>
> Siren replays the night and tests thousands of options: nurses at the ER door, extra ambulances, or both.
>
> Its pick: **five nurse shifts**, mostly at Hospital B from 8 PM to 2 AM. That frees **33 ambulance-hours**. One extra ambulance would cost **$2,640** and free about 11.
>
> Here's one real call: just after midnight, a heart or breathing emergency. No plan: the ambulance takes **16 minutes**. With the plan: about **2**. *(points at the pin on the map)*
>
> I can also ask a what-if. *(clicks "What if Hospital B is short-staffed tonight?")* It re-runs the night and re-plans in seconds.
>
> Then I approve it, *(clicks **Approve and send schedule**)* and staff get a shift sheet.

*(The ~5 s chat answer fills a pause. If it's slow, keep talking: "it's re-running the whole night with one ER short-staffed.")*

## 2:05 to 2:30 · What it's worth (A)
> That pays off three ways.
> **Time:** about **5 more** urgent patients reached within ten minutes, on that one night.
> **Chances:** in a cardiac arrest, every minute of delay cuts survival odds by roughly **8 percent**.
> **Money:** nurse shifts free three times the ambulance time of a new ambulance, at a third of the cost.

## 2:30 to 2:50 · What's next, and close (A)
> Today Siren covers one part of Brooklyn with past data. With live ER feeds, it can plan tonight, test more fixes, and run in any city with open 911 data.
>
> Ambulances aren't slow. They're stuck. **SIREN gets them back on the road.**

---

## Numbers cheat sheet (all checked against the data)
| Say | What it is | Label |
|---|---|---|
| 34,000 calls, 143 Friday nights | Brooklyn 911 records used | REAL |
| 26 of 79 urgent waited over 10 min | Typical Friday (Aug 21) near 3 ERs | REAL |
| 113 hours at 3 ERs | Same night, arrival at ER to back in service | REAL |
| 5 nurse shifts, $900 | Siren's pick at $900 | SIM |
| 33 ambulance-hours back | That plan, average of rehearsal runs | SIM |
| +1 ambulance: $2,640, about 11 h back | Comparison option (cost is an estimate) | SIM |
| 16 min → about 2 min | One real call (12:02 AM, Hospital B); times are rehearsal results | SIM |
| about 5 more reached in 10 min | 22.8 → 17.8 late, typical night | SIM |
| roughly 8% per minute | Cardiac arrest survival, published research (studies range 4 to 11%) | research |

## Wording rules (don't break these on stage)
- Say **"113 hours at the ERs"** or **"from arriving to being free again"**, not "just waiting at the door". That time includes handover, cleaning and paperwork.
- Say **"chances of survival"**, never "we save X lives". In three ERs the number is too small to measure honestly.
- Say **"one big reason"**, not "the reason". Real data shows the time at the ER; the link to slower 911 answers is real in research but only modestly measured.
- Hospitals are **A, B and C**. Never name them.
- Say **"an AI agent that rehearses the night"**, not "digital twin" or "simulation".

## Judge questions: short answers
**Who uses it?** An ER operations lead plans tonight's shifts. The EMS side uses the same plan to see when an extra ambulance beats nurses.

**Is the data real?** The 911 calls, response times and hours at the ERs are real NYC records. The plan's results are a rehearsal of that night, checked against real nights (urgent response 7.1 vs 7.3 minutes real). The screen labels each number REAL or SIM.

**Where's the AI?** The agent searches thousands of schedules on the rehearsal and picks the best for the budget. The chat is a language model that answers what-ifs by actually re-running the rehearsal, so every number comes from a run, not a guess.

**Isn't this just a dashboard?** A dashboard shows the problem. Siren takes a goal and a budget, tests options, and hands you a schedule to approve.

**Do offload nurses actually work?** Evidence is mixed. One California ER cut its worst-case handover from about 80 to about 31 minutes with a dedicated nurse and area; Ontario's results varied by hospital. That's why Siren doesn't assume nurses win: it compares them with ambulances and picks per night. On some busy nights it adds an ambulance.

**Isn't that a band-aid? Isn't the real cause full hospital beds?** Yes, full beds upstream are the root cause. Siren works on the cheapest piece you can change tonight while the bigger fix takes years.

**How many lives does it save?** In cardiac arrest, survival drops roughly 8% per minute of delay. In three ERs there are only a few arrest calls a night, so a lives number would be too small to measure honestly. We show minutes and people reached in time instead. Across a city, every night, that adds up.

**Where do the costs come from?** Estimates. Nurse about $83 to $110 an hour in NYC (BLS wage plus benefits; we use $180 per 2-hour shift). Ambulance about $220 per staffed hour, the top of a published $75 to $220 range. Even at the low end, an ambulance-night costs about the same as the 5-shift plan, and the nurses still free about three times the hours.

**Is this a national problem?** It's serious in busy city systems, not everywhere. California caps handover at 30 minutes and still runs 39 to 49 minutes for its slowest tenth.

**What are the limits?** One area of Brooklyn, Friday nights, past data, two kinds of fix. Next: live feeds, more fixes, more cities.

## Practice plan
1. **Read it aloud once with a timer.** Target 2:50. Mark where you run long.
2. **Run it 3 times with the real demo**, clicking for real. B practices the clicks until they're automatic.
3. **Practice one failure:** turn the chat server off and do the what-if line anyway ("it re-plans for a short-staffed ER"); skip the click.
4. **Swap roles once**, so either of you can cover if the other blanks.
5. **Have one person fire three judge questions** from the list at you after each run. Answers under 20 seconds.

## If the demo breaks
- **Map blank (no Wi-Fi):** keep going. "The street map needs internet; the plan doesn't."
- **Chat offline:** skip the what-if click, say the line anyway.
- **Page won't load:** switch to the backup video or screenshots (record them before judging).
