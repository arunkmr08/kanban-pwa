# Changelog

## v0.1.0

- Kanban board with draggable funnels and groups.
- Drag-and-drop for customers:
  - Reorder within a group using `arrayMove`.
  - Move between groups by dropping on a card target.
  - Drop into empty/new groups by targeting the group container; appends to end.
- Pinned customers sorting: pinned items float to the top reliably.
- Add New Group flow:
  - Dashed "Add New Group" tile after the last column.
  - Flyout to set Group Name, Description, and Manual/Automatic mode.
- Layout and responsiveness:
  - Full-width header with wrapping controls on small screens.
  - Full-width main content, horizontal scroll for columns.
- UI cleanliness:
  - Removed header-level Add Group button (use the tile instead).

Notes
- Future: wire "Automatic" mode to rules for auto-population.
- Optional: iOS PWA full-screen meta and status bar styling.
