# Plan: Deep Research Quality Upgrade (5 Actions)

## Overview

Переписать промпты и добавить новые механики чтобы deep-research давал CEO-level output вместо junior analyst research.

**Файлы к изменению:** только промпты в `workflows/deep-research/prompts/` и минимальные правки в `packages/deep-research/src/stages/collection.ts`.

---

## Action 1: Переписать все 5 collection промптов

### 1.1 `web_scout.md` — полный рерайт
- Добавить reasoning framework: не "найди факты", а "ответь на analytical questions"
- Добавить triangulation: если 2 источника дают разные цифры — объясни почему
- Добавить signal vs noise: для каждого факта пояснить WHY IT MATTERS
- Добавить search strategies для primary sources (SEC filings, engineering blogs, patent filings, job postings)
- Добавить customer voice search (Reddit, HN, G2, Capterra)

### 1.2 `market_analyst.md` — усилить
- Добавить framework: Porter's Five Forces, Value Chain Analysis
- Добавить unit economics analysis template
- Добавить competitive moat assessment (network effects, switching costs, data advantages)
- Добавить инструкции по разбору методологии рыночных отчётов (TAM definition differences)

### 1.3 Новый `tech_analyst.md`
- Technical moat analysis (patents, proprietary data, infra)
- Architecture comparison framework
- Job posting analysis ("что нанимают = куда инвестируют")
- GitHub/open-source activity analysis
- Engineering blog deep dives

### 1.4 Новый `legal_analyst.md`
- Regulatory landscape mapping
- Compliance framework analysis (SOC2, GDPR, HIPAA, AI Act)
- Jurisdiction-specific search strategies
- Patent landscape analysis
- Litigation/enforcement action search

### 1.5 Новый `people_analyst.md`
- Founding team assessment framework (track record, domain expertise)
- Expert identification (academic, industry, investor)
- LinkedIn + podcast + conference talk search
- Advisor/board analysis
- Hiring patterns analysis

### 1.6 `collection.ts` — убрать reuse web_scout.md
- Обновить AGENT_PROMPTS map:
  ```
  tech: 'tech_analyst.md'
  legal: 'legal_analyst.md'
  people: 'people_analyst.md'
  ```
- Увеличить timeout с 180s до 600s (10 min) per agent

---

## Action 2: Добавить iterative deepening

### Подход: добавить "Deep Dive" инструкцию в synthesizer prompt
- Synthesizer уже получает все факты. Добавить в промпт секцию "Identify Gaps":
  - Какие areas нуждаются в deeper investigation?
  - Какие вопросы остались без ответа?
- Добавить `gaps_for_deepdive: string[]` в SynthesisResultSchema
- В execute.ts: если synthesis вернул gaps И iteration === 0, запустить targeted collection round по этим gaps перед fact-check
- Это minimal code change — один дополнительный conditional в pipeline loop

### Файлы:
- `prompts/synthesizer.md` — добавить секцию gaps
- `packages/deep-research/src/types.ts` — добавить поле в схему
- `packages/deep-research/src/execute.ts` — добавить conditional deep-dive loop
- `packages/deep-research/src/stages/collection.ts` — добавить функцию `executeTargetedCollection()` с focused queries

---

## Action 3: Переписать synthesizer с decision frameworks

### `prompts/synthesizer.md` — полный рерайт
- Impact/Effort matrix для рекомендаций
- Risk-adjusted scenarios (не generic optimistic/base/pessimistic, а trigger-driven)
- Conditional recommendations: "Если ваш приоритет X — делайте A. Если Y — делайте B."
- "So What?" layer — каждый finding → implication → action
- Competitive positioning analysis (где есть window of opportunity)
- Добавить обязательный "What We Don't Know" section с конкретными data gaps

---

## Action 4: Расширить data sources

### В каждом collection промпте добавить source-specific strategies:
- **SEC EDGAR** — упоминать в market_analyst и web_scout как source для public company data
- **Job postings** — анализ через web search "company X careers" для understanding investment direction
- **Patent filings** — через web search "company X patent" для tech moat analysis
- **G2/Capterra reviews** — customer sentiment через WebFetch
- **Reddit/HN** — через WebSearch "{product} site:reddit.com" или "site:news.ycombinator.com"
- **Podcast transcripts** — через YouTube search (многие подкасты на YouTube)
- **Glassdoor** — internal company health через web search

### Это не требует новых tools — всё через существующие Perplexity, WebSearch, WebFetch.

---

## Action 5: Персонализация + усиление devil's advocate + улучшение discovery + fact-check

### 5.1 `prompts/discovery.md` — добавить стратегические вопросы
- "Что вы уже знаете по теме?"
- "Какие решения рассматриваете?"
- "Кто будет читать отчёт? (CTO/CFO/Board)"
- "Какой результат будет disappointment?"
- Добавить `audience`, `existing_knowledge`, `decision_options` в ResearchBrief

### 5.2 `prompts/devils_advocate.md` — рерайт на aggressive mode
- Steel-man конкурентов с конкретными цифрами
- Kill scenarios — конкретные события, которые делают research irrelevant
- Quantified downside analysis
- Challenge the framing — может сам вопрос неправильный?
- Pre-mortem: "Представь что через год это решение провалилось. Почему?"

### 5.3 `prompts/fact_checker.md` — добавить source independence check
- Проверка: цитируют ли 2 источника один и тот же первоисточник?
- Methodology check: что именно считается в цифре?
- Temporal validity: когда forecast был сделан vs на какой год он?

### 5.4 `prompts/report_editor.md` — персонализация
- Использовать audience из brief для framing (CTO vs CFO vs Board)
- Добавить "Personalized Implications" section
- Добавить "Next Steps: This Week" section с конкретными actions на ближайшую неделю

### 5.5 `prompts/consilium.md` — фокус на reasoning quality
- Проверять chain of reasoning, не formatting
- Оценивать: следуют ли recommendations из data?
- Проверять: рассмотрены ли альтернативные гипотезы?

---

## Порядок выполнения

1. Создать 3 новых промпта (tech_analyst, legal_analyst, people_analyst)
2. Переписать web_scout.md и market_analyst.md
3. Обновить collection.ts (agent map + timeout)
4. Переписать synthesizer.md с frameworks
5. Переписать devils_advocate.md (aggressive)
6. Обновить fact_checker.md (source independence)
7. Обновить discovery.md (strategic questions)
8. Обновить report_editor.md (personalization)
9. Обновить consilium.md (reasoning focus)
10. Добавить iterative deepening в types.ts + execute.ts + collection.ts

## Verification

- Прочитать каждый изменённый файл и убедиться в consistency
- Проверить что types.ts schema совместима с новыми промптами
- Проверить что collection.ts правильно маппит новые файлы
- Запустить `npx tsc --noEmit` в packages/deep-research для проверки типов
