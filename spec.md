# Soccer Team Manager

## Current State
- LineupTab has a two-step tap-to-select → tap-pitch approach for placing players
- Player markers on pitch show jersey number circle + tiny last name label
- Squad list is a vertical list with number + full name
- Dragging already-placed markers on the pitch works via pointer events
- No drag-from-sidebar-to-pitch support

## Requested Changes (Diff)

### Add
- Drag from squad list directly onto pitch (any free position) OR onto a formation slot
- Drag from squad list into bench slots
- Touch-friendly drag support (pointer events, not HTML5 drag API, for mobile)

### Modify
- Player markers on pitch: first name displayed largest, jersey number smaller below it, last initial only (e.g. "James W." becomes "James" + "W" small). No full last name.
- Squad list: larger, more tappable cards optimised for mobile (full width, bigger touch targets)
- Keep existing tap-to-select → tap-to-place as a fallback interaction
- Dragging an already-placed marker on the pitch continues to work

### Remove
- Nothing removed

## Implementation Plan
1. Rework `FilledMarker` component: first name large (font ~11-12px bold), number small below (~8px), last initial only in a subtle label
2. Implement pointer-event drag from squad list: onPointerDown on player card starts a drag ghost that follows the finger/mouse; on pointerUp over the pitch, place the player at the drop position (snap to nearest empty slot or free-place if none close)
3. Squad list cards: full-width, min 48px tall, big first name, position badge, jersey number
4. Ensure drag ghost is visible on mobile (fixed-position overlay div following pointer)
5. On drop onto pitch: same logic as existing tap-to-place (snap to nearest empty slot within threshold, else free-place)
6. Tap-to-select still works as before for users who prefer it
