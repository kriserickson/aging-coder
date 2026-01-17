---
layout: post
category: Programming 
title: "Vibe Coding Was the Hype. This Is AI-Assisted Coding."
imagefeature:
description: Six more months. Fewer illusions. Better tools. Same hard problems. 
draft: true
tags: ["Programming", "LLM", "AI"]
---

## Introduction

Six months ago, I wrote about [LLMs and coding](/posts/llms-and-coding-6-months-later/) with cautious optimism, I hadn't put my finger on exactly what to use AI assistance for but in my mind it was great for throwaway prototypes, busy work (like documenting APIs), building test scaffolds (though I wasn't fully trusting it to write valid tests) and doing things like writing a helper function where previously you would pull in a library. A couple of weeks ago, I reviewed *[Vibe Coding](/posts/book-review-vibe-coding/)* and found myself nodding along with parts of it while wondering if there was any meat on the bone and whether or not it was wildly out-of-date.  I also argued that the book wasn't really arguing for `Vibe Coding` in the [Karpathy](https://en.wikipedia.org/wiki/Andrej_Karpathy) definition which you don't actually look at the code, but putting [DevOps](https://en.wikipedia.org/wiki/DevOps) and [Software Engineer Practices](https://itrevolution.com/product/the-phoenix-project/) around AI assisted coding -- which I agreed with.   Over the past few weeks, I decided that I had to let go of my need to live in the IDE and experiment with the command-line tools that have become the rage over the past few weeks - not only use the latest models (which I had been doing in [Cursor](https://www.cursor.com/), VS Code and the various JetBrains IDEs) but embrace the new command line tooling like [Claude Code](https://claude.com/product/claude-code), [OpenCode](https://opencode.ai) and [Codex CLI](https://developers.openai.com/codex/cli).  

I should point out that I’m revisiting this topic from a very different place: unemployed, budget-constrained, and forced to live squarely inside the twenty-dollar-a-month tier of modern AI tooling. That constraint turns out to be clarifying in ways that are hard to appreciate when cost isn’t a concern. When you don't have a an unlimited budget for tokens things are a little different from the worlds that people like [Steve Yegge](https://steve-yegge.medium.com/gas-town-emergency-user-manual-cf0e4556d74b) are living in with his desire to run tens of CLI agents at the same time -- I can't even comment on that nor do I want to live in a world where I don't care what the code looks like.  

This post is some thoughts on building a new project (which I will detail in a future post) with CLI's on a limited budget.  It isn't Vibe Coding: I am looking at every diff, and reviewing every pull request (after AI review).  I have tests (both unit and e2e) around everything, and though they were mostly written by AI, I instructed the AI what to test, and I review the test code much more closely than I review everything else.  But in this project, AI has written over 90% of the code.

## The New Project

Right now, my tooling setup is pretty complicated because I not only want to try out different tools, but I am being forced to switch between tools as tokens run out. I’m using Claude Code (Claude Sonnet 4.5 for most day-to-day coding work, leaning on Opus 4.5 only when I’m dealing with genuinely complex reasoning or planning problems that deserve slower thinking). Github Copilot Agent mode for small tasks, lint fixes, typescript fixes, small errors and fixing breaking tests.  I also am using ChatGPT Codex, but more as a second opinion than a primary driver when Claude Code runs out of tokens. Everything lives in GitHub, and I am using Copilot to do the code review on pull requests.  And recently I have started playing with OpenCode with the free models.  I have have assigned issues to CoPilot through the issues in GitHub, I have had the cloud version of Claude make pull requests I have made on my phone.  I have had a lot of fun (and a lot of frustration), and I feel that the programming world has definately changed forever.

What surprised me most over the last few months is just how capable AI Coding agents have become. Not in a demo-friendly way, and not in a “look what it can do on a greenfield example” sense, but in the unglamorous daily grind of real development. It holds context better, makes fewer wild assumptions, and produces code that usually compiles, runs, and fits into an existing system without too much coercion (though lint and a lot of tests are definately necssary).

A lot of my current workflow is flipping between the various AI tools because I find myself constantly running out tokens, whether it is for a few hours (with Claude code running of Current Session tokens when I ask it to perform a relatively complex task) or days or weeks (its only the 17th of the month today and I have used 92% of my premium tokens with Github CoPilot).

## The Previous Project

Six months ago, it was absolutely possible to “vibe code” a small app like [Paddle-Roster](https://paddle-roster.com). 

<img style="border: 1px solid #000; margin: 10px; width: 60%" src="/img/vibe-coding/paddle-roster-screenshot.webp">

Paddle-Roster is a simple Pickle Ball (or badminton, or any sport that requires 4 players 2 on each side) [scramble](https://pickleballspots.com/what-is-a-pickleball-scramble/) matching app - you can see the source code on [GitHub](https://github.com/kriserickson/paddle-roster).  I used agents in Copilot to build the initial project (though I did use the vite-cli to build the original scaffold). The scaffolding came together quickly. The UI was serviceable. The problem showed up where problems always show up: in the core logic. At the heart of that app is a match-generation algorithm that has to balance skill levels, bye's, different opponents, different partners, not playing on the same court, and other various edge cases. On the surface, it sounds straightforward. In practice, it’s anything but. The first version generated by an LLM worked well enough to be convincing, which turned out to be part of the problem. As soon as real usage began, subtle issues surfaced. Certain players were favored. Some combinations repeated too often. Others were silently excluded. Performance degraded under specific conditions (the complexity of one of the algorithm I tried was n<sup>n</sup>).

Over time, that algorithm has gone through four separate incarnations. I manually rewrote it. I collaborated with Opus 4.5 on alternative approaches. I iterated on versions that looked better on paper but failed under real data. Even now, it isn’t perfect.

In my mind AI assisted coding was great, especially for small GreenField projects that could be almost one-shot (generating a fully functional application or complex feature using a single natural language prompt).  If you had a project that you wanted for yourself, and didn't need to worry about the complexities of security, authentication, edge-cases, and the like, 6 months ago agents in a VS Code/Cursor/Windsurf could easily create most of what you needed.  

---

So what has changed.  The models are better, a lot better.  I don't know how much they have improved for non-coding, 

---

The persistent problem is UX, not UI. LLMs are still very good at producing interfaces that look finished and very bad at understanding how people actually struggle with software. Flows feel awkward. Defaults are subtly wrong. Important actions are buried or emphasized incorrectly. Nothing is obviously broken, but very little is truly right.

This is where the idea of Vibe Coding breaks down most clearly. UX requires an understanding of intent, friction, and human behavior that goes beyond pattern matching. LLMs optimize for plausibility. They generate what looks like an app, not what feels good to use.

The result is software that passes a visual sniff test while quietly accumulating usability problems.

---

This is the point where I want to be explicit: what I’m doing now is not Vibe Coding.

Vibe Coding implies intuition over rigor, flow over structure, speed over judgment. What’s actually happening in practice is something much closer to traditional engineering, just with a different set of tools. Code is written faster, but it still needs to be reviewed, tested, and understood. Decisions still matter. Tradeoffs still exist. Responsibility does not disappear.

The work hasn’t been eliminated. It has been displaced.

In fact, one of the more dangerous side effects of modern LLMs is how easy they make it to believe you’re done. The output is confident. The structure looks reasonable. The code compiles. That confidence is contagious, and it creates what I’ve come to think of as confidence debt. Problems aren’t eliminated; they’re deferred. When they surface, they do so under pressure, with users, in production.

False confidence is becoming a new form of technical debt.

---

The most accurate mental model I’ve found is that LLMs are junior engineers with infinite stamina and no accountability. They produce a lot of code. They miss edge cases. They struggle with long-term consequences. They get better when you guide them carefully and worse when you trust them blindly.

Used well, they are transformative. Used poorly, they are deceptively dangerous.

The role of the developer hasn’t vanished. It has shifted toward judgment, review, and system-level thinking. There is less typing and more deciding. Less syntax and more responsibility.

That isn’t Vibe Coding. That’s still engineering.

---

I’m also working on a new project right now, one that’s benefiting heavily from these tools but also exposing their limits in familiar ways. It’s too early to talk about specifics, and I’ll save that for when it’s ready, but the pattern is already clear. The LLMs accelerate the obvious parts and stumble over the important ones. They help me move faster, not think less.

Which brings me to the bottom line.

Even at twenty dollars a month, modern LLMs are now indispensable. I would not willingly give them up. But the fantasy that software engineering has become effortless, intuitive, or purely vibe-driven hasn’t survived sustained contact with reality.

The ceiling has moved. The floor has not disappeared. Hard problems remain hard. UX still matters. Algorithms still fight back.

The tools are better. The illusions are fewer. The work is still the work.

And that’s probably how it should be.
