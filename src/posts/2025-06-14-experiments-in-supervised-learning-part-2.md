---
layout: post
category: AI
title: "Experiments in Supervised Learning Part 2"
imagefeature: blog/supervised-part-2.webp
description: 
tags: ["Programming", "ML", "Supervised Learning", "AI"]
---
## First Results: Building and Running the Initial Model

In the [last post](/posts/2025-06-13-experiments-in-supervised-learning), we looked at how an old side project —**Recipe Folder**— left me with a rich but messy dataset of recipes labeled by real users. We covered the evolution of extracting recipes from the web: starting with structured data scraping, falling back to manual user labeling when that failed, and ultimately ending up with a trove of human-annotated HTML blocks marking **ingredients**, **directions**, **titles**, and more.

We also got your development environment set up and ran the script to validate and download a fresh set of HTML pages and label files. Now that you’ve got a folder full of recipe pages and your IDE is ready to run Python, it’s time to take the next step:

**Let’s train our first supervised learning model.**

In this post, I’ll show you how to run the training script, and then we’ll walk through the code and the results line by line. Along the way, I’ll demystify one of the key tools used to evaluate classification models: `classification_report` from scikit-learn.

Step one is to run the train.py script, this can be done either with one of presets I added launch.json ("Python Debugger: train limit 1000"), or you can run it from the command line (remember to activate your .venv before starting)

{% highlight bash %}
(.venv) \src>python train.py --limit=1000
{% endhighlight %}


You will see something like (this will take a little while, running it on the whole dataset takes a long time -- 

{% highlight bash %}
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
{% endhighlight %}


## The Code

### Loading and Preparing the Data

Although the code in the repo (once again at [Github Recipe Parser](https://github.com/kriserickson/recipe-parser/tree/blog-post-1)) is 
commented, I will be removing things like comments and logs to keep this as brief as possible.  Lets look at the train.py script and the function train.   The first real code we see is:

{% highlight python %}
X_raw, y = load_labeled_blocks(limit=limit)
{% endhighlight %}

This loads the labeled data, extracting structural information from each HTML element (such as the element's text content, its parent tag, and its depth in the DOM hierarchy). Why do we use X\_raw rather than x\_raw? It's a common convention in Machine Learning to use capital X for feature matrices and lowercase y for target variables or labels - not critically important, but you'll see this pattern frequently in ML code.  

Lets quickly look at load\_labeled\_blocks (I've removed not only the comments but also the code to display the progress).

{% highlight python %}
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

{% endhighlight %}


This code simply grabs and loads into memory all the JSON files (which has the ingredients, directions and title that users had previous extracted from the recipe) in the data/labels directory and all the HTML files (which obviously contain the recipe as posted to the web) in the data/html\_pages directory.  

The function parse\_html uses [Beautiful Soup](https://pypi.org/project/beautifulsoup4/) to extract a dictionary of the relevant elements of the html page (the text, parent tag, and depth). which we then pass (using only the text portion) to label_element to get the label for the block.

{% highlight python %}
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
{% endhighlight %}

Our label will be one of 4 things, "none" if it is not relevant to our recipe, "ingredient" if it is an ingredient, "direction" if it is a direction, and "title" if it is the title of the recipe (obviously enough) - these labels will be used in the training.

### Feature Extraction

Next, we extract features from the raw data. 

{% highlight python %}
X_features = extract_features(X_raw)
{% endhighlight %}

This is where we convert our text and HTML structure into "numerical" features that the model can understand.

{% highlight python %}
def extract_features(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  return [
    {
      "tag": el["tag"],
      "depth": el["depth"],
      "text_len": len(el["text"]),
      "starts_with_digit": el["text"][0].isdigit(),
      "comma_count": el["text"].count(","),
      "dot_count": el["text"].count("."),
      "raw": el["text"]
    }
    for el in elements
  ]
{% endhighlight %}

### Building the ML Pipeline

Before diving into our specific model, let me briefly explain what a scikit-learn pipeline is for those who aren't familiar.

A pipeline in scikit-learn is a way to chain together multiple processing steps into a single, cohesive workflow. Think of it as an assembly line: raw data enters at one end, passes through various transformations (preprocessing, feature extraction, scaling), and finally reaches the machine learning algorithm at the other end.

The main benefits of using pipelines include:
- **Cleaner code**: All your preprocessing steps stay organized in a single object
- **Prevention of data leakage**: Transformations are properly separated between training and test data
- **Simplified model deployment**: The entire workflow can be saved as one unit
- **Easy parameter tuning**: You can optimize parameters across all steps at once

In our recipe classifier, we'll build a pipeline that handles both text and structured features, scales the data appropriately, and feeds everything into our classification algorithm.

For our initial model we are going to just do very basic feature extraction, the tag that feature
exists in, the depth in the heirarchy of the HTML, the length of the text, whether it starts with a digit, and the number of commas and periods in the text and of course the raw text itself.  As we will see later, this is a very basic feature set, but it is enough to understand the idea of training and see where we will need improvement later.

Finally we are going to get into some actual machine learning code, the first thing we will split the data into training and testing sets.  We are using [scikit-learn](https://scikit-learn.org/stable/) (imported as sklearn) which is one of the most popular [Python libraries for machine learning](https://en.wikipedia.org/wiki/Scikit-learn).  The code to split the data is:

{% highlight python %}
X_train, X_test, y_train, y_test = 
    train_test_split(X_features, y, test_size=0.2, random_state=42)
{% endhighlight %}

This splits our data into 80% for training and 20% for testing. The `random_state` ensures that the split is reproducible (the 42 is a commonly used number in machine learning given that is the [meaning of life, the universe and everything](https://www.goodreads.com/book/show/11.The_Hitchhiker_s_Guide_to_the_Galaxy)), so you get the same results every time you run it.  You can try playing with these numbers, but until you understand the basics, I would recommend leaving them as is.

Next split both the training and testing data into features and text:

{% highlight python %}
X_train_proc = preprocess_data(X_train)
X_test_proc = preprocess_data(X_test)
{% endhighlight %}

The `preprocess_data` function converts the data into data structures that our model is going handle.  

### Under the Hood: How the Pipeline Processes Data

{% highlight python %}
def preprocess_data(features: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], str]]:
    features_wo_text, texts = split_features_and_text(features)
    combined = list(zip(features_wo_text, texts))
    return combined
{% endhighlight %}

The expression list(zip(features_wo_text, texts)) pairs each element from the features_wo_text list with the corresponding element from the texts list, creating a list of tuples. Each tuple contains one structured feature dictionary and its associated text string, preserving their order.  Next we create the model that we are going to train:

{% highlight python %}
model = make_pipeline(
  build_transformer(),
  ...
)
{% endhighlight %}

The build_transformer() function 

{% highlight python %}
def build_transformer() -> FeatureUnion:
    dict_vect = DictVectorizer(sparse=True)
    transformer = FeatureUnion([
        ("structured", make_pipeline(ItemSelector('structured'), dict_vect)),
        ("text", make_pipeline(ItemSelector('text'), TfidfVectorizer(max_features=500, ngram_range=(1, 2))))
    ])

    return transformer
{% endhighlight %}

returns a [FeatureUnion](https://scikit-learn.org/stable/modules/generated/sklearn.pipeline.FeatureUnion.html) (a tool for combining multiple feature extraction or transformation steps in parallel, and then concatenating their outputs into a single feature matrix).  This combines two parallel feature extraction pipelines: Structured features (dictionary-based features e.g., tag, depth, text length using [DictVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.DictVectorizer.html)) and Text features (text features using [TfidfVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)). ItemSelector is a class we create which is used to pick the right part (structured or text) from each input tuple.  This is a a fairly common text transformer that can be re-used with any text and structured data (for example for a book recommendation engine or a customer support ticket classification system).  We will be improving this in the future, but for now it demonstrates how to combine structured and text features to pass to our pipeline.

{% highlight python %}
model = make_pipeline(
  build_transformer(),
  StandardScaler(with_mean=False), 
  ...
)
{% endhighlight %}

Next, we apply [StandardScaler](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html) to normalize our feature values. This transformer standardizes features by scaling them to have unit variance, which is crucial for Logistic Regression to perform optimally. While other options exist (like MinMaxScaler, RobustScaler, or Normalizer), StandardScaler is particularly well-suited for LogisticRegression because it prevents certain features from dominating due to their scale. 

We set `with_mean=False` because our features are stored as a sparse matrix (many zeros). If we tried to center the data by subtracting the mean, we'd convert all those zeros to non-zero values, destroying the memory-efficient sparse representation and potentially causing memory issues with large datasets.

{% highlight python %}
model = make_pipeline(
  build_transformer(),
  StandardScaler(with_mean=False), # Add StandardScaler here
  LogisticRegression(max_iter=1000, class_weight='balanced')
)
{% endhighlight %}

Finally we add our classifier, in this case we are using a [Logistic Regression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html) for our model.  Despite the name, Logistic Regression is a classification algorithm, not a regression one. It models the probability that a given input belongs to a class.

At its core, it uses a logistic (known as a [sigmoid](https://en.wikipedia.org/wiki/Sigmoid_function)) function to squash the output of a linear model into a probability between 0 and 1.   The model outputs a probability, and you typically choose a threshold (e.g., 0.5) to decide the class label.

Logistic regression tries to find the best weights (w) and bias term (b) by minimizing the logistic loss function (also known as log loss or cross-entropy). These parameters define the decision boundary that separates different classes. If your features are not well-scaled, optimization may struggle to converge (hence why we are using the StandardScaler before this model).   

There are a bunch of options for the Logistical Regrssion classifier.  We are mostly using the default arguments, the solver [lbfgs (Limited-memory Broyden–Fletcher–Goldfarb–Shanno)](https://en.wikipedia.org/wiki/Limited-memory_BFGS) solver – there are other options \([liblinear](https://medium.com/@arnavr/scikit-learn-solvers-explained-780a17bc322d#44a4), [sag](https://medium.com/@arnavr/scikit-learn-solvers-explained-780a17bc322d#c6f4), [saga](https://medium.com/@arnavr/scikit-learn-solvers-explained-780a17bc322d#e28b), [newton-cg](https://medium.com/@arnavr/scikit-learn-solvers-explained-780a17bc322d#339a)\) but lbfgs is a good default for small to medium datasets.  We are also using the `class_weight='balanced'` option, which automatically adjusts weights inversely proportional to class frequencies in the input data. This helps with imbalanced datasets, where some classes have many more examples than others (like our "none" class).

Next we fit (train) the model:

{% highlight python %}
model.fit(X_train_proc, y_train)
{% endhighlight %}

Heres what happens when `model.fit` is executed:

### Step 1: build_transformer() – FeatureUnion*

This splits and processes the input sample in two parallel branches:

**Branch 1: "structured" pipeline (e.g.)**

This JSON

{% highlight json %}
{
    "tag": "div",
    "depth": 3,
    "text_len": 42,
    "starts_with_digit": False,
    "comma_count": 2,
    "dot_count": 1,
}
{% endhighlight %}

is sent to the DictVectorizer, which 

- Converts all values into numeric form:
- Categorical features (like "tag" or "starts_with_digit") are one-hot (sometimes called one-shot) encoded.  This transforms categorical variables into a format suitable for machine learning algorithms by converting them into binary vectors. For example, "tag" becomes:

{% highlight json %}
{
    "tag=div": 1.0,
    "tag=p": 0.0,
    "tag=span": 0.0
}
{% endhighlight %}
- Numeric fields are left as-is.

Which for the above example produces:

{% highlight json %}
[ comma_count=2.0, depth=3.0, dot_count=1.0, starts_with_digit=False=1.0, starts_with_digit=True=0.0, tag=div=1.0, tag=p=0.0, tag=span=0.0, text_len=42.0 ]
{% endhighlight %}

which as sparse matrix looks like:

{% highlight json %}
[2.0, 3.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 42.0]
{% endhighlight %}

**Branch 2: "text" pipeline**

Simply has the text from the element: 

*"3 large tomatoes, peeled and chopped."*

Branch 1 and Branch 2 get sent into the TfidfVectorizer.  Its role is to

-	Tokenizes text into words and bigrams (e.g., "3 large", "large tomatoes") (which is an [n-gram](https://en.wikipedia.org/wiki/N-gram) of 2)
-	Builds a vocabulary of the top 500 features
-	Computes [TF-IDF](https://en.wikipedia.org/wiki/Tf%E2%80%93idf#:~:text=In%20information%20retrieval%2C%20tf%E2%80%93idf,appear%20more%20frequently%20in%20general.) scores for this text
-	Output into a sparse vector that is the weights for tokenized [n-grams](https://en.wikipedia.org/wiki/N-gram):

{% highlight json %}
[0.18, 0.0, 0.11, 0.04, ...]
{% endhighlight %}

### Step 2: FeatureUnion

This takes the output vectors from both branches and concatenates them horizontally to create one combined sparse feature vector:

{% highlight json %}
[3.0, 42.0, 2.0, 1.0, 1.0, 0.0, ..., 0.18, 0.0, 0.11, 0.04, ...]
{% endhighlight %}

### Step 3: StandardScaler(with_mean=False)

The StadardScaler then computes the standard deviation for each feature (across all training samples)
 and scales each feature to unit variance.

{% highlight python %}
x_scaled = x / std
{% endhighlight %}

We do "with_mean=False" to avoid centering the data.  This is important because the data is still sparse.

### Step 4: LogisticRegression(...)

This actually trains a logistic regression model. It uses the scaled, combined feature matrix that it created in the previous phase of the pipeline. It then computes class probabilities using a sigmoid function (for binary classification) or softmax function (for multi-class problems like ours). These mathematical functions transform raw numeric predictions into probabilities between 0 and 1 - sigmoid squeezes a single score into a probability, while softmax converts multiple scores into a probability distribution where all classes sum to 1. As explained above, we use class_weight='balanced' to give more weight to minority classes since the none class is so dominant in our dataset.

Our model is now trained.  Now we test it on the test data:

{% highlight python %}
y_pred = model.predict(X_test_proc)
{% endhighlight %}

This uses the trained model to predict labels for the test set. The `predict` method applies the learned weights to the test features and outputs predicted class labels.

{% highlight python %}
print(classification_report(y_test, y_pred))

dump(model, MODEL_PATH)
{% endhighlight %}

Finally we output the classification_report and save the model to a file. The `classification_report` function computes precision, recall, F1-score, and support for each class in the test set, giving us a detailed view of how well our model performed (see below for more details on this).

Our first model is very small, clocking in at only 52KB and as we will see below, is only moderately successful at differentiating between the different classes.  But it is a start, and in upcoming posts we will improve upon it.

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

- **direction** – a block of text containing recipe directions
- **ingredient** – a block of text listing an ingredient
- **none** – not part of the recipe (ads, unrelated content, etc.)
- **title** – the recipe title

#### Columns: The Metrics

- **precision** – Of all the times the model *predicted* a block was of this type, how many were correct?   If we have high precision, we have few false positives.
- **recall** – Of all the blocks that *actually* were of this type, how many did the model find?   If we have a high recall, we have fewer false negatives.
- **f1-score** – The harmonic mean of precision and recall—this balances both metrics into one number.
- **support** – The number of true examples of this class in the test data. This shows if some classes are rare or common.

#### Overall Averages

At the bottom, you get 3 summary rows:

- **accuracy** – Overall fraction of correct predictions across all blocks.
- **macro avg** – Average of precision, recall, and F1 across all classes, treating all classes equally regardless of size.
- **weighted avg** – Like macro avg, but gives more weight to classes with more examples. This gives you a sense of how the model is doing "on average" in proportion to your data.

### A Quick Tour of Our First Results

#### `direction`

- **Precision 0.18** – lots of false positives.
- **Recall 0.68** – found many true directions.
- **F1-score 0.29** – this low F1-score reflects the poor balance between precision and recall—even though recall is decent, the many false positives are dragging performance down.

#### `ingredient`

- **Precision 0.24** – lots of false positives.
- **Recall 0.85** – very good at finding actual ingredients.
- **F1-score 0.38** – this F1-score indicates that while recall is strong, the poor precision means the model is still not reliably labeling ingredient blocks.

#### `none`

- **Precision 0.99** – very few false positives when predicting "none." This is because there are so many "none" blocks that precision is high — not because we are doing a fantastic job in itself but more because there are just so many none's in the document.
- **Recall 0.66** – it missed many actual "none" blocks. The model is cautious about declaring something "none," but often errs on the side of labeling it as recipe content.
- **F1-score 0.79** - a decent F1-score here—the model is reasonably strong at this dominant class, but we still want to improve recall to avoid contaminating recipe content with stray "none" labels.

#### `title`

- **Precision 0.07** - very poor precision.
- **Recall 0.86** - surprisingly high recall. The model is wildly overpredicting titles—lots of blocks are getting incorrectly labeled as "title."
- **F1-score 0.12** - a very low F1-score, showing that despite finding most true titles (high recall), the extreme overprediction makes this classification highly unreliable.

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

### Running predict on a recipe

Ok, now lets run the predict.py script to see how our model does on a real recipe.  You can run this from the command line, or you can use the launch.json file to run it in the debugger.  The command line version is:

{% highlight bash %}
(.venv) \src>python predict.py ../data/html/crab-cakes.html
{% endhighlight %}

and we get the rather uninspiring result of 

{% highlight json %}
{
  "title": "Maryland Crab Cakes",
  "ingredients": [
    "Pin",
    "Tweet",
    ",",
    "Success!",
    "(1116)",
    "Servings:",
    "Makes 6 large crab cakes",
    "Ingredients",
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
    "¼ teaspoon",
    "salt",
    "¼ cup",
    "2 tablespoons",
    "finely chopped fresh parsley",
    "1 pound",
    "½ cup",
    "panko",
    "Vegetable or canola oil, for cooking",
    "For the Quick Tartar Sauce",
    "1 cup",
    "mayonnaise, best quality such as Hellmann's or Duke's",
    "1½ tablespoons",
    "1 teaspoon",
    "Dijon mustard",
    "1 tablespoon",
    "minced red onion",
    "1-2 tablespoons",
    "lemon juice, to taste",
    "Salt and freshly ground black pepper, to taste",
    "For the Quick Tartar Sauce",
    "Note:",
    "Note:",
    "2 crab cakes",
    "Calories:",
    "299",
    "3 g",
    "9 g",
    "Sugar:",
    "1 g",
    "Fiber:",
    "1 g",
    "Protein:",
    "32 g",
    "Sodium:",
    "1141 mg",
    "275 mg",
    "— Margaret Barclay on April 30, 2025",
    "— Jennifer Segal on April 22, 2025",
    "— Sandra Dee on April 13, 2025",
    "*",
    "*",
    "*",
    "Show all",
    "Pin",
    "Tweet",
    "Welcome",
    "-",
    "Instagram",
    "Amazon",
    "Deviled Eggs",
    "Chicken Marsala",
    "0",
    "close",
    "Offline"
  ],
  "directions": [
    "By",
    ".",
    ", and",
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
    "Add",
    "By",
    "30 Minutes",
    "10 Minutes",
    "40 Minutes",
    ", plus at least 1 hour to let the crab cakes set",
    "For the Crab Cakes",
    "finely diced celery, from one stalk",
    "Instructions",
    "For the Crab Cakes",
    "Line a baking sheet with aluminum foil for easy clean-up.",
    "Combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a large bowl and mix well. Add the crab meat (be sure to check the meat for any hard and sharp cartilage) and panko; using a rubber spatula, gently fold the mixture together until just combined, being careful not to shred the crab meat. Shape into 6 cakes (each about ½ cup) and place on the prepared baking sheet. Cover and refrigerate for at least 1 hour. This helps them set.",
    "Preheat a large nonstick pan over medium heat and coat with oil. When the oil is hot, place the crab cakes in the pan and cook until golden brown, 3 to 5 minutes per side. Be careful as oil may splatter. Serve the crab cakes warm with the tartar sauce.",
    "In a small bowl, whisk together the mayonnaise, relish, mustard, onion, and lemon juice. Season with salt and pepper, to taste. Cover and chill until ready to serve.",
    "Make-Ahead Instructions:",
    "If you can only find jumbo lump crab meat, you may need to break the pieces up a bit. If the clumps are too large, the crab cakes won't hold together well.",
    "The nutritional information does not include the tartar sauce.",
    "Pair with",
    "Cornbread Muffins",
    "Powered by",
    "Cholesterol:",
    "If you want to use Half the crab, I’d cut all of the ingredients in half.",
    "This site uses Akismet to reduce spam.",
    "More Ideas",
    "Notifications",
    "Sign in",
    "Sign in"
  ]
}
{% endhighlight %}

So we got the title, but we have **way** too many false positives on the ingredients and the directions (though all the ingredients are in the ingredients tag, and all the directions are in the directions tag).  We are going to have to a fair bit to improve this model.

### Next Steps

In the next phase, we’ll:

- Refine feature engineering
- Add balancing to give equal attention to minority classes
- Investigate why categories like "title" are being so heavily misclassified

We have what would could call "Supervised Machine Learning", it's not very good, but it is a start. Now the real tuning (and fun) begins. Stay tuned!

*I'd like to thank [Hussein Jafferjee](https://github.com/inssein) for doing some last-minute proof-reading and making some very helpful suggestions on what to clarify in this article*
