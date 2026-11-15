# Siren: 3-minute pitch

Two speakers. **A** = story and data. **B** = demo (driving the laptop).
About 330 spoken words: room to breathe in 3 minutes. Only a few numbers, said slowly.
Before you start: page open on the **Brief**, **Typical Friday**, budget **$900**, full screen, Wi-Fi tested.

The story in one line: **people wait → we found why → what if we planned ahead → time, chances of survival, money.**

---

## 0:00 – 0:30 · People wait (A)
> Picture a Friday night in a big city. Someone calls 911 because they can't breathe. And they wait. Longer than they should.
>
> It's not because there aren't enough ambulances. The ambulance closest to them is **stuck**: parked at the emergency room, still waiting to hand over a stable patient. So help has to come from further away.

## 0:30 – 0:55 · We found the bottleneck (A)
> We looked at real 911 data, tens of thousands of calls from Brooklyn on Friday nights. The pattern is clear: one or two ERs jam up at certain hours, and that's where the whole system gets stuck. Ambulances there spend over **100 hours** a night just waiting at the door.

## 0:55 – 1:10 · What if? (A)
> So we asked: what if you knew that before the night started? What if you could plan ahead and put the right help, in the right place, at the right time?
>
> That's **Siren**: an AI agent that rehearses tonight's shift on real 911 data, and recommends the smartest way to get ambulances back on the road.

## 1:10 – 2:15 · Show it (B)
> I run an ER. I have a small budget tonight. I ask the agent to plan. *(clicks **Plan this night**)*
>
> It replays the night, finds the bottleneck, and tests thousands of options: extra nurses at the door, extra ambulances, or both.
>
> Its answer: **a few nurse shifts at the right ER, at the right hours.** A nurse takes the patient at the door, so the ambulance leaves sooner. *(points at the map)* Watch the night replay: fewer people in red, waiting too long.
>
> And here's one real call from that night, a heart or breathing emergency just after midnight. Without a plan, the ambulance takes about **16 minutes**. With the plan, about **2**. *(clicks **Approve and send schedule**)* And the manager gets a schedule they can hand to staff.

## 2:15 – 2:40 · Why it matters (A)
> Planning wisely pays off three ways.
> **Time:** ambulances get back on the road, and people get help sooner.
> **Life:** in a cardiac arrest, every minute counts. Each minute of delay lowers the chance of survival by about **8%**. Minutes we give back are chances we give back.
> **Money:** a few nurse shifts free up more ambulance time than buying a new ambulance, for a fraction of the cost.

## 2:40 – 3:00 · Where it goes next, and close (A)
> This is a working prototype, so it can only suggest what our data covers. Give it more data, like live ER capacity or traffic, and it can suggest more fixes.
>
> Ambulances aren't slow. They're stuck. Siren gets them back on the road.

---

## Numbers to have ready (only if asked)
- Real data: about 34,000 Brooklyn 911 calls from 143 Friday nights, processed in Databricks.
- A real Friday: 26 of 79 urgent patients waited over 10 minutes; crews spent 113 hours at three ERs (REAL).
- The $900 plan: 5 nurse shifts, 33 ambulance-hours back; one extra ambulance costs $2,640 for 11 hours (rehearsal, costs est.).
- About 5 more people reached within 10 minutes on that night (rehearsal).
- The rehearsal matches real nights: urgent response 7.1 vs 7.3 minutes real, time at hospital 43 vs 44.
- Wall time elsewhere: widely used target 20 min; California's slowest tenth 39–49 min.

## Wording to keep honest
- Say "**chances** of survival", "people get help **sooner**". Don't say "we save X lives": in three ERs the number is too small to measure honestly.
- "Over 100 hours" and the 911 data are **real**; the plan's results are a **rehearsal**.

## If the demo breaks
- **Map blank (no Wi-Fi):** keep going; the agent panel works without map tiles. Say "the street map needs internet; the plan doesn't."
- **Page won't load:** open the Devpost link or show screenshots of Brief → Decision (take them before judging).

## Likely judge questions

**"Isn't this just a dashboard?"**
No. A dashboard shows the problem. Siren takes a goal and a budget, rehearses thousands of options on real data, and hands you a schedule to approve. The output is a decision.

**"Where's the AI?"**
The agent plans: it searches thousands of schedules and fixes on a rehearsal calibrated to real data and picks the best for the budget. (If the chat is built: plus a language model that answers what-ifs by running the rehearsal as a tool.)

**"How do you know nurses actually work?"**
We don't assume they do. Offload nurses have cut handover times in Australia, Ontario and California hospitals, with mixed results, which is why Siren compares them with ambulances and mixes and picks per night. On busy nights it adds an ambulance.

**"How many lives does this save?"**
For cardiac arrest, published research shows about 8% lower survival odds per minute of delay. In our three ERs there are only a few arrest calls a night, so a lives number would be too small to measure honestly. What we can show is minutes saved and people reached in time. Across a city, every night, that adds up.

**"Does faster handover really make 911 responses faster?"**
It frees ambulance-hours, that's direct. The link to other patients' response times is real in research but weakly measured. NYC also sends units across the city, which hides it in local data. That's why we lead with ambulance-hours and label patient numbers as rehearsal results.

**"Where do the costs come from?"**
Estimates: nurse ~$90/hour (BLS NYC registered-nurse wage plus benefits), ambulance ~$220 per staffed hour (EMS cost models). Labeled "est." on the page. A real hospital would plug in its own.

**"Isn't the ER door just one bottleneck? What about staffing, traffic, surges?"**
Yes, there are several. In our data the ER door takes the biggest share of an ambulance's time per patient, about 44 minutes, more than driving and time on scene combined, and it's the cheapest to fix. Staffing and surges are already in the plan as the extra-ambulance option and the busy nights. Rerouting, treat-and-release and smarter positioning are next.

**"Don't critically ill patients get handed over right away?"**
Usually, yes. ERs triage, so the sickest go straight in. The crews stuck at the door are mostly holding stable patients. The harm falls on the next 911 caller, whose nearest ambulance is parked at the ER.

**"What are the limits?"**
It's a working prototype: one area of Brooklyn, Friday nights, historical data, two kinds of fixes. Results on screen are rehearsal estimates, labeled SIM. Next: live data feeds, more fixes, more cities.

**"Which hospitals?"**
Three ERs in central Brooklyn, anonymized as A, B and C on purpose.

**"Can it work in another city?"**
Yes: the city lives in one config file (location, hospitals, data source). Swap the 911 feed and rerun the pipeline. NYC is city number one.
