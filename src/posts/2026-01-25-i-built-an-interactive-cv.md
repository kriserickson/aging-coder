---
layout: post
category: Career
title: "I Built an Interactive CV"
imagefeature: blog/interactive-cv.webp
description: "A weekend build: a data-driven resume with a digital assistant, streaming Q&A, and a job-fit analyzer."
tags: ["Programming", "LLM", "AI", "Career"]
date: 2026-01-25
---

## A quick weekend build

In my previous post, [AI-Assisted Coding on a Budget](/posts/ai-assisted-coding-on-a-budget/), about AI Assisted coding, I included a short section about how I created an [Interactive CV](/cv). A few people asked how it worked and how I built it, so this blog post expands upon that section to provide some answers.

I took a short break from the larger project I’m working on and spent a weekend knocking out an idea I’d been sitting on for a while, an interactive version of my CV.  ]I wanted to make an web page that you can ask questions about things that have either been cut from my resume, is short on details, or something that you can't easily put in a resume like "how do you handle criticism").  

This also grew out of a separate idea I’d been thinking about for a while: a chatbot for this blog. Most of my blog posts start at five to ten times the final length (most of the job of writing blog posts I find is editing them down to a reasonable size), and I’ve kept those early drafts for a couple of years. It felt like perfect RAG fodder—especially now that I’ve turned off comments because I didn’t have time to clean up the spam.

Then I saw [Nate Jones](https://natesnewsletter.substack.com)’ video, [“LinkedIn is Dead”](https://www.youtube.com/watch?v=0teZqotpqT8&t=9s), and realized my weird idea might not be so weird after all. So I went to work building an [Interactive CV](https://agingcoder.com/cv/), borrowing his “Fit Assessment” concept but building it from scratch (with the help of AI coding assistants) instead of putting it on a no-code platform like [Lovable](https://lovable.dev) or [Replit](https://replit.com).

I planned and scoffolded the initial code in [OpenCode](https://opencode.ai) using the free “Big Pickle” model (which is apparently just [GLM 4.6](https://github.com/anomalyco/opencode/issues/4276). My experience with Big Pickle wasn’t particularly good, so I quickly switched to `gpt-5.2-codex`, which OpenCode could access through my ChatGPT Pro account.

I started from a plan based on a handful of prompts and a constraint I’d already picked: I wanted to host the service on Cloudflare so I could play with Workers. (I’d recently moved my blog caching to Cloudflare too.)

I spent about five hours building the code, but a lot more time writing and preparing the grounding data ([`questions.json`](https://github.com/kriserickson/aging-coder/blob/main/api-worker/src/rag-data/questions.json)). I’m sure it would have been faster if I’d had tokens left for Claude Code, but I also wanted to try doing something a bit more “real” in OpenCode. I switched between OpenCode/Codex and Copilot in VS Code throughout the project, and I spent a fair bit of time debugging the `api-worker` locally.

Most of the work wasn’t “build a chatbot”—it was making it feel like a real chat agent. That meant streaming responses so the assistant starts talking immediately, adding a typing indicator, handling long conversations with a “More below” scroll cue, and wiring the “More info” buttons so each resume section opens with curated, on-topic prompts.

Once the basics worked, the weekend grind was mostly polish and plumbing: porting my old [Python RAG engine](/posts/rag-time-cooking-up-smart-recipe-suggestions/) to JavaScript, researching [Cloudflare AI embeddings](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/) and what you can (and can’t) precompute locally, migrating the UI from JavaScript to TypeScript (OpenCode struggled here, so I leaned on Codex), and cleaning up AI-generated 1,000-line functions while tightening and refactoring prompts to reduce hallucinations.

## What it does

On the surface it’s a normal CV page with a summary, experience, skills, projects, and education, but each section has a “More info” hook that opens a focused chat. The top of the page also has three primary actions—Digital Assistant, Fit Assessment, and About this Interactive CV—which act like entry points into the conversational layer.

The Digital Assistant is a chat UI with sample questions, but it supports free-form conversation and streams answers from a foundation model. The Fit Assessment lets you paste a job description or provide a public URL and then returns a structured assessment. About this Interactive CV opens a short behind-the-scenes explainer and prompt details.

## Want to try it?

The Interactive CV is live at [agingcoder.com/cv](https://agingcoder.com/cv/) and the source code is open on GitHub at [github.com/kriserickson/aging-coder](https://github.com/kriserickson/aging-coder).

## How it is built

On the front end, the CV is data-driven and rendered by Eleventy (11ty) using [`src/_data/cv.json`](https://github.com/kriserickson/aging-coder/blob/main/src/_data/cv.json) and the [`src/cv.njk`](https://github.com/kriserickson/aging-coder/blob/main/src/cv.njk) template. The page is static, but most behavior comes from a small TypeScript app under [`cv/`](https://github.com/kriserickson/aging-coder/tree/main/cv) that Vite bundles into `cv.js`, which the template loads. It also uses [`chat-config.json`](https://github.com/kriserickson/aging-coder/blob/main/src/_data/chat-config.json) to control the system message and the sample questions shown in the chat UI. The script sets up the chat modal, the scroll detection that shows the floating chat button after you scroll, and the toggles that expand experience and project entries without turning the whole CV into a giant wall of text.

The chat UI is relatively lightweight, but I quickly realized the Chat API responses came back as Markdown (lists, headings, bold text, links). I started with a tiny Markdown function (basically a regex), but it didn’t handle streaming very well, so I went looking for libraries. After testing a few, I landed on [`streaming-markdown`](https://github.com/thetarnav/streaming-markdown), which lets answers stream while still rendering Markdown incrementally without jarring reflows.

From there it was all the “this should feel like a real chat app” polish: a slow renderer that appends text in small chunks to create the illusion of typing, a typing indicator, and a scroll cue that says “More below” when the conversation grows longer than the visible area. Links generated by the assistant are forced to open in a new tab for safety—and to keep the CV page from losing context. That one detail alone makes it feel much closer to the chat apps people already know.

The chat keeps conversation state on the client in `sessionStorage` with a 24-hour expiry so the thread survives page refreshes without pretending to be permanent. Before a new message is sent, it dedupes repeated user/assistant pairs so the back end sees a cleaner history instead of a pile of retries. Keeping the full conversation client-side also means the chat has a short-term “memory” without needing accounts or a database.

The backend API lives in a Cloudflare Worker under `api-worker/` and is built with Hono because I wanted a small, fast surface area. There are two primary endpoints:

### Chat Endpoint

The first endpoint is `/api/chat`. It accepts either a single message or a message history, assembles context (CV + RAG), and then streams the model’s response back to the browser.

Every request includes the structured resume data from [`cv.json`](https://github.com/kriserickson/aging-coder/blob/main/src/_data/cv.json) in its context, because most questions benefit from having the baseline CV “in scope.” On top of that, it adds RAG context from a curated Q&A corpus in [`questions.json`](https://github.com/kriserickson/aging-coder/blob/main/api-worker/src/rag-data/questions.json) (about 23,000 words). I spent more than double the time writing and curating this material than I did on the code, because the bot is only as good as the facts it can retrieve.

The retrieval flow works like this: the worker precomputes embeddings for the titles and content in `questions.json` (chunking longer answers into smaller windows), generates those embeddings with Cloudflare’s `@cf/baai/bge-small-en-v1.5` model, and caches them in KV (which is Cloudflare's implementation of a key-value store like Redis or ValKey). When a user asks a question, the worker generates an embedding for the incoming message, compares it against the cached embeddings using cosine similarity, and selects the top matches—currently the top 5 results that clear a ~0.60 similarity threshold—to include as additional context. For a handful of sensitive cases, it also supports exact question matching by hashing normalized questions so it can return a verbatim answer instead of sending the prompt through the model. If embeddings fail for any reason, there’s a deterministic fallback so the system degrades gracefully instead of breaking.

However, this simplistic RAG approach is one of the system's weaknesses—because all the chats are stored on the client, none of the context is stored in the history. Thus, when the chat says something like "would you like to know more about that?" and you respond with "yes", it actually has a lot less information to respond to the yes with—basically only the CV and what was in the previous responses from the AI, because when it goes to get the RAG information it is querying the questions on "Yes" and not the response, or even including the previous context that had been included. This will probably lead to higher chances of hallucinations, since the LLM will not have as much context to work with, but it is a low-stakes use case so I figured it would be best to release rather than wait for the perfect RAG system. There are a few solutions to this (which I may or may not end up implementing one or more of):

1) With very short messages from the user (like "Yes") or no context results from the cosine similarity embeddings query, query the RAG database by appending data from the previous question.
2) Use a session state to store the previous contexts on the server, and with a context shortage, append some of the saved contexts with the query.
3) Add simple tool calling that would allow the LLM to query the questions database; it could be as simple as the tool giving all the questions it knows the answer to, or just allowing the LLM to initiate the embedding search with its own text.
4) Switch from using RAG to CAG ([Cache Augmented Generation](https://developer.ibm.com/articles/awb-llms-cache-augmented-generation/)) and just send all the answers with every query (there are only about 17,000 tokens of data which will easily fit into the context window, and since it would be cached it wouldn't add too much to the cost).
5) Add to the prompt not to say things like "Would you like more information", since this is one of the key drivers for the user to expect more context to be already available.

** Update: I've updated the code and it now determines if either the query is too short, or the results passed back are low quality it appends the previous question to the current question when querying the RAG questions.  I also updated the prompt to not prompt in a way that will lead to short yes or no questions. **

For generation of the response, the worker calls OpenRouter so I can easily switch between various frontier and open-source models without changing the rest of the system. Right now it defaults to `gpt-4o-mini`, which after testing a few options has been the best balance of speed, cost, and answer quality (the cost using something like a mini model is orders of magnitude of savings—using gpt-4o-mini is about 1/100th of a cent per question, whereas Claude Opus 4.5 and Gemini 3 Pro were costing 5-10 cents per question). The worker restreams the upstream response into a plain-text stream so that the front end can render smoothly. There’s also a daily rate limit enforced via Cloudflare by storing the user's IP in KV, with the limit and allowed CORS origins configured by environment variables, plus optional analytics logging for questions, answers, and exact-match hits.


### Fit Assessment

The second endpoint is `/api/fit-assessment`, which takes either pasted text or a job posting URL. If a URL is provided, the worker fetches the page and does basic HTML stripping to extract readable text, but it can’t execute JavaScript—so it will fail on many client-rendered job boards. The response is a strict JSON object that includes a verdict of strong, moderate, or weak, along with matches, gaps, and a short recommendation. It also includes a `jobPostingJudgment` field that lets the model say “this isn’t a job posting” when someone pastes the wrong thing.

In the future I would probably spend a bit more time on testing the Fit Assessment, playing with the prompt, and trying a few hundred resumes to tune how it responded. I have tried a couple of dozen and a few non job postings and it is pretty good at doing the Fit Assessment. In the future I might give it a lot more information in the prompt to help guide it on job applications that it misclassifies, but once again I felt that the current implementation was good enough.

## Still alpha

At the time of writing, I still consider this alpha-quality code. There are only a couple of tests, the Cloudflare Worker is still written in JavaScript rather than TypeScript, and I haven’t written any end-to-end tests yet. I also don’t have an eval framework for testing and improving the prompts. There isn’t enough logging or error handling, and most of the prompts haven’t been properly iterated on. In a real-world app, I’d evaluate multiple prompt variants, compare models, and track which combinations actually perform best. I’d also keep a prompt library versioned separately from the codebase, with clear metrics and a repeatable evaluation workflow.

Still, knocking out a project like this in about five hours (for the code at least—coming up with the backing documents, writing this blog post, and other tasks took a lot more time) felt like a huge success as a demo of what AI-assisted coding can do. It’s a small, low-risk experiment, but it turns a static resume into something more interactive, more engaging, and (hopefully) more useful. There’s a lot more polish and many more features I could add. For example, instead of relying on the Cloudflare observability dashboard for analytics, I’ve started sketching a custom dashboard to analyze questions and spot failure modes—but Cloudflare’s dashboard is still more useful for now.

The best part is that this turns my resume from a brochure into a conversation—without forcing anyone to read a four-page PDF unless they’re actually interested -- but if they are they can dig pretty deep without too much trouble.  

## Maybe Beta?

** Update ** : I've updated the Cloudflare worker to be in typescript which found a few small issues.   There still aren't enough tests around this, but I also added a quick app that lets me see the questions that people are asking, in [Analytics App](https://github.com/kriserickson/aging-coder/tree/main/analytics-app).  Still a few things to be done, but I am pretty happy with the results and the quality of the chat for such an inexpensive model.