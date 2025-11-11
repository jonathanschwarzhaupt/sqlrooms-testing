# SQLRooms AI Slice - Deep Dive

## Overview

This document provides a comprehensive understanding of the SQLRooms AI Slice, explaining its architecture, key concepts, correct implementation patterns, and common pitfalls. It includes detailed analysis of TypeScript errors you may encounter and their solutions based on the actual package API.

### What is the AI Slice?

The **AI Slice** is a Zustand state management module that adds conversational AI capabilities to your SQLRooms application. It enables:

- **Natural language interaction** with your database through LLMs (Large Language Models)
- **Tool-based function calling** where AI can execute SQL queries, create visualizations, export data
- **Multi-session management** for concurrent conversations with different contexts
- **Provider flexibility** supporting OpenAI, Anthropic, Google, and custom providers
- **Schema-aware prompting** where AI understands your database structure automatically

Think of it as a **conversation engine** that bridges natural language with structured data operations, making your database accessible through conversational interfaces.

---

## Key Concepts

### 1. Sessions - Isolated Conversations

A **session** represents a single conversation thread with an AI model. Each session is completely isolated:

```typescript
type Session = {
  id: string;                    // Unique identifier (CUID2)
  name: string;                  // Display name for the session
  modelProvider: string;         // 'openai', 'anthropic', 'google', etc.
  model: string;                 // Specific model: 'gpt-4o', 'claude-sonnet-4'
  createdAt: Date;               // Timestamp
  uiMessages: UIMessage[];       // Complete conversation history
  analysisResults: AnalysisResult[];  // Legacy structure (derived)
  toolAdditionalData: Record<string, unknown>;  // Extra UI rendering data
}
```

**Why sessions?**
- **Multiple concurrent conversations**: Different analyses running simultaneously
- **Model flexibility**: Use GPT-4 for one task, Claude for another
- **Isolated contexts**: Each session has its own history and state
- **Persistent history**: Sessions can be saved and resumed

**Session Lifecycle**:
1. Create session with `createSession({ name, modelProvider, model })`
2. User sends message → added to `uiMessages`
3. AI responds (may call tools) → response added to `uiMessages`
4. Tool results rendered → stored in `toolAdditionalData`
5. Session persisted → saved to storage

---

### 2. Messages - Vercel AI SDK v5 Format

The `uiMessages` array uses the **Vercel AI SDK v5** message format, which is the standard for AI interactions:

```typescript
type UIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<TextPart | ToolCallPart | ToolResultPart>;
  toolInvocations?: ToolInvocation[];
}
```

**Message Types**:

**User Message**:
```typescript
{
  role: 'user',
  content: 'What are my top-selling products?'
}
```

**Assistant Message (with tool call)**:
```typescript
{
  role: 'assistant',
  content: '',
  toolInvocations: [{
    state: 'call',
    toolCallId: 'call_abc123',
    toolName: 'query',
    args: { sql: 'SELECT * FROM products ORDER BY sales DESC LIMIT 10' }
  }]
}
```

**Tool Result Message**:
```typescript
{
  role: 'assistant',
  content: '',
  toolInvocations: [{
    state: 'result',
    toolCallId: 'call_abc123',
    toolName: 'query',
    args: { sql: '...' },
    result: { success: true, data: [...] }
  }]
}
```

This format supports:
- Simple text exchanges
- Tool calls (AI requesting function execution)
- Tool results (outputs from executed functions)
- Multi-part content (text + structured data + images)

---

### 3. Tools - Function Calling with AI

**Tools** are functions that the AI can call to perform actions. They follow the `OpenAssistantTool` pattern:

```typescript
type OpenAssistantTool = {
  name: string;              // Unique identifier
  description: string;       // What it does (for AI context)
  parameters: ZodSchema;     // Input validation schema
  execute: (args, context?) => Promise<ToolResult>;
  component?: React.ComponentType;    // Optional UI renderer
  context?: () => Promise<any>;       // Runtime context provider
}
```

#### Tool Execution Flow

```
┌──────────────────────────────────────────────────────────┐
│ 1. User: "Show me sales data"                           │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 2. AI decides to call 'query' tool                      │
│    Parameters: { sql: "SELECT * FROM sales" }           │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 3. Parameters validated against Zod schema              │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 4. execute() function runs with validated params        │
│    - Accesses database via store                        │
│    - Runs SQL query                                     │
│    - Returns {llmResult, additionalData}                │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 5. Results split:                                        │
│    llmResult → Sent back to AI for reasoning            │
│    additionalData → Used by UI component                │
└────────────────────┬─────────────────────────────────────┘
                     ↓
┌──────────────────────────────────────────────────────────┐
│ 6. component renders the result (if provided)           │
│    - Displays table, chart, or custom visualization     │
└──────────────────────────────────────────────────────────┘
```

#### Example: Custom Echo Tool

```typescript
{
  name: "echo",
  description: "A simple echo tool that returns the input text. Use this to test tool calling.",
  parameters: z.object({
    text: z.string().describe("The text to echo back to the user"),
    uppercase: z.boolean().optional().describe("Whether to uppercase the text"),
  }),
  execute: async ({ text, uppercase }) => {
    const result = uppercase ? text.toUpperCase() : text;
    return {
      llmResult: {
        success: true,
        details: `Echoed: ${result}`,
      },
      additionalData: {
        originalText: text,
        echoedText: result
      }
    };
  },
  component: EchoToolResult,  // React component to display
}
```

**Key Points**:
- `parameters`: Zod schema defines and validates inputs
- `execute`: Returns two parts:
  - `llmResult`: What the AI sees (for reasoning)
  - `additionalData`: What the UI displays (for visualization)
- `component`: Optional React component for rich rendering

---

### 4. Default Tools - Built-in Functionality

SQLRooms provides built-in tools via `getDefaultTools()`:

| Tool Name | Purpose | What it Does |
|-----------|---------|--------------|
| `query` | Execute SQL | Runs SELECT queries against DuckDB |
| `analyze_data` | Statistical analysis | Computes statistics (mean, median, etc.) |
| `export_data` | Export results | Saves data to CSV, JSON, or Parquet |
| `create_visualization` | Generate charts | Creates visualizations using charting libraries |

These tools **automatically integrate** with your DuckDB store instance.

**Usage**:
```typescript
tools: {
  ...getDefaultTools(store, {
    readOnly: true,                    // Only allow SELECT queries
    numberOfRowsToShareWithLLM: 0,     // Rows to include in prompt (0 = none)
    autoSummary: true,                 // Auto-summarize large results
  }),
  // ... your custom tools
}
```

**Default Tools Options**:
```typescript
type DefaultToolsOptions = {
  readOnly?: boolean;  // default: true
    // If true, only SELECT queries allowed
    // If false, INSERT/UPDATE/DELETE also allowed

  numberOfRowsToShareWithLLM?: number;  // default: 0
    // How many data rows to include in the prompt
    // 0 = only schema, no data
    // Higher numbers = more context but larger prompts

  autoSummary?: boolean;  // default: true
    // Automatically summarize results if too large
};
```

---

### 5. Vega Chart Tool - Data Visualization

`createVegaChartTool()` from `@sqlrooms/vega` enables the AI to create **interactive data visualizations** using Vega-Lite specifications.

**How it works**:
1. AI generates Vega-Lite spec (declarative JSON)
2. Tool validates the specification
3. Component renders as interactive chart
4. User can interact with visualization

**Example Vega-Lite spec the AI might generate**:
```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"values": [...]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "sales", "type": "quantitative"}
  }
}
```

---

### 6. Instructions - System Prompts

The `getInstructions` function generates the **system prompt** that tells the AI:
- What database tables exist
- What columns and types each table has
- What tools it can use
- How to help the user

```typescript
getInstructions: () => {
  const tables = store.getState().db.tables || [];
  return getDefaultInstructions(tables);
}
```

**What does `getDefaultInstructions` generate?**

It creates a prompt like:
```
You are a helpful data analysis assistant with access to a DuckDB database.

Available Tables:
1. users (id: INTEGER, name: VARCHAR, email: VARCHAR, created_at: TIMESTAMP)
2. orders (id: INTEGER, user_id: INTEGER, total: DECIMAL, status: VARCHAR)
3. products (id: INTEGER, name: VARCHAR, price: DECIMAL, category: VARCHAR)

Tools Available:
- query: Execute SQL queries
- analyze_data: Perform statistical analysis
- export_data: Export data to files
- chart: Create visualizations

When the user asks questions:
1. Analyze the available tables and columns
2. Use appropriate tools to answer their question
3. Provide clear, actionable insights
```

**Why is this called each time?**
- Database schema can change (new tables added, columns modified)
- Ensures AI always has current information
- Adapts to dynamic data structures

---

## Architecture: How AI Slice Integrates

### Store Composition Pattern

SQLRooms uses a **slice composition pattern** where each slice adds specific functionality:

```typescript
createRoomStore<RoomConfig, RoomState>((set, get, store) => ({
  // Each slice contributes state + methods
  ...createRoomShellSlice({...})(set, get, store),      // UI layout & panels
  ...createSqlEditorSlice()(set, get, store),          // SQL editor
  ...createDuckDbSlice({...})(set, get, store),        // Database connection
  ...createAiSettingsSlice()(set, get, store),         // AI provider configs
  ...createAiSlice({...})(set, get, store),            // AI conversations

  // Your custom state
  currentWorkspace: "query",
  setCurrentWorkspace: (workspace) => { /* ... */ },
}));
```

**Key Points**:
- Each slice is **independent** but can access the full store via `store` parameter
- Slices are composed using the spread operator (`...`)
- The `(set, get, store)` pattern is standard Zustand middleware
- Type safety is maintained through TypeScript generics

### DuckDB Integration

The AI slice accesses your database through the store:

```typescript
// Inside a tool's execute function
const execute = async (args, context) => {
  const store = context.store;  // Access to full store

  // Query the database
  const result = await store.getState().db.query('SELECT * FROM users');

  // Access schema information
  const tables = store.getState().db.tables;

  return {
    llmResult: { success: true, rowCount: result.length },
    additionalData: { data: result }
  };
};
```

This enables:
- **Schema-aware responses**: AI knows your table structure
- **Dynamic SQL generation**: AI creates queries based on available data
- **Real-time data access**: Direct database querying without API layers
- **Automated analysis**: AI can explore data independently

---

## Correct Implementation Pattern

Based on the actual TypeScript definitions from `@sqlrooms/ai`, here's the correct way to implement the AI slice:

### Required Imports

```typescript
import {
    createAiSettingsSlice,
    createAiSlice,
    getDefaultInstructions,
    getDefaultTools,  // NOT createDefaultAiTools!
    type AiSettingsSliceState,
    type AiSliceState,
} from "@sqlrooms/ai";

import { createVegaChartTool } from "@sqlrooms/vega";
```

### Type Definitions

```typescript
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState &
    AiSettingsSliceState &  // Add this
    AiSliceState & {        // Add this
        // Your custom state
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
    };
```

### Store Configuration

```typescript
export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // 1. Room Shell Slice (with AI settings in config!)
    ...createRoomShellSlice<RoomConfig>({
        config: {
            title: "My Data App",
            layout: WORKSPACES.query,
            ...createDefaultSqlEditorConfig(),
            ...createDefaultDuckDbConfig(),
            aiSettings: AI_SETTINGS,  // ← AI settings go HERE!
        },
        room: {
            panels: {
                // ... your panels
            },
        },
    })(set, get, store),

    // 2. SQL Editor Slice
    ...createSqlEditorSlice()(set, get, store),

    // 3. DuckDB Slice
    ...createDuckDbSlice({})(set, get, store),

    // 4. AI Settings Slice (NO ARGUMENTS!)
    ...createAiSettingsSlice()(set, get, store),

    // 5. AI Slice
    ...createAiSlice({
        initialAnalysisPrompt: "What insights can you provide from my data?",

        // Extract tables from store state, not passing store directly!
        getInstructions: () => {
            const tables = store.getState().db.tables || [];
            return getDefaultInstructions(tables);
        },

        // Use 'customTools' not 'tools'!
        customTools: {
            // Use getDefaultTools, not createDefaultAiTools!
            ...getDefaultTools(store, {
                readOnly: true,
                numberOfRowsToShareWithLLM: 0,
                autoSummary: true,
            }),

            // Add chart tool
            chart: createVegaChartTool(),

            // Add custom tools
            echo: {
                name: "echo",
                description: "A simple echo tool that returns the input text.",
                parameters: z.object({
                    text: z.string().describe("The text to echo back"),
                }),
                execute: async ({ text }) => ({
                    llmResult: {
                        success: true,
                        details: `Echo: ${text}`,
                    },
                    additionalData: { echoedText: text }
                }),
                component: EchoToolResult,
            },
        },
    })(set, get, store),

    // 6. Your custom state
    currentWorkspace: "query" as WorkspaceId,
    setCurrentWorkspace: (workspace: WorkspaceId) => {
        set({ currentWorkspace: workspace });
        get().layout.setLayout(WORKSPACES[workspace]);
    },
}));
```

---

## Deep Dive: Your TypeScript Errors

Let's analyze each error you encountered and understand **why** it happened based on the actual package API.

### Error 1: Line 24 - "module has no exported member createDefaultAiTools"

**Your Code**:
```typescript
import {
    createDefaultAiTools,  // ← This doesn't exist!
    // ...
} from "@sqlrooms/ai";
```

**Root Cause**:
The function `createDefaultAiTools` **does not exist** in `@sqlrooms/ai`. The actual function is called `getDefaultTools`.

**Evidence from TypeScript Definitions**:
From `node_modules/@sqlrooms/ai/dist/index.d.ts`:
```typescript
export { getDefaultInstructions } from './analysis';
export { createAiSlice } from './AiSlice';
export { createAiSettingsSlice } from './AiSettingsSlice';
// NO export for createDefaultAiTools!
```

From `node_modules/@sqlrooms/ai/dist/analysis.d.ts`:
```typescript
export declare function getDefaultTools(
    store: StoreApi<AiSliceState & DuckDbSliceState>,
    options?: DefaultToolsOptions
): Record<string, AiSliceTool>;
```

**Why this naming?**
- **Consistency**: Functions that create configuration use `create` prefix (e.g., `createAiSlice`)
- **Clarity**: `get` prefix indicates retrieval/generation (e.g., `getDefaultInstructions`)
- **Pattern**: Tools are "retrieved" from the store context, not "created" in isolation

**Fix**:
```typescript
import {
    getDefaultTools,  // ← Correct name
    // ...
} from "@sqlrooms/ai";

// Usage:
customTools: {
    ...getDefaultTools(store, { readOnly: true }),
}
```

---

### Error 2: Line 130 - "argument of type StoreApi<RoomState> is not assignable to parameter of type DataTable[]"

**Your Code**:
```typescript
getInstructions: () => {
    return getDefaultInstructions(store);  // ← Wrong parameter type!
},
```

**Root Cause**:
The function `getDefaultInstructions` expects `DataTable[]` as its parameter, but you're passing the entire `StoreApi<RoomState>` object.

**Evidence from TypeScript Definitions**:
From `node_modules/@sqlrooms/ai/dist/analysis.d.ts` line 9:
```typescript
export declare function getDefaultInstructions(tablesSchema: DataTable[]): string;
```

**What is `DataTable`?**
```typescript
type DataTable = {
    name: string;           // Table name
    columns: Column[];      // Array of column definitions
    rowCount?: number;      // Optional row count
};

type Column = {
    name: string;           // Column name
    type: string;           // SQL type (VARCHAR, INTEGER, etc.)
    nullable?: boolean;     // Can it be NULL?
};
```

**Why not pass the store directly?**
- **Separation of concerns**: The instruction generator only needs table schema, not the entire store
- **Testability**: You can test `getDefaultInstructions` with mock data
- **Type safety**: Explicit parameter types prevent mistakes
- **Flexibility**: Can work with schema from any source (not just DuckDB)

**Where do tables come from?**
The DuckDB slice stores tables in `store.getState().db.tables`:

```typescript
// DuckDB slice state structure
{
    db: {
        tables: DataTable[],    // ← Your table schema
        connector: Connector,
        query: (sql: string) => Promise<any[]>,
        // ... other methods
    }
}
```

**Fix**:
```typescript
getInstructions: () => {
    // Extract tables array from store state
    const tables = store.getState().db.tables || [];
    return getDefaultInstructions(tables);
},
```

**Why the `|| []` fallback?**
- During initialization, tables might be undefined
- Prevents runtime errors
- Returns empty instructions if no tables exist yet

---

### Error 3: Line 124 - "expected 0 arguments, but got 1"

**Your Code**:
```typescript
...createAiSettingsSlice({ config: AI_SETTINGS })(set, get, store),
// OR
...createAiSettingsSlice(AI_SETTINGS)(set, get, store),
```

**Root Cause**:
The function `createAiSettingsSlice` is **parameterless** - it expects no arguments.

**Evidence from TypeScript Definitions**:
From `node_modules/@sqlrooms/ai/dist/AiSettingsSlice.d.ts` line 143:
```typescript
export declare function createAiSettingsSlice<
    PC extends BaseRoomConfig & AiSettingsSliceConfig
>(): StateCreator<AiSettingsSliceState>;
```

Notice the empty parameter list `()` - the function takes no arguments!

**Why is it parameterless?**

The AI Settings Slice uses a different configuration pattern than other slices. Instead of accepting configuration as a parameter, it reads configuration from the `BaseRoomConfig` passed to `createRoomShellSlice`.

**Configuration Flow**:
```typescript
// 1. AI settings defined separately
const AI_SETTINGS = {
    providers: [
        {
            name: "openai",
            apiKey: process.env.OPENAI_API_KEY,
            baseUrl: "https://api.openai.com/v1",
        }
    ],
    defaultProvider: "openai",
};

// 2. Settings merged into room config
...createRoomShellSlice({
    config: {
        title: "My App",
        ...createDefaultDuckDbConfig(),
        aiSettings: AI_SETTINGS,  // ← Goes here!
    },
    // ...
})

// 3. AI Settings Slice reads from room config (no parameters!)
...createAiSettingsSlice()(set, get, store),
```

**Why this pattern?**
- **Centralized configuration**: All settings in one place (`config` object)
- **Type safety**: Config validated by `AiSettingsSliceConfig` schema
- **Consistency**: Matches pattern of other configuration-based slices
- **Persistence**: Room config can be saved/loaded as a unit

**What is `AiSettingsSliceConfig`?**
```typescript
type AiSettingsSliceConfig = {
    providers: Provider[];        // Array of LLM providers
    defaultProvider: string;      // Which provider to use by default
};

type Provider = {
    name: string;                 // e.g., "openai", "anthropic"
    apiKey?: string;              // API key (optional, can use env vars)
    baseUrl?: string;             // Custom API endpoint
    models?: string[];            // Available models for this provider
};
```

**Fix**:
```typescript
// Step 1: Remove argument from createAiSettingsSlice
...createAiSettingsSlice()(set, get, store),

// Step 2: Add AI settings to room config
...createRoomShellSlice<RoomConfig>({
    config: {
        title: "My Data App",
        ...createDefaultSqlEditorConfig(),
        ...createDefaultDuckDbConfig(),
        aiSettings: AI_SETTINGS,  // ← Add this!
    },
    // ...
})(set, get, store),
```

---

## AI Settings Configuration Deep Dive

Let's understand how AI settings work in detail.

### Where Do Settings Come From?

**Option 1: Hardcoded Configuration**
```typescript
// config.ts
export const AI_SETTINGS = {
    providers: [
        {
            name: "openai",
            apiKey: "sk-...",  // Not recommended in code!
            baseUrl: "https://api.openai.com/v1",
        }
    ],
    defaultProvider: "openai",
};
```

**Option 2: Environment Variables (Recommended)**
```typescript
// config.ts
export const AI_SETTINGS = {
    providers: [
        {
            name: "openai",
            apiKey: process.env.OPENAI_API_KEY,  // From .env file
            baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        },
        {
            name: "anthropic",
            apiKey: process.env.ANTHROPIC_API_KEY,
            baseUrl: "https://api.anthropic.com",
        }
    ],
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || "openai",
};
```

**Option 3: Runtime Configuration (Advanced)**
```typescript
// User can add providers through UI
const addProvider = useRoomStore((s) => s.aiSettings.addProvider);

addProvider({
    name: "custom-llm",
    apiKey: userInput,
    baseUrl: "https://my-custom-llm.com/api",
});
```

### How createAiSettingsSlice Works

Even though `createAiSettingsSlice()` takes no parameters, it still provides full configuration management:

**State it adds**:
```typescript
{
    aiSettings: {
        providers: Provider[],
        defaultProvider: string,
        addProvider: (provider: Provider) => void,
        removeProvider: (name: string) => void,
        setDefaultProvider: (name: string) => void,
        getProvider: (name: string) => Provider | undefined,
    }
}
```

**How it reads initial config**:
The slice reads from the `BaseRoomConfig` that was passed to `createRoomShellSlice`:

```typescript
// Internally, createAiSettingsSlice does something like:
(set, get, store) => {
    // Read initial config from room config
    const roomConfig = get().config;
    const initialProviders = roomConfig.aiSettings?.providers || [];
    const initialDefault = roomConfig.aiSettings?.defaultProvider || "openai";

    return {
        aiSettings: {
            providers: initialProviders,
            defaultProvider: initialDefault,
            // ... methods
        }
    };
}
```

---

## Tools Deep Dive

### Tool Structure

Every tool in SQLRooms follows the `OpenAssistantTool` interface:

```typescript
type OpenAssistantTool = {
    name: string;
    description: string;
    parameters: ZodSchema;
    execute: (args: any, context?: ToolContext) => Promise<ToolResult>;
    component?: React.ComponentType<any>;
    context?: () => Promise<any>;
};

type ToolResult = {
    llmResult: {
        success: boolean;
        details?: string;
        error?: string;
        [key: string]: any;
    };
    additionalData?: Record<string, unknown>;
};

type ToolContext = {
    store: StoreApi<RoomState>;
    sessionId: string;
    messageId: string;
};
```

### Creating Custom Tools

#### Example 1: Simple Data Transformation Tool

```typescript
{
    name: "convert_currency",
    description: "Convert an amount from one currency to another using current exchange rates.",
    parameters: z.object({
        amount: z.number().describe("The amount to convert"),
        from: z.string().describe("Source currency code (e.g., 'USD')"),
        to: z.string().describe("Target currency code (e.g., 'EUR')"),
    }),
    execute: async ({ amount, from, to }) => {
        try {
            // Call exchange rate API
            const rate = await fetchExchangeRate(from, to);
            const converted = amount * rate;

            return {
                llmResult: {
                    success: true,
                    details: `Converted ${amount} ${from} to ${converted.toFixed(2)} ${to}`,
                    rate: rate,
                    convertedAmount: converted,
                },
                additionalData: {
                    originalAmount: amount,
                    originalCurrency: from,
                    targetCurrency: to,
                    exchangeRate: rate,
                    result: converted,
                }
            };
        } catch (error) {
            return {
                llmResult: {
                    success: false,
                    error: `Failed to convert currency: ${error.message}`,
                }
            };
        }
    },
    component: CurrencyConversionResult,  // React component to display
}
```

#### Example 2: Database Tool with Context

```typescript
{
    name: "get_user_stats",
    description: "Get statistical information about a specific user from the database.",
    parameters: z.object({
        userId: z.number().describe("The ID of the user to analyze"),
    }),
    execute: async ({ userId }, context) => {
        const store = context.store;

        // Query user data
        const userData = await store.getState().db.query(
            `SELECT * FROM users WHERE id = ${userId}`
        );

        // Query user's orders
        const orders = await store.getState().db.query(
            `SELECT * FROM orders WHERE user_id = ${userId}`
        );

        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = totalSpent / orders.length;

        return {
            llmResult: {
                success: true,
                details: `User ${userId} has ${orders.length} orders totaling $${totalSpent.toFixed(2)}`,
                orderCount: orders.length,
                totalSpent: totalSpent,
                averageOrderValue: avgOrderValue,
            },
            additionalData: {
                user: userData[0],
                orders: orders,
                stats: {
                    orderCount: orders.length,
                    totalSpent: totalSpent,
                    avgOrderValue: avgOrderValue,
                }
            }
        };
    },
    component: UserStatsDisplay,
}
```

### Tool Result Components

The `component` property is a React component that renders the tool result:

```typescript
// EchoToolResult.tsx
import { FC } from 'react';

type EchoToolResultProps = {
    result: {
        llmResult: any;
        additionalData: {
            originalText: string;
            echoedText: string;
        };
    };
};

const EchoToolResult: FC<EchoToolResultProps> = ({ result }) => {
    const { originalText, echoedText } = result.additionalData;

    return (
        <div className="p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Echo Result</h3>
            <div className="space-y-2">
                <div>
                    <span className="text-muted-foreground">Original:</span>
                    <span className="ml-2">{originalText}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Echoed:</span>
                    <span className="ml-2 font-mono">{echoedText}</span>
                </div>
            </div>
        </div>
    );
};

export default EchoToolResult;
```

**Key Points**:
- Component receives `result` prop with `llmResult` and `additionalData`
- Use `additionalData` for UI rendering (not `llmResult`)
- Style with Tailwind CSS (matches SQLRooms theme)
- Can be interactive (buttons, forms, etc.)

---

## Best Practices

### 1. Tool Design Patterns

**Good Tool Design**:
- ✅ Clear, descriptive name
- ✅ Detailed description for AI context
- ✅ Well-defined Zod schema with descriptions
- ✅ Proper error handling
- ✅ Meaningful `llmResult` for AI reasoning
- ✅ Rich `additionalData` for UI display

**Bad Tool Design**:
- ❌ Vague name like "do_thing"
- ❌ Missing parameter descriptions
- ❌ Unhandled errors
- ❌ Empty `llmResult`
- ❌ No UI component for complex results

### 2. Error Handling

Always handle errors gracefully:

```typescript
execute: async (args, context) => {
    try {
        // Your tool logic
        const result = await performOperation(args);

        return {
            llmResult: {
                success: true,
                details: "Operation completed successfully",
                data: result,
            },
            additionalData: { result }
        };
    } catch (error) {
        console.error('Tool execution failed:', error);

        return {
            llmResult: {
                success: false,
                error: error.message,
                details: "Operation failed. Please try again.",
            },
            additionalData: {
                errorType: error.constructor.name,
                errorMessage: error.message,
            }
        };
    }
}
```

### 3. Parameter Validation

Use Zod's full capabilities:

```typescript
parameters: z.object({
    // Required string with description
    query: z.string()
        .min(1, "Query cannot be empty")
        .describe("The SQL query to execute"),

    // Optional number with default
    limit: z.number()
        .int()
        .positive()
        .optional()
        .default(100)
        .describe("Maximum number of rows to return"),

    // Enum for restricted values
    format: z.enum(['json', 'csv', 'parquet'])
        .optional()
        .default('json')
        .describe("Output format for the results"),

    // Complex nested object
    options: z.object({
        includeMetadata: z.boolean().default(false),
        sortBy: z.string().optional(),
    }).optional(),
})
```

### 4. Testing Tools

Test tools independently:

```typescript
// tools.test.ts
import { describe, it, expect } from 'vitest';

describe('Echo Tool', () => {
    it('should echo text correctly', async () => {
        const result = await echoTool.execute({ text: "Hello" });

        expect(result.llmResult.success).toBe(true);
        expect(result.additionalData.echoedText).toBe("Hello");
    });

    it('should uppercase when requested', async () => {
        const result = await echoTool.execute({
            text: "hello",
            uppercase: true
        });

        expect(result.additionalData.echoedText).toBe("HELLO");
    });
});
```

---

## Complete Working Example

Here's your complete `store.ts` with all fixes applied and annotated:

```typescript
import {
    BaseRoomConfig,
    createRoomShellSlice,
    createRoomStore,
    LayoutConfig,
    type RoomShellSliceState,
} from "@sqlrooms/room-shell";
import {
    createDefaultSqlEditorConfig,
    createSqlEditorSlice,
    SqlEditorSliceConfig,
    type SqlEditorSliceState,
} from "@sqlrooms/sql-editor";
import {
    createDefaultDuckDbConfig,
    createDuckDbSlice,
    DuckDbSliceConfig,
    type DuckDbSliceState,
} from "@sqlrooms/duckdb";
import {
    createAiSettingsSlice,
    createAiSlice,
    getDefaultInstructions,
    getDefaultTools,  // ✅ FIXED: Changed from createDefaultAiTools
    type AiSettingsSliceState,
    type AiSliceState,
} from "@sqlrooms/ai";
import { createVegaChartTool } from "@sqlrooms/vega";
import { z } from "zod";
import { DatabaseIcon } from "lucide-react";

import { MainView } from "./MainView";
import { DataViewAccordion } from "./DataViewV2";
import { AI_SETTINGS } from "./config";
import EchoToolResult from "./EchoToolResult";

// Define combined config schema
export const RoomConfig =
    BaseRoomConfig.merge(SqlEditorSliceConfig).merge(DuckDbSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// Define combined state type
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState &
    AiSettingsSliceState &  // ✅ Include AI settings state
    AiSliceState & {        // ✅ Include AI slice state
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
    };

// Create workspace layout configs
const dataWorkspace: LayoutConfig = {
    type: "mosaic",
    nodes: {
        direction: "row",
        first: "file-upload",
        second: "data-connectors",
        splitPercentage: 40,
    },
};

const queryWorkspace: LayoutConfig = {
    type: "mosaic",
    nodes: {
        direction: "row",
        first: "data-view",
        second: "ai-view",
        splitPercentage: 30,
    },
};

const chartWorkspace: LayoutConfig = {
    type: "mosaic",
    nodes: "chart-view",
};

const WORKSPACES = {
    data: dataWorkspace,
    query: queryWorkspace,
    chart: chartWorkspace,
};
type WorkspaceId = keyof typeof WORKSPACES;

export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // Room shell slice
    ...createRoomShellSlice<RoomConfig>({
        config: {
            title: "My Data App",
            layout: WORKSPACES.query,
            ...createDefaultSqlEditorConfig(),
            ...createDefaultDuckDbConfig(),
            aiSettings: AI_SETTINGS,  // ✅ FIXED: AI settings in config
        },
        room: {
            panels: {
                "data-view": {
                    title: "Data View",
                    icon: DatabaseIcon,
                    component: DataViewAccordion,
                    placement: "main",
                },
                "ai-view": {
                    title: "Main View",
                    component: MainView,
                    placement: "main",
                },
            },
        },
    })(set, get, store),

    // SQL editor slice
    ...createSqlEditorSlice()(set, get, store),

    // DuckDB slice
    ...createDuckDbSlice({})(set, get, store),

    // AI settings slice - NO ARGUMENTS!
    ...createAiSettingsSlice()(set, get, store),  // ✅ FIXED: No parameters

    // AI slice
    ...createAiSlice({
        initialAnalysisPrompt: "What insights can you provide from my data?",

        // ✅ FIXED: Extract tables from store state
        getInstructions: () => {
            const tables = store.getState().db.tables || [];
            return getDefaultInstructions(tables);
        },

        // ✅ FIXED: Use customTools and getDefaultTools
        customTools: {
            ...getDefaultTools(store, {
                readOnly: true,
                numberOfRowsToShareWithLLM: 0,
                autoSummary: true,
            }),

            chart: createVegaChartTool(),

            echo: {
                name: "echo",
                description: "A simple echo tool that returns the input text.",
                parameters: z.object({
                    text: z.string().describe("The text to echo back"),
                }),
                execute: async ({ text }: { text: string }) => {
                    return {
                        llmResult: {
                            success: true,
                            details: `Echo: ${text}`,
                        },
                        additionalData: { echoedText: text }
                    };
                },
                component: EchoToolResult,
            },
        },
    })(set, get, store),

    // Workspace state
    currentWorkspace: "query" as WorkspaceId,
    setCurrentWorkspace: (workspace: WorkspaceId) => {
        set({ currentWorkspace: workspace });
        const newLayout = WORKSPACES[workspace];
        get().layout.setLayout(newLayout);
        console.log(`Switched to workspace: ${workspace}`);
    },
}));
```

---

## Summary

### Key Takeaways

1. **AI Slice Architecture**:
   - Session-based conversation management
   - Tool-based function calling
   - Schema-aware instruction generation
   - Multi-provider support

2. **Critical API Differences**:
   - Use `getDefaultTools` not `createDefaultAiTools`
   - Pass `DataTable[]` to `getDefaultInstructions`, not the store
   - `createAiSettingsSlice()` takes no arguments
   - AI settings go in `BaseRoomConfig`, not as slice parameters

3. **Tool Design**:
   - Clear naming and descriptions
   - Zod schema for validation
   - Split results: `llmResult` for AI, `additionalData` for UI
   - Optional React components for visualization

4. **Integration Pattern**:
   - Slice composition with spread operators
   - Store access via `context.store` in tools
   - Type safety through TypeScript generics
   - Centralized configuration in room config

### Next Steps

1. **Implement the fixes** in your `store.ts`
2. **Create AI UI components** for your main view
3. **Test the AI integration** with sample queries
4. **Add custom tools** for your specific use cases
5. **Configure AI providers** with proper API keys

Remember: The AI slice is powerful because it bridges natural language with structured data operations, making your database accessible through conversation while maintaining type safety and extensibility through tools.
