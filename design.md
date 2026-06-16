# Pinote v1.1 — Design Specification

> **Status**: Draft v1.0 — Source of truth for all v1.1 UI work  
> **Last updated**: 2026-06-16  
> **Scope**: UX redesign + comment management modal + navigation system

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Global UI Architecture](#2-global-ui-architecture)
3. [Floating Button Design](#3-floating-button-design)
4. [Comment Creation UX](#4-comment-creation-ux)
5. [Comment Pin Design](#5-comment-pin-design)
6. [Comment Management Modal](#6-comment-management-modal)
7. [Comment List Features](#7-comment-list-features)
8. [Navigation Behavior](#8-navigation-behavior)
9. [Modal Open/Close UX](#9-modal-openclose-ux)
10. [Future Scalability](#10-future-scalability)
11. [State Diagram](#11-state-diagram)
12. [User Journeys](#12-user-journeys)
13. [Component Inventory](#13-component-inventory)
14. [Risks & Recommendations](#14-risks--recommendations)

---

## 1. Design Principles

### 1.1 Visual Philosophy

Pinote is a **guest on every page it inhabits**. Its UI must never compete with the host application. The guiding principle is:

> **Purposeful restraint**: every pixel of Pinote UI is deliberate. Nothing is decorative unless it also communicates meaning.

Inspiration sources and how each principle maps to Pinote:

| Source | Principle borrowed | How Pinote applies it |
|---|---|---|
| **Linear** | Information density without clutter | Compact rows in the comment list; status badges not inline status text |
| **Notion** | Calm, focused editing canvas | Bare textarea with no button chrome; keyboard-first interactions |
| **Vercel** | Confidence through minimal chrome | No icons until hover; no labels until needed |
| **Figma comments** | In-canvas, contextual placement | Pins anchored to real elements, not page coordinates |

### 1.2 Color Palette

Pinote uses a **single brand accent** (blue), **two semantic states** (open = orange, resolved = slate), and a **neutral surface system**. No other hue families are introduced in v1.1.

```
-- Surfaces --
--pn-surface-0:   #ffffff                  /* popover/modal backgrounds */
--pn-surface-1:   rgba(255,255,255,0.96)   /* floating panel glass */
--pn-surface-2:   #f8fafc                  /* list row hover backgrounds */
--pn-surface-3:   #f1f5f9                  /* modal sidebar background */

-- Border --
--pn-border-subtle:  rgba(203,213,225,0.7)
--pn-border-strong:  #cbd5e1

-- Brand accent (interactive blue) --
--pn-blue-50:   #eff6ff
--pn-blue-500:  #2563eb
--pn-blue-600:  #1d4ed8   /* hover state */
--pn-blue-700:  #1e40af   /* active/pressed state */

-- Open comment (orange) --
--pn-open-500:  #f97316
--pn-open-600:  #ea6c0a   /* hover */

-- Resolved comment (slate) --
--pn-resolved-400: #94a3b8
--pn-resolved-500: #64748b

-- Text --
--pn-text-primary:   #0f172a
--pn-text-secondary: #475467
--pn-text-muted:     #94a3b8

-- Danger --
--pn-danger-500: #dc2626
--pn-danger-600: #b91c1c
```

**Dark mode**: v1.1 does not implement dark mode. The glass surface naturally blends on most pages. Dark mode tokens are reserved for v1.2.

### 1.3 Spacing System

Pinote uses a **4px base grid**. All spacing values are multiples of 4.

```
--pn-space-1:  4px
--pn-space-2:  8px
--pn-space-3:  12px
--pn-space-4:  16px
--pn-space-5:  20px
--pn-space-6:  24px
--pn-space-8:  32px
--pn-space-10: 40px
--pn-space-12: 48px
```

Compact components (pins, badges, inline buttons) use 4-8px spacing. Modal regions use 16-24px spacing.

### 1.4 Typography Hierarchy

Pinote injects no external fonts. It uses the host page's system-ui stack:

```
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Role | Size | Weight | Color | Usage |
|---|---|---|---|---|
| `label-xs` | 10px | 700 | `--pn-text-muted` | Badge counts, status chips |
| `label-sm` | 11px | 600 | `--pn-text-secondary` | Section headers (all-caps + letter-spacing 0.06em) |
| `body-sm` | 13px | 400 | `--pn-text-primary` | Comment text, list items |
| `body-md` | 14px | 400 | `--pn-text-primary` | Textarea input |
| `meta` | 12px | 400 | `--pn-text-muted` | Timestamps, path labels |
| `title-sm` | 13px | 700 | `--pn-text-primary` | Modal section titles |
| `title-md` | 15px | 800 | `--pn-text-primary` | Modal heading |

### 1.5 Border Radius

```
--pn-radius-sm:   6px    /* inline buttons, textarea */
--pn-radius-md:   10px   /* popovers, panels */
--pn-radius-lg:   14px   /* floating button, modal */
--pn-radius-xl:   20px   /* modal container */
--pn-radius-full: 9999px /* circular pins, count badges */
```

### 1.6 Shadow System

Shadows use a layered ambient + directional approach:

```
--pn-shadow-sm:  0 2px 8px rgba(15,23,42,0.10)
--pn-shadow-md:  0 8px 24px rgba(15,23,42,0.14)
--pn-shadow-lg:  0 16px 38px rgba(15,23,42,0.20)
--pn-shadow-xl:  0 24px 56px rgba(15,23,42,0.28)

/* Pin-specific glow shadows */
--pn-shadow-pin-open:     0 4px 16px rgba(249,115,22,0.38)
--pn-shadow-pin-resolved: 0 4px 12px rgba(100,116,139,0.28)
--pn-shadow-pin-active:   0 6px 24px rgba(37,99,235,0.42)
```

### 1.7 Interaction Patterns

**Principle**: Actions should feel immediate. Pinote must not feel "injected" — it must feel native.

- **Click targets**: minimum 36x36px on desktop, 44x44px on mobile
- **Hover feedback**: color shift + subtle `translateY(-1px)` on buttons (no `scale`)
- **Focus rings**: 3px solid ring at 35% opacity of brand color, `outline-offset: 3px`
- **Active/pressed**: `translateY(0)` + slightly darker background
- **Disabled**: `opacity: 0.45`, `cursor: not-allowed`, no hover feedback
- **Destructive actions**: shown only after engagement (delete is inside detail view, not in list)

### 1.8 Animation Guidelines

All motion is **functional, not decorative**. Every animation communicates a state change.

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Popover open | `opacity 0->1` + `translateY(4px)->0` | 140ms | `ease-out` |
| Popover close | `opacity 1->0` | 100ms | `ease-in` |
| Modal open | `opacity 0->1` + `scale(0.97)->1` | 180ms | `ease-out` |
| Modal close | `opacity 1->0` + `scale(1)->0.97` | 140ms | `ease-in` |
| Pin appear | `scale(0)->1` | 160ms | `cubic-bezier(0.34,1.56,0.64,1)` (spring) |
| Pin pulse (highlight) | `box-shadow` pulse x2 | 600ms | `ease-in-out` |
| Button hover | `translateY(0)->(-1px)` | 120ms | `ease-out` |
| List row hover | `background` change | 80ms | `linear` |
| Highlight overlay | `opacity 0->1` | 80ms | `linear` |

**Reduced motion**: When `prefers-reduced-motion: reduce`, all `transform` animations are disabled. Opacity fades remain but are shortened to 60ms.

### 1.9 Accessibility Considerations

Pinote is embedded in arbitrary customer pages — it must not degrade the host page's accessibility.

- All interactive Pinote elements have `aria-label` or visible text labels
- Focus is **trapped** inside modals while open (focus trap loop)
- Closing a modal returns focus to the trigger element that opened it
- Pins are `<button>` elements with descriptive `aria-label` (e.g., "Comment 3, open, /dashboard")
- Color is never the **sole** means of conveying status — open pins have a numbered label; resolved pins show a checkmark icon
- All keyboard interactions are documented in Section 4 and Section 9
- `role="dialog"` and `aria-modal="true"` on the comment management modal
- `aria-live="polite"` region for import/export status messages
- Pinote containers carry `data-pinote-ui="true"` and `data-rcl-ignore="true"` — host-page screen readers skip them if configured

---

## 2. Global UI Architecture

### 2.1 UI Regions Overview

Pinote v1.1 has exactly **five visual regions**. They are always rendered inside a single `div.pinote-container` appended to `document.body` at `z-index: 2147483647` (max).

```
+---------------------------------------------------------------+
|  HOST PAGE                                                    |
|                                                               |
|       [Comment Pin 1]    [Comment Pin 2]                      |
|                                                               |
|                 +-----------------------+                     |
|                 |  Comment Popover      |  (anchored to pin)  |
|                 +-----------------------+                     |
|                                                               |
|  +------------------------------------------------------------+|
|  |  Comment Management Modal (full viewport overlay)         ||
|  +------------------------------------------------------------+|
|                                                               |
|                                                    +------+   |
|                                                    |  P   |   | <- Floating button
|                                                    +------+   |
|                                                    +------+   |
|                                                    |  =   |   | <- Modal toggle button
|                                                    +------+   |
+---------------------------------------------------------------+
```

### 2.2 Region Inventory

| Region | Element | Visibility | Z-index layer |
|---|---|---|---|
| **FloatingButton** | `button.pn-float-btn` | Always | MAX |
| **ModalToggleButton** | `button.pn-modal-btn` | Always | MAX |
| **CommentPins** | `button.pn-pin` (x N) | Comment mode enabled only | MAX - 1 |
| **CommentPopover** | `section.pn-popover` | One at a time (draft or active) | MAX |
| **HoverOverlay** | `div.pn-hover-overlay` | Comment mode + hovering | MAX - 2 |
| **CommentModal** | `dialog.pn-modal` | Explicit toggle | MAX |

### 2.3 Hierarchy and Interaction Rules

1. **FloatingButton** is always rendered, regardless of mode
2. **ModalToggleButton** is always rendered alongside FloatingButton (same control cluster)
3. **CommentPins** are rendered only when `isCommentModeEnabled === true`
4. Only **one** CommentPopover can exist at a time (draft XOR active comment)
5. **CommentModal** can be open independently of comment mode — a user may browse comments without enabling annotation mode
6. When a modal is open, `pointer-events: none` does **not** apply to the host page — the modal is a floating overlay, not a full-screen block (except for the backdrop scrim)
7. Pinote UI elements carry `data-pinote-ui="true"` — click/hover events on them never propagate to the engine's annotation listener

### 2.4 Control Cluster Layout

The FloatingButton and ModalToggleButton are grouped into a **vertical stack** in one corner of the viewport. Default position: `bottom-right`.

```
         +--------------+
         |  P   [dot:3] |  <- FloatingButton (44px x 44px)
         +--------------+
         +--------------+
         |      =       |  <- ModalToggleButton (36px x 36px)
         +--------------+
```

The control cluster uses `position: fixed` with configurable edge padding (default 16px from edge).

---

## 3. Floating Button Design

### 3.1 Purpose

The FloatingButton is the **entry point** for the entire Pinote experience. It is always visible and communicates:

1. That Pinote is installed
2. The current annotation mode (enabled/disabled)
3. Total count of **unresolved** comments across all pages

### 3.2 Visual States

#### Disabled state (default)

```
Background: rgba(255,255,255,0.96)
Border:     1px solid rgba(148,163,184,0.28)
Shadow:     --pn-shadow-lg
Color:      #0f172a
Backdrop:   blur(10px)
```

#### Enabled state

```
Background: #2563eb (brand blue)
Border:     none
Shadow:     0 16px 38px rgba(37,99,235,0.35)
Color:      #ffffff
Badge:      Orange pill, top-right corner
```

### 3.3 Count Badge

- Renders only when unresolved comment count > 0
- Shows **project-wide unresolved** count (not current page only)
- Badge: 20px x 20px min, `border-radius: 9999px`, `background: #f97316`, white text
- Max display: `99+` for counts above 99
- Badge position: top-right corner, offset (-6px, -6px) outside button boundary
- Badge has `2px solid white` outline to separate it from the button edge

### 3.4 Hover State

Both enabled and disabled states show `translateY(-1px)` + slightly increased shadow on hover.

- Disabled hover: background lightens to `rgba(255,255,255,1)`
- Enabled hover: background darkens to `#1d4ed8`

### 3.5 Behavior When Disabled

Only the control cluster is visible (FloatingButton + ModalToggleButton). All comment pins are hidden. The host page is fully interactive.

### 3.6 Behavior When Enabled

- FloatingButton shows blue enabled state
- Comment pins for the current page become visible
- Hovering page elements shows the highlight overlay with element label
- Clicking a page element opens the comment creation popover
- All Pinote UI elements become interactive

### 3.7 Toggle Behavior

- Single click on FloatingButton toggles mode on/off
- When disabling: any open popover or draft is discarded immediately
- `aria-pressed` attribute reflects current state
- `aria-label` updates: "Enable Pinote comments" <-> "Disable Pinote comments"

---

## 4. Comment Creation UX

### 4.1 Overview

The comment creation flow is redesigned to be **frictionless and keyboard-native**. The previous Submit/Cancel buttons are removed. The interaction is entirely driven by keyboard shortcuts and click-outside dismissal.

### 4.2 Interaction Flow

```
User enables comment mode
         |
         v
User hovers over page element
         |
         v
Highlight overlay appears (blue border + element label tooltip)
         |
         v
User clicks the element
         |
         v
Comment creation popover opens
  - textarea is auto-focused (no delay)
  - placeholder: "Leave a comment... (Enter to submit)"
  - cursor placed at end of any pre-existing draft text
         |
    +----+----+
    |         |
  Enter    Shift+Enter
    |         |
  Submit   Newline added
    |         to draft
    v
Comment saved
  - New LocalComment created
  - Pin appears on element (spring animation)
  - Popover transitions to "comment view" (shows text + actions)
  - Comment mode remains enabled
```

### 4.3 Keyboard Shortcuts

| Key | Action |
|---|---|
| `Enter` | Submit comment (if textarea has non-empty content) |
| `Shift+Enter` | Insert newline in textarea |
| `Escape` | Cancel: clear draft, close popover |

**Note**: `Enter` to submit only applies to the creation popover textarea. It does not affect existing comment view popovers (which have no text input).

### 4.4 Cancel Behavior

A comment creation is cancelled when:
- User presses `Escape`
- User clicks anywhere outside the popover

On cancel:
1. The draft is **discarded completely** (no partial-save, no browser storage)
2. The popover closes with a fade-out animation (100ms)
3. The hover highlight returns (user is still in comment mode)
4. The `pendingCommentDraft` in state is set to `null`

### 4.5 Submit Behavior

On submit (Enter key, textarea is non-empty after trimming):
1. Text is normalized (collapse whitespace, trim)
2. `LocalComment` is created with `status: "open"`
3. The popover **transitions** from creation mode to comment view mode (same popover, new content — no close/reopen flash)
4. The comment pin animates in with a spring scale
5. `activeCommentId` is set to the new comment's ID

### 4.6 Empty Submit Guard

If user presses `Enter` with only whitespace in the textarea:
- Nothing happens
- Textarea border briefly flashes red (`--pn-danger-500`) for 400ms (pulse animation)
- Focus remains in textarea

### 4.7 Popover Positioning

The popover is positioned relative to the **comment pin location**, not the element bounds:

1. Preferred position: 16px to the right of the pin, vertically centered on it
2. If right edge would overflow viewport: flip to left of pin
3. If bottom edge would overflow: flip upward
4. Minimum 8px margin from all viewport edges

Popover size: 300px wide, height determined by content (min 140px, max 320px).

### 4.8 Edge Cases

| Scenario | Behavior |
|---|---|
| User clicks element while another draft is open | Old draft is discarded, new draft opens |
| User navigates away during draft | Draft is discarded (no cross-page persistence) |
| User scrolls page while popover is open | Popover follows the pin position (re-render on scroll) |
| Popover textarea loses focus to another Pinote element | Popover stays open |
| Element is removed from DOM while popover is open | Popover closes, draft discarded |

---

## 5. Comment Pin Design

### 5.1 Pin Anatomy

Each pin is a circular `<button>` element, `28px x 28px`, positioned at the comment's recorded location relative to its target element. The pin contains a **sequential number** (1-based, ordered by creation date) and a status indicator.

### 5.2 Visual States

#### Open (unresolved) pin

```
Background: #f97316 (orange)
Border:     2px solid #ffffff
Shadow:     --pn-shadow-pin-open
Text:       #ffffff, 700, 12px
Size:       28px x 28px
```

#### Resolved pin

```
Background: #94a3b8 (slate-400)
Border:     2px solid #ffffff
Shadow:     --pn-shadow-pin-resolved
Text:       #ffffff (shows checkmark Unicode: v)
Opacity:    0.75 (slightly faded to recede)
```

The resolved pin shows a checkmark instead of a number to reinforce "done" status.

### 5.3 Hover State

On hover (1.15x scale transform, 120ms spring):

- Open pin hover: `border-color: #f97316`, `box-shadow: --pn-shadow-pin-active`
- Resolved pin hover: `opacity: 1` (fully visible), slight scale up

A tooltip appears above the pin (after 400ms hover delay):
```
"Comment 3 · /dashboard · Open"
```
Tooltip: `background: #0f172a`, `color: #ffffff`, `border-radius: 6px`, `font: 12px/1`.

### 5.4 Active State (popover open)

When a pin's comment popover is open:
- Pin pulses once with `--pn-shadow-pin-active` (blue glow)
- Pin border changes to `#2563eb` (brand blue)
- Scale: 1.15x (sustained, not transient)

### 5.5 Stacked Pins (same element)

If multiple comments are attached to the exact same element (same selector), they are **stacked** into a single pin showing a count badge:

```
Primary pin shows count of open comments on that element
Count badge (+N) overlaid at top-right of pin (16px pill)
```

Clicking a stacked pin opens the comment view of the most recent comment first.

**v1.1 simplification**: stacking is displayed but cycling through comments on the same element is a v1.2 feature.

### 5.6 Mobile Behavior

On touch devices (`pointer: coarse`):
- Pins are 36x36px (larger touch target)
- No hover tooltip — tooltip content shows as part of the popover header instead
- Tap opens popover immediately (no 400ms hover delay)
- Pinch-to-zoom of host page does not reposition pins (pins are `position: fixed`)

---

## 6. Comment Management Modal

### 6.1 Purpose

The Comment Management Modal gives users a **project-wide view** of all comments across all pages. It is decoupled from comment mode — users can browse, search, resolve, and navigate to comments without enabling annotation mode.

### 6.2 Layout

The modal uses a **two-column master-detail** layout:

```
+---------------------------------------------------------------+
|  Pinote Comments                        [x] close            |
|---------------------------------------------------------------|
|                                                               |
|  LEFT PANEL (340px)     |  RIGHT PANEL (flex: 1)             |
|  ----------------------- |  ---------------------------       |
|  [Search...]             |  (empty: select a comment)        |
|                          |                                    |
|  Filter: All Open Resolved  OR                                |
|  Sort: Newest v          |  +-----------------------------+   |
|                          |  | /dashboard                  |   |
|  +---------------------+ |  | "This button is hard to... |   |
|  | Row: comment A      | |  |                             |   |
|  | Row: comment B (*)  | |  | Created: Jun 16, 2026      |   |
|  | Row: comment C      | |  | Status: Open               |   |
|  +---------------------+ |  |                            |   |
|                          |  | [Resolve]  [Navigate ->]   |   |
|  [Export JSON] [Import]  |  +-----------------------------+   |
+---------------------------------------------------------------+
```

### 6.3 Modal Dimensions

| Property | Value |
|---|---|
| Max width | `900px` |
| Max height | `80vh` |
| Min width | `420px` |
| Border radius | `--pn-radius-xl` (20px) |
| Backdrop | `rgba(15,23,42,0.4)`, `backdrop-filter: blur(4px)` |
| Shadow | `--pn-shadow-xl` |

### 6.4 Responsive Behavior

| Viewport width | Layout |
|---|---|
| >= 768px | Two-column master-detail (full layout) |
| 480-767px | Left panel fills viewport; tapping a row navigates to full-width detail (back button to return) |
| < 480px | Modal fills full viewport (no border radius on edges), single-column only |

On small viewports the detail panel is a separate "screen" within the modal, navigated via a back button. There is no horizontal scroll.

### 6.5 Left Panel — Comment List

- Background: `--pn-surface-3` (`#f1f5f9`)
- Fixed width: 340px on desktop
- Contains: search bar, filter tabs, sort control, comment row list, import/export controls
- List is scrollable independently of the right panel

### 6.6 Right Panel — Comment Detail

- Background: `--pn-surface-0` (`#ffffff`)
- Shows selected comment details (Section 7.2 defines content)
- When no comment is selected: empty state + "Select a comment to view details"
- Right panel is scrollable independently of the left panel

---

## 7. Comment List Features

### 7.1 Comment Row

Each row in the list is a clickable region with the following anatomy:

```
+----------------------------------------------+
| (dot) "This button is hard to click on mo..."  |
|        /dashboard · Jun 16 · Open             |
|                          [Resolve] [->]        |
+----------------------------------------------+
```

**Row contents:**

| Element | Description |
|---|---|
| Status dot | 8px circle: orange (open), slate (resolved) |
| Comment preview | First 80 chars of comment text, truncated with "..." |
| Page pathname | `comment.page.path`, truncated to 30 chars if long |
| Date | Relative format: "2 days ago" / "Jun 16" if > 7 days |
| Status badge | Pill badge: "Open" (orange) or "Resolved" (slate) |
| Resolve/Reopen action | Small ghost button, shown on row hover only |
| Navigate button | Arrow icon button, shown on row hover only |

**Row hover state**: background changes to `--pn-surface-2`, action buttons become visible.  
**Row selected state**: background changes to `--pn-blue-50` (`#eff6ff`), left border `3px solid #2563eb`.

### 7.2 Comment Detail View (Right Panel)

When a comment is selected:

```
+------------------------------------------+
| /dashboard                               |
| Status: (dot) Open                       |
|------------------------------------------|
| "This button is hard to click on         |
|  mobile -- the tap target is too small   |
|  and overlaps with the input field."     |
|------------------------------------------|
| Created Jun 16, 2026 at 18:55            |
| Last updated Jun 16, 2026 at 19:00       |
|------------------------------------------|
| [Resolve comment]  [Navigate to page ->] |
+------------------------------------------+
```

For resolved comments:
- Status shows "Resolved" (slate color)
- "Resolve comment" button becomes "Reopen comment"

### 7.3 Search

- Input: full-width text field at top of left panel
- Placeholder: `Search comments...`
- Searches against: `comment.text` (case-insensitive) + `comment.page.path`
- Results filter in real-time as user types (no debounce needed for local data)
- No results state: "No comments match your search" with a clear button
- Search input has `type="search"` for native clear button on Safari

### 7.4 Filtering

Filter tabs displayed as a segmented control below the search bar:

```
[ All ]  [ Open ]  [ Resolved ]
```

- Default: `All`
- Filters apply on top of search (both active simultaneously)
- Active tab: `background: --pn-blue-500`, `color: white`, `border-radius: --pn-radius-sm`
- Count in each tab label (e.g., `Open (5)`) — updates as comments change

### 7.5 Sorting

A single dropdown control to the right of the filter tabs:

```
Sort: [ Newest v ]
```

Options:
- `Newest` (default): `createdAt` descending
- `Oldest`: `createdAt` ascending

Sort applies on top of filters and search.

### 7.6 Empty States

| Condition | Message |
|---|---|
| Zero total comments | "No comments yet. Enable comment mode to start annotating." |
| Zero results after filter | "No [open/resolved] comments." + link to switch filter |
| Zero search results | "No comments match '[query]'." + Clear button |

### 7.7 Import / Export Controls

Located at the **bottom** of the left panel in the modal, separated by a divider:

```
|---------------------------------|
| [Export JSON]  [Import JSON]    |
| Last imported: Jun 15, 2026     |
```

- Export JSON: triggers `downloadCommentsExport({ scope: 'all' })`
- Import JSON: opens file picker (hidden `<input type="file">`)
- Import success/error message appears inline below the buttons (1 line, auto-clears after 4s)

---

## 8. Navigation Behavior

### 8.1 Overview

When a user clicks "Navigate to page ->" from the Comment Management Modal, Pinote must:
1. Navigate to the correct page
2. Wait for the page to render
3. Find the target element using `resolveElementSelector`
4. Scroll to the element
5. Highlight the pin
6. Open the comment thread

### 8.2 Step-by-Step Implementation Strategy

#### Step 1: Initiate Navigation

```
navigateToComment(comment: LocalComment):

1. Store pendingNavigation = { commentId: comment.id } in engine state
2. Close the comment modal
3. If comment.page.path === currentPage.path:
     -> skip navigation, jump to Step 3
   Else:
     -> call window.history.pushState({}, '', comment.page.path)
     (or window.location.href = comment.page.url for non-SPA environments)
```

#### Step 2: Wait for Page Render

After navigation, Pinote must wait for the target page DOM to settle before attempting element resolution.

```
Strategy (ordered by preference):

A. requestAnimationFrame + setTimeout(fn, 300)
   -> covers most SPA frameworks (React, Vue, Next.js)
   -> sufficient for CSR applications

B. MutationObserver on document.body
   -> observe for DOM mutations, resolve after quiet period (150ms with no mutations)
   -> cancel after 5 seconds (timeout)
```

The engine already patches `history.pushState` and `history.replaceState` — the `handlePageChange` handler fires immediately after navigation. The pending navigation is stored before the navigation occurs so the `handlePageChange` handler can detect it and begin the resolution sequence.

#### Step 3: Find Target Element

```
const element = resolveElementSelector(comment.target.selector, document)
```

Uses the existing multi-strategy selector resolution:
data-attribute -> id -> aria-label -> name -> role -> class -> hierarchy -> dom-path

#### Step 4: Scroll to Element

```
element.scrollIntoView({
  behavior: 'smooth',
  block: 'center',
  inline: 'nearest'
})
```

If `scrollIntoView` is unavailable, use `window.scrollTo` with the element's `getBoundingClientRect()` + `window.scrollY`.

#### Step 5: Highlight Pin

After scrolling is complete (wait for `transitionend` or 600ms timeout):
1. Re-render pins
2. Find the pin for this comment
3. Apply the active highlight animation:
   - Pin pulses with `--pn-shadow-pin-active` twice
   - Pin border changes to `#2563eb`
   - Scale to 1.2x then settle at 1.15x

#### Step 6: Open Comment Thread

```
this.activeCommentId = comment.id
this.render()
```

The comment popover opens anchored to the pin, showing the comment detail.

### 8.3 Timing Sequence

```
User clicks "Navigate ->"
     |
     v  (immediate)
Store pendingNavigation
Close modal
     |
     v  (immediate or after pushState)
handlePageChange fires
     |
     v  (rAF + 300ms)
Attempt element resolution
     |
     +--- Element found --------------------------------+
     |                                                  |
     |    scrollIntoView()                              |
     |    wait 600ms                                    |
     |    highlight pin                                 |
     |    open comment popover                          |
     |    clear pendingNavigation                       |
     |                                                  |
     +--- Element not found ----------------------------+
          |
          v
     Show fallback UI (see 8.4)
```

### 8.4 Fallback Behavior

If the target element cannot be found after the full resolution sequence:

1. A **non-blocking toast notification** appears for 5 seconds:
   ```
   "Could not locate the element for this comment. The page may have changed."
   ```
   Toast position: bottom-center of viewport, above the control cluster.
2. The comment modal does **not** reopen automatically
3. The comment is still accessible — user can open the modal and view it in the list
4. The comment is **not deleted** — orphaned comments remain and can be exported/managed

### 8.5 Cross-Page Navigation (Non-SPA)

If the target page requires a full page load (non-SPA environment):
1. Store `pendingNavigation` in `sessionStorage` under the Pinote storage key
2. Set `window.location.href = comment.page.url`
3. On next page load, Pinote reads `sessionStorage` and executes Steps 3-6 automatically
4. After execution (success or failure), clear the `sessionStorage` entry

This enables navigation even in multi-page applications.

---

## 9. Modal Open/Close UX

### 9.1 Button Design

A dedicated **ModalToggleButton** sits below the FloatingButton in the control cluster.

```
Size:       36px x 36px
Border:     1px solid rgba(148,163,184,0.28)
Radius:     --pn-radius-md (10px)
Background: rgba(255,255,255,0.96)
Shadow:     --pn-shadow-md
Backdrop:   blur(10px)
Icon:       hamburger/list icon, 14px, color: #475467
```

When modal is open:
```
Background: #f1f5f9
Border:     1px solid #cbd5e1
Icon color: #0f172a
```

### 9.2 Icon

The icon is a simple hamburger (=) icon rendered as an inline SVG (no external icon library dependency). In v1.1, use a 3-line hamburger/list icon (14px, 2px stroke, rounded caps).

### 9.3 Behavior

| Action | Effect |
|---|---|
| Click ModalToggleButton | Toggles modal open/closed |
| Click modal backdrop scrim | Closes modal |
| Press `Escape` | Closes modal (if modal is frontmost focus trap) |
| Click the (x) close button inside modal | Closes modal |

### 9.4 Placement

ModalToggleButton is placed directly below FloatingButton in the control cluster, separated by `--pn-space-2` (8px). Both share the same horizontal alignment and right-edge position.

### 9.5 Focus Management

When modal opens:
1. Focus moves to the modal's search input (first focusable element)
2. Focus is trapped inside the modal (`Tab` and `Shift+Tab` cycle within modal only)

When modal closes:
1. Focus returns to ModalToggleButton (the trigger)
2. If closed via ESC, same behavior

### 9.6 Keyboard Access within Modal

| Key | Action |
|---|---|
| `Escape` | Close modal |
| `Tab` / `Shift+Tab` | Cycle through focusable elements |
| `Enter` on a comment row | Select comment / open detail |
| Up/Down arrow keys | Navigate comment list rows (when list has focus) |
| `R` (when row focused) | Resolve/reopen comment |

---

## 10. Future Scalability

### 10.1 Design Constraints to Enable Future Features

The following design decisions in v1.1 are made specifically to accommodate future features without full redesigns.

#### 10.1.1 Replies

The `LocalComment` type already has a `replies: CommentReply[]` field. The comment detail panel in the modal's right column is designed with vertical space below the comment body — this region will become the **thread/replies area** in v1.2.

Placeholder in v1.1: "Replies coming soon" if `replies.length > 0` from an import.

Design constraint: the right panel's comment body uses a scrollable container, not a fixed-height box. Adding reply bubbles below the body requires no layout changes.

#### 10.1.2 Screenshots

The `CommentTarget` type captures `ElementMetadata` and `TargetPosition` including viewport dimensions. In a future version, a screenshot can be captured at comment creation time and stored as a `screenshotDataUrl` on the `LocalComment`.

Design constraint: the comment detail view has a reserved **media slot** between the header and the comment text. In v1.1 this slot is empty. In v1.2+ it renders the screenshot thumbnail.

#### 10.1.3 Team Collaboration

The current `LocalComment` model has `id`, `createdAt`, `updatedAt`, and `status` — all fields that translate directly to a backend schema. The storage adapter is already abstracted via `CommentStorageAdapter` interface. Adding a `RemoteStorageAdapter` in a future version requires zero UI changes.

Design constraint: the `LocalComment.id` format (`comment_<uuid>`) is globally unique — safe to use as a backend primary key without transformation.

#### 10.1.4 Backend Sync

The export/import JSON format is versioned (`schemaVersion: 1`). The sync protocol in a future version will use the same JSON structure. The `CommentImportResult` type already handles `added`, `updated`, `skipped` — which maps directly to a sync merge result.

Design constraint: import/export buttons in the modal are placed in a dedicated "Data" section at the bottom of the left panel. This section will become "Sync" in a future version, with the same layout but additional sync status indicators.

#### 10.1.5 Realtime Comments

The engine's `render()` method is idempotent — calling it with new state always produces the correct UI. A WebSocket or SSE adapter that calls `saveComments(mergedComments)` will trigger `render()` automatically. No UI changes are needed.

Design constraint: the comment list in the modal has `aria-live="polite"` on its container. New comments appearing from realtime sync will be announced to screen readers.

### 10.2 Extension Points

| Future feature | Extension point in v1.1 design |
|---|---|
| User avatars on comments | Avatar slot (32px circle) in comment row, hidden in v1.1 |
| Comment reactions | Reaction bar area below comment text in detail view, hidden in v1.1 |
| Mention notifications | `CommentReply` already has `id` + `text`; add `authorId` field |
| Comment categories/labels | Filter tabs in modal support adding more tabs |
| Bulk resolve | Checkbox column in list rows (hidden in v1.1) |
| Comment expiry | Status field can be extended: open, resolved, expired |

---

## 11. State Diagram

### 11.1 Engine States

```
                   +------------------+
                   |    DISABLED      | <- initial state
                   |  (comment mode   |
                   |   off)           |
                   +--------+---------+
                            | toggle()
                            v
                   +------------------+
                   |    ENABLED       |
                   |  (comment mode   |<-----------------------+
                   |   on)            |                        |
                   +--------+---------+                        |
                            | click element                    |
                            v                                  |
                   +------------------+   ESC / outside click  |
                   |   CREATING       |-----------------------+|
                   |   COMMENT        |                        |
                   |  (draft open)    |                        |
                   +--------+---------+                        |
                            | Enter (submit)                   |
                            v                                  |
                   +------------------+                        |
                   |    VIEWING       |<-- click pin           |
                   |   COMMENT        |                        |
                   |  (popover open)  |                        |
                   +--------+---------+                        |
                            | resolve()                        |
                            v                                  |
                   +------------------+                        |
                   |    RESOLVED      |                        |
                   |   COMMENT        |                        |
                   |  (pin greyed)    |                        |
                   +--------+---------+                        |
                            | reopen()                         |
                            v                                  |
                      (back to VIEWING)                        |
```

### 11.2 Modal States

```
                   +------------------+
                   |  MODAL CLOSED    | <- default
                   +--------+---------+
                            | click ModalToggleButton
                            v
                   +------------------+
                   |   MODAL OPEN     |
                   |  (no selection)  |
                   +--------+---------+
                            | click comment row
                            v
                   +------------------+
                   |   MODAL OPEN     |
                   |  (detail shown)  |
                   +--------+---------+
                            | click "Navigate ->"
                            v
                   +------------------+
                   |   NAVIGATING     |
                   |  (modal closes,  |
                   |  nav in progress)|
                   +---+----------+---+
                       |          |
                  found el    not found
                       |          |
                       v          v
               Pin highlighted  Toast shown
               Popover opens    (fallback)
```

### 11.3 Comment Status Transitions

```
Created -> open
open -> resolved   (via "Resolve" button, in popover or modal)
resolved -> open   (via "Reopen" button, in popover or modal)
open/resolved -> deleted   (via "Delete" button, available in detail view)
```

### 11.4 State Intersection Matrix

| Engine state | Modal state | Valid? | Notes |
|---|---|---|---|
| DISABLED | CLOSED | YES | Default |
| DISABLED | OPEN | YES | User browses comments without annotation mode |
| ENABLED | CLOSED | YES | Normal annotation mode |
| ENABLED | OPEN | YES | Modal can overlay annotation mode |
| CREATING | OPEN | WARN | Modal opening should not discard draft; modal takes focus but draft is preserved |
| CREATING | CLOSED | YES | Normal creation flow |
| NAVIGATING | OPEN | NO | Modal closes before navigation begins |
| NAVIGATING | CLOSED | YES | Normal navigation flow |

---

## 12. User Journeys

### Flow A: Create a Comment

```
1. User opens host page
2. Pinote floating button visible (disabled state, white/glass)
3. User clicks FloatingButton -> mode ENABLED (button turns blue)
4. User hovers over an element -> blue highlight + element label appears
5. User clicks the element -> creation popover opens, textarea auto-focused
6. User types a comment
7. User presses Enter -> comment saved
8. Popover transitions to comment view (no close/reopen flash)
9. Comment pin appears on element (spring animation)
10. FloatingButton badge count increments to reflect new unresolved comment
```

**Alternative path — User presses ESC at step 6:**
Draft cleared, popover closes, mode remains ENABLED, user can click another element.

---

### Flow B: Resolve a Comment

**From pin popover:**
```
1. User clicks existing pin -> comment view popover opens
2. User clicks "Resolve" -> status changes to resolved
3. Pin changes to resolved state (slate color, checkmark icon)
4. Popover shows "Resolved" status badge
5. FloatingButton badge count decrements by 1
```

**From comment modal:**
```
1. User opens modal via ModalToggleButton
2. User clicks comment row -> detail panel shows
3. User clicks "Resolve comment" in detail panel
4. Row status badge changes to "Resolved" (instant)
5. If filter is "Open", row disappears from list
```

---

### Flow C: Import JSON

```
1. User opens comment modal
2. User clicks "Import JSON" button at bottom of left panel
3. File picker opens
4. User selects a .json file
5. File is read and validated:
   a. If valid: merge runs (add new, update existing, skip unchanged)
   b. If invalid: error message appears inline
6. Success: "Imported 12 comments." message (fades after 4s)
7. Modal comment list updates immediately
8. Pins on current page update immediately
```

**Error paths:**
- Wrong file type: "Only .json files can be imported."
- Invalid schema: "This file does not appear to be a Pinote export."
- Partial failure: "Imported 9 of 12 comments. 3 were skipped (invalid format)."

---

### Flow D: Export JSON

```
1. User opens comment modal
2. User clicks "Export JSON" button
3. If no comments: button is disabled (cursor: not-allowed)
4. If comments exist: JSON file downloads immediately
5. Filename: pinote-[projectKey]-[YYYY-MM-DD].json
6. No confirmation dialog — export is non-destructive
```

---

### Flow E: Open Comment from Modal and Navigate to Target

```
1. User opens comment modal
2. User sees comment from /dashboard (current page: /settings)
3. User clicks comment row -> detail panel shows
4. User clicks "Navigate to page ->"
5. Modal closes (animated)
6. Engine stores pendingNavigation = { commentId }
7. history.pushState('/dashboard') is called
8. handlePageChange fires -> currentPage updates
9. rAF + 300ms timeout -> resolveElementSelector runs
10. Element found -> scrollIntoView({ behavior: 'smooth', block: 'center' })
11. 600ms wait for scroll to complete
12. Pin highlight animation (pulse + blue border)
13. activeCommentId set -> comment popover opens
14. pendingNavigation cleared
```

**Fallback path (element not found):**
```
1-9. Same as above
10. Element not found after resolution sequence
11. Toast: "Could not locate the element. The page may have changed."
12. Toast visible 5s then fades out
13. Comment pins for current page still rendered normally
14. User can still access comment via modal
```

---

## 13. Component Inventory

### 13.1 Engine Components (non-visual)

#### `Pinote` (class)
- **Purpose**: Core engine, single source of truth for all state
- **State**: `isCommentModeEnabled`, `comments`, `activeCommentId`, `pendingCommentDraft`, `hover`, `currentPage`, `lastCapturedTarget`, `lastImportResult`, `importError`, `isModalOpen`, `pendingNavigation`
- **Responsibilities**: mount/unmount, event binding, render orchestration, storage sync, navigation

#### `CommentStorageAdapter` (interface)
- **Purpose**: Abstracts storage backend (currently localStorage)
- **Props**: `storageKey: string`
- **Responsibilities**: `load() -> LocalComment[]`, `save(comments)`, `clear()`

---

### 13.2 Visual Components

#### `FloatingButton`
- **Purpose**: Primary Pinote toggle, always visible
- **State**: `isEnabled: boolean`, `unresolvedCount: number`
- **Responsibilities**: toggle comment mode, display unresolved count badge, hover/active states

#### `ModalToggleButton`
- **Purpose**: Opens/closes the Comment Management Modal
- **State**: `isModalOpen: boolean`
- **Responsibilities**: toggle modal, reflect open/closed visual state, handle keyboard activation

#### `ControlCluster`
- **Purpose**: Container for FloatingButton + ModalToggleButton
- **Props/State**: `position: PinoteControlPosition`, `isCommentModeEnabled: boolean`, `isModalOpen: boolean`
- **Responsibilities**: layout both buttons in a vertical stack at the configured corner, pass events to children

#### `CommentPin`
- **Purpose**: Marks a comment's location on the page
- **Props**: `comment: LocalComment`, `index: number`, `isActive: boolean`, `position: TargetPosition`
- **State**: `isHovered: boolean`, `showTooltip: boolean`
- **Responsibilities**: render pin circle with status color, handle click to open popover, show tooltip on hover (400ms delay), animate on active, pulse animation on navigation highlight

#### `HoverOverlay`
- **Purpose**: Highlights the element under the cursor during comment mode
- **Props**: `rect: TargetRect`, `label: string`, `selectorPreview?: string`
- **Responsibilities**: render blue border overlay + element label tooltip above element, `pointer-events: none`

#### `CommentCreationPopover`
- **Purpose**: Textarea popup for writing a new comment
- **Props**: `draft: PendingCommentDraft`, `position: TargetPosition`
- **State**: internal `text: string` (mirrors `draft.text`)
- **Responsibilities**: auto-focus textarea on mount, handle `keydown` for Enter/Shift+Enter/Escape, submit comment on Enter, cancel on outside click or ESC, validate non-empty on submit (flash red on empty), position relative to pin with viewport overflow detection

#### `CommentViewPopover`
- **Purpose**: Displays an existing comment anchored to its pin
- **Props**: `comment: LocalComment`, `position: TargetPosition`, `onClose`, `onResolve`, `onDelete`
- **Responsibilities**: show comment text + metadata (path, status, date), provide Resolve/Reopen action, provide Delete action, close on backdrop click or ESC, position relative to pin with viewport overflow detection

#### `CommentManagementModal`
- **Purpose**: Full project-wide comment management interface
- **Props**: `comments: LocalComment[]`, `onClose`, `onResolve`, `onNavigate`, `onImport`, `onExport`
- **State**: `selectedCommentId: string | null`, `searchQuery: string`, `filter: 'all' | 'open' | 'resolved'`, `sort: 'newest' | 'oldest'`, `mobileView: 'list' | 'detail'`
- **Responsibilities**: render two-column layout (or single-column on mobile), manage list + detail panel, handle keyboard navigation, implement focus trap, ESC close, backdrop click close

#### `CommentList`
- **Purpose**: Scrollable list of comment rows in the modal left panel
- **Props**: `comments: LocalComment[]`, `selectedId: string | null`, `onSelect`, `onResolve`, `onNavigate`
- **State**: derived filtered + sorted list (computed from props + parent filter/sort state)
- **Responsibilities**: render rows, handle row selection, keyboard Up/Down navigation, virtualize if count > 100 (fixed row height: 68px), empty states

#### `CommentRow`
- **Purpose**: Single row in the comment list
- **Props**: `comment: LocalComment`, `isSelected: boolean`, `onSelect`, `onResolve`, `onNavigate`
- **State**: `isHovered: boolean`
- **Responsibilities**: show status dot, text preview, pathname, relative date, status badge; reveal action buttons on hover; emit select/resolve/navigate events; keyboard `Enter` to select, `R` to resolve

#### `CommentDetailPanel`
- **Purpose**: Right column detail view of selected comment
- **Props**: `comment: LocalComment | null`, `onResolve`, `onNavigate`, `onDelete`
- **Responsibilities**: show full comment text, metadata (path, dates, status), action buttons (Resolve/Reopen, Navigate, Delete); empty state when no comment selected; scrollable content area; reserved media slot for future screenshot

#### `SearchInput`
- **Purpose**: Search bar in modal left panel header
- **Props**: `value: string`, `onChange: (value: string) -> void`
- **Responsibilities**: controlled `<input type="search">`, show/hide clear button, forward `onChange` on each keystroke

#### `FilterTabs`
- **Purpose**: All / Open / Resolved segmented control
- **Props**: `active: 'all' | 'open' | 'resolved'`, `counts: { all: number, open: number, resolved: number }`, `onChange`
- **Responsibilities**: render three tab buttons, show counts, emit change on click, reflect active state visually

#### `SortControl`
- **Purpose**: Dropdown/select for sort order
- **Props**: `value: 'newest' | 'oldest'`, `onChange`
- **Responsibilities**: render a `<select>` or custom dropdown with "Newest" and "Oldest" options

#### `StatusBadge`
- **Purpose**: Pill badge for comment status
- **Props**: `status: 'open' | 'resolved'`
- **Responsibilities**: render orange "Open" or slate "Resolved" pill; applies correct color tokens

#### `ToastNotification`
- **Purpose**: Non-blocking notification for navigation failures or import results
- **Props**: `message: string`, `type: 'success' | 'error' | 'info'`, `duration: number` (ms)
- **State**: `isVisible: boolean`, internal auto-dismiss timer
- **Responsibilities**: appear with fade-in animation, auto-dismiss after duration, fade out, position bottom-center above control cluster, support screen reader announcement via `role="status"`

#### `CountBadge`
- **Purpose**: Number badge overlay on FloatingButton
- **Props**: `count: number`
- **Responsibilities**: render orange pill with count; format as "99+" for counts over 99; apply white border outline

---

## 14. Risks & Recommendations

### 14.1 Ambiguities

| ID | Ambiguity | Impact | Recommendation |
|---|---|---|---|
| A1 | Should ModalToggleButton be visible when comment mode is disabled? | Low | **Yes** — always visible. Modal is independent of annotation mode. |
| A2 | Should "Navigate ->" close the modal before or after navigation? | Medium | **Close modal first** (animated), then navigate. Prevents jarring overlay during page transition. |
| A3 | Should opening the modal while a draft is in progress preserve or discard the draft? | Medium | **Preserve draft**. Modal takes focus but draft state is maintained. ESC from modal returns focus to page with draft still present. |
| A4 | Should pins be visible when comment mode is disabled? | Low | **No** — keep hidden (v1.0 behavior). A future "view mode" can show read-only pins without annotation mode. |
| A5 | What visual indicator distinguishes resolved pins beyond color? | Low | **Unicode checkmark** (v) in place of number. No icon font dependency, accessible, universally supported. |
| A6 | Should FloatingButton badge show current-page count or all-pages count? | Medium | **All-pages unresolved count** — the more useful signal when browsing across pages. |

### 14.2 UX Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| U1 | Enter key to submit conflicts with host websites that intercept `keydown` globally | High | Use `keydown` listener on the **textarea element only** with `stopPropagation()`. Never attach a global Enter listener. |
| U2 | Popover follows scroll — re-rendering on every scroll event may cause jitter on slow devices | Medium | Throttle render using `requestAnimationFrame` (already implemented for pin positions). Skip render if position change < 1px. |
| U3 | Comment management modal may feel slow with many comments (500+) | Medium | Virtualize the comment list with windowed rendering if count > 100. Design uses fixed row height (68px) to support this. |
| U4 | "Click outside to cancel" may accidentally trigger on elements adjacent to the popover | Medium | Use `pointerdown` on document + `composedPath()` check to detect true outside clicks. Do not use `blur` event on textarea. |
| U5 | Two-column modal layout may feel cramped at exactly 900px width | Low | Panels have independent scroll; adjust breakpoint to 840px if testing reveals crowding. |
| U6 | Navigation to another page closes the modal but gives no visual confirmation of action | Medium | Show a brief "Navigating to /dashboard..." toast (1.5s) before modal closes. Anchors the user's mental model. |

### 14.3 Technical Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| T1 | `history.pushState` patching may conflict with React Router, Next.js router, or other SPA frameworks | High | Test thoroughly in demo-react app. Ensure the patch is idempotent (check if already patched before replacing). Use the stored original reference safely. |
| T2 | `sessionStorage` for cross-page navigation may not be available (private browsing, certain browsers) | Low | Wrap all `sessionStorage` access in try/catch. Fallback: skip pending navigation and show informational toast. |
| T3 | Cross-page navigation in MPA (full reload) requires session state persistence across page load | Medium | Implement sessionStorage approach (Section 8.5). Test in demo-vanilla app. |
| T4 | Modal focus trap must not break host page's accessibility focus order after modal closes | Medium | Only trap focus while modal is open and `aria-modal="true"`. Release trap on close. Return focus to trigger element. Implement tabbable element detection manually or with a minimal utility. |
| T5 | The `render()` method re-renders the entire container on every state change — large pin sets may be slow | Medium | Profile with 50+ comments. For v1.1, this is acceptable. For v1.2, consider targeted DOM updates for pin positions instead of full innerHTML replace. |
| T6 | `resolveElementSelector` may match the wrong element after page re-renders in dynamic applications | Medium | Already mitigated by multi-strategy selector with fallback chain. Log selector resolution failures to console in development mode for debugging. |

### 14.4 Recommended Implementation Order for v1.1

The implementation is organized into **5 phases**. Each phase delivers a shippable increment that can be tested independently.

#### Phase 1: Foundation (Prerequisites for all other phases)

1. Add `isModalOpen: boolean` and `pendingNavigation: { commentId: string } | null` to `PinoteState`
2. Add `openModal()`, `closeModal()`, and `navigateToComment(comment)` methods to `Pinote` class
3. Update control cluster rendering to include ModalToggleButton below FloatingButton
4. Update `PinoteContext` (React binding) to expose new methods

**Deliverable**: ModalToggleButton visible in corner, not yet functional beyond toggling `isModalOpen`.

#### Phase 2: Comment Creation UX Redesign

1. Remove Submit and Cancel buttons from creation popover
2. Implement `keydown` Enter-to-submit handler on textarea element
3. Implement `Shift+Enter` newline insertion
4. Implement click-outside cancel using `pointerdown` + `composedPath()`
5. Implement Escape cancel (attach to textarea, not document)
6. Add empty-submit guard (red border flash animation, 400ms)
7. Verify auto-focus works correctly across browsers
8. Verify popover positioning logic (right-flip, up-flip, viewport margins)

**Deliverable**: Keyboard-native comment creation with no buttons.

#### Phase 3: Pin Redesign

1. Resolved pin: replace number with Unicode checkmark, apply slate-400 color + opacity 0.75
2. Implement hover tooltip (400ms delay, `pointer-events: none`)
3. Implement active state styling (blue border + pulse animation)
4. Implement spring scale animation on pin creation
5. Update FloatingButton badge to show all-pages unresolved count (previously current-page count)
6. Implement stacked pin display (count badge for same-element comments)

**Deliverable**: Visually refined pins with clear open/resolved distinction.

#### Phase 4: Comment Management Modal

1. Implement modal HTML structure using `<dialog>` element with `aria-modal="true"`
2. Implement two-column layout (340px left + flex right) with CSS Grid/Flexbox
3. Implement CommentList with CommentRow components
4. Implement SearchInput (real-time filtering)
5. Implement FilterTabs (All / Open / Resolved with counts)
6. Implement SortControl (Newest / Oldest)
7. Implement CommentDetailPanel with full comment text, metadata, and action buttons
8. Move Import/Export controls into modal left panel bottom
9. Implement focus trap + ESC close + backdrop click close
10. Implement responsive collapse for viewport < 768px (single-column, detail as sub-screen)

**Deliverable**: Fully functional comment management modal with search, filter, sort, and import/export.

#### Phase 5: Navigation System

1. Implement `navigateToComment(comment)` method with full Step 1-6 sequence (Section 8.2)
2. Implement `rAF + 300ms` timing strategy for post-navigation element resolution
3. Implement pin highlight animation on successful navigation
4. Implement `activeCommentId` set + popover open after navigation
5. Implement fallback `ToastNotification` for element-not-found case
6. Implement `sessionStorage` persistence for non-SPA navigation (Section 8.5)
7. Test full Flow E in demo-react (SPA navigation via pushState)
8. Test full Flow E in demo-vanilla (MPA navigation via location.href + sessionStorage)

**Deliverable**: Complete cross-page navigation from modal to annotated element, with fallback handling.

---

*This document is the authoritative design specification for Pinote v1.1. All implementation work must reference and conform to this document. Breaking changes to this specification require a version bump (v1.1.1, v1.2, etc.) with a change log.*
