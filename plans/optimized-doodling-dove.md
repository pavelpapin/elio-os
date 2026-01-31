# Plan: Figma Integration (Plugin + MCP)

## Архитектура

```
Claude (промпт) → MCP Adapter → WebSocket Server → Figma Plugin → Создаёт дизайн
                                                   ↕
                              Figma REST API ← MCP Adapter (чтение/анализ)
```

**Два компонента:**
1. **MCP Adapter** — интеграция в Elio OS (REST API + команды плагину)
2. **Figma Plugin** — запускается в Figma, слушает команды, создаёт элементы

---

## Структура файлов

### 1. MCP Integration (REST API + WebSocket)
```
mcp-server/src/integrations/figma/
├── types.ts          # FigmaFile, FigmaNode, DesignSpec, etc.
├── api.ts            # REST API клиент (чтение файлов)
├── ws-server.ts      # WebSocket сервер для связи с плагином
└── index.ts          # Public exports
```

### 2. MCP Adapter (Tools)
```
mcp-server/src/adapters/figma/
└── index.ts          # figmaAdapter с tools
```

### 3. Figma Plugin
```
figma-plugin/
├── manifest.json     # Figma plugin manifest
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts       # Plugin main thread (Figma API)
│   ├── ui.html       # Plugin UI (минимальный)
│   ├── ws-client.ts  # WebSocket клиент → подключение к серверу
│   ├── builders/
│   │   ├── frame.ts      # Создание фреймов/layouts
│   │   ├── text.ts       # Текстовые элементы
│   │   ├── shapes.ts     # Прямоугольники, круги, etc.
│   │   ├── components.ts # Создание компонентов
│   │   └── styles.ts     # Цвета, шрифты, эффекты
│   └── interpreter.ts    # JSON spec → Figma API calls
└── dist/             # Build output
```

### 4. Credentials
```
secrets/figma.json    # { "api_token": "figd_..." }
```

---

## Этапы реализации

### Этап 1: MCP Adapter (REST API — чтение)

Стандартный adapter по паттерну Elio OS.

**Tools:**
| Tool | Type | Описание |
|------|------|----------|
| `elio_figma_files` | read | Список файлов в проекте |
| `elio_figma_file` | read | Получить структуру файла (JSON) |
| `elio_figma_node` | read | Получить конкретный node |
| `elio_figma_images` | read | Экспорт node в PNG/SVG |
| `elio_figma_components` | read | Список компонентов файла |
| `elio_figma_styles` | read | Список стилей файла |
| `elio_figma_comments` | read | Комментарии к файлу |
| `elio_figma_add_comment` | write | Добавить комментарий |

**Файлы:**
- `mcp-server/src/integrations/figma/types.ts` — типы Figma API
- `mcp-server/src/integrations/figma/api.ts` — REST клиент
- `mcp-server/src/adapters/figma/index.ts` — adapter definition
- `mcp-server/src/adapters/index.ts` — регистрация
- `secrets/figma.json` — credentials

### Этап 2: WebSocket Bridge

Сервер в MCP, клиент в плагине. Протокол команд.

**Протокол:**
```typescript
// Команда от MCP к плагину
interface PluginCommand {
  id: string;           // UUID для трекинга
  type: 'create_design' | 'modify_node' | 'get_selection' | 'ping';
  payload: DesignSpec | ModifySpec | null;
}

// Ответ от плагина
interface PluginResponse {
  id: string;           // Matching command ID
  status: 'ok' | 'error';
  data?: { nodeId: string; fileUrl: string };
  error?: string;
}
```

**Файлы:**
- `mcp-server/src/integrations/figma/ws-server.ts` — WS сервер (порт 9418)

### Этап 3: Design Spec Format

JSON-формат который Claude генерирует, а плагин интерпретирует.

```typescript
interface DesignSpec {
  name: string;
  width: number;
  height: number;
  background?: Color;
  children: DesignNode[];
}

interface DesignNode {
  type: 'frame' | 'text' | 'rectangle' | 'ellipse' | 'group' | 'component';
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: Color;
  stroke?: Color;
  cornerRadius?: number;
  text?: string;        // for type='text'
  fontSize?: number;
  fontWeight?: number;
  children?: DesignNode[];
  autoLayout?: {
    direction: 'horizontal' | 'vertical';
    gap: number;
    padding: number;
  };
}
```

**Tool:**
| Tool | Type | Описание |
|------|------|----------|
| `elio_figma_create` | write | Отправить DesignSpec в плагин, получить URL |
| `elio_figma_modify` | write | Изменить node по ID |
| `elio_figma_status` | read | Статус подключения плагина |

### Этап 4: Figma Plugin

TypeScript плагин для Figma, который:
1. Подключается к WS серверу
2. Получает DesignSpec
3. Создаёт элементы через Figma Plugin API
4. Возвращает результат (node ID, URL)

**Файлы:** вся директория `figma-plugin/`

---

## Поток работы (User Flow)

```
1. Пользователь: "Сделай лендинг для SaaS продукта"
2. Claude: Генерирует DesignSpec JSON
3. Claude: Вызывает elio_figma_create(spec)
4. MCP: Отправляет spec через WebSocket
5. Plugin: Создаёт дизайн в Figma
6. Plugin: Возвращает nodeId + URL
7. Claude: "Готово: [ссылка на файл в Figma]"
```

---

## Verification

1. **REST API**: вызвать `elio_figma_files` — должен вернуть список
2. **WS Bridge**: `elio_figma_status` — connected/disconnected
3. **Plugin**: открыть Figma, запустить плагин, проверить WS connection
4. **E2E**: отправить простой DesignSpec (1 frame + 1 text), проверить создание в Figma
5. **Build**: `cd mcp-server && bun build` без ошибок
