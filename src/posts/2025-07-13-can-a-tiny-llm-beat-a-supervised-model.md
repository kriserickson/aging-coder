---
layout: post
category: AI 
title: "Can a Tiny LLM Beat A Supervised Model?"
imagefeature:
description: 
draft: true
tags: ["Programming", "LLM", "AI"]
---


## 1. Introduction

Can a compact, fine-tuned LLM outperform a lightweight supervised model at structured extraction—specifically, parsing recipes from noisy, real-world web pages?
That’s the technical challenge at the heart of this post, inspired by a question from a reader:

> Also I am super curious, about another experiment that I have no idea about, but seems like the general direction of how things are going: Can we fine-tune / distill a very small LLM to do better than this?

In my recent posts, I engineered and iteratively improved a supervised pipeline that converts raw recipe HTML into structured JSON—capturing titles, ingredients, and directions. The result: a fast, highly accurate model under 2MB in size. It’s robust, efficient, and well suited for production use.

But the rapid rise of small language models has changed the landscape. With models like Phi-3, Gemma, and TinyLlama now able to run on consumer GPUs or even laptops, it’s time to ask:
**Given the same real-world task and dataset, can a “tiny” LLM (with or without fine-tuning) rival or surpass a classic supervised approach in both accuracy and efficiency?**

In this first article, I’ll walk through a practical set of experiments to answer that question:

* We’ll start by evaluating how commercial LLMs (such as OpenAI’s) handle recipe extraction out of the box, including considerations of cost and performance.
* Then, we’ll try running a small open-source LLM locally using [Ollama](https://ollama.com/), a tool for easily downloading and running modern language models on your own hardware—even without deep ML infrastructure.
* Finally, we’ll write a script to run several open-source models directly using the Hugging Face Transformers library, to observe “raw” inference performance and explore the trade-offs of full local control.

Along the way, I’ll explore what works, what fails, and what trade-offs you face in terms of speed, memory, and cost.
Ultimately: is it time to reach for a small LLM, or does traditional supervised learning still win for this structured extraction task?

Let’s dig in.

---

### What We’ve Built Already

This series has explored many dimensions of supervised learning:

* In [first article](/posts/2025-06-13-experiments-in-supervised-learning) I introduced the supervised learning project, described how real-world, human-labeled recipe data was collected from a decade-old recipe app, and walked through setting up the environment and dataset for future model training.
* [The second](/posts/2025-06-14-experiments-in-supervised-learning-part-2) I examplained how to build and train the first machine learning model to classify recipe blocks, analyzed its initial shortcomings.  I also explained the feature extraction, pipeline, and classification evaluation process in detail, highlighting where the basic model struggled and what needed improvement.
* [The third blog](/posts/2025-06-23-experiments-in-supervised-learning-part-3) I systematically improved model accuracy through feature engineering, parallelized data loading, memory and data cleanup, better labeling with fuzzy matching, and dataset balancing, ultimately boosting accuracy from 65% to over 95% and producing much cleaner outputs.
* In [the final](/posts/2025-06-28-experiments-in-supervised-learning-part-4) compared and tuned a variety of advanced classifiers, optimized for both accuracy and model size, introduced post-processing and deployment as a web API, and provided practical tips for productionizing the entire recipe extraction pipeline.

Our best result? **96% accuracy** using a **HistGradientBoostingClassifier**, all packed into a model under **2MB**. Now, let’s see how that level of performance stacks up against today’s LLMs.

### Testing against Commercial LLMs

Given the strengths of commercial LLMs like OpenAI's models, it's reasonable to expect they can handle recipe parsing with minimal guidance. To test this assumption—and to quantify both accuracy and cost—we'll start by running a quick script to see how the least expensive OpenAI model performs on this task.

```bash
$ git clone git@github.com:kriserickson/recipe-parser.git
```

if you haven't already, and then checkout this post and install the new requirements (there are a bunch)

```bash
$ git checkout llm-post-1-part-1
$ pip install -r requirements.txt
```

If you'd like to follow along with this section of the tutorial, you'll need to create a `.env` by copying the current `.env.example` 
file to `.env` or just creating a new one and replacing the `OPENAI_API_KEY` with the value you generate from OpenAI (this
will require putting at least $10 into an [OpenAI account](https://platform.openai.com/signup) - there are plenty of 
tutorials on how to do this all over the web):

```dotenv
# Add your OpenAI API key here
OPENAI_API_KEY=sk-REPLACE_ME
```

Now lets run our simple open-ai model -- yes the code contains a lot more code than is required for sending
a simple query to OpenAI, but having a some options and a few utilities
will be useful and we will use a lot of this code in our other tests.  Whenever you're using a 
commercial LLM, it's crucial to keep an eye on token usage—both to manage costs and to avoid hitting provider 
limits. OpenAI makes this process straightforward with the [TikToken](https://pypi.org/project/tiktoken/#description) 
library, which lets you quickly and accurately estimate the number of input tokens your prompt will consume.

```python
def count_tokens(token_prompt: str, token_model: str) -> int:
    try:
        enc = tiktoken.encoding_for_model(token_model)
    except Exception:
        enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(token_prompt))
```

With this function in place, we can assemble our prompt and precisely estimate its token count before making any API calls to OpenAI.

```python
 html_path = get_html_path(args.html_file)

    with open(html_path, 'r', encoding='utf-8') as f:
        recipe_html = f.read()

    prompt = f"""Extract the recipe as JSON from the webpage HTML:
{example}    
### Input:
{recipe_html}
### Output:
"""

    model = args.model
    token_count = count_tokens(prompt, model)
    print(f"Prompt token count: {token_count}")
    proceed = input("Continue and send to OpenAI? (y/n): ").strip().lower()
```

Lets try running the script and see how many tokens it takes for a medium size html page:

```bash
$ cd llm-src
$ python open-ai.py recipe_00010.html
Prompt token count: 94240
Continue and send to OpenAI? (y/n):
```

That’s an unexpectedly high token count for a single recipe!  Just for fun lets run it:

```text
Sending prompt to OpenAI...

--- OpenAI Response ---

```json
{
  "name": "Homemade Ragu Sauce",
  "description": "This ragu sauce is packed with ground beef, pork and bacon, then simmered to perfection for a flavorful and comforting meal.",
  "image": "https://www.tasteofhome.com/wp-content/uploads/2025/01/Homemade-Ragu-Sauce_EXPS_TOHD24_47366_SoniaBozzo_social.jpg",
  "author": "Joy Manning",
  "prepTime": "PT25M",
  "cookTime": "PT2H00M",
  "totalTime": "PT2H25M",
  "recipeYield": "10 servings (7-1/2 cups)",
  "ingredients": [
    "1 pound ground beef",
    "1/2 pound ground pork",
    "1/4 pound bacon strips, diced",
    "2 medium onions, chopped",
    "2 celery ribs, chopped",
    "2 small carrots, chopped",
    "4 garlic cloves, minced",
    "1 cup dry red wine or beef broth",
    "1 can (28 ounces) crushed tomatoes",
    "1 can (15 ounces) tomato sauce",
    "2 tablespoons tomato paste",
    "2 bay leaves",
    "2 teaspoons sugar",
    "1 teaspoon salt",
    "1/2 teaspoon dried thyme",
    "1/2 teaspoon dried oregano",
    "1/2 teaspoon each ground cumin, nutmeg and pepper",
    "1/2 cup heavy whipping cream",
    "2 tablespoons butter",
    "2 tablespoons minced fresh parsley",
    "1/2 cup grated Parmesan cheese",
    "Hot cooked pasta"
  ],
  "instructions": [
    {
      "step": 1,
      "title": "Cook the meat and vegetables",
      "text": "In a Dutch oven, cook the ground beef, ground pork, diced bacon, chopped onions, chopped celery and chopped carrots over medium heat. Stir frequently and cook until the meat is browned and no longer pink, about 10 minutes. Drain any excess fat from the pan.",
      "image": "https://www.tasteofhome.com/wp-content/uploads/2024/11/Ragu-Sauce_TOHD24_47366_SoniaBozzo_2.jpg?fit=700,1024"
    },
    {
      "step": 2,
      "title": "Add the garlic and deglaze",
      "text": "Add the minced garlic to the Dutch oven and cook for two minutes, stirring constantly to prevent burning. Pour in the dry red wine or beef broth, and use a wooden spoon to scrape up any browned bits from the bottom of the pan. Let the liquid cook down until reduced by half, four to five minutes.",
      "image": "https://www.tasteofhome.com/wp-content/uploads/2024/11/Ragu-Sauce_TOHD24_47366_SoniaBozzo_3.jpg?fit=700,1024"
    },
    {
      "step": 3,
      "title": "Simmer the sauce",
      "text": "Stir in the crushed tomatoes, tomato sauce, tomato paste, bay leaves, sugar, salt, thyme, oregano, cumin, nutmeg and pepper. Bring the mixture to a boil, then reduce the heat to low and simmer uncovered. Cook for 1 hour and 30 minutes to 2 hours, stirring occasionally, until the sauce thickens and the flavors meld together. Discard the bay leaves, then stir in the heavy cream, butter and minced fresh parsley. Cook for an additional two minutes. Stir in the grated Parmesan cheese, then serve the sauce over hot, cooked pasta.",
      "image": "https://www.tasteofhome.com/wp-content/uploads/2024/11/Ragu-Sauce_TOHD24_47366_SoniaBozzo_4.jpg?fit=700,1024"
    }
  ],
  "nutrition": {
    "calories": "308 calories",
    "fatContent": "19g fat (9g saturated fat)",
    "cholesterolContent": "70mg cholesterol",
    "sodiumContent": "800mg sodium",
    "carbohydrateContent": "15g carbohydrate (7g sugars, 3g fiber)",
    "proteinContent": "18g protein"
  },
  "video": {
    "name": "Homemade Ragu Sauce",
    "description": "Check out this video for how to make Homemade Ragu Sauce.",
    "thumbnailUrl": [
      "http://content.jwplatform.com/v2/media/k1ofc2O6/poster.jpg?width=720"
    ],
    "uploadDate": "2023-06-21 20:05:49",
    "contentUrl": "http://content.jwplatform.com/videos/k1ofc2O6-gTFJI986.mp4"
  },
  "reviews": [
    {
      "author": "Rebecca967",
      "datePublished": "2025-02-07",
      "reviewBody": "Better than a restaurant!  I followed the recipe exactly as written and it turned out great.  I will definitely keep this in the rotation!  Easy to make and really delicious.",
      "rating": 5
    },
    {
      "author": "Tanya189",
      "datePublished": "2022-02-04",
      "reviewBody": "I made this recipe today with a few adjustments and OMG WOW this was fantastic! I omitted step 3 - cream and butter in a pasta sauce? IDK, didn't sound right to me. I let this simmer for 4-5 hours on low heat. I added mozzarella stuff meatballs to it. Served over pasta this was insanely good. I would highly recommend making this - even if you do include step 3 lol...",
      "rating": 5
    },
    {
      "author": "Joanne0424",
      "datePublished": "2025-02-02",
      "reviewBody": "this post violated our policy",
      "rating": 1
    },
    {
      "author": "BlueCorn",
      "datePublished": "2019-01-17",
      "reviewBody": "Awesome! Makes a lot of sauce. I use pancetta instead of bacon, and I use wine not broth. My family loves it! Freezes very well.",
      "rating": 5
    },
    {
      "author": "RedQuill",
      "datePublished": "2021-03-23",
      "reviewBody": "This was very good sausce, I replaced the ground pork by using hot and spicy ground pork to kick it up a notch, and i used wine instead of broth. I passed on using the heavy cream and butter. I will make this again as it freezes really well. Best with fresh posta.",
      "rating": 5
    },
    {
      "author": "PurpleFish",
      "datePublished": "2011-11-09",
      "reviewBody": "I halfed the recipe (just wife & I). Used petite diced tomatoes (15 oz); could not find crushed in that size. I used wine. Served with warm garlic bread. Excellent flavor.",
      "rating": 5
    },
    {
      "author": "GreenCherries",
      "datePublished": "2011-08-10",
      "reviewBody": "YUM!  We left the bacon out since we didn't have any on hand, and I don't even think it's necessary.  Also doubled the oregano since we had no thyme.  So delicious!  We served with Sweet Spinach Salad, also in the recipe finder.~ Theresa",
      "rating": 5
    },
    {
      "author": "RedPalmtree",
      "datePublished": "2011-01-23",
      "reviewBody": "THis is wonderful!! Everyone that tastes it loves it too!!  Thank you!",
      "rating": 5
    },
    {
      "author": "GoldTree",
      "datePublished": "2010-03-08",
      "reviewBody": "Great recipe!",
      "rating": 5
    },
    {
      "author": "OrangeQuill",
      "datePublished": "2010-02-26",
      "reviewBody": "I have always wanted to make a homeade sauce and so I tried this one as my first and my whole family loved it.  Very good - can't wait to make spaghetti for supper again!!  Thank You!",
      "rating": 5
    },
    {
      "author": "CyanBucket",
      "datePublished": "2011-07-31",
      "reviewBody": "I LOVE this recipe, and have made it many times now.  It is rich and meaty and has many \"layers of flavor\".  I have found that it freezes well too, so I usually make a double batch.  Enjoy.  :)",
      "rating": 5
    },
    {
      "author": "GoldTrumpet",
      "datePublished": "2010-03-17",
      "reviewBody": "I made this twice so far for dinner guests and everyone raved about it. Easily feeds 4-6 people and you'll still have leftovers for another meal. A new favorite in my recipe box - thanks for an excellent homemade recipe!",
      "rating": 5
    },
    {
      "author": "PurpleToast",
      "datePublished": "2013-08-30",
      "reviewBody": "I've been making this recipe since I first saw it published. I only tried it with the red wine once and didn't care for it but I'm not a red wine drinker. I make it in double batches so I can freeze or can it to have later   It's

Time elapsed: 39.83 seconds
Memory usage: 113.59 MB -> 122.96 MB (Δ 9.37 MB)
```
Yikes, that took 39.83 seconds, and we ended up with an incomplete answer - not great. In previous posts, we were 
careful to focus only on the relevant HTML—ignoring scripts, styles, links, images, comments, and empty tags. 

Let’s apply that same cleaning approach here to reduce unnecessary tokens and keep things efficient.

The cleaning function is pretty straight-forward (comments removed for brevity):

```python
def clean_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    if soup.head:
        soup.head.decompose()
    
    for tag in soup(["script", "style", "link", "img", "svg"]):
        tag.decompose()
    
    for comment in soup.find_all(string=lambda text: isinstance(text, type(soup.Comment))):
        comment.decompose()

    for tag in soup.find_all():
        if not tag.contents or not ''.join(str(c).strip() for c in tag.contents).strip():
            tag.decompose()
    return str(soup)
```

Now lets try again, and continue with adding --clean-html=true

````bash
$ python open-ai.py recipe_00010.html --clean-html=true
Prompt token count: 17859
Continue and send to OpenAI? (y/n):
Sending prompt to OpenAI...

--- OpenAI Response ---

```json
{
  "name": "Ragu Sauce",
  "author": "Joy Manning",
  "recipe_by": "Kate Gaul, Dubuque, Iowa",
  "tested_by": "Taste of Home Test Kitchen",
  "updated_on": "Dec. 19, 2024",
  "total_time": "2 hours",
  "prep_time": "25 min",
  "cook_time": "2 hours",
  "yield": "10 servings (7-1/2 cups)",
  "ingredients": [
    "1 pound ground beef",
    "1/2 pound ground pork",
    "1/4 pound bacon strips, diced",
    "2 medium onions, chopped",
    "2 celery ribs, chopped",
    "2 small carrots, chopped",
    "4 garlic cloves, minced",
    "1 cup dry red wine or beef broth",
    "1 can (28 ounces) crushed tomatoes",
    "1 can (15 ounces) tomato sauce",
    "2 tablespoons tomato paste",
    "2 bay leaves",
    "2 teaspoons sugar",
    "1 teaspoon salt",
    "1/2 teaspoon dried thyme",
    "1/2 teaspoon dried oregano",
    "1/2 teaspoon ground cumin",
    "1/2 teaspoon nutmeg",
    "1/2 teaspoon pepper",
    "1/2 cup heavy whipping cream",
    "2 tablespoons butter",
    "2 tablespoons minced fresh parsley",
    "1/2 cup grated Parmesan cheese",
    "Hot cooked pasta"
  ],
  "directions": [
    "In a Dutch oven, cook the beef, pork, bacon, onions, celery and carrots over medium heat until meat is no longer pink; drain. Add garlic; cook 2 minutes longer. Add wine; cook until liquid is reduced by half, 4-5 minutes.",
    "Stir in the tomatoes, tomato sauce, tomato paste, bay leaves, sugar and seasonings. Bring to a boil. Reduce heat; simmer, uncovered, until thickened, stirring occasionally, 1-1/2 to 2 hours.",
    "Discard bay leaves. Add the cream, butter and parsley; cook 2 minutes longer. Stir in cheese. Serve with pasta."
  ],
  "variations": [
    "Use ground turkey instead of beef",
    "Add Italian sausage",
    "Try pancetta instead of bacon",
    "Include mushrooms",
    "Spice it up with red pepper flakes or hot peppers",
    "Make a white ragu by omitting tomatoes and increasing cream"
  ],
  "storage": {
    "refrigerate": "Up to 4 days in an airtight container",
    "freeze": "Up to 3 months in a freezer-safe container",
    "make_ahead": "Up to 3 days in advance"
  },
  "reheating": "Reheat in a saucepan over low to medium heat, stirring occasionally until heated through, adding water or broth if needed."
}
```

Time elapsed: 6.78 seconds
Memory usage: 113.05 MB -> 122.83 MB (Δ 9.78 MB)

````

which compares pretty well (although a little slower) with our supervised model—an impressive result considering we 
didn’t provide the AI with any specific examples, formatting hints, or prior task demonstrations. This approach is 
known as [zero-shot learning](https://www.ibm.com/think/topics/zero-shot-learning) or zero-shot inference, where 
the model is expected to generalize and perform a task it has never explicitly been trained or prompted to do 
before, using only its pre-learned knowledge.  Since even the super cheap `gpt-4.1-nano` is a very good model, our
results were pretty good.

This cost us less than a penny (17,984 tokens ÷ 1 million tokens × \$0.10 = \$0.0018).  Although this will add up 
over time, but we should keep it in mind when pricing the cost of running our own LLM.  Given the average number of
tokens in our colleciton of recipes, we can assume we will be able to be able to process 500 recipes for around \$1.  

To help the model produce more accurate and well-structured output, we can provide it with a concrete example of 
the desired format—an approach known as [one-shot or few-shot learning](https://www.geeksforgeeks.org/machine-learning/zero-shot-vs-one-shot-vs-few-shot-learning/). By 
including a sample input-output pair, we effectively prime the model to better understand the task and align its 
response accordingly, which significantly improves performance.

```python
    if args.few_shot:
        example = """### Example

Input: <html><body><h1>Bad Cake</h1><p>Ingredients: 1 cup of flour, 2 eggs, 1/2 cup of sugar</p><p>Directions: Mix the flour and sugar. Add eggs and stir well. Bake at 350°F for 30 minutes.</p></body></html>
Output:
{
    \"title\": \"Bad Cake\",
    \"ingredients\": [
        \"1 cup of flour\",
        \"2 eggs\",
        \"1/2 cup of sugar\"
    ],
    \"directions\": [
        \"Mix the flour and sugar.\",
        \"Add eggs and stir well.\",
        \"Bake at 350°F for 30 minutes.\"
    ]
}
"""
```

if we run with the --few-shot=true things get even better:

```bash
python open-ai.py recipe_00010.html --few-shot=true --clean-html=true
Prompt token count: 18013
Sending prompt to OpenAI...

--- OpenAI Response ---

{
  "title": "Ragu Sauce",
  "ingredients": [
    "1 pound ground beef",
    "1/2 pound ground pork",
    "1/4 pound bacon strips, diced",
    "2 medium onions, chopped",
    "2 celery ribs, chopped",
    "2 small carrots, chopped",
    "4 garlic cloves, minced",
    "1 cup dry red wine or beef broth",
    "1 can (28 ounces) crushed tomatoes",
    "1 can (15 ounces) tomato sauce",
    "2 tablespoons tomato paste",
    "2 bay leaves",
    "2 teaspoons sugar",
    "1 teaspoon salt",
    "1/2 teaspoon dried thyme",
    "1/2 teaspoon dried oregano",
    "1/2 teaspoon each ground cumin, nutmeg and pepper",
    "1/2 cup heavy whipping cream",
    "2 tablespoons butter",
    "2 tablespoons minced fresh parsley",
    "1/2 cup grated Parmesan cheese",
    "Hot cooked pasta"
  ],
  "directions": [
    "In a Dutch oven, cook the beef, pork, bacon, onions, celery and carrots over medium heat until meat is no longer pink; drain. Add garlic; cook 2 minutes longer. Add wine; cook until liquid is reduced by half, 4-5 minutes.",
    "Stir in the tomatoes, tomato sauce, tomato paste, bay leaves, sugar and seasonings. Bring to a boil. Reduce heat; simmer, uncovered, until thickened, stirring occasionally, 1-1/2 to 2 hours.",
    "Discard bay leaves. Add the cream, butter and parsley; cook 2 minutes longer. Stir in cheese. Serve with pasta."
  ]
}

Time elapsed: 5.73 seconds
Memory usage: 113.02 MB -> 122.60 MB (Δ 9.58 MB)
```

A few interesting quirks to watch for: without the example prompt, the model often wraps the JSON output in 
triple backticks. Even with the example included, this behavior can persist intermittently—so make sure your 
post-processing logic accounts for it. Performance-wise, it takes around 5 seconds per call, which is 
slower than our supervised local model: about 1.5 seconds for inference alone or roughly 3 seconds when including 
model loading time on consumer-grade hardware.

**Things to try**

* See if you can get a full result for the uncleaned HTML with zero shot inference by increasing the amount of tokens.
* What does playing with the temperature do (especially if you don't give it examples).  
* Can you figure out why do we get different token counts for the same file?
* Experiment with the [top_p](https://medium.com/@1511425435311/understanding-openais-temperature-and-top-p-parameters-in-language-models-d2066504684f) 
   parameter, what does it do?

## Ollama time

Now that we’ve confirmed it works with ChatGPT via the OpenAI API, the next step is to replicate the task locally 
using Ollama—a streamlined tool for running LLMs directly on your own machine. Start by [installing Ollama](https://ollama.com/download), and
then launch the Phi-4-mini model, which is a solid starting point among today’s capable small-scale LLMs.

First start the ollama server, making sure it has the phi4-mini LLM available.
```bash
$ ollama run phi4-mini
```
While it is running you can play with it a bit (if you haven't run an LLM in Ollama), or just exit:

```bash
>>> /bye
```

Now lets try parsing a recipe with it:

```bash
$ git checkout llm-post-1-part-2
$ python ollama.py recipe_00010.html --few-shot=true
```

And here is the result (note: this was the result but you will probably get very different results, sometimes I
get that a recipe isn't contained, etc):

```bash
python ollama.py recipe_00010.html --few-shot=true --model=phi4-mini
Prompt word count: 4658
Sending prompt to Ollama...

--- Ollama Response ---

The extracted recipe information from the provided HTML content is for "Hamburger in 30 Minutes with Grilled Vegetables" by Lila Johnson. Here are the details:

**Ingredients:**
- 1 pound ground beef
- 2 tablespoons olive oil, divided into two portions.
- Salt and pepper to taste (optional).
- Your favorite burger buns or hamburger rolls.

**Directions:** Not provided in this snippet.


Please note that there might be additional information such as preparation time which is not included here. To get the complete recipe details including instructions on how to prepare it with grilled vegetables, you would need access to Lila Johnson's full article at https://www.tasteofhome.com/article/take-the-test-tasting/hamburger-in-30-minutes-with-grilled-vegetables-by-lilajohnson.

Time elapsed: 8.47 seconds
```

It’s unclear where the hamburger recipe came from—the only reference to "hamburger" in the HTML was in the UI’s 
hamburger menu icon. Even more puzzling, the model ignored the explicit instruction to return the data in JSON 
format. This highlights how sensitive LLMs can be to configuration: without the right parameters, such as adequate 
context length, models can hallucinate wildly irrelevant outputs. (In this case, it appears Ollama’s default context 
window is only 8192 tokens.) Setting the input token size to 20,000 fixed this.

Lets try it again with a token size of 20,000 (num_ctx):

```bash
python ollama.py recipe_00010.html --few-shot=true --model=phi4-mini --num-ctx=20000
Prompt word count: 4658
Sending prompt to Ollama...

--- Ollama Response ---

{
    "title": "Homemade Ragu Sauce",
    "ingredients": [
        "1 pound ground beef",
        "1/2 pound ground pork",
        "1/4 pound bacon strips, diced",
        "2 medium onions, chopped",
        "2 celery ribs, chopped",
        "2 small carrots, chopped",
        "4 garlic cloves, minced",
        "1 cup dry red wine or beef broth",
        "1 can (28 ounces) crushed tomatoes",
        "1 can (15 ounces) tomato sauce",
        "2 tablespoons tomato paste",
        "2 bay leaves",
        "2 teaspoons sugar",
        "1 teaspoon salt",
        "1/2 teaspoon dried thyme",
        "1/2 teaspoon dried oregano",
        "1/2 teaspoon each ground cumin, nutmeg and pepper",
        "1/2 cup heavy whipping cream",
        "2 tablespoons butter",
        "2 tablespoons minced fresh parsley",
        "1/2 cup grated Parmesan cheese"
    ],
    "directions": [
        "In a Dutch oven, cook the beef, pork, bacon, onions, celery and carrots over medium heat until meat is no longer pink; drain. Add garlic; cook 2 minutes longer.",
        "Add wine; reduce by half (4-5 minutes). Stir in crushed tomatoes, tomato sauce, tomato paste, bay leaves, sugar and seasonings.",
        "Bring to a boil then simmer uncovered for about 1 hour & 30 mins - till thickened. Discard bay leaf then stir heavy cream into mixture with butter just until boiling point is reached (2 min)."
    ]
}

Time elapsed: 36.62 seconds
```

OK, that is much better.  It takes a while (compared to OpenAI running on screaming hardware) but it 
returns a pretty good result once we have increased the number of tokens to 20,000.

But wait, you might be asking, isn't the number of tokens used by the prompt 4658?  No, that is the
word count which can be very different from the token count.  In 
[Byte Pair Encoding](https://en.wikipedia.org/wiki/Byte-pair_encoding) a word can be broken up into multiple tokens 
(or a single token, or two words might form a token) but the token count
is almost always much higher than the word count.  We probably could have used the 
[TikToken](https://github.com/openai/tiktoken) library we used in the OpenAI code to better estimate the token count, 
but without knowing for certain the algorithm that phi-4 uses to encode their tokens 
(each model frequently uses slightly different variations on the BPE algorithm) this would 
be just a guess.  

**Things to try**

* There are tons of [models that ollama](https://ollama.com/search) gives you access to, try some other models.
* See if top_p and temperature make much of a difference with the various models and is there a way to increase
the speed with these parameters?
* Play around with our example, or add multiple examples - does this speed up or slow down the inference.

## Trying a Tiny LLM Out of the Box

Now lets write some python code to do what Ollama is doing.  We will take the same 
Phi-4-mini (4-bit quantized) on the same task.  

Update to the latest version

```bash
$ git checkout post-5-part-4
$ pip install -r requirements.txt
```

Note: you may have some problems getting pytorch (hereafter referred to as torch) working.
You will note I haven't pinned any of the torch libraries in requirements.txt as
the version you will want to use will vary depending on which version of Cuda you have
Ôinstalled) with Cuda. You will need to have a reasonable Nvidia GPU (or a lot of 
patience) to run these demos, you can find out about your nvidia card by running

```cmd
nvidia-smi
Fri Jul  4 08:04:55 2025       
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 560.94                 Driver Version: 560.94         CUDA Version: 12.6     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                  Driver-Model | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce RTX 4060      WDDM  |   00000000:01:00.0  On |                  N/A |
|  0%   48C    P5             N/A /  115W |    1374MiB /   8188MiB |     18%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+
```

So we can see I am currently running Cuda 12.6.  There are instructions for installing torch on
the [Getting Started](https://pytorch.org/get-started/locally/) page of their website.

For me, to install the cuda version of torch for cuda 12.6, I installed it with PIP by going

```bash
$ pip uninstall torch torchvision torchaudio
$ pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
```
There are lots resources on the web for getting torch and cuda installed properly (or just 
ask your favorite LLM though it might have problems with installing the most recent versions
as its training data may be out of date).



Once torch is installed you can the phi-4-mini locally, we are using the Hugging Face 
ransformers library to do basically what Ollama is providing for us:

```python
  bnb_config = BitsAndBytesConfig(
    # Quantization config to ensure full GPU load
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    model_id = "microsoft/Phi-4-mini-instruct"

    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=2400,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        eos_token_id=tokenizer.eos_token_id
    )
```

then we can run the code: 

```bash
python transformers-raw-inference.py recipe_00010.html
Loading checkpoint shards: [00:04<00:00,  2.23s/it] Loaded model in 7.42 sec
Generating... (prompt tokens: 18133)
Processed inference in 1175.23 sec
Extract the recipe as JSON from the webpage HTML:

...SNIP...

### Output:
```json
{
  "title": "Homemade Ragu Sauce",
  "ingredients": [
    "1 pound ground beef",
    "1/2 pound ground pork",
    "1/4 pound bacon strips, diced",
    "2 medium onions, chopped",
    "2 celery ribs, chopped",
    "2 small carrots, chopped",
    "4 garlic cloves, minced",
    "1 cup dry red wine or beef broth",
    "1 can (28 ounces) crushed tomatoes",
    "1 can (15 ounces) tomato sauce",
    "2 tablespoons tomato paste",
    "2 bay leaves",
    "2 teaspoons sugar",
    "1 teaspoon salt",
    "1/2 teaspoon dried thyme",
    "1/2 teaspoon dried oregano",
    "1/2 teaspoon each ground cumin, nutmeg and pepper",
    "1/2 cup heavy whipping cream",
    "2 tablespoons butter",
    "2 tablespoons minced fresh parsley",
    "1/2 cup grated Parmesan cheese",
    "Hot cooked pasta"
  ],
  "directions": [
    "In a Dutch oven, cook the beef, pork, bacon, onions, celery and carrots over medium heat until meat is no longer pink; drain. Add garlic; cook 2 minutes longer. Add wine; cook until liquid is reduced by half, 4-5 minutes.",
    "Stir in the tomatoes, tomato sauce, tomato paste, bay leaves, sugar and seasonings. Bring to a boil. Reduce heat; simmer, uncovered, until thickened, stirring occasionally, 1-1/2 to 2 hours.",
    "Discard bay leaves. Add the cream, butter and parsley; cook 2 minutes longer. Stir in cheese. Serve with pasta."
  ],
  "nutrition": {
    "serving": "3/4 cup",
    "calories": 308,
    "fat": {
      "total": 19,
      "saturated": 9
    },
    "cholesterol": 70,
    "sodium": 800,
    "carbohydrates": {
      "total": 15,
      "sugars": 7,
      "fiber": 3
    },
    "protein": 18
  },
  "ratings": [
    {
      "name": "14 reviews",
      "link": "#Reviews"
    }
  ],
  "author": {
    "name": "Joy Manning",
    "bio": "Joy is a James Beard Award nominee, former restaurant critic, author, recipe editor and self-taught cook. She’s currently the editor at Edible Philly, and has written for several publications including Prevention, Food &amp; Wine, Eating Well, Women’s Health, Shape, The Washington Post, Men’s Health and Allrecipes."
    },
  "reviews": [
    {
      "name": "14 reviews",
      "link": "#Reviews"
    }
  ]
}
```
Yikes—that took a while. And keep in mind, this was after I had already downloaded the model; if you’re starting from scratch, expect it to take even longer. Even though we provided the model with a sample output, it still returned extra data—like reviews and author bios—that varied slightly with each run. While we can tolerate this additional information, it raises the question: why is it taking so long in the first place?

To get a clearer picture, let’s test a smaller HTML file with the OpenAI model. For context, the larger recipe\_00010.html—at 18,013 tokens—took 4.97 seconds to process on OpenAI’s fastest and most compact model.

```bash
python open-ai.py recipe_00092.html --few-shot=true 
Prompt token count: 1485
Continue and send to OpenAI? (y/n): y
Sending prompt to OpenAI...

--- OpenAI Response ---

{
  "title": "Apple Tuna Salad Sandwich",
  "ingredients": [
    "2 6-oz. cans unsalted tuna or chicken in water, drained",
    "1 medium apple, chopped",
    "1 celery stalk, chopped",
    "¼ cup low-fat vanilla or plain yogurt",
    "1 tsp. prepared mustard",
    "1 tsp. honey",
    "6 slices whole wheat bread"
  ],
  "directions": [
    "Combine and mix the tuna, apple, celery, yogurt, mustard and honey.",
    "When ready to serve, spread the mixture on a slice of bread and top with your extra veggies and another slice of bread."
  ]
}

Time elapsed: 1.72 seconds
```

I ran a few benchmarks and found that a minimal 8-token prompt (like "what is 4 \* 4") typically completes in about 1 second. So when comparing the 1,485-token input against the 18,013-token recipe, we see a roughly 3.2-second delta in inference time on OpenAI’s infrastructure. Running that same smaller prompt through the Phi model locally clocked in at 92 seconds—still not fast, but considerably better than the 1,175 seconds (nearly 20 minutes!) required for the longer input. Clearly, token count plays a major role in performance. Most libraries, including Ollama, enforce an 8,000–10,000 token limit by default—likely for good reason, as we’ll explore in the next section.

The obvious question is: why is the Python script using Hugging Face’s transformers library so much slower than Ollama—sometimes by a factor of 30? The short answer is that transformers isn't optimized for large context windows out of the box. To make matters worse, I was running this on Windows, which limited my ability to enable advanced optimizations like [FlashAttention2](https://huggingface.co/docs/transformers/v4.53.1/perf_infer_gpu_one#flashattention).

I eventually got FlashAttention working through [WSL](https://learn.microsoft.com/en-us/windows/wsl/about), and also experimented with [vLLM](https://docs.vllm.ai/en/stable/), which is designed for high-throughput inference. Unfortunately, vLLM only works on Linux/WSL and still didn’t come close to Ollama’s performance. I suspect the overhead of running inside WSL negated many of the potential gains of optimizations like FlashAttention and [PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html).


### So how does Ollama manage to perform so efficiently?

1. Uses [llama.cpp](https://github.com/ggml-org/llama.cpp) as its backend, leveraging a high-performance C++ implementation instead of Python for maximum efficiency. Originally [created](https://github.com/ggml-org/llama.cpp/blob/775328064e69db1ebd7e19ccb59d2a7fa6142470/README.md) to run LLaMA models on MacBooks without GPUs, it takes full advantage of SIMD instructions, optimized memory access patterns, and multithreaded execution to deliver exceptional speed on consumer hardware.
2. Defaults to lower-precision arithmetic (such as 4-bit or 8-bit quantization), significantly reducing memory footprint and computation time while preserving model accuracy in most use cases.
3. Adopts the [GGUF](https://huggingface.co/docs/hub/en/gguf) file format, a lightweight and efficient storage layout designed specifically to maximize performance and compatibility on consumer-grade hardware.

Hugging Face Transformers are designed with research flexibility in mind, targeting high-performance environments more than consumer-grade hardware. While performance matters, it isn’t their primary design goal. I’m confident that with enough time spent tuning on a Linux setup (rather than on Windows or WSL), I could get vLLM or Transformers to approach Ollama-level efficiency. But that wasn’t the focus of this experiment—and frankly, I ended up spending more time than I should have going down the rabbit hole just trying to get vLLM installed and running in the first place.

### The Elephant in the Room

The inherent problem of parsing recipes from web pages lies in the underlying algorithm for the
[Self-Attention](https://en.wikipedia.org/wiki/Attention_Is_All_You_Need) mechanism of LLMs. As detailed in the seminal paper [Attention Is All You Need](https://arxiv.org/html/1706.03762v7)—which as an asside is suprisingly accessible even without a deep understanding of Math or Data Science—we can see in [Table 1](https://arxiv.org/html/1706.03762v7#S4.T1) that the complexity of Self-Attention is O(N² × d), where N is
the number of tokens in our prompt.&#x20;

&#x20;If you are familiar with [BigO notation](https://en.wikipedia.org/wiki/Big_O_notation) you will know that any algorithm that is
[quadratic or polynomial](https://en.wikipedia.org/wiki/Time_complexity#Table_of_common_time_complexities)  like this scale poorly. As the token count increases, the computational cost rises dramatically:

* 1,000 tokens = \~1,000,000 attention pairs
* 4,000 tokens = \~16,000,000 attention pairs
* 18,000 tokens = \~324,000,000 attention pairs

This exponential growth explains why large prompts are so slow to process and require so much memory.

### Possibilities To Address Large Input Prompts

So how can we mitigate the growing time and memory demands of Self-Attention with large inputs? Here are a few practical strategies to consider:

1. We can optimize the input by identifying only the relevant portions of the HTML and feeding those to the LLM. However, as we refine the clean\_html function, it will inevitably grow in complexity. At some point, we may find ourselves reaching for another LLM—or even a supervised model—to help extract cleaner input, effectively circling back to the original problem of how to identify a recipe in HTML.
2. We can try using a different attention mechanism. While [Self-Attention](https://www.ibm.com/think/topics/self-attention) is the most common mechanism, it struggles with large input sizes. To address this, several alternatives have been developed in recent years:
    * [Cross Attention](https://www.geeksforgeeks.org/nlp/cross-attention-mechanism-in-transformers/): Typically used in translation and image tasks, where the encoder attends to both input and output sequences. However, it's less applicable for recipe extraction.
    * [Longformer](https://arxiv.org/pdf/2004.05150), [Big Bird](https://arxiv.org/pdf/2007.14062), [Performer](https://arxiv.org/pdf/2009.14794), and [Linear Transformers](https://arxiv.org/pdf/2006.16236): Each introduces methods to reduce the quadratic scaling of attention, making them more efficient for longer inputs.
3. We could break the input text into smaller, more manageable chunks and process each one independently through the LLM. To make this work, the prompt would need to be adapted to return nothing unless it contains titles, ingredients, or directions. Once processed, the individual results could be deduplicated and merged. One enhancement to this approach is using a[ ](https://www.geeksforgeeks.org/dsa/window-sliding-technique/)[sliding window](https://www.geeksforgeeks.org/dsa/window-sliding-technique/)  instead of fixed-size chunks, which helps preserve context across overlaps. Another possible refinement is to carry forward the result of each chunk as part of the prompt for the next, giving the model continuity between passes..
4. Use a Retrieval-Augmented Generation (RAG) strategy: split the HTML document into smaller chunks (e.g., 512 tokens), embed each chunk using an embedding model, and retrieve the most relevant segments based on a structured query. This approach allows the LLM to focus only on semantically meaningful parts of the document when generating structured output—such as a recipe—rather than processing the entire HTML at once.

While retrieval-augmented generation (RAG) seemed like a promising way to work around the token limits of small models, in practice it didn’t offer much benefit in this case. Using a SentenceTransformer embedder, I expected to extract a relevant subset of text from the HTML page based on the prompt query. But since the embedder wasn’t trained with any awareness of HTML structure or recipe semantics, it failed to isolate useful regions. The end result? The retrieved text was roughly as long and just as noisy as the original HTML chunk I would have included in the prompt anyway.

That’s not to say RAG is inherently flawed—but domain context matters a lot. When your embedder doesn’t “understand” what it’s retrieving from, the whole point of the architecture breaks down. Perhaps with a fine-tuned embedder or a structured pre-processor that respects HTML tags or common recipe patterns, the system could have done a better job. Similarly, I didn’t experiment with alternative attention mechanisms or document splitting strategies, both of which could help the base model focus better on relevant information.

So where does that leave us? If you have high-quality labeled data—and time to build on it—supervised learning still provides the best control and reliability. You can iterate, diagnose failures, and tailor outputs tightly to your task. But not everyone has a clean dataset, nor the appetite for annotation. That’s where SaaS solutions shine: a few API calls can get you results that are “good enough,” without the overhead of training pipelines or model debugging. When time is scarce or domain specificity isn’t critical, they’re often the practical choice.

Looking ahead, there’s still room for improvement. Training or fine-tuning embedders on domain-specific corpora, adding structural hints to your inputs (like visual cues from rendered HTML), or even creating hybrid pipelines that combine RAG with light supervision are all worth exploring. LLMs are flexible tools, but to get the most out of them—especially in edge cases like recipe extraction—you still need to engineer the right fit between model, data, and task.


