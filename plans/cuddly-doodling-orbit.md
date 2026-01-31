# План: Provider Priority System для YouTube (и других overlapping tools)

## Проблема

Сейчас для YouTube (и LinkedIn, Twitter, Reddit) есть **два провайдера**:
1. **Свой adapter** (`elio_youtube_*`) — через Google YouTube Data API v3 (свой ключ, 10K units/день)
2. **AnySite MCP** (`mcp__anysite__*_youtube_*`) — сторонний scraping-сервис с лимитом points

Claude не знает какой из них приоритетнее. Нет правил выбора. В итоге используется anysite (который быстрее кончает лимит), а свой API простаивает.

## Решение

**Не строить runtime routing** (over-engineering). Вместо этого:

1. **Прописать правила в CLAUDE.md** — чтобы Claude знал приоритеты
2. **Добавить `providers` секцию в registry.yaml** — формализовать overlapping capabilities
3. **Активировать YouTube adapter** в `adapters/index.ts` — чтобы elio_youtube_* tools были доступны

## Изменения

### 1. `CLAUDE.md` — добавить секцию "Provider Priority Rules"

После секции "MCP Integrations" добавить:

```markdown
## Provider Priority Rules

Некоторые capabilities доступны через несколько провайдеров.
ВСЕГДА используй провайдера с наивысшим приоритетом. Fallback — только если primary недоступен.

| Capability | Primary (свой API) | Fallback (AnySite) |
|------------|-------------------|---------------------|
| YouTube search | `elio_youtube_search` | `mcp__anysite__search_youtube_videos` |
| YouTube video details | `elio_youtube_video_details` | `mcp__anysite__get_youtube_video` |
| YouTube transcripts | `elio_youtube_transcript` | `mcp__anysite__get_youtube_video_subtitles` |
| YouTube channel | `elio_youtube_channel_info/videos` | `mcp__anysite__get_youtube_channel_videos` |
| LinkedIn profile | `elio_linkedin_profile` | `mcp__anysite__get_linkedin_profile` |
| Twitter user | `elio_twitter_*` | `mcp__anysite__get_twitter_user` |

**Правила:**
- Primary = свой API с своим ключом (надёжнее, больше квоты)
- Fallback = AnySite (scraping, shared лимит points)
- Используй fallback ТОЛЬКО если primary вернул ошибку
- Для discovery/research (когда нужно много данных без API ключа) — AnySite допустим
```

### 2. `registry.yaml` — добавить providers metadata

К каждому connector-у с overlapping capability добавить поле `overlaps_with` и `priority`:

```yaml
youtube:
  adapter: mcp-server/src/adapters/youtube
  priority: primary
  overlaps_with: [anysite]
  note: "YouTube Data API v3 (свой ключ, 10K units/день). Предпочтительнее anysite."

anysite:
  adapter: mcp-server/src/adapters/anysite
  priority: fallback
  note: "Scraping-based. Shared лимит. Использовать как fallback для YouTube/LinkedIn/Twitter."
```

### 3. `mcp-server/src/adapters/index.ts` — активировать YouTube adapter

Добавить `youtubeAdapter` в массив exports, чтобы `elio_youtube_*` tools стали доступны через MCP server.

## Файлы для изменения

| Файл | Что делаем |
|------|-----------|
| `/root/.claude/CLAUDE.md` | Добавить секцию "Provider Priority Rules" |
| `/root/.claude/registry.yaml` | Добавить `priority`, `overlaps_with` к youtube и anysite |
| `/root/.claude/mcp-server/src/adapters/index.ts` | Добавить `youtubeAdapter` в exports |

## Верификация

1. `npx tsx scripts/validate-registry.ts` — registry валиден
2. Перезапустить MCP server, проверить что `elio_youtube_search` доступен
3. Вызвать `elio_youtube_search` с тестовым запросом — убедиться что работает через свой API
