---
layout: post
category: AI 
title: "fine-tuning-llm"
imagefeature:
description: 
tags: []
date: 2025-08-30
draft: true
---
Of the open models available for ollama with < 1B parameters, only qwen actually managed to parse the HTML and return
a result.

Here are the results of running of running the small recipe (~4000 token)

| Model              | Size    | Time   | Result Description                                                               |
|--------------------|---------|--------|----------------------------------------------------------------------------------|
| deepseek-r1:1.5b   | 1.1 GB  | 11.8s  | returned example JSON (Bad Cake)                                                 |

| gemma3:1b          | 815 MB  | 3.9s   | returned different title (Health and Wellness) and example JSON                  |
| gemma3:1b-it-qat   | 1.0 GB  | 4.9s   | returned different title (Health and Wellness) and example JSON                  |
| qwen3:0.6b         | 522 MB  | 5.5s   | perfect results, with thinking in <think> tag                                    |
| smollm2:135m       | 270 MB  | 5.5s   | returned different title (Health and Wellness) and example JSON                  |
| smollm2:360m       | 725 MB  | 2.8s   | returned example JSON (Bad Cake)                                                 |
| tinyllama:latest   | 637 MB  | 3.75s  | returned instructions without JSON and a reference to the recipe in the message  |

Here are the results of running of running a larger recipe (~4000 token)

| Model              | Size    | Time   | Result Description                                                               |
|--------------------|---------|--------|----------------------------------------------------------------------------------|
| deepseek-r1:1.5b   | 1.1 GB  | 15.6s  | Empty think, generated html page with explanation?                               |
| gemma3:1b          | 815 MB  | 12.1s  | Content of the page with HTML stripped, not including the recipe                 |
| gemma3:1b-it-qat   | 1.0 GB  | 82.1s  | String block of html focused on the ad block with an image in the middle         |
| qwen3:0.6b         | 522 MB  | 23.62s | Recipe in JSON with a <think> tag, ingredients however, are missing amounts      |
| smollm2:135m       | 270 MB  | 12.8s  | Small portions of the recipe instructions in HTML (no ingredients)               |
| smollm2:360m       | 725 MB  | 5.5s   | Information about how to subscribe to the tasteofhome newsletter?                |
| tinyllama:latest   | 637 MB  | 4.16s  | The html and css (separated) for the search bar                                  |



