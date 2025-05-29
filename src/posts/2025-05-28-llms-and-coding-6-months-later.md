---
layout: post
category: Programming
title: "LLMs and Coding 6 months later"
imagefeature: blog/llms-6months-later.webp
description: "Good lord, it has been 6 months since I last wrote a post about LLMs and coding and how the world has changed. "
tags: ["Programming", "LLM"]
featured: true
---
Good lord, has really been 6 months since I last 
[wrote a post about LLMs and coding](/posts/2024-10-05-leveraging-llms-for-coding-insights-and-real-world-experiences/) - 
how the world has changed since that time.  
I guess with 6 years between posts before November, and 6 months between posts now I should look on this as an 
improvement but with how much things change in AI and LLM world that is the same as 6 years between posts
on Cordova.

I certainly use LLMs more in day-to-day work than I did 6 months ago, and I have started using them in new and different 
ways.  We finally have editing mode in CoPilot for JetBrains IDEs ([and now in public Preview MCP servers](https://github.blog/changelog/2025-05-19-agent-mode-and-mcp-support-for-copilot-in-jetbrains-eclipse-and-xcode-now-in-public-preview/)).
I've used a lot of the new hotness IDEs like [Cursor](https://www.cursor.com/) and [Windsurf](https://windsurf.com)
and actually spent a considerable time away from my Beloved [Jetbrains](https://www.jetbrains.com) suite of IDEs to
Visual Studio Code as the Jetbrains Plugin for CoPilot was clearly falling behind the VS Code plugin.  I've played with
[ChatGPT Canvas](https://openai.com/index/introducing-canvas/) and their early version of 
[Codex](https://github.com/openai/codex), which seems to be a little different from their
[Codex App](https://chatgpt.com/codex).  I know, OpenAi is great at naming things, you spent $3B on Windsurf 
how about a few bucks for someone who could help you with sane naming?  I've used [Junie](https://www.jetbrains.com/junie/) 
as well as the standard AI Chat in JetBrains IDEs (Junie appears to be a superset of the AI Chat that does Editing and 
Ask but they still install both by default).  

So this post is just a little write up of my experiences with these tools and maybe some tips I have learned along the way.

### CoPilot in JetBrains IDEs

I have been using CoPilot in JetBrains IDEs since CoPilot was released in 2021.  At the time (this was before ChatGPT 
came into the mainstream), it was useful for writing boilerplate code, implimenting functions (especially if you had 
heavily commented what the function was going to do) and at the time seemed absolutely magical.  Eventually ChatGPT 
surplanted it for writing functions and code, but I still used it for API Documentation,
helping writing tests, and the occaisonal function that I couldn't be bothered to write myself.  The Chat freature that
was added last year (I think it was last year, maybe 2023) was a great addition, allowing you to ask questions about 
the code and get answers back in the IDE.  But since in JetBrains IDEs it was limited to one model (GTP-4) and 
I kept hearing about how much better the CoPilot in VS Code was -- most of this is covered in
the [last post on LLMs in coding](/posts/2024-10-05-leveraging-llms-for-coding-insights-and-real-world-experiences/).  One of the sticky
features of CoPilot is that I am on the yearly plan (though that will probably change before the next renewal) and so since
I am already paying for CoPilot any new AI coding assistant has to be considerably better than it (not quite 
[the tyranny of the default](https://eicolab.com.au/2014/the-tyranny-of-defaults.html) but CoPilot definately has 
[first mover advantage](https://en.wikipedia.org/wiki/First-mover_advantage)).

The ability to change models and use editing mode in JetBrains IDEs has sort of brought CoPilot for JetBrains to be about 6 months
behind the CoPilot in VS Code.  The editing mode is not trustworthy yet, it will frequently mess up code (though
at least in JetBrains IDEs you can have their history feature that means you don't have to commit before allowing 
CoPilot to edit your code).  There is no "CodeBase" feature like in VS Code, so you have to manually add the files
you want CoPilot to use in the editing mode.  I haven't tried MCP mode yet, so I don't know how well it is going to work.  My 
overall recommendation is that if you want to use CoPilot get comfortable with VS Code, as it will always be the best 
experience for CoPilot.  If you are like me, and feel like using VS Code is like coding with one hand tied behind your 
back (no shade on VS Code, I just have so much muscle memory in JetBrains IDEs)**don't** have the project open in
both VS Code and JetBrains IDEs at the same time, they do not play well together and you will end up with one IDE 
overwriting the changes of the other. I have had this happen multiple times, and it is very frustrating, and every
time I think I have found a way to make it work, I end up getting burned again.

### Cursor

[Cursor](https://www.cursor.com/) is an IDE built on top VS Code that is designed to be an "AI First" IDE. 
Because the AI features are not built as on Add-In they have a lot more control over the AI features and how they work.  
It has a lot of the same features as CoPilot, but it seems to be introducing new features at a much faster pace.  
Since this was the first time I had access to Agents to actually edit my code I was amazed at how much easier this
was that trying to determine what had changed when using the Chat window in JetBrains IDEs or 
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

[WindSurf](https://windsurf.com) like Cursor is another fork of VS Code (it started out like CoPilot as a plugin for VS Code, 
Jetbrains, and a few others).  It seems very similar to Cursor but just a bit cleaner and a little more care was taken 
with UI (even the default color scheme in my eyes is a bit more tasteful).  It has more appealing and more informative 
feedback when it is generating code, and the "Cascade" sidebar looks cleaner and easier to use that the "Chat" window in 
Cursor.  The code generation and tool usage seems to be about the same as Cursors but I didn't spend a lot of time 
doing direct comparisons.  

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
    <img alt="Scotty, Hello Computer" src="https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHMwejEwdjFlN280bnNqcmVmZGN0bjk0eWk1d2dpdWN3M3gyaHVldyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btVRbshbbaC8Ygg/giphy.gif"/>
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
imports, so I wanted to update that to Modern ESM imports as well (this may have been a mistake).  I figured this was
a good project to try since it wasn't too complex of a problem and had the project did have something like 95% test
coverage. I asked Junie for a plan and to start the process, and it did create a nice Markdown document with all the steps involved...

{% assign snippet = collections.static-snippets | findSnippetByName: "convert-strategy" %}
{% if snippet and snippet.url and snippet.templateContent %}
  <div class="snippet-preview">
    {{ snippet.templateContent | truncate: 200, "..." }}
    <div>
      <a class="external-link" href="{{ snippet.url }}">Read full document</a> | 
      {% snippetRawLink snippet %}
    </div>
  </div>
{% endif %}

and then ran the initial steps updating the required files.  It required a ton of prompting Junie, referring to various
other AIs and a lot of trial and error to get the tsconfig to actually work with both CJS and ESM so that I could convert
the files one at a time.  This was then just a slow process of telling it to convert every file and then fix the problems
it created when it did so.  Trying to do more than 2 or 3 files at a time would frequently run into timeouts and I would
get no results back and have to try the request again.  

Finally when all 35 or so files where complete, it was time to run the tests to see how well Junie did.  Unfortunately, 
though, I could the app in the mixed CJS/ESM mode, running the tests in this mode was a complete fail and I next
had to convert 20 test files, and fix a ton of issues with things like figuring out how to do things like 
[mock-require](https://github.com/boblauer/mock-require?tab=readme-ov-file) and better handling of dependency injection
under TypeScript.  My little project that I hoped would take a couple of hours morphed into a multi-day odyssey.

After finally converting all the tests with Junie and a lot of refactoring to handle TypeScript and ESM style imports, I
ran the tests and was surprised that a lot of them passed without trouble.  I looked closely at the ones that failed because
I was not certain whether the test translation or the program translation had failed.  But working through them I finally 
got all the tests to pass.  I was thinking I was pretty impressed with this new AI coding partner world, and that this
job would probably have taken weeks rather than days if I tried to do the conversion 3 years ago before there was any AI coding help.  

And then I tried running project, while it sort of appeared to run, it failed in a lot of ways.  I discovered that Junie (and
I am not blaming Junie particularly for this because I have seen this happen now with multiple models) had rewritten some
of the JSON Api Endpoints (checkout.applyPayment was renamed fulfilment.applyPayment, and the like).  After noticing this
I decided to diff the TypeScript and JavaScript and look more closely at what had been changed (I had done this very
carefully with the first 10 files it converted but it had tricked me into a false sense of security and I kind of was
only glancing at the files and making sure that they compiled after this) and discovered that it had deleted a bunch
of the code to handle edge cases.  How is this passing the tests, I thought, I knew that the edge cases where specifically
tested since they had caused problems in the past.  It turns out the Junie had either deleted the sections of the tests
that checked or changed the tests so that edge cases passed, I don't think this was when I was getting Junie to fix the
tests (I thought I was paying pretty close attention to the tests when I did this but I can't be 100% sure) 
but I think it happened when it was actually converting the tests in the first place.  This forced me to back back and
manually examine every single change Junie had made when converting the files -- in some files it did a pretty simple
conversion but a lot of times it completely changed the code (mostly in valid ways that might be considered cleaner in TypeScript)
and even though my instructions on updating where not to change the logic but only add types were required it clearly
didn't follow this instruction.  I think a lot of my instructions got lost because my way of converting a lot of the files
was "In the way that you converted the last file, please convert service.js to service.ts" which knowing what I know now
probably allowed a lot of the instructions to fall out of the context memory.  This may be on me for not putting
instructions into [junie-guidelines](https://github.com/JetBrains/junie-guidelines) but it is definitely something
to watch out for if you plan to use Junie or any AI to convert a project to TypeScript for you.  Eventually I had to
spend dozens more hours fixing the tests that where changed, fixing the code that was removed.  I had to go line by line
through every line of code to make sure that the code still did what I think it should do - and I did find a surprising
number of places where the code was changed, and found a bunch of new Unit Tests to add (100% code coverage definately does
not mean you are testing all possible variables).

### Conclusions

AI Coding Assistants are here to stay, they provide a ton utility but you have to be cautious when you use them.  I 
know that almost anyone who has used one has got into the battle with AI where it produces code with an error, and you
ask it to fix it.  The fix produces a different error and you ask it to fix that, and it changes it back to the first
error.  Switching models sometimes helps with this, but frequently it does not.  And that is the point, these things
are amazing in some ways, but in other ways they are as dumb as a post.  The various tools all have their own strengths
and weaknesses and part of the problem is that changes week by week.  It can take months or even years to become familiar
with an IDE to be able to get the most out of it.  I have probably stuck with CoPilot on Jetbrains IDEs for far too long
just due to my comfort with the IDE and my advanced knowledge of a lot of its functionality after using it for over 15 years.
I am learning how to be more productive in VS Code because I see that is where the future of AI Agents is heading mostly
because there is so much competition there (and now that both VS Code forks are multi-billion dollar companies, I think
that a few more startups will be springing up in the VS Code fork world), even VS Code itself there are dozens if not
hundreds of AI coding assistants.


