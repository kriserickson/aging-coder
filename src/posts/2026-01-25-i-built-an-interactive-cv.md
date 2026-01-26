---
layout: post
category: Programming
title: "I Built an Interactive CV"
imagefeature:
description: "A weekend build: a data-driven resume with a digital assistant, streaming Q&A, and a job-fit analyzer."
draft: true
tags: ["Programming", "LLM", "AI", "Career"]
date: 2026-01-25
---

## A quick weekend build

In my previous post, [AI-Assisted Coding on a Budget](/posts/ai-assisted-coding-on-a-budget/), about AI Assisted coding, I included a short section about how I created an [Interactive CV](/cv). A few people asked how it worked and how I built it, so this expands upon that section.

I took a short break from the larger project I’m working on and spent a weekend knocking out an idea I’d been sitting on for a while, an interactive version of my CV.  One that you can ask questions about things that have either been cut from my resume, is short on details, or something that you can't easily put in a resume like "how do you handle criticism").  

This is kind of a refinement of something I had been thinking of for a few months: a chatbot for this blog. Most of my posts start at five to ten times the final length, and I’ve kept those drafts for years. It felt like perfect RAG fodder—especially now that I’ve turned off comments because I didn’t have time to clean up the spam, and a good excuse to play with around with AIs and Rag.

Then I saw  [Nate Jones](https://natesnewsletter.substack.com) video [LinkedIn is Dead](https://www.youtube.com/watch?v=0teZqotpqT8&t=9s) on YouTube and realized my weird idea might not be so weird after all. So I went to work building an [Interactive CV](https://agingcoder.com/cv/), borrowing his “Fit Assessment” concept but building it from scratch (with the help of AI coding assistants) instead of putting it on a no-code platform like [Lovable](https://lovable.dev) or [Replit](https://replit.com).

The initial code came together in [OpenCode](https://opencode.ai) using the free “Big Pickle” model (which is apparently just [GLM 4.6](https://github.com/anomalyco/opencode/issues/4276), via [this OpenCode model listing](https://www.crackedaiengineering.com/ai-models/opencode-big-pickle)). However, it wasn't particly good and I quickly switched to `gpt-5.2-codex`, which OpenCode could access through my ChatGPT Pro account.

I started from a plan based on a handful of prompts and a constraint I’d already picked: I wanted to host the service on Cloudflare so I could play with Workers. (I’d recently moved my blog caching to Cloudflare too.)

I spent about five hours building the code, but an awful lot more time writing and preparing the grouding data ([questions.json](https://github.com/kriserickson/aging-coder/blob/main/api-worker/src/rag-data/questions.json)). I'm sure it would have been faster if I’d had tokens left for Claude Code, but I also wanted to try doing something a bit more "real" in OpenCode.  I switched between OpenCode / Codex and using CoPilot in VSCode throughout the coding of the project.  Some parts I wrote manually, and I did spend a fair bit of time debugging the api-worker in VSCode.

Most of the work wasn’t “build a chatbot”, it was making it feel like a real chat agent. That meant streaming responses so the assistant starts talking immediately, adding a typing indicator, handling long conversations with a “More below” scroll cue, and wiring the “More info” buttons so each resume section opens with curated, on-topic prompts.

Once the basics worked, the weekend grind was mostly polish and plumbing: porting my old [Python RAG engine](/posts/rag-time-cooking-up-smart-recipe-suggestions/) to JavaScript, researching [Cloudflare AI Embeddings](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/) and what you can (and can’t) precompute locally, migrating the UI from JavaScript to TypeScript (OpenCode struggled here, so I leaned on Codex), and cleaning up AI-generated 1,000-line functions while tightening and refactoring prompts to reduce hallucinations.

## What it does

On the surface it’s a normal CV page with a summary, experience, skills, projects, and education, but each section has a “More info” hook that opens a focused chat. The top of the page also has three primary actions—Digital Assistant, Fit Assessment, and About this Interactive CV—which act like entry points into the conversational layer.

The Digital Assistant is a chat UI that provides some sample questions but allows full text conversations and streaming answers against a foundation model. The Fit Assessment lets you paste a job description or provide a public URL and then returns a structured assessment. About this Interactive CV opens a short behind-the-scenes explainer and prompt details.

## Want to try it?

The Interactive CV is live at [agingcoder.com/cv](https://agingcoder.com/cv/) and the source code is open on GitHub at [github.com/kriserickson/aging-coder](https://github.com/kriserickson/aging-coder).

## How it is built

On the front end, the CV is data-driven and rendered by Eleventy (11ty) using [`src/_data/cv.json`](https://github.com/kriserickson/aging-coder/blob/main/src/_data/cv.json) and the [`src/cv.njk`](https://github.com/kriserickson/aging-coder/blob/main/src/cv.njk) template. The page is static, but most behavior comes from a small TypeScript app under [`cv/`](https://github.com/kriserickson/aging-coder/tree/main/cv) that Vite bundles into `cv.js`, which the template loads - it also uses [`chat-config.json`](https://github.com/kriserickson/aging-coder/blob/main/src/_data/chat-config.json) to control the messages and sample questions in chat UI. That script sets up the chat modal, the scroll detection that shows the floating chat button after you scroll, and the toggles that expand experience and project entries without turning the whole CV into a giant wall of text.

The chat UI is relatively lightweight, but I quickly realized that the responses that came from the Chat API where in markdow (it frequenlty made lists, and bolded text).  Initially I tried a simple markdown encoding function that was basically a simple regex, however it wasn't great at handling the streaming so I started looking for libraries.  After testing a few, I found the [`streaming-markdown`](https://github.com/thetarnav/streaming-markdown) library so answers can stream while still rendering Markdown incrementally without jarring reflows. I added a slow renderer that appends text in small chunks to create the illusion of typing, and I added a typing indicator and a scroll cue that says “More below” when the conversation grows longer than the visible area. Links generated by the assistant are forced to open in a new tab for safety—and to keep the CV page from losing context.  This really makes the CV seem like the kind of Chat apps (ChatGPT, Clause, Gemini) that people are familar with.

The chat keeps conversation state on the client in `sessionStorage` with a 24-hour expiry so the thread survives page refreshes without pretending to be permanent. Before a new message is sent, it dedupes repeated user/assistant pairs so the back end sees a cleaner history instead of a pile of retries.  By maintainig the full conversation on the client it allows the state of the converation to be kept so that the Chat has a memory.

The backend API lives in a Cloudflare Worker under `api-worker/` and is built with Hono because I wanted a small, fast surface area.  There are two primary endpoints.

### Chat Endpoint

The first endpoint is `/api/chat`. It accepts either a single message or a message history, assembles context (CV + RAG), and then streams the model’s response back to the browser.

Every request includes the structured resume data from [`cv.json`](https://github.com/kriserickson/aging-coder/blob/main/src/_data/cv.json) in its context, because most questions benefit from having the baseline CV “in scope.” On top of that, it adds RAG context from a curated Q&A corpus in [`questions.json`](https://github.com/kriserickson/aging-coder/blob/main/api-worker/src/rag-data/questions.json) (about 23,000 words). I spent more than double the time writing and curating this material than I did on the code, because the bot is only as good as the facts it can retrieve.

The retrieval flow works like this: the worker precomputes embeddings for the titles and content in `questions.json` (chunking longer answers into smaller windows), generates those embeddings with Cloudflare’s `@cf/baai/bge-small-en-v1.5` model, and caches them in KV. When a user asks a question, the worker generates an embedding for the incoming message, compares it against the cached embeddings using cosine similarity, and selects the top matches—currently the top 5 results that clear a ~0.60 similarity threshold—to include as additional context. For a handful of sensitive cases, it also supports exact question matching by hashing normalized questions so it can return a verbatim answer instead of sending the prompt through the model. If embeddings fail for any reason, there’s a deterministic fallback so the system degrades gracefully instead of breaking.

For generation, the worker calls OpenRouter so I can easily switch between frontier and open-source models without changing the rest of the system. Right now it defaults to `gpt-4o-mini`, which (after testing a few OpenAI options) has been the best balance of speed, cost, and answer quality. The worker restreams the upstream response into a plain-text stream that the front end can render smoothly. There’s also a daily rate limit enforced via KV, with the limit and allowed CORS origins configured by environment variables, plus optional analytics logging for questions, answers, and exact-match hits.


### Fit Assesment

The second endpoint is `/api/fit-assessment`, which takes either pasted text or a job posting URL. If a URL is provided, the worker fetches the page and does basic HTML stripping to extract readable text, but it can’t execute JavaScript—so it will fail on many client-rendered job boards. The response is a strict JSON object that includes a verdict of strong, moderate, or weak, along with matches, gaps, and a short recommendation. It also includes a `jobPostingJudgment` field that lets the model say “this isn’t a job posting” when someone pastes the wrong thing.


## Still alpha

At the time of writing, I still consider this alpha-quality code. There are only a couple of tests, the worker is still JavaScript, and I haven’t written any end-to-end tests yet. There isn’t enough logging or error handling, and most of the prompts haven't been engineered properly (in a real world app I would evaluate a dozen or so versions of the prompt and see what performs best, and i would try a few more models to see if they did a better job).  

But I still consider knocking out a project like this in about five hours a huge success as a demo of what AI-assisted coding can do. It’s a small experiment, but it turns a static resume into something more interactive, more honest, and hopefully more useful.
