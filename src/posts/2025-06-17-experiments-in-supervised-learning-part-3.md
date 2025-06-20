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

First lets get our project to the expected state.  Since we are going to do a bunch of small 
changes in this article, I have created tags for each little part.   Checkout the tag if you 
want to follow along:

```bash
git checkout post-3-part-1
```

### Adding Features 

Now, we learned last post that we extract features that we give to trainer when training the model. 
Our features were pretty generic so lets see if in step one of our training we can improve the features.  
Lets add the number of digits in the text ("num_digits") whether the text contains a known unit 
like tablespoons, or millimeters, etc ("contains_unit"), the number of commas in the text ("comma_count"), 
the number of periods in the text ("dot_count"), whether the tag is a heading ("is_heading")
and if it is a list item ("is_list_item").  The assumptions we are making is that ingredients are more likely to
have a unit, a digit, and is probably a list item.  Directions are more likely to contain commas,
and perhaps more than 1 period.  These names, BTW, are for us, the modelers of the data - 
they don't mean anything to the statistical models.  In fact, only their positions are stored 
(so make sure that when extracting features the positions don't change).

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
us.   Let's try running it without the is_header and is_list_item features.  But first, loading even 
a subset (1000) of the items is taking a while (over 50s on my machine, and another 20s or so to train
and analyze the model. Sklearn is automatically parallelizing the training (fit)) and prediction for us so 
we can't really speed up model creation, but reading 1000 json and html files is super-paralelizable so 
lets change the load_labeled_blocks to be parallilized.  

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

Next, we get a ProcessPoolExecutor, and submit each of the json_file to it.  This returns us an array of 
futures (promises, if you are used to JavaScript), as each future is completed, we get the result and 
extend our blocks and our labels (extend flattens the array as it merges, the old code appended each 
block one at a time as it was processing the file).

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

If we run train now, we can see that loading the files (at least on my computer) takes about 1/10th the 
time, and we can also see that "is_header" and "is_list_item" is basically doing nothing.

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

It is getting slightly better.  But these are all pretty small wins (though all wins are important in 
tuning).  However, I feel that we have to now think how recipes are structured on a web page.  The 
title comes first, then the ingredients (usually after and ingredients header) and then directions 
(usually after the directions header).  So, currently we aren't putting any weight on things like 
where on the page the elements are, or have we seen an ingredient header yet.  Unfortunately, since we
are extracting the features in bulk for all recipes pages we currently don't know their position on 
the page. We are going to have to either store more data with the X_raw or extract the features in 
the new process_pair function. I think maintaining all the Beautiful Soup elements may be expensive 
so lets also add some memory information to our script.

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

If you run the training again, you can see that we use about 755MB of memory if we store all the 
Beautiful Soup Elements in a List of Dictionaries 

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

### Fixing the HTML Parsing

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

So we need to change how we extract li items from the html.  

```bash
git checkout-part-3-part-7
```

we add the following to our parse_html.py

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

While our direction and title improved, our ingredients precision and f1 score actually got worse.  Which 
is wierd since we did this to mostly improve how we get ingredients.  However, if we run predict we will
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
idea of how things are going.  This change may not have improved the F1 score for ingredients but it 
certainly improved the output.

### Adding more Features

So, another thing we can look at, is that if we look at many of recipes html, we will see ingredients 
and directions are frequently signaled by an h2 or h3 and the word ingredients or directions.  Lets add 
some code to keep track of any headers we see with ingredients, or directions (or other frequently used
words that denote that the ingredients or directions are forthcoming):

Checkout the changes that add this:

```bash
git checkout-part-3-part-7
```

First we create a function in feature_extraction.py that checks if the current element is a header tag.  If 
it is, it looks for ingredient or direction markers in the text.  If it finds one of those it returns a
new heading.  If it doesnt it returns none, and if we aren't a header then it returns what the 
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

Next, we pass the current_section_heading, to the extract_features function and add the following 
features to our features array.

```python
    "is_under_current_ingredient_section": int(current_section_heading == "ingredient"),
    "is_under_current_direction_section": int(current_section_heading == "direction")
```

Running the training data we can see that ingredient precision, recall and f1-score have all increased 
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

HTML element classes and ids frequently have useful information in them, lets see if we add that to 
the features if it helps us out.

```bash
git checkout post-3-part-9 
```

First turn the class and id into a string:

```python    
    class_id_str = " ".join(str(x) for x in el.get("class", [])) + " " + str(el.get("id", ""))
    class_id_str = class_id_str.lower()
```

then add that to the feature-set.

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

Now we are cooking with gas, this helped all fields, even title.  

Lets look at the possibility of adding one more feature, itemprop is an attribute that can be placed 
on tags and recipes frequently use "recipeIngredient" on the ingredient tag, and "recipeInstruction" 
on the direction tag.   You can see this by going to data/html_pages directory and typing 

```bash
grep 'itemprop="recipeIngredient"' *
```

or on Windows command prompt:

```cmd
findstr "itemprop=\"recipeIngredient\"" *
```

to see how many files actually are affected by this 

```bash
grep -l 'itemprop="recipeIngredient"' * | wc -l
```

or on Windows command prompt:

```cmd
findstr /m "itemprop=\"recipeIngredient\"" * | find /c /v ""
```

and we see that there are only about 300 of the 12,000 files actually have itemprops that support 
recipeIngredient and recipeInstruction so it doesn't make sense to add this for only about 2% of 
the training files.

There are probably some features we could extract, and improve the classification score even
more - but I think we are getting to series of diminishing returns and it is time to take a new approach.  


** Things to try **

Try adding more features, see what happens.  Can you improve the accuracy by adding things like 
adding a feature similar to our "class_has_ing_keyword" feature but getting the last 3 element 
ancestors (parents)?  What other features could you add?
 

### Data Cleanup

We did some very simple checking when we loaded the data, and just quickly glancing over the json files 
I noticed that a few of the recipe_*.json files had their source as 
the [nytimes.com](https://cooking.nytimes.com) and knowing that the 
[New York Times](https://nytimes.com) requires a subscription to view their recipes I suspected 
that my check to see if the page was valid didn't catch all the invalid pages.  I also scanned 
a few of the recipe_*.json files and found that the data was bad: recipes had their ingredients 
doubled and (for example recipe_00007.json has ingredients that looks like this: 

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

which is pretty annoying since **most** of the ingredients are doubled, but not all of them.  So I 
wrote a quick script to delete all the recipes with doubled data in the json files and all the recipes
where the HTML is missing.  You can find this in this tag


```bash
git checkout post-3-part-10
```

run it from the command line or the VS Code debugger and it will delete 1,028 recipes.  Unfortunately
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

** Things to try **

We are running this against the first 1000 recipes very often and it would be good to know that they came 
from a diverse collection of sites.  Write a script to grab all the json files and print out a 
distribution of the domains, also do this for the first thousand recipes and see what the distribution 
is like. To really improve things, write a script that takes all those domains and produces a more 
balenced list of the first 1000 recipes (precurse them with a '\_' so that they get read first
(e.g. '\_recipe_00008.json' and the corresponding '\_recipe_00008.html')). 

### Improving Labelling

OK, Data Cleanup only made things worse (it will definately improve things in the long term) 
but for now lets try a different strategy.  Let's try improving our labelling by seeing the string
is simliar rather than exact matching on words in the string.  

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
short fragments, but ith fuzzy logic, we’re comparing the whole text block to the whole ingredient
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

This is clearly a marked improvement (an accuracy jump of over 10%), with the only downside is that 
it takes a fair bit longer to label our data (from 6 seconds to 35 seconds) - but hey, no one ever 
said training was fast.

** Things to try **

Try changing the ratio for similarities, see what happens (remember to look at all the numbers).  Try 
changing it for all the similiarities and just 1. Play with other similar alorithms, try
[Levenshtein](https://en.wikipedia.org/wiki/Levenshtein_distance), 
[Damerau–Levenshtein](https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance),
and maybe even [Soundex](https://en.wikipedia.org/wiki/Soundex).  Why do you think these work better
or worse than the [SequenceMatcher](https://docs.python.org/3/library/difflib.html#difflib.SequenceMatcher)?

### Balancing The Dataset

The last technique we are going to show in this article is how to balence the dataset before 
training.  But you say, we are already balencing the training set

```python
    model = make_pipeline(
        build_transformer(),
        StandardScaler(with_mean=False),
        LogisticRegression(solver='lbfgs', max_iter=1000, class_weight='balanced')
    )
```

it clearly says class_weight='balanced'. And yes, this does help a lot, however, if the imbalance
is extreme (e.g. 40x as many “none” as “ingredient”), gradient descent may still get stuck in a 
“none-predicting” local minimum. Regularization and solver convergence are often better on 
less-skewed data. Starting with balanced data allows the classifier to see more varied 
“positive” examples in each epoch (not drowned by “none”). The optimization surface is 
smoother and less dominated by the majority class.

In practice: Mild imbalance + class_weight='balanced' = usually fine, however if there is a
severe imbalance manually do the balencing ahead of time rather than doing it in the Pipeline.

```bash
git checkout post-3-part-12
```

We use [pandas](https://pandas.pydata.org) and the [resample](https://scikit-learn.org/stable/modules/generated/sklearn.utils.resample.html) function in sckit-learn to rebalance 
the data.  This code   

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

Basically downsamples the none class, however it would upsample the other labels if they dropped 
below 33% of the mean average.  Next we balence our training data:

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




