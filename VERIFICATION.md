# StudyOS 0.0.23 — audit and verification

Date: 2026-10-17 UTC. Browser: installed Chromium, automated with Python Playwright. Actual browser screenshots, not mockups. All data was isolated in fresh browser contexts. No personal archive was cleared or populated. No repository push or public deployment occurred.

## Baseline identity
The Library attachment resolved correctly but its transfer host failed DNS resolution (`Temporary failure in name resolution`), including the approved elevated network diagnostic. A read-only GitHub fetch subsequently succeeded for `downloads/studyos-0.0.22`, commit `691ed050397888e1e52913ac1c8c4dc69e0871c9`.

- ZIP size: 674858 bytes
- ZIP SHA256: `60542324836ba12c23cb5e4ef89861de160e7b702a7d61ffb5588107ef662391`
- Extracted HTML size: 1520933 bytes
- HTML SHA256: `1a9a4c2b44b97c1bdb48e9f8fffa6969fa54503fff1180bfba2144fef92434b0`

Both hashes match the independent attachment values supplied by the parent task. The original remains preserved separately.

## Concrete audit
The initial actual-browser audit opened Today, Planner, Focus, Review, Notebook, Plan insights, Study assessment, Website blocking, Quick guide and Settings. `audit.json` records rendered text and the task created through the UI; `before-*.png` records the original surfaces. Empty core views and a populated Today were checked before implementation. Broader populated core-view inspection continued during implementation; this is not claimed as a completed pre-change audit of every possible data state.

| Area | Observed issue or limitation | Result |
| --- | --- | --- |
| Navigation | Full-width horizontal navigation; Notebook nested under More | Persistent desktop sidebar and direct Notebook entry |
| Today | Long horizontal task area, weak header/row boundaries, large undifferentiated whitespace | Bordered ledger, aligned action columns, quieter goal/activity rail |
| Shared surfaces | Differing panel padding/radii and legacy notebook/dialog styling | Unified tokens and scoped component styles; Focus padding corrected after screenshot review |
| Corrupt storage | Original `{broken` snapshot was replaced by commit in 0.0.22 | Reproduced in Chromium; new version blocks save and exports exact raw content |
| Concurrent task edit | Open editor reverted another tab's completion; removed task could be recreated | Two-tab regression now rejects stale saves and retains draft |
| Timer + notebook | Automatic expiry changed route to Focus and removed an unsaved inline form | Reproduced on 0.0.22; new version keeps editor and route |
| Backup timer | Three-day-old running backup with one elapsed minute restored as running at 30 minutes | Browser comparison: 0.0.22 running/1800000 ms; 0.0.23 paused/60000 ms |
| Calendar keyboard | 42 tab stops; missing row roles and directional navigation | Six rows, roving tab stop, arrows/Home/End/Enter/Space |
| Large task sets | Repeated full scans to find each task's parent | Indexed validation; no claim of comprehensive progress/calendar caching |
| Navigation history | Refresh resets route; no Back/Forward route history | Deferred; data preservation prioritized |

## Final test results
Final core suite: 11/11 PASS. Additional suite: 5 PASS, 1 BLOCKED. Final focused checks: 4 PASS, plus before/after backup comparison. No unresolved application failure was observed in these executed checks. These are bounded checks, not a claim that every product behavior has been exhaustively validated.

| Check | Status | Evidence / limits |
| --- | --- | --- |
| Task create/edit/complete/delete | PASS | Actual controls; persisted storage assertions |
| Completion and deletion Undo | PASS | Restored task state and reload |
| Empty title / negative estimate | PASS | Invalid input rejected; editor retained |
| Corrupt snapshot protection | PASS | Exact original bytes retained; recovery export contains raw snapshot and notebook |
| Explicit recovery copy | PASS | Recovery-key copy created before replacement; exercised commit recovery path |
| Concurrent completion/delete | PASS | Two browser tabs; stale save refused; draft retained; no resurrection |
| Real timer pause/resume/save/reload | PASS | Real waits of 2.2 + 1.2 + 1.2 seconds; measured paused elapsed 2235 ms; session persists |
| Automatic expiry during notebook edit | PASS | Controlled expired timestamp, separately tested against original and new versions |
| Three-day-old running backup | PASS | Controlled historical timestamps; paused at 60 seconds after import and reload |
| Running timer export | PASS | Export paused at 12002 ms in controlled fixture |
| Planner keyboard | PASS | Six rows, single focusable date, arrows/Home/End/Space; selected-cell focus retained |
| Notebook create/edit/reload | PASS | Actual editor controls; title and question retained |
| Notebook text + PNG backup | PASS | Export/import into second fresh context; records and image data match exactly, ignoring envelope export time |
| Malformed backup | PASS | Storage unchanged |
| Quota failure | PASS — simulated | Storage.setItem injected failure; original snapshot preserved; real device quota exhaustion not tested |
| Unknown fields / IDs / hierarchy / links | PASS | Validation and persistence fixtures; original schema retained |
| Old key migration | PASS | Read `studyos.beta.0.0.3`, retained unknown fields and original old key; save writes current key |
| Cross-page goal consistency | PASS | Completed child reports 1 of 1 on Today and Planner |
| Modal/command/menu keyboard | PASS | Ctrl+K, Tab inside modal, Escape dismissal, More disclosure |
| Core layout | PASS | Today/Planner/Focus/Review/Notebook at 1280, 1440, 1920; empty and populated; 30 screenshots; no document-level horizontal overflow |
| Secondary routes | PASS — smoke | Actual opening and screenshots; not exhaustive assessment/blocking workflow tests |
| Local file:// launch | BLOCKED | Browser returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`; no bypass; no pass claimed |
| User computer double-click / Safari / Firefox | NOT VERIFIED | Not available in this environment |
| Real 30-minute background/sleep timer | NOT VERIFIED | Short real timer and controlled expiry are distinct tests |
| Screen reader / full WCAG audit | NOT VERIFIED | Keyboard and semantic checks only |
| Every assessment answer path / extension integration | NOT VERIFIED | Preserved original features; no extension available |
| Notebook permanent deletion / Undo | NOT APPLICABLE to existing UI | Notebook uses archive status; no new destructive-delete feature added |

Initial automated attempts exposed two harness timing/comparison mistakes: an assertion read pause state before its asynchronous transaction completed, and compared notebook envelope export timestamps. The harness now waits for the persisted paused state and compares records/images; final runs pass. These were not silently presented as product fixes.

## Performance
Single comparative Chromium run with 5,000 and 10,000 realistic-style day tasks spread over 2,400 dates. This is synthetic isolated test data, never loaded into the shipped app automatically. Timing includes JS validation or render() DOM creation; it is not an end-to-end paint benchmark or a mobile-device estimate.

| Tasks | 0.0.22 validation | 0.0.23 validation | 0.0.22 calendar render | 0.0.23 calendar render |
| --- | ---: | ---: | ---: | ---: |
| 5,000 | 238 ms | 24 ms | 45 ms | 37 ms |
| 10,000 | 864 ms | 35 ms | 120 ms | 129 ms |

The measured improvement is validation. Calendar rendering did not consistently improve; full indexing, virtualization and deep-hierarchy performance remain future work.

## Screenshots and reproducibility
`evidence/populated-<route>-<width>.png` and `empty-<route>-<width>.png` contain actual captures. Populated screenshots contain explicitly isolated tasks, a paused session, a record and a PNG notebook fixture. They are not bundled as live user data. Representative images are included separately for Today, Planner, Focus, Review and Notebook. Before images, raw test JSON and test scripts are included in the ZIP.

The HTML remains self-contained. No application runtime dependency or framework was added. Python/Playwright files are verification tooling only.
