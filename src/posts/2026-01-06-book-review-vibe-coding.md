---
layout: post
category: AI
title: "Book Review: Vibe Coding"
imagefeature: blog/vibe-coding.webp
description: "A frank, detailed review of Vibe Coding: hype, metaphors, contradictions, and real-world AI coding lessons."
tags: [Programing, AI, Vibe Coding]
date: 2026-01-06
---
# Book Review: *Vibe Coding* by Gene Kim and Steve Yegge


I’ve never reviewed a book on this blog, but as AI agents like Claude Code begin writing the majority of real-world software, Vibe Coding felt impossible to ignore. I felt compelled to break my streak for *Vibe Coding: Building Production-Grade Software With GenAI, Chat, Agents, and Beyond* – a new book co-authored by DevOps luminary Gene Kim and legendary blogger (and Google/Amazon veteran) Steve Yegge.

As a long-time fan of Steve Yegge's colorful tech essays and his legendary blog rants, I was genuinely excited when I heard he was collaborating on a book about AI-assisted programming. I'd been following him on several podcasts recently ([The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/amazon-google-and-vibe-coding-with), [Latent Space](https://www.youtube.com/watch?v=zuJyJP517Uw)), where he enthusiastically evangelized "Vibe Coding," and I eagerly anticipated what insights he and Kim would bring to this rapidly evolving trend. I didn't know much about Gene Kim before this, though I have a vague recollection of reading the [The Phoenix Project](https://itrevolution.com/product/the-phoenix-project/) 10+ years ago, but his DevOps credentials seemed impressive.

Unfortunately, what I got was a mixed bag that left me more frustrated than enlightened. While the book has some valuable insights buried within it, it's ultimately undermined by relentless repetition, tortured metaphors beaten to death, and a fundamental identity crisis about what Vibe Coding actually means and who should practice it.  The book also feels like it has a lot of filler within it, every section starts out by stating everything that is going to be in the section and every section ends repeating what the section covered.

I've been doing some "AI Assisted Coding" and "Vibe Coding" in the past few months with some smallish projects, [Paddle-Roster](https://paddle-roster.com) - an app for generating PickleBall Scramble Tournaments -- source code on [GitHub](https://github.com/kriserickson/paddle-roster) which was mostly Vibe Coded - and [WordFall](https://wordfall.kriserickson.com) a Tetris-like word game which was pretty much 100% vibe coded.  And I have been working on other things that never saw the light of day (or haven't seen it yet).  I am pretty familiar with what Vibe Coding does well and what it doesn't do.

<img style="border: 1px solid #000; margin: 10px; width: 300px" src="/img/vibe-coding/vibe-coding-cover.webp">
<div style="text-align: center; margin-bottom: 1rem">Cover of <em>Vibe Coding</em> by Gene Kim & Steve Yegge.</div>

## What *Is* "Vibe Coding," Anyway? (And Is This Even About Vibe Coding?)

At its core, **Vibe Coding** means using AI tools to generate and refine code through conversational prompts. Andrej Karpathy, who coined the term, described it as an approach where developers **"fully give in to the vibes, embrace exponentials, and forget that the code even exists"**.

But here's the rub: **half of this book isn't really about "Vibe Coding" at all – it's about AI and agent-assisted coding with rigorous engineering practices wrapped around it.** My guess is that naming a book "Vibe Coding" will draw more attention than "AI and Agent-Assisted Coding with DevOps Best Practices," but it sets up a fundamental disconnect. Throughout the book, Kim and Yegge argue that you need to "vibe code" with the most rigorous DevOps, CI, code review, and testing practices imaginable. So are we vibing or are we engineering? The answer shifts chapter by chapter, leaving the reader confused about what they're actually being told to do.

The book's own admission reveals this tension: "Throughout this book, we'll use terms like Vibe Coding and chat-oriented programming (which was the original title for this book, pre-Karpathy) interchangeably—but always with the understanding that we use appropriate levels of engineering discipline." Translation: we're using a trendy term to sell a book about proper software engineering in the age of AI.

Gene Kim and Steve Yegge are trying to take Vibe Coding into the mainstream, arguing that it's "reinventing the foundations of how we build software" and positioning it as the future for any developer.  Although the book (and many Yegge's subsequent [blog posts](https://steve-yegge.medium.com)) highlights a dichotomy between the two authors, I hear two distinct voices in my mind. Kim’s voice is preaching rigorous engineering discipline, while Yegge’s is yelling “YOLO” and spinning up 10 instances of Claude Code to fight over PRs - much like his [Gas Town project](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04).

## FAAFO: An Acronym You'll Quickly Tire Of

The authors frame the benefits of Vibe Coding using the acronym **FAAFO** – which stands for *Fast, Ambitious, Autonomous, Fun, and Optionality*. **They use this acronym over 70 times in the book.** By the third chapter, I started wincing every time it appeared. By chapter five, I was groaning. It's as if they assumed readers have the memory of goldfish and would forget about FAAFO.

FAAFO, FAAFO, FAAFO – it becomes a mantra, a battle cry, a sales pitch that never ends. Work faster! Be ambitious! Have fun! More optionality! FAAFO! 

Look, I get it. You want readers to remember the term you coined and for it to become part of the AI Code generation nomenclature (like the term Vibe Coding itself). But when you use an acronym so frequently that readers start skipping over it automatically, you've defeated your own purpose. The repetition doesn't reinforce—it irritates.

These five words capture the "superpowers" AI-assisted development can grant: working faster with AI assistance, attempting more ambitious solo projects, operating more autonomously, having more fun by offloading drudgery, and maintaining optionality by quickly prototyping multiple approaches.

The first part of the book reads like a manifesto demanding that you embrace Vibe Coding **now**. They give reasons, they sell the dream, and they desperately want you to drink the Kool-Aid too. Chapter after chapter extols how *amazing* this new paradigm is. The enthusiasm verges on evangelism – breathless advocacy that will either excite you or make your eyes roll, depending on your tolerance for AI hype.

## The Perils: Nothing You Haven't Already Experienced

Perhaps the most valuable contribution of *Vibe Coding* is its catalog of what can go wrong when you lean heavily on AI coding assistants. They document recurring failure patterns with catchy names – although if you've vibe-coded any project lasting more than one day, you've probably experienced every single one of these.

* **"Baby-Counting"**: The AI disables a test or hard-codes a fix into the test rather than fixing the problem the failing test points to.  Steve's story about asking the AI to save seven babies and it proudly returning with only five is memorable, but the solution is obvious: verify everything.

* **"Cardboard Muffins"**: Back to a (sort of) cooking metaphor. Half the code is good and half is blank or garbage. Again, **this is a very odd metaphor** – why cardboard? Why muffins? 

* **"Half-Assing"**: Solving the problem in the stupidest way possible – code duplication, magic numbers, giant if statements, 3,000-line monolithic functions. The AI technically accomplishes the task but in the laziest, messiest way imaginable.

* **"Litterbug"**: Leaving behind dead code, files written to test something, hundreds of Markdown files, debug statements everywhere, temp variables named final_final_version. The AI doesn't clean up after itself.

And the solutions? They should be relatively obvious to anyone who has studied any modern DevOps and Software Engineering:

- Verify everything rigorously
- Specify exactly how you want things coded
- Clean and delete cruft continuously  
- Use Git and commit often (JetBrains Local History works well here too, much less so the Timeline in VS Code)
- Keep tasks small and incremental
- Write comprehensive tests
- Review AI code like you'd review a junior developer's work

**I can't really think of anything in the book that was an aha moment or something I hadn't already thought of.** If you've been using AI coding tools for more than a few weeks on any real project, you've hit these problems and likely figured out these solutions already. The value is mainly in having names for the failure modes so you can discuss them with teammates.  I'd add a couple more of my own like:

* **The bug-fix death loop** - where the agent switches between the same two wrong solutions endlessly (which is hinted at in the book, but the solution they suggest is to create a tiny project and have the AI figure out the solution there -- something that is not always practical, or fix it by hand)
* **Out of date training data** - Always wanting to use older versions of libraries that it knows about from its training data rather than the latest API or library.  The hope was things like [Context7](https://context7.com) would help with this, but I haven't found it to be of much use.  MCP (a feature they fawn over in the book) seems to be loosing some of [shine](https://hackernoon.com/the-mcp-hype-train-a-protocols-promise-vs-production-reality) now and [Agent Skills](https://blog.arcade.dev/what-are-agent-skills-and-tools) are the hot new thing.
* **Phantom API Calls** - Inventing a library or API that might make sense (I see this one a lot less often now, and almost never in a coding agent) or inventing arguments for a Library or API that does actually exist - this is one a see all the time.  Frequently links to the API doc, helps with this, but it is still a problem I face regularly.
* **I know better than you** - Going beyond what you asked it to do and changing so much code, or deleting important files in the project that the only solution is going back to the last committed version.  They mention the benefits of containers a couple of times, but forcing your agent to only be able to do things in a container is probably the only way to be 100% sure that your coding agent won't [decide to delete your hard drive](https://www.theregister.com/2025/12/01/google_antigravity_wipes_d_drive/).

All of these issues have been around as long as they have been writing the book, and I feel not mentioning them in their caveats section detracts from the depth of the book.

## The Tortured Chef Metaphor Will Make You Groan

The **cooking metaphor** may be this book's most exasperating feature. Kim and Yegge compare the AI-assisted developer to a *head chef* running a kitchen, with AI assistants as *sous-chefs*.  Maybe in the beginning of the book this works reasonably well to illustrate the shift in role from line cook to head chef who delegates but maintains standards.

But then they never, ever stop. **By the fifth or sixth chapter, I found myself groaning as they tried to shoe-horn this tortured chef metaphor into yet another example.** We hear about the *Kitchen Brigade*, the Swedish Chef from the Muppets, not being a line cook anymore, plating dishes, tasting every dish, the mise en place, maintaining kitchen standards, cleaning the kitchen... Every. Single. Scenario. gets forced through this culinary lens until the metaphor gets stretched so thin it becomes transparent.  **The Tortured Chef metaphor is so overused that you start to wince as they try to shoe-horn it into another example.**

More critically, **the metaphor fundamentally breaks down in a way that undermines their entire thesis**: In a kitchen, if you fail to deliver one dinner, you fail to deliver one dinner. Tomorrow is a new day with a clean kitchen. But in software, **if your AI creates a mess on day one, it doesn't just affect you for one day – it affects you for the entire lifetime of that project.**

Technical debt accumulates. Bad architectural decisions made early compound over time. A bug introduced on sprint one might not surface until production six months later. Code is permanent and cumulative in a way that cooking fundamentally is not. Last night's over-salted soup doesn't haunt you for the next decade; bad code absolutely does.

**This distinction matters enormously when we're talking about whether to "embrace the vibes" and let AI agents run wild, versus maintaining rigorous engineering discipline.** The kitchen metaphor actually works *against* the authors' attempts to promote serious software engineering practices around Vibe Coding, because it trivializes the long-term consequences of mistakes.

## Where Did Steve Yegge Go?

One aspect I was particularly curious about was how the collaboration between Gene Kim and Steve Yegge would play out. If you've read Steve Yegge's blog posts (the famous "Stevey's Drunken Blog Rants"), you know he has a **distinctive, unmistakable voice** – irreverent, humorous, full of bold claims and tangents, sometimes rambling but usually entertaining.

**Honestly, if I hadn't seen the cover, I would never have guessed Yegge wrote this.** The voice of Steve Yegge seems to have been lost. The book doesn't sound like his characteristic voice except for a few scattered locations – the "save my babies" story is classic Steve, and a few moments of self-deprecating humor feel like him. But those are rare exceptions.

For the most part, the writing has a uniform, professional tone that doesn't sound like *Steve* at all. **I'm not as familiar with Gene Kim's work, so either the book has taken on more of his voice, or the book has been homogenized through heavy editing or (I suspect) the use of AI tools to "polish" the text.**

If you were hoping for a fresh dose of Yegge's unfiltered commentary, you'll be deeply disappointed. His voice has been smoothed, sanded, and corporatized to fit the book's instructional vibe.

## The Book's Identity Crisis: Rigor or YOLO?

The book seems dated even though it's clear the authors continually updated things while writing the book. **It started as a book about using chat-based tools like ChatGPT** (the original title was "chat-oriented programming") **but was updated to include discussions of running 10 agents at once.** I understand that the daily-changing landscape of AI Assisted Coding makes it almost impossible to write a book, but this evolution definitely affects the coherence.

Sometimes they're arguing for the most rigorous DevOps, CI, code review, and testing practices wrapped around Vibe Coding. Other times they're arguing to YOLO everything and run 10 agents at once. The tension is palpable and never resolved.

Consider this contradiction: From Yegge's recent [blog posts](https://steve-yegge.medium.com/the-future-of-coding-agents-e9451a84207c), he seems all-in on extreme Vibe Coding. He states that ["Gas Town,"](https://github.com/steveyegge/gastown) his latest tool, **"is 100% vibe coded. I've never seen the code, and I never care to."** He also mentions he's **"never looked at [Beads](https://github.com/steveyegge/beads) either, and it's 225k lines of Go code."** ([Beads](https://steve-yegge.medium.com/introducing-beads-a-coding-agent-memory-system-637d7d92514a) is a project Yegge created that adds structured memory to projects, helping AIs understand complex codebases without the messy, contradictory markdown files they typically generate).

Yet in the book, "Steve" is described as reviewing 10,000 lines of code a day – something **I know I could never do reliably** – and throwing away 10 lines for every line kept. The book emphasizes the importance of reviewing code meticulously and maintaining the highest standards.

So which is it? Do we never look at the code and trust the vibes? Or do we review every line with a critical eye? The book can't decide, and this fundamental contradiction undermines its message.

## What About Context Size?

The book talks about context window limitations (which is a very valid issue when you are programming with a Chat client) but **gives no technical way of controlling it other than constantly starting new chats.** For a book positioning itself as a serious engineering guide, this is a glaring omission. How do we manage context effectively?  Is there a way in various interfaces to see the current length of the context or even know what context length is appropriate for which Foundation Model? How do we architect our prompts for large projects? The advice is superficial at best, and doesn't address modern CLI based coding assistants like Claude Code where the context is managed for you.  This points back to the book’s main problem: the rapidly changing landscape of 'vibe coding.'

## Who Is This Even For?

A key question: **Who exactly is this book for?** The authors say "any developer, plus tech leaders, plus even non-developers." That's everyone! In trying to serve such a wide audience, *Vibe Coding* ends up serving none of them particularly well.

**If you're already using AI coding tools regularly**, you've experienced all these problems and likely figured out similar solutions. The pitfalls will sound familiar. The solutions are obvious. You won't find many (or any) aha moments.

**If you're an experienced engineer skeptical of AI coding**, the breathless evangelism in early chapters might turn you off before you get to the practical advice. The FAAFO repetition won't help.

**For newer developers**, reading about all these pitfalls might be overwhelming, and the book assumes knowledge of build systems, CI/CD, and other concepts they might not have yet.

**For managers and tech leads**, the later chapters provide some food for thought, but it feels a little generic – more like a management consulting brief than practical guidance.

## Excerpts Over Chapters

Frustratingly, **excerpts like [this one about reward function hijacking](https://itrevolution.com/articles/when-ai-cuts-corners-hijacking-the-reward-function/) succinctly summarize what takes an entire chapter in the book.** The book could have been 30-40% shorter without losing any substance. In fact, it might have been more impactful if it were tighter and more focused.

## Final Verdict: A Book That Can't Decide What It Wants To Be

Reading *Vibe Coding* left me with mixed feelings – validation that my experiences with AI coding aren't unique, frustration at the repetition and overwrought metaphors, and disappointment that Steve Yegge's voice was lost in the homogenization.

The book's greatest weakness is that **it can't decide whether it wants you to "embrace the vibes" and let AI run wild, or practice the most rigorous software engineering discipline imaginable.** These two viewpoints seem to be where most people are at when it comes to Vibe Coding, but they're contradictory, and the book never reconciles them.  Personally I am a little terrified of a world where pure Vibe Coding runs rampant and want rigorous discipline around non-trivial projects but to let experiments and prototypes flow from Vibe Coding in glorious attempts to one-shot (or as few prompts as possible) research into a new project.  My fear is when Product Managers deem these one-shots "good enough" to be a MVP (Minimum Viable Product) and release them unto the world.

The relentless FAAFO cheerleading needed to be dialed back by about 80%. The chef analogy should have been used sparingly, not beaten to death. The references that require explanation should have been cut. And most importantly, the book needed a clear, consistent message about what Vibe Coding actually means in practice.

Where I was hoping to find the most value was in the section on bringing Vibe Coding into the enterprise (or at least beyond solo coding) - or as they put it "the leap from mastering your personal AI-powered kitchen to orchestrating a culinary empire".  The section is long on "use good software engineering techniques (code review, small commits, CI/CD, tests, standard DevOps)" but is short on new ideas for how to best handle the potential AI slop that will be created when multiple developers working on the same project have multiple AIs working on the code.  They state that PRs (Pull Requests) should be small, but offer few concrete suggestions on how to tame AI agents that love nothing more that to rewrite half of a file when "fixing" one small bug or adding a feature.  

While they have some good suggestions about how to roll out generative AI in an operation, (have a gradual roll out, don't try to force things all at once, use forums to share knowledge and tricks, promote early success stories with AI), they also recommend things that seem terrible to me, like having a "Token Burning" leader board in the company to promote AI use (not that it should be used to judge, just to promote people to try and experiment with the tools).  

They speak as if they have years of experience with Vibe Coding in enterprise situations.  And while I am sure that Gene Kim has years of experience promoting and consulting in the DevOps field in large corporations after writing books like [The DevOps Handbook](https://www.simonandschuster.ca/books/The-DevOps-Handbook-2nd-Edition/Gene-Kim/9781950508402) and [The Phoenix Project](https://itrevolution.com/product/the-phoenix-project/) it doesn't seem like they have any direct experience with vibe coding in these situations.  They rely on studies from companies like Booking.com and Adidas for their anecdotes.  And while they briefly mention the Google [Dora](https://dora.dev/ai/gen-ai-report/report/) study, they spend just a little time dismissing its findings that "every 25% increase in GenAI adoption correlates with 7% worse stability", by stating that it is at odds with their experience that using AI can increase the throughput and improve stability.  However, the work they seem to have been doing with AI is Gene Vibe Coding a set of tools to aid in writing the book, and Steve working on the Wyvern game that he has been working on since 1998 - neither of which seem to be enterprise sized codebases with dozens or hundreds of people working on it. 

Would I recommend it? **Maybe, but only with caveats.** If you're AI-curious and haven't tried these tools yet, it might save you from learning some lessons the hard way – though you'll need to skim past a lot of fluff to get to the useful bits. If you're already using AI coding tools regularly, you'll find yourself nodding along to problems you've already experienced and solutions you've already implemented.

As a longtime Steve Yegge fan, I'm disappointed his voice didn't come through more clearly. As someone interested in the future of AI-assisted development, I wish the book had been more focused and less repetitive. And as an engineer, I wish it had resolved its fundamental contradiction about whether we're supposed to trust the vibes or verify everything obsessively.

The book sits somewhere between useful primer and frustrating missed opportunity. The honest documentation of failures saves it from being pure propaganda, but the repetition, tortured metaphors, and identity crisis prevent it from being the definitive guide it aspires to be.

**Bottom line:** There are some insights here, but you'll have to wade through a lot of FAAFO evangelism, overcooked chef metaphors, and repetition to find them. The perils are real, but if you've been using AI coding tools for any length of time, you've already encountered them. The solutions are sensible, but they're also obvious. And the fundamental question of what "Vibe Coding" actually means remains frustratingly unanswered.  But it also does bring forward a bunch of topics that should be discussed if we are going to move into this world where tools like Claude Code are writing 90% of the code in the world.  

