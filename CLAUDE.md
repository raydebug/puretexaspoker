CLAUDE.md – Continuous Improvement Workflow

Claude must follow this structured, iterative workflow to ensure clarity, reusability, traceability, and continuous quality improvement across all development and testing activities.

This workflow mandates controlled test updates, screenshot-based verification, result tracking, and audit-friendly documentation.

⸻

🌀 Iteration Workflow

1. Summarize the Target of This Interaction

At the beginning of each task or session, Claude must clearly state the objective.
Examples:
   •  “Fix login timeout logic”
   •  “Add input validation for registration form”
   •  “Refactor invoice rendering flow”

⸻

2. Scan for Reuse Before Code/Test Changes

Before writing or editing any code or test:
   •  Review the entire project to avoid redundancy.
   •  Reuse existing:
   •  Functions / utilities
   •  Constants / configs
   •  Tests / mocks / assertions
   •  Refer to or maintain PROJECT_OVERVIEW.md, which describes:
   •  Purpose of each source/test file
   •  Key methods and their behavior
   •  Constant definitions
   •  Test coverage per feature
   •  Shared components/utilities

⸻

3. Identify Issue or Plan the Next Design

Clearly define the bug, task, or feature to address in this iteration.

⸻

4. Implement or Fix Code

Apply changes only after confirming reuse opportunities have been exhausted.

⸻

❗ Test Modification Policy

Claude must strictly follow these rules:
   •  Do not change, remove, or bypass existing tests without explicit permission.
   •  Add or extend tests only when functional logic changes.
   •  If a test appears outdated or invalid, flag it for review — but do not modify it directly.

⸻

5. Update Tests as Needed (With Permission)
   •  For backend/API changes, update or add backend unit/integration tests.
   •  For UI/frontend changes, update or add Selenium UI test cases.
   •  Test changes must follow the permission rule above.

⸻

6. Run UI Tests with Screenshot Verification

✅ Screenshot Log File Naming
   •  For every .feature file (e.g., checkout_flow.feature), create a single corresponding screenshot log file:

checkout_flow_screenshots.md


   •  This naming pattern is mandatory.

📸 Screenshot Log File Format
   •  Before each test run, delete all previous screenshots.
   •  During testing, capture screenshots of each UI step.

Each run must update the associated screenshot log file, including:

# Screenshot Verification Log for `checkout_flow.feature`
**Test Run Time:** 2025-07-28 14:53:21

| Index | Screenshot File       | Verifying Items                           | Result   |
|-------|------------------------|-------------------------------------------|----------|
| 1     | checkout_step1.png     | Product page loaded                       | ✅ Pass  |
| 2     | checkout_step2.png     | Address form filled correctly             | ✅ Pass  |
| 3     | checkout_step3.png     | Payment confirmation visible              | ❌ Fail  |

🔒 Maintenance Rules
   •  Never delete previously passed steps from the log.
   •  Always update the Result column for each test run.
   •  Always record the current timestamp (Test Run Time) for each test run.

⸻

7. Track Test Coverage and Result Changes (Per Run)

After each test run, compare current vs. previous test metrics:

| Test Suite     | Prev Count | Curr Count | ΔCases | Prev Pass % | Curr Pass % | ΔPass % |
|----------------|------------|------------|--------|-------------|-------------|---------|
| Backend Tests  | 120        | 125        | +5     | 98%         | 99%         | +1%     |
| UI Tests       | 60         | 60         | 0      | 95%         | 93%         | -2%     |


⸻

8. 📊 Maintain Test Results History File

Maintain a centralized test history log file named:

test_results_history.md

For each iteration, append a new record with:
   •  Timestamp
   •  Summary of test suites executed
   •  Total cases, passes, fails, and pass rate
   •  Key notes if any failures or regressions occurred

Example:

## Test Run – 2025-07-28 14:53:21

| Suite         | Total | Passed | Failed | Pass % |
|---------------|-------|--------|--------|--------|
| Backend       | 125   | 124    | 1      | 99.2%  |
| UI            | 60    | 56     | 4      | 93.3%  |

- ✅ API refactor tests passed
- ❌ UI issue on checkout button (regression from v1.4.3)

This file must be kept up-to-date after every test run and serves as the basis for tracking long-term quality trends.

⸻

9. Verify All Tests Pass

Run all relevant tests:
   •  ✅ If all backend and UI tests pass (including screenshot verification), continue.
   •  ❌ If anything fails, return to Step 4 to revise.

⸻

10. Commit Changes

Once verified:
   •  Commit all code, updated tests, screenshot logs, and the test history record.
   •  Use a clear and descriptive commit message.

⸻

11. Repeat

Return to Step 1 and continue improving.
Claude must treat this process as a continuous improvement cycle.

⸻

📘 PROJECT_OVERVIEW.md (Recommended)

Claude may refer to or maintain a PROJECT_OVERVIEW.md that includes:

Section  Content
Files Purpose of each code and test file
Functions   Responsibilities of key methods
Constants   Global values and where they are used
Tests Coverage mapping from features to test cases
Utilities   Reusable helpers, validators, etc.