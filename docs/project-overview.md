## PROJECT\_OVERVIEW\.md

> **Purpose**: This document describes the structure of the project, the role of each major file/module, key reusable functions, constants, and test cases.
> **Maintainers**: Only update this document with approval to ensure alignment with CLAUDE.md reuse policy.

---

### 📁 Source Files

| File/Module              | Purpose / Description                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `src/main.rb`            | Entry point for the application                                       |
| `src/auth/login.rb`      | Handles user login, session creation, and token management            |
| `src/api/user_api.rb`    | RESTful endpoints for user-related operations (create, update, fetch) |
| `src/utils/format.rb`    | Common formatting functions for dates, strings, currency              |
| `src/config/settings.rb` | Application-wide constants and environment-specific settings          |

---

### 🔁 Reusable Functions / Utilities

| Function / Method       | Location                   | Description / Usage                            |
| ----------------------- | -------------------------- | ---------------------------------------------- |
| `format_date(date)`     | `utils/format.rb`          | Converts a DateTime to user-friendly string    |
| `retry_with_delay(...)` | `utils/network_helpers.rb` | Retries an API call with exponential backoff   |
| `sanitize_input(str)`   | `utils/security.rb`        | Strips malicious inputs before database insert |

---

### 🧪 Test Scripts

| Test File                    | Description / Coverage                | Related Modules       |
| ---------------------------- | ------------------------------------- | --------------------- |
| `tests/auth/login_test.rb`   | Tests login success/failure scenarios | `auth/login.rb`       |
| `tests/api/user_api_test.rb` | Validates all user API endpoints      | `api/user_api.rb`     |
| `tests/ui/login_spec.rb`     | UI automation test for login form     | `frontend/login.html` |
| `tests/utils/format_test.rb` | Unit tests for formatting helpers     | `utils/format.rb`     |

---

### 🧷 Constants & Config

| Constant / Config Key | File                 | Description                            |
| --------------------- | -------------------- | -------------------------------------- |
| `MAX_LOGIN_ATTEMPTS`  | `config/settings.rb` | Lockout threshold for failed login     |
| `API_BASE_URL`        | `config/settings.rb` | Base URL for API endpoints             |
| `SCREENSHOT_DIR`      | `config/test_env.rb` | Directory where UI test screenshots go |

---

### 🧩 Shared UI Components

| Component / Template | Location                 | Description                  |
| -------------------- | ------------------------ | ---------------------------- |
| `LoginForm`          | `ui/components/login.js` | Login form used across pages |
| `UserCard`           | `ui/components/user.js`  | Displays user summary info   |

---

### 📌 Notes / To-Document

* [ ] Document `utils/json_diff.rb`
* [ ] Add reusable validations for email/password format
* [ ] Create template for standard error response in API
