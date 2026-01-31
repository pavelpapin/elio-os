# Consilium Review System

## Concept

Три модели (Claude, OpenAI, Groq) проводят консилиум по отчету.
ФОКУС: качество МЫШЛЕНИЯ и REASONING, не formatting.

## What Consilium Checks (REVISED — Reasoning Over Format)

### 1. Chain of Reasoning (25 points)
- Does every finding follow logically from evidence?
- Are there logical gaps or jumps?
- Is the "So What?" chain complete: Fact → Finding → Implication → Action?
- Are alternative explanations considered?

### 2. Evidence Quality (25 points)
- Are sources truly independent (not citing each other)?
- Is the evidence sufficient for the strength of conclusions?
- Are there conclusions with weak evidence base?
- Are methodology differences in data sources explained?

### 3. Recommendation Quality (25 points)
- Do recommendations follow from findings? (not generic advice)
- Are they conditional and specific? (not "consider doing X")
- Is the decision framework actionable? (IF/THEN tree, not matrix)
- Would a CEO know EXACTLY what to do after reading?
- Is there a "This Week" section with specific actions?

### 4. Risk Assessment (15 points)
- Are risks quantified? (not just "high/medium/low")
- Are kill scenarios identified?
- Is the pre-mortem realistic?
- Are competitor responses steel-manned?
- Are cascade effects considered?

### 5. Completeness & Honesty (10 points)
- Is "What We Don't Know" section honest and specific?
- Are gaps_for_deepdive useful?
- Are assumptions explicitly stated?
- Does the report acknowledge its own limitations?

## Round 1: Independent Review

Каждая модель получает отчет и оценивает:

```json
{
  "chain_of_reasoning": {
    "score": 0-25,
    "issues": ["Finding #3 jumps from 'market is growing' to 'enter now' without justifying timing"],
    "suggestions": ["Add evidence for timing urgency — what changes if you wait 6 months?"]
  },
  "evidence_quality": {
    "score": 0-25,
    "issues": ["3 sources for market size all cite same Gartner report — not independent"],
    "suggestions": ["Find IDC or Forrester independent estimate"]
  },
  "recommendation_quality": {
    "score": 0-25,
    "issues": ["Recommendation #2 is generic 'build partnerships' without specifying who or why"],
    "suggestions": ["Name 3 specific potential partners and explain strategic fit"]
  },
  "risk_assessment": {
    "score": 0-15,
    "issues": [],
    "suggestions": []
  },
  "completeness": {
    "score": 0-10,
    "issues": [],
    "suggestions": []
  },
  "total_score": 0-100,
  "verdict": "approved | needs_revision | rejected",
  "critical_reasoning_gaps": ["The biggest logical flaw in this research is..."],
  "strongest_part": "What's actually good about this research",
  "key_concerns": ["..."],
  "strengths": ["..."]
}
```

**Verdict rules:**
- 80-100 → approved
- 60-79 → needs_revision
- <60 → rejected

## Round 2: Cross-Review

Каждая модель видит:
- Оригинальный отчет
- Свою оценку (Round 1)
- Оценки двух других моделей

Задача: пересмотреть свою оценку с учетом мнений коллег.

```json
{
  "original_verdict": "needs_revision",
  "revised_verdict": "approved",
  "changed_scores": {
    "evidence_quality": { "from": 15, "to": 20, "reason": "OpenAI correctly noted that sources ARE independent — I miscounted" }
  },
  "agreement": {
    "with_model_a": ["reasoning gap in Finding #3"],
    "with_model_b": ["recommendation #2 too generic"]
  },
  "disagreement": {
    "with_model_a": { "issue": "...", "my_position": "..." }
  }
}
```

## Round 3: Synthesis

### 1. Consensus (2/3 agree)
```python
for issue in all_issues:
    models_agree = count(models where issue in model.issues)
    if models_agree >= 2:
        add_to_unified_tz(issue, priority="high")
```

### 2. Critical reasoning gaps (any model found)
```python
for model in models:
    for gap in model.critical_reasoning_gaps:
        add_to_unified_tz(gap, priority="critical")
```

### 3. Disputed points
```python
for issue in disputed_issues:
    add_to_unified_tz(issue, priority="review",
                      note=f"Opinions: {model_opinions}")
```

### Final Verdict Logic
```python
verdicts = [claude.verdict, openai.verdict, groq.verdict]

if verdicts.count("rejected") >= 2:
    final_verdict = "rejected"
elif verdicts.count("approved") >= 2:
    final_verdict = "approved"
else:
    final_verdict = "needs_revision"
```

## Unified Improvement TZ

```json
{
  "final_verdict": "needs_revision",
  "consensus_score": 76,
  "model_scores": {
    "claude": 78,
    "openai": 74,
    "groq": 76
  },
  "critical_issues": [
    {
      "issue": "Finding #3 has no evidence for timing urgency",
      "type": "reasoning_gap",
      "found_by": ["claude", "openai"],
      "action": "Add evidence: what changes if you wait 6 months? What's the cost of delay?"
    }
  ],
  "high_priority": [
    {
      "issue": "Recommendation #2 too generic",
      "type": "recommendation_quality",
      "found_by": ["openai", "groq"],
      "action": "Name specific partners, explain strategic fit, add timeline"
    }
  ],
  "suggestions": [
    {
      "suggestion": "Add customer voice data (Reddit, G2) to strengthen evidence",
      "found_by": ["groq"],
      "action": "Optional but would improve evidence_quality score"
    }
  ],
  "disputed": [
    {
      "topic": "Is market growth sustainable?",
      "opinions": {
        "claude": "Yes, based on enterprise adoption trends",
        "openai": "Uncertain, hype cycle risk",
        "groq": "No, commoditization will compress margins"
      },
      "action": "Flag as open question for user"
    }
  ]
}
```

## Model-Specific Roles

### Claude (Opus) — Chief Strategist
```
Ты Chief Strategy Officer. Оценивай:
- Логическую связность рассуждений (fact → finding → so what → action)
- Качество decision framework (actionable IF/THEN tree?)
- Стратегическую soundness рекомендаций
- Правильность competitive analysis

Особый фокус: reasoning quality и actionability.
```

### OpenAI (GPT-4o) — Evidence Auditor
```
Ты Lead Evidence Auditor. Оценивай:
- Независимость источников (не цитируют ли друг друга?)
- Достаточность evidence для каждого conclusion
- Methodology differences в данных
- Полноту coverage (что пропущено?)

Особый фокус: evidence quality и completeness.
```

### Groq (Llama 70B) — Critical Reviewer
```
Ты Critical Reviewer. Оценивай:
- Какие assumptions не проверены?
- Где confirmation bias в анализе?
- Какие counter-arguments не рассмотрены?
- Реалистичны ли сценарии?

Особый фокус: bias detection и assumption testing.
```

## Cost Estimation

| Model | Round 1 | Round 2 | Total Tokens | Cost |
|-------|---------|---------|--------------|------|
| Claude Opus | ~8K in, ~2K out | ~12K in, ~1K out | ~23K | ~$0.50 |
| OpenAI GPT-4o | ~8K in, ~2K out | ~12K in, ~1K out | ~23K | ~$0.25 |
| Groq Llama 70B | ~8K in, ~2K out | ~12K in, ~1K out | ~23K | FREE |

**Total per consilium: ~$0.75**
