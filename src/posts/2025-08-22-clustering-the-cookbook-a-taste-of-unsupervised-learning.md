---
layout: post
category: Programming 
title: "Clustering the Cookbook: A Taste of Unsupervised Learning"
imagefeature:
description: 
draft: true
tags: ["Programming", "ML", "Unsupervised Learning", "AI"]
---
## Introduction to Unsupervised Learning

[Unsupervised learning](https://www.ibm.com/think/topics/unsupervised-learning) refers to the class of machine learning methods that find patterns in unlabeled data without any predefined targets or categories.  Unlike [supervised learning](https://www.ibm.com/think/topics/supervised-learning) (see the [previous series on supervised learning](/posts/2025-06-13-experiments-in-supervised-learning), where models learn from labeled examples, unsupervised algorithms discover hidden structures in the data on their own. Common goals of unsupervised learning include clustering (grouping similar data points together) and dimensionality reduction (compressing data features while retaining important information).  This post will focus on clustering, and we can use the Recipe Folder database to suggest recipes with similar ingredients to other recipes.  Basically we want to be able to send a recipe name, and then suggest recipes that have similar ingredients. 

** What we are going to do **
- Offline modeling: Use a Jupyter notebook for data loading and heavy preprocessing (text cleaning, vectorization, clustering) using scikit-learn (e.g., TfidfVectorizer, KMeans).
- Recipe embeddings: Represent each recipe by a TF‑IDF vector derived from its ingredients, so that recipes with many common ingredients end up with similar vectors.
- Clustering: Apply an unsupervised clustering (KMeans) on these vectors to group similar recipes. Recipes in the same cluster will hopefully share key ingredients, which helps organize the search space.
- Semantic search API: Build a FastAPI endpoint that loads the trained vectorizer and cluster model. Given a query recipe name, the API will vectorize the query and use cosine similarity to find recipes with very different names but similar ingredients. Because the search is done in this vector space, we don’t require exact keyword matches – e.g. “butternut soup” will still match “butternut squash soup” or “pumpkin soup” if those recipes have overlapping ingredients, even if the titles differ.
- Also, since we haven't really dived into them before, we are going to use a Jupyter Notebook to build the models and data that we will use to build another FastAPI endpoint that takes a recipe name and returns a list of recipes that have similar ingredients.

If none of the above makes any sense to you now, don't worry, it should all be clear by the end of this article.

### Jupyter Notebooks

If you are familiar with Jupyter notebooks you can skip this section, but if you are a newcomer to python and aren't quite sure about them -- read on.  

Why are they so darned useful?  First of all, you can easily inject markup into it to document it a little more clearly (some IDEs support this in comments, but not everyone uses an IDE with access to this), and second it saves the output of graphs and the like directly in the document.  So it is a great way to share code with co-works or in this case, with people reading a blog post and hopefully following along from the repository on GitHub.

To get Jupyter notebooks running lets check out the project (this is a branch of the original [recipe-parser project on GitHub](https://github.com/kriserickson/recipe-parser)).  To check it out (if you haven't already):

```bash
git clone https://github.com/kriserickson/recipe-parser.git
```

or if you prefer ssh over https

```bash
git clone git@github.com:kriserickson/recipe-parser.git
```
Then checkout the branch for this blog post.

```bash
git checkout unsupervised-1
```
If this is the first time you are checking out the project (you haven't been following the previous articles) you will need to create a virtual environment.  You can either do this in the command line (or let your IDE like [Visual Studio Code](https://code.visualstudio.com/docs/python/environments) or [PyCharm](https://www.jetbrains.com/help/pycharm/creating-virtual-environment.html) do it for you).  To do it manually:

```bash
# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate

# Activate it (Mac/Linux)
source .venv/bin/activate
```

Now, it depends what IDE you are using to know how to procede next.  If you are using PyCharm, Jupyter should be ready to go out-of-the-box - no-plugins needed and the default settings should be good.  If you are using VS Code you will have to install the [Jupyter Extension](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter).  

### Setting up the data

Lets begin by setting up the data.   We do this in the `/notebooks/unsupervised.ipynb` notebook, see the code below.   First, we iterate through all the of the recipes stored in the potential_labels directory (see the [previous articles](/posts/2025-06-13-experiments-in-supervised-learning) to see why this is in potential_labels and understand why some of the other files are here).  We open the file, parse out the json and create a new object that contains the title, the filename and the ingredients, we then dump that into the `ingredients.jsonl` file.  We use [jsonl](https://jsonlines.org) for simplicity, as [Pandas](https://pandas.pydata.org) handles `jsonl` files very quickly.

```python
from pathlib import Path
import json
import pickle
from joblib import dump


project_root = Path(Path.cwd()).resolve().parent
labels_dir = project_root / 'data' / 'potential_labels'
jsonl_path = project_root / 'data' / 'ingredients.jsonl'

# Ensure the labels directory exists
if not labels_dir.exists():
    print(f"Directory {labels_dir} does not exist. Please create it and add JSON files.")
    exit(1)

# Collect JSON files (sorted for determinism)
files = sorted([p for p in labels_dir.iterdir() if p.is_file() and p.suffix == '.json'])

written = 0
with jsonl_path.open('w', encoding='utf-8') as out_f:
    for fp in files:
        try:
            text = fp.read_text(encoding='utf-8')
            obj = json.loads(text)
        except Exception as e:
            # Log and continue on parse/read errors
            print(f'Skipping {fp.name}: {e}')
            continue
        # add source filename so downstream steps know which file produced this record
        if isinstance(obj, dict) and obj.get("title") and obj.get("ingredients"):
            title_instructions_file = {
                "title" : obj["title"],
                "ingredients": obj["ingredients"],
                "source_file": fp.name
            }
            out_f.write(json.dumps(title_instructions_file, ensure_ascii=False) + '\n')
            written += 1

print(f'Wrote {written} records to {jsonl_path}')
```

We now have a file of ingredients, titles, and the their filename.  The next section we are going to iterate over all the recipes, clean up the ingredient data and converts it into a single string per recipe.  It then fits and transforms those ingredients into a TF‑IDF document–term matrix, which will be used in a future cell of the Notebook to cluster the terms with KMeans.  

Lets break the cell down into a few sections (all of the following is in one cell, but to make
it more understandable we are going to break the cell into a bunch of sections which may appear
out of order). 

```python
rows = load_recipe_rows(jsonl_path)

# Keep a simple index, title map, and source filename list for later use (search/results)
titles: List[str] = []
texts: List[str] = []
filenames: List[str] = []        
for rec in rows:
    text = build_ingredients_text_from_record(rec)
    if not text:
        continue
    texts.append(text)
    titles.append(str(rec.get("title")))
    # capture original source filename injected when creating the JSONL
    filenames.append(str(rec.get("source_file")))
```

First we load the recipe rows, the code to do that just uses pandas to load each line into a record and cleans out any JSON that isn't an object or is null.  We then iterate over every row, and get the ingredients, text and filenames and append them to individual arrays.  

To clean clean the text we use the following code:

```python
def build_ingredients_text_from_record(rec: Dict[str, Any]) -> str:
    """
    Combine ingredients into a single text blob.
    """
    ingredients = _as_list(rec.get("ingredients"))
    combined = " ".join(ingredients)
    return _clean_tokens(combined)
```
The `_as_list` function just ensures we get a list of strings.  We take all those strings
and join them together, and then `_clean_tokens` (I guess we could have cleaned the tokens
as a list, but Python is really good at dealing with strings so we did it as a string).

```python
MEASURE_WORDS = set("""
t tsp tablespoon tablespoons tbps tbsp tsps teaspoon teaspoons cup cups
oz ounce ounces lb lbs pound pounds g gram grams kg kilogram kilograms ml
l liter liters litre litres package packages can cans jar jars pinch pinches
small medium large
""".split())

def _clean_tokens(text: str) -> str:
    """
    Light cleaning: lowercase, remove punctuation, collapse spaces.
    we’ll drop obvious measure tokens and any standalone numbers.
    """
    text = text.lower()
    # keep letters, numbers, and spaces
    text = re.sub(r"[^a-z0-9\s\-']", " ", text)
    # split and drop measure words and only numbers
    toks = [t for t in text.split() if t not in MEASURE_WORDS and not re.match(r"^\d+$", t)]
    # collapse multiple spaces
    return re.sub(r'\s+', ' ', ' '.join(toks)).strip()
```

Since we don't want to deal with anything other than letters, numbers and spaces, the first thing we do is strip anything else out of th e string.  Then we split the string into words and drop any words that are obviously measurements (since those are not things we want to look at).   We also drop any standalone numbers.

Finally we create the TF‑IDF document–term matrix:

```python
# Vectorize with TF‑IDF.
# You can tune min_df/max_df and ngram_range. Start simple; adjust if vocabulary is too noisy.
vectorizer = TfidfVectorizer(
    stop_words='english',
    max_df=0.8,     # drop terms in >80% of docs (very common)
    min_df=2,       # keep terms appearing in at least 2 docs
    ngram_range=(1,2)  # unigrams + bigrams helps with phrases like "butternut squash"
)

X = vectorizer.fit_transform(texts)
```

`vectorizer = TfidfVectorizer` Creates a scikit-learn TfidfVectorizer, a TfidfVectorizer is a text feature extraction tool that converts a collection of text documents into a matrix of TF-IDF (Term Frequency-Inverse Document Frequency) features. It's commonly used in natural language processing and machine learning for text analysis and basically converts words into numbers that models can work with.

**What TfidfVectorizer does:**

- Tokenizes text (splits into words)
- Builds a vocabulary of unique terms
- Calculates TF-IDF scores for each term in each document
- Returns a sparse matrix where each row represents a document and each column represents a term

The options we passed to it are:  

- `stop_words='english'` - Uses scikit-learn’s built-in English stop word list. Stop words are removed after tokenization and before n-gram construction. 
- `max_df=0.8`: Drops any token/ngram that appears in more than 80% of documents (those words are too common to be useful).   Because 0.8 is a float, the threshold is a fraction of the total document count.
- `min_df=2`: Drops any token/ngram that appears in fewer than 2 documents (too rare). Because it’s an int, this is an absolute document count, not a fraction.
- `ngram_range=(1,2)`: Builds features for unigrams and bigrams (consecutive tokens) from the tokenized text.
Because stop words are removed first, bigrams won’t include them.  We use bigrams (two word tokens) rather than the default unigram token because many ingredients contain two words (brown sugar, olive oil, butternut squash) and bigrams will preserve those differentiations.

The next thing we do with our `vectorizer` is to fit our array of ingredients into it.  

`X = vectorizer.fit_transform(texts)` - This Tokenizes each document, removes the stop words, builds unigrams and bigrams. Computes document frequency for each candidate feature. Applies min_df/max_df and finalizes the vocabulary_ and idf_. transform: Computes TF for each feature in each document. Multiplies by IDF to get TF–IDF weights. L2-normalizes each row. Returns X, a scipy.sparse.csr_matrix of shape (n_documents, n_features), where columns align with vectorizer.get_feature_names_out().

Now we want to use KMeans to cluster our recipes into k clusters so that the within-cluster varience is minimized. This will allow us to quickly find the recipes with the most similar ingredients.  The once challenge of KMeans Clustering is how to find the the best K (number of clusters) to cluster.  

One of the ways to find the best K is called the Elbow Method, which is a technique for determining the optimal number of clusters (K) in KMeans clustering by analyzing how the within-cluster sum of squares (WCSS) changes as you increase K. What it measures: WCSS (Within-Cluster Sum of Squares): The sum of squared distances between each point and its cluster centroid. Lower WCSS means points are closer to their cluster centers.
How it works:

- Run K-means for different values of K (e.g., 1 to 25)
- Calculate WCSS for each K value`
- Plot K vs WCSS
- Look for the "elbow" - the point where WCSS stops decreasing dramatically.

Here is the code to plot the elbow method in our Notebook:

```python
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

wcss = []
for k in range(1, 25):
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=500)
    kmeans.fit(X)
    wcss.append(kmeans.inertia_) 

plt.plot(range(1, 25), wcss, marker='o') 
plt.xlabel("Number of Clusters (K)") 
plt.ylabel("WCSS") 
plt.title("Elbow Method for K Selection") 
plt.show()
```

Running this takes a few seconds, but eventually you will see a graph that looks like: 

<div>
<img src="/img/unsupervised/elbow.png">
</div>

While the drop off is not as steep as we would like to see, it seems that somewhere between 




