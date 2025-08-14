CLAUDE.md — Continuous Improvement (Short Version)

Claude must follow this iterative workflow in every interaction to ensure clarity, reuse, and verifiable quality.

1) State the Goal
   •  Begin by summarizing the target of this interaction (bug/feature/design).

2) Reuse First
   •  Scan the whole project before any change to avoid duplication and reuse existing methods, constants, helpers, and tests.
   •  Maintain (or consult) PROJECT_OVERVIEW.md describing files, key methods, tests, constants, shared utilities, and reusable resources.

3) Plan → Implement
   •  Identify the issue or next design.
   •  Implement or fix code after considering reuse.

4) Test Modification Policy (Strict)
   •  Do not change, remove, or bypass existing tests without explicit permission.
   •  Add/extend tests only when logic changes; otherwise leave tests unchanged.

5) Update & Run Tests
   •  Backend/API changes → update/run backend tests.
   •  UI changes → update/run Selenium UI tests.

Browser Reuse Policy for UI Tests

Action   When to Reuse Existing Browser Instance   When to Restart Browser
UI Test Session   Default — all UI tests in same suite   Only if browser is unstable or tests fail due to session state
Memory Management When resource usage is within limits   If memory leaks cause slowdown or crashes
Session Handling  When session cookies/tokens remain valid  If login/session expired and cannot be restored programmatically
Performance If startup time is significant   If cold start is required for clean environment

   •  Always prefer reusing existing browser sessions unless one of the restart conditions above applies.
   •  Run all relevant suites; if anything fails, return to Step 3.

6) UI Screenshot Verification (Evidence on All Outcomes)
   •  One-to-one log file per feature: if x_y_z.feature then only x_y_z_screenshots.md.
   •  Before run: delete all old screenshots.
   •  During run per step:
   •  Perform verification.
   •  Take a screenshot for both pass and fail results as evidence.
   •  Screenshot log file must always reflect the feature steps and include:
   •  Index | Screenshot File | Verifying Items | Result
   •  Never remove previously passed entries.
   •  Add “Test Run Time: ” for each run.

7) Test Metrics Tracking
   •  After each run, compare current vs previous:
   •  Test case count, pass/fail counts, pass rate (%).
   •  Summarize deltas (↑/↓) to highlight improvements or regressions.

8) Test Results History (Central Log)
   •  Append each run to test_results_history.md with:
   •  Timestamp
   •  Per-suite totals (Total/Passed/Failed/Pass %)
   •  Brief notes on regressions/improvements.

9) Commit & Iterate
   •  Commit only after all checks pass (including screenshot rules and logs).
   •  Use clear commit messages.
   •  Return to Step 1 and repeat.

⸻

📌 Notes
   •  Keep PROJECT_OVERVIEW.md, all *_screenshots.md, and test_results_history.md current.
   •  Enforce exact naming:

feature_name.feature ↔ feature_name_screenshots.md



⸻

📎 Appendix

Example: x_y_z_screenshots.md

# Screenshot Verification Log for `x_y_z.feature`
**Test Run Time:** 2025-08-13 10:32:15

| Index | Screenshot File   | Verifying Items                     | Result   |
|-------|-------------------|--------------------------------------|----------|
| 1     | step1_loaded.png  | Main page loaded, title visible      | ✅ Pass  |
| 2     | step2_input.png   | Form fields filled with valid data   | ✅ Pass  |
| 3     | step3_error.png   | Error message displayed              | ❌ Fail  |


⸻

Example: test_results_history.md

## Test Run — 2025-08-13 10:32:15

| Suite         | Total | Passed | Failed | Pass % |
|---------------|-------|--------|--------|--------|
| Backend       | 125   | 124    | 1      | 99.2%  |
| UI            | 60    | 59     | 1      | 98.3%  |

- ✅ Backend API improvements confirmed stable.
- ❌ UI: Error message step failed in `x_y_z.feature`.


⸻

🆕 Empty Template — feature_name_screenshots.md

# Screenshot Verification Log for `feature_name.feature`
**Test Run Time:** YYYY-MM-DD HH:MM:SS

| Index | Screenshot File   | Verifying Items                     | Result   |
|-------|-------------------|--------------------------------------|----------|
| 1     |                   |                                      |          |
| 2     |                   |                                      |          |
| 3     |                   |                                      |          |


⸻

🆕 Empty Template — test_results_history.md

## Test Run — YYYY-MM-DD HH:MM:SS

| Suite         | Total | Passed | Failed | Pass % |
|---------------|-------|--------|--------|--------|
| Backend       |       |        |        |        |
| UI            |       |        |        |        |

- Notes:
  - 
