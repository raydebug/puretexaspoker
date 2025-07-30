## CLAUDE.md – Continuous Improvement Workflow

Claude must follow this structured, iterative process in all interactions to ensure code quality, maintainability, and responsible automation.

---

### 🌀 CLAUDE Iteration Workflow

1. **Summarize the Target of This Interaction**
   At the start of each iteration, Claude must clearly state the goal of the current interaction.
   *Example*: “Refactor login timeout logic” or “Add retry to failed API calls”.

2. **Scan for Reuse Before Code/Test Changes**
   Before modifying or adding any code or test:

   * Review the project structure to avoid duplication.
   * Reuse existing **functions**, **constants**, **tests**, and **utilities** whenever possible.
   * Refer to or maintain a `PROJECT_OVERVIEW.md` that documents:

     * Code file purposes
     * Key methods/functions
     * Defined constants
     * Existing tests and what they verify
     * Shared utilities

3. **Identify the Issue or Plan the Next Design**
   Define the bug to fix or feature to implement.

4. **Implement or Fix Code**
   Proceed with logic changes only after ensuring reuse.

---

### ❗ Test Modification Policy

Claude must strictly follow this rule:

* **Do not change, remove, or bypass any existing tests without explicit permission.**
* All new logic must be covered with **new tests** or **explicit extensions**—never by weakening current tests.
* If a test appears obsolete or incorrect, **flag it for review** but **do not change it** yourself without permission.

---

5. **Update Tests as Needed (With Permission)**

   * For **backend/API** changes, update or add relevant **backend tests**.
   * For **UI/frontend** changes, update or add relevant **Selenium UI tests**.
   * Add new tests only when needed and approved.

6. **Run UI Tests with Screenshot Verification**

   * **Delete all previous screenshots** before the test run.
   * Take **new screenshots during the test run** as **visual evidence**.
   * Use screenshots to determine test success or failure.
   * Optionally archive screenshots for audit or documentation.

7. **Track Test Coverage and Result Changes**
   Compare test results before and after:

   ```
   | Test Suite     | Prev Count | Curr Count | ΔCases | Prev Pass % | Curr Pass % | ΔPass % |
   |----------------|------------|------------|--------|-------------|-------------|---------|
   | Backend Tests  | 120        | 125        | +5     | 98%         | 99%         | +1%     |
   | UI Tests       | 60         | 60         | 0      | 95%         | 93%         | -2%     |
   ```

8. **Verify All Tests Pass**
   Run all test suites.

   * ✅ If everything passes, proceed.
   * ❌ If anything fails, return to step 4 and fix it.

9. **Commit Changes**
   Once the test suite passes and screenshots are validated, commit with a clear, meaningful message.

10. **Repeat**
    Return to step 1 for the next improvement. This is a continuous loop.

---

### 📘 Project Overview

Claude may refer to or maintain a `PROJECT_OVERVIEW.md` that documents:

* **Source Files** – Purpose of each code and test file
* **Functions/Methods** – What each major block does
* **Test Cases** – Mapping between logic and coverage
* **Constants/Configs** – Centralized values and uses
* **Shared Utilities** – Reusable helpers and components
