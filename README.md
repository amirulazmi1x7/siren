# SIREN

**Ambulances aren't slow. They're stuck at the ER. Siren gets them back on the road.**

Built at MadHacks 2026 (UW-Madison, Nov 14 to 15, theme "Let's Dig In").

Siren is a planning agent for ER managers. It replays a real Friday night of Brooklyn 911 calls, tests where and when to put offload nurses (or extra ambulances) within a budget, and hands back a shift schedule to approve.

- Real data: about 34,000 NYC 911 calls from Brooklyn Friday nights.
- A rehearsal of each night (calibrated against real nights) scores every option.
- Map-first web app with a what-if chat that re-runs the rehearsal for each answer.

Every number on screen is labelled REAL (NYC data) or SIM (rehearsal output). Hospitals are shown as A, B and C on purpose.

## Team

- **Amirul Azmi** ([@amirulazmi1x7](https://github.com/amirulazmi1x7)): web app, product and pitch
- **Mukhriz Hazli** ([@MukhHz](https://github.com/MukhHz)): data pipeline, rehearsal model and optimizer

Original team repo: [MukhHz/madhacks-2026](https://github.com/MukhHz/madhacks-2026). This is a copy with the same history.

## Run it

```bash
cd web/app
npm install
npm run dev
```

The what-if chat needs its own server and an Anthropic API key in your shell (never commit the key):

```bash
export ANTHROPIC_API_KEY=your-key-here
PYTHONPATH=. python -m chat.server
```
