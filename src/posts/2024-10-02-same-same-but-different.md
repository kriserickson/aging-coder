---
layout: post
category: Blog
title: Same, Same, but Different
description: "Has it really been 6 years since I last blogged?  Yikes!"
imagefeature: yak/yak-shaving.jpg  
tags: [Blog,Programming]
---
Has it really been 6 years since I last blogged?  Yikes!

Well, I have been meaning to write something for months now (the programming world is a very different place) mostly dealing with the some of the most interesting new fields in programming (AI, Assistants, Containers, and heck 6 years ago I was doing nothing with the Cloud) and other interesting technology. 

I went to start a new blog and couldn't get jeckyl working (I bought a new computer, replacing my 2014 desktop earlier this summer) and couldn't get [Jekyll](https://jekyllrb.com) running.  
I hadn't installed ruby yet, but then I realized that [WSL](https://learn.microsoft.com/en-us/windows/wsl/about) was installed so I did

```bash
gem install bundler jekyll
```

which produced

```bash
$ bundle install
Fetching gem metadata from https://rubygems.org/...........
Resolving dependencies...
Could not find compatible versions

Because nokogiri >= 1.16.2, < 1.16.3 depends on Ruby >= 3.0, < 3.4.dev
  and nokogiri = 1.16.2 depends on Ruby >= 3.0.0,
  nokogiri >= 1.16.2, < 1.16.3 requires Ruby >= 3.0.
So, because nokogiri = 1.16.3 depends on Ruby >= 3.0.0
  and nokogiri >= 1.16.3, < 1.16.4 depends on Ruby >= 3.0, < 3.4.dev,
  nokogiri >= 1.16.2, < 1.16.4 requires Ruby >= 3.0.0.
```
Which I probably could have spent more time debugging, but I really don't want to learn the intricacies of bundler or gem or deal with ruby in any way at all.

So I figured that since my website was just a bunch of markdown and liquid templates there was probably a node [static site generator](https://en.wikipedia.org/wiki/Static_site_generator) that could take what I already had and just serve it instead.

I did what I frequently do these days, skip the google and go straight [ChatGPT](https://chatgpt.com/), asking it:

<img src="/img/same-same/chatgpt.webp"/>

It contained a lot more data, but following the instructions I had absolutely nothing working.  I then spent the next 5 hours [Yak Shaving](https://seths.blog/2005/03/dont_shave_that/) and learning how to make eleventy work, rewriting liquid templates in [Nunjucks](https://mozilla.github.io/nunjucks/) (and dealing with nginx rewrite regex hell so my old permalinks didn't disappear).  

And with all that done I can state the following things

1. Switching tech stacks always takes longer than you think, what I thought would be an hour or two quickly turned into a day, even though the liquid is the same the way that variables and site vars referenced is all different.  
2. ChatGPT and other LLM tools like [Co-Pilot](https://github.com/features/copilot) are super helpful but also get a lot wrong - half of the syntax it wrote to move my site eleventy didn't work or didn't exist.  I don't know if over relying on it wasted more time of me entering the errors into ChatGPT rather than spending the time to figure out what was actually going on.
3. It is better to work in a technology (node) that you understand and are comfortable in.  I now feel like I have had my hands untied and I can start improving the blog where I felt a bit handcuffed in Jekyll.

So, you probably haven't noticed much of a difference in the Blog (you can no longer share on [Google Plus](https://killedbygoogle.com)), but you can on [Mastodon](https://mastodon.social/home).

BTW, if you want to see how the new site generator works, feel free to look at it, copy it, start your own blog off it -- you can find it on Github at [agingcoder](https://github.com/kriserickson/aging-coder).

