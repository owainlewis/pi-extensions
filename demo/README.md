# Context-Workflow Demo

Live demonstration of the context-isolated workflow extension.

## What We'll Build

A **FastAPI User Management API** with:
- CRUD operations (Create, Read, Update, Delete)
- Validation (username, email, password)
- Password hashing with bcrypt
- Comprehensive tests
- Proper error handling

All using **UV** (modern Python package manager) and **FastAPI**.

## Prerequisites

- Pi with context-workflow extension installed
- Python 3.10+
- UV installed (https://github.com/astral-sh/uv)

## Install UV

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Running the Demo

### Step 1: Start Pi

```bash
cd ~/Code/github/owainlewis/pi-extensions/demo
pi
```

### Step 2: Start the Workflow

```bash
/workflow ../examples/specs/user-api.md
```

### Step 3: Watch It Execute

Pi will automatically:

1. **Write implementation** (main.py, models.py, database.py, auth.py)
2. **Write tests** (test_api.py, test_models.py, test_auth.py)
3. **Run tests** - Deterministically validates using exit codes
4. **Fix failures** - If any tests fail
5. **Review code** - With CLEAN context (no implementation bias)
6. **Fix issues** - Based on review feedback
7. **Verify** - Final test run
8. **Complete** - Done!

Watch the footer for real-time progress:
```
Writing implementation (1/10)
Running tests (2/10)
Code review (clean context) (5/10)
Fixing issues (6/10)
Final verification (9/10)
Complete
```

### Step 4: Test the API

Once complete, you'll have a working API:

```bash
# Install dependencies
uv sync

# Run the server
uv run uvicorn main:app --reload
```

In another terminal:

```bash
# Create a user
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "password": "password123"}'

# Get the user (use the ID from response)
curl http://localhost:8000/api/users/{user_id}

# List users
curl http://localhost:8000/api/users

# Update user
curl -X PUT http://localhost:8000/api/users/{user_id} \
  -H "Content-Type: application/json" \
  -d '{"username": "alice_updated", "email": "alice.new@example.com"}'

# Delete user
curl -X DELETE http://localhost:8000/api/users/{user_id}
```

## What to Watch For

### 1. Automated Iteration

No manual prompting needed. Pi automatically progresses through stages.

### 2. Deterministic Test Validation

When tests run, Pi parses the exit code:
- Exit code 0 → Tests passed, proceed to review
- Exit code non-zero → Tests failed, go back to fix

No LLM interpretation, pure programmatic validation.

### 3. Context Compaction

**This is the magic moment!**

After tests pass, before review:
```
[Compacting context...]
```

Context is cleaned:
- Removes all implementation conversation
- Removes debugging thoughts
- Removes decision-making process
- Keeps only: spec, file list, brief summary, code files

Then review happens with **fresh, unbiased eyes**.

### 4. Quality of Review

Compare review findings before and after compaction:

**Without compaction (biased):**
- "Code looks good!"
- Might miss obvious issues
- Influenced by implementation thinking

**With compaction (unbiased):**
- "Missing docstring on hash_password function"
- "No validation for empty username after strip()"
- "Division by zero not tested"
- Catches real issues

## Expected Timeline

- Writing implementation: ~1-2 minutes
- Running tests (first time): ~30 seconds
- Fixing failures: ~1 minute
- Context compaction: ~10 seconds
- Review: ~1 minute
- Fixing review issues: ~1 minute
- Final verification: ~30 seconds

**Total: ~5-7 minutes for a complete, tested, reviewed API**

## What You'll Get

After the workflow completes:

```
user-api/
├── pyproject.toml           # UV project configuration
├── main.py                  # FastAPI app with all endpoints
├── models.py                # Pydantic models (UserCreate, UserUpdate, UserResponse)
├── database.py              # In-memory user database
├── auth.py                  # Password hashing with bcrypt
├── tests/
│   ├── test_api.py          # API endpoint tests (15-20 tests)
│   ├── test_models.py       # Model validation tests
│   └── test_auth.py         # Password hashing tests
└── README.md                # Complete usage instructions
```

All tested, reviewed, and working.

## Verification

After workflow completes:

```bash
# Run tests
uv run pytest

# Should see:
# ==================== test session starts ====================
# tests/test_api.py ................                    [80%]
# tests/test_models.py ...                              [15%]
# tests/test_auth.py ..                                 [5%]
# ==================== 21 passed ====================

# Start the server
uv run uvicorn main:app --reload

# Test it
curl http://localhost:8000/api/users
```

## Key Observations

### 1. Clean Review Catches Real Issues

Watch for review stage comments like:
- "Missing input validation for whitespace-only usernames"
- "No test for updating to duplicate email"
- "Error messages could be more specific"
- "Missing docstrings on database functions"

These are issues the LLM would likely miss with polluted context.

### 2. Deterministic Test Progression

When tests fail, you'll see:
```
Tests failed (exit code: 1)
Fixing issues (3/10)
```

No ambiguity. Either exit code 0 (pass) or non-zero (fail).

### 3. State Persistence

You can:
- Check `/workflow:status` anytime
- Quit Pi and resume
- See iteration count
- Track review issues

### 4. Automatic Fix Loops

If initial tests fail, watch it automatically:
- Detect failure
- Go back to fix stage
- Apply fixes
- Re-run tests
- Continue when passing

## Troubleshooting

### UV not installed?

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Workflow seems stuck?

Check status:
```bash
/workflow:status
```

Look at the footer - it shows current stage and iteration.

### Want to start over?

```bash
/workflow:cancel
/workflow ../examples/specs/user-api.md
```

## Success Indicators

Workflow is working correctly if you see:

1. Footer updating through stages
2. Context compaction message before review
3. Review finding actual issues (not just "looks good")
4. Tests being run with actual pytest commands
5. Deterministic pass/fail based on exit codes

## After the Demo

You'll have:
- A working FastAPI user management API
- Comprehensive test suite (all passing)
- Clean, reviewed code
- Complete documentation
- Ready to extend or deploy

Time investment: One command
Manual effort: Zero
Result: Production-ready API

## Next Steps After Demo

1. Extend the API (authentication, database, etc.)
2. Try with your own specs
3. Use for real projects
4. Share results with the community

---

**Ready to see it in action?**

```bash
cd ~/Code/github/owainlewis/pi-extensions/demo
pi
/workflow ../examples/specs/user-api.md
```

Then sit back and watch automated, context-isolated workflow in action.
