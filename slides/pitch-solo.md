# SIREN: solo pitch (one speaker, about 2:45)

You talk and click. Start on the Brief screen, Typical night, $900, chat server running.
Lines in *italics* are what you do, not what you say.

---

Ambulances in New York don't always reach patients fast enough. One big reason: they get stuck at the ER. A crew can't leave until the ER takes their patient, and while they wait, that ambulance can't answer the next 911 call.

So I built **SIREN**, an AI agent that finds the cheapest way to cut that delay.

*(point at the screen)*

This is real 911 data from Brooklyn. On this Friday night, near three ERs, **26 of 79** urgent patients waited more than ten minutes for an ambulance. And ambulances spent **113 hours** at those ERs instead of on the road.

The obvious fix is more nurses or more ambulances. But ERs are already short-staffed and budgets are thin. So the real question is: where, and when, does a small budget help most?

Let's say I run this ER and I have **$900** tonight.

*(click Plan this night)*

Siren replays the night and tests thousands of options: nurses at the ER door, extra ambulances, or both.

Its answer: **five nurse shifts**, mostly at Hospital B in the evening. That frees **33 ambulance-hours**. An extra ambulance would cost **$2,640** and free about 11.

*(point at the pin on the map)*

Here's one real call from that night. Just after midnight, a heart or breathing emergency. Without a plan, the ambulance takes **16 minutes**. With the plan, about **2**.

*(click the chip "What if Hospital B is short-staffed tonight?")*

And I can ask what-ifs. If Hospital B is short-staffed, it re-runs the night and gives me a new plan in seconds.

*(click Approve and send schedule)*

When I'm happy, I approve it, and the staff get a shift sheet.

So what's it worth? About **5 more** urgent patients reached in time on one night. In a cardiac arrest, every minute of delay cuts the chance of survival by about **8 percent**. And nurse shifts free three times the ambulance time of a new ambulance, at a third of the cost.

Right now Siren covers one part of Brooklyn using past data. With live ER data, it could plan tonight, and work in any city with open 911 data.

Ambulances aren't slow. They're stuck. **SIREN gets them back on the road.**

---

## Remember
- Say "113 hours **at** the ERs", not "waiting at the door".
- Say "chance of survival", never "we save X lives".
- The plan's numbers are a rehearsal; the 911 data is real. If asked, say exactly that.
- If the chat is slow, keep talking: "it's re-running the whole night."
- If the map is blank, keep going: "the map needs internet, the plan doesn't."
