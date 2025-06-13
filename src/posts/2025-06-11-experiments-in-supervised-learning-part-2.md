---
layout: post
category: AI
title: "Experiments in Supervised Learning Part 2"
imagefeature:
description: 
draft: true
tags: ["Programming", "ML", "Supervised Learning", "AI"]
---
## First Results: Running the Rough Parser

In the last post, we looked at how an old side project—**Recipe Folder**—left me with a rich but messy dataset of recipes labeled by real users. We covered the evolution of extracting recipes from the web: starting with structured data scraping, falling back to manual user labeling when that failed, and ultimately ending up with a trove of human-annotated HTML blocks marking **ingredients**, **directions**, **titles**, and more.

We also got your development environment set up and ran the script to validate and download a fresh set of HTML pages and label files. Now that you’ve got a folder full of recipe pages and your IDE is ready to run Python, it’s time to take the next step:

**Let’s train our first supervised learning model.**

I’ll show you how to run the training script, and then we’ll walk through the code and the results line by line. Along the way, I’ll demystify one of the key tools used to evaluate classification models: `classification_report` from scikit-learn.

First, run the train.py script, this can be done either with one of presets I added launch.json ("Python Debugger: train limit 1000"), or you can run it from the command line (remember to activate your .venv before starting)

```
(.venv) \src>python train.py --limit=1000
```

You will see something like (this will take a little while, running it on the whole dataset takes a long time -- 

```
Loading labeled data...
Processed 100/1000 files (10.0%)
Processed 200/1000 files (20.0%)
Processed 300/1000 files (30.0%)
Processed 400/1000 files (40.0%)
Processed 500/1000 files (50.0%)
Processed 600/1000 files (60.0%)
Processed 700/1000 files (70.0%)
Processed 800/1000 files (80.0%)
Processed 900/1000 files (90.0%)
Processed 1000/1000 files (100.0%)
Loaded 338408 blocks.
Extracting features...
Splitting train/test...
Preprocessing data...
Training model...
Evaluating...
              precision    recall  f1-score   support

   direction       0.18      0.68      0.29      1889
  ingredient       0.24      0.85      0.38      4667
        none       0.99      0.66      0.79     60884
       title       0.07      0.86      0.12       242

    accuracy                           0.68     67682
   macro avg       0.37      0.76      0.39     67682
weighted avg       0.91      0.68      0.75     67682

Model saved to ..\models\model.joblib
Total time: 51.11s
```

### The Code

The code in the repo (once again at [Github Recipe Parser](https://github.com/kriserickson/recipe-parser/tree/blog-post-1) is 
commented and I will be removing things like comments and logs to keep this as brief as possible.

```
X_raw, y = load_labeled_blocks(limit=limit)
```

This loads the labels, in the form we are getting it here, we are putting some information from each html element (text, the parent tag and the depth into the html hierarchy.  Why do we do X\_raw rather than x\_raw?  It is a convention in Machine Learning that the X axis capitalized in variables name the y is lower case - not that important but you might see it in other source code.  

Lets quickly look at load\_labeled\_blocks (I've removed some comments and the code to display the progress.

```
def load_labeled_blocks(limit=None) -> Tuple[List[Dict[str, Any]], List[str]]:
    X, y = [], []
    json_files = sorted(LABELS_DIR.glob("recipe_*.json"))
    for i, json_file in enumerate(json_files):
        if limit and i >= limit:
            break

        base = json_file.stem
        html_file = HTML_DIR / f"{base}.html"
        if not html_file.exists():
            continue

        label_data = json.loads(json_file.read_text(encoding="utf-8"))
        html = html_file.read_text(encoding="utf-8")
        elements = parse_html(html)

        for el in elements:
            label = label_element(el["text"], label_data)
            X.append(el)
            y.append(label)

    return X, y
```

This code simply grabs all the JSON files in the data/labels directory and all the HTML files in the data/html\_pages directory.  
It loads the HTML for each page and the JSON file (which has the ingredients, directions and title that users had previous extracted from the recipe).

parse_html uses [Beautiful Soup](https://pypi.org/project/beautifulsoup4/) 
to extract a dictionary of the relevant elements of the html page (the text, parent tag, and depth). CONTINUE HERE...

### What Does `classification_report` Actually Mean?

Lets look at the report again:

```
              precision    recall  f1-score   support

   direction       0.18      0.68      0.29      1889
  ingredient       0.24      0.85      0.38      4667
        none       0.99      0.66      0.79     60884
       title       0.07      0.86      0.12       242

    accuracy                           0.68     67682
   macro avg       0.37      0.76      0.39     67682
weighted avg       0.91      0.68      0.75     67682
```

When I first started using `classification_report`, I found the output a little confusing. If you're new to supervised learning, 
it helps to understand exactly what each number represents.

#### Rows: The Classes

Each row represents one of the categories the model is trying to predict:

- **direction** = a block of text containing recipe directions
- **ingredient** = a block of text listing an ingredient
- **none** = not part of the recipe (ads, unrelated content, etc.)
- **title** = the recipe title

#### Columns: The Metrics

- **precision**
  Of all the times the model *predicted* a block was of this type, how many were correct?\
  → High precision = few false positives.

- **recall**
  Of all the blocks that *actually* were of this type, how many did the model find?\
  → High recall = few false negatives.

- **f1-score**
  The harmonic mean of precision and recall—this balances both metrics into one number.

- **support**
  The number of true examples of this class in the test data. This shows if some classes are rare or common.

#### Overall Averages

At the bottom, you get 3 summary rows:

- **accuracy**
  Overall fraction of correct predictions across all blocks.

- **macro avg**
  Average of precision, recall, and F1 across all classes, treating all classes equally regardless of size.

- **weighted avg**
  Like macro avg, but gives more weight to classes with more examples. This gives you a sense of how the model is doing 
- "on average" in proportion to your data.

### A Quick Tour of Our First Results

#### `direction`

- **Precision 0.18** = lots of false positives.
- **Recall 0.68** = found many true directions.
- **F1-score 0.29** = this low F1-score reflects the poor balance between precision and recall—even though recall is decent, the many false positives are dragging performance down.

#### `ingredient`

- **Precision 0.24** = lots of false positives.
- **Recall 0.85** = very good at finding actual ingredients.
- **F1-score 0.38** = this F1-score indicates that while recall is strong, the poor precision means the model is still not reliably labeling ingredient blocks.

#### `none`

- **Precision 0.99** = very few false positives when predicting "none." This is because there are so many "none" blocks that precision is high—not because we are doing a fantastic job in itself.
- **Recall 0.66** = it missed many actual "none" blocks. The model is cautious about declaring something "none," but often errs on the side of labeling it as recipe content.
- **F1-score 0.79** = a decent F1-score here—the model is reasonably strong at this dominant class, but we still want to improve recall to avoid contaminating recipe content with stray "none" labels.

#### `title`

- **Precision 0.07** = very poor precision.
- **Recall 0.86** = surprisingly high recall. The model is wildly overpredicting titles—lots of blocks are getting incorrectly labeled as "title."
- **F1-score 0.12** = a very low F1-score, showing that despite finding most true titles (high recall), the extreme overprediction makes this classification highly unreliable.

### Takeaways

- The model already does a decent job of filtering out "none" blocks.
- It finds many true recipe blocks but mislabels lots of things (low precision).
- The **imbalanced data** (60k "none" vs. only \~200 "title") makes training harder—some classes dominate.
- The feature set is still primitive—we’ll need to improve it to help the model distinguish between blocks better.

BTW, so you don't have to, running it on the full dataset takes a lot longer, but doesn't improve results much (in fact, everything but ingredients gets worse). &#x20;

```
              precision    recall  f1-score   support

   direction       0.18      0.68      0.28     25477
  ingredient       0.28      0.82      0.42     62520
        none       0.98      0.65      0.78    676271
       title       0.07      0.90      0.13      3057

    accuracy                           0.67    767325
   macro avg       0.38      0.76      0.40    767325
weighted avg       0.89      0.67      0.73    767325

Model saved to ..\models\model.joblib
️Total time: 1406.72s
```

So we learn that when tuning training we want to work on a subset to keep the feedback loop relatively fast.

### Next Steps

In the next phase, we’ll:

- Refine feature engineering
- Add balancing to give equal attention to minority classes
- Investigate why categories like "title" are being so heavily misclassified

**We have what would could call "Supervised Machine Learning", it's not very good, but it is a start. Now the real tuning begins. Stay tuned!**
