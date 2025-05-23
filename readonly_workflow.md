# **Workflow**

---

**Primary focus:** End-to-end (e2e) testing and stable core functionality

---

- **Prioritize implementation and testing of core functions with the highest priority.**
- **First, identify and fix any issues in the existing e2e test scripts.**
- **Continue writing comprehensive e2e tests where coverage is missing.**
- **Run all e2e tests consistently — do not skip any.**
- **When an error is encountered, stop and fix the issue immediately instead of continuing testing.**
- **For every test failure, create a corresponding task and list it at the top of tasks.md to ensure it's addressed promptly.**
- **Fix any test failures by updating the frontend or backend code as needed.**
- **Test failure messages should include detailed information about the related logic to assist with fast debugging.**
- **Integrate with Cucumber to support writing test cases in natural language (Gherkin syntax) for better readability and collaboration.**
- **Check the existing project structure before creating any new folders to avoid duplication or inconsistency.**
- **Only keep one set of define files — remove duplicates to maintain clarity and consistency.**
- **Ensure all temporary or generated files are excluded from Git commits by updating the .gitignore file accordingly.**
- **After each improvement or fix, make a Git commit.**
- **Update both README.md and tasks.md to reflect changes, progress, and coverage.**
- **Ensure tasks.md stays up to date to avoid duplicated work and missed implementations.**
- **Continue following these steps until all e2e tests pass.** 