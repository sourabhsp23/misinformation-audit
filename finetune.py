"""
finetune.py — Finetune NLI model on fact-check datasets
=========================================================
Runs on free Google Colab T4 GPU (~2 hours for FEVER subset).

Base model : cross-encoder/nli-deberta-v3-base  (HuggingFace, free)
Datasets   : FEVER (fact verification), SciCheck, HealthNewsReview
Output     : your own checkpoint pushed to HuggingFace Hub

After finetuning, swap model_name in graph.py with your Hub checkpoint.
"""

import os
from dataclasses import dataclass
from typing import Optional

import torch
from datasets import load_dataset, Dataset, concatenate_datasets
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
    EarlyStoppingCallback,
)
from peft import LoraConfig, get_peft_model, TaskType   # pip install peft
import numpy as np
from sklearn.metrics import classification_report


# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
@dataclass
class FinetuneConfig:
    base_model:     str   = "cross-encoder/nli-deberta-v3-base"
    hub_repo:       str   = "your-username/misinformation-nli"   # change this
    output_dir:     str   = "./nli_finetuned"
    max_length:     int   = 256
    batch_size:     int   = 16
    learning_rate:  float = 2e-5
    num_epochs:     int   = 3
    warmup_ratio:   float = 0.1
    use_lora:       bool  = True    # set False for full finetune
    lora_r:         int   = 16
    lora_alpha:     int   = 32

cfg = FinetuneConfig()

# Label mapping
LABEL2ID = {"SUPPORTED": 0, "NOT ENOUGH INFO": 1, "REFUTED": 2}
ID2LABEL = {v: k for k, v in LABEL2ID.items()}


# ─────────────────────────────────────────────
# Dataset builders
# ─────────────────────────────────────────────

def load_fever_dataset(max_samples: int = 20000) -> Dataset:
    """
    FEVER: Fact Extraction and VERification
    Labels: SUPPORTS → SUPPORTED, REFUTES → REFUTED, NOT ENOUGH INFO
    Download: https://fever.ai/dataset/fever.html (also on HuggingFace)
    """
    print("Loading FEVER dataset...")
    try:
        ds = load_dataset("fever", "v1.0", split="train")
        ds = ds.select(range(min(max_samples, len(ds))))

        def format_fever(example):
            label_map = {
                "SUPPORTS":        "SUPPORTED",
                "REFUTES":         "REFUTED",
                "NOT ENOUGH INFO": "NOT ENOUGH INFO"
            }
            return {
                "premise":    example.get("evidence_sentence", example["claim"]),
                "hypothesis": example["claim"],
                "label":      LABEL2ID[label_map[example["label"]]]
            }

        return ds.map(format_fever, remove_columns=ds.column_names)
    except Exception as e:
        print(f"FEVER load failed ({e}). Using synthetic data instead.")
        return build_synthetic_dataset()


def build_synthetic_dataset() -> Dataset:
    """
    Fallback: small hand-crafted dataset for quick testing.
    Replace with FEVER / SciCheck for production quality.
    """
    examples = [
        # SUPPORTED
        {"premise": "Multiple peer-reviewed studies show vaccines do not cause autism.",
         "hypothesis": "Vaccines are safe and do not cause autism.", "label": 0},
        {"premise": "Einstein was born in Germany and showed exceptional mathematical ability as a child.",
         "hypothesis": "Einstein excelled at mathematics in school.", "label": 0},
        {"premise": "The WHO reports that climate change poses significant health risks globally.",
         "hypothesis": "Climate change affects human health according to the WHO.", "label": 0},

        # NOT ENOUGH INFO
        {"premise": "Some researchers have studied the effects of caffeine on memory.",
         "hypothesis": "Caffeine definitively prevents Alzheimer's disease.", "label": 1},
        {"premise": "Dietary supplements are popular in many countries.",
         "hypothesis": "Vitamin D supplements cure depression.", "label": 1},

        # REFUTED
        {"premise": "NASA astronauts confirm the Great Wall is not visible from orbit.",
         "hypothesis": "The Great Wall of China is visible from space.", "label": 2},
        {"premise": "Brain imaging studies show all brain regions are active throughout the day.",
         "hypothesis": "Humans only use 10 percent of their brains.", "label": 2},
        {"premise": "Lightning rods work by attracting repeated lightning strikes to the same point.",
         "hypothesis": "Lightning never strikes the same place twice.", "label": 2},
    ] * 50  # repeat to make dataset large enough for training

    return Dataset.from_list(examples)


# ─────────────────────────────────────────────
# Tokenisation
# ─────────────────────────────────────────────

def tokenize_dataset(dataset: Dataset, tokenizer) -> Dataset:
    def tokenize(example):
        return tokenizer(
            example["premise"],
            example["hypothesis"],
            truncation=True,
            max_length=cfg.max_length,
            padding=False   # handled by DataCollator
        )
    return dataset.map(tokenize, batched=True, remove_columns=["premise", "hypothesis"])


# ─────────────────────────────────────────────
# Metrics
# ─────────────────────────────────────────────

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    report = classification_report(
        labels, preds,
        target_names=list(LABEL2ID.keys()),
        output_dict=True,
        zero_division=0
    )
    return {
        "accuracy":       report["accuracy"],
        "f1_supported":   report["SUPPORTED"]["f1-score"],
        "f1_refuted":     report["REFUTED"]["f1-score"],
        "f1_nei":         report["NOT ENOUGH INFO"]["f1-score"],
        "macro_f1":       report["macro avg"]["f1-score"],
    }


# ─────────────────────────────────────────────
# Model setup (with optional LoRA)
# ─────────────────────────────────────────────

def build_model(tokenizer):
    model = AutoModelForSequenceClassification.from_pretrained(
        cfg.base_model,
        num_labels=3,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True
    )

    if cfg.use_lora:
        print("Applying LoRA adapters...")
        lora_config = LoraConfig(
            task_type=TaskType.SEQ_CLS,
            r=cfg.lora_r,
            lora_alpha=cfg.lora_alpha,
            lora_dropout=0.1,
            target_modules=["query_proj", "value_proj"],   # DeBERTa attention layers
            bias="none"
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()

    return model


# ─────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────

def finetune():
    print(f"\nFinetuning {cfg.base_model} for claim verification\n{'='*50}")

    tokenizer = AutoTokenizer.from_pretrained(cfg.base_model)

    # Load and split dataset
    dataset = load_fever_dataset()
    split   = dataset.train_test_split(test_size=0.1, seed=42)
    train_ds = tokenize_dataset(split["train"], tokenizer)
    eval_ds  = tokenize_dataset(split["test"],  tokenizer)

    model = build_model(tokenizer)

    training_args = TrainingArguments(
        output_dir=cfg.output_dir,
        num_train_epochs=cfg.num_epochs,
        per_device_train_batch_size=cfg.batch_size,
        per_device_eval_batch_size=cfg.batch_size,
        learning_rate=cfg.learning_rate,
        warmup_ratio=cfg.warmup_ratio,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        greater_is_better=True,
        logging_steps=50,
        fp16=torch.cuda.is_available(),   # auto-enable on GPU
        report_to="none",
        push_to_hub=False,   # set True + huggingface-cli login to auto-push
        hub_model_id=cfg.hub_repo,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
    )

    print("Starting training...")
    trainer.train()

    # Final evaluation
    results = trainer.evaluate()
    print(f"\nFinal results: {results}")

    # Save locally
    trainer.save_model(cfg.output_dir)
    tokenizer.save_pretrained(cfg.output_dir)
    print(f"\nModel saved to {cfg.output_dir}/")
    print(f"Update graph.py line: model='cross-encoder/nli-deberta-v3-base'")
    print(f"      → model='{cfg.output_dir}' (local) or '{cfg.hub_repo}' (Hub)")

    return trainer


if __name__ == "__main__":
    # Quick smoke test without GPU
    print("Running smoke test with synthetic data...")
    tokenizer = AutoTokenizer.from_pretrained(cfg.base_model)
    ds = build_synthetic_dataset()
    print(f"Synthetic dataset size: {len(ds)}")
    print(f"Sample: {ds[0]}")
    print("\nRun finetune() to start full training.")
