# SQLRooms Styling & Customization Guide

## Overview

SQLRooms uses a modern, flexible styling system built on industry-standard tools. Understanding this architecture will help you customize the application to match your brand and preferences.

## Styling Architecture

### Core Technologies

**1. Shadcn/ui Design System**
- High-quality, accessible component library
- Built on Radix UI primitives
- Fully customizable through CSS variables
- Follows modern React patterns

**2. Tailwind CSS**
- Utility-first CSS framework
- Custom SQLRooms preset (`sqlroomsTailwindPreset()`)
- Intellisense support in VS Code
- Optimized for production builds

**3. CSS Variables (Custom Properties)**
- All theming through CSS variables
- HSL color format for easy manipulation
- Light and dark mode support
- Runtime theme switching

**4. Supporting Libraries**
- **Class Variance Authority (CVA)**: Component variants (button sizes, types)
- **clsx + tailwind-merge**: Intelligent class merging via `cn()` utility
- **Radix UI**: Accessible, unstyled component primitives
- **Lucide React**: Icon library

## The Theme System

### CSS Variables - The Foundation

All colors are defined as **HSL values** (Hue, Saturation, Lightness) in `src/index.css`.

**HSL Format:** `hue saturation% lightness%`
- **Hue**: 0-360° (color wheel position)
  - 0° = Red
  - 120° = Green
  - 240° = Blue
  - 280° = Purple
  - 30° = Orange
- **Saturation**: 0-100% (color intensity)
  - 0% = Grayscale
  - 100% = Fully saturated/vibrant
- **Lightness**: 0-100% (brightness)
  - 0% = Black
  - 50% = Pure color
  - 100% = White

**Example:**
```css
--primary: 221.2 83.2% 53.3%;
/* 221.2° = Blue hue
   83.2% = Highly saturated (vibrant)
   53.3% = Medium-bright */
```

### Available Color Tokens

These semantic tokens are available throughout the application:

| Token | Purpose | Where It's Used |
|-------|---------|-----------------|
| `background` | Main page background | Body, app container |
| `foreground` | Main text color | All text by default |
| `card` | Card/panel background | Card, Dialog, Sheet |
| `card-foreground` | Card text color | Text inside cards |
| `popover` | Floating element background | Dropdown, Tooltip, Popover |
| `popover-foreground` | Floating element text | Text in dropups |
| `primary` | **Your main brand color** | Primary buttons, links, active states |
| `primary-foreground` | Text on primary color | Button text, link text |
| `secondary` | Secondary actions | Secondary buttons, subtle highlights |
| `secondary-foreground` | Text on secondary color | Secondary button text |
| `muted` | Subdued backgrounds | Disabled states, placeholders, inactive |
| `muted-foreground` | Subdued text | Help text, labels, secondary info |
| `accent` | Highlighted elements | Hover states, selected items, highlights |
| `accent-foreground` | Text on accent color | Text on highlighted elements |
| `destructive` | Errors, warnings, danger | Delete buttons, error states, warnings |
| `destructive-foreground` | Text on destructive color | Error message text |
| `border` | All borders | Card borders, dividers, input borders |
| `input` | Form input borders | Text inputs, selects, textareas |
| `ring` | Focus indicators | Keyboard navigation, focus rings |

**Additional Variables:**
- `--radius`: Border radius (default: `0.5rem`)
- `--chart-1` through `--chart-5`: Data visualization colors

### Default Theme (Current Configuration)

**Light Mode:**
```css
:root {
  --background: 0 0% 100%;           /* Pure white */
  --foreground: 222.2 84% 4.9%;      /* Near-black */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;      /* Blue */
  --primary-foreground: 210 40% 98%; /* Near-white */
  --secondary: 210 40% 96.1%;        /* Light gray */
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;      /* Red */
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
}
```

**Dark Mode:**
```css
.dark {
  --background: 222.2 84% 4.9%;      /* Dark blue-gray */
  --foreground: 210 40% 98%;         /* Near-white */
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;      /* Brighter blue */
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;      /* Dark red */
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
```

## Tailwind Configuration

### Current Setup

**File: `tailwind.config.ts`**
```typescript
import {sqlroomsTailwindPreset} from '@sqlrooms/ui';
import type {Config} from 'tailwindcss';

const config = {
  presets: [sqlroomsTailwindPreset()],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@sqlrooms/**/dist/**/*.js',
  ],
} satisfies Config;

export default config;
```

**What the preset provides:**
- Integration with CSS variable color system
- Border radius utilities (`rounded-lg`, `rounded-md`, `rounded-sm`)
- Typography plugin (`@tailwindcss/typography`)
- Animation plugin (`tailwindcss-animate`)
- Dark mode support (class-based)

### Content Paths - CRITICAL

The content array **must include** both paths:
```typescript
content: [
  './src/**/*.{ts,tsx}',                          // Your components
  './node_modules/@sqlrooms/**/dist/**/*.js',     // SQLRooms components
]
```

**Why?** Tailwind uses these paths to:
1. Find class names used in your code
2. Scan SQLRooms components for their classes
3. Generate only the CSS you actually use

**Without the SQLRooms path**, components won't have proper styling!

## Theme Provider

### Setup (Already Configured)

**File: `src/App.tsx`**
```typescript
import { ThemeProvider, ThemeSwitch } from "@sqlrooms/ui";

<ThemeProvider defaultTheme="light" storageKey="ui-theme">
  <RoomShell roomStore={roomStore}>
    <RoomShell.Sidebar>
      <ThemeSwitch />  {/* Theme toggle button */}
    </RoomShell.Sidebar>
    {/* ... */}
  </RoomShell>
</ThemeProvider>
```

**ThemeProvider Props:**
- `defaultTheme`: `"light"` | `"dark"` | `"system"`
- `storageKey`: localStorage key for persistence

**What it does:**
1. Manages theme state
2. Adds/removes `dark` class on `<html>` element
3. Persists preference to localStorage
4. Provides `useTheme()` hook

### Using the Theme Hook

```typescript
import { useTheme } from '@sqlrooms/ui';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      Current theme: {theme}
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

## Customization Levels

### Level 1: Quick Color Changes (5 minutes)

**Goal:** Change your brand color while keeping everything else the same.

**File to edit:** `src/index.css`

**Example: Green theme**
```css
@layer base {
  :root {
    --primary: 142 76% 36%;          /* Forest green */
    --ring: 142 76% 36%;             /* Focus rings match primary */
  }

  .dark {
    --primary: 142 76% 45%;          /* Slightly lighter for dark mode */
    --ring: 142 76% 45%;
  }
}
```

**Popular brand colors:**
```css
/* Ocean Blue */
--primary: 190 95% 42%;

/* Royal Purple */
--primary: 262 83% 58%;

/* Sunset Orange */
--primary: 25 95% 53%;

/* Rose Pink */
--primary: 330 81% 60%;

/* Teal */
--primary: 172 66% 50%;

/* Emerald */
--primary: 160 84% 39%;
```

### Level 2: Comprehensive Theme (30 minutes)

**Goal:** Create a complete, cohesive theme with custom colors for all elements.

**Strategy:**
1. Choose your brand color (primary)
2. Select complementary colors for accent/secondary
3. Adjust backgrounds and borders
4. Ensure sufficient contrast for accessibility
5. Test in both light and dark modes

**Example: Warm Earth Tones Theme**

```css
@layer base {
  :root {
    /* Warm, creamy background */
    --background: 30 20% 98%;
    --foreground: 30 20% 10%;

    /* Terracotta brand color */
    --primary: 15 75% 50%;
    --primary-foreground: 0 0% 100%;

    /* Warm gray secondary */
    --secondary: 30 10% 92%;
    --secondary-foreground: 30 15% 20%;

    /* Subdued backgrounds */
    --muted: 30 12% 94%;
    --muted-foreground: 30 10% 40%;

    /* Golden accent */
    --accent: 45 85% 60%;
    --accent-foreground: 45 20% 15%;

    /* Warm borders */
    --border: 30 15% 88%;
    --input: 30 15% 88%;

    /* Slightly more rounded */
    --radius: 0.75rem;
  }

  .dark {
    --background: 30 15% 8%;
    --foreground: 30 10% 95%;
    --primary: 15 75% 58%;
    --primary-foreground: 0 0% 100%;
    --secondary: 30 15% 15%;
    --secondary-foreground: 30 10% 90%;
    --muted: 30 12% 12%;
    --muted-foreground: 30 8% 60%;
    --accent: 45 85% 65%;
    --accent-foreground: 45 20% 10%;
    --border: 30 15% 18%;
    --input: 30 15% 18%;
  }
}
```

### Level 3: Advanced Customization

**Goal:** Extend Tailwind with custom fonts, spacing, animations, and more.

**File to edit:** `tailwind.config.ts`

**Example: Full customization**

```typescript
import {sqlroomsTailwindPreset} from '@sqlrooms/ui';
import type {Config} from 'tailwindcss';

const config = {
  presets: [sqlroomsTailwindPreset()],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@sqlrooms/**/dist/**/*.js',
  ],
  theme: {
    extend: {
      // Custom fonts
      fontFamily: {
        sans: ['Inter Variable', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Playfair Display', 'serif'],
      },

      // Additional colors
      colors: {
        'brand': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
      },

      // Custom spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Custom animations
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-in',
      },

      // Custom shadows
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
      },
    },
  },
} satisfies Config;

export default config;
```

**Adding custom fonts:**

```css
/* src/index.css - Add at the top */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
```

## Component Styling Patterns

### Pattern 1: Using Theme Colors

Components reference CSS variables through Tailwind classes:

```typescript
import { Button, Card } from '@sqlrooms/ui';

function Example() {
  return (
    <Card className="bg-card text-card-foreground border-border">
      <Button className="bg-primary text-primary-foreground">
        Primary Action
      </Button>
      <Button className="bg-secondary text-secondary-foreground">
        Secondary Action
      </Button>
    </Card>
  );
}
```

**How it works:**
- `bg-primary` → `background-color: hsl(var(--primary))`
- `text-primary-foreground` → `color: hsl(var(--primary-foreground))`

### Pattern 2: Component Variants

Many components have predefined variants:

```typescript
// Button variants
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="secondary">Alt</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link Style</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>

// Combine them
<Button variant="outline" size="lg">Large Outline</Button>
```

### Pattern 3: The `cn()` Utility

All SQLRooms components use the `cn()` utility for intelligent class merging:

```typescript
import { cn } from '@sqlrooms/ui';

// In your component
function CustomCard({ className, children }) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg p-6 shadow',
        className  // User classes can override defaults
      )}
    >
      {children}
    </div>
  );
}

// Usage - className overrides work properly
<CustomCard className="bg-blue-500 p-4">
  {/* bg-blue-500 overrides bg-card, p-4 overrides p-6 */}
</CustomCard>
```

**Why use `cn()`?**
- Properly merges conflicting Tailwind classes
- Handles conditional classes elegantly
- Removes undefined/null values
- Based on `clsx` + `tailwind-merge`

### Pattern 4: Conditional Styling

```typescript
import { cn } from '@sqlrooms/ui';

function StatusBadge({ status }: { status: 'success' | 'error' | 'pending' }) {
  return (
    <div
      className={cn(
        'rounded-full px-3 py-1 text-sm font-medium',
        status === 'success' && 'bg-green-100 text-green-800',
        status === 'error' && 'bg-destructive text-destructive-foreground',
        status === 'pending' && 'bg-muted text-muted-foreground'
      )}
    >
      {status}
    </div>
  );
}
```

## Available UI Components

Your project has access to 50+ components from `@sqlrooms/ui`:

### Layout Components
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Separator`
- `ScrollArea`, `ScrollBar`
- `ResizableHandle`, `ResizablePanel`, `ResizablePanelGroup`
- `Sheet`, `SheetTrigger`, `SheetContent`
- `Dialog`, `DialogTrigger`, `DialogContent`
- `Drawer`, `DrawerTrigger`, `DrawerContent`

### Form Components
- `Button`
- `Input`, `Textarea`
- `Label`, `FormLabel`
- `Checkbox`, `RadioGroup`, `RadioGroupItem`
- `Switch`, `Slider`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Combobox`, `Command`
- `Calendar`, `DatePicker`

### Navigation Components
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`
- `MenuBar`, `Menu`, `MenuItem`
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`
- `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`

### Feedback Components
- `Alert`, `AlertDescription`, `AlertTitle`
- `Toast`, `Toaster`, `useToast`
- `Progress`
- `Spinner`, `SpinnerPane`
- `Skeleton`, `SkeletonPane`
- `ErrorBoundary`, `ErrorPane`

### Data Display
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Tree`, `TreeItem`
- `Pagination`, `PaginationContent`, `PaginationItem`

### Utility Components
- `Badge`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Tooltip`, `TooltipTrigger`, `TooltipContent`
- `Popover`, `PopoverTrigger`, `PopoverContent`
- `HoverCard`, `HoverCardTrigger`, `HoverCardContent`
- `Toggle`, `ToggleGroup`
- `ThemeSwitch` (dark/light mode toggle)
- `EditableText`
- `CopyButton`

All components follow the same theming system and accept `className` for customization!

## Practical Styling Examples

### Example 1: Customize Query Editor Panel

```typescript
import { QueryEditorPanel } from '@sqlrooms/sql-editor';

export const MainView = () => {
  return (
    <div className="h-full bg-gradient-to-br from-background to-muted">
      <QueryEditorPanel className="border-2 border-primary shadow-xl" />
    </div>
  );
};
```

### Example 2: Custom Styled Button

```typescript
import { Button } from '@sqlrooms/ui';

function GradientButton() {
  return (
    <Button
      className="bg-gradient-to-r from-primary to-accent text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
    >
      Custom Gradient Button
    </Button>
  );
}
```

### Example 3: Themed Card Layout

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@sqlrooms/ui';

function ThemedCard() {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-primary">Database Query</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Content */}
      </CardContent>
    </Card>
  );
}
```

### Example 4: Custom Theme Switcher

```typescript
import { useTheme } from '@sqlrooms/ui';
import { Button } from '@sqlrooms/ui';
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react';

function CustomThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2 p-2 bg-muted rounded-lg">
      <Button
        size="sm"
        variant={theme === 'light' ? 'default' : 'ghost'}
        onClick={() => setTheme('light')}
      >
        <SunIcon className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={theme === 'dark' ? 'default' : 'ghost'}
        onClick={() => setTheme('dark')}
      >
        <MoonIcon className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant={theme === 'system' ? 'default' : 'ghost'}
        onClick={() => setTheme('system')}
      >
        <MonitorIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### Example 5: Global Styling with @layer

Add global styles that respect the theme:

```css
/* src/index.css */
@layer base {
  /* Custom heading styles */
  h1 {
    @apply text-4xl font-bold text-foreground;
  }

  h2 {
    @apply text-3xl font-semibold text-foreground;
  }

  h3 {
    @apply text-2xl font-medium text-muted-foreground;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    @apply w-2 h-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-muted;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-muted-foreground/30 rounded hover:bg-muted-foreground/50;
  }

  /* Custom selection color */
  ::selection {
    @apply bg-primary/20 text-primary-foreground;
  }
}

@layer components {
  /* Custom utility classes */
  .glass-effect {
    @apply bg-background/80 backdrop-blur-md border border-border;
  }

  .panel-header {
    @apply bg-muted/50 px-4 py-2 border-b border-border;
  }
}
```

## Best Practices

### DO ✅

1. **Use semantic color tokens**
   ```typescript
   // Good
   <div className="bg-primary text-primary-foreground">

   // Bad
   <div className="bg-blue-500 text-white">
   ```

2. **Define both light and dark mode colors**
   ```css
   :root {
     --primary: 221.2 83.2% 53.3%;
   }

   .dark {
     --primary: 217.2 91.2% 59.8%;  /* Adjust for dark background */
   }
   ```

3. **Test in both themes**
   - Use the ThemeSwitch in the sidebar
   - Check contrast ratios (WCAG AA: 4.5:1 for text)
   - Verify all states (hover, focus, disabled)

4. **Use the `cn()` utility**
   ```typescript
   import { cn } from '@sqlrooms/ui';

   <div className={cn('base-classes', conditionalClass, className)} />
   ```

5. **Extend the preset, don't replace it**
   ```typescript
   // Good
   const config = {
     presets: [sqlroomsTailwindPreset()],
     theme: {
       extend: { /* additions */ }
     }
   }

   // Bad - loses all SQLRooms theming
   const config = {
     theme: { /* replaces everything */ }
   }
   ```

6. **Keep the content paths**
   ```typescript
   content: [
     './src/**/*.{ts,tsx}',
     './node_modules/@sqlrooms/**/dist/**/*.js',  // Essential!
   ]
   ```

### DON'T ❌

1. **Don't hardcode colors**
   ```typescript
   // Bad
   <div className="bg-[#0066cc]">
   <div style={{ color: '#ff0000' }}>
   ```

2. **Don't use !important** (rarely needed)
   ```css
   /* Bad */
   .my-class {
     color: red !important;
   }
   ```

3. **Don't skip dark mode**
   ```css
   /* Bad - only light mode */
   :root {
     --primary: 221.2 83.2% 53.3%;
   }

   /* Good - both modes */
   :root {
     --primary: 221.2 83.2% 53.3%;
   }
   .dark {
     --primary: 217.2 91.2% 59.8%;
   }
   ```

4. **Don't remove the preset**
   ```typescript
   // Bad - breaks everything
   const config = {
     content: ['./src/**/*.{ts,tsx}'],
     theme: { colors: {} }
   }
   ```

## Color Contrast & Accessibility

### WCAG Standards

- **AA (Minimum)**: 4.5:1 for normal text, 3:1 for large text
- **AAA (Enhanced)**: 7:1 for normal text, 4.5:1 for large text

### Testing Tools

- **Browser DevTools**: Chrome/Firefox have contrast checkers
- **Online Tools**:
  - https://contrast-ratio.com
  - https://webaim.org/resources/contrastchecker/

### Tips for Good Contrast

1. **Primary color on backgrounds**
   - Light mode: Dark primary (lightness 40-60%)
   - Dark mode: Bright primary (lightness 50-70%)

2. **Text on colored backgrounds**
   - Always define a foreground color for each background
   - Test with actual content

3. **Muted/subtle colors**
   - Should still meet 4.5:1 for text
   - Can be lower for decorative elements

## Responsive Design

SQLRooms components are responsive by default. Tailwind's breakpoint system:

```typescript
<div className="
  text-sm        // Mobile
  md:text-base   // Tablet (768px+)
  lg:text-lg     // Desktop (1024px+)
">
  Responsive text
</div>

// Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
```

## Monaco Editor Customization

The Monaco SQL editor can be styled through CSS:

```css
/* src/index.css */
@layer base {
  /* Editor background */
  .monaco-editor {
    @apply bg-card;
  }

  /* Line numbers */
  .monaco-editor .margin {
    @apply bg-muted;
  }

  /* Current line highlight */
  .monaco-editor .current-line {
    @apply bg-accent/10;
  }

  /* Selection color */
  .monaco-editor .selected-text {
    @apply bg-primary/20;
  }
}
```

Monaco also respects the theme system through the `monacoWorkerSetup.ts` configuration.

## File Reference

### Files You'll Modify for Styling

| File | Purpose | Frequency |
|------|---------|-----------|
| `src/index.css` | Theme colors, global styles, CSS layers | Often |
| `tailwind.config.ts` | Extended Tailwind config (fonts, spacing, plugins) | Occasionally |
| `src/App.tsx` | Theme provider settings | Rarely |
| Component files | Component-specific `className` overrides | As needed |

### Files You Shouldn't Modify

| File | Why |
|------|-----|
| `node_modules/@sqlrooms/*` | Package files, changes lost on install |
| `src/monacoWorkerSetup.ts` | Monaco configuration, not styling |

## Troubleshooting

### Colors not applying

**Problem**: Changed CSS variables but colors don't update

**Solutions**:
1. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
2. Check that variable names match exactly (with dashes)
3. Ensure values are in HSL format: `hue saturation% lightness%`
4. Verify you're editing `:root` for light mode, `.dark` for dark mode

### Tailwind classes not working

**Problem**: Classes like `bg-primary` not applying

**Solutions**:
1. Check `content` paths in `tailwind.config.ts`
2. Restart dev server after config changes
3. Ensure `@sqlrooms/ui` preset is included
4. Run `pnpm dev` to rebuild Tailwind

### Dark mode not switching

**Problem**: Theme toggle doesn't work

**Solutions**:
1. Check `ThemeProvider` wraps your app
2. Verify `storageKey` is set
3. Check browser localStorage (DevTools → Application → Local Storage)
4. Ensure `.dark` class is being added to `<html>` element

### Components look unstyled

**Problem**: SQLRooms components have no styling

**Solutions**:
1. Add `./node_modules/@sqlrooms/**/dist/**/*.js` to Tailwind content
2. Verify `sqlroomsTailwindPreset()` is in presets array
3. Import components from `@sqlrooms/ui`, not individual files
4. Restart dev server after configuration changes

## Additional Resources

- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/primitives
- **Shadcn/ui**: https://ui.shadcn.com (SQLRooms follows similar patterns)
- **HSL Color Picker**: https://hslpicker.com
- **Coolors Generator**: https://coolors.co (palette inspiration)
- **SQLRooms Documentation**: https://sqlrooms.org/llms-full.txt

## Conclusion

The SQLRooms styling system provides:
- **Flexibility**: Full control through CSS variables
- **Consistency**: Semantic tokens ensure cohesive design
- **Accessibility**: Built-in dark mode and contrast-aware defaults
- **Developer Experience**: Tailwind + TypeScript + IntelliSense

Start with Level 1 customization (change primary color) and gradually explore deeper customization as needed. The system is designed to work great with minimal configuration while supporting extensive customization when required.

Happy styling!
