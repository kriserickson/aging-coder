---
layout: post
category: 
title: "Can a Tiny LLM Beat A Supervised Model?"
imagefeature:
description: 
draft: true
tags: []
---
## 1. Introduction

Recently, I was asked a question that I couldn't stop thinking about:

> Also I am super curious, about another experiment that I have no idea about, but seems like the general direction of how things are going: Can we fine-tune / distill a very small LLM to do better than this?

That question sits at the center of this post.

Over the last few posts, I’ve built and iteratively refined a supervised learning model that turns web recipes into 
structured JSON: title, ingredients, directions. It's efficient, accurate, and tiny. But we're now in the age of 
LLMs—many of them small enough to run on a single GPU. So, naturally, the next experiment is: what happens when we try 
the same task using an LLM like Phi-3, Gemma, or TinyLlama? Can we teach it to parse recipes better—or at least as
well—as our custom-built classifier?

This post walks through that question: how to test it, what works, what fails, and whether tiny LLMs can match the 
accuracy and precision of a purpose-built supervised pipeline.

---

### What We’ve Built Already

The posts went through many facets of supervised learning:

* In [first article](/posts/2025-06-13-experiments-in-supervised-learning) I introduced the supervised learning project,
described how real-world, human-labeled recipe data was collected from a decade-old recipe app, and walked through 
setting up the environment and dataset for future model training.
* [The second](/posts/2025-06-14-experiments-in-supervised-learning-part-2) I examplained how to build and train the 
first machine learning model to classify recipe blocks, analyzed its initial shortcomings.  I also explained the 
feature extraction, pipeline, and classification evaluation process in detail, highlighting where the basic model 
struggled and what needed improvement. 
* [The third blog](/posts/2025-06-23-experiments-in-supervised-learning-part-3) I systematically improved model accuracy through feature engineering, parallelized data loading, 
memory and data cleanup, better labeling with fuzzy matching, and dataset balancing, ultimately boosting accuracy 
from 65% to over 95% and producing much cleaner outputs.
* In [the final](/posts/2025-06-28-experiments-in-supervised-learning-part-4) compared and tuned a variety of advanced 
classifiers, optimized for both accuracy and model size, introduced post-processing and deployment as a web API, and 
provided practical tips for productionizing the entire recipe extraction pipeline.

The best accuracy achieved: **96%**, with **HistGradientBoostingClassifier**, in **under 2MB**.  So lets see how that
compares with an LLM.

### Testing the easy way

We can probably assume that OpenAI's model can easily handle parsing the recipe, so lets test that with a quick
little script and see how much it would cost us to run on the least expensive OpenAI model.

```bash
$ git clone git@github.com:kriserickson/recipe-parser.git
```

if you haven't already, and then checkout this post and install the new requirements (there are a bunch)

```bash
$ git checkout post-5-part-1
$ pip install -r requirements.txt 
```

Also, if you want to follow along with this part of the tutorial you will have to create an `.env` file in the 
Project directory that looks like:

```dotenv
# Add your OpenAI API key here
OPENAI_API_KEY=sk-REPLACE_ME
```

Now lets run our simple open-ai model -- yes it is probably much more complicated than it needs to be, but having a lot
of options is pretty useful.  One of the things you always want to do to save yourself a potentially costly OpenAI
(or any other AI provider) bill is to check the number of tokens you are sending (and the max tokens you are willing)
to pay for.  For OpenAi this is particularly easy since they have provided the 
[TikToken](https://pypi.org/project/tiktoken/#description) library for tokenization which allows us to get a very
good estimate in how many input tokens we are going to use.

```python
def count_tokens(token_prompt: str, token_model: str) -> int:
    try:
        enc = tiktoken.encoding_for_model(token_model)
    except Exception:
        enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(token_prompt))
```

with this we can create our prompt, and check how many input tokens it is going to use before we send it to OpenAi.

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

```bash
$ cd llm-src
$ python open-ai.py recipe_00010.html
Prompt token count: 94394
Continue and send to OpenAI? (y/n):
```

Yikes, that seems like a lot of tokens to send for a single recipe.  In the previous posts we only paid attention 
to the relevent HTML, all the scripts, style, links, images, comments and empty blocks can be stripped away.  Let's
do that...

```bash
$ git checkout post-5-part-2
```

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

Now lets try again, and continue with 

````bash
$ python open-ai.py recipe_00010.html
Prompt token count: 18013
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
````
which compares pretty well with our Supervised model, which is pretty amazing since we didn't give the AI anything to go on
(this is called zero-shot inference).  

```bash
$ python predict.py ../data/html_pages/recipe_00010.html 
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

```

This cost us less than a penny (17,984 tokens / 1 million tokens * 10 cents, which equals 0.17 cents).  Obviously this will
add up over time, but we should keep it in mind when pricing the cost of running our own LLM.  

We can give the model a little more to go on (few-shot inference) which is basically just the format we need back and
things get even better:

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

````bash
python open-ai.py recipe_00010.html --few-shot=true
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

Time elapsed: 4.97 seconds
````

A few interesting things to note --- one, without the example it wraps the JSON in triple ticks (in fact running it a 
bunch of times sometimes with the example it still wraps the JSON in triple ticks but mostly it doesn't so be prepared
to handle that).  It takes a while, almost 5 seconds.  That is much slower than our supervised local model running
on consumer grade hardware (it takes about 1.5 seconds to do the inference on our local supervised model and 3 seconds
if you include loading the model).

## Ollama time

OK, so we got it working on ChatGPT with their AI.  Lets see if we can get it working locally with Ollama.  First 
install [Ollama](https://ollama.com/download) and then start the phi4-mini model (it seems like a good place to 
start with a modern mini model).

```bash
$ ollama run phi4-mini
$ git checkout post-5-part-3
$ python ollama.py recipe_00010.html --few-shot=true
```

BTW, I struggled with the defaults of this, as the first few attempts produced very bad results (it basically
made up recipes) until I changed `"num_ctx": 20000,` - which is the number of input tokens allowed.  I.e. here is 
script with num_ctx not set:

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

I have no idea where the Hamburger recipe was hallucinated from, the only mention of hamburgers in html file is 
the hamburger menu for the UI, also it completely ignored the request to return the data has JSON.  I guess it goes to 
show you that parameters are very important and that you can get very strange results from an LLM if it doesn't have
the correct information (it appears the default context size for ollama is 8192).

Setting the input token size to 20,000 fixed this.

```bash
python ollama.py recipe_00010.html --few-shot=true --model=phi4-mini
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

OK, that is much better.  It takes a while (compared to OpenAI running on screaming hardware) but it returns
a pretty good result once we have increased the number of tokens to 20,000.

But wait, you might be asking, isn't the number of tokens used by the prompt 4658?  No, that is the word count which 
can be very different from the token count.  In [Byte Pair Encoding](https://en.wikipedia.org/wiki/Byte-pair_encoding)
a word can be broken up into multiple tokens (or a single token, or two words might form a token) but the token count
is almost always much higher than the word count.  We probably could have used the 
[TikToken](https://github.com/openai/tiktoken) library we used in the OpenAI code to better estimate the token count, 
but without knowing for certain the algorithm that phi-4 uses to encode their tokens (each model frequently uses
slightly different variations on the BPE algorithm) this would be just a guess.  

## Trying a Tiny LLM Out of the Box

Now lets write some python code to do what Ollama is doing.  We will take the same Phi-4-mini (4-bit quantized) on the 
same task.  

Update to the latest version

```bash
$ git checkout post-5-part-4
$ pip install -r requirements.txt
```

Note: you may have some problems getting pytorch (hereafter referred to as torch) working.
You will note I haven't pinned any of the torch libraries in requirements.txt as
the version you will want to use will vary depending on which version of Cuda you have installed) with Cuda.  
You will need to have a reasonable Nvidia GPU (or a lot of patience) to run these demos, you can find out about your 
nvidia card by running

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
There are lots resources on the web for getting torch and cuda installed properly (or just ask your favorite
LLM though it might have problems with installing the most recent versions as its training data may be out
of date).

Once torch is installed you can the phi-4-mini locally, we are using the Hugging Face transformers library to
do basically what Ollama is providing for us:

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
Yikes, that took a while (and since I had already downloaded the model if you hadn't downloaded the model it would 
take a while longer).  And even though we gave it some sample output, it gave us some superfluous data (interesting
every time you run it you get the same title, ingredients and directions but slightly different collection of 
reviews, author, etc.).  We can live with the extra data, but lets look into why it is taking so darn long.

First of all, lets try using a smaller html page against the open ai model (remember the 18,013 token recipe_00010.html took
4.97 seconds against the fastest, smallest, LLM from OpenAI).

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
I did some tests and an 8 token prompt (what is 4 * 4) averages around 1 second, 
we can see that different between 1,485 tokens and 18,013 is about 3.2 seconds.  If we run the smaller recipe_00092.html
on our phi model locally it also is much faster (92 seconds -- which isn't blazing but is 1080 seconds or 18 minutes 
faster than the 18133 token recipe).  We know that the libraries (and ollama) put a default 8,000-10,000 limit on
token input - so there must be a reason for that - but we will get back to the underlying problem in the next section.   

The question for now is why is python script using the transformers 
library is so slow but ollama is, well not fast, not nearly as slow at 30 times faster. Why does the 
transformers library take so long?  Well, it isn't optimized for large contexts, and 
because I was running this on windows (rather than linux) I couldn't get 
[FlashAttention2](https://huggingface.co/docs/transformers/v4.53.1/perf_infer_gpu_one#flashattention) working.  I did
get FlashAttention working by installing it in [WSL](https://learn.microsoft.com/en-us/windows/wsl/about).  Also I
tried [vLLM](https://docs.vllm.ai/en/stable/) -- which also only works on Linux or WSL but it didn't achieve close
to Ollama speeds either.  However, I believe that overhead of running on WSL removed a lot of the inherent benifits 
of FlashAttention or [PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html) as the speed increase on WSL
was almost non-existent.

So how does ollama do it so well?

1) Uses [llama.cpp](https://github.com/ggml-org/llama.cpp) as a backend, which is written in C++ rather than Python for optimum efficiency (originally 
    [created](https://github.com/ggml-org/llama.cpp/blob/775328064e69db1ebd7e19ccb59d2a7fa6142470/README.md) 
    as a way to run Llama models on a MacBook without requiring GPUs), taking advantage of SIMD instructions, cache locality, and efficient threading.
2) Uses lower precision by default, this dramatically reduces memory usage and computation cost, with minimal loss of quality.
3) Output tokens are generated and streamed as soon as they’re ready, not waiting for the whole sequence.
4) Uses the [GGUF](https://huggingface.co/docs/hub/en/gguf) file format which is optimized for running on consumer hardware.

Whereas HuggingFace transformers are written to be used for research on very powerful machines, and although speed is
always a concern it is not the primary goal of the hugging face transformers model.  I am sure that I was running
under linux and spent a lot of time tuning I could get vLLM or even transformers to a state where they were close
to ollama performance but that was not the goal of this inquery (in fact I feel like I spent too much time
going down the rabbit hole trying to get vLLM to install and run in the first place).

### The Elephant in the Room

The inherent problem of parsing recipes from web pages lies in the underlying algorithm for the 
[Self-Attention](https://en.wikipedia.org/wiki/Attention_Is_All_You_Need) mechanism of LLMs. In the seminal 
paper [Attention Is All You Need](https://arxiv.org/html/1706.03762v7)—which is
shockingly readable even without a deep understanding of Math or Data Science—we can see in
[Table 1](https://arxiv.org/html/1706.03762v7#S4.T1) that the complexity of Self-Attention is O(N² × d), where N is
the number of tokens in our prompt.  If you know anything about
[BigO notation](https://en.wikipedia.org/wiki/Big_O_notation) you will know that any algorithm that is
[quadratic or polynomial](https://en.wikipedia.org/wiki/Time_complexity#Table_of_common_time_complexities) is going
to blow up as the size of the input increases.  Each time the input size doubles, the time and memory needed for the
attention computations doubles.  For example:
- 1,000 tokens = ~1,000,000 attention pairs
- 4,000 tokens = ~16,000,000 attention pairs
- 18,000 tokens = ~324,000,000 attention pairs

How can we address this?  There are a few possibliities to handle the problem of exploding time and memory for Self 
Attention. 

1) We can improve the input by figuring out what is relevent in the HTML and only feeding that to the LLM.  However, 
our clean_html function will start to grow in complexity and eventually we will start thinking we need an LLM or
supervised model extract the cleaner HTML and then we find ourselves in the same problem.

2) We can try using a different attention mechanism (more on that below).

3) We could split the input text into more manageable chunks and pass each chunk into the LLM, and then combine the
results at the end (obviously your prompt will be very different, telling it to return nothing if there are no
titles, ingredients or instructions).  At the end you collect results from all chunks, deduplicate, and merge.  One
potential improvement on this is that instead of splitting into discrete chunks you use a 
[sliding window](https://www.geeksforgeeks.org/dsa/window-sliding-technique/) so that any overlap between chunks
is not lost. A possible improvement to this might be passing the result of each input to the LLM so that it knows
about the previous results.  

4) Use RAG to split the document into chunks (smallish, 512 Tokens).  Embed each chunk into an embedding model. Generate
our structured output by using both a query and the retrieved content from our embeddings.  Since we are trying to
pull a structured recipe from an HTML  

While [Self Attention](https://www.ibm.com/think/topics/self-attention) 
is the most common attention mechanism, realizing that its underlying weakness was large inputs other mechanisms have 
been developed over the past few years.  Those include 
[Cross Attention](https://www.geeksforgeeks.org/nlp/cross-attention-mechanism-in-transformers/) where the encoder 
has access to the source input as well as the result output which is used in language translation models as well as 
image classification but would not serve us for Recipe Extaction. 
[Longformer](https://arxiv.org/pdf/2004.05150), [Big Bird](https://arxiv.org/pdf/2007.14062), 
[Performer](https://arxiv.org/pdf/2009.14794) and [Linear Transformers](https://arxiv.org/pdf/2006.16236). 



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




