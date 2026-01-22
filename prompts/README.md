# Elio OS Prompt Registry

Centralized storage for all prompts used in the system.

## Structure

```
prompts/
├── gpt4-review-system.md    # GPT-4 reviewer system prompt
├── gpt4-review-task.md      # GPT-4 review task template (with {{placeholders}})
├── groq-validation.md       # Groq quick validation prompts
├── notebooklm-analysis.md   # NotebookLM source analysis prompt
└── README.md                # This file
```

## Usage

```typescript
import { readFileSync } from 'fs';

const prompt = readFileSync('/root/.claude/prompts/gpt4-review-system.md', 'utf-8');
```

## Template Variables

Some prompts use `{{variable}}` placeholders:
- `{{task_description}}` - The task that was assigned
- `{{result}}` - The work result to review
- `{{criteria_text}}` - Additional evaluation criteria

## Adding New Prompts

1. Create a `.md` file with descriptive name
2. Add header comment explaining the prompt purpose
3. Update this README

## Version Control

All prompts are version controlled via git. Changes can be tracked and rolled back.
