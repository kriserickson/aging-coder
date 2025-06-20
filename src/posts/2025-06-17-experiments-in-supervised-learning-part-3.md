---
layout: post
category: AI 
title: "Experiments in Supervised Learning Part 3"
imagefeature:
description: 
draft: true
tags: ["Programming", "ML", "Supervised Learning", "AI"]
---

In the [previous post](/posts/2025-06-14-experiments-in-supervised-learning-part-2) we built a simple model 
to extract recipe data from a web page. But when we ran it on an actual recipe, the results were pretty rough: 
it achieved just 65% accuracy, mislabeled social buttons like “Pin” and “Tweet” as ingredients, and frequently 
duplicated ingredient entries. Directions included irrelevant text like “This site uses Akismet to reduce spam.”
and “Sign in.” Running the model on a basic crab cake recipe produced 62 ingredients (there were only 10) 
and 41 directions (instead of 5). Another recurring issue: ingredients were often split awkwardly across multiple
lines—for example, “2 tablespoons” and “finely chopped parsley” appeared as separate items rather than one 
cohesive phrase.

The only good news? All the correct ingredients and directions were present in their respective arrays. But the 
number of false positives made the output nearly unusable.

In this article, we’re going to improve our model to the point where it’s nearly production-ready. To keep 
things organized, we’ll be making a series of small, incremental changes—each with its own Git tag. If you’d like to
follow along step by step, check out the corresponding tag at each stage.  First let's check out part-1:

```bash
git checkout post-3-part-1
```

### Adding Features

In the last post, we discussed how we extract features from HTML elements to provide input to our 
classifier. Initially, those features were fairly basic. In this section, we're going to enrich them with more
targeted signals that reflect the structure and semantics of recipe content.

Here’s what we’re adding and why:

* **`num_digits`**: Ingredient quantities often contain numbers (e.g., "2 cups"), so counting digits helps identify them.
* **`contains_unit`**: Units like "tablespoons" or "ml" are strong indicators of ingredients.
* **`comma_count`**: Directions tend to be sentence-like, and commas are good proxies for that structure.
* **`dot_count`**: Similar to commas, periods indicate multi-sentence or complete instruction blocks.
* **`is_heading`**: Headings (e.g., `<h2>Ingredients</h2>`) may signal section transitions, which could help disambiguate labels.
* **`is_list_item`**: Ingredients and directions are frequently stored in `<li>` tags, so this helps distinguish them from other content.

These feature names are just for our reference—the model never sees them. When passed into a machine learning 
pipeline, each feature is automatically transformed into a numerical position within a vector. The model doesn’t
know what "is\_list\_item" or "num\_digits" means; it just receives a list of numbers like `[0, 1, 5, 0, 2, ...]` 
representing the feature values in a fixed order. This is why maintaining the exact same order and format for
every training sample is crucial. If the feature order is inconsistent, the model will interpret the data 
incorrectly, resulting in poor or unpredictable behavior.

Here’s the updated `extract_features` function:

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
            "contains_unit": int(any(re.search(r"\\b" + re.escape(unit) + r"\\b", elem_text.lower()) for unit in units)),
            "comma_count": elem_text.count(","),
            "dot_count": elem_text.count("."),
            "is_heading": int(tag in ["h1", "h2", "h3", "h4", "h5", "h6"]),
            "is_list_item": int(tag == "li")
        }
        for el in elements
    ]
```

With these features in place, we re-run the training pipeline to see how much they improve the model. Here’s the 
resulting classification report:

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

We see modest gains across most categories. In particular, `ingredient` precision and recall improved slightly. The 
`none` label remains strong, though it continues to dominate the dataset.

For comparison, here’s the previous run before we added these new features:

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

While the improvement from 0.68 to 0.69 accuracy is modest, it’s consistent. We see slightly better F1 scores for ingredients, title, and none. Direction slipped a bit, which suggests that not all added features were equally helpful.

### Speed Up Loading Data

Before diving deeper into feature evaluation, we noticed a significant bottleneck in our workflow: loading just 1000 labeled files was taking over 50 seconds, followed by another 20 seconds to train and evaluate the model. While Scikit-learn already handles training and prediction in parallel, our data loading process was entirely sequential. To improve scalability and speed up experimentation, we decided to parallelize the `load_labeled_blocks` function.

For those following along, check out the next step in git:

```bash
git checkout post-3-part-2
```

To parallelize our data loading, we first refactor the logic that processes a single file into its own standalone function, `process_pair`. This function is responsible for reading both the JSON labels and corresponding HTML file, extracting labeled elements, and returning feature/label pairs.

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

We then use a [`ProcessPoolExecutor`](https://docs.python.org/3/library/concurrent.futures.html#processpoolexecutor) to 
submit each JSON file to a separate worker process. This allows us to process many files concurrently, taking full
advantage of multiple CPU cores. Each call to `executor.submit` returns a future object, which we collect in a 
list. As these futures complete, we retrieve their results and extend our master feature (`X`) and label (`y`)
lists. Using `extend` is key here: since each future returns a list of multiple elements, `extend` ensures we 
flatten those lists into a single sequence. Previously, we appended one file’s elements at a time, making 
this a significant performance improvement.

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

To evaluate the impact of our parallelized loader and assess the usefulness of the `is_heading` and `is_list_item` features, we conducted a simple experiment: we removed both features from our training set and re-ran the pipeline to test the hypothesis that `is_heading` and `is_list_item` were contributing meaningfully to classification accuracy, and to confirm the performance boost from parallelizing the data loader. The performance boost in loading was dramatic—dropping from roughly 60 seconds down to just 6. As for classification performance, the results were nearly identical to the previous run, suggesting that these features may not be pulling their weight:

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

**Interpreting the Results**

Removing `is_heading` and `is_list_item` had very limited impact on the model's performance:

* **Direction**: Slight drop in F1 score (from 0.27 to 0.26)
* **Ingredient / None**: No meaningful change
* **Title**: Slight decrease in F1 score (from 0.14 to 0.13)
* **Overall accuracy**: Increased slightly (from 0.69 to 0.70), likely within margin of error

In short, these features neither improved nor harmed the model's performance in any noticeable way. Their effect appears negligible in the current dataset, though they may still prove useful in more nuanced cases or when trained on a larger corpus.

**Things to try**

* Can you think of additional ways to speed up data loading? (Hint: we’ll introduce another later in this article.)
* Try running the full corpus of data with and without the `is_heading` and `is_list_item` to see if it proves useful on a larger corpus.
* Try removing or isolating other features and running train.py to understand their contribution. Removing a feature helps identify if it's essential, while isolating a feature (e.g., training with just that feature) reveals how informative it is on its own.


### Adding More Features

Next, let's assume that ingredients do have units, and they also have quantity, and sometimes quantity is a
written number, sometimes it is a special character like ½ or ¼, and sometimes it is a plain number. So let's 
add a feature for that, but first check out the next part tag.

```bash
git checkout post-3-part-3
```

So to our feature extraction dictionary we add:

```python
"contains_quantity_number": int(bool(re.search(r"\d+|\d+/\d+|½|¼|¾|⅓|⅔|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b", elem_text))),
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

It is getting slightly better. But these are all pretty small wins (though all wins are important in 
tuning). However, I feel that we have to now think about how recipes are structured on a web page. The 
title comes first, then the ingredients (usually after an ingredients header), and then directions 
(usually after the directions header). So, currently we aren't putting any weight on things like 
where on the page the elements are, or whether we have seen an ingredient header yet. Unfortunately, since we
are extracting the features in bulk for all recipe pages, we currently don't know their position on 
the page. We are going to have to either store more data with the X_raw or extract the features in 
the new process_pair function. 

### Measuring Memory Use

I think maintaining all the Beautiful Soup elements may be expensive, so let's also add some memory 
information to our script.

```bash
git checkout post-3-part-4
```

We have conditionally added memory tracing (getting the data from the process's memory info as well as using 
tracemalloc). We do this conditionally as tracing the memory slows down the process considerably.

```python
    if memory:
        import psutil
        
        def get_memory_usage():
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / 1024 / 1024  # MB

        tracemalloc.start()
        start_memory = get_memory_usage()
```

At the end of the program, we dump out our usage.  

```python
    if memory:
        # Get peak memory
        current, peak = tracemalloc.get_traced_memory()
        end_memory = get_memory_usage()
        print(f"Peak memory from tracemalloc: {peak / 1024 / 1024:.2f} MB")
        print(f"Memory usage from psutil: {end_memory:.2f} MB")
        print(f"Memory increase: {end_memory - start_memory:.2f} MB")
```

If you run the training again, you can see that we use about 755MB of memory if we store all the Beautiful Soup Elements in a List of Dictionaries 

```text
Total time: 100.56s
Peak memory from tracemalloc: 636.45 MB
Memory usage from psutil: 906.82 MB
Memory increase: 755.74 MB
```

But if we move the parsing into the load_labeled_blocks (well actually the process_pair) function

```bash
git checkout post-3-part-5
```

```python
def process_pair(json_file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
#...(SNIP)...
    for el in elements:
        label = label_element(el["text"], label_data)
        features = extract_features(el)
```

we also have to change our predict.py to handle the fact that extract_features now returns a single 
Dictionary of features from a single element rather than a List of Dictionary from a List of elements.

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
we can take advantage of knowing where in the document each element is.  

Let's update our process_pair function again to take the location on the page that the element is and see how that 
improves things. First, let's pass in which element on the page each element is (its index) and its position on the
page (its index divided by the number of elements on the page).

```bash
git checkout post-3-part-6
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

All the F1 scores are better and there are no regressions so this is another win. If we look at our data though,
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

### Fixing the HTML Parsing

Let's solve the problem of split ingredients. Let's dig into some of the HTML, and see what our ingredients look like (this is from recipe_000027.html):

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

And if we look at a bunch more, we can see that ingredients frequently spread across several elements (spans 
in the example), and if we set a breakpoint when we are doing the labelling, we can see that our ingredients
are spread over multiple blocks:

<img alt="Debugging Blocks" src="/img/supervised/debug-labels.webp" style="border: 1px solid #000; margin: 0 10px 10px 0">

So we need to change how we extract li items from the HTML.

```bash
git checkout post-3-part-7
```

We add the following to our parse_html.py:

```python
    # If the element is a <li> tag, combine its text and skip its children
    if isinstance(element, Tag) and element.name == "li":
        combined = element.get_text(separator=" ", strip=True)
        if combined:
            elements.append({
                'text': combined,
                'tag': element.name,
                'depth': depth,
                'itemprop': element.get('itemprop', ''),
                'class': element.get('class', []),
                'id': element.get('id', '')
            })
        return  # Do not emit children of this <li>
```

And then running the training model again we get:

```text
              precision    recall  f1-score   support

   direction       0.19      0.73      0.30      1618
  ingredient       0.30      0.81      0.43      2402
        none       0.99      0.72      0.83     37960
       title       0.12      0.92      0.21       242

    accuracy                           0.72     42222
   macro avg       0.40      0.79      0.44     42222
weighted avg       0.91      0.72      0.78     42222
```

While our direction and title improved, our ingredients precision and f1 score actually got worse. Which 
is weird since we did this to mostly improve how we get ingredients. However, if we run predict we will
see things are looking a lot better.

```json
{
  "title": "Maryland Crab Cakes",
  "ingredients": [
    "Pin",
    "Tweet",
    ",",
    ", and",
    "cornbread",
    "Salmon Cakes",
    "Success!",
    "Servings:",
    "For the Crab Cakes",
    "2 large eggs",
    "2½ tablespoons mayonnaise, best quality such as Hellmann's or Duke's",
    "1½ teaspoons Dijon mustard",
    "1 teaspoon Worcestershire sauce",
    "1 teaspoon Old Bay seasoning",
    "¼ teaspoon salt",
    "¼ cup finely diced celery, from one stalk",
    "2 tablespoons finely chopped fresh parsley",
    "1 pound lump crab meat (see note below)",
    "½ cup panko",
    "Vegetable or canola oil, for cooking",
    "For the Quick Tartar Sauce",
    "1 cup mayonnaise, best quality such as Hellmann's or Duke's",
    "1½ tablespoons sweet pickle relish",
    "1 teaspoon Dijon mustard",
    "1 tablespoon minced red onion",
    "1-2 tablespoons lemon juice, to taste",
    "Salt and freshly ground black pepper, to taste",
    "For the Crab Cakes",
    "For the Quick Tartar Sauce",
    "French Green Beans",
    "Cornbread Muffins",
    "Saturated fat: 3 g",
    "Carbohydrates: 9 g",
    "Sugar: 1 g",
    "Fiber: 1 g",
    "Protein: 32 g",
    "Appetizers",
    "Fish & Seafood",
    "American",
    "Pin",
    "Tweet",
    "Instagram",
    "Amazon",
    "Deviled Eggs",
    "Chicken Marsala"
  ],
  "directions": [
    "By",
    ".",
    "peel-and-eat shrimp",
    ".",
    ".)",
    "To begin, combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a bowl.",
    "Mix well to combine.",
    "Add the crab meat, making sure to check for any hard and sharp cartilage as you go, along with the panko.",
    "Shape into 6 large cakes about ½ cup each, and place on a foil-lined baking sheet for easy cleanup. Then cover and refrigerate for at least 1 hour. This step is really important to help the crab cakes set, otherwise they may fall apart a bit when you cook them.",
    "Preheat a large nonstick pan to medium heat and coat with oil. When the oil is hot, place crab cakes in the pan and cook until golden brown, about 3 to 5 minutes.",
    "Flip and cook 3 to 5 minutes more, or until golden. Be careful as the oil may splatter.",
    "Next, make the tartar sauce by combining the mayonnaise, Dijon mustard, sweet pickle relish, red onion, lemon, salt, and pepper in a small bowl.",
    "Whisk well, then cover and chill until ready to serve.",
    "Crispy Pan Fried Fish Fingers",
    "Go",
    "By",
    "Jennifer Segal",
    "Makes 6 large crab cakes",
    "30 Minutes",
    "10 Minutes",
    "40 Minutes",
    ", plus at least 1 hour to let the crab cakes set",
    "Ingredients",
    "Instructions",
    "Line a baking sheet with aluminum foil for easy clean-up.",
    "Combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a large bowl and mix well. Add the crab meat (be sure to check the meat for any hard and sharp cartilage) and panko; using a rubber spatula, gently fold the mixture together until just combined, being careful not to shred the crab meat. Shape into 6 cakes (each about ½ cup) and place on the prepared baking sheet. Cover and refrigerate for at least 1 hour. This helps them set.",
    "Preheat a large nonstick pan over medium heat and coat with oil. When the oil is hot, place the crab cakes in the pan and cook until golden brown, 3 to 5 minutes per side. Be careful as oil may splatter. Serve the crab cakes warm with the tartar sauce.",
    "In a small bowl, whisk together the mayonnaise, relish, mustard, onion, and lemon juice. Season with salt and pepper, to taste. Cover and chill until ready to serve.",
    "Note: The nutritional information does not include the tartar sauce.",
    "Pair with",
    "Powered by",
    "*",
    "*",
    "*",
    "This site uses Akismet to reduce spam.",
    "Sign in",
    "Sign in"
  ]
}
```
So, it is important to remember that the classification report is not the be-all and end-all of 
tuning -- it is very important but sometimes you need to run predict on a few files just to get an 
idea of how things are going. This change may not have improved the F1 score for ingredients but it 
certainly improved the output.

### Adding Even More Features

Another thing we can look at is that if we look at many of the recipes' HTML, we will see ingredients
and directions are frequently signaled by an h2 or h3 and the word ingredients or directions. Let's add 
some code to keep track of any headers we see with ingredients, or directions (or other frequently used 
words that denote that the ingredients or directions are forthcoming):

Check out the changes that add this:

```bash
git checkout post-3-part-8
```

First, we create a function in feature_extraction.py that checks if the current element is a header tag. If 
it is, it looks for ingredient or direction markers in the text. If it finds one of those it returns a 
new heading. If it doesn't, it returns none, and if we aren't a header then it returns what the 
previous section_heading was.

```python
def get_section_header(current_section_heading, el):
    elem_text = el["text"]
    tag = el.get("tag", "").lower()
    elem_text_lower = elem_text.lower()
    # If this element is a heading → update current section
    if tag in ["h1", "h2", "h3", "h4", "h5", "h6"]:
        # Check if it contains keywords for ingredient or direction sections
        if any(k in elem_text_lower for k in ["ingr", "component", "element", "material"]):
            current_section_heading = "ingredient"
        elif any(k in elem_text_lower for k in
                 ["instr", "direction", "step", "method", "preparation", "procedure", "technique"]):
            current_section_heading = "direction"
        else:
            current_section_heading = None  # unknown heading
    return current_section_heading
```

Next, we pass the current_section_heading to the extract_features function and add the following 
features to our features array.

```python
    "is_under_current_ingredient_section": int(current_section_heading == "ingredient"),
    "is_under_current_direction_section": int(current_section_heading == "direction")
```

Running the training data we can see that ingredient precision, recall, and f1-score have all increased 
slightly.

```text
              precision    recall  f1-score   support

   direction       0.19      0.73      0.30      1534
  ingredient       0.30      0.82      0.44      2452
        none       0.99      0.72      0.83     37980
       title       0.12      0.90      0.21       256

    accuracy                           0.73     42222
   macro avg       0.40      0.80      0.45     42222
weighted avg       0.91      0.73      0.79     42222
```

HTML element classes and ids frequently have useful information in them. Let's see if adding that to 
the features helps us out.

```bash
git checkout post-3-part-9 
```

First, turn the class and id into a string:

```python
    class_id_str = " ".join(str(x) for x in el.get("class", [])) + " " + str(el.get("id", ""))
    class_id_str = class_id_str.lower()
```

Then add that to the feature set.

```python
    "class_has_ing_keyword": int(any(k in class_id_str for k in ing_keywords)),
    "class_has_dir_keyword": int(any(k in class_id_str for k in dir_keywords)),
    "class_has_title_keyword": int(any(k in class_id_str for k in title_keywords))
```

and run the training set: 

```text
              precision    recall  f1-score   support

   direction       0.20      0.76      0.32      1590
  ingredient       0.32      0.82      0.46      2428
        none       0.99      0.73      0.84     37954
       title       0.12      0.92      0.21       250

    accuracy                           0.74     42222
   macro avg       0.41      0.81      0.46     42222
weighted avg       0.91      0.74      0.79     42222
```

Now we are cooking with gas; this helped all fields, even title.

Let's look at the possibility of adding one more feature: itemprop is an attribute that can be placed 
on tags, and recipes frequently use "recipeIngredient" on the ingredient tag, and "recipeInstruction" 
on the direction tag. You can see this by going to the data/html_pages directory and typing

```bash
grep 'itemprop="recipeIngredient"' *
```

or on Windows command prompt:

```cmd
findstr "itemprop=\"recipeIngredient\"" *
```

To see how many files actually are affected by this

```bash
grep -l 'itemprop="recipeIngredient"' * | wc -l
```

or on Windows command prompt:

```cmd
findstr /m "itemprop=\"recipeIngredient\"" * | find /c /v ""
```

and we see that there are only about 300 of the 12,000 files that actually have itemprops that support 
recipeIngredient and recipeInstruction, so it doesn't make sense to add this for only about 2% of 
the training files.

There are probably some features we could extract and improve the classification score even 
more—but I think we are getting to a series of diminishing returns and it is time to take a new approach.

**Things to try**

* Try adding more features, and see what happens. 
* Can you improve the accuracy by adding things like a feature similar to our "class_has_ing_keyword" feature but getting the last 3 element ancestors (parents)?

### Data Cleanup

We did some very simple checking when we loaded the data, and just quickly glancing over the JSON files 
I noticed that a few of the recipe_*.json files had their source as 
[nytimes.com](https://cooking.nytimes.com), and knowing that the 
[New York Times](https://nytimes.com) requires a subscription to view their recipes, I suspected 
that my check to see if the page was valid didn't catch all the invalid pages. I also scanned 
a few of the recipe_*.json files and found that the data was bad: recipes had their ingredients 
doubled and (for example recipe_00007.json has ingredients that look like this:

```json
{
  "ingredients": [
    "0",
    "3 duck breasts (i.e. 6 fillets with their skins)",
    "3 duck breasts (i.e. 6 fillets with their skins)",
    "3 tablespoons thyme honey",
    "3 tablespoons thyme honey",
    "1 cup apple cider",
    "1 cup apple cider",
    "1 tablespoon apple cider",
    "1 tablespoon apple cider",
    "1 cinnamon stick",
    "1 cinnamon stick",
    "1 teaspoon ginger, powdered",
    "1 teaspoon ginger, powdered",
    "1 teaspoon coriander, powdered",
    "1 teaspoon coriander, powdered",
    "salt",
    "pepper, freshly ground",
    "3 apples, washed and cut into 8 pieces, seeds removed",
    "3 apples, washed and cut into 8 pieces, seeds removed",
    "2 tablespoons butter or 1 tablespoon olive oil",
    "2 tablespoons butter or 1 tablespoon olive oil",
    "1 tablespoon olive oil",
    "1 tablespoon brown sugar",
    "1 tablespoon brown sugar",
    "1/2 teaspoon cinnamon, powdered",
    "1/2 teaspoon cinnamon, powdered"
  ]
}
```

which is pretty annoying since **most** of the ingredients are doubled, but not all of them. So I 
wrote a quick script to delete all the recipes with doubled data in the JSON files and all the recipes 
where the HTML is missing. You can find this in this tag


```bash
git checkout post-3-part-10
```

run it from the command line or the VS Code debugger and it will delete 1,028 recipes. Unfortunately, 
if we now run the training data we see that our model has gotten worse with the improved data.


```text
              precision    recall  f1-score   support

   direction       0.22      0.72      0.34      1554
  ingredient       0.24      0.84      0.38      2318
        none       0.99      0.71      0.82     38128
       title       0.14      0.88      0.23       276

    accuracy                           0.72     42276
   macro avg       0.40      0.79      0.44     42276
weighted avg       0.91      0.72      0.78     42276
```

**Things to try**

* We are running this against the first 1000 recipes very often and it would be good to know that they came 
from a diverse collection of sites. Write a script to grab all the JSON files and print out a 
distribution of the domains, also do this for the first thousand recipes and see what the distribution 
is like. 
* To really improve things, write a script that takes all those domains and produces a more 
balanced list of the first 1000 recipes (prefix them with a '\_' so that they get read first 
(e.g. '\_recipe_00008.json' and the corresponding '\_recipe_00008.html')).

### Improving Labeling

OK, Data Cleanup only made things worse (it will definitely improve things in the long term),
but for now let's try a different strategy. Let's try improving our labeling by seeing if the string 
is similar rather than exact matching on words in the string.

```bash
git checkout post-3-part-11
```

Our old label_element looked like 

```python
def label_element(text: str, label_data: Dict[str, Any]) -> str:    
    t = text.strip().lower()
    if not t or t.isdigit():
        return 'none'
    if any(t in i.lower() for i in label_data.get("ingredients", [])):
        return 'ingredient'
    if any(t in d.lower() for d in label_data.get("directions", [])):
        return 'direction'
    if label_data.get("title", "").strip().lower() == t:
        return 'title'
    return 'none'
```

We will update it to look like:

```python
def similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()

def label_element(text: str, label_data: Dict[str, Any]) -> str:
    t = text.strip().lower()
    if not t or t.isdigit():
        return 'none'
    if any(similar(t, i.lower()) > 0.8 for i in label_data.get("ingredients", [])):
        return 'ingredient'
    if any(similar(t, d.lower()) > 0.8 for d in label_data.get("directions", [])):
        return 'direction'
    if similar(label_data.get("title", "").strip().lower(), t) > 0.8:
        return 'title'
    return 'none'
```

Even though this is "fuzzy" matching, it will remove a lot of false positives. We have gone from 
substring matching, to "almost whole-string" matching. With strict “in” logic, partial matches 
(e.g., "eggs" in "3 large eggs, beaten") would count as a match. This can lead to over-labeling—even 
short fragments, but with fuzzy logic, we’re comparing the whole text block to the whole ingredient
line, not fragments. "eggs" vs. "3 large eggs, beaten" has a low similarity score (<0.8). 
Only blocks that are almost identical to a label line are counted.

When we run the training again, we see that our accuracy has shot up (even though our support has 
gone down considerably in direction and ingredient).

```text
              precision    recall  f1-score   support

   direction       0.29      0.91      0.44       877
  ingredient       0.50      0.94      0.65      1709
        none       1.00      0.85      0.92     39290
       title       0.14      0.93      0.25       400

    accuracy                           0.86     42276
   macro avg       0.48      0.91      0.57     42276
weighted avg       0.95      0.86      0.89     42276
```

This is clearly a marked improvement (an accuracy jump of over 10%), with the only downside being that it takes a fair bit longer to label our data (from 6 seconds to 35 seconds)—but hey, no one ever said training was fast.

**Things to try**

* Try changing the ratio for similarities, see what happens (remember to look at all the numbers)
* Try changing it for all the similarities and just one. 
* Play with other similar algorithms, try [Levenshtein](https://en.wikipedia.org/wiki/Levenshtein_distance), 
[Damerau–Levenshtein](https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance),
and maybe even [Soundex](https://en.wikipedia.org/wiki/Soundex). 
* Think about whether these work better or worse than the [SequenceMatcher](https://docs.python.org/3/library/difflib.html#difflib.SequenceMatcher)?

### Balancing the Dataset

The final technique we're going to introduce in this article is explicit dataset balancing *before* training.

Now, you might be thinking: *“Wait—don’t we already balance the data using **`class_weight='balanced'`**?”*

```python
model = make_pipeline(
    build_transformer(),
    StandardScaler(with_mean=False),
    LogisticRegression(solver='lbfgs', max_iter=1000, class_weight='balanced')
)
```

Yes, and that does help. Scikit-learn will scale the loss contribution of each class to compensate for imbalance. However,
this doesn’t always go far enough—especially when the imbalance is extreme. For example, when `"none"` outnumbers 
`"ingredient"` by 40 to 1, the classifier can still get stuck in a local minimum where it learns to predict `"none"` 
for nearly everything. You’ll technically get a high accuracy (since "none" is so common), but the model will 
perform terribly on the classes you actually care about.

Balancing the dataset **before training** gives each class a fighting chance. It ensures the model sees a more 
diverse set of examples during each epoch—especially important for the rarer labels. This also leads to smoother 
optimization and more stable convergence during training, which can be especially helpful for models 
using regularization.

So, here's the practical rule of thumb:

> - If your imbalance is mild, `class_weight='balanced'` is usually good enough.
> - If your imbalance is severe, do some pre-balancing manually before the model ever sees the data.

```bash
git checkout post-3-part-12
```

To do that, we use [pandas](https://pandas.pydata.org) along with scikit-learn’s [`resample`](https://scikit-learn.org/stable/modules/generated/sklearn.utils.resample.html) function. The `balance_training_data` function performs two things:

1. **Downsamples** the `"none"` class so it doesn’t dominate the training data (we cap it at 3× the total number of minority-class rows).
2. **Upsamples** any rare label if its count falls below 33% of the *mean* minority class count—giving it enough representation to learn meaningful patterns.

This isn’t a strict balancing (we’re not forcing equal class counts), but rather a gentle reshaping of the class distribution to give minority classes more breathing room, without completely distorting the dataset.

Here is the code:

```python
def balance_training_data(
    x_train: list,
    y_train: list,
    *,
    ratio_none_to_minor: int = 3,
    random_state: int = 42,
) -> tuple[list, list]:

    df = pd.DataFrame(x_train)
    df["label"] = y_train

    counts = df["label"].value_counts().to_dict()
    n_none = counts.get("none", 0)

    # -- keep all minorities
    df_minor = df[df["label"] != "none"].copy()
    minor_counts = df_minor["label"].value_counts().to_dict()
    if minor_counts:
        mean_minor = sum(minor_counts.values()) / len(minor_counts)
        min_target_per_class = int(mean_minor * 0.33)
    else:
        mean_minor = 0
        min_target_per_class = 0

    # -- none: downsample if needed
    none_target = min(n_none, ratio_none_to_minor * len(df_minor))

    df_none = df[df["label"] == "none"].copy()
    df_none_down = resample(
        df_none, replace=False, n_samples=none_target, random_state=random_state
    )

    # -- handle minorities
    frames = [df_none_down]
    for label, orig_count in minor_counts.items():
        df_label = df_minor[df_minor["label"] == label]
        # Upsample if needed
        if orig_count < min_target_per_class:
            df_label = resample(
                df_label,
                replace=True,
                n_samples=min_target_per_class,
                random_state=random_state,
            )
        frames.append(df_label)

    # -- concat & shuffle
    df_bal = pd.concat(frames).sample(frac=1, random_state=random_state)

    y_bal = df_bal["label"].tolist()
    x_bal = df_bal.drop("label", axis=1).to_dict(orient="records")
    
    return x_bal, y_bal
```

We run this balancing step *before* preprocessing the features or fitting the model. Here's where it's
applied in the training pipeline:

```python
X_train_bal, y_train_bal = balance_training_data(X_train, y_train)

validate_data(X_train_bal, y_train_bal)

print("Preprocessing data...")
X_train_proc = preprocess_data(X_train_bal)
X_test_proc = preprocess_data(X_test)

print("Training model...")
model = make_pipeline(
    build_transformer(),
    StandardScaler(with_mean=False),
    LogisticRegression(solver='lbfgs', max_iter=1000)
)

model.fit(X_train_proc, y_train_bal)
```

This gives us a model that not only scores better, but is far less likely to drown out the classes that matter.

After applying balancing and retraining the model, we see a major boost in performance across all categories. Here's the output:

```text
Splitting train/test...

raw class counts
  none      : 156986
  ingredient: 7053
  direction : 3507
  title     : 1557
Mean non-'none' class count: 4039.00
Target minimum per class (33% of mean): 1332
  none      : 156986 → 36351 (downsampled)
  ingredient: 7053 → 7053 (unchanged)
  direction : 3507 → 3507 (unchanged)
  title     : 1557 → 1557 (unchanged)

Final balanced set: 48468 rows ( none=36351, minorities=12117 )
Preprocessing data...
Training model...
Evaluating...
              precision    recall  f1-score   support

   direction       0.52      0.74      0.61       849
  ingredient       0.67      0.88      0.76      1763
        none       0.99      0.96      0.97     39301
       title       0.53      0.69      0.60       363

    accuracy                           0.95     42276
   macro avg       0.68      0.82      0.74     42276
weighted avg       0.96      0.95      0.95     42276
```

A 95% accuracy with strong F1 scores across all labels confirms this pre-balancing step was well worth it. The model is now much more attentive to the minority classes while still maintaining excellent performance on the majority class.

**Things to try**

- Play with different `ratio_none_to_minor` values and see how aggressively you can downsample "none" without degrading performance.
- Try setting `min_target_per_class` to a fixed number (e.g., 1000) instead of computing it dynamically.
- Introduce [SMOTE \(Synthetic Minority Over-sampling Technique\)](https://www.sciencedirect.com/science/article/abs/pii/S0020025519306838#:~:text=The%20Synthetic%20Minority%20over-sampling,one%20its%20K-nearest%20neighbors.)  for upsampling minority classes (a great article on doing this in Python can be found [here](https://medium.com/@corymaklin/synthetic-minority-over-sampling-technique-smote-7d419696b88c).
- Run experiments with more extreme imbalances to measure how robust your model is to skew.
- Try combining class\_weight='balanced' with a pre-balanced dataset to see if that produces further gains.

### Summary

Let's train our model now on the full dataset:

```text
              precision    recall  f1-score   support

   direction       0.62      0.77      0.69     10145
  ingredient       0.73      0.87      0.79     21425
        none       0.98      0.97      0.98    422414
       title       0.58      0.62      0.60      4242

    accuracy                           0.96    458226
   macro avg       0.73      0.81      0.76    458226
weighted avg       0.96      0.96      0.96    458226
```

and then run it against our test recipe:

```json
{
  "title": "Maryland Crab Cakes",
  "ingredients": [
    "For the Crab Cakes",
    "2 large eggs",
    "2½ tablespoons mayonnaise, best quality such as Hellmann's or Duke's",
    "1½ teaspoons Dijon mustard",
    "1 teaspoon Worcestershire sauce",
    "1 teaspoon Old Bay seasoning",
    "¼ teaspoon salt",
    "¼ cup finely diced celery, from one stalk",
    "2 tablespoons finely chopped fresh parsley",
    "1 pound lump crab meat (see note below)",
    "½ cup panko",
    "Vegetable or canola oil, for cooking",
    "For the Quick Tartar Sauce",
    "1 cup mayonnaise, best quality such as Hellmann's or Duke's",
    "1½ tablespoons sweet pickle relish",
    "1 teaspoon Dijon mustard",
    "1 tablespoon minced red onion",
    "1-2 tablespoons lemon juice, to taste",
    "Salt and freshly ground black pepper, to taste",
    "For the Crab Cakes",
    "For the Quick Tartar Sauce",
    "Sugar: 1 g"
  ],
  "directions": [
    "To begin, combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a bowl.",
    "Mix well to combine.",
    "Add the crab meat, making sure to check for any hard and sharp cartilage as you go, along with the panko.",
    "Shape into 6 large cakes about ½ cup each, and place on a foil-lined baking sheet for easy cleanup. Then cover and refrigerate for at least 1 hour. This step is really important to help the crab cakes set, otherwise they may fall apart a bit when you cook them.",
    "Preheat a large nonstick pan to medium heat and coat with oil. When the oil is hot, place crab cakes in the pan and cook until golden brown, about 3 to 5 minutes.",
    "Flip and cook 3 to 5 minutes more, or until golden. Be careful as the oil may splatter.",
    "Whisk well, then cover and chill until ready to serve.",
    ", plus at least 1 hour to let the crab cakes set",
    "Combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a large bowl and mix well. Add the crab meat (be sure to check the meat for any hard and sharp cartilage) and panko; using a rubber spatula, gently fold the mixture together until just combined, being careful not to shred the crab meat. Shape into 6 cakes (each about ½ cup) and place on the prepared baking sheet. Cover and refrigerate for at least 1 hour. This helps them set.",
    "Preheat a large nonstick pan over medium heat and coat with oil. When the oil is hot, place the crab cakes in the pan and cook until golden brown, 3 to 5 minutes per side. Be careful as oil may splatter. Serve the crab cakes warm with the tartar sauce.",
    "In a small bowl, whisk together the mayonnaise, relish, mustard, onion, and lemon juice. Season with salt and pepper, to taste. Cover and chill until ready to serve.",
    "Make-Ahead Instructions: The crab cakes can be formed, covered, and refrigerated a day ahead of time before cooking. The tartar sauce can be made and refrigerated up to 2 days in advance.",
    "Note: If you can only find jumbo lump crab meat, you may need to break the pieces up a bit. If the clumps are too large, the crab cakes won't hold together well.",
    "Note: The nutritional information does not include the tartar sauce."
  ]
}
```

It is now getting pretty close (with a pretty small 55kb model).

We have greatly improved our model over the course of this post. We have gone from having 65% accuracy, to 96% accuracy.

We have learned how to add more features, improve the labeling, clean up the data, and also balance the none label in
a more accurate way.
