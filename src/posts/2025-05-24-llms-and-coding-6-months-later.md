---
layout: post
category: Programming
title: "LLMs and Coding 6 months later"
imagefeature:
description: 
draft: true
tags: ["Programming", "LLM"]
featured: true
---
Good lord, it has been 6 months since I last wrote a post about LLMs and coding and how the world has changed.  I guess with 6 years between posts before November,
and 6 months between posts now I should look on this as an improvement but with how much things change in AI and LLM world that is the same as 6 years between posts
on Cordova.

I certainly use LLMs more in day-to-day work than I did 6 months ago, and I have started using them in new and different ways.  We finally have editing mode in
CoPilot for JetBrains IDEs ([and now in public Preview MCP servers](https://github.blog/changelog/2025-05-19-agent-mode-and-mcp-support-for-copilot-in-jetbrains-eclipse-and-xcode-now-in-public-preview/)).
I've used a lot of the new hotness IDEs like [Cursor](https://www.cursor.com/) and [Windsurf](https://windsurf.com)
and actually spent a considerable time away from my Beloved [Jetbrains](https://www.jetbrains.com) suite of IDEs to
Visual Studio Code as the Jetbrains Plugin for CoPilot was clearly falling behind the VS Code plugin.  I've played with [ChatGPT Canvas](https://openai.com/index/introducing-canvas/) and their early version of [Codex](https://github.com/openai/codex), which seems to be a little different from their [Codex App](https://chatgpt.com/codex).  I know, OpenAi is great at naming things, you spent $3B on Windsurf how about a few bucks for someone who could help you with sane naming?  I've used [Junie](https://www.jetbrains.com/junie/) as well as the standard AI Chat in JetBrains IDEs (Junie appears to be a superset of the AI Chat that does Editing and Ask but they still install both by default).  This is just a little write up of my experiences with these tools and maybe some tips I have learned along the way.

### CoPilot in JetBrains IDEs

I have been using CoPilot in JetBrains IDEs since CoPilot was released in 2021.  At the time (this was before ChatGPT came into the mainstream),
it was useful for writing boilerplate code, implimenting functions (especially if you had heavily commented what the function was going to do) 
and at the time seemed absolutely magical.  Eventually ChatGPT surplanted it for writing functions and code, but I still used it for API Documentation,
helping writing tests, and the occaisonal function that I couldn't be bothered to write myself.  The Chat freature that was added last year 
(I think it was last year, maybe 2023) was a great addition, allowing you to ask questions about the code and get answers back in the IDE.  But since
in JetBrains IDEs it was limited to one model (GTP-4) and I kept hearing about how much better the CoPilot in VS Code was -- most of this is covered in
the [last post on LLMs in coding](/posts/2024-10-05-leveraging-llms-for-coding-insights-and-real-world-experiences/).  One of the sticky
features of CoPilot is that I am on the yearly plan (though that will probably change before the next renewal) and so since
I am already paying for CoPilot any new AI coding assistant has to be considerably better than it (not quite 
[the tyranny of the default](https://eicolab.com.au/2014/the-tyranny-of-defaults.html) but CoPilot definately has 
[first mover advantage](https://en.wikipedia.org/wiki/First-mover_advantage)).

The ability to change models and use editing mode in JetBrains IDEs has sort of brought CoPilot for JetBrains to be about 6 months
behind the CoPilot in VS Code.  The editing mode is not trustworthy yet, it will frequently mess up code (though at least in JetBrains IDEs you can
have their history feature that means you don't have to commit before allowing CoPilot to edit your code).  There is no "CodeBase" feature like in VS Code, so you
have to manually add the files you want CoPilot to use in the editing mode.  I haven't tried MCP mode yet, so I don't know how well it is going to work.
My overall recommendation is that if you want to use CoPilot get comfortable with VS Code, as it will always be the best experience for CoPilot.  If you are
like me, and feel like using VS Code is like coding with one hand tied behind your back (no shade on VS Code, I just have so much muscle memory in JetBrains IDEs)
**don't** have the project open in both VS Code and JetBrains IDEs at the same time, they do not play well together and you will end up with one IDE overwriting the 
changes of the other. I have had this happen multiple times, and it is very frustrating, and every time I think I have found a way to make it work, I end up getting burned again.

### Cursor

[Cursor](https://www.cursor.com/) is an IDE built on top VS Code that is designed to be an "AI First" IDE.  Because the AI features are not
built as on Add-In they have a lot more control over the AI features and how they work.  It has a lot of the same features as CoPilot, but
it seems to be introducing new features at a much faster pace.  Since this was the first time I had access to Agents to actually edit my
code I was amazed at how much easier this was that trying to determine what had changed when using the Chat window in JetBrains IDEs or 
copy and pasting sections from ChatGPT, Claude, or DeepSeek web clients.  I did struggle a fair bit with Cursor (some or a lot of it
may be pilot error) but I found the main problem was I couldn't load things like the JetBrains IDE Map Extension because it hasn't been
published to the [OpenVSX Registry](https://open-vsx.org).  In fact a lot of the extensions I use in VS Code (like all the extensions
published by Microsoft) aren't available in the OpenVSX registry and though I assume there are ways to use the 
[Visual Studio Marketplace](https://marketplace.visualstudio.com) in Cursor it is against the terms of service for the Visual Studio Marketplace (one
recently added way is to get your VSCode setup how you like it an import its settings into Cursor - I just found this way out
and I don't know how things like updates to extensions work or how you would add a new extension).

My main complaints with Cursor were really complaints with Visual Studio and the fact that a lot of Cursor features feel like they
were implimented inelegantly (although I really didn't notice this until I tried [WindSurf](https://windsurf.com) which seems to 
impliment things slightly more elegantly).  Having Cursor generate a brand new project and setup all the files was a nice experience once
I convinced it not to create the files itself (they were almost always generated using very old versions of libraries) but
use tooling (like npm create vue) which it could run on its own (with your permission).   The out of the box experience
of using Cursor to create a brand new project was very impressive, and that is where all of these AI Assisted Coders shine.

I started having problems (and I do want to note this was a couple of months ago I was playing around with cursor so it might be
a lot better now) was trying to get it to edit already created files.  If I made the mistake of accepting the changes and then 
deciding I wanted to back the undo seems to break things and make Cursor very unhappy.  Since I was not an experienced VS Code
user at the time I wasn't aware of the timeline feature (though I still struggle with it compared to JetBrains LocalHistory) my
only way to recover was ``git restore <filename>``.

Multi-modal support in Cursor is very good, one of the tests I put it through was taking a mockup from one of our
designers for a splash page that was only going to be used for a few weeks and had cursor generate the page for me,
even in the specified framework [Vuetify](https://vuetifyjs.com) that I needed.  Yes it did it in Vuetify 2 not Vuetify
3 so some adjustments where needed (my .cursorrules file does state to do everything in Vuetify 3 but cursor seems to 
ignore that) by telling Cursor that it used Vuetify2 rather than Vuetify3 and then it fixed that.  Having it make the 
splash screen work responsively (on Mobile) was a little more than it could handle, and the CSS it generated was not
really designed to be made responsive but the page was only going to be around for a couple of weeks so I hacked together
than worked.  The time to generate the original Desktop splash screen was about 20 minutes wheras building it by hand
would have taken several hours (but it would have been responsive).  The time to get it to work responsively was about
an hour so there was some real time saving in having Cursor do the work for me.

I felt the $20 a month subscription cost was pretty good, given that you had access to so many models (and they seemed to be updated
within a day or two of a new model being released).  And if I hadn't heard about 
[WindSurf on the Syntax Podcast](https://syntax.fm/show/870/windsurf-forked-vs-code-to-compete-with-cursor-talking-the-future-of-ai-coding) I probably would have have just stayed
with Cursor as I was very impressed with it.

### Windsurf

[WindSurf](https://windsurf.com) like Cursor is another fork of VS Code (it started out like CoPilot as a plugin for VS Code, Jetbrains, and a
few others).  It seems very similar to Cursor but just a bit cleaner and a little more care was taken with UI (even the default color scheme
in my eyes is a bit more tasteful).  It has more appealing and more informative feedback when it is generating code, and the "Cascade" sidebar 
looks cleaner and easier to use that the "Chat" window in Cursor.  The code generation and tool usage seems to be about the same as Cursors 
but I didn't spend a lot of time doing direct comparisons.  

Since it also can't use the regular VS Code Marketplace it has similar issues to Cursor, and it doesn't seem to get access to models
as quickly as Cursor does (at current Cursor has access to Claude 4 and Windsurf is still on 3.7).  It also costs $5 a month less than 
Cursor but I don't know if saving $60 a year is a big reason to go for Cursor or Windsurf.  They have their own model called 
[SWE-1](https://windsurf.com/blog/windsurf-wave-9-swe-1) which is currently free to run whereas the other models cost credits per
token.

Windsurf also has multi-modal support and claims to understand your entire codebase (I didn't really see any evidence of this, but)
and one of things I tried in Windsurf was trying to convert an internal tool from many years ago written in JQuery to be more
modern in Vue.  I gave it access to the source-code and explained what the tool did.  That provided very poor results, and
it really didn't accomplish anything  but making a very generic Admin Dashboard that had no clue about any of the API calls
or functionality of what was required.  However, giving it screenshots , and perhaps slightly more detailed prompts (as well
as access to the code which I am pretty sure it ignored) did get me a skeleton to work on.  No, it didn't understand any
of the endpoints, or any of the data-models (which were there in typescript in the original code) but after a few hours
I had all the tabs with a bunch of fake hard-coded that looked pretty accurate.  I spent quite a bit of time with windsurf
trying to get this very complex dashboard recreated in modern code with a modern UI, and it is still a work in progress. 

### VS Code with CoPilot

In April VS Code rolled out their Agents mode in VS Code so that they finally got something similar to parity with Cursor and
Windsurf.  Since I already had a yearlong subscription to Github Copilot I figured I would try using the Copilot solution rather
than paying for subscriptions to Cursor and Windsurf.  While I find that CoPilot lags behind Cursor and Windsurf in doing things
like getting MCP and Agents and Edit mode it also seems to be a lot more stable once the functionality is there.  I guess that
is the difference between the StartUp mentality of Cursor and Windsurf and the fact that CoPilot is developed by Github (Microsoft).

One of the other main drawbacks is that Copilot doesn't do multi-modal yet (you can't upload an image of a mockup of a website
and have it recreate that - one of the nicest features of Cursor and Windsurf).  I'm sure it will get there eventually, as
this seems like a no-brainer with the fact that almost all of the main models are now 
[multi-modal](https://www.techtarget.com/searchenterpriseai/definition/multimodal-AI).

The advantages of using VS Code and not a branch as I stated are the fact that it is going to always be the latest version
of VS Code (the branches obviously have to pull in their changes to keep up-to-date) and the access to the Visual Studio
Extensions marketplace.  One of the truly cool experiences I have had doing AI Assisted coding 
is using [VS Code Speech](https://marketplace.visualstudio.com/items/?itemName=ms-vscode.vscode-speech) to just
talk to the project rather than having to type everything out.  I have found that being exact and verbose in prompts really
helps the AI in generating the best code and brevity currently is not your friend.  The only reason this doesn't truly seem
like future is that generating the code is still quite slow and you spend a lot of time waiting.

<div style="display: flex; justify-content: center; margin-bottom: 20px">
    <img src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHMwejEwdjFlN280bnNqcmVmZGN0bjk0eWk1d2dpdWN3M3gyaHVldyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btVRbshbbaC8Ygg/giphy.gif"/>
</div>



### Junie in JetBrains IDEs

Last year JetBrains [annoyed a lot of its customers by launching its AI Assitant](https://youtrack.jetbrains.com/issue/LLM-1760/Can-not-remove-Jetbrains-AI-Assistant-plugin-completely) 
 but not really having the ability to turn it off and at the time the plugin seemed to update every few hours bugging
you to update.   I tested it at the time (during the free trial) and found it not to be as good as CoPilot was (since CoPilot had several
years to improve things) and hadn't returned to it since paying to try something that launched so poorly and had so little buzz
seemed like folly.  My guess is that this is why they created a completely new product called [Junie](https://www.jetbrains.com/junie/)
rather than adding it to their original [AI Assistant](https://www.jetbrains.com/ai-assistant/).  I got into the early
access for AI Assistant that originally only ran on a couple of their IDEs and only on the Mac and Linux and found that
it was mostly unusable so I waited for it to be available in [WebStorm](https://www.jetbrains.com/webstorm/).  

I decided rather than having it build a toy dashboard (which all Agentic coding assistants are very good at) I would have it convert
an existing project from JavaScript to TypeScript.  The project was written a while ago, and used the old CommonJS style
imports, so I wanted to update that to Modern ESM imports as well (this may have been a mistake).  I asked Junie for a plan
and to start the process, and it did create a nice Markdown document to 

{% assign snippet = collections.static-snippets | findSnippetByName: "convert-strategy" %}
{% if snippet and snippet.url and snippet.templateContent %}
<div class="snippet-preview">
  {{ snippet.templateContent | truncate: 200, "..." }}
  <div><a class="external-link" href="{{ snippet.url }}">Read full document</a></div>
</div>
{% endif %}









