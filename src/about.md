---
layout: page.njk
permalink: /about/index.html
title: The Aging Coder
tags: [Aging Coder]
chart: true
---
I have been passionate about computers and programming since I first found the TRS-80 Computer Basic programming manual at a Garage Sale when I was 9.  

<img src="/img/about/trs-80-basic.webp" alt="TRS-80 Basic Programming Guide"  style="max-width:450px;">

 Although I didn't have a computer at the time, I spent hours writing out adventure games in Basic in longhand for the computer I one day dreamed of owning.  I spent hours at the local Radio Shack playing with the TRS-80 there (typing in the code I had memorized from the book and being exctatic when it worked):
 
 <img src="/img/about/hey-ma-it-works.webp" alt="Hey Ma!  It works!" style="max-width:350px;"/>

 My Dad also brought home an old book on [Cardiac](https://en.wikipedia.org/wiki/CARDboard_Illustrative_Aid_to_Computation) a cardboard computer.  When our family did finally get an Apple II+ computer, I was in seventh heaven.  I buried myself in the families "Computer room" programming computer games in Basic, I took a course at the local University to learn Pascal and eventually taught myself 6502 Assembly to be able to program real "video games" from the book [Apple Graphics and Arcade Game Design](https://archive.org/details/AppleGraphicsArcadeGameDesign).

 <img src="/img/about/arcade-graphics.webp" alt="Apple Graphics and Arcade Game Desing Cover"  style="max-width:450px;"/>

Because I couldn't afford to by an assembler ([the Merlin assembler](https://en.wikipedia.org/wiki/Merlin_(assembler)) cost far too much for 14 or 15 year old me), so the mini assembler was the only way I could program 6502.  The disadvantage of the mini assembler was there was no pneumonics, it was literally entering hex codes for everything manually like

```asm
3000:LDA #05
3002:CLC
3003:ADC #03
3005:STA 0200
3008:RTS
```

rather than something nice in commercial assembler like:

```asm
        ORG   $3000      ; set starting address

START   LDA   #$05       ; load 5 into A
        CLC              ; clear carry
        ADC   #$03       ; add 3
        STA   $0200      ; store result in memory
        RTS              ; return

        END
```

So I wrote my own assembler in Basic.  One of my early lessons was to save often, becuase I lost a lot of my assembler when the code I was testing wrote overtop of the basic program space (not a lot of memory on those old Apple 2s).

I made some money contracting at age 16 (like $100 here and there) writing programs for the Apple 2+ (I remember writing a numerogology program in basic and extending the functionality of DBase 3 for a Yacht club).  Eventually I was hired to work on building video games for the yet un-released Amiga computer, but it was about this time that I decided that computers were uncool and I ended up bailing on the project before much work was done.

I didn't program much for almost 10 years, and ended up getting my degree in English Literature.  Discovering that there wasn't really a huge demand for English Majors, I returned to school to learn programming in 1996 with the thought that if I had technical knowledge I could write computer documentation or the like.  I quickly discoverd that technical writing was not for me, and that I was actually very good at the whole "programming" thing.  

I interned at [TRIUMF](https://triumf.ca) after my first year in the [ACST](https://web.archive.org/web/19971014223422/http://www.langara.bc.ca/asdipprog/compsci.html), bringing some of their internal Oracle Forms apps onto the web so that the technicians and researchers weren't required to be at a [VMS](https://en.wikipedia.org/wiki/OpenVMS) terminal as the Oracle Forms where written for VMS terminals.

My second internship was at [Canfor](https://www.canfor.com) where I worked on html intranet features in ASP, and a developed a Visual Basic system for importing, cataloging, and displaying Material Safety Data Sheets.

It was at this point where I was approached by a friend to come work at Macdonald, Harris and Associates.  I was brought on to add to their suite of web authoring tools like [Toolbar Wizard](https://web.archive.org/web/19981201213034/http://www.mha.ca/toolwiz/) by creating a DHTML Authoring Program in VB6.  I spent a few months working on this until I got hauled off it to work on the large contract that was an ecommerce site called Elgrande.com - we as a team of 5 were going to duplicate Amazon in a few short weeks.  Because Elgrande.com was a venture backed company they had purchased things like an Oracle license so part of the challenge of getting running was running one of the ealiest versions of Oracle on Linux -- something that crashed all the time.  Our two week turnaround time creating the website stretched into a couple of months but the site was launched in June 1999 with 25,000 books, 10,000 CDs and 2,000 DVDs.

We then took the technology we used on the Elgrande site and created a few other ECommerce sites (a site selling toys, a site for drug stores, etc) and it was around this time that the [Storefront.com](https://storefront.com) domain was bought and a lot of the work we were working on was to create a generic commerce system (along with its own "language" SFML).   Also during this time, we were approached to create a site to handle the ordering of online photos for the yet to be released Windows XP for [London Drugs](https://www.londondrugs.com) in Canada.  This Print Wizard, built-in to the Windows XP Operating system (where you could right click on a photo in Windows explorer and get a print ordered), was Macdonald, Harris and Associates first foray into the Photo Printing and Finishing world where I would spend the next 25 years of my professional life.

The XP ordering system was folowed up by a complete Photo and Photo product ordering site for London Drugs.  Also we decided that to compete in the Photo World we needed a [Photo Kiosk](https://www.kioskmarketplace.com/news/storefront-photo-kiosk-sweeps-experts-choice-awards-at-dima-conference-2/) that I spent many years working on, a piece of lab software. 
