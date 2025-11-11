# Keyboard Shortcuts in React and SQLRooms

## Overview

This document provides a comprehensive guide to implementing keyboard shortcuts in React applications, specifically for workspace switching (Cmd+1, Cmd+2, Cmd+3) in SQLRooms. It covers fundamental concepts, implementation patterns, best practices, and cross-platform considerations.

## Research Findings

### SQLRooms Framework: No Built-in Keyboard Shortcut System

**Important Discovery**: The SQLRooms framework does **not** include built-in keyboard shortcut utilities or hooks. This means:

- SQLRooms doesn't provide keyboard event handling utilities
- You must implement keyboard shortcuts yourself using React patterns
- The framework focuses on state management (Zustand), UI components, and layout systems
- Keyboard handling is left to the developer's implementation

### How SQL Editor Implements Cmd+Enter

The SQL Editor in SQLRooms uses **Monaco Editor**, which has its own internal keyboard shortcut system.

**Monaco's Approach**:
```typescript
editor.addAction({
  id: "executeQuery",
  label: "Execute Query",
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
  contextMenuGroupId: "2_execution",
  run: () => {
    // Execute the SQL query
  },
});
```

**Key Points**:
- Monaco uses `KeyMod.CtrlCmd` which automatically maps to Cmd on Mac and Ctrl on Windows/Linux
- External keyboard shortcut libraries (like react-hotkeys-hook) **don't work** when focus is inside Monaco
- Monaco captures keyboard events internally before they bubble to the document
- This is why the SQL Editor can use Cmd+Enter without conflicting with other shortcuts

---

## React Patterns for Keyboard Shortcuts

### Pattern 1: Manual Implementation with useEffect (Most Control)

This is the most fundamental approach - perfect for understanding how keyboard shortcuts work at a low level.

**Example Implementation**:

```typescript
import { useEffect } from 'react';
import { useRoomStore } from './store';

export const App = () => {
  const setCurrentWorkspace = useRoomStore((state) => state.setCurrentWorkspace);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed) return;

      // Handle workspace shortcuts
      switch (event.key) {
        case '1':
          event.preventDefault(); // Prevent browser default behavior
          setCurrentWorkspace('data');
          break;
        case '2':
          event.preventDefault();
          setCurrentWorkspace('query');
          break;
        case '3':
          event.preventDefault();
          setCurrentWorkspace('chart');
          break;
      }
    };

    // Add event listener when component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Clean up: Remove event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array - only runs once on mount

  return (
    // Your JSX here
  );
};
```

#### Key Concepts Explained

**1. Event Properties**:
- `event.metaKey`: True when Cmd (⌘) is pressed (Mac)
- `event.ctrlKey`: True when Ctrl is pressed (Windows/Linux)
- `event.key`: The actual key pressed ('1', '2', '3', etc.)
- `event.shiftKey`: True when Shift is pressed
- `event.altKey`: True when Alt/Option is pressed

**2. event.preventDefault()**:
- Stops the browser's default behavior
- Important because Cmd+1, Cmd+2, etc. usually switch browser tabs
- Without this, your shortcut won't work reliably
- Always call this before executing your custom behavior

**3. Cleanup Function**:
- The return value of useEffect is a cleanup function
- Removes the event listener when the component unmounts
- **Critical for preventing memory leaks**
- Without cleanup, multiple event listeners accumulate over time

**4. Empty Dependency Array**:
- `[]` means the effect runs once on mount, cleanup runs on unmount
- We use an empty array because we're accessing the store method directly
- The Zustand selector pattern ensures we always get the latest method
- If you need to depend on props/state, add them to the dependency array

**5. Event Listener Target**:
- `window.addEventListener()`: Global keyboard shortcuts (work anywhere)
- `document.addEventListener()`: Also global, slightly different use cases
- `element.addEventListener()`: Only when specific element has focus

---

### Pattern 2: Custom Hook (Reusable & Clean)

For a more sophisticated, reusable approach, create a custom hook that can be used throughout your application.

**File**: `src/hooks/useKeyboardShortcut.ts`

```typescript
import { useEffect, useRef, useLayoutEffect } from 'react';

type Handler = (event: KeyboardEvent) => void;

interface ShortcutOptions {
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
}

/**
 * Custom hook for keyboard shortcuts with proper cleanup
 * Uses the callback ref pattern to avoid stale closures
 *
 * @param keys - Single key or array of keys to listen for
 * @param callback - Function to call when shortcut is triggered
 * @param options - Modifier keys and behavior options
 */
export function useKeyboardShortcut(
  keys: string | string[],
  callback: Handler,
  options?: ShortcutOptions
) {
  const callbackRef = useRef<Handler>(callback);
  const keysArray = Array.isArray(keys) ? keys : [keys];

  // Update ref with latest callback without triggering effect
  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        ctrl = false,
        meta = false,
        shift = false,
        alt = false,
        preventDefault = true,
      } = options || {};

      // Check if the pressed key matches
      const keyMatch = keysArray.includes(event.key);
      if (!keyMatch) return;

      // Check modifiers
      const ctrlMatch = ctrl ? event.ctrlKey : true;
      const metaMatch = meta ? event.metaKey : true;
      const shiftMatch = shift ? event.shiftKey : true;
      const altMatch = alt ? event.altKey : true;

      // Execute callback if all conditions match
      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        callbackRef.current(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keysArray, options]);
}
```

#### Advanced Technique: Callback Ref Pattern

**Why use refs for callbacks?**

```typescript
// Without refs (problematic):
useEffect(() => {
  const handleKeyDown = () => {
    someFunction(); // This captures the value at mount time
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // Empty array means someFunction is "stale"
```

```typescript
// With refs (correct):
const callbackRef = useRef(callback);

useLayoutEffect(() => {
  callbackRef.current = callback; // Always up-to-date
}, [callback]);

useEffect(() => {
  const handleKeyDown = () => {
    callbackRef.current(); // Calls the latest version
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // Can stay empty, ref always current
```

**Benefits**:
- Prevents stale closures
- Avoids removing/re-adding event listeners unnecessarily
- Better performance when callbacks change frequently
- Always calls the latest version of the callback

#### Usage Example

```typescript
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { useRoomStore } from './store';

export const App = () => {
  const setCurrentWorkspace = useRoomStore((state) => state.setCurrentWorkspace);

  // Cross-platform: Works with both Cmd (Mac) and Ctrl (Windows/Linux)
  useKeyboardShortcut('1', () => setCurrentWorkspace('data'), {
    ctrl: true,
    meta: true
  });
  useKeyboardShortcut('2', () => setCurrentWorkspace('query'), {
    ctrl: true,
    meta: true
  });
  useKeyboardShortcut('3', () => setCurrentWorkspace('chart'), {
    ctrl: true,
    meta: true
  });

  // More complex shortcuts
  useKeyboardShortcut('s', handleSave, {
    ctrl: true,
    meta: true,
    preventDefault: true,
  });

  return (
    // Your JSX
  );
};
```

---

### Pattern 3: Using react-hotkeys-hook Library (Recommended for Production)

For production applications, using a battle-tested library is often the best choice.

#### Installation

```bash
pnpm add react-hotkeys-hook
```

#### Basic Usage

```typescript
import { useHotkeys } from 'react-hotkeys-hook';
import { useRoomStore } from './store';

export const App = () => {
  const setCurrentWorkspace = useRoomStore((state) => state.setCurrentWorkspace);

  // The library handles cross-platform differences automatically
  // 'mod' is a special key that means Cmd on Mac, Ctrl elsewhere
  useHotkeys('mod+1', () => setCurrentWorkspace('data'));
  useHotkeys('mod+2', () => setCurrentWorkspace('query'));
  useHotkeys('mod+3', () => setCurrentWorkspace('chart'));

  return (
    // Your JSX
  );
};
```

#### Why react-hotkeys-hook is Great

1. **Cross-platform**: `mod` automatically maps to the right modifier key
2. **Scopes**: Prevent shortcuts from colliding in different parts of the app
3. **Conditional activation**: Enable/disable based on state
4. **Flexible syntax**: Many ways to define shortcuts
5. **TypeScript support**: Full type safety
6. **Actively maintained**: Regular updates and bug fixes
7. **Well-tested**: Used by thousands of projects

#### Advanced Features

```typescript
import { useHotkeys } from 'react-hotkeys-hook';

// Multiple key combinations for the same action
useHotkeys(['mod+s', 'mod+enter'], handleSubmit);

// Scope-based shortcuts (prevent conflicts)
useHotkeys('s', handleSave, {
  scopes: ['editor'],
  enabled: currentScope === 'editor',
});

// Access keyboard event and handler info
useHotkeys('mod+k', (event, handler) => {
  console.log('Event:', event);
  console.log('Handler info:', handler);
  openCommandPalette();
});

// Control when shortcuts are active
useHotkeys('/', openSearch, {
  enableOnFormTags: false, // Don't trigger when typing in inputs
  enabled: !isModalOpen,    // Disable when modal is open
});

// Sequence-based shortcuts (like Vim)
useHotkeys('g g', scrollToTop, {
  splitKey: ' ', // Space separates keys in sequence
});

// Prevent default only when needed
useHotkeys('escape', closeModal, {
  preventDefault: false, // Allow browser's default escape behavior
});
```

---

## Best Practices for Keyboard Shortcuts

### 1. Platform Differences (Mac vs Windows/Linux)

**The Problem**:
- Mac uses Cmd (⌘) for most shortcuts
- Windows/Linux use Ctrl for the same shortcuts
- You need to support both for a good user experience

**Solutions**:

#### Option A: Manual Platform Detection
```typescript
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

const handleKeyDown = (event: KeyboardEvent) => {
  const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
  // ...
};
```

**Pros**: Full control over behavior
**Cons**: Verbose, easy to forget

#### Option B: Check Both Modifiers (Recommended)
```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  // Accept either modifier - works on all platforms
  const modifierPressed = event.metaKey || event.ctrlKey;

  if (modifierPressed && event.key === 's') {
    event.preventDefault();
    handleSave();
  }
};
```

**Pros**: Simple, works everywhere
**Cons**: User could press wrong modifier (minor issue)

#### Option C: Use a Library (Best)
```typescript
// react-hotkeys-hook handles this automatically
useHotkeys('mod+k', callback); // Works on all platforms
```

**Pros**: Automatic, consistent, well-tested
**Cons**: Dependency on external library

---

### 2. Accessibility Considerations

#### Don't Override Standard Browser Shortcuts

**Avoid overriding**:
- `Cmd+T` / `Ctrl+T`: New tab
- `Cmd+W` / `Ctrl+W`: Close tab
- `Cmd+R` / `Ctrl+R`: Refresh page
- `Cmd+N` / `Ctrl+N`: New window
- `Cmd+Q`: Quit application (Mac)
- `F5`: Refresh (Windows/Linux)
- `Backspace`: Go back (in some browsers)

**OK to override** (commonly done by web apps):
- `Cmd+K` / `Ctrl+K`: Command palette/search
- `Cmd+B` / `Ctrl+B`: Bold text (in editors)
- `Cmd+I` / `Ctrl+I`: Italic text
- `Cmd+S` / `Ctrl+S`: Save
- `Cmd+P` / `Ctrl+P`: Print (if you provide alternative)

#### Provide Visual Indicators

Show users what shortcuts are available:

```tsx
<Button>
  Save
  <kbd className="ml-2 text-xs opacity-70">⌘S</kbd>
</Button>
```

With Tailwind styling:
```tsx
<kbd className="
  ml-2 px-1.5 py-0.5
  text-xs font-mono
  bg-muted rounded
  border border-border
">
  ⌘S
</kbd>
```

#### Tooltip with Shortcut
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@sqlrooms/ui';

<Tooltip>
  <TooltipTrigger>
    <Button onClick={handleSave}>Save</Button>
  </TooltipTrigger>
  <TooltipContent>
    Save (⌘S)
  </TooltipContent>
</Tooltip>
```

#### Create a Keyboard Shortcuts Help Modal

```tsx
const ShortcutsHelp = () => (
  <div className="grid gap-4">
    <div className="flex justify-between">
      <span>Switch to Data workspace</span>
      <kbd>⌘1</kbd>
    </div>
    <div className="flex justify-between">
      <span>Switch to Query workspace</span>
      <kbd>⌘2</kbd>
    </div>
    <div className="flex justify-between">
      <span>Switch to Charts workspace</span>
      <kbd>⌘3</kbd>
    </div>
    <div className="flex justify-between">
      <span>Toggle SQL Editor</span>
      <kbd>⌘E</kbd>
    </div>
  </div>
);
```

---

### 3. Don't Trigger on Form Inputs

You usually don't want shortcuts to fire when users are typing in text fields.

#### Manual Implementation

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  // Ignore if user is typing in an input
  const target = event.target as HTMLElement;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return;
  }

  // Your shortcut logic here
};
```

#### With react-hotkeys-hook

```typescript
useHotkeys('/', openSearch, {
  enableOnFormTags: false, // Built-in solution
});

// Or more granular control:
useHotkeys('/', openSearch, {
  enableOnFormTags: ['INPUT'], // Only disable on INPUT tags
});
```

---

### 4. Prevent Browser Defaults

Always call `preventDefault()` to stop the browser from executing its default behavior:

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === '1') {
    event.preventDefault(); // Stop browser from switching tabs
    setCurrentWorkspace('data');
  }
};
```

**What happens without preventDefault()**:
- Cmd+1 switches to first browser tab AND triggers your shortcut
- Cmd+S shows browser's save dialog AND saves your form
- Creates confusing user experience
- Can cause unexpected browser behavior

---

### 5. Clean Up Event Listeners

**Always remove event listeners** when components unmount to prevent memory leaks:

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Your shortcut logic
  };

  window.addEventListener('keydown', handleKeyDown);

  // This cleanup is CRITICAL
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, []);
```

#### What Happens Without Cleanup?

```typescript
// BAD: No cleanup
useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  // Missing cleanup!
}, []);
```

**Problems**:
1. **Multiple event listeners accumulate**: Each render adds a new listener
2. **Callbacks from unmounted components still run**: Can cause errors
3. **Memory leaks**: Listeners prevent garbage collection
4. **Unpredictable behavior**: Multiple handlers fire for the same event
5. **Performance degradation**: More and more listeners over time

#### Proper Cleanup Pattern

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    console.log('Shortcut triggered');
  };

  // Add listener
  window.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    // Remove the SAME function reference
    window.removeEventListener('keydown', handleKeyDown);
  };
}, []); // Dependencies array
```

**Key Point**: The cleanup function runs when:
- Component unmounts
- Dependencies change (before re-running effect)

---

## Recommended Implementation for Your SQLRooms Project

For implementing workspace switching shortcuts (Cmd+1, Cmd+2, Cmd+3), choose one of these approaches:

### Option 1: Simple Manual Implementation (Good for Learning)

Add this to `src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { RoomShell } from "@sqlrooms/room-shell";
import { SqlEditorModal } from "@sqlrooms/sql-editor";
import { ThemeProvider, ThemeSwitch, useDisclosure } from "@sqlrooms/ui";
import { CodeIcon } from "lucide-react";
import { roomStore, useRoomStore } from "./store";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export const App = () => {
  const sqlEditorDisclosure = useDisclosure();
  const setCurrentWorkspace = useRoomStore((state) => state.setCurrentWorkspace);

  // Keyboard shortcuts for workspace switching
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      if (!event.metaKey && !event.ctrlKey) return;

      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          setCurrentWorkspace('data');
          break;
        case '2':
          event.preventDefault();
          setCurrentWorkspace('query');
          break;
        case '3':
          event.preventDefault();
          setCurrentWorkspace('chart');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentWorkspace]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <RoomShell className="h-screen" roomStore={roomStore}>
        <RoomShell.Sidebar className="w-48">
          {/* ... sidebar content ... */}
        </RoomShell.Sidebar>
        <RoomShell.LayoutComposer />
        <RoomShell.LoadingProgress />
        <SqlEditorModal
          isOpen={sqlEditorDisclosure.isOpen}
          onClose={sqlEditorDisclosure.onClose}
        />
      </RoomShell>
    </ThemeProvider>
  );
};
```

**Pros**:
- No dependencies
- Easy to understand
- Full control
- Good for learning

**Cons**:
- More verbose
- Manual platform handling
- Need to handle edge cases yourself

---

### Option 2: Using react-hotkeys-hook (Recommended for Production)

#### Step 1: Install the library

```bash
pnpm add react-hotkeys-hook
```

#### Step 2: Update `src/App.tsx`

```typescript
import { useHotkeys } from 'react-hotkeys-hook';
import { RoomShell } from "@sqlrooms/room-shell";
import { SqlEditorModal } from "@sqlrooms/sql-editor";
import { ThemeProvider, ThemeSwitch, useDisclosure } from "@sqlrooms/ui";
import { CodeIcon } from "lucide-react";
import { roomStore, useRoomStore } from "./store";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export const App = () => {
  const sqlEditorDisclosure = useDisclosure();
  const setCurrentWorkspace = useRoomStore((state) => state.setCurrentWorkspace);

  // Workspace shortcuts - 'mod' works on all platforms
  useHotkeys('mod+1', () => setCurrentWorkspace('data'), {
    preventDefault: true,
    enableOnFormTags: false,
  });
  useHotkeys('mod+2', () => setCurrentWorkspace('query'), {
    preventDefault: true,
    enableOnFormTags: false,
  });
  useHotkeys('mod+3', () => setCurrentWorkspace('chart'), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  // Bonus: SQL Editor shortcut
  useHotkeys('mod+e', () => sqlEditorDisclosure.onToggle(), {
    preventDefault: true,
    enableOnFormTags: false,
  });

  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <RoomShell className="h-screen" roomStore={roomStore}>
        <RoomShell.Sidebar className="w-48">
          {/* ... sidebar content ... */}
        </RoomShell.Sidebar>
        <RoomShell.LayoutComposer />
        <RoomShell.LoadingProgress />
        <SqlEditorModal
          isOpen={sqlEditorDisclosure.isOpen}
          onClose={sqlEditorDisclosure.onClose}
        />
      </RoomShell>
    </ThemeProvider>
  );
};
```

**Pros**:
- Clean, concise syntax
- Automatic cross-platform handling
- Well-tested and maintained
- Built-in form input handling
- TypeScript support
- Production-ready

**Cons**:
- External dependency (~15KB)
- Need to learn library API

---

## Testing Your Keyboard Shortcuts

### Manual Testing Checklist

- [ ] Test on Mac (Cmd+1, Cmd+2, Cmd+3)
- [ ] Test on Windows (Ctrl+1, Ctrl+2, Ctrl+3)
- [ ] Test on Linux (Ctrl+1, Ctrl+2, Ctrl+3)
- [ ] Verify preventDefault() stops browser tab switching
- [ ] Test that shortcuts don't fire when typing in inputs
- [ ] Test that shortcuts don't fire when focus is in Monaco Editor
- [ ] Verify cleanup by rapidly mounting/unmounting component
- [ ] Check browser console for errors
- [ ] Test with screen reader (accessibility)

### Debugging Tips

#### Console Logging

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    console.log({
      key: event.key,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      target: event.target,
    });

    // Your shortcut logic
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### Check for Event Listener Leaks

```typescript
// In browser console:
getEventListeners(window) // Chrome DevTools only
```

#### Verify Cleanup

```typescript
useEffect(() => {
  console.log('Keyboard listener added');

  const handleKeyDown = (event: KeyboardEvent) => {
    // ...
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    console.log('Keyboard listener removed');
    window.removeEventListener('keydown', handleKeyDown);
  };
}, []);
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Stale Closures

**Problem**:
```typescript
const [count, setCount] = useState(0);

useEffect(() => {
  const handleKeyDown = () => {
    console.log(count); // Always logs 0!
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []); // Empty array captures initial count
```

**Solution**: Use refs or add to dependency array
```typescript
const countRef = useRef(count);
countRef.current = count;

useEffect(() => {
  const handleKeyDown = () => {
    console.log(countRef.current); // Always current!
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

### Pitfall 2: Forgotten preventDefault()

**Problem**:
```typescript
if (event.key === '1') {
  setCurrentWorkspace('data'); // Browser also switches tab!
}
```

**Solution**:
```typescript
if (event.key === '1') {
  event.preventDefault(); // Add this!
  setCurrentWorkspace('data');
}
```

---

### Pitfall 3: Missing Cleanup

**Problem**:
```typescript
useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  // No cleanup!
});
```

**Solution**:
```typescript
useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
});
```

---

### Pitfall 4: Shortcuts Fire in Inputs

**Problem**:
```typescript
// User types "1" in search box, workspace switches!
if (event.key === '1') {
  setCurrentWorkspace('data');
}
```

**Solution**:
```typescript
const target = event.target as HTMLElement;
if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
  return; // Ignore
}
```

---

## Summary

### Key Takeaways

1. **SQLRooms has no built-in keyboard shortcut system** - implement it yourself using React patterns

2. **Three main approaches**:
   - Manual with useEffect (most control, best for learning)
   - Custom hook (reusable, moderate complexity)
   - react-hotkeys-hook library (best for production)

3. **Cross-platform support**:
   - Manual: `event.metaKey || event.ctrlKey`
   - Library: `mod` key automatically handles platform differences
   - Always test on multiple operating systems

4. **Essential practices**:
   - Always clean up event listeners
   - Call preventDefault() to stop browser defaults
   - Don't trigger shortcuts when typing in inputs
   - Provide visual indicators of available shortcuts

5. **Monaco Editor is special**:
   - Has its own internal keyboard system
   - Uses `editor.addAction()` for shortcuts
   - External shortcuts don't work when Monaco has focus

### Recommended Approach

For your SQLRooms project with workspace switching:

**Start with**: Manual useEffect implementation (for learning)
**Move to**: react-hotkeys-hook (for production robustness)

Both approaches are valid and can coexist in the same application.

---

## Additional Resources

### Libraries
- **react-hotkeys-hook**: https://react-hotkeys-hook.vercel.app/
  - Most popular React keyboard shortcuts library
  - Excellent documentation and examples
  - Active maintenance

- **react-hotkeys**: https://github.com/greena13/react-hotkeys
  - Alternative, more complex library
  - Component-based approach

### Documentation
- **MDN KeyboardEvent**: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
  - Complete reference for keyboard event properties
  - Browser compatibility information

- **Web Accessibility Guidelines**: https://www.w3.org/WAI/ARIA/apg/patterns/keyboard-interface/
  - WCAG guidelines for keyboard navigation
  - Accessibility best practices

### Tools
- **Key Code Info**: https://www.toptal.com/developers/keycode
  - Interactive tool to see key codes and event properties
  - Test keyboard events in real-time

- **Can I Use**: https://caniuse.com/?search=keyboardevent
  - Browser compatibility for keyboard APIs

---

## Next Steps

Now that you understand keyboard shortcuts in React:

1. Choose your implementation approach (manual or library)
2. Implement workspace switching shortcuts (Cmd+1, Cmd+2, Cmd+3)
3. Test on multiple platforms
4. Add visual indicators (kbd elements in sidebar)
5. Consider adding a keyboard shortcuts help modal
6. Document shortcuts for your users

Remember: Start simple, test thoroughly, and iterate based on user feedback!
