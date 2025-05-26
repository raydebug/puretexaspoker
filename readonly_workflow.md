# **Workflow and Testing Guidelines**

---

- **Always use English for all code, comments, documentation, commit messages, and communication.**
- **Start by reviewing tasks.md, pick a task to work on, and prioritize fixing any existing test failures first.**
- **Fix existing testing failures with the highest priority before moving on to new implementations.**
- **For every test failure, create a corresponding task and list it at the top of tasks.md to ensure visibility and resolution.**
- **Identify and fix issues in existing e2e test scripts as an immediate priority.**
- **Continue writing comprehensive e2e tests to cover missing logic or scenarios.**
- **Run all e2e tests consistently and automatically — do not skip any.**
- **When an error is encountered, stop and fix the issue immediately before continuing with other tasks.**
- **Fix test failures by updating the frontend or backend code as necessary.**
- **Test failure messages must include clear, detailed information about the related logic to aid in fast debugging.**
- **Integrate with Cucumber to support writing test cases in natural language (Gherkin syntax) for improved clarity and collaboration.**
- **Only keep one set of define files — remove duplicates to maintain a clean and consistent codebase.**
- **Check the existing project structure before creating any new folders to avoid duplication and structural inconsistencies.**
- **Ensure all temporary or generated files are excluded from Git commits by updating the .gitignore file accordingly.**
- **After each fix or implementation, make a Git commit.**
- **Update both README.md and tasks.md to reflect the latest progress, changes, and coverage status.**
- **Keep tasks.md current to prevent repeated work and ensure smooth collaboration.**
- **Continue following these steps until all e2e tests pass and all tasks are completed.** 