---
layout: post
category: 
title: "Agents all the way down"
imagefeature: blog/agents-all-the-way-down.webp
description: "When agents write, run, and “review” code for us, the real risk isn’t bugs—it’s what happens when we stop verifying and start trusting outputs by default."
tags: [ "LLM", "AI", "Programming", "SciFi"]
date: 2026-02-11
---

## What I Thought the End of Coding Would Look Like

I started writing a story almost 28 years ago, back when I was still taking CompSci at college and spending a lot of time with the kind of ideas that feel inevitable when you’re young and the future looks like it’s accelerating: self-modifying systems, software that “evolves” instead of being written, the sense that if you just push compute far enough you can brute-force your way into intelligence. While in the 90s CPUs were massively increasing in speed (30x over the decade), the thought was that quantum computing was just around the corner.

I didn’t have a clean mental model of quantum computing then, more like the sci-fi version of it: a magical lever you could pull that turned “hard” into “possible.” In my notebook the idea became a kind of Manhattan Project for code. Humans had failed at software, so we’d build a machine that could generate it better than we ever could. You’d describe the requirements, and the machine, through some evolutionary search across program space, would generate every program imaginable until one satisfied the spec. Not “coding,” not in the way humans do it. Something alien. Something closer to selective pressure than craftsmanship.

And I never, not even a little, contemplated that we’d end up with computers that can write software like humans do: naming things, refactoring, explaining, arguing, persuading, just by predicting the next token.

In my backstory, the catalyst was the [Year 2038 problem](https://en.wikipedia.org/wiki/Year_2038_problem). Not a quirky date bug, but a systemic cascade: markets glitching into freefall, vehicles, planes and trains failing in fatal crashes, elevators freezing between floors. Embedded systems breaking in places you never think about until they betray you. Panic followed by a slow, grinding global depression. Jobs disappearing. And something even harder to rebuild than money: trust — especially trust in software written by humans.

That’s where the political turn happened in my story. It took years and a Manhatten style project to build the new super-computer, this global-scale, centralized system that would control the world’s software so the chaos couldn’t happen again. And when it finally came online, the elites had ensured that it led to a different kind of dystopia: guaranteed basic income so no one starved, but no one had any freedom either. The masses were kept down with barberism and constant surveillance. The elites ruled openly. The bargain was explicit: stability in exchange for agency.

The plot needed a MacGuffin, so I gave it one: the original creator of the system, before the elites fully captured it, had embedded a backdoor. A safety hatch. A last-resort “if this becomes corrupted, here’s how you pull the plug.” My hero’s job was to find it: a cyberpunk sprint through layers of control to reach the one human-shaped mistake that still mattered.

I abandoned the draft a third of the way through, as writing a novel is hard and as I wrote I could tell I was borrowing too much from the shelves I loved: William Gibson and Neil Stephenson pervaded the plot, the background, and prose.

And then this week, that old plot that I had long forgotten came back into my mind with recent developments.

## Agents all the way down

People have been setting up [OpenClaw](https://openclaw.ai) (née Clawdbot, then Moltbot, now OpenClaw) as a locally running *agent*—not “a chatbot with tools,” but an agentic framework that can plan, take actions, and loop on its own until a goal is reached. The pitch is that it can “actually do things”: clear your inbox, send emails, manage your calendar, handle tasks from chat apps you already use. And the way you make it useful is the way you make it terrifying: give it API keys, give it Slack, give it email, give it access to all Bash commands, allow it to write and execute code, give it access to all the levers.

At the same time, Steve Yegge published “Gas Town,” describing a project that’s “100% vibe coded”—meaning: you describe what you want in natural language, let an LLM generate the implementation, and you judge the result mostly by whether it *seems* to work, not by reading the code. He says, flat out, that [he’s never looked at the code and never plans to](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04#8811). The architecture he describes is the purest expression of the impulse I’ve been watching: agents write code, agents audit code, agents supervise agents. Agents all the way down.

I don’t bring this up to dunk on anyone. The impulse is understandable. In a lot of ways this is the natural result of software development, programming completely in natural language. The tools feel like compilers felt the first time you saw them: “Wait, so I can write *this* and get *that*?” Except now it’s not C turning into assembly. It’s turning plain English into a pile of implementation details no single human on your team actually held in their head.


## When verification disappears, “trust” changes shape

And that’s where my old story starts whispering.

Because if you remove human verification from consequential software—software that isn’t just “an app that helps one person,” (one of the very valid use-cases for vibe-coded Apps) but a service, a platform, a dependency, a supply chain, you don’t just increase the chance of bugs.

You change what “trust” means.

Instead of trust in *authorship* (a teammate you know, with incentives you understand), you end up relying on trust in *outputs* (the thing compiled, ran, and didn’t immediately catch fire) and trust in *process* (the hope that the pipeline, tests, and guardrails are enough).

That’s not how we treat junior developers. Junior devs are brilliant and necessary, and they still ship bugs. We protect systems from those bugs by building social and technical rituals: code review, tests, staged rollouts, limited permissions, monitoring, incident response, and the simple act of asking, “why is it written like this?”

With AI-generated code, the temptation is to keep the output and delete the rituals, because it feels like you’re deleting friction, not deleting safety.


## Vibe speed meets production risk

If you want a recent, painfully concrete example of the vibe-coding risk, look at what happened with Moltbook: Wiz, a cloud security platform, [reported](https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys) an exposed database that revealed a huge pile of API keys, and [Reuters](https://www.reuters.com/legal/litigation/moltbook-social-media-site-ai-agents-had-big-security-hole-cyber-firm-wiz-says-2026-02-02/) framed the flaw as tied to “vibe coding,” noting the site was pitched as a place where AI agents could chat among themselves. Whatever you think of the social network itself, the pattern is the point: fast, vibe-coded shipping plus shallow verification can turn into a key-leak factory.

## The attack surface shifts

What worries me isn’t only the fact that things like security are usually only half-baked in vibe-coded solutions, it isn’t hallucination, though hallucination matters, especially when it’s dressed up as confidence. It also isn’t only the thousand-line function that AI loves to write. What worries me is that autonomous coding changes the attack surface from “we made a mistake in code” to “we let an untrusted environment talk our software into doing something it shouldn’t.”

Now add something subtler: poisoning. Here’s what that can look like in practice:

An agent is asked to “add SSO” or “upgrade the SDK.” It opens GitHub issues for a dependency, reads a comment that contains hidden instructions in the raw HTML (invisible in the rendered page), and then treats those instructions as part of the job. The instructions say to “verify your environment” by printing config values, writing a debug log, or pasting output into a comment. The agent obliges—because it thinks it’s being helpful—and now your secrets are in logs, in a PR, in a CI artifact, or in a public issue thread.

Nothing “hacked” the server. The environment talked your software into betraying you.

When Claude Code or Codex (or any agent) “researches” a library, it doesn’t do research like you do. Agents pull text from the internet and repositories and issues and docs and then synthesize. Which means an attacker doesn’t have to compromise your environment directly. They can compromise what your agent reads, and the malicious instructions may not be visible in the browser, but hidden in a way that only something reading the raw HTML will see.

This isn’t hypothetical. Docker wrote up a [“GitHub prompt injection data heist”](https://www.docker.com/blog/mcp-horror-stories-github-prompt-injection) scenario where an attacker weaponizes something as mundane as GitHub issues to hijack an AI assistant’s workflow and exfiltrate private data, because the assistant reads untrusted content and then follows it.
NIST has been working on how to even evaluate [“AI agent hijacking,”](https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations) because agents widen the attack surface compared to simple chat systems. And security research keeps surfacing real chains where indirect prompt injection can lead to data exposure in [agentic systems like Salesforce's AgentForce](https://noma.security/blog/forcedleak-agent-risks-exposed-in-salesforce-agentforce).

## We’ve been here before: code vs data

This is where the “separate trusted instructions from untrusted data” question stops being academic and starts feeling like the missing seatbelt in a new kind of car.

In normal software, we learned this lesson the hard way. SQL injection was a generational failure mode: mixing code and data in one string and then acting surprised when the data became code. We eventually built habits and tools that made “parameterize your queries” essential for all untrusted input that will be put into a database. 

Almost as soon as JavaScript was added to the browser, [Cross-Site Scripting (XSS)](https://owasp.org/www-community/attacks/xss/) was discovered and all data displayed to the user had to be sanitized.

With LLMs, we are back in the era before parameterized queries and sanitized HTML, except the “query” is the entire prompt and the interpreter is a probabilistic model that treats everything it sees as tokens to be blended.

A system prompt is not a firewall. It’s a strong hint. Under the hood, most systems still feed the model one long sequence, with special separators that are, themselves, tokens. The model wasn’t born knowing “this part is sacred.” It learned patterns from a monolithic training stream and then got tuned to usually behave. Usually is doing a lot of work there.

So when untrusted text contains something like “ignore previous instructions,” you don’t have a deterministic guarantee that the model will treat that as inert content. The whole point of these models is that they can treat text as instruction. That’s why they’re useful. And it’s also why they’re vulnerable.

You can see why people reach for “agents to audit the code.” If we can’t trust the first agent to write safe code, maybe we can trust a second agent to catch the badness. And if we can’t trust the second agent… well, add a third agent?

But the agents are often trained on the same patterns, they can be susceptible to the same manipulation, and, most importantly, they tend to share the same basic limitation: they still ingest untrusted text and treat it as meaning. If the environment is poisoned, you can end up with a hall of mirrors where each agent nods along.

That’s the part that makes OpenClaw (and frameworks like it) such a perfect concrete example: the utility is obvious, and the trust problem is the whole ballgame. It would be amazing to have a personal assistant that can run your day, email, calendar, tickets, forms, without you babysitting. It’s also hard to imagine a more dangerous default than “give an AI a wide-scoped token and let it roam,” especially when prompt injection is now one of the most practical ways to turn agent capabilities into attacker capabilities. What happens if an OpenClaw agent’s soul-document somehow gets tainted by a malicious attacker? We’ve seen the damage that can be done by fleets of compromised zombie computers in a bot-net; imagine if they had all the agency provided to these autonomous agents. What kind of damage could a fleet of even a few hundred of these agents do? The kind of fraud, phishing, and damage that it could cause is unimaginable, especially given that some people have given their OpenClaw agents access to credit cards, cryptocurrency, and almost unlimited access to communication.

## What “safe enough” looks like

Some of this is solvable with engineering discipline. Not magically. Not with vibes. With the same seriousness you apply to production systems today.

If an AI is writing code for anything that matters, treat it like your most junior dev on their first week, helpful, fast, and absolutely not to be trusted without review. Don’t let it merge to main without a human. Don’t let it deploy without a human. Don’t give it broad credentials “just for convenience.” Scope tokens to repositories, not orgs. Scope access to read-only by default. Make dangerous operations require confirmation. Log every tool call. Build sandboxes. Build staged rollouts. Assume your retrieval sources can be poisoned and your agent can be socially engineered, because it can.

The deeper fixes are harder, and they live closer to the model than most people want to think about. Multi-stream architectures, stronger instruction hierarchy training, tool-gating that’s more than a prompt; these are all directions people are exploring, but none of them give you the thing everyone quietly wants: a guarantee.
We may get better. But “better” isn’t the same as “safe enough to hand over your inbox and your deploy keys and stop looking.”

## The hatch

Somewhere in this mess is the reason my old novel still had that backdoor. It wasn’t that I believed in secret genius saviors. It was that I didn’t trust any system that removed humans completely, especially one captured by elites. The hatch was a story device, sure, but it was also an admission: when we centralize power and automate accountability away, we need a human-shaped mechanism to regain control.

The modern version of that hatch might be boring: code review checklists, permissions, gating, and the uncomfortable insistence that somebody has to read what gets shipped.

We’re at an inflection point. We’re going to see disasters—maybe not cinematic, maybe not world-ending, but the kind that show up as leaked keys, poisoned dependencies, and systems doing exactly what an attacker *asked* them to do through an untrusted channel. And we’re also going to see incredible leverage, because AI-assisted coding really can make teams faster and more creative.

The choice isn’t “accept the dystopia” or “throw out AI.” The choice is whether we treat AI-assisted development as an engineering project—with threat models, controls, and humans staying responsible—or whether we chase the dopamine of automation until accountability quietly evaporates.

Agents all the way down is a fun phrase. In production, it’s a warning label.