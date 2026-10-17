# StudyOS 0.0.23

## Visual upgrade
- Fixed desktop workspace sidebar, with direct access to Today, Planner, Focus, Review and Notebook. Search, the active timer and Settings remain available at the bottom.
- Consistent page headers, 6–10 px component radii, restrained blue selection, neutral white/grey surfaces, compact icons and clearer text hierarchy.
- Task ledger has a distinct header, aligned rows, estimates and actions. Auxiliary goals/activity use a quieter bordered panel.
- Calendar, review cards, notebook forms, dialogs and Focus settings share the same surface and control language. Focus settings padding was corrected after screenshot inspection.
- No external fonts, copied brand assets, people illustrations or restored glass page. No new service, account, framework or backend.

## Data and interaction fixes
- Corrupt current storage cannot be overwritten by normal saves. An explicit recovery banner offers the original snapshot plus notebook export. Valid-backup restoration first makes a durable copy of the damaged snapshot.
- Stale task editors detect another tab's task edits or deletion. Saving stops with a visible error and keeps the draft rather than reverting completion or resurrecting a deleted task.
- Automatic timer completion preserves the current route and unsaved notebook editor. Its notification offers Open Focus through the existing unsaved-work guard.
- Backups capture running timers as paused. Legacy running backups restore paused at the export timestamp; if no trustworthy export timestamp exists, only stored elapsed time is retained. Offline days are not counted as study time.
- Task deletion provides immediate guarded Undo, including child plans. Completion Undo remains supported.
- Planner uses six semantic rows and one roving focusable date. Arrow keys, Home, End, Enter and Space retain focus on the selected date.
- State validation indexes parent IDs with a Map. In the measured 10k-task fixture, validation fell from 864 ms to 35 ms. This is a single local measurement, not a universal performance guarantee.

## Compatibility
Application version is 0.0.23. The storage key remains `studyos.beta.0.0.4`; backup data schema remains 0.0.4. The notebook database remains `studyos-light-notebook` with its original schema. Unknown fields, existing IDs, hierarchy, links, images and assessments retain the original validation/migration paths.

## Using the release
Export a full backup from your old file first. Open the new HTML and restore that backup if your browser treats the new filename/location as a different storage origin. The new file does not bundle your personal data or preload the test fixtures. Keep the original file and backup until you have checked your records.

Testing used Chromium over a local HTTP origin. Direct file:// navigation was blocked by this environment's administrator policy. Double-click behavior on your own computer and Safari remain unverified. This release does not add route history or cloud sync.
