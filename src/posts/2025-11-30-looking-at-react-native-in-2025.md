---
layout: post
title: "Looking at React Native in 2025"
description: “Ten years, three articles, and one more trip through MobileNativeJavaScript land.”
category: Programming
draft: true
tags: [React Native,Mobile,MNJS,JavaScript,Programming]
imagefeature: blog/react-native3.jpg
featured: true
---

Back in 2015 and 2018 I wrote a small trilogy of posts about NativeScript, React Native, and what I dubbed the “MobileNativeJavaScript” (MNJS) movement (a term that to my never ending surprise never took off). At the time I was mostly skeptical: the tooling was fragile, the UI story was awkward, and every framework demo seemed carefully cropped to avoid anything that looked like a real app.

Nearly a decade later, I’ve gone back to React Native for a fresh project built on the current 0.82.1 version, and the experience is very different. Before I talk about today, it’s worth quickly recapping where I left things.

## Previously on React Native (and friends)

[2015: A quick dive into early React Native](/posts/a-quick-dive-into-react-native/)

A few weeks after looking into [NativeScript in 2015](/posts/second-thoughts-on-nativescript-react-native-and-mobilenativejavascript-in-general/) I took React Native for a spin.

There were some real positives:
- Per‑platform UI with shared business logic. Write separate views for iOS and Android but reuse the logic.
- React’s programming model. The component/state model was fun and expressive.
- Facebook dogfooding. They were shipping real apps with it instead of just demos.
- Fast debug loop. The local dev server and hot reload made iteration feel modern.

But the cons were brutal:
- Immature and rough. Android support was brand new and glitchy; Windows support was basically “good luck.”
- Confusing errors and poor tooling. You could easily end up spelunking through Java or Objective‑C just to figure out what went wrong.
- Styling still lagged native. Getting something that looked as polished as a native screen was harder than it should have been.
- Missing core functionality. You could feel all the pieces that weren’t there yet.

My verdict at the time: interesting technology, but far too early for a production app unless you were Facebook or very brave.

## [2018: React Native — A tempting quagmire](/posts/react-native-a-tempting-quagmire/)

By 2018 I revisited React Native in a real‑world context: a client app that was crashing in production. The codebase was a mix of:
- A team learning both React and React Native at the same time.
- An event bus plus a half‑baked Flux‑style store.
- State violations that only showed up in release builds.

I eventually got the app to a “mostly not crashing” state, but the journey highlighted a few things:
- There was a gap between dev and release builds, bugs that never appeared in dev showed up immediately in release.
- Version drift hurt. Being a few versions behind React Native meant spending time tripping over already‑fixed bugs.
- You still needed native experts. When things went wrong on iOS or Android, you were suddenly deep in native build tooling, Gradle, Xcode, and platform quirks.

The conclusion in that post was pretty blunt:

React Native was an interesting emergent technology, but not a silver bullet for turning web developers into mobile developers.

If you have a big team of web developers and a healthy mixture of web developers and native experts, and you’re committed to continuous delivery, React Native might have been a good fit. For small shops or small apps, you might have been better off with traditional native or a more mature cross‑platform option.

That’s where I left things: React Native as a promising but swampy quagmire that required a guide, a rope, and a tolerance for mud.

33 React Native in 2025: the experience is… actually good

Fast forward to today. I started a new greenfield app on a modern React Native release (0.82 at the time of writing), and the overall experience feels like a different product.

A few highlights from this latest round:

TypeScript by default, not as an afterthought

One of the biggest quality‑of‑life improvements is that TypeScript just works out of the box. There’s no yak‑shaving to wire up Babel, tsconfig.json, Metro plugins, or extra tooling.
- New projects initialize cleanly with TS support.
- The default templates assume you want types, and the ecosystem (libraries, examples, docs) has caught up.
- Between modern React, React Native, and TypeScript, you can build a reasonably complex app with type safety and a clear mental model without a weekend of configuration first.

It sounds minor, but the cumulative effect is that you start your project actually building an app, not fighting the toolchain.

Stability: no more “white screen of mystery”

In my earlier posts, I spent a lot of time talking about crashes, mysterious white screens, and the gulf between debug and release builds.

On this new project:
- The app has been remarkably stable during development.
- Release builds behave much closer to dev builds than they used to.
- I haven’t had to do the old “gradlew clean and sacrifice a goat” routine nearly as often.

Some of this is better tooling, some of it is the project being relatively small and well‑structured, but a meaningful chunk of it is simply that React Native itself has matured. The new architecture, the regular release train, and the focus on stability all show up as fewer surprises when you hit “Run”.

Debugging: script debugger that mostly does what you expect

The debugging story is not perfect, but it’s noticeably better than it was in 2018.
- The JavaScript debugger works pretty well now for the common case of stepping through app logic.
- Breakpoints, call stacks, and basic inspection are good enough that you don’t dread wiring it up.
- The Network tab is still labeled “unstable,” and it earns that label — I wouldn’t trust it as my only source of truth.

It’s not as smooth as debugging a web React app in Chrome, but it’s far better than the “hope and console.log” era.

DevTools: deep component trees and limited usefulness

React DevTools is there, and technically the Components tab works, but in practice:
- You’re often 40–50 components deep before you see anything resembling your app’s initial layout.
- Between the React Native primitives, wrappers, navigation layers, and higher‑order components, the tree is extremely noisy.

For now I don’t find the Components tab especially helpful beyond the occasional sanity check. Most of the real debugging value is still in logs, the inspector, and knowing roughly how your layout should behave.

So… is React Native out of the quagmire?

Compared to where I was in 2015 and 2018, my answer today is surprisingly positive.

If you:
- Already live in the React + TypeScript world,
- Are building a new mobile app that isn’t trying to push every bleeding‑edge native feature on both platforms,
- And you’re willing to stay reasonably current with the React Native release train,

then React Native in 2025 feels like a solid, pragmatic choice.

The rough edges aren’t gone — the native layers still matter, the component tree is still noisy, and the debugging tools still have their oddities — but the day‑to‑day experience has shifted from “tempting quagmire” to “this is actually a nice way to build a mobile app.”

In future posts I’ll dig into some concrete patterns that worked well for this new project: how I structured navigation, how I approached state management, and where TypeScript and React Native’s newer architecture really paid off. But for now, it’s worth saying out loud:

React Native finally feels like something I’d recommend to past‑me — the guy who wrote those skeptical MNJS posts a decade ago.
