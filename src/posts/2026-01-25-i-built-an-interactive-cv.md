---
layout: post
category: Programming
title: "I Built an Interactive CV"
imagefeature: blog/interactive-cv.webp
description: "A weekend build: a data-driven resume with a digital assistant, streaming Q&A, and a job-fit analyzer."
draft: true
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

The retrieval flow works like this: the worker precomputes embeddings for the titles and content in `questions.json` (chunking longer answers into smaller windows), generates those embeddings with Cloudflare’s `@cf/baai/bge-small-en-v1.5` model, and caches them in KV. When a user asks a question, the worker generates an embedding for the incoming message, compares it against the cached embeddings using cosine similarity, and selects the top matches—currently the top 5 results that clear a ~0.60 similarity threshold—to include as additional context. For a handful of sensitive cases, it also supports exact question matching by hashing normalized questions so it can return a verbatim answer instead of sending the prompt through the model. If embeddings fail for any reason, there’s a deterministic fallback so the system degrades gracefully instead of breaking.

For generation, the worker calls OpenRouter so I can easily switch between frontier and open-source models without changing the rest of the system. Right now it defaults to `gpt-4o-mini`, which (after testing a few OpenAI options) has been the best balance of speed, cost, and answer quality. The worker restreams the upstream response into a plain-text stream that the front end can render smoothly. There’s also a daily rate limit enforced via KV, with the limit and allowed CORS origins configured by environment variables, plus optional analytics logging for questions, answers, and exact-match hits.


### Fit Assessment

The second endpoint is `/api/fit-assessment`, which takes either pasted text or a job posting URL. If a URL is provided, the worker fetches the page and does basic HTML stripping to extract readable text, but it can’t execute JavaScript—so it will fail on many client-rendered job boards. The response is a strict JSON object that includes a verdict of strong, moderate, or weak, along with matches, gaps, and a short recommendation. It also includes a `jobPostingJudgment` field that lets the model say “this isn’t a job posting” when someone pastes the wrong thing.


## Still alpha

At the time of writing, I still consider this alpha-quality code. There are only a couple of tests, the worker is still JavaScript, and I haven’t written any end-to-end tests yet. There isn’t enough logging or error handling, and most of the prompts haven’t been properly iterated on. In a real-world app I’d evaluate a bunch of prompt variants, compare models, and track which combinations actually perform best.

Still, knocking out a project like this in about five hours felt like a huge success as a demo of what AI-assisted coding can do. It’s a small experiment, but it turns a static resume into something more interactive, more honest, and (hopefully) more useful.
