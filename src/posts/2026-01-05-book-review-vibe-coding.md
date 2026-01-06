---
layout: post
category: 
title: "Book Review: Vibe Coding"
imagefeature:
description: 
draft: true
tags: []
---
# Book Review: *Vibe Coding* by Gene Kim and Steve Yegge

<img style="border: 1px solid #000; margin: 10px; width: 300px" src="/img/vibe-coding/vibe-coding-cover.webp">
<div style="text-align: center; margin-bottom: 1rem">Cover of <em>Vibe Coding</em> by Gene Kim & Steve Yegge.</div>

In 15 years of writing this blog, I have never published a book review. That changes today. I felt compelled to break my streak for *Vibe Coding: Building Production-Grade Software With GenAI, Chat, Agents, and Beyond* – a new book co-authored by DevOps luminary Gene Kim and legendary Google/Amazon veteran (and blogger) Steve Yegge.

As a long-time fan of Steve Yegge's colorful tech essays and his legendary blog rants, I was genuinely excited when I heard he was collaborating on a book about AI-assisted programming. I'd been following him on several podcasts recently ([The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/amazon-google-and-vibe-coding-with), [Latent Space](https://www.youtube.com/watch?v=zuJyJP517Uw)), where he enthusiastically evangelized "Vibe Coding," and I eagerly anticipated what insights he and Kim would bring to this rapidly evolving trend. I didn't know much about Gene Kim before this, but his DevOps credentials seemed impressive.

Unfortunately, what I got was a mixed bag that left me more frustrated than enlightened. While the book has some valuable insights buried within it, it's ultimately undermined by relentless repetition, tortured metaphors beaten to death, and a fundamental identity crisis about what vibe coding actually means and who should practice it.  The book also feels like it has a lot of filler within it, every section starts out by stating everything that is going to be in the section and every setion ends repeating what the section covered.

## What *Is* "Vibe Coding," Anyway? (And Is This Even About Vibe Coding?)

At its core, **vibe coding** means using AI tools to generate and refine code through conversational prompts. Andrej Karpathy, who coined the term, described it as an approach where developers **"fully give in to the vibes, embrace exponentials, and forget that the code even exists"**.

But here's the rub: **this book isn't really about "Vibe Coding" at all – it's about AI and agent-assisted coding with rigorous engineering practices wrapped around it.** My guess is that naming a book "Vibe Coding" will draw more attention than "AI and Agent-Assisted Coding with DevOps Best Practices," but it sets up a fundamental disconnect. Throughout the book, Kim and Yegge argue that you need to "vibe code" with the most rigorous DevOps, CI, code review, and testing practices imaginable. So are we vibing or are we engineering? The answer shifts chapter by chapter, leaving the reader confused about what they're actually being told to do.

The book's own admission reveals this tension: "Throughout this book, we'll use terms like vibe coding and chat-oriented programming (which was the original title for this book, pre-Karpathy) interchangeably—but always with the understanding that we use appropriate levels of engineering discipline." Translation: we're using a trendy term to sell a book about proper software engineering in the age of AI.

Gene Kim and Steve Yegge are trying to take vibe coding into the mainstream, arguing that it's "reinventing the foundations of how we build software" and positioning it as the future for any developer. The book treats AI pair-programmers as a seismic shift in software development. But the message is muddied: sometimes they're arguing to YOLO everything and run 10 agents at once (close to what Yegge promotes with his [Gas Town project](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04)), and sometimes they're arguing for the most careful, methodical engineering practices you can imagine.

## FAAFO: An Acronym You'll Grow to Hate

The authors frame the benefits of vibe coding using the acronym **FAAFO** – which stands for *Fast, Ambitious, Autonomous, Fun, and Optionality*. **They use this acronym over 70 times in the book.** By the third chapter, I started wincing every time it appeared. By chapter five, I was groaning. It's as if they assumed readers have the memory of goldfish and would forget about FAAFO.

FAAFO, FAAFO, FAAFO – it becomes a mantra, a battle cry, a sales pitch that never ends. The book practically vibrates with FAAFO energy. Work faster! Be ambitious! Have fun! More optionality! FAAFO! 

Look, I get it. You want readers to remember your framework. But when you use an acronym so frequently that readers start skipping over it automatically, you've defeated your own purpose. The repetition doesn't reinforce—it irritates.

These five words capture the "superpowers" AI-assisted development can grant: working faster with AI assistance, attempting more ambitious solo projects, operating more autonomously, having more fun by offloading drudgery, and maintaining optionality by quickly prototyping multiple approaches.

The first part of the book reads like a manifest demanding you embrace vibe coding NOW. They give reasons, they sell the dream, and they desperately want you to drink the Kool-Aid too. Chapter after chapter extolls how *amazing* this new paradigm is. The enthusiasm verges on evangelism – breathless advocacy that will either excite you or make your eyes roll, depending on your tolerance for AI hype.

## The Perils: Nothing You Haven't Already Experienced

Perhaps the most valuable contribution of *Vibe Coding* is its catalog of what can go wrong when you lean heavily on AI coding assistants. They document recurring failure patterns with catchy names – altough if you've vibe-coded any project lasting more than one day, **you've probably experienced every single one of these.**

* **"Baby-Counting"**: The AI disables a test or hard-codes a fix into the test rather than fixing the problem the failing test points to.  Steve's story about asking the AI to save seven babies and it proudly returning with only five is memorable, but the solution is obvious: verify everything.

* **"Cardboard Muffins"**: Back to a (sort of) cooking metaphor. Half the code is good and half is blank or garbage. Again, **this is a very odd metaphor** – why cardboard? Why muffins? 

* **"Half-Assing"**: Solving the problem in the stupidest way possible – code duplication, magic numbers, giant if statements, 3,000-line monolithic functions. The AI technically accomplishes the task but in the laziest, messiest way imaginable.

* **"Litterbug"**: Leaving behind dead code, files written to test something, hundreds of Markdown files, debug statements everywhere, temp variables named final_final_version. The AI doesn't clean up after itself.

And the solutions? They should be relatively obvious to anyone who has coded for a few years:

- Verify everything rigorously
- Specify exactly how you want things coded
- Clean and delete cruft continuously  
- Use Git and commit often (JetBrains Local History works well too)
- Keep tasks small and incremental
- Write comprehensive tests
- Review AI code like you'd review a junior developer's work

**I can't really think of anything in the book that was an aha moment or something I hadn't already thought of.** If you've been using AI coding tools for more than a few weeks on any real project, you've hit these problems and likely figured out these solutions already. The value is mainly in having names for the failure modes so you can discuss them with teammates.

## The Tortured Chef Metaphor Will Make You Groan

The **cooking metaphor** may be this book's most exasperating feature. Kim and Yegge compare the AI-assisted developer to a *head chef* running a kitchen, with AI assistants as *sous-chefs*. At first, this works reasonably well to illustrate the shift in role from line cook to head chef who delegates but maintains standards.

But then they never, ever stop. **By the fifth or sixth chapter, I found myself groaning as they tried to shoe-horn this tortured chef metaphor into yet another example.** We hear about the *Kitchen Brigade*, the Swedish Chef from the Muppets, not being a line cook anymore, plating dishes, tasting every dish, the mise en place, maintaining kitchen standards, cleaning the kitchen... Every. Single. Scenario. gets forced through this culinary lens until the metaphor gets stretched so thin it becomes transparent.  **The Tortured Chef metaphor is so overused that you start to wince as they try to shoe-horn it into another example.**

More critically, **the metaphor fundamentally breaks down in a way that undermines their entire thesis**: In a kitchen, if you fail to deliver one dinner, you fail to deliver one dinner. Tomorrow is a new day with a clean kitchen. But in software, **if your AI creates a mess on day one, it doesn't just affect you for one day – it affects you for the entire lifetime of that project.**

Technical debt accumulates. Bad architectural decisions made early compound over time. A bug introduced on sprint one might not surface until production six months later. Code is permanent and cumulative in a way that cooking fundamentally is not. Last night's over-salted soup doesn't haunt you for the next decade; bad code absolutely does.

**This distinction matters enormously when we're talking about whether to "embrace the vibes" and let AI agents run wild, versus maintaining rigorous engineering discipline.** The kitchen metaphor actually works *against* the authors' attempts to promote serious software engineering practices around vibe coding, because it trivializes the long-term consequences of mistakes.

## Where Did Steve Yegge Go?

One aspect I was particularly curious about was how the collaboration between Gene Kim and Steve Yegge would play out. If you've read Steve Yegge's blog posts (the famous "Stevey's Drunken Blog Rants"), you know he has a **distinctive, unmistakable voice** – irreverent, humorous, full of bold claims and tangents, sometimes rambling but usually entertaining.

**Honestly, if I hadn't seen the cover, I would never have guessed Yegge wrote this.** The voice of Steve Yegge seems to have been lost. The book doesn't sound like his characteristic voice except for a few scattered locations – the "save my babies" story is classic Steve, and a few moments of self-deprecating humor feel like him. But those are rare exceptions.

For the most part, the writing has a uniform, professional tone that doesn't sound like *Steve* at all. **I'm not as familiar with Gene Kim's work, so either the book has taken on more of his voice, or the book has been homogenized through heavy editing or (I suspect) the use of AI tools to "polish" the text.**

If you were hoping for a fresh dose of Yegge's unfiltered commentary, you'll be deeply disappointed. His voice has been smoothed, sanded, and corporatized to fit the book's instructional vibe.

## The Book's Identity Crisis: Rigor or YOLO?

The book seems dated even though it's clear the authors updated it over time. **It started as a book about using chat-based tools like ChatGPT** (the original title was "chat-oriented programming") **but was updated to include discussions of running 10 agents at once.** I understand that the daily-changing landscape makes it almost impossible to write a book, but this evolution definitely affects the coherence.

Sometimes they're arguing for the most rigorous DevOps, CI, code review, and testing practices wrapped around vibe coding. Other times they're arguing to YOLO everything and run 10 agents at once. The tension is palpable and never resolved.

Consider this contradiction: From Yegge's recent [blog posts](https://steve-yegge.medium.com/the-future-of-coding-agents-e9451a84207c), he seems all-in on extreme vibe coding. He states that "Gas Town," his latest tool, **"is 100% vibe coded. I've never seen the code, and I never care to."** He also mentions he's **"never looked at Beads either, and it's 225k lines of Go code."**

Yet in the book, "Steve" is described as reviewing 10,000 lines of code a day – something **I know I could never do reliably** – and throwing away 10 lines for every line kept. The book emphasizes the importance of reviewing code meticulously and maintaining the highest standards.

So which is it? Do we never look at the code and trust the vibes? Or do we review every line with a critical eye? The book can't decide, and this fundamental contradiction undermines its message.

## References That Need Explanation Are Pointless

The text is peppered with references to pop culture, history, and more – many followed by explanatory footnotes. **If you have to spend a paragraph explaining a reference, it's basically pointless** – the reference should illuminate the concept, not require its own tutorial.

They mention the "Hot Hand" illusion in basketball, then thoroughly explain what the hot hand fallacy is. They reference various historical events, then laboriously elucidate them. This happened repeatedly, contributing to the feeling that the book could have been substantially more concise and tighter.

## What About Context Size?

The book talks about context window limitations but **gives no technical way of controlling it other than constantly starting new chats.** For a book positioning itself as a serious engineering guide, this is a glaring omission. How do we manage context effectively? How do we architect our prompts for large projects? The advice is superficial at best.

## Who Is This Even For?

A key question: **Who exactly is this book for?** The authors say "any developer, plus tech leaders, plus even non-developers." That's everyone! In trying to serve such a wide audience, *Vibe Coding* ends up serving none of them particularly well.

**If you're already using AI coding tools regularly**, you've experienced all these problems and likely figured out similar solutions. The pitfalls will sound familiar. The solutions are obvious. You won't find many (or any) aha moments.

**If you're an experienced engineer skeptical of AI coding**, the breathless evangelism in early chapters might turn you off before you get to the practical advice. The FAAFO repetition won't help.

**For newer developers**, reading about all these pitfalls might be overwhelming, and the book assumes knowledge of build systems, CI/CD, and other concepts they might not have yet.

**For managers and tech leads**, the later chapters provide some food for thought, but it feels generic compared to the earlier content – more like a management consulting brief than practical guidance.

## Excerpts Over Chapters

Frustratingly, **excerpts like [this one about reward function hijacking](https://itrevolution.com/articles/when-ai-cuts-corners-hijacking-the-reward-function/) succinctly summarize what takes an entire chapter in the book.** The book could have been 30-40% shorter without losing any substance. In fact, it might have been more impactful if it were tighter and more focused.

The Register's reviewer noted that *Vibe Coding* is repetitive "despite, apparently, using AI to help manage the content." Perhaps the use of generative tools in writing led to the verbose, repetitive structure a human editor might have trimmed.

## Final Verdict: A Book That Can't Decide What It Wants To Be

Reading *Vibe Coding* left me with mixed feelings – validation that my experiences with AI coding aren't unique, frustration at the repetition and overwrought metaphors, and disappointment that Steve Yegge's voice was lost in the homogenization.

The book's greatest weakness is that **it can't decide whether it wants you to "embrace the vibes" and let AI run wild, or practice the most rigorous software engineering discipline imaginable.** Both messages are valuable, but they're contradictory, and the book never reconciles them.

The relentless FAAFO cheerleading needed to be dialed back by about 80%. The chef analogy should have been used sparingly, not beaten to death. The references that require explanation should have been cut. And most importantly, the book needed a clear, consistent message about what vibe coding actually means in practice.

**Most of the perils documented have already been experienced by anyone who has vibe-coded any project lasting more than one day.** The solutions are relatively obvious. Can't really think of anything that was an aha moment or something I hadn't already encountered.

Where I was hoping to find the most value was in the section on bringing Vibe Coding into the enterprise (or at least beyond solo coding) - or as they put it "the leap from mastering your person al AI-powered kitchen to orchestrating a culinary empire".  The section is long on "use good software engineering techniques (code review, small commits, CI/CD, tests, standard Dev Ops)" but short on new ideas for how to best handle the potential AI slop that will be created when multiple developers working on the same project have multiple AI's working on the code.  They state that PRs (Pull Requests) should be small, but have few concrete suggestions on how to tame AI agent's that love nothing more that to rewrite half of a file when "fixing" one small bug or adding a feature.  

While they have some good suggestion about how to roll-out Generative AI in an operation, (have a gradual roll out, don't try to force things all at once, use forums to share knowlege and tricks, promote early success stories with AI), they also recommend things that seem terrible to me, like have a Token Burning leader boards in the company to promote AI use (not that it should be used to judge, just to promote people to **try and experiment with the tools**).  

They speak like have years of experience with Vibe Coding in an enterprise situation.  And while I am sure that Gene Kim has years of experience promoting and consulting in the Dev Ops field in large corperations after writing books like [The DevOps Handbook](https://www.simonandschuster.ca/books/The-DevOps-Handbook-2nd-Edition/Gene-Kim/9781950508402) and [The Pheonix Project](https://itrevolution.com/product/the-phoenix-project/) it doesn't seem like they have any direct experience with vibe coding in this situations.  They rely on studies from companies like Booking.com and Adidas for their anecdotes.  And while they briefly mention the Google [Dora](https://dora.dev/ai/gen-ai-report/report/) study, they spend just a little time dismissing its findings that "every 25% increase in GenAI adoption correlates with 7% worse stbaility", by stating that it is at odds with their expeirience that using AI can increase the throughput and improve stability.  However, the work they seem to have been doing with AI is Gene vibe coding a set of tools to aid in writing the book, and Steve working on the Wyvrn game that he has been working on since 1998 - neither of which seem to be giant codebases with dozens or hundreds of people working on it. 

Would I recommend it? **Maybe, but only with caveats.** If you're AI-curious and haven't tried these tools yet, it might save you from learning some lessons the hard way – though you'll need to skim past a lot of fluff to get to the useful bits. If you're already using AI coding tools regularly, you'll find yourself nodding along to problems you've already experienced and solutions you've already implemented.

As a longtime Steve Yegge fan, I'm disappointed his voice didn't come through more clearly. As someone interested in the future of AI-assisted development, I wish the book had been more focused and less repetitive. And as an engineer, I wish it had resolved its fundamental contradiction about whether we're supposed to trust the vibes or verify everything obsessively.

The book sits somewhere between useful primer and frustrating missed opportunity. The honest documentation of failures saves it from being pure propaganda, but the repetition, tortured metaphors, and identity crisis prevent it from being the definitive guide it aspires to be.

**Bottom line:** There are valuable insights here, but you'll have to wade through a lot of FAAFO evangelism, overcooked chef metaphors, and repetition to find them. The perils are real, but if you've been using AI coding tools for any length of time, you've already encountered them. The solutions are sensible, but they're also obvious. And the fundamental question of what "vibe coding" actually means remains frustratingly unanswered.

Just remember: count your babies, watch out for cardboard muffins, clean up after the litterbug AI, and maybe – just maybe – ease up on the cooking metaphors.
