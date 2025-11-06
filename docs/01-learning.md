# Learning SQLRooms: Troubleshooting Guide

This guide walks through understanding and fixing your minimal SQLRooms setup.

**Essential Documentation:**
- [SQLRooms Full Documentation](https://sqlrooms.org/llms-full.txt) - Complete framework reference
- [React Documentation](https://react.dev/learn) - Learn React fundamentals
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction) - State management library used by SQLRooms
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - TypeScript fundamentals

## Current Status Analysis

### App.tsx (src/App.tsx:1-14)
**What you have:**
```typescript
import { RoomShell } from "@sqlrooms/room-shell";

function App() {
    return (
        <RoomShell className="h-screen" roomStore={roomStore}>
            // ... children
        </RoomShell>
    );
}
```

**The issue:** Look at line 5 - you're using `roomStore`, but where is it coming from?

**Hint #1:** In JavaScript/TypeScript, you need to import variables from other files before you can use them. Check your `store.tsx` - what does it export? How would you bring that into App.tsx?

📚 **Read:** [JavaScript Modules (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### store.tsx (src/store.tsx:1-47)

**What you have:** The overall structure is actually quite good! You have:
- ✅ Correct imports from SQLRooms packages
- ✅ Type definitions (PC and RS)
- ✅ Store creation with `createRoomStore`
- ✅ Configuration with layout and panels
- ✅ Export of `roomStore` and `useRoomStore`

**Issues to investigate:**

**Hint #2 (React and JSX):** Look at lines 33 and 39:
```typescript
component: () => <div>Data Sources Panel</div>,
```
This is JSX (the HTML-like syntax in JavaScript). When you use JSX in a file, you need to import React. Try adding this at the top of your file and see what happens.

📚 **Read:**
- [Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [JavaScript in JSX with Curly Braces](https://react.dev/learn/javascript-in-jsx-with-curly-braces)

**Hint #3 (Panel Components Pattern):** Your panel components are very simple right now, which is fine for getting started! But think about this: each component is just a function that returns JSX. You could make them more interesting later:
```typescript
component: () => {
  // You can add logic here
  const data = useRoomStore(state => state.someData)
  return <div>Your content with {data}</div>
}
```

📚 **Read:**
- [Your First Component](https://react.dev/learn/your-first-component)
- [SQLRooms Panel System](https://sqlrooms.org/llms-full.txt) - Search for "Panel Types"

**Hint #4 (Testing Your Understanding):** Try answering these questions:
1. What does `createRoomShellSlice` return? (It's a function!)
2. Why do you call it with `(set, get, store)` at the end? (Look at the pattern)
3. The spread operator `...` - what does it do when composing slices?

📚 **Read:**
- [Zustand Slices Pattern](https://docs.pmnd.rs/zustand/guides/slices-pattern)
- [Spread Syntax (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)

## What You Should Try

Here's a learning path to get this working:

### Step 1: Fix the Import Issue
- Think about: How do you import things in JavaScript?
- What needs to be imported where?
- Look at the error messages in your browser console or terminal

📚 **Read:** [Import and Export (JavaScript.info)](https://javascript.info/import-export)

### Step 2: Run and Observe
```bash
pnpm dev
```
- Open the browser console (F12)
- Read any error messages carefully
- Errors are your friend - they tell you exactly what's wrong!

📚 **Read:** [Browser DevTools Guide](https://developer.chrome.com/docs/devtools/console/)

### Step 3: Understand the Flow
Once it's working, trace through the code:
1. `main.tsx` imports and renders `App`
2. `App` imports `roomStore` from `store.tsx`
3. `RoomShell` receives the store and uses it
4. `LayoutComposer` reads the layout from the store
5. Panels get rendered based on the layout nodes

📚 **Read:** [Render and Commit (React)](https://react.dev/learn/render-and-commit)

### Step 4: Experiment!
Once you have it running, try these experiments to learn:

**Experiment A - Change the Layout:**
```typescript
// What happens if you change "row" to "column"?
direction: "row",

// What if you change the split percentage?
splitPercentage: 50,
```

📚 **Read:** [SQLRooms Layout System](https://sqlrooms.org/llms-full.txt) - Search for "Mosaic trees"

**Experiment B - Add Content to Panels:**
```typescript
component: () => (
  <div>
    <h1>My Panel</h1>
    <p>Some content here</p>
  </div>
)
```

📚 **Read:** [Describing the UI (React)](https://react.dev/learn/describing-the-ui)

**Experiment C - Add a Third Panel:**
Try adding a third panel and updating the layout to show it. This will help you understand the mosaic tree structure.

📚 **Read:** Our local [SQLRooms Basics Guide](./sqlrooms-basics.md#core-concept-5-layout-system-like-service-compositionrouting)

## Quick Reference: Common React/TypeScript Gotchas

1. **Imports must be at the top of files**
2. **JSX requires React to be imported** (or use the new JSX transform)
3. **Arrow functions:** `() => <div/>` is shorthand for `() => { return <div/> }`
4. **Spread operator:** `{...obj}` copies all properties of obj
5. **Function calls:** `createSlice()()` means createSlice returns a function, which you then call

📚 **Read:**
- [Arrow Function Expressions (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

## Debugging Tips

**If you see:** "roomStore is not defined"
- **Think:** Import issue

**If you see:** "React is not defined"
- **Think:** Missing React import in JSX file

**If you see:** A blank page
- **Think:** Check browser console for errors

**If panels don't show:**
- **Think:** Are panel IDs in layout matching panel definitions?

📚 **Read:** [React Developer Tools](https://react.dev/learn/react-developer-tools)

## Questions to Guide Your Learning

As you work through this, ask yourself:

1. **Why does the store need both `set` and `get` functions?**
   - Hint: How do you update state? How do you read current state?
   - 📚 [Zustand Updating State](https://docs.pmnd.rs/zustand/guides/updating-state)

2. **What's the difference between `config` and `room` in createRoomShellSlice?**
   - Hint: One is persistent data, one defines UI
   - 📚 [SQLRooms Configuration Pattern](https://sqlrooms.org/llms-full.txt) - Search for "Configuration & Persistence"

3. **Why use TypeScript generics `<PC, RS>`?**
   - Hint: Type safety - the store knows what shape your data has
   - 📚 [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

## Learning Path

Try to get it working first, then experiment with making changes. The best way to learn React and SQLRooms is by breaking things and fixing them!

### Key Concepts to Internalize

**State Management Flow:**
```
User Action → Component calls store method →
Store updates state → React re-renders components →
Components read new state from store
```

📚 **Read:**
- [State: A Component's Memory](https://react.dev/learn/state-a-components-memory)
- [Zustand Quick Start](https://docs.pmnd.rs/zustand/getting-started/introduction)

**Panel Rendering Flow:**
```
LayoutComposer reads layout from config →
Finds panel IDs in layout tree →
Looks up panel definitions in room.panels →
Renders panel.component for each ID
```

📚 **Read:** [SQLRooms Component Hierarchy](https://sqlrooms.org/llms-full.txt) - Search for "Component Composition"

**Slice Composition:**
```
Store = {
  ...ShellSlice(set, get, store),  // Adds shell state + methods
  ...YourSlice(set, get, store)     // Adds your state + methods
}
// All slices share the same set/get/store
```

📚 **Read:**
- [Zustand Slices Pattern](https://docs.pmnd.rs/zustand/guides/slices-pattern)
- [SQLRooms Slice-Based Architecture](https://sqlrooms.org/llms-full.txt) - Search for "slice-based state management"

## Next Steps After You Get It Working

1. **Add interactive state:** Create a button that updates a counter
   - 📚 [Responding to Events](https://react.dev/learn/responding-to-events)

2. **Share state between panels:** Have one panel update state that another panel displays
   - 📚 [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)

3. **Add a custom slice:** Create your own slice with custom state and methods
   - 📚 Our local [Adding New Features Guide](../CLAUDE.md#adding-new-features)

4. **Style with Tailwind:** Use Tailwind classes to make panels look better
   - 📚 [Tailwind CSS Documentation](https://tailwindcss.com/docs)

5. **Add real data:** Create a panel that displays actual data from an array
   - 📚 [Rendering Lists (React)](https://react.dev/learn/rendering-lists)

## Additional Learning Resources

### For Backend Engineers New to Frontend
- [React Foundations (Next.js)](https://nextjs.org/learn/react-foundations) - Great intro for backend devs
- [Modern JavaScript Tutorial](https://javascript.info/) - Comprehensive JavaScript guide
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Deep dive into TypeScript

### SQLRooms Specific
- [SQLRooms Full Documentation](https://sqlrooms.org/llms-full.txt) - Always reference this
- Our local [SQLRooms Basics Guide](./sqlrooms-basics.md) - Written for backend engineers
- Our local [CLAUDE.md](../CLAUDE.md) - Repository-specific architecture notes

### State Management Deep Dive
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Managing State (React)](https://react.dev/learn/managing-state)

### Build Tools
- [Vite Guide](https://vite.dev/guide/) - Understanding your build tool
- [Vite Features](https://vite.dev/guide/features.html) - HMR, TypeScript support, etc.

Remember: The error messages are your guide. Read them carefully, and they'll tell you exactly what to fix!
