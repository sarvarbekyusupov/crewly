# Crewly — 90-Day Roadmap

**Candidate-first launch in Tashkent via Telegram**
*Prepared June 2026 · Solo founder plan*

---

## The strategy in one paragraph

You tried to build a two-sided hiring marketplace on borrowed data (HH and LinkedIn), and both blocked the data you needed. That is actually a useful signal: do not build on other platforms' data, and do not launch both sides at once. Candidates are the hard side to acquire and the side employers pay to reach — and candidates are exactly where you have an advantage. So the plan is: win the candidate side first, using Telegram (where Tashkent job seekers already are), grow it with AI career help that people tell their friends about, and only then turn employers into paying customers.

> **Sequence: candidates (Telegram, your strength) → grow with AI career help → monetize employers.**

## One unblock before you start

You may already have more candidate-side access than you think. The HeadHunter API has an **employer-resumes** endpoint — meaning resume search and access is available through employer credentials, not a separate candidate API. So the candidate data you wanted can come in through the "employer door." Verify exactly what hh.uz grants your employer account (resume search, vacancy read), because it may let you seed job listings and even candidate matching on day one. Treat HH as a supply source you query, not a platform you depend on.

## What you are building first (the MVP)

A Telegram bot, not a website. In Tashkent, job seekers live in Telegram, and a bot has near-zero friction — no app install, no LinkedIn login. The entire v1 is this loop:

1. Candidate sends a CV or answers ~5 questions.
2. Your AI structures it into a clean profile.
3. Bot shows matching jobs, aggregated from Tashkent Telegram channels and the HH employer API.
4. AI helps them get hired: rewrites the CV, explains rejections, preps for interviews.

Jobs come from public Tashkent job channels (e.g. @hrjobuz, @itjobstashkent) plus whatever HH exposes. The AI's real job is turning messy Telegram posts into structured, matchable listings — something no global competitor will bother to do for the Uzbek market. That messiness is your moat.

---

## The 90 days at a glance

| Phase | Focus | Goal by end of phase |
|-------|-------|----------------------|
| **Days 1–30** | Build + seed jobs | Working Telegram bot; CV → profile; live job feed from 1–2 channels + HH; ~30–50 hand-recruited candidates testing it. |
| **Days 31–60** | Get candidates + retention | The AI career help is good enough that people refer friends. 300–500 active candidates; clear signal on what they value most. |
| **Days 61–90** | First employer pull | Enough candidate density to approach 5–10 employers/HR you know; first paid or pilot job post; decide what to build next. |

## Days 1–30 — Build the loop and seed jobs

**Goal:** A candidate can message the bot, get a structured profile, and see real Tashkent jobs that match. You personally recruit the first 30–50 candidates.

**Do this:**

- Stand up the Telegram bot skeleton (BotFather + a simple backend). Keep the stack boring and fast.
- Build the CV intake: accept a PDF/photo CV or a 5-question flow, and use AI to turn it into a structured profile (role, skills, experience, salary, location).
- Pick 1–2 Telegram job channels to start (e.g. @hrjobuz, @itjobstashkent). Write a script that pulls posts and an AI step that parses each into a structured job.
- Confirm your HH.uz employer access: can you read vacancies? search resumes? Document exactly what is available — this decides how much you lean on HH vs Telegram.
- Build a basic match: given a candidate profile, show the top 5 jobs. It does not need to be perfect — it needs to feel useful.
- Recruit 30–50 real candidates by hand: your network, universities, the communities you already reach. Watch them use it. Sit next to a few if you can.

**Milestone:** End-to-end loop works for one real person who is not you, and they say "this is useful."

## Days 31–60 — Make candidates love it, then grow

**Goal:** Turn the bot from "job list" into "the thing that helps me get hired," so candidates come back and tell friends.

**Do this:**

- Ship the career-help features one at a time and measure each: AI CV rewrite, "why was I rejected" feedback, interview prep for a specific job.
- Add a referral hook inside the bot (e.g. invite a friend to unlock a feature, or simply ask happy users to share).
- Track 3 numbers only: active candidates, return rate (came back in 7 days), and referrals. Ignore vanity metrics.
- Expand job sources to 4–6 channels once parsing is reliable. Quality of listings beats quantity.
- Talk to 10 candidates per week. Find the one feature they would be upset to lose — double down on it.

**Milestone:** 300–500 active candidates and a return rate that is clearly not zero. You know your single strongest feature.

## Days 61–90 — First employer pull and monetization test

**Goal:** Use your growing candidate pool as the reason employers should pay attention. Get the first employer to post a job or pay for matched candidates.

**Do this:**

- Make a one-page pitch for employers: "We have N active candidates in Tashkent in [roles]. Post a job free / get matched candidates."
- Approach 5–10 employers or HR people you can reach warmly. You said employers are not your strength — so start with anyone you already know, and ask them for intros.
- Offer the first job post free in exchange for honest feedback; price the second one. The aim is to learn willingness to pay, not revenue yet.
- Close the loop: when an employer posts, route real candidate matches to them and measure response quality.
- Write a one-page decision memo: what worked, what did not, and whether the next 90 days double down on candidate growth or push harder on employer monetization.

**Milestone:** At least one employer actively using it, and a clear, evidence-based decision on where to focus next.

---

## What NOT to do (so you stay unstuck)

- **Don't rebuild the two-sided marketplace.** One side at a time. Candidates first.
- **Don't wait on LinkedIn or any API you don't control.** Telegram + HH employer access + your own candidate pool is enough to launch.
- **Don't build a polished app yet.** A bot that works beats a beautiful product nobody uses.
- **Don't chase metrics that don't matter.** Active candidates, return rate, referrals. That's it for now.
- **Don't scale job sources before parsing is reliable.** Bad listings break candidate trust fast.

## Main risks and how to handle them

| Risk | How you handle it |
|------|-------------------|
| Telegram parsing is messy / unreliable | Start with 1–2 channels, AI-parse, and manually verify until accuracy is high. Quality over coverage. |
| HH employer access is more limited than hoped | Lean harder on Telegram for jobs; your own candidate pool is the asset, not HH's data. |
| Candidates try it once and leave | That means the career-help isn't strong enough yet. Fix retention before growing. |
| Employers won't pay (your weaker side) | That's fine at day 90 — the goal is candidate density first. Monetization is a later-phase problem. |
| Doing it all solo | Keep scope brutally small. The phases above are designed to be shippable by one person. |

## Your single next step

**This week: stand up the bot skeleton and get the CV → structured profile step working for one real candidate. Everything else follows from that loop existing.**

---

*Sources consulted: HeadHunter API docs (hhru/api — employer_vacancies, employer_resumes); Tashkent Telegram job channels @hrjobuz, @itjobstashkent.*
