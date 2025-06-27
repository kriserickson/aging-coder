---
layout: post
category: AI
title: "Experiments in Supervised Learning Part 4"
imagefeature: 
description:
draft: true
tags: ["Programming", "ML", "Supervised Learning", "AI"]
---

### Speeding up the Training Loop

Since we are going to be evaluating models rather than tuning based on the features, lets save us 30 seconds
a run and serialize those features.  We will use the pickle serialize our data, you can follow along by doing

```bash
git checkout post-4-part-1
```

We have put a check to see if the pickled file exists at the top of load_labeled_blocks in train.py

```python
cache_file = os.path.join(CACHE_DIR, f"labeled_blocks_limit_{limit}.pkl")

if os.path.exists(cache_file):
    with open(cache_file, "rb") as f:
        return pickle.load(f)
```

If it doesn't exist, we label the blocks as usual, but at the end we save the labeled blocks with

```python
with open(cache_file, "wb") as f:
    pickle.dump((X, y), f)
```


Since we are going to eventually be running this as a service, we are going to want to keep an eye on the memory 
use of our prediction, so I have also added memory profiling as well as the time to run the model in predict.py.  


With our LogisticalRegression classifier (run against the entire dataset) we get:

```text
Evaluating...
              precision    recall  f1-score   support

   direction       0.63      0.77      0.69     10196
  ingredient       0.72      0.88      0.79     21496
        none       0.98      0.97      0.98    422226
       title       0.57      0.62      0.60      4308

    accuracy                           0.96    458226
   macro avg       0.73      0.81      0.76    458226
weighted avg       0.96      0.96      0.96    458226

Model saved to model.joblib with a size of 0.053 MB
```

And when we run predict on it, we have pretty good results, but not perfect.

```text
python.exe predict.py --memory ../data/html/crab-cakes.html 
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
    "Next, make the tartar sauce by combining the mayonnaise, Dijon mustard, sweet pickle relish, red onion, lemon, salt, and pepper in a small bowl.",
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
Peak memory from tracemalloc: 7.85 MB
Total memory usage from psutil: 158.40 MB
Memory increase: 15.11 MB
️Total time: 0.35s
```

We have black-boxed the ML pipeline so far, using what would be generally thought of as the default Transformer and 
Classifier for supervised learning with labels, but now let's learn a little more about the Transformer and Classifier.  

### Our Transformer

Our transformer

```python
transformer = FeatureUnion([
    ("structured", make_pipeline(ItemSelector('structured'), dict_vect)),
    ("text", make_pipeline(ItemSelector('text'), TfidfVectorizer(max_features=500, ngram_range=(1, 2))))
])
```

Our FeatureUnion is a way of taking the structured data (which we have spent a lot of time talking about in the previous
articles: labeling, balencing et al.), and pushing it to a 
[TfidfVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html)
with the first half being the features (structured) and the second half being the text (see the ItemSelector we wrote)

```python
class ItemSelector(BaseEstimator, TransformerMixin):
    def __init__(self, key: str):
        self.key = key

    def fit(self, X: List[Any], y: Any = None) -> 'ItemSelector':
        return self

    def transform(self, X: List[Tuple[Dict[str, Any], str]]) -> List[Union[Dict[str, Any], str]]:    
        if self.key == 'structured':
            return [x[0] for x in X]  # structured features (dict)
        elif self.key == 'text':
            return [x[1] for x in X]  # text field
        else:
            raise ValueError(f"Unknown key: {self.key}")
```

TF-IDF stands for [Term Frequency-Inverse Document Frequency](https://en.wikipedia.org/wiki/Tf%E2%80%93idf). 
It converts a collection of raw text documents into a matrix of numerical features. Each feature represents how 
important a word (or phrase) is in a document relative to all documents by computing how often the 
[ngram](https://en.wikipedia.org/wiki/N-gram) appears in the document (the TF or Term Frequency) and how rare 
that same ngram is (IDF or Inverse Document Frequency). It multiplies TF and IDF for each word in each document, so common
and unimportant words (like "the," "and") are down-weighted, and rare, discriminative words are up-weighted.  This 
is the NLP or Natural Language Processing we are doing the document.

What the max_features does is limit the number of ngrams we track, so only the most 500 (in our case) ngrams are tracked.  We
limit the number of tracked ngrams to keep the space down but also prevent [overfiting](https://www.ibm.com/think/topics/overfitting)

The ngram_range is the size of our ngram, we are allowing ngrams of size 1 (unigram) or 2 (bigram).  

### Our Classifier

```python
model = make_pipeline(
    build_transformer(),
    StandardScaler(with_mean=False),
    LogisticRegression(solver='lbfgs', max_iter=1000)
)
```

We are currently using a [LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html) 
classifier, with the [lbfgs](https://en.wikipedia.org/wiki/Limited-memory_BFGS) solver.   But what is a LogisticalRegression
classifier?  Well, despite the name, it’s used for *classification*, not regression.  It models the probability (0 to 1) 
that a given input belongs to a class using a [sigmoid](https://en.wikipedia.org/wiki/Sigmoid_function) 

$$
\sigma(x) = \frac{1}{1 + e^{-x}}
$$

for the formulae: 

$$
P(\text{c}=1 \mid x) = \sigma(w_1 x_1 + w_2 x_2 + \ldots + w_n x_n + b)
$$

Where the x are the TF-IDF features, and the weights are generated by the solver for each word, as is the final bias which
is added to the weighted sum of all the features.  The bias acts like a baseline probability - if all features are 
zero, what is the starting chance?

But what about the solver, we have said it generates the weight and bias - but how does it do that?  It does this by
finding the minimum loss (measure of wrongness) - all the solvers do this.

**How Does It Work?**
1) Start with initial guesses for all parameters (weights and bias), often zero, or random small numbers.
2) Compute the loss (e.g., “How far off are my predictions?”).
3) Compute the gradient (i.e., “If I change each parameter a little, how does the loss change?”).
4) Figure out a direction to step in for each parameter to make the loss go down, using information 
   about the curvature of the loss function (second derivatives, also called the Hessian).
5) Update all parameters in a way that’s smarter and usually faster than just following the steepest
   descent (simple gradient descent).
6) Repeat steps 2-5 until the changes are tiny (the model is “converged”), or you reach a max number of steps.

How exactly does lbfgs do this?  That is math above my understanding of calculus and linear algebra, but as long
as we understanding what it is doing we don't really need to understand exactly how it does it, but if you want a much
deeper explanation of Solvers look at [Scikit-learn solvers explained](https://medium.com/@arnavr/scikit-learn-solvers-explained-780a17bc322d).  
I tried swapping out the various solvers (liblinear, [newtoncg](https://en.wikipedia.org/wiki/Newton%27s_method), 
[newton-cholesky](https://en.wikipedia.org/wiki/Cholesky_decomposition)) and they produced the same results but were
either or slower or used a lot more memory (sag and saga never worked on the small dataset, as expected, but I wasn't
patient enough after waiting a couple of hours for it work on the full dataset).

### RandomForestClassifier

Let's try changing the classifier, we are going to use the 
[RandomForestClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html).

```bash
git checkout post-4-part-2
```

and see we just changed the classifier (we no longer need the StandardScaler as the RandomForestClassifier accepts
sparse data):

```python
print("Training model...")
model = make_pipeline(
    build_transformer(),
    RandomForestClassifier(random_state=42)
)
```

And if we train our model, we see some pretty big improvements. 

```text
Evaluating...
              precision    recall  f1-score   support

   direction       0.62      0.85      0.72       885
  ingredient       0.74      0.94      0.83      1726
        none       0.99      0.97      0.98     39269
       title       0.68      0.70      0.69       396

    accuracy                           0.96     42276
   macro avg       0.76      0.86      0.80     42276
weighted avg       0.97      0.96      0.97     42276

Model saved to model.joblib with a size of 94.519 MB
```

but yikes, we have gone from 50kb model to an almost 100 meg model.  And if we train the entire dataset we will see
it balloon to over 2Gigs.  

So what is a RandomForestClassifier?  It is very different from the LogisticalRegression classifier, and is an ensemble 
learning method that builds many decision trees and combines their results to make a prediction. 
In classification, it works by having each tree “vote” for a class, and the majority wins.

In the training phase it builds many (100s to 1000s) decision trees.  Each tree is trained on a random sample of your 
data (bagging), and at each split, only considers a random subset of features (feature randomness) which ensures trees 
are diverse.

In the prediction phase it runs through each tree, which produces a prediction.  The prediction that the most trees
predict becomes chosen as the final prediction (if you want you can get probabilities of each label, not just a single
prediction), but we have not implemented that and are just using simple predictions.

Unfortunately this improved accuracy comes at a high cost of disk space and memory usage of the prediction program.  While
we can tune the models size by adjusting some of the parameters.  

The first being the number of prediction trees we are going to create, I tried setting it to 200 and doubled the
size of the model.  Setting this to 100 produced a model of the same size, and setting it 75 produced a smaller model
without much loss of accuracy (our directions got ever so slightly worse):

```text
             precision    recall  f1-score   support

   direction       0.61      0.84      0.71       885
  ingredient       0.74      0.95      0.83      1726
        none       0.99      0.97      0.98     39269
       title       0.68      0.70      0.69       396

    accuracy                           0.96     42276
   macro avg       0.76      0.87      0.80     42276
weighted avg       0.97      0.96      0.97     42276

Model saved to model.joblib with a size of 70.981 MB
```

Next we try adjusting the max_depth, which produces much shallower trees, but produces meaningful size decrease without
too much accuracy loss.  With just reducing the max_depth to 20, and undoing n_estimator we create a model of only 
19 MB without too much loss of accuracy.

```text
              precision    recall  f1-score   support

   direction       0.62      0.75      0.68       885
  ingredient       0.74      0.87      0.80      1726
        none       0.98      0.98      0.98     39269
       title       0.79      0.35      0.49       396

    accuracy                           0.96     42276
   macro avg       0.78      0.74      0.74     42276
weighted avg       0.96      0.96      0.96     42276

Model saved to model.joblib with a size of 19.052 MB
```

If we set min_samples_leaf to 2 (which sets the minimum number of samples that must be present in a leaf node of a
decision tree), we can get some gains without too accuracy loss. 

```text
              precision    recall  f1-score   support

   direction       0.61      0.79      0.69       885
  ingredient       0.74      0.91      0.82      1726
        none       0.99      0.97      0.98     39269
       title       0.75      0.59      0.66       396

    accuracy                           0.96     42276
   macro avg       0.77      0.82      0.79     42276
weighted avg       0.97      0.96      0.96     42276

Model saved to model.joblib with a size of 33.110 MB
```

By meshing all these together we can get the size down to a modest 13.3MB without loosing too much accuracy:

```python
    model = make_pipeline(
        build_transformer(),
        RandomForestClassifier(random_state=42, min_samples_leaf=2, n_estimators=80, max_depth=25),
    )
```

which produces:

```text
              precision    recall  f1-score   support

   direction       0.63      0.77      0.69       885
  ingredient       0.73      0.89      0.80      1726
        none       0.98      0.97      0.98     39269
       title       0.78      0.46      0.58       396

    accuracy                           0.96     42276
   macro avg       0.78      0.77      0.76     42276
weighted avg       0.96      0.96      0.96     42276

Model saved to model.joblib with a size of 13.337 MB
```

which is a reasonable trade off for accuracy and size and we probably aren't going to do much better than this.


### ExtraTreesClassifier

Another classifier is the ExtraTreesClassifier, we won't spend too much time on it because it produces very large
models.   The ExtraTreesClassifier (short for Extremely Randomized Trees) is an ensemble learning method that is
very similar to the RandomForestClassifier, but with a unique twist on how it builds its trees in that each tree is
built on a random subset of the data (like random forest, via bootstrapping).  The key difference between it and
RandomForest is at each split, it chooses splits (thresholds) completely at random from possible splits,
rather than searching for the most optimal split among a subset of features.


```python
model = make_pipeline(
    build_transformer(),
    ExtraTreesClassifier(random_state=42),
)
```

However, given its initial size we won't even bother trying to tune it down to reasonable size, I only
include it here as an example of another supervised learning classifier.

```text
              precision    recall  f1-score   support

   direction       0.59      0.85      0.70       885
  ingredient       0.72      0.94      0.82      1726
        none       0.99      0.97      0.98     39269
       title       0.64      0.72      0.68       396

    accuracy                           0.96     42276
   macro avg       0.74      0.87      0.79     42276
weighted avg       0.97      0.96      0.96     42276

Model saved to model.joblib with a size of 198.425 MB
```

### GradientBoostingClassifier

The GradientBoostingClassifier is another decision tree classifier, where each new tree tries to correct the mistakes
made by the combination of all previous trees.  It’s a form of boosting: instead of combining many weak learners 
(trees) in parallel like RandomForestClassifier, it builds them sequentially - each tree “boosts” the ensemble’s performance.

Its out-of-the box performance is quite strong:

```bash
git checkout post-4-part-3
```

While it takes considerably longer, it gets as good or better results than the RandomForestClassifier in only a 1/2 a MB.

```text
              precision    recall  f1-score   support

   direction       0.61      0.76      0.68       885
  ingredient       0.72      0.90      0.80      1726
        none       0.99      0.97      0.98     39269
       title       0.66      0.58      0.62       396

    accuracy                           0.96     42276
   macro avg       0.74      0.80      0.77     42276
weighted avg       0.96      0.96      0.96     42276

Model saved to model.joblib with a size of 0.522 MB
```

by cranking up the max_depth to 7 (from the default of 5), 

```python
model = make_pipeline(
    build_transformer(),
    GradientBoostingClassifier(random_state=42, max_depth=7),
)
```

we can improve the GradientBoostingClassifier even more at the expense of a few megabytes of the model size:

```text
              precision    recall  f1-score   support

   direction       0.62      0.82      0.70       885
  ingredient       0.74      0.92      0.82      1726
        none       0.99      0.97      0.98     39269
       title       0.60      0.67      0.64       396

    accuracy                           0.96     42276
   macro avg       0.74      0.85      0.78     42276
weighted avg       0.97      0.96      0.96     42276

Model saved to model.joblib with a size of 3.403 MB
```

### HistGradientBoostingClassifier

The [HistGradientBoostingClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingClassifier.html)
is another gradient boosting classifier like GradientBoostingClassifier, but it employs s a special trick: 
feature binning to make training much faster and more memory-efficient.  We do have to make
a couple of changes to the code to get it working thought. First, add the Densify class to 
feature_extraction.py (we will need to import it in both train.py and predict.py).

```bash
git checkout post-4-part-4
```

```python
class Densify(TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X, y=None):
        return X.toarray()
```

Then add it to the imports:

```python
from feature_extraction import extract_features, build_transformer, preprocess_data, get_section_header, Densify
```

and use the HistGradientBoostingClassifier in our pipeline:

```python
model = make_pipeline(
    build_transformer(),
    Densify(),
    HistGradientBoostingClassifier(
        random_state=42
    )
)
```

and add the import to our predict.py (if you actually want to run the predict - the class gets instantiated when your
model loads).

Now if we run the class we can see that this produces the best results yet, in a managable 2.4MB.

```text
              precision    recall  f1-score   support

   direction       0.62      0.84      0.71       885
  ingredient       0.73      0.93      0.82      1726
        none       0.99      0.97      0.98     39269
       title       0.65      0.74      0.69       396

    accuracy                           0.96     42276
   macro avg       0.75      0.87      0.80     42276
weighted avg       0.97      0.96      0.97     42276

Model saved to model.joblib with a size of 2.253 MB
```

There are more classifiers to try 

- **[LinearSVC](https://scikit-learn.org/stable/modules/generated/sklearn.svm.LinearSVC.html)**  is another Linear Model simliar to LogisticRegression)
- **[DecisionTreeClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeClassifier.html)** simple, fast, Tree-based model for small datasets.
- **[XGBoost](https://en.wikipedia.org/wiki/XGBoost)** Another Gradient Boosting modifier, which is considered more "State of the Art".  Not part of the scikit-learn and a little more complex to get going, but I found that it actually performed a bit worse than both GradientBoostingClassifier and HistGradientBoostingClassifier. 
- **[MLPClassifier](https://scikit-learn.org/stable/modules/generated/sklearn.neural_network.MLPClassifier.html)** A neural network classifier that would require a lot more tuning to get it working (Look at the number of configuration options it supports) but would be a fun experiment.

**Things to try**

- See if you can get even better results within a reasonable size with the HistGradientBoostingClassifier.
- Try getting XGBoost or the MLPClassifier working.
- Try adjusting the parameters of the TfidfVectorizer (max_feature and ngram_range) to see if it improves our accuracy 
and/or increases the size of our model.


### Expanding to the Full Training Set

Running our Histor on the full training set gives us similar results to 

```text
              precision    recall  f1-score   support

   direction       0.64      0.84      0.73     10196
  ingredient       0.74      0.92      0.82     21496
        none       0.99      0.97      0.98    422226
       title       0.62      0.73      0.67      4308

    accuracy                           0.96    458226
   macro avg       0.75      0.86      0.80    458226
weighted avg       0.97      0.96      0.96    458226

Model saved to model.joblib with a size of 1.799 MB
```

### Final Code Improvements - Post Processing

We have a few little issues still, occasional we get things like "Sugar: 1 g" or "Carbohydrates: 9 g" in our ingredients - we
see this 29,758 times in our dataset, so it would be helpful to remove this as a false ingredient. We also get things like
"For the Crab Cakes", "For the Tartar Sauce" (this happens 4316 times in our data-set so it is also worth removing).
This is best handled with post-prediction cleanup, there is no need to retrain the model to handle these cases.

```bash
git checkout post-4-part-5
```

We just adjust our predict.py file by adding the following:

```python
SECTION_HEADING_PATTERN = re.compile(
    r"^for the ",
    re.IGNORECASE,
)

NUTRITION_PATTERN = re.compile(
    r"^(calories|fat|saturated fat|carbohydrates|sugar|fiber|protein|sodium|cholesterol)[:\\-]\s*\d+",
    re.IGNORECASE,
)

def is_fake_ingredient(text):
    text = text.strip()
    if SECTION_HEADING_PATTERN.match(text):
        return True
    if NUTRITION_PATTERN.match(text):
        return True
    return False
```

And we adjust our extract_structured_data function by checking to see if we are a fake ingredient before
adding it to our list of ingredients.

```python
    structured = {"title": None, "ingredients": [], "directions": []}
    for el, label in zip(elements, predictions):
        text = el["text"]
        if label == "title" and structured["title"] is None:
            structured["title"] = text
        elif label == "ingredient":
            if is_fake_ingredient(text):
                continue
            structured["ingredients"].append(text)
```

**Why is post-processing the best way to filter “For the ”/nutritional info as ingredients?**

These lines are “UI/UX artifacts” not “data artifacts” For the Topping”, “For the Sauce”, and “Calories: 200” are 
not actual ingredients, but section markers or footnotes written for humans.  Their form (often <li>, styled to look like
an ingredient) tricks both humans and ML models into treating them as ingredients.  

They are rare, formulaic, and easy to spot with rules as they follow extremely predictable patterns 
(e.g., “For the ...”, or “Calories: ...”) where you can regex or string-match rules will catch 99% of them with 
minimal code.

It’s risky to change your training labels for these lines, as you’d have to manually relabel hundreds/thousands of 
recipe files, which is labor-intensive and error-prone.  You risk inconsistency—some recipes may have these lines as
“ingredient” in your old training data, others not.  Even if you relabel, your model may still mispredict these 
lines (because their features can be nearly indistinguishable from a true ingredient, especially in a generic pipeline).

You want your model to generalize, not memorize quirks If you tell your model “never predict ingredient if the text is
‘For the X’,” it may start missing legit ingredient lines in future formats or new sites.  Instead, keep your model
focused on the “core” classification (is this generally an ingredient?).

Post-processing is fast, explainable, and robust.  By adding/removing patterns is as easy as editing a regex/list in
your code—no retraining needed.  If a false positive slips through, it’s trivial to add it to the filter, without 
any risk to your ML logic.

**Things to try**
- Test some recipes from the data_html ```python src/predict.py --memory ../data/html_pages/recipe_00004.html```, and try
 a bunch more.  Do you see any other artifacts you could remove with post processing (something like direction or
 ingredient doubling).
- Look at ```python src/predict.py --memory ../data/html/recipe_00038.html```, the title that gets extracted is wrong, it
says "Gluten-Free Chocolate Cake Cookies" instead of "Gluten-Free Angel Food Cake Recipe", is this best fix by fixing
the model, or Post Processing?

### Creating a Prediction Service

OK, so we have our model working pretty well.  Lets make it available with a simple web service.  

```bash
git checkout post-4-part-6
```

For this we are going to have to slightly change our predict.py and the extract_structured_data function.  We are not
going to want to load the model for every request (as this would dramatically slow down own webservice) 
so instead of loading the model in the extract_structed_data function, we are going to pass it in.  We also are no
longer going to load the html file here, but pass in the text of the html file so our predict service can use it.  So
our main service becomes:

```python

recipeModel = load(MODEL_PATH)
html = Path(args.html_path).read_text(encoding="utf-8")

result = extract_structured_data(html, recipeModel)
print(json.dumps(result, indent=2, ensure_ascii=False))
```

and our extract_structured_data function is actually simplified:

```python
 elements = parse_html(html)
all_features = []
current_section_heading = None  # Track current section heading
for idx, el in enumerate(elements):

    current_section_heading = get_section_header(current_section_heading, el)

    features = extract_features(el, idx, elements, current_section_heading)
    all_features.append(features)

data = preprocess_data(all_features)

predictions = model.predict(data)
```

Next, we need to add some libraries to our requirements file.   I have decided to use [FastAPI](https://fastapi.tiangolo.com)
for this service as it is fast, terse and modern and the go-to when starting a greenfield Python web-service (not that there is 
anything particularly wrong with [Flask](https://flask.palletsprojects.com/en/stable/) other than it takes some work to make it async).
Also we need to add [Uvicorn](https://www.uvicorn.org) which will act as an [ASGI](https://en.wikipedia.org/wiki/Asynchronous_Server_Gateway_Interface)
for FastAPI, basically acting as web-server that listens on the port you specify and runs our exposed FastAPI endpoints in 
a fast, async fashion.  Finally, we need to add [python-multipart](https://pypi.org/project/python-multipart/) because we
are going to send web page as file for simplicity and robustness. 

```text
fastapi~=0.115.14
uvicorn~=0.34.3
python-multipart~=0.0.20
```

Once we have updated the requirements with PIP, the web-service itself is very simple (thanks FastAPI):

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from joblib import load

from predict import extract_structured_data
from config import MODEL_PATH

# PRELOAD model at startup
recipeModel = load(MODEL_PATH)

app = FastAPI()

@app.post("/predict")
async def predict(html: UploadFile = File(...)):
    html_text = (await html.read()).decode("utf-8")
    result = extract_structured_data(html_text, recipeModel)
    return JSONResponse(result)
```

First, we can see our API by going to [http://127.0.0.1:8000/docs].  Next we can test the endpoint with curl:

```bash
curl -X POST -F "html=@data\html\crab-cakes.html" http://127.0.0.1:8000/predict
```

and we will see

```bash
$ curl -X POST -F "html=@data\html\crab-cakes.html" http://127.0.0.1:8000/predict 
{"title":"Maryland Crab Cakes","ingredients":["2 large eggs","2½ tablespoons mayonnaise, best quality such as Hellmann's or Duke's","1½ teaspoons Dijon mustard","1 teaspoon Worcestershire sauce","1 teaspoon Old Bay seasoning","¼ teaspoon salt","¼ cup finely diced celery, from one stalk","2 tablespoons finely 
chopped fresh parsley","1 pound lump crab meat (see note below)","½ cup panko","Vegetable or canola oil, for cooking","1 cup mayonnaise, best quality such as Hellmann's or Duke's","1½ tablespoons sweet pickle relish","1 teaspoon Dijon mustard","1 tablespoon minced red onion","1-2 tablespoons lemon juice, to t
aste","Salt and freshly ground black pepper, to taste"],"directions":["To begin, combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a bowl.","Mix well to combine.","Add the crab meat, making sure to check for any hard and sharp cartilage as you go, along with th
e panko.","Shape into 6 large cakes about ½ cup each, and place on a foil-lined baking sheet for easy cleanup. Then cover and refrigerate for at least 1 hour. This step is really important to help the crab cakes set, otherwise they may fall apart a bit when you cook them.","Preheat a large nonstick pan to med
ium heat and coat with oil. When the oil is hot, place crab cakes in the pan and cook until golden brown, about 3 to 5 minutes.","Flip and cook 3 to 5 minutes more, or until golden. Be careful as the oil may splatter.","Next, make the tartar sauce by combining the mayonnaise, Dijon mustard, sweet pickle relis
h, red onion, lemon, salt, and pepper in a small bowl.","Whisk well, then cover and chill until ready to serve.","Line a baking sheet with aluminum foil for easy clean-up.","Combine the eggs, mayonnaise, Dijon mustard, Worcestershire, Old Bay, salt, celery, and parsley in a large bowl and mix well. Add the cr
ab meat (be sure to check the meat for any hard and sharp cartilage) and panko; using a rubber spatula, gently fold the mixture together until just combined, being careful not to shred the crab meat. Shape into 6 cakes (each about ½ cup) and place on the prepared baking sheet. Cover and refrigerate for at lea
st 1 hour. This helps them set.","Preheat a large nonstick pan over medium heat and coat with oil. When the oil is hot, place the crab cakes in the pan and cook until golden brown, 3 to 5 minutes per side. Be careful as oil may splatter. Serve the crab cakes warm with the tartar sauce.","In a small bowl, whis
k together the mayonnaise, relish, mustard, onion, and lemon juice. Season with salt and pepper, to taste. Cover and chill until ready to serve.","Make-Ahead Instructions: The crab cakes can be formed, covered, and refrigerated a day ahead of time before cooking. The tartar sauce can be made and refrigerated up to 2 days in advance.","Note: If you can only find jumbo lump crab meat, you may need to break the pieces up a bit. If the clumps are too large, the crab cakes won't hold together well.","Note: The nutritional information does not include the tartar sauce."]}
```

We can then look at putting it in a Docker container

```docker
# Use a slim Python image for smaller size
FROM python:3.11-slim

# Set workdir
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies (including build tools for wheels)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get remove -y gcc && \
    apt-get autoremove -y && \
    apt-get clean

# Copy your source code and model
COPY . .

# (Optional) Set environment variables for Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Expose port (Uvicorn will use this)
EXPOSE 8000

# Default: use Gunicorn + UvicornWorker for production
CMD ["gunicorn", "predict_service:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

or if you want to run it on your own VPS, you can run it under Nginx (you probably want to set up systemd or 
supervisord to make sure the Uvicorn process is always running) but how you want to serve your API is up to you.

**Things to try**
- Try setting up the service to run somewhere in the internet (whether in a Docker container, on a VPS, through
a cloud service).
- This service clearly isn't production ready, there is no logging, no error handling, and no API Keys or rate
limiting.  For adding basic authentication can just use [fastapi.security](https://fastapi.tiangolo.com/tutorial/security/) 
or use something like [python-jose](https://python-jose.readthedocs.io/en/latest/) for JWT tokens.  To do rate limiting
you are going to need some kind of a backing store (probably [Valkey](https://github.com/valkey-io/valkey) or
[Redis](https://redis.io)) and a library like [slowapi](https://github.com/laurentS/slowapi) or 
[fastapi-limiter](https://github.com/long2ice/fastapi-limiter).

### Summary

## Summary

In Part 4, a deep dive is taken into evaluating and optimizing different supervised learning classifiers for the recipe
parsing task. The training pipeline is improved with pickling for faster feature loading, and memory profiling is 
introduced to monitor resource usage.

A variety of scikit-learn classifiers are systematically explored and compared, including:

* **LogisticRegression:** A small model size is achieved, with fast results but less accuracy.
* **RandomForestClassifier:** A big jump in accuracy is gained, but at the cost of dramatically increased model size and memory usage.
* **ExtraTreesClassifier:** Models even bigger than Random Forest are produced, with little gain for this use-case.
* **GradientBoostingClassifier:** High accuracy is achieved in a tiny model, though at the cost of training time.
* **HistGradientBoostingClassifier:** The best trade-off of accuracy and model size is delivered using efficient feature binning.

For each model, it is shown how to tune key hyperparameters (like number of trees, depth, and minimum samples per leaf) to 
strike a balance between accuracy and resource usage.

Practical productionization tips are also covered:

* **Post-processing:** Simple regex rules are used to filter out “fake” ingredients and section headings (like 
nutritional info and section titles) after prediction, and reasons are given for why post-processing is more effective
than retraining the model for these quirks.
* **Serving the Model:** Steps are provided for building a FastAPI web service that loads the model once at startup 
for efficient predictions, with instructions for deploying the API with Docker or on a VPS with systemd/supervisord and Nginx.
* **Further Improvements:** Suggestions are made for adding authentication, rate limiting, and logging to make the 
service more robust.

---

## Brief Summary of the Entire Series

Over the four parts, we have covered:

1. **Dataset Creation & Labeling:** Methods are shown for gathering and labeling recipe data, turning messy 
web-scraped HTML into structured blocks annotated as titles, ingredients, directions, or “none.”
2. **Feature Engineering & Preprocessing:** Guidance is given on designing and balancing features so that machine 
learning models can learn to distinguish recipe sections, with detailed Python code examples.
3. **Initial Model Training & Evaluation:** Baseline models are built and evaluated using scikit-learn, with 
classification metrics like precision, recall, and F1-score interpreted.
4. **Advanced Model Comparison & Deployment:** A thorough comparison of advanced classifiers, hyperparameter 
tuning, post-processing to handle edge cases, and, finally, serving the trained model as a robust web API are all
demonstrated.

While this started as a what if supervised learning was as easy as it is now 10 years ago, how would I have written 
a better parser for my Recipe Folder website, it ended up being, in my opinion,  I learned a lot writing these 
articles and I hope (since you have made it this far) that you have learned something too.
