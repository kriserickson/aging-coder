---
layout: post
category: 
title: "I Built an “AI for Shell Commands” CLI (So I Could Stop Asking ChatGPT)"
imagefeature:
description: 
draft: true
tags: ["Tools", "Programming", "AI"]
---
I keep using chatbots for the same kind of question, over and over. Not “how do I build a distributed system” questions. The small ones. The terminal ones. The ones that should be muscle memory by now, except they aren’t.

Things like:

- kill the task running on port 5173 in powershell
- remove a file from a git commit without deleting it
- find all files larger than 10MB
- compress all log files older than 7 days
- show biggest folders in my home directory

The actual cost isn’t the question. It’s the loop. I’m in the terminal, I jump to a browser or a chatbot, I re-explain my OS and shell (again), I copy/paste, I tweak it, I run it, I realize I slightly asked the wrong thing, I do it again. Context switching is expensive even when it feels trivial, and it adds up fast. Plenty of people have written about how interruptions and switching tasks drag productivity and focus down; the numbers vary, but the shape of the problem is familiar to anyone who’s tried to stay “in flow” while [tooling, chat, docs, and notifications pull you sideways](https://jellyfish.co/library/developer-productivity/context-switching).

So I built a tiny tool I find useful: **AI CLI**. It takes natural language, turns it into shell commands using an LLM (OpenAI or OpenRouter, you supply the api key), and then applies a safety policy before it runs anything. That’s it.

## The itch: “terminal Google” is still a browser tab

If you’ve ever typed [`tldr tar`](https://tldr.sh) or hit [`cheat.sh`](https://cheat.sh) to jog your memory, you already understand the category. 

But my questions often aren’t “what does this command do.” They’re closer to “what’s the safest way to do this right now, in this folder, on this OS, without me thinking too hard.” The moment you add *context* and *intent*, static cheat sheets start to wobble.

Example: “show me what process is using port 8080” is easy. “show me what process is using port 8080, and kill it, but don’t nuke anything else, and please ask first if it’s sketchy” is where the friction starts.

The internet will happily hand you answers for the basic pieces. [`lsof` to find the PID, `kill` to terminate it](https://sookocheff.com/post/macos/), `netstat` on Windows, maybe `kill -9` if you’re feeling spicy.

What I wanted was the *same convenience as asking a chatbot*, without leaving the terminal, and without blindly executing whatever a model happened to hallucinate today.

## What AI CLI does

AI CLI translates natural language into one or more shell commands. Then it decides whether to run them automatically or prompt you first. The point is not “AI runs your computer.” The point is “AI proposes commands, and the tool makes it harder to do something dumb by accident.”

The README summary is basically the whole product:

- Natural language → LLM → command(s)
- Every command gets `risk` (`safe` or `risky`) and `certainty` (0–100)
- A safety matrix decides: auto-run vs. ask for confirmation

That last part matters because LLM output is non-deterministic. The same request can yield different commands across runs. Even when you crank temperature down, you can still see variation depending on the model, provider, and upstream changes. [Treating generated shell commands as “trusted” is how you end up learning the hard way](https://community.openai.com/t/the-generated-code-varies-every-time-even-with-a-low-temperature/921970).

So the tool is opinionated: commands are suggestions, and you should review them.

Unless you want to live dangerously.

## Why Go (and why this project exists at all)

I built it in Go for two reasons.

First, it’s a CLI. I want a single binary. I want to be able to “download a release artifact, drop it in some directory in your path, and done.” Not “install a runtime” or “activate a venv” or “this only works if your node version matches the author’s mood.” Go makes that easy.

Second, I wanted to see how well AIs write Go. Not a toy Go app. Real, boring Go: config loading, HTTP clients, CLI commands, tests, release artifacts, cross-platform builds. It’s a good way to find out what an LLM is actually good at versus what it sounds good at.

Spoiler: it gets you to "working" shockingly fast, then you spend your time tightening edges and adding more and more features since the original request worked so well.

## How it works: the basic loop, and the safety policy

When you run:

```sh
ai show what process is using port 8080
```

AI CLI sends a request to your configured provider/model (OpenAI or OpenRouter) and asks for a command appropriate for your environment (OS, shell, current working directory). OpenRouter is useful here because it exposes a lot of [models behind an OpenAI-compatible API surface](https://openrouter.ai/docs/quickstart?utm_source=chatgpt.com).

The LLM returns one or more commands. AI CLI prints them with metadata (risk + certainty), then applies this decision matrix:

- `safe` commands can auto-run if certainty meets your threshold
- `risky` commands can auto-run **only** if they’re whitelisted (and meet certainty)
- anything else prompts

By default, the whitelist is intentionally boring: `git`, `ls`, `cat`, `pwd`, `grep`, `find`, and friends.

If you want full paranoia mode:

```sh
ai config set always_confirm true
```

If you want it to auto-run safe stuff more often:

```sh
ai config set always_confirm false
ai config set min_certainty 60
```

And if you want to edit the whitelist today, you crack open the TOML:

```toml
[safety]
always_confirm = false
min_certainty = 80
whitelist_prefixes = ["git", "ls", "cat", "echo", "pwd", "head", "tail", "wc", "grep", "find", "which", "man"]
```

The safety policy is not perfect. It’s a seatbelt, not a roll cage. But it dramatically improves the “I asked for something harmless and it decided to `rm -rf` my entire hard drive” failure mode.

## Quick start: the first five minutes

Install comes from GitHub release artifacts (macOS/Linux/Windows). Then the first command you should run is:

```sh
ai doctor
```

That checks config, provider/model selection, and whether you’ve set an API key. If you haven’t, it walks you through setup.

After that, you can do single-shot requests:

```sh
ai list files in current directory sorted by size
ai find all files larger than 10MB
ai show what process is using port 8080
```

Here are a few of the kinds of things I actually use it for.

### Example: kill whatever is holding a port (macOS/Linux)

I’ve typed some version of this hundreds of times:


```sh
ai kill the process on port 8080
```

A typical multi-step result looks like this:

```text
Finds the process ID using port 8888 and kills it.
  $ lsof -ti :8888 | xargs kill  [risky] 90% certainty
Execute? [Y/n]
```

That’s exactly the sort of thing you’ll find in articles and answers online: `lsof` to get the PID, then `kill`.  But the tool makes a judgment call: killing a PID is risky; ask first.

Whereas if you turn off always_confirm (which as I stated above, I don't recommend), you can do:

```sh
ai what process is running on port 8888
```

and it will show you the result without prompting, since it is deemed safe AND has a certainty above 80%.

```text
Lists the processes running on port 8888.
  $ lsof -i :8888  [safe] 90% certainty
COMMAND  PID         USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    6099 kriserickson   28u  IPv6 0x90aac05e75d68771      0t0  TCP *:ddi-tcp-1 (LISTEN)
```

### Example: remove a file from the last commit without deleting it

This is another “I know Git can do it, I just never remember the cleanest incantation” problem.

You can ask:

```sh
ai remove path/to/secrets.json from the last commit but keep the file on disk

This command removes the changes related to src/posts/tmp from the last commit while keeping the file on disk.
  $ git reset HEAD~1 -- path/to/secrets.json  [risky] 90% certainty
Execute? [Y/n]
```

Depending on state, you’ll usually end up in the “amend last commit” territory, or “reset and recommit” territory. There are lots of ways to do it; the important part is that you don’t want to delete the file, you want to change history. Articles and Q&A threads cover the approach and tradeoffs, and AI CLI is basically automating the translation of that intent into a command sequence you can verify.

### Example: “show biggest folders in my home directory”

This is the kind of thing that depends on your platform and what you have installed. You might get `du` + `sort`, or a variation that avoids permission-denied noise.

```sh
ai show biggest folders in my home directory


Displays the 10 largest folders in your home directory, sorted by size.
  $ du -h ~/ | sort -hr | head -n 10  [safe] 90% certainty
```

This is also where the certainty score matters. If the model is guessing, the tool should ask. If it’s giving a straightforward `du` pipeline and it’s confident, it can just run.

## Interactive mode

Single-shot is fine, but interactive mode can be useful for an always open tab on your terminal app:

```sh
ai
```

Then:

```text
ai> what ports are listening
ai> show biggest folders in my home directory
ai> compress all log files in /var/log older than 7 days
```

## Config and debugging: the boring stuff you’ll want anyway

Config lives at:

```text
~/.ai-cli/config.toml
```

You can inspect it with:

```sh
ai config show
```

Turn on debug when you’re trying to understand behavior:

```sh
ai config set debug screen
# or
ai config set debug file
```

And you can override per command:

```sh
ai --debug=screen list files in current directory sorted by size
[2026-02-19 14:59:39] --- REQUEST ---
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a CLI assistant that translates natural language into shell commands.\n\nEnvironment:\n- OS: darwin/arm64\n- Shell: /bin/zsh\n- Shell version: zsh 5.9 (arm64-apple-darwin24.0)\n- Working directory: /Users/kriserickson/Projects/test-proj\n\nYou MUST respond with valid JSON only. No markdown fences, no explanation text outside the JSON.\n\nFor shell command requests, respond with:\n{\n  \"type\": \"commands\",\n  \"commands\": [\n    {\n      \"command\": \"the shell command to run\",\n      \"description\": \"brief explanation of what it does\",\n      \"risk\": \"safe or risky\",\n      \"certainty\": 90\n    }\n  ]\n}\n\nRules for commands:\n- \"risk\" must be \"safe\" (read-only, informational) or \"risky\" (modifies files, processes, system state)\n- \"certainty\" is 0-100, your confidence this is the correct command for what the user asked\n- For multi-step tasks, return multiple commands in order. Use shell constructs like $(...) or pipes to chain when possible\n- Generate commands appropriate for the detected OS and shell\n- Never generate commands that could cause irreversible damage without clear user intent\n\nFor requests to change AI CLI configuration (model, provider, API key, safety settings), respond with:\n{\n  \"type\": \"config\",\n  \"action\": \"set_model\",\n  \"key\": \"model\",\n  \"value\": \"gpt-4o\"\n}\n\nValid config actions: set_model, set_provider, set_key, set_safety\n- set_model: key=\"model\", value=\"model-name\"\n- set_provider: key=\"default\", value=\"openai\" or \"openrouter\"\n- set_key: key=\"openai_key\" or \"openrouter_key\", value=\"the-key\"\n- set_safety: key=\"always_confirm\" or \"min_certainty\", value=\"true\"/\"false\" or number"
    },
    {
      "role": "user",
      "content": "list files in current directory sorted by size"
    }
  ]
}
--- END REQUEST ---


[2026-02-19 14:59:40] --- RESPONSE (HTTP 200) ---
{
  "id": "chatcmpl-DB7HfJn49yY84u0qkLZeRCPiUbmR3",
  "object": "chat.completion",
  "created": 1771541979,
  "model": "gpt-4o-mini-2024-07-18",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\n  \"type\": \"commands\",\n  \"commands\": [\n    {\n      \"command\": \"ls -lhS\",\n      \"description\": \"lists files in the current directory sorted by size in human-readable format\",\n      \"risk\": \"safe\",\n      \"certainty\": 95\n    }\n  ]\n}",
        "refusal": null,
        "annotations": []
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 435,
    "completion_tokens": 63,
    "total_tokens": 498,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "audio_tokens": 0
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    }
  },
  "service_tier": "default",
  "system_fingerprint": "fp_373a14eb6f"
}

--- END RESPONSE ---


lists files in the current directory sorted by size in human-readable format
  $ ls -lhS  [safe] 95% certainty
total 416
-rw-r--r--    1 kriserickson  staff   169K Jan 26 08:30 package-lock.json
-rw-r--r--    1 kriserickson  staff   8.4K Jan 20 21:03 readme.MD
drwxr-xr-x  234 kriserickson  staff   7.3K Jan 26 08:30 node_modules
-rw-r--r--    1 kriserickson  staff   1.4K Jun 13  2025 favicon.ico
-rw-r--r--    1 kriserickson  staff   1.1K Jan 26 08:30 package.json
-rw-r--r--    1 kriserickson  staff   1.0K Oct 13 20:18 LICENSE
-rw-r--r--    1 kriserickson  staff   1.0K Jun 13  2025 favicon.png
drwxr-xr-x   25 kriserickson  staff   800B Feb 19 14:43 _site
drwxr-xr-x   23 kriserickson  staff   736B Jan 25 14:10 src
-rw-r--r--    1 kriserickson  staff   237B Jan 25 20:15 vitest.config.ts
drwxr-xr-x    7 kriserickson  staff   224B Jan 19 09:45 assets
drwxr-xr-x    4 kriserickson  staff   128B Jan  7 15:11 js
-rw-r--r--    1 kriserickson  staff   115B Jan 19 08:34 vitest.config.js
drwxr-xr-x    2 kriserickson  staff    64B Jan 19 09:11 tests
```

When you’re playing with prompts, models, or providers, debug output lets you understand what is going to and from the AI, so you can figure out what happened when it called the wrong command: “ah, it decided I’m on bash when I’m actually on zsh.”


## You should always verify what it’s doing

This is the part I want to be unambiguous about.

Generated commands are not truth. They’re suggestions.

Review them before you run them. If you don’t want to think about it, make sure always_confirm is set to true (it is by default):

```sh
ai config set always_confirm true
```

If you choose not to verify, you are explicitly opting into the “live dangerously” workflow. Sometimes that’s fine. It’s your machine. But you should make that choice with your eyes open.

## Closing

I started using this the same day I finished it. That's the bar for a useful tool: it solves the actual problem immediately, without ceremony.

Will it cost you money? Yes. But stick with `gpt-4o-mini` and you'll burn through maybe a few pennies after days of use. That's a fair trade for never having to leave the terminal and re-explain your OS to a browser chatbot just to remember how to find all `.js` files containing `CONFIG_URL` that aren't in `dist` or `node_modules`.

The real cost was always the context switch. Now I don't pay it.

