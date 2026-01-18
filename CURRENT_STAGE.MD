# Current Stage

- Default login route now lands on the user panel (shared library).
- Shared library lists all files with lock icons for inaccessible items and no download action.
- "My files" renamed to "My uploaded files" and shows lock status based on access.
- Sidebar footer (library switch/storage) pinned to the bottom with a dedicated scroll area for the menu list.
- Uploader is always preserved in file access on approval, and access lists persist across access type changes.
- Auto-refresh now skips `/auth/me` while a temp-password change is required to avoid clearing auth.
- Lock icon now appears when a file is not downloadable either due to access or missing assets; download button is hidden in that case.
- Favorites added in My Library with a dedicated page, API, and migration.
- Requests/My uploaded files sidebar items are shown only when file submission is allowed.
- Lock icon size reduced and aligned in shared/my library tables.
- Trash now lists files, versions, and assets with type-specific restore and permanent delete actions.
- Sidebar scrollbar now aligns with the drawer edge (scroll area expanded, content padding preserved).
- listTrash language handling fixed to avoid TS compile errors.
- Lock icon column now centered with reduced padding in user library tables.
- Lock icon column shifted slightly right for horizontal alignment.
- Versions now require an initial file on creation, and version assets are immutable in the UI; deleting/restoring a version soft-deletes/restores its assets.
- Version creation supports multiple language files (one file per language) in the create form.
- Dashboard requests now support search, column sorting, row-click details with asset downloads, and icon actions; user requests mirror tabs/search/sorting.
- Favorites toggles added to user library tables, with access shown as icons and wider title/category columns.
- Favorite add/remove now shows toast notifications.
- Favorites matching now normalizes IDs when building `isFavorite` in user list responses.
- Shared library favorites now stay highlighted by merging favorite IDs client-side; file tables give more room to title/category by shrinking static columns.
- Submit request form now places the admin comment at the end with distinct styling and uses an icon button for adding extra language files.
- Dashboard files and requests tables now use access icons and wider title/category columns, with tighter widths for static fields; my-library request table follows the same spacing.
- Navbar now prefers a shortened surname + initials display when available; publication request details and history highlight user/admin comments, and user request rows open a details dialog with comments.
- Comment columns removed from request tables; comments remain available in request details dialogs.

## Next

- Run the new migration for rejection reasons if not done yet.
- Run the new migration for soft-deleting version assets if not done yet.
- Verify shared library shows locked items correctly and download is disabled.
- Confirm creator access persists after toggling public/restricted in file access settings.
- Verify shared library favorites stay highlighted after refresh.
