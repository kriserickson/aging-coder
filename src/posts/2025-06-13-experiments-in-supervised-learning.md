---
layout: post
category: AI 
title: "Experiments in Supervised Learning: Lessons from an old Recipe App"
imagefeature: blog/supervised-part-1.webp
description: 
tags: ["Programming", "ML", "Supervised Learning", "AI"]
---


# How to Do Supervised Learning: Lessons from an Old Recipe App

**Heads Up : This is a technical post and requires enough understanding of programming to be relatively comfortable in [Visual Studio Code](https://code.visualstudio.com)*

This is the first in a series of at least 4 articles where I will explore the process of building a supervised learning model using real-world data.   This is a hands-on series, so if you want to follow along, you should have some basic programming skills and be comfortable with Python.  This first post really just goes over what we are going to do, shows you how to get the training data, and sets up the environment and how to run the first step of the process.  In the next post we will build a model using [scikit-learn](https://scikit-learn.org/stable/) and the data we extract in this post (this will be a fairly naive model and won't be particularly good at extracting data).  The third post we will start tuning the model in various ways, using various techniques.  In the final post we will finally produce a model that could be used for extracting recipes from web pages, and present some suggestions for some experiments you can run on your own.

Before diving into the nuts and bolts of supervised learning, I want to revisit a personal project that laid the groundwork for some of the ideas explored here: **Recipe Folder**.

Back in 2013, I built a web app called [Recipe Folder](https://web.archive.org/web/20220630230600/http://recipe-folder.com/) as a hobby project. You can take a trip down memory lane of what the state of PAAS and software development was 10 years ago read more about its creation and the technology used here: [Building a Not Very Successful Product for No Money](/posts/2016-01-26-building-a-not-very-successful-product-for-no-money/).

### What Recipe Folder Did

Recipe Folder was a tool that let users save recipes from the web into their own personal collection. You could import recipes from websites and organize them, add notes, and create grocery lists. One of core features was a browser extension (or in the early days a [bookmarklet](https://en.m.wikipedia.org/wiki/Bookmarklet)) that helped you "clip" recipes directly from a web page.  I never found an effective monetization strategy beyond de minimis ad revenue and a $2.99 deluxe mobile version to strip the ads (which sold about 10 copies). Despite this, I maintained the site and its apps for over ten years..

### The Challenge: Scraping Recipe Data

One of the trickiest parts of Recipe Folder was extracting the actual recipe data from arbitrary web pages. The extension would first attempt to parse the page automatically. This was done using a combination of regular expressions and by looking for any structured recipe metadata that might be embedded in the page.

Ten years ago, when I started writing the app, common embedded recipe formats included:

- **Schema.org/Recipe** microdata
- **Open Graph** tags
- **hRecipe** (an older microformat)

When a page included one of these formats, we could usually extract a clean recipe.  These days a lot of sites use [Google's recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe), but back in the day most sites either used non-standard formats or had messy HTML. In those cases, the extension would fall back to a manual mode.

### Manual Labeling by Users

If the automatic parser failed, users would be prompted to manually highlight parts of the page:

- The **ingredients** list
- The **directions** or method
- The **recipe title**
- The **main image**

This manual labeling provided a surprisingly clean dataset of real-world recipes labeled by humans.

### The Decline of Manual Selection

However, as mobile phones became the primary device people used to search for and browse recipes, the manual selection process became untenable. The browser extension workflow simply didn't translate well to mobile, and users were increasingly unwilling to manually select content on small screens.  Because of this and the rise of other better apps, usage of the site gradually dwindled.

### Attempts to Automate Extraction

Before I shut the site down, I made several attempts to improve and automate the recipe extraction process. Initially, I tried an approach similar to [Ben Awad's method for scraping recipe websites](https://www.benawad.com/scraping-recipe-websites/), using heuristics and structured data parsing to handle more edge cases automatically.

Later on, I experimented with applying machine learning techniques to the problem. I built a small pipeline using Kafka to process pages and classify their content, but I didn't have much success with this early ML attempt—mainly due to the noisy data and limited amount of labeled training examples.

### Shutting the Site Down

By 2023, I made the decision to shut Recipe Folder down - as the task of keeping both an iOS app (still in Cordova) and an Android App (now in Native code) and an express website up-to-date and answering help questions for a site I had long made free (I removed all the ads 5+ years before) was more of a time commitment that I had to give. Still, the project had generated a valuable collection of manually labeled recipe data—a perfect resource for training a supervised learning model.

### What This Has To Do With Supervised Learning

Fast forward to today, and I’m revisiting the problem of scraping recipes with a new goal: to build a supervised learning model that can automatically extract recipes more robustly than my old rule-based system. While I don't plan to bring Recipe Folder back from the dead, I did think that this was an excellent project to learn about supervised learning. And it turns out, the labeled data from those manual selections is a goldmine for training such a model.

In the rest of this post, I’ll walk through the process of turning this kind of real-world, messy data into a useful supervised learning pipeline.

### Getting Started

Using this data, over a series of blog posts, I am going to build a supervised learning model for recipe extraction using the data from Recipe Folder. If you want to follow along, the project is on Github as [recipe-parser](https://github.com/kriserickson/recipe-parser).  Check out the [blog-post-1](https://github.com/kriserickson/recipe-parser/tree/blog-post-1) branch

{% highlight bash %}
$ git clone git@github.com:kriserickson/recipe-parser.git
$ git branch blog-post-1
{% endhighlight %}

I am using VS Code the example, but you can use any IDE you are comfortable with, the examples will be somewhat similar.   If you are using Visual Studio, install the [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python). BTW, I am not a python expert and am actively learning Python myself (so let me know if I have made any glaring mistakes) -- also I prefer to have types so my Python code is usually heavily typed.  While a deep understanding of Python is not required for these blog posts, or to know how to do supervised learning, if you want to do any ML programming you will want to become familiar with Python. Also for these tutorials, you are going to need a modernish version of Python (3.10 or higher) and a very basic understanding of Python programming.  

If you are running on a Mac you may find that python is installedas python3 and this will tend to be a quite antiquated version.  Installing a modern version of Python, whatever system you are running on, is a task left to the reader.

**1. Create Virtual Environment:** Open VS Code terminal (`Ctrl+`` or View → Terminal`) and run:

{% highlight bash %}
# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate

# Activate it (Mac/Linux)
source .venv/bin/activate
{% endhighlight %}

**2. Select Python Interpreter (this is only if you are running Visual Studio)**

* Press `Ctrl+Shift+P` or Command+Shift+P if you are on a Mac to open the Command Palette.
* Type "Python: Select Interpreter"
* Choose the one in your `.venv` folder (should show `.venv/Scripts/python.exe` or `.venv/bin/python`)

**3. Install Dependencies (requirements):**

{% highlight bash %}
pip install -r requirements.txt   
{% endhighlight %}

3. **Verify Setup in VS Vode:**

* Bottom-left corner should show your Python interpreter (`.venv`)
* Terminal should show `(.venv)` prefix when activated
* You can now install packages, run, and debug your Python code

**4. Create the Recipe Data:**

* Go to Run and Debug view (`Ctrl+Shift+D` or Click the Icon on the left that has Play Triangle with a Bug on it)
* Select validate\_and\_filter\_recipes from the dropdown at the top (if you want to see what is going on, you can look at the launch.json file in the .vscode directory.
* I would put a breakpoint in src/validate\_and\_filter\_recipes.py file, and I wouldn't start things yet - let me explain what is going to happen.
* This code looks through the data/potential\_labels directory and finds all the .json files (these were exported from my old Recipe Folder site)  lets look at one now.

{% highlight json %}
{
  "hash": "0fa3ca4369af73ba398d3f542bbddc47d91b0454",
  "title": "Toasted Pumpkin Seeds Recipe",
  "image": "http://www.simplyrecipes.com/photos/roasted-pumpkin-seeds-520.jpg",
  "href": "http://www.simplyrecipes.com/recipes/toasted_pumpkin_seeds/",
  "keywords": [
    "medium",
    "sized",
    "pumpkin",
    "salt",
    "olive",
    "oil"
  ],
  "directions": [
    "0",
    "Cut open the pumpkin by cutting a circle around the stem end, and pulling off the top. Use a strong metal spoon to scrape the insides of the pumpkin and scoop out the seeds and strings. Place the mass of pumpkin seeds in a colander and run under water to rinse and separate the seeds from the everything else.",
    "Measure the pumpkin seeds in a cup measure. Place the seeds in a medium saucepan. Add 2 cups of water and 1 tablespoon of salt to the pan for every half cup of pumpkin seeds. Add more salt if you would like your seeds to be saltier. Bring the salted water and pumpkin seeds to a boil. Let simmer for 10 minutes. Remove from heat and drain.",
    "Preheat the oven to 400°F. Coat the bottom of a roasting pan with olive oil, about a tablespoon. Spread the seeds out over the roasting pan in a single layer. Bake on the top rack until the seeds begin to brown, 5-20 minutes, depending on the size of the seeds. Small pumpkin seeds may toast in around 5 minutes or so, large pumpkin seeds may take up to 20 minutes. Keep an eye on the pumpkin seeds so they don't get over toasted. When nicely browned, remove the pan from the oven and let cool on a rack. Let the pumpkin seeds cool all the way down before eating.",
    "Either crack to remove the inner seed (a lot of work and in my opinion, unnecessary) or eat whole."
  ],
  "ingredients": [
    "0",
    "One medium sized pumpkin",
    "Salt",
    "Olive oil"
  ],
  "__v": 0
}
{% endhighlight %}

* This should look pretty obvious, the only weird thing is that directions and ingredients have this random "0" as the first entry.  This was because the old site supported multiple sections of ingredients and directions (you will see a "1" in some recipes, in fact recipe\_00000.json has 2 ingredient sections).
* The validate\_and\_filter\_recipes.py file goes through all the "potential" recipes, downloads the HTML file as it currently stands, and if the HTML is there, and doesn't look like a 404 it copies the html file into the data/html directory and json file in the data/labels directory.
* I won't go through and explain the  validate\_and\_filter\_recipes.py too deeply, this isn't an article about web scraping or simple parsing of JSON (and to be fair, [GitHub Copilot](https://github.com/features/copilot) wrote most of it), but I will warn you that you will see a browser pop up a fair bit when running through the 20,000 recipes - this is because some sites like [All Recipes](https://www.allrecipes.com) block straight HTTP requests so we have to use \[Selenium]\() to grab the data.
* Press the play button or hit **F5** (or hit **Control F5** -- **Command F5** on a Mac to run rather than debug).
* Depending on your computer and internet connection this will take a while (I could have made this much faster with [concurrent,futures](https://docs.python.org/3/library/concurrent.futures.html)) and done multi-threading but it only has to run once so go grab a cup of Joe and come back in a while.
* You can experiment with the other functions in the project, and in the next article I will explain what is going on with them and how the first stab at building a supervised learning model worked.

*[To be continued...](/posts/2025-06-14-experiments-in-supervised-learning-part-2/)*

