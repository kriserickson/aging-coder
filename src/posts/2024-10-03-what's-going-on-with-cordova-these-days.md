---
layout: post
category: Programming
title: What's going on with Cordova/PhoneGap/Ionic these days?
imagefeature: blog/mobile-frameworks.webp
description: "People often ask me (ok, some programmer friends of mine sometimes ask me) what I would use to build a mobile app these days - would I still make a cross platform app with Cordova"
tags: []
---
People often ask me (ok, some programmer friends of mine sometimes ask me) what I would use to build a mobile app these days - would I still make a cross platform app with [Cordova](https://cordova.apache.org) or [Ionic](https://ionicframework.com) these days.  The answer is probably no, but it really depends on what your use case is.  (and yes I will use the word Cordova from here on, but really even though the technology is a little different under the hood for Ionic, it is still basically a web page wrapped in an app).

Part of the reason is that with [PWAs](https://en.wikipedia.org/wiki/Progressive_web_app#cite_note-23) on mobile are basically at the point where the original developers of PhoneGap [Nitobi](https://www.nitobi.com) - who were [acquired by Adobe in 2011](https://vancouversun.com/news/staff-blogs/adobe-acquires-vancouvers-nitobi-creator-of-phonegap) wanted -- the browser on Mobile Devices being able to do almost anything an App can do.  Of course PWAs still suck on iOS because [Apple wants to keep its 30%](https://arstechnica.com/tech-policy/2024/02/apple-under-fire-for-disabling-iphone-web-apps-eu-asks-developers-to-weigh-in/) but that is a different story.  Most [LOB](https://en.wikipedia.org/wiki/Line_of_business) apps work better as a mobile web page that you can quickly update without the pain of doing mobile development.

But I want to write a ... and I need ... that I can't do on a web page.

- Game - If you need access to graphics then Cordova wouldn't have helped you anyway.  And [Josh Wardle](https://www.powerlanguage.co.uk) and [Wordle](https://www.nytimes.com/games/wordle/index.html) has proved you can make a very successful game on a web page.
- Send Notifications - You can do this on a PWA even on iOS ([mostly](https://www.magicbell.com/blog/best-practices-for-ios-pwa-push-notifications)) - though due to more of Apple's [malicious compliance](https://www.theverge.com/2024/1/25/24050696/epic-games-tim-sweeney-apple-app-store-response) with the European DMA, PWA notifications may not be available in th EU for while.
- Connect to Some Piece of Hardware - If you are maintaining a [plugin](https://cordova.apache.org/docs/en/latest/guide/hybrid/plugins/index.html) (the way you would do this in Cordova) it might be as much work as maintaining two Apps in Native code.
- Background Processing - See above, you are going to be writing a plugin to do this.  Also background processing is getting more and more difficult even in native apps so you may want to rethink this.
- I need it to be in the App Store - Can now be done on Google Play, and even Apple now offers limited supported for [PWAs in App Stores](https://web.dev/articles/pwas-in-app-stores).

I know that there are hundreds of other reasons to want an App, but I've found that the benefits of a web page can frequently override the pain that is working on a hybrid app.  Here are the reasons

1. Cordova was abandoned by Adobe years ago and so it has a very overworked [small team](https://cordova.apache.org/contribute/team.html) trying to maintain 4 codebases.  It only gets updated once or twice a year and that is basically to stop the breakage of old versions of the SDKs, Node, etc.  No-one has had time to move it to more modern frameworks ([Jetpack Compose](https://developer.android.com/compose) on Android, [SwiftUI](https://developer.apple.com/xcode/swiftui/) on iOS) and Java and Objective-C are still the ugly old languages used in 99% of the code.
2. Ionic made a break from Cordova in 2018 and created [Capacitor](https://capacitorjs.com) but it still isn't as good as Cordova for Android apps and only marginally better for iOS (I played with it a few months ago) but it is under much more active development than Cordova (and its iOS wrapper is mostly written in Swift, though the Android is still in Java rather than Kotlin).  Also there tends to be more Cordova plugins for esoteric things than Capacitor.  However Capacitor may be the future for Hybrid apps, who knows.  
3. It is a constant battle to get cordova apps to be able to compile from the command line.  You frequently want to keep your build box in Amber and only upgrade when the Play Store or App Store forces you to use a newer version fo the SDK since doing things like upgrading Android Studio or XCode will cause hours or days of pain to get things building from the command line again (if they do at all).  Achieving the goal of being able to wipe out the platforms directory and build from scratch sometimes becomes impossible and a bunch of manual hacks to the various gradle files or XCode project or podfiles until Cordova gets updates to work with the current SDK.
4. Native controls - some things like Combo Boxes and giant lists and the like never feel right on a mobile device no matter what you do.
5. Native Look and Feel - I know that having a unified look and feel for your app across two platforms is sometimes a good thing, but until your are a super popular App that people actually use on 2 different devices this will feel to the end user that you aren't designing for the platform.

All this said, do I still do some Cordova work for my day job.  Unfortunately yes, there are a few legacy apps that have to be maintained.  One is a Kiosk application where we control the operating system and have it locked down and doesn't require going through the Play Store.  That has a build box that almost never gets updated so a lot of a pains described above don't come into play.  Another is a [Quasar](https://quasar.dev) that was supposed to be cross-platform, but we have never had the time to write the plugin for iOS so it remains an Android only app - every time I have to update it (because the Google Play store warns me that its Android Version is out of date) as a painful experience trying to get the CLI to compile the app against the latest version of the Android SDK.

Given these challenges, it's no wonder developers are looking for better cross-platform tools. Fortunately, there are several promising alternatives to consider in 2024.
 (and what may have changed since [2018](/posts/2016-09-03-should-i-use-cordovaphonegap-or-go-native/)?)

### My Current Recommendations for Cross-Platform App Development

1. [Flutter](https://flutter.dev) - I really like [Flutter](/posts/2017-10-15-flutter-a-quick-look-at-a-new-cross-platform-mobile-app-toolkit/) (though [Dart](https://dart.dev) still seems like a strange choice to me - had they gone with Kotlin it would have been a much better experience).  I would have recommended it whole-heartedly if not its uncertain future with Google's tendency to [kill things](https://killedbygoogle.com) and the [recent layoffs to the team](https://thenewstack.io/whats-next-for-flutter-after-layoffs-hit-google-team/).  It uses a similar composable model to Swift-UI and Jetpack Compose and once you get familiar with it, is a fast way to design cross-platform apps.
2. [React Native](https://reactnative.dev) - If you love React (I personally prefer Vue, but you can't argue with [React's popularity](https://gist.github.com/tkrotoff/b1caa4c3a185629299ec234d2314e190)) then this is probably your best bet.
3. [NativeScript](https://nativescript.org) - Gives you a choice of Frameworks.  I haven't looked at it in years but really requires another look.
4. [Kotlin Multiplatform](https://www.jetbrains.com/kotlin-multiplatform/) - Never actually worked in it.  Love Kotlin the language, and JetBrains has pretty good track record of not killing projects (except for [AppCode](https://blog.jetbrains.com/appcode/2022/12/appcode-2022-3-release-and-end-of-sales-and-support/) which I will never forgive them for - forcing me to work in XCode - ughhh)
5. [Xamarin/Maui](https://dotnet.microsoft.com/en-us/apps/xamarin) - Well, Xamarin is no more but [Maui](https://learn.microsoft.com/en-us/dotnet/maui/what-is-maui?view=net-maui-8.0) is the future of C# cross-platform development.  I haven't built a Xamarin app in a while (though our Kiosk does use a bunch of services written in C#/Xamarin).  C# is another language I adore, but the tooling use to be very painful if you tried to mix and match Visual Studio's Android SDK and Android Studios Android SDK.  And the iOS builds where a nightmare, but it is another platform I should investigate again.




Others Cross Platform suggestions, leave in the comments below.

In conclusion, while Cordova and Ionic served their purpose well, the mobile development landscape has evolved. Depending on your project requirements, the right choice may vary, but these modern alternatives provide a far better experience than trying to wrestle with outdated frameworks. 

