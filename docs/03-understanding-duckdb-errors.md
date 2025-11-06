# Understanding DuckDB-WASM Errors and Architecture

## The Error You're Seeing

```
Error: Invalid Error: [Exception... "Failure"  nsresult: "0x80004005 (NS_ERROR_FAILURE)"
location: "JS frame :: https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/dist/duckdb-browser-eh.worker.js :: readFile :: line 1"
data: no]
    runQuery bindings_base.ts:188
    onMessage worker_dispatcher.ts:208
    onmessage duckdb-browser-eh.worker.ts:29
```

## What's Happening Under the Hood

### 1. DuckDB-WASM Architecture

When you upload a CSV file in SQLRooms, here's the complete flow:

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser UI                            │
│  (React Components, DataPanel.tsx)                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ 1. User drops CSV file
                   │ 2. connector.loadFile(file, tableName)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    SQLRooms Store                            │
│  (Zustand state with DuckDB slice)                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ 3. Sends command to connector
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   DuckDB Connector                           │
│  (JavaScript wrapper managing worker communication)          │
└──────────────────┬──────────────────────────────────────────┘
                   │ 4. postMessage() to Web Worker
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Web Worker                                │
│  (duckdb-browser-eh.worker.js)                              │
│  - Runs in separate thread                                  │
│  - Keeps UI responsive                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ 5. Calls WASM module
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              DuckDB-WASM Engine                              │
│  (Compiled C++ database running as WebAssembly)             │
│  - Parses CSV                                               │
│  - Creates table schema                                     │
│  - Stores data in columnar format                           │
└──────────────────┬──────────────────────────────────────────┘
                   │ 6. Returns Apache Arrow data
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Back to UI                                │
│  (Results displayed as table)                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Why Web Workers?

DuckDB operations can be **CPU-intensive**:
- Parsing large CSV files
- Running complex SQL queries
- Data aggregations and joins

If these ran on the **main thread**, your UI would freeze. Web Workers solve this by:
- Running database operations in a background thread
- Keeping the UI responsive
- Allowing query cancellation
- Enabling parallel processing

### 3. Apache Arrow Integration

Data flows between JavaScript and WASM using **Apache Arrow** format:
- **Columnar format**: Data stored by column, not row (much faster for analytics)
- **Zero-copy**: Data transferred without serialization overhead
- **Type-safe**: Preserves data types across boundaries

## Interpreting Your Error

Let's break down the error message:

```
Error: Invalid Error: [Exception... "Failure"  nsresult: "0x80004005 (NS_ERROR_FAILURE)"
```
- **NS_ERROR_FAILURE**: Generic Mozilla/Firefox error code
- Means: "Something went wrong but we don't have details"

```
location: "JS frame :: https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/dist/duckdb-browser-eh.worker.js :: readFile :: line 1"
```
- **Location**: Inside the Web Worker (`duckdb-browser-eh.worker.js`)
- **Function**: `readFile` - trying to read your CSV file
- **Line 1**: Usually means initialization failure, not actual line 1

```
runQuery bindings_base.ts:188
onMessage worker_dispatcher.ts:208
onmessage duckdb-browser-eh.worker.ts:29
```
- **Stack trace**: Shows the call path
  1. `worker.onmessage` - Worker received a message
  2. `worker_dispatcher` - Dispatcher routing the command
  3. `bindings_base.runQuery` - Trying to execute the load operation

## Root Cause: Missing DuckDB Slice

Looking at your code:

**DataPanel.tsx (line 9-12):**
```tsx
const connector = useRoomStore((state) => state.db.connector);
const refreshTableSchemas = useRoomStore(
    (state) => state.db.refreshTableSchemas,
);
```

Your component is trying to access `state.db.connector`, but...

**store.tsx:**
```tsx
export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    ...createRoomShellSlice<RoomConfig>({...})(set, get, store),
    ...createSqlEditorSlice()(set, get, store),  // ❌ Only provides SQL editor UI
    // 🚨 MISSING: createDuckDbSlice() - provides actual database
}));
```

**The problem:**
- `createSqlEditorSlice()` provides the SQL editor UI (Monaco editor, syntax highlighting)
- It does NOT provide database functionality (`state.db.*`)
- You're missing `@sqlrooms/duckdb` package and `createDuckDbSlice()`

When you drop a file:
1. `connector.loadFile()` is called
2. `connector` is `undefined` (no db slice)
3. JavaScript tries to call `undefined.loadFile()`
4. This cascades into DuckDB-WASM with an invalid state
5. Worker throws generic "Failure" error

## The Fix

### Step 1: Install DuckDB Package

```bash
pnpm add @sqlrooms/duckdb
```

This installs:
- DuckDB-WASM engine
- Web Worker scripts
- SQLRooms connector wrapper
- React hooks for database access

### Step 2: Update Your Store

**src/store.tsx:**

```tsx
import {
    BaseRoomConfig,
    createRoomShellSlice,
    createRoomStore,
    type RoomShellSliceState,
    LayoutTypes,
} from "@sqlrooms/room-shell";
import {
    createDefaultSqlEditorConfig,
    createSqlEditorSlice,
    QueryEditorPanel,
    SqlEditorSliceConfig,
    type SqlEditorSliceState,
} from "@sqlrooms/sql-editor";
// ✅ Add DuckDB imports
import {
    createDuckDbSlice,
    type DuckDbSliceState,
} from "@sqlrooms/duckdb";
import { z } from "zod";
import { DataPanel } from "./DataPanel";
import { DatabaseIcon } from "lucide-react";

// Update RoomConfig to include DuckDB config
export const RoomConfig = BaseRoomConfig.merge(SqlEditorSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// ✅ Add DuckDbSliceState to RoomState
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {
        // Add your own state here
    };

export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // base room slice
    ...createRoomShellSlice<RoomConfig>({
        config: {
            layout: {
                type: LayoutTypes.enum.mosaic,
                nodes: {
                    first: "data",
                    second: "main",
                    direction: "row",
                    splitPercentage: 30,
                },
            },
            ...createDefaultSqlEditorConfig(),
        },
        room: {
            panels: {
                main: {
                    component: QueryEditorPanel,
                    placement: "main",
                },
                data: {
                    title: "Data",
                    component: DataPanel,
                    icon: DatabaseIcon,
                    placement: "sidebar",
                },
            },
        },
    })(set, get, store),

    // ✅ Add DuckDB slice - provides state.db.* functionality
    ...createDuckDbSlice()(set, get, store),

    // SQL editor slice - provides query editing UI
    ...createSqlEditorSlice()(set, get, store),
}));
```

### Step 3: Verify It Works

After making these changes:

1. **Restart your dev server**: `pnpm dev`
2. **Check browser console**: Should see DuckDB initialization messages
3. **Try uploading CSV again**: Should work without errors

## What Gets Added

When you add `createDuckDbSlice()`, your store gains:

**State:**
```tsx
state.db.connector          // DuckDB connector instance
state.db.tables            // Array of table names
state.db.tableSchemas      // Schema information
state.db.isInitialized     // Boolean: is DuckDB ready?
state.db.isLoading         // Boolean: is operation running?
```

**Actions:**
```tsx
state.db.refreshTableSchemas()   // Reload table list
state.db.query(sql)              // Execute SQL query
state.db.loadFile(file, name)    // Load CSV/JSON/Parquet
```

## Debugging Tips

### 1. Check DuckDB Initialization

```tsx
const isInitialized = useRoomStore((state) => state.db?.isInitialized);

console.log('DuckDB ready?', isInitialized);
```

### 2. Check Connector Exists

```tsx
const connector = useRoomStore((state) => state.db?.connector);

if (!connector) {
  console.error('No DuckDB connector! Did you add createDuckDbSlice()?');
}
```

### 3. Catch File Load Errors Properly

```tsx
try {
  await connector.loadFile(file, tableName);
} catch (error) {
  console.error('Load error:', error);
  console.error('Error type:', error.constructor.name);
  console.error('Error message:', error.message);
  console.error('Full error object:', error);
}
```

### 4. Monitor Worker Messages

Open DevTools → Console and filter for:
- `[DuckDB]` - Initialization messages
- `[Worker]` - Worker thread messages
- Look for WASM loading errors

## Common DuckDB-WASM Errors

### 1. "Cannot read property of undefined"
- **Cause**: No DuckDB slice in store
- **Fix**: Add `createDuckDbSlice()`

### 2. "Failed to fetch .wasm file"
- **Cause**: CDN blocked or slow network
- **Fix**: Check network tab, wait for WASM to download

### 3. "NS_ERROR_FAILURE" (your error)
- **Cause**: Database not initialized or invalid state
- **Fix**: Ensure DuckDB slice is added before using connector

### 4. "Parser Error: syntax error"
- **Cause**: Invalid SQL syntax
- **Fix**: Check your SQL query string

### 5. "Out of Memory"
- **Cause**: File too large for browser
- **Fix**: Use sampling, increase WASM memory limit, or switch to server-side

## Performance Considerations

### File Size Limits
- **Small (< 10MB)**: Works perfectly in browser
- **Medium (10-100MB)**: May be slow, but works
- **Large (> 100MB)**: Consider streaming or server-side processing

### Optimization Strategies
1. **Query deduplication**: SQLRooms automatically prevents duplicate queries
2. **Pagination**: Load results in chunks
3. **Query cancellation**: Use `QueryHandle` to cancel long-running queries
4. **Selective columns**: `SELECT specific, columns` instead of `SELECT *`

## Next Steps

After fixing your setup:
1. Upload a small CSV (< 1MB) to verify it works
2. Check browser DevTools → Network tab to see WASM loading
3. Open DevTools → Console to see DuckDB initialization
4. Try running SQL queries in the QueryEditorPanel

## Key Takeaways

1. **DuckDB-WASM** = Full database engine running in your browser via WebAssembly
2. **Web Workers** = Keep UI responsive during heavy operations
3. **Slices** = Modular store composition (Shell + DuckDB + SQL Editor)
4. **State access** = Always check if slice exists: `state.db?.connector`
5. **The error you saw** = Missing DuckDB slice, so `connector` was undefined
