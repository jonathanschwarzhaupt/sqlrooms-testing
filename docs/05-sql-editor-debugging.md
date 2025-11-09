# SQL Editor Debugging: Monaco Editor Infinite Spinner

## Problem Summary

The `QueryEditorPanel` component from `@sqlrooms/sql-editor` displayed an infinite loading spinner instead of the Monaco-based SQL editor. This occurred despite:
- All required slices being configured (`RoomShellSlice`, `SqlEditorSlice`, `DuckDbSlice`)
- The DuckDB connector initializing successfully
- Monaco assets loading from CDN (all 200 status codes)
- No JavaScript errors in the browser console

Even simplified components like `SqlMonacoEditor` (standalone, no store required) exhibited the same behavior.

## Root Cause

**Monaco Editor requires web workers for language features (syntax highlighting, IntelliSense, error checking), but Vite doesn't automatically configure them.**

### Why This Happens

#### 1. How Monaco Editor Works

Monaco Editor is the same editor that powers VS Code. It uses a sophisticated architecture:

```
Monaco Editor
├── Main Thread (UI rendering, user input)
└── Web Workers (language services)
    ├── TypeScript/JavaScript worker (type checking, intellisense)
    ├── JSON worker (schema validation)
    ├── CSS worker (syntax checking)
    ├── HTML worker (tag completion)
    └── Editor worker (tokenization, default)
```

**Web Workers** are background threads that run JavaScript separately from the main UI thread. This keeps the editor responsive while performing expensive operations like syntax analysis.

#### 2. Monaco's Initialization Process

When Monaco Editor loads, it follows this sequence:

```javascript
1. Load Monaco core library from CDN
2. Check for self.MonacoEnvironment.getWorker function
3. Call getWorker() to create language service workers
4. Wait for workers to initialize
5. Fire onMount callback → hide spinner, show editor
```

**If step 3 fails** (no getWorker function), Monaco hangs at step 4 indefinitely, leaving the spinner visible forever.

#### 3. The Vite Problem

**In traditional web apps**, Monaco loads workers from the CDN automatically:
```javascript
// Monaco finds workers at: cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/base/worker/workerMain.js
```

**In Vite apps**, this doesn't work because:
- Vite uses ESM (ECMAScript Modules) with different import semantics
- Web Workers need the `?worker` suffix in Vite to be bundled correctly
- Without explicit configuration, `self.MonacoEnvironment` remains undefined
- Monaco can't create workers → initialization hangs

#### 4. Why @sqlrooms/monaco-editor Alone Isn't Enough

The SQLRooms package provides `ensureMonacoLoaderConfigured()` which sets CDN paths:

```javascript
// From node_modules/@sqlrooms/monaco-editor/dist/loader.js
export function ensureMonacoLoaderConfigured() {
    if (!configured) {
        loader.config({ paths: { vs: DEFAULT_CDN_PATH } });
        configured = true;
    }
}
```

**This ONLY configures CDN paths** for loading Monaco's core library. It does **NOT** configure `self.MonacoEnvironment.getWorker`, which is required for Vite.

The package also provides `configureMonacoLoader()` which DOES set up workers:

```javascript
export function configureMonacoLoader(options) {
    const { workers, ...config } = options;
    loader.config(config);

    // This is what we needed!
    if (workers) {
        self.MonacoEnvironment = {
            getWorker(_, label) {
                const WorkerCtor = workers[label] || workers.default || undefined;
                return WorkerCtor ? new WorkerCtor() : undefined;
            },
        };
    }
    configured = true;
}
```

**We needed to call this function with worker imports, but the application wasn't doing so.**

## Debugging Journey

### Phase 1: Store Configuration Verification

**Hypothesis**: Missing slices or incorrect configuration.

**What we checked**:
```javascript
// Added debug logging in MainView.tsx
const connector = useRoomStore((s) => s.db.connector);
const queries = useRoomStore((s) => s.config.sqlEditor.queries);
const selectedQueryId = useRoomStore((s) => s.config.sqlEditor.selectedQueryId);

console.log("🔌 Connector exists:", !!connector);
console.log("📋 Queries:", queries);
console.log("✅ Selected Query ID:", selectedQueryId);
```

**Result**: ✅ All state present and correct
- Connector: `DuckDBConnector` object exists
- Queries: `[{ id: 'default', name: 'Untitled', query: '' }]`
- Selected ID: `'default'`

**Conclusion**: Not a SQLRooms configuration issue.

### Phase 2: Network & Asset Loading

**Hypothesis**: Monaco assets failing to load from CDN.

**What we checked**:
- Browser DevTools → Network tab
- Filtered for "cdn.jsdelivr.net"
- Checked HTTP status codes

**Result**: ✅ All assets loading successfully
```
200 GET cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js
200 GET cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.js (852 KB)
200 GET cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.css
200 GET cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.nls.js
```

**Conclusion**: CDN connectivity not the problem.

### Phase 3: HTML Inspection

**Hypothesis**: Editor rendering but hidden or with zero height.

**What we checked**:
Inspected the HTML structure of the spinner area:

```html
<section style="display: flex; position: relative; width: 100%; height: 100%;">
  <!-- Spinner container (visible) -->
  <div style="display: flex; height: 100%; width: 100%; justify-content: center; align-items: center;">
    <svg class="lucide lucide-loader-circle animate-spin">
      <!-- SPINNER SVG -->
    </svg>
  </div>

  <!-- Editor container (HIDDEN!) -->
  <div style="width: 100%; display: none;"></div>
</section>
```

**Result**: Editor container exists but has `display: none`

**Insight**: This is the default state of `@monaco-editor/react`'s `<Editor>` component:
```javascript
// The Editor shows spinner while loading
<Editor loading={<Spinner />} />

// Once onMount fires, it hides spinner and shows editor
// But onMount was NEVER firing
```

**Conclusion**: Monaco initialization not completing.

### Phase 4: Component Isolation Testing

**Hypothesis**: SQLRooms wrapper components causing the issue.

**What we tested**:
1. Replaced `QueryEditorPanel` with standalone `SqlMonacoEditor`
2. Result: Still spinner ❌
3. Replaced with raw `@monaco-editor/react` `<Editor>`
4. Result: Still spinner ❌

**Conclusion**: Not a SQLRooms integration issue - Monaco itself can't initialize.

### Phase 5: Documentation Deep Dive

**Hypothesis**: Missing required configuration for Vite.

**What we researched**:
1. SQLRooms documentation at https://sqlrooms.org/llms-full.txt
2. Microsoft's official Monaco + Vite sample
3. Monaco Editor GitHub issues related to Vite

**Key finding from SQLRooms docs**:

> "### Monaco Editor Setup (Vite)
>
> Vite requires the `?worker` suffix on worker imports. Use `configureMonacoLoader` to set up workers:
>
> ```typescript
> import { configureMonacoLoader } from '@sqlrooms/monaco-editor';
> import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
> // ... other workers
>
> configureMonacoLoader({
>   monaco,
>   workers: { default: editorWorker, ... }
> });
> ```"

**Conclusion**: ✅ Found the root cause - missing worker configuration!

## Solution

### Step 1: Install monaco-editor Package

The `monaco-editor` package needs to be a direct dependency (not just transitively through `@sqlrooms/monaco-editor`):

```bash
pnpm add monaco-editor
```

This provides the worker modules we need to import.

### Step 2: Create Worker Configuration File

Created `src/monacoWorkerSetup.ts`:

```typescript
import { configureMonacoLoader } from "@sqlrooms/monaco-editor";
import * as monaco from "monaco-editor";

// Import workers with Vite's ?worker suffix
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Configure Monaco with worker factory function
configureMonacoLoader({
    monaco,
    workers: {
        default: editorWorker,
        json: jsonWorker,
        css: cssWorker,
        html: htmlWorker,
        typescript: tsWorker,
        javascript: tsWorker,
    },
});
```

**What this does**:

1. **Imports worker modules**: The `?worker` suffix tells Vite to bundle these as Web Worker scripts
2. **Calls configureMonacoLoader()**: Sets up `self.MonacoEnvironment.getWorker`
3. **Provides worker factory**: Returns the appropriate Worker class for each language

### Step 3: Import Configuration in Application Entry Point

Updated `src/main.tsx` to import the configuration **first**:

```typescript
import "./monacoWorkerSetup";  // ← MUST BE FIRST!
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
```

**Why it must be first**:
- `self.MonacoEnvironment` must be defined BEFORE Monaco components render
- If React mounts Monaco components before workers are configured, initialization fails
- Top-level import execution order matters in JavaScript

### Step 4: Optimize Vite Configuration (Optional but Recommended)

Updated `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['monaco-editor'],  // Pre-bundle Monaco during dev
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],  // Separate chunk for better caching
        },
      },
    },
  },
})
```

**Benefits**:
- **Faster dev server startup**: Monaco is pre-bundled instead of transformed on-demand
- **Better production caching**: Monaco in separate chunk means app updates don't invalidate Monaco cache
- **Smaller main bundle**: Large Monaco library doesn't bloat the main application bundle

## Why The Solution Works

### The Complete Flow (After Fix)

```
1. Application Starts
   ↓
2. src/main.tsx loads
   ↓
3. import "./monacoWorkerSetup" runs
   ↓
4. configureMonacoLoader() executes
   ↓
5. self.MonacoEnvironment = { getWorker: ... } is set
   ↓
6. React mounts
   ↓
7. QueryEditorPanel renders
   ↓
8. Monaco Editor initializes
   ↓
9. Monaco calls self.MonacoEnvironment.getWorker('typescript')
   ↓
10. getWorker returns new tsWorker()
   ↓
11. Worker initializes successfully
   ↓
12. Monaco fires onMount callback
   ↓
13. Spinner hidden, editor visible ✅
```

### Worker Lifecycle in Detail

When you type SQL in the editor, here's what happens:

```javascript
// Main Thread (UI)
User types: "SELECT * FROM users WHERE"
           ↓
Monaco Editor sends text to TypeScript worker
           ↓

// Web Worker (Background Thread)
TypeScript worker analyzes:
- Syntax errors?
- Type checking?
- Available completions?
           ↓
Worker sends back results
           ↓

// Main Thread (UI)
Monaco shows:
- Red squiggly under errors
- Autocomplete dropdown
- Hover information
```

**Without workers**, none of this happens. Monaco just shows raw text with no language intelligence.

## Key Learnings

### 1. Build Tool Differences Matter

The same library (Monaco Editor) requires different setup depending on the build tool:

| Build Tool | Configuration Required |
|------------|----------------------|
| Webpack | Monaco webpack plugin |
| Vite | Worker imports with `?worker` suffix |
| Parcel | Usually works out-of-box |
| Create React App | Monaco webpack plugin (via CRACO) |

**Lesson**: Always check library docs for build-tool-specific setup requirements.

### 2. Web Workers in Modern Bundlers

Vite treats Web Workers specially:

```typescript
// ✅ Vite recognizes this as a worker
import Worker from './worker?worker'

// ❌ This won't work in Vite
import Worker from './worker'
```

The `?worker` suffix is a **Vite import convention** that tells the bundler to:
1. Bundle the file as a Web Worker
2. Inject worker initialization code
3. Return a Worker constructor

**Lesson**: Modern bundlers use import suffixes for special asset types (`?worker`, `?url`, `?raw`, etc.)

### 3. Initialization Order in JavaScript

JavaScript module imports are executed **top-to-bottom**:

```typescript
// ❌ WRONG - React mounts before workers configured
import { App } from "./App";
import "./monacoWorkerSetup";

// ✅ CORRECT - Workers configured before React mounts
import "./monacoWorkerSetup";
import { App } from "./App";
```

**Lesson**: Side-effect imports (like global configuration) should come first.

### 4. Debugging Technique: Elimination Process

Our debugging followed the scientific method:

1. **Hypothesis**: SQLRooms configuration issue
   - **Test**: Check store state
   - **Result**: Configuration correct ✅

2. **Hypothesis**: Network/CDN issue
   - **Test**: Check Network tab
   - **Result**: Assets loading ✅

3. **Hypothesis**: Component integration issue
   - **Test**: Try standalone components
   - **Result**: Still broken ❌

4. **Hypothesis**: Monaco initialization issue
   - **Test**: Check documentation
   - **Result**: Found missing worker config ✅

**Lesson**: Systematic elimination of possibilities leads to root cause.

### 5. Documentation is the Source of Truth

We found the answer in three places:

1. **SQLRooms official docs**: Explicitly documented the Vite worker requirement
2. **Monaco Editor samples**: Microsoft's official Vite example showed the pattern
3. **Library source code**: Reading `@sqlrooms/monaco-editor/loader.js` revealed the worker configuration function

**Lesson**: When debugging library issues, check (in order):
1. Official documentation
2. Example projects/samples
3. GitHub issues
4. Source code

## React 19 Compatibility Note

During debugging, we also verified React 19 compatibility:

- **@monaco-editor/react**: Version 4.7.0+ supports React 19 ✅
- **SQLRooms packages**: All compatible with React 19 ✅

Some peer dependency warnings appear for transitive dependencies (like `react-mosaic-component`), but these don't affect functionality. They're warnings, not errors.

## Prevention for Future Projects

### Vite + Monaco Checklist

When setting up Monaco Editor in a Vite project:

- [ ] Install `monaco-editor` as a dependency
- [ ] Create worker setup file with `configureMonacoLoader()`
- [ ] Import all required workers with `?worker` suffix
- [ ] Import worker setup in `main.tsx` FIRST
- [ ] Add Monaco to `vite.config.ts` `optimizeDeps`
- [ ] Test that editor loads without spinner

### SQLRooms Specific Setup

For SQLRooms projects, the complete initialization checklist:

**Store Configuration**:
- [ ] Import and merge `DuckDbSliceConfig`
- [ ] Add `DuckDbSliceState` to RoomState type
- [ ] Spread `createDuckDbSlice()` in store
- [ ] Include `createDefaultDuckDbConfig()` in config
- [ ] Import and merge `SqlEditorSliceConfig`
- [ ] Add `SqlEditorSliceState` to RoomState type
- [ ] Spread `createSqlEditorSlice()` in store
- [ ] Include `createDefaultSqlEditorConfig()` in config

**Monaco Configuration** (Vite only):
- [ ] Create `monacoWorkerSetup.ts`
- [ ] Import in `main.tsx` before React

**Component Setup**:
- [ ] Wrap app in `<RoomShell roomStore={roomStore}>`
- [ ] Use `QueryEditorPanel` and `QueryResultPanel` in layout
- [ ] Ensure panels have proper height (use flex/full height containers)

## References

- [SQLRooms Documentation](https://sqlrooms.org/llms-full.txt) - Complete framework docs
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Official Monaco docs
- [Monaco + Vite Sample](https://github.com/microsoft/monaco-editor/tree/main/samples/browser-esm-vite-react) - Microsoft's official example
- [Vite Worker Imports](https://vite.dev/guide/features.html#web-workers) - Vite documentation on workers
- [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) - React wrapper docs

## Conclusion

The Monaco Editor infinite spinner was caused by missing Web Worker configuration required by Vite. While SQLRooms provides the `configureMonacoLoader()` function needed to fix this, **it was our responsibility as application developers to call it with the appropriate worker imports.**

This is a common pattern in modern web development: libraries provide the tools, but build-tool-specific setup is the application's responsibility. Always check documentation for build-tool-specific requirements, especially when using sophisticated libraries like Monaco Editor that rely on Web Workers and other browser APIs.

The fix was simple once understood: configure workers before Monaco loads. The debugging process taught us systematic problem-solving, the importance of reading documentation, and how modern build tools handle special assets like Web Workers.
