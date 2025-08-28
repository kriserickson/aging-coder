---
layout: post
category: 
title: "Serving the Cookbook: Creating an Endpoint for Recipe Recommendations"
imagefeature: blog/serving.webp
description: 
tags: ["Programming", "ML", "Unsupervised Learning", "API"]
date: 2025-08-25
---
### Introduction

This will be just a quick little follow-up to the last [post](/posts/2025-08-25-clustering-the-cookbook-a-taste-of-unsupervised-learning) where we created a model and some saved data for returning recipes with similar ingredients.  In this post, we'll create an endpoint for the model and return recipes based on the ingredients passed in using FastAPI.

### Setup Script

The code is pretty straightforward, so lets go through it section by section.

```python
# Toggle default similarity computation method:
USE_SKLEARN_COSINE = False        

PROJECT_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_DIR / "models"

# ---------- Config: file paths ----------
KMEANS_PATH = MODELS_DIR / "kmeans_model.pkl"
TITLES_PATH = MODELS_DIR / "recipe_titles.pkl"
X_PATH = MODELS_DIR / "tfidf_matrix.joblib"
FILENAMES_PATH = MODELS_DIR / "recipe_filenames.pkl"   # <-- new

# ---------- Core search helpers ----------

kmeans = None
titles: List[str] = []
filenames: List[str] = []          
X: csr_matrix | None = None
cluster_to_indices: dict[int, np.ndarray] = {}
```

The first section basically just sets up some paths and some variables.  The `USE_SKLEARN_COSINE` variable is a toggle for using sklearn's cosine similarity function or using the dot-product.  The `KMEANS_PATH` variable is the path to the saved kmeans model.  The `TITLES_PATH` variable is the path to the saved titles for the recipes.  The `X_PATH` variable is the path to the saved tfidf matrix.  The `FILENAMES_PATH` variable is the path to the saved filenames for the recipes.  The `cluster_to_indices` variable is a dictionary that maps each cluster to the indices of the recipes in that cluster.

```python
def _build_cluster_index(labels: np.ndarray) -> dict[int, np.ndarray]:
    """Map cluster_id -> np.ndarray of row indices."""
    clusters: dict[int, List[int]] = {}
    for i, c in enumerate(labels):
        clusters.setdefault(int(c), []).append(i)
    return {cid: np.asarray(idxs, dtype=np.int32) for cid, idxs in clusters.items()}

@asynccontextmanager
async def lifespan(app):
    # startup: load artifacts (same logic as previous _load_artifacts)
    global kmeans, titles, filenames, X, cluster_to_indices
    try:
        with open(KMEANS_PATH, "rb") as f:
            kmeans = pickle.load(f)
        with open(TITLES_PATH, "rb") as f:
            titles = pickle.load(f)
        with open(FILENAMES_PATH, "rb") as f:
            filenames = pickle.load(f)
        
        X = joblib_load(X_PATH)
        if not hasattr(X, "shape"):
            raise ValueError("Loaded X is not a sparse matrix.")

        # build cluster index from kmeans.labels_
        if hasattr(kmeans, "labels_"):
            labels = np.asarray(kmeans.labels_, dtype=np.int32)
        else:
            raise RuntimeError("kmeans.labels_ not found. Refit or save labels separately.")

        cluster_to_indices = _build_cluster_index(labels)

        # sanity checks
        if len(titles) != labels.shape[0]:
            raise RuntimeError(
                f"titles length ({len(titles)}) != number of samples ({labels.shape[0]}). "
                "Artifacts must be built from the same dataset/order."
            )
        if X is not None and X.shape[0] != labels.shape[0]:
            raise RuntimeError(
                f"X rows ({X.shape[0]}) != number of samples ({labels.shape[0]}). "
                "Artifacts out of sync."
            )
        if filenames and len(filenames) != labels.shape[0]:
            raise RuntimeError(
                f"filenames length ({len(filenames)}) != number of samples ({labels.shape[0]}). "
                "Save filenames in the same order as titles when building artifacts."
            )

        yield  # application runs after this

    finally:
        # optional: shutdown cleanup
        pass

# create app with lifespan handler
app = FastAPI(title="Recipe Similarity API", version="1.0.0", lifespan=lifespan)
```
The code then sets up the lifespan handler for the app.  The [lifespan handler](https://fastapi.tiangolo.com/advanced/events/) is a function that is called when the app starts and stops and is the modern way to handle setting up and tearing down of FastAPI services (the old [@app.on_event is now deprecated](https://fastapi.tiangolo.com/advanced/events/#alternative-events-deprecated)).  In this case, we're loading the saved artifacts from the previous post.  We also build the `cluster_to_indices` dictionary from the `kmeans.labels_` attribute.  We then do some sanity checks to make sure that the artifacts are built from the same dataset and that the `X` matrix is the same size as the `labels` array.

The _build_cluster_index function builds a lookup mapping each cluster id that returns array of row indices that belong to that cluster. It's used so we can quickly retrieve candidate rows for a given cluster instead of scanning all rows.

It works by:

1) Create an empty dict clusters: cluster_id -> list of int.
2) Iterate enumerate(labels): for each index i and cluster value c, append i to clusters[c] (via setdefault).
3) Convert each list of indices to a numpy.ndarray (dtype=np.int32) and return the final dict.

### Similar Recipes Endpoint

Lets jump forward in the script and look at the endpoint for similar recipes.   Here's the code:

```python
@app.get("/similar_recipes", response_model=SimilarResponse)
def similar_recipes(
    recipe_name: str = Query(..., min_length=1),
    top_k: int = Query(10, ge=1, le=100),  # default to 10 results as requested
    fuzzy_cutoff: float = Query(0.35, ge=0.0, le=1.0),
):
    """
    If the query looks like a recipe title, perform a fuzzy title match. If a good title
    match is found, use that recipe's TF-IDF ingredient vector as the query vector and
    return recipes similar by ingredients. If no good title match is found, return an empty result set.
    """
    if X is None:
        raise HTTPException(
            status_code=503,
            detail="TF-IDF matrix (X) not available on server. Save and deploy tfidf_matrix.joblib.",
        )

    # 1) Try fuzzy title match
    best_idx, match_score = _best_title_index(query, cutoff=fuzzy_cutoff)
```    
   
It takes a few options as arguments, but we are mostly interested in the `recipe_name` argument.  The `recipe_name` argument is the name of the recipe that we want to find similar recipes for.  

We then try to find a good match for the recipe name using the fuzzy title match.  

```python
def _best_title_index(name: str, cutoff: float = 0.35) -> tuple[int | None, float]:
    """
    Return (best_index, score). Score is in [0..1]. 
    """
    if not titles:
        return None, 0.0

    
    best = rf_process.extractOne(
        name, titles, scorer=rf_fuzz.partial_token_sort_ratio
    )
    if best is None:
        return None, 0.0
    match_val, score, idx = best  # rapidfuzz returns (match, score, key)
    return int(idx), float(score) / 100.0    
```

The `_best_title_index` function takes a name.  The cutoff value is the minimum score that a match must have to be considered a good match.  The function then uses the [rapidfuzz](https://rapidfuzz.github.io/RapidFuzz/Usage/process.html#rapidfuzz.process.extractOne) extractOne function to find the best match for the name in the titles dictionary.  The scorer in rapidfuzz is a partial token sort ratio which combines partial matching with word reordering which we hope will be good for matching recipe titles.  There are a bunch of other scorers available in [RapidFuzz](https://rapidfuzz.github.io/RapidFuzz/Usage/fuzz.html#partial-token-sort-ratio), so try experimenting with the various options.

```python
  if best_idx is not None and match_score >= fuzzy_cutoff:
        query_vector = X[best_idx]

        # Determine cluster for that recipe
        cluster_id = int(kmeans.labels_[best_idx])
        
        candidate_indexes = cluster_to_indices.get(cluster_id, np.array([], dtype=np.int32))
        if candidate_indexes.size == 0:
            candidate_indexes = np.arange(X.shape[0], dtype=np.int32)

        candidate_indexes = candidate_indexes[candidate_indexes != best_idx]
        if candidate_indexes.size == 0:
            return SimilarResponse(
                query=recipe_name,
                cluster=cluster_id,
                total_candidates=0,
                results=[],
                matched_title=titles[best_idx],
                matched_filename=(filenames[best_idx] if filenames and filenames[best_idx] else None),
            )

        candidate_matrix = X[candidate_indexes]
        top_local, sims = _cosine_sim_rank(query_vector, candidate_matrix, top_k=min(top_k, candidate_matrix.shape[0]), use_sklearn=USE_SKLEARN_COSINE)
        results = _format_results(candidate_indexes, sims, top_local)
        return SimilarResponse(
            query=recipe_name,
            cluster=cluster_id,
            total_candidates=int(candidate_matrix.shape[0]),
            results=results,
            matched_title=titles[best_idx],
            matched_filename=(filenames[best_idx] if filenames and filenames[best_idx] else None),
        )

    return SimilarResponse(
        query=recipe_name,
        cluster=0,
        total_candidates=0,
        results=[],
        matched_title=None,
        matched_filename=None,
    )
```

If a good match is found, we use the TF-IDF vector for that recipe as the query vector and return recipes similar by ingredients.  If no good match is found, we return an empty result set.
