---
layout: post
category: Programming 
title: "AI-Assisted Coding on a Budget"
imagefeature: blog/ai-assisted-coding-on-a-budget.webp
description: "Six more months, we have better tools. Agentic workflows are here: but code review, tests, and budgets still matter."
draft: true
tags: ["Programming", "LLM", "AI"]
---


## Introduction

Six months ago, I wrote about [LLMs and coding](/posts/llms-and-coding-6-months-later/) with cautious optimism. I still hadn’t fully put my finger on what AI assistance was *best* for, but I found it genuinely useful for throwaway prototypes, busy work (like documenting APIs), building test scaffolds (though I didn’t fully trust it to write valid tests), and writing the kind of helper function that you’d previously reach for a library to avoid.

Then a couple of weeks ago, I reviewed [*Vibe Coding*](/posts/book-review-vibe-coding/) and found myself nodding along with parts of it while also wondering if there was any meat on the bone—and whether the book was already out-of-date. I also argued that the book wasn’t really pushing “vibe coding” in the Andrej Karpathy sense - [where you don’t look at the code at all](https://x.com/karpathy/status/1886192184808149383) - but instead was advocating for putting [DevOps](https://en.wikipedia.org/wiki/DevOps) and actual software engineering practices around AI-assisted coding. I agreed with that framing.

Over the past few weeks, I’ve tried to let go of my need to live inside the IDE and instead lean into the command-line tools that have become the rage lately. Not just “use the latest model in Cursor / VS Code / JetBrains,” but actually embrace the CLI workflow: [Claude Code](https://claude.com/product/claude-code), [OpenCode](https://opencode.ai), and [Codex CLI](https://developers.openai.com/codex/cli).

I’m revisiting this from a very different place: unemployed, budget-constrained, and forced to live squarely inside the $20/month tier of modern AI tooling. That constraint is clarifying in ways that are hard to appreciate when cost isn’t a concern. When you don’t have an unlimited budget for tokens, things look very different than the world people like [Steve Yegge](https://steve-yegge.medium.com/gas-town-emergency-user-manual-cf0e4556d74b) are describing with the desire to run tens of CLI agents at the same time.

## Working on the New Project

This post is about what I’ve discovered building two projects—a longer-term project I’ll detail in a future post, and a quick one-off—while using agentic coding tools on a limited budget.

For the new project, I feel that this isn’t vibe coding. I look at every diff. I review every pull request (after AI review). I have tests (both unit and e2e) around everything; though they’re mostly written by AI.   I’m the one deciding what should be tested, and I review test code far more closely than I review everything else. But for this project, AI has written over 90% of the code.

Right now my setup is complicated, partly because I want to try out different tools, and partly because I’m forced to switch tools as tokens run out.

* **Claude Code**: Claude Sonnet 4.5 for most day-to-day coding work, leaning on Opus 4.5 only when I’m dealing with genuinely complex reasoning or planning problems that deserve slower thinking.
* **GitHub Copilot Agent mode**: small tasks, lint fixes, TypeScript fixes, small errors, and fixing breaking tests.
* **ChatGPT Codex**: mostly a second opinion, and a fallback when Claude Code runs out of tokens.
* **Copilot PR review**: everything lives in GitHub, and I use Copilot to review pull requests.
* **OpenCode**: recently I’ve been playing with it using the free models.

I’ve assigned issues to Copilot through GitHub Issues. I’ve had the cloud version of Claude make pull requests I started on my phone. I’ve had a lot of fun (and a lot of frustration), and I feel like the programming world has definitely changed forever.

What surprised me most over the last few months is how capable AI coding agents have become—not in a demo-friendly way, and not in a “look what it can do on a greenfield example” sense, but in the unglamorous daily grind of real development. It holds context better, makes fewer wild assumptions, and produces code that usually compiles, runs, and fits into an existing system without too much coercion (though lint and a lot of tests are definitely necessary).

A lot of my current workflow is flipping between tools because I’m constantly running out of tokens—whether it’s for a few hours (Claude Code burning through current-session tokens on a relatively complex task) or days/weeks (it’s only the 17th of the month today and I’ve used 92% of my premium tokens with GitHub Copilot).

## Working on the Previous Project

Six months ago, it was absolutely possible to “vibe code” a small app like [Paddle-Roster](https://paddle-roster.com).

Paddle-Roster is a simple pickleball (or badminton, or any sport that requires 4 players—2 on each side) [scramble](https://pickleballspots.com/what-is-a-pickleball-scramble/) matching app. You can see the source code on [GitHub](https://github.com/kriserickson/paddle-roster).

I used agents in Copilot to build the initial project (though I did use the vite-cli to build the original scaffold). The scaffolding came together quickly. The UI was serviceable. The problem showed up where problems always show up: in the core logic.

At the heart of that app is a match-generation algorithm that has to balance skill levels, byes, different opponents, different partners, not playing on the same court, and other various edge cases. On the surface it sounds straightforward. In practice, it’s anything but.

The first version generated by an LLM worked well enough to be convincing, which turned out to be part of the problem. As soon as real usage began, subtle issues surfaced. Certain players were favored. Some combinations repeated too often. Others were silently excluded. Performance degraded under specific conditions (some approaches I tried simply **exploded combinatorially**).

Over time, that algorithm went through four separate incarnations. I manually rewrote it. I collaborated with Opus 4.5 on alternative approaches. I iterated on versions that looked better on paper but failed under real data. Even now, it isn’t perfect.

In my mind, AI-assisted coding was great—especially for small greenfield projects that could be almost one-shot (generating a fully functional application or complex feature using a single natural language prompt). If you had a project you wanted for yourself and didn’t need to worry about the complexities of security, authentication, edge cases, and the like, six months ago agents in VS Code / Cursor / Windsurf could easily create most of what you needed.

## What Is Different

So what has changed?

The models are better, *a lot* better. I don’t know how much they’ve improved for non-coding, because I’ve felt they’ve been pretty good for non-coding things since 4o (May 2024). I used the ChatGPT app a ton on my last vacation to France for everything from planning a two-hour blitz of the Louvre, to reading Latin inscriptions on random buildings, to seeing if it could read Egyptian hieroglyphs (interestingly it admitted it can’t translate hieroglyphs, but it could tell me the text of the particular stela I’d been looking at, since it was clearly in its corpus), to the history of the Cathars.

For low-stakes information (if it gets the name of a Cathar king wrong, I’ll have forgotten the name within the day anyway), ChatGPT—helped by having a great mobile app—has been useful for over a year. I still keep a document of surprisingly delicious recipes it has come up with when I give it the contents of my fridge/freezer/pantry and tell it I’m in the mood for something with a Spanish/Middle-Eastern/Mexican/Indian/French feel. That document stretches back a couple of years and dozens of dishes.

But something has changed with both the CLI tooling and the models in the past few months, and it’s not just Claude Opus 4.5 like the rest of the world would have you believe. All of the tools feel more competent.

Because I’m so token-starved (I can get one or two features done in a session before Claude Code runs out of tokens and tells me to come back later), I often hand off the task of finishing the last 10% to Copilot in Agent mode:

* getting the type-checks to work in TypeScript (`tsc --noEmit`)
* fixing lint issues (I’ve switched to Biome for speed and a sane config file)
* getting tests to pass using the free models in Copilot (currently I’m using Raptor Mini because I’m already around 90% usage of premium models by the middle of the month)

And 90% of the time it can fix the problem correctly.

A month or so ago, with the same workflow, I’d hit the “Copilot has been working on this problem for a while, do you want to continue?” prompt almost half the time. I had to do the dance of switching between free models (I was bouncing between [Raptor Mini](https://dev.to/vevarunsharma/so-what-is-github-copilots-raptor-miniand-why-should-devs-care-3n30), Grok Code Fast 1, and GPT-4o) and sometimes just had to fix things manually.

I also found that a month or so ago Copilot Agent would regularly neuter the tests rather than fix them, create horrible types rather than fix TypeScript properly, and use lint ignores rather than fixing the problem. Now those occurrences are much less frequent—and I’m not sure the models have changed *that* much (their names certainly haven’t).

I don’t have metrics to quantify this. Things just feel better (which is, I guess, very appropriate for vibe coding). I kind of wish I had kept better track of how often the previous tools were failing or working against me, and how often it’s happening now. I still have to do multiple prompts frequently to get what I want. It still misunderstands what I’m asking a few times a day. But overall it really just *feels* better.

## A Quick Example

I took a short break from the larger project I’m working on (to be revealed later) and spent a weekend knocking out an idea I’d had for a few months: creating a chatbot for this blog.

Whenever I write a blog post, it usually starts at 5–10x the length of my final version—just rambling and trying to get every thought out—before it gets winnowed down into something (hopefully) readable over time and through editing. For the past couple of years I’ve kept those drafts and thought it might be interesting to use them as data for RAG, so people could “chat” with the post and have a more interactive experience (especially now that I’ve turned off comments, because I didn’t have time to clean the 90% spam they produced).

That idea connected to something else I’d been thinking about: a better way to expose my more complete resume. When I started applying for jobs this time around I had a four-page resume, and was quickly told by everyone that you need to get it down to one page, or at most two. A resume chatbot could let people explore the supplemental detail only if they cared.

Then a few days ago, [Nate Jones](https://natesnewsletter.substack.com) posted a video on [LinkedIn is Dead](https://www.youtube.com/watch?v=0teZqotpqT8&t=9s) that came across my YouTube feed, and I realized my weird idea might not be so weird after all.

So I went to work building an [Interactive CV](https://agingcoder.com/cv/), borrowing his idea of a Fit Assessment, but building it with AI coding assistants. The initial build came from [OpenCode](https://opencode.ai) using the free [Big Pickle model](https://www.crackedaiengineering.com/ai-models/opencode-big-pickle) (which is apparently just [GLM 4.6](https://github.com/anomalyco/opencode/issues/4276)).

I spent about five hours building the code. It would have been faster if I’d had tokens left for Claude Code, but I also really wanted to try doing something a bit more real in OpenCode. Most of the time was the iterative process of making the page look and feel right.

* Getting the chat to feel like a proper chat with typing
* Streaming the results from the AI model so it started “typing” as quickly as possible
* Converting the Python [RAG engine](/posts/rag-time-cooking-up-smart-recipe-suggestions/) I had written earlier into JavaScript
* Research into the various [Cloudflare AI Embeddings](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/) and whether I could precompute embeddings locally with Hugging Face. I can’t precompute *identical* embeddings unless I run the *exact* same model weights + tokenizer + configuration Cloudflare is using and on the same JavaScript engine, computer and OS (floating point is notoriously noisy for slight precision differences); otherwise the vectors will differ.
* Moving the chat interface from JavaScript to TypeScript (which kind of failed in OpenCode, so I used Codex to get it working)
* Cleaning up the code (AIs still love to generate 1,000-line functions, which just will not stand)
* Going back and forth with various chatbots on the system and user prompts, trying to keep them accurate without hallucinating

At the time of writing I still consider the project to be alpha code quality. There are only a couple of tests, the Cloudflare Worker is still JavaScript, and there isn’t enough logging or error handling. I still haven’t written any e2e tests yet—that’s the next thing to do.

I also need to write model evaluation code. I’ve played with a few models (GPT-5-mini is better but pretty slow; GPT-4.1-mini is pretty good; and I found that 4o-mini was almost as good as 4.1-mini at less than half the cost), but I should do the work to evaluate models beyond the vibes.

In a real project I’d also add more logging and analytics—not only to keep an eye on AI usage, but to see how the AI is actually performing. I also didn’t do this weekend build with pull requests like I usually do, so none of the code has been reviewed by an AI code review tool (like [Copilot](https://docs.github.com/en/copilot/concepts/agents/code-review), [CodeRabbit](https://www.coderabbit.ai), [Greptile](https://www.greptile.com), or Cursor’s [BugBot](https://cursor.com/bugbot)).

But I still consider knocking out a project like this in five hours a huge success in showing what AI-assisted coding can do. I spent more than double that time working on the [backing material](https://github.com/kriserickson/aging-coder/blob/main/api-worker/src/rag-data/questions.json) (which is almost 20,000 words of background text) to feed the RAG engine.

## Conclusion

If I’m honest, I don’t think the Interactive CV could have been built in under a week—even six months ago. Not because the code was hard, but because the integration work is where projects usually die: streaming UI polish, glue code, prompts, RAG wiring, and the thousand tiny cuts that turn a “weekend idea” into a pile of half-finished branches.

What’s different now is that the tooling has started to fit into the way my brain already works. When I get an idea while biking, I don’t pull over to dictate a voice memo anymore. I dictate to Claude Code, and when I get home there’s often a pull request waiting. That still feels slightly ridiculous to type, but it’s also real. The loop is tighter. The cost of experimentation has dropped. I try more ideas because it’s cheap—in time, if not always in tokens.

I have no idea what the next year looks like. Things have gotten better so quickly that I can’t tell whether we’re in the middle of a continuous curve, or we just hit a burst of capability and we’re going to plateau for a while. Either way, one trend feels obvious: the economic side of coding is changing as fast as the technical side.

The cost of coding is going up in a new dimension—not developer salary, but inference. That will create AI haves and have-nots: teams with the budget (and contracts) to run the best models at scale, and everyone else squeezing value out of free tiers, smaller models, and clever workflows.

And whenever there’s a widening gap and money on the table, the ugly stuff follows. If premium inference becomes a serious advantage, we should expect more credential abuse and key theft attempts—not because developers are inherently shady, but because incentives push in that direction. The right response isn’t to romanticize it; it’s to acknowledge it and design for it: least-privilege keys, short-lived tokens, rate limits, audit logs, and a default assumption that anything long-lived will eventually leak.

For me, the practical takeaway is simple: I’m leaning harder into agentic workflows, but I’m not giving up engineering discipline. Diffs still matter. Tests still matter. Observability still matters. The tools are finally good enough that I can move faster without turning my codebase into a vibe-coded haunted house of eldritch horrors - and that’s the part that feels like the real step change.