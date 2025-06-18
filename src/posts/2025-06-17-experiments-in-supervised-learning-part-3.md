---
layout: post
category: AI 
title: "Experiments In Supervised Learning Part 3"
imagefeature:
description: 
draft: true
tags: ["Programming", "ML", "Supervised Learning", "AI"]
---


So, running on a recipe has produced terrible results.  Ingredients includes things like "Pin" and "Tweet" and a lot of ingredients are doubled.  And directions include things like "This site uses Akismet to reduce spam.", "Sign in".  It includes too many ingredients and too many directions (there are 10 ingredients for the recipe and 5 directions). Another problem is that ingredients are broken between 2 lines consistently ("2 tablespoons", "finely chopped parsley").  The good news is that all the ingredients are in the ingredient array and all the directions are in the direction array but so many false positives.  

First lets get our project to the expected state.  Since we are going to do a bunch of small changes in this article, I
have created tags for each little part.   Checkout the tag if you want to follow along:

```bash
git checkout post-3-part-1
```

Now, we learned last post that we extract features that we give to trainer when training the model.  Our features were pretty
generic so lets see if in step one of our training we can improve the features.  Lets add the number of digits in the text ("num_digits")
whether the text contains a known unit like tablespoons, or millimeters, etc ("contains_unit"), the number of commas
in the text ("comma_count"), the number of periods in the text ("dot_count"), whether the tag is a heading ("is_heading")
and if it is a list item ("is_list_item").  The assumptions we are making is that ingredients are more likely to
have a unit, a digit, and is probably a list item.  Directions are more likely to contain commas, and perhaps more than 1
period.  These names, BTW, are for us, the modelers of the data - they don't mean anything to the statistical models.  In
fact, only their positions are stored (so make sure that when extracting features the positions don't change).

```python
def extract_features(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    
    return [
        {
            "tag": (tag := el["tag"]),
            "depth": el["depth"],
            "text_len": len(elem_text := el.get("text", "")),
            "starts_with_digit": elem_text[0].isdigit(),
            "parent_tag": el.get("parent_tag", "None"),
            "raw": elem_text,
            "num_digits": sum(ch.isdigit() for ch in elem_text),
            "contains_unit": int(any(re.search(r"\b" + re.escape(unit) + r"\b", elem_text.lower()) for unit in units)),
            "comma_count": elem_text.count(","),
            "dot_count": elem_text.count("."),
            "is_heading": int(tag in ["h1", "h2", "h3", "h4", "h5", "h6"]),
            "is_list_item": int(tag == "li")
        }
        for el in elements
    ]
```

And now we run the training data again (this is going to a become refrain) and look at the classification report:

```text
               precision    recall  f1-score   support
               
   direction      0.17      0.70      0.27      1941
  ingredient      0.27      0.82      0.41      4589
        none      0.99      0.68      0.81     60873
       title      0.07      0.90      0.14       279
               
    accuracy                          0.69     67682
   macro avg      0.37      0.77      0.40     67682
weighted avg      0.91      0.69      0.76     67682
```

if we compare this with the report from last time we can see that things are slightly better:

```text
              precision    recall  f1-score   support

   direction       0.18      0.68      0.29      1889
  ingredient       0.24      0.85      0.38      4667
        none       0.99      0.66      0.79     60884
       title       0.07      0.86      0.12       242

    accuracy                           0.68     67682
   macro avg       0.37      0.76      0.39     67682
weighted avg       0.91      0.68      0.75     67682
```

For accuracy .69 is better than .68.  Not a lot better, but we have improved on ingredients, title and none -- and
(directions have gotten slightly worse).  We added a bunch of features, lets figure out which ones actually helped
us.   Let's try running it without the is_header and is_list_item features.  But first, loading even a subset (1000) of the
items is taking a while (over 50s on my machine, and another 20s or so to train and analyze the model.  
Sklearn is automatically parallelizing the training (fit)) and prediction for us so we can't really speed up model creation, 
but reading 1000 json and html files is super-paralelizable so lets change the load_labeled_blocks
to be parallilized.  

For those following along, check out the next step in git:

```bash
git checkout post-3-part-2
```

To paralalize  we create (or more to the point, extract from our old load_labeled_blocks), the function
to get the elements from the file:


```python
def process_pair(json_file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    base = json_file_path.stem
    html_file = HTML_DIR / f"{base}.html"
    if not html_file.exists():
        return [], []
    label_data = json.loads(json_file_path.read_text(encoding="utf-8"))
    html = html_file.read_text(encoding="utf-8")
    elements = parse_html(html)
    X, y = [], []
    for el in elements:
        label = label_element(el["text"], label_data)
        X.append(el)
        y.append(label)
    return X, y
```

Next, we get a ProcessPoolExecutor, and submit each of the json_file to it.  This returns us an array of futures (promises, if
you are used to JavaScript), as each future is completed, we get the result and extend our blocks and our labels (extend 
flattens the array as it merges, the old code appended each block one at a time as it was processing the file).

```python
def load_labeled_blocks(limit=None) -> Tuple[List[Dict[str, Any]], List[str]]:
    start = time()
    X, y = [], []
    json_files = sorted(LABELS_DIR.glob("recipe_*.json"))
    if limit is not None:
        json_files = json_files[:limit]
    total = len(json_files)

    with ProcessPoolExecutor() as executor:
        futures = [executor.submit(process_pair, f) for f in json_files]
        for i, future in enumerate(as_completed(futures), 1):
            Xi, yi = future.result()
            X.extend(Xi)
            y.extend(yi)
            if i % 100 == 0 or i == total:
                percent = (i / total) * 100
                print(f"Processed {i}/{total} files ({percent:.1f}%)")

    print(f"Block loading time: {time() - start:.2f}s")
    return X, y
```

If we run train now, we can see that loading the files (at least on my computer) takes about 1/10th the time, and we 
can also see that "is_header" and "is_list_item" is basically doing nothing.

```text
              precision    recall  f1-score   support

   direction       0.16      0.66      0.26      1933
  ingredient       0.27      0.83      0.41      4621
        none       0.99      0.69      0.81     60871
       title       0.07      0.88      0.13       257

    accuracy                           0.70     67682
   macro avg       0.37      0.77      0.40     67682
weighted avg       0.91      0.70      0.76     67682
```

Interpretation

direction: Slight improvement in f1 (0.27 → 0.26) with is_heading and is_list_item.

ingredient, none: No change.

title: Slight improvement with features (0.14 → 0.13).

accuracy: Slightly higher without the extra features (0.70 vs. 0.69), but the difference is minimal.

Overall macro and weighted F1: Unchanged.

What does this mean?

Adding is_heading and is_list_item had only a very minor effect—slight bump in direction and title f1, but a tiny drop in accuracy (possibly just noise).

No evidence of harm: Performance didn't decrease.

No major gain: These features didn’t provide a significant improvement, but also didn’t hurt. Sometimes, features like this help only in more nuanced situations or with more data.

###

Next, lets assume that ingredients do have units, and they also have quantity and sometimes quantity is a written number, sometimes it is a special character like ½ or ¼ and sometimes it is a plain number.  
So lets a a feature for that, but first check out the next part tag.

```bash
git checkout-part-3-part-3
```

So to our feature extraction dictionary we add:

```python
"contains_quantity_number": int(bool(re.search(r"\d+|\d+/\d+|½|¼|¾|⅓|⅔\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b", elem_text))),
```

and run the test again.  

```text
              precision    recall  f1-score   support

   direction       0.17      0.67      0.26      1990
  ingredient       0.29      0.82      0.42      4634
        none       0.98      0.69      0.81     60795
       title       0.06      0.85      0.12       263

    accuracy                           0.70     67682
   macro avg       0.37      0.76      0.41     67682
weighted avg       0.91      0.70      0.77     67682
```

It is getting slightly better.  But these are all pretty small wins (though all wins are important in tuning).  However, I
feel that we have to now think how recipes are structured on a web page.  The title comes first, then the ingredients (usually after
and ingredients header) and then directions (usually after the directions header).  So, currently we aren't putting any
weight on things like where on the page the elements are, or have we seen an ingredient header yet.  Unfortunately, since we
are extracting the features in bulk for all recipes pages we currently don't know their position on the page.  
We are going to have to either store more data with the X_raw or extract the features in the new process_pair function.
I think maintaining all the Beautiful Soup elements may be expensive so lets also add some memory information to our script.

```bash
git checkout-part-3-part-4
```

We have conditionally added memory tracing (getting the data from the processes memory info as well as using tracemalloc).
We do this conditionally as tracing the memory slows down the process considerably.

```python
    if memory:
        import psutil
        
        def get_memory_usage():
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024 / 1024  # MB

        tracemalloc.start()
        start_memory = get_memory_usage()
```

At the end of the program we dump out our usage.  

```python
    if memory:
        # Get peak memory
        current, peak = tracemalloc.get_traced_memory()
        end_memory = get_memory_usage()
        print(f"Peak memory from tracemalloc: {peak / 1024 / 1024:.2f} MB")
        print(f"Memory usage from psutil: {end_memory:.2f} MB")
        print(f"Memory increase: {end_memory - start_memory:.2f} MB")
```

If you run the training again, you can see that we use about 755MB of memory if we store all the Beautiful Soup Elements in
a List of Dictionaries 

```text
Total time: 100.56s
Peak memory from tracemalloc: 636.45 MB
Memory usage from psutil: 906.82 MB
Memory increase: 755.74 MB
```

But if we move the parsing into the load_labeled_blocks (well actually the process_pair) function

```bash
git checkout-part-3-part-5
```

```python
def process_pair(json_file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
#...(SNIP)...
    for el in elements:
        label = label_element(el["text"], label_data)
        features = extract_features(el)
```

we also have to change our predict.py to handle the fact that extract_features now returns a single Dictionary
of features from a single element rather than a List of Dictionary from a List of elements.

```python
def extract_structured_data(html_path: string):
    html = Path(html_path).read_text(encoding="utf-8")
    elements = parse_html(html)
    all_features = []
    for el in elements:
        features = extract_features(el)
        all_features.append(features)

    data = preprocess_data(all_features)
```

Again a run of the tracing shows that we save a bunch of memory 

```text
️Total time: 43.95s
Peak memory from tracemalloc: 575.76 MB
Memory usage from psutil: 812.58 MB
Memory increase: 663.00 MB
```

We also get a massive speed up by parallelizing the feature extraction, so this is really a win-win-win and now
we can take advantage of knowing the where in the document each element is.  

Lets update our process_pair function again to take the location on the page that the element is and see how that 
improves things.  First lets pass in which element on the page each element is (its index) and its position on the
page (its index divided by the number of elements on the page).

```bash
git checkout-part-3-part-6
```

```python
def process_file_pair(json_file: Path, html_dir: Path) -> list[tuple[dict, str]]:
#...(SNIP)...
    for idx, el in enumerate(elements):
        elem_text = el.get("text", "").strip()

        label = label_element(elem_text, label_data)
        features = extract_features(el, elem_text, elements, idx)
        features_labels.append((features, label))
```

and

```python    
    "element_index": idx,
    "position_ratio": idx / max(1, len(elements) - 1),    
```

and running it gives us a much better result.  

```text
              precision    recall  f1-score   support

   direction       0.18      0.67      0.28      2014
  ingredient       0.31      0.83      0.45      4735
        none       0.99      0.73      0.84     60697
       title       0.08      0.93      0.14       236

    accuracy                           0.73     67682
   macro avg       0.39      0.79      0.43     67682
weighted avg       0.91      0.73      0.79     67682
```

All the F1 scores are better and there are no regressions so this is another win.   If we look at our data though,
it is still a little disappointing as there are way too many false positives **and** our ingredients are split
in half.

```json
{
  "title": "Maryland Crab Cakes",
  "ingredients": [
    "Pin",
    "Tweet",
    ",",
    "Success!",
    "(1116)",
    "Servings:",
    "Ingredients",
    "For the Crab Cakes",
    "2",
    "large eggs",
    "2½ tablespoons",
    "mayonnaise, best quality such as Hellmann's or Duke's",
    "1½ teaspoons",
    "Dijon mustard",
    "1 teaspoon",
    "Worcestershire sauce",
    "1 teaspoon",
    "Old Bay seasoning",
    [SNIP],
    "Pin",
    "Tweet",
    "Deviled Eggs",
    "Chicken Marsala"
  ],
  "directions": [
    [SNIP]
  ]
}
```

Let's solve the problem of split ingredients.   Let's dig into some of the html, and see what our ingredients look like (this is from recipe_000027.html):

```html
 <ul class="ingredient-list svelte-ar8gac">
    <li style="display: contents">
        <span class="ingredient-quantity svelte-ar8gac"><!-- HTML_TAG_START -->3 <!-- HTML_TAG_END --></span>
        <span class="ingredient-text svelte-ar8gac">
            <!-- HTML_TAG_START -->  tablespoons    <a href="/about/vinegar-680">white vinegar</a><!-- HTML_TAG_END -->
        </span>
    </li>
    <li style="display: contents">
        <span class="ingredient-quantity svelte-ar8gac"><!-- HTML_TAG_START -->3 <!-- HTML_TAG_END --></span>
        <span class="ingredient-text svelte-ar8gac">
            <!-- HTML_TAG_START -->  tablespoons    <a href="/about/soy-sauce-473">soy sauce</a><!-- HTML_TAG_END -->
        </span>
    </li>
```

And if we look at a bunch more, we can see that ingredients frequently spread across several elements (spans in the example), and
if we set a breakpoint when we are doing the labelling, we can see that our ingredients are spread over multiple blocks:

<img alt="Debugging Blocks" src="/img/supervised/debug-labels.webp" style="border: 1px solid #000; margin: 0 10px 10px 0">

