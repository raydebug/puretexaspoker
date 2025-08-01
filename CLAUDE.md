CLAUDE.md – Continuous Improvement Workflow

Claude must follow this structured, iterative workflow in all interactions to ensure clarity, reusability, traceability, and code quality.

This process supports test safety, screenshot-based verification, test tracking, and controlled improvement over time.

⸻

🌀 Iteration Workflow

1. Summarize the Target of This Interaction

At the beginning of each task or session, Claude must state the purpose clearly.
Examples:
   •  “Fix session timeout on login”
   •  “Add visual confirmation for payment success”
   •  “Refactor API retry mechanism”

⸻

2. Scan for Reuse Before Code/Test Changes

Before writing or editing code or tests:
   •  Review the entire project to avoid duplication.
   •  Reuse existing functions, constants, helpers, and tests.
   •  Refer to or maintain a PROJECT_OVERVIEW.md with:
   •  Purpose of each file
   •  Key functions and what they do
   •  Constant definitions
   •  Test coverage
   •  Shared utilities

⸻

3. Identify Issue or Plan Next Design

Clearly define the problem or enhancement to work on.

⸻

4. Implement or Fix Code

Modify or write new code only after confirming reuse is not possible.

⸻

❗ Test Modification Policy

Claude must strictly follow:
   •  Do not modify, remove, or bypass existing tests without explicit permission.
   •  Add new tests only for newly introduced or updated logic.
   •  If a test seems incorrect or outdated, flag it for review.

⸻

5. Update Tests as Needed (With Permission)
   •  For backend/API changes, update or add backend test cases.
   •  For UI/frontend changes, update or add Selenium UI test cases.
   •  All changes must align with the permission policy.

⸻

6. Run UI Tests with Screenshot Verification

✅ Screenshot Naming Convention and Enforcement:
   •  For each .feature file (e.g., login_flow.feature), there must be exactly one corresponding screenshot log file:

login_flow_screenshots.md


   •  No alternative filenames are allowed.

📸 Screenshot Log Requirements:

Before running the UI test:
   •  Delete all previous screenshots from the UI test directory.
   •  During the test, take step-by-step screenshots as visual evidence.

After running the test:
   •  Update the *_screenshots.md file to reflect the current test.

Each screenshot file must include:

# Screenshot Verification Log for `login_flow.feature`
**Test Run Time:** 2025-07-28 14:53:21

| Index | Screenshot File        | Verifying Items                            | Result   |
|-------|------------------------|---------------------------------------------|----------|
| 1     | login_step1.png        | Login form loaded                          | ✅ Pass  |
| 2     | login_step2.png        | Email entered, password hidden             | ✅ Pass  |
| 3     | login_step3.png        | Success message shown, redirect triggered  | ❌ Fail  |

🔒 File Maintenance Rules:
   •  Never remove previously passed entries from the screenshot log.
   •  Always update the Result column (✅ Pass or ❌ Fail) on each test run.
   •  Append the new test run time at the top for historical tracking.

⸻

7. Track Test Coverage and Result Changes

Compare current and previous test metrics:

| Test Suite     | Prev Count | Curr Count | ΔCases | Prev Pass % | Curr Pass % | ΔPass % |
|----------------|------------|------------|--------|-------------|-------------|---------|
| Backend Tests  | 120        | 125        | +5     | 98%         | 99%         | +1%     |
| UI Tests       | 60         | 60         | 0      | 95%         | 93%         | -2%     |

Summarize added or removed tests, and highlight any failure trends.

⸻

8. Verify All Tests Pass

Run all relevant test suites.
   •  ✅ If all tests and screenshots pass, continue.
   •  ❌ If any fail, go back to Step 4 and revise.

⸻

9. Commit Changes

Once all verification steps are complete:
   •  Commit changes with a clear and meaningful message.
   •  Include updated screenshot logs and test result summaries.

⸻

10. Repeat

Return to Step 1 and continue iterating. Claude should treat this as a never-ending improvement loop.

⸻

📘 PROJECT_OVERVIEW.md (Recommended)

Claude may refer to or maintain a PROJECT_OVERVIEW.md with:

Section  Content
Files Purpose of each source and test file
Functions   Descriptions of key methods
Constants   Global config or constant definitions
Tests Mapping of logic to test coverage
Utilities   Shared helpers, formatters, validators, etc.
