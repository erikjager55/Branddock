"""
WS3 Step 3 — mStyleDistance embeddings + LINFI centroid similarity.

Embeds each piece in corpus.jsonl using StyleDistance/mstyledistance (multilingual
style-only embedding model based on XLM-RoBERTa). For each piece, computes cosine
similarity to the LINFI brand-anchor centroid.

Methodology choices:
  - Leave-one-out for LINFI items: each LINFI piece's centroid is built from the
    OTHER 11 LINFI pieces. This avoids the bias where train-set items have inflated
    similarity to a centroid built from themselves.
  - Pooled centroid for non-LINFI items: their centroid uses all 12 LINFI pieces.
    They are cross-brand reference points; bias is fine.

Why leave-one-out (not the train/test split mentioned in protocol §6.2):
  - Protocol §6.2 specified split 14/13 from a pool of 27 LINFI pieces. Reality
    is 12 LINFI (commit 1fefc44 corpus extraction). With n=12, leave-one-out is
    more standard at small-n than train/test split.
  - Methodologically more conservative: each piece gets an unbiased similarity,
    all pieces enter the correlation calc.

Language caveat:
  mStyleDistance was contrastively trained on 9 non-English languages. Dutch was
  not in the training set explicitly. The xlm-roberta-base model supports Dutch,
  but style-feature transfer to Dutch is unverified. Treat absolute similarity
  values with caution; relative ordering (which is what Pearson/Spearman use)
  is more reliable.

See:
  - docs/voice-fingerprinting-ws2-protocol.md v0.3 §6 (WS3 scope)
  - scripts/voice-research/ws3/README.md (full pipeline)

Usage:
  python compute-embeddings.py                  # default paths
  python compute-embeddings.py --corpus=PATH    # override corpus path

Output: scripts/voice-research/ws3/output/embeddings.json
  - per-item embedding (768-dim) for re-analysis
  - per-item similarity to LINFI centroid
  - method label per item (leave-one-out vs pooled-centroid)
  - aggregate stats
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

# ─── Constants ────────────────────────────────────────────

MODEL_NAME = "StyleDistance/mstyledistance"
DEFAULT_CORPUS = Path(__file__).parent / "output" / "corpus.jsonl"
DEFAULT_OUTPUT = Path(__file__).parent / "output" / "embeddings.json"
PROTOCOL_VERSION = "v0.3"

# ─── Helpers ──────────────────────────────────────────────

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two equal-length vectors."""
    a_norm = a / np.linalg.norm(a)
    b_norm = b / np.linalg.norm(b)
    return float(np.dot(a_norm, b_norm))


def stats(values: list[float]) -> dict:
    """Min, median, mean, max, stddev for a list of floats."""
    if not values:
        return {"n": 0}
    sorted_vals = sorted(values)
    return {
        "n": len(values),
        "min": float(min(values)),
        "median": float(sorted_vals[len(values) // 2]),
        "mean": float(sum(values) / len(values)),
        "max": float(max(values)),
        "stddev": float(np.std(values)),
    }


# ─── Main ─────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus", default=str(DEFAULT_CORPUS), help="Path to corpus.jsonl"
    )
    parser.add_argument(
        "--output", default=str(DEFAULT_OUTPUT), help="Path to output embeddings.json"
    )
    args = parser.parse_args()

    corpus_path = Path(args.corpus)
    output_path = Path(args.output)

    # Load corpus
    if not corpus_path.exists():
        print(f"ERROR: Corpus not found at {corpus_path}", file=sys.stderr)
        print("Run scripts/voice-research/ws3/extract-corpus.ts first.", file=sys.stderr)
        sys.exit(1)

    items: list[dict] = []
    with open(corpus_path) as f:
        for line in f:
            line = line.strip()
            if line:
                items.append(json.loads(line))

    if not items:
        print("ERROR: Corpus is empty", file=sys.stderr)
        sys.exit(1)

    print("━" * 72)
    print(f"WS3 Step 3 — mStyleDistance embeddings ({MODEL_NAME})")
    print(f"Corpus:  {corpus_path}")
    print(f"Output:  {output_path}")
    print(f"Items:   {len(items)}")
    print("━" * 72)

    # Identify LINFI (brand-anchor) items vs non-LINFI
    linfi_idx = [i for i, item in enumerate(items) if item.get("isBrandAnchor")]
    non_linfi_idx = [i for i, item in enumerate(items) if not item.get("isBrandAnchor")]
    print(f"\nLINFI (brand-anchor): {len(linfi_idx)} items — leave-one-out centroid")
    print(f"Non-LINFI:            {len(non_linfi_idx)} items — pooled LINFI centroid")

    if len(linfi_idx) < 4:
        print(
            f"\nWARNING: Only {len(linfi_idx)} LINFI items. Leave-one-out centroid is "
            f"unstable below n=4. Results will be exploratory at best.",
            file=sys.stderr,
        )

    # Load model
    print(f"\nLoading {MODEL_NAME} (first run downloads ~1.1GB to HF cache)...")
    model = SentenceTransformer(MODEL_NAME)
    print(f"Model loaded. Embedding dim: {model.get_sentence_embedding_dimension()}")

    # Embed all texts
    texts = [item["content"] for item in items]
    print(f"\nEmbedding {len(texts)} texts...")
    embeddings = model.encode(
        texts, show_progress_bar=True, convert_to_numpy=True, batch_size=4
    )
    print(f"Embeddings shape: {embeddings.shape}")

    # Compute pooled LINFI centroid (used for non-LINFI items)
    linfi_embeddings = embeddings[linfi_idx]
    pooled_centroid = linfi_embeddings.mean(axis=0)

    # Per-item similarity calculation
    item_results: dict[str, dict] = {}
    for i, item in enumerate(items):
        item_id = item["id"]
        is_anchor = bool(item.get("isBrandAnchor"))

        if is_anchor:
            # Leave-one-out: centroid from other LINFI items
            other_indices = [j for j in linfi_idx if j != i]
            other_embeddings = embeddings[other_indices]
            centroid = other_embeddings.mean(axis=0)
            method = "leave-one-out"
        else:
            # Use pooled LINFI centroid
            centroid = pooled_centroid
            method = "pooled-centroid"

        sim = cosine_similarity(embeddings[i], centroid)

        item_results[item_id] = {
            "workspace_slug": item["workspaceSlug"],
            "is_brand_anchor": is_anchor,
            "content_type": item["contentType"],
            "word_count": item["wordCount"],
            "similarity_to_linfi_centroid": sim,
            "similarity_method": method,
            "embedding": embeddings[i].tolist(),
        }

    # Aggregate stats
    all_sims = [r["similarity_to_linfi_centroid"] for r in item_results.values()]
    linfi_sims = [
        r["similarity_to_linfi_centroid"]
        for r in item_results.values()
        if r["is_brand_anchor"]
    ]
    non_linfi_sims = [
        r["similarity_to_linfi_centroid"]
        for r in item_results.values()
        if not r["is_brand_anchor"]
    ]

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": MODEL_NAME,
        "model_base": "FacebookAI/xlm-roberta-base",
        "embedding_dim": int(embeddings.shape[1]),
        "protocol_version": PROTOCOL_VERSION,
        "corpus_path": str(corpus_path),
        "method": (
            "leave-one-out for LINFI (brand-anchor); pooled centroid for non-LINFI"
        ),
        "language_caveat": (
            "Dutch not explicitly in 9-language mStyleDistance training set; "
            "xlm-roberta base supports Dutch but style-feature transfer is unverified. "
            "Treat absolute similarity values with caution; relative ordering "
            "(used by Pearson/Spearman) is more reliable."
        ),
        "items_total": len(items),
        "linfi_items": len(linfi_idx),
        "non_linfi_items": len(non_linfi_idx),
        "stats_overall": stats(all_sims),
        "stats_linfi_loo": stats(linfi_sims),
        "stats_non_linfi": stats(non_linfi_sims),
        "items": item_results,
    }

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    # Report
    print("\n" + "━" * 72)
    print("Similarity to LINFI centroid:")
    s_overall = stats(all_sims)
    print(
        f"  All ({s_overall['n']:>2}): "
        f"min={s_overall['min']:.4f}  median={s_overall['median']:.4f}  "
        f"mean={s_overall['mean']:.4f}  max={s_overall['max']:.4f}"
    )
    s_linfi = stats(linfi_sims)
    print(
        f"  LINFI loo ({s_linfi['n']:>2}): "
        f"min={s_linfi['min']:.4f}  median={s_linfi['median']:.4f}  "
        f"mean={s_linfi['mean']:.4f}  max={s_linfi['max']:.4f}"
    )
    if non_linfi_sims:
        s_non = stats(non_linfi_sims)
        print(
            f"  Non-LINFI ({s_non['n']:>2}): "
            f"min={s_non['min']:.4f}  median={s_non['median']:.4f}  "
            f"mean={s_non['mean']:.4f}  max={s_non['max']:.4f}"
        )
    print(
        "\nExpected pattern: LINFI loo similarities should average HIGHER than "
        "non-LINFI (LINFI pieces are stylistically closer to LINFI's own corpus)."
    )

    print(f"\n✓ Wrote {len(item_results)} embeddings to {output_path}")


if __name__ == "__main__":
    main()
