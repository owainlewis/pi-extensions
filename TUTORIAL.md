# Pi Extensions Tutorial

Complete walkthrough: from installation to running your first context-isolated workflow.

## What You'll Learn

- How context-workflow solves real problems
- Installation and setup (2 minutes)
- Running your first automated workflow (5 minutes)
- Understanding how context isolation works
- Tips for best results

**Total time: 10 minutes**

---

## The Problem We're Solving

### What You're Doing Now

```
You: Write a REST API
LLM: [writes code with full context]

You: Review it                        (Manual prompt)
LLM: [reviews but sees everything]    (Biased review)
     "I just wrote this, looks good!"

You: Fix these 5 issues               (Manual prompt)
LLM: [fixes]

You: Run tests                        (Manual prompt)
LLM: [tests fail]

You: Fix the failures                 (Manual prompt)
...endless manual orchestration
```

### With Context-Workflow

```
You: /workflow spec.md

LLM: [writes code automatically]
     [runs tests automatically]
     [COMPACTS CONTEXT - removes bias]
     [reviews with fresh eyes]
     [finds real issues]
     [fixes them automatically]
     [verifies everything works]
     Done!
```

---

## Step 1: Install (2 minutes)

### Clone the repository

```bash
cd ~/Code
git clone https://github.com/owainlewis/pi-extensions.git
cd pi-extensions
```

### Run the installer

```bash
./install.sh
```

You'll see:
```
Pi Extensions Installer

✓ Pi coding agent found
✓ Extensions directory exists

Installing all extensions...

✓ Installed context-workflow
✓ Installed funny-status

Installed: 2 extension(s)
```

---

## Step 2: Load Extensions (1 minute)

Start Pi:

```bash
pi
```

Load the extensions:

```
/reload
```

Look for this in the startup message:
```
Loaded extensions: context-workflow, funny-status
```

---

## Step 3: Your First Workflow (5 minutes)

Let's create a simple calculator to see how it works.

### Start the workflow

```bash
/workflow "Create a Calculator class in Python with:
- add(a, b)
- subtract(a, b) 
- multiply(a, b)
- divide(a, b) with div-by-zero check
Include comprehensive tests"
```

### What happens automatically

**Stage 1: Write**
```
Writing implementation (1/10)

[LLM creates calculator.py]
class Calculator:
    def add(self, a, b):
        return a + b
    # ... etc

[LLM creates test_calculator.py]
def test_add():
    calc = Calculator()
    assert calc.add(2, 3) == 5
# ... etc

[Calls workflow_next automatically]
```

**Stage 2: Test**
```
Running tests (2/10)

[LLM runs: pytest tests/]
[Output: FAILED - forgot to import Calculator]
[Calls workflow_test_result({ exitCode: 1 })]
```

**Stage 4: Fix**
```
Fixing issues (3/10)

[LLM fixes the import]
[Calls workflow_next]
```

**Stage 2: Re-test**
```
Re-testing (4/10)

[LLM runs: pytest tests/]
[Output: All tests passed]
[Calls workflow_test_result({ exitCode: 0 })]
```

**Stage 3: Review (THE MAGIC HAPPENS HERE)**
```
Code review (clean context) (5/10)

[CONTEXT COMPACTION - removes all implementation details]

[LLM now sees ONLY:
 - Original spec
 - File list
 - Brief summary
 - The actual code]

[Reviews with fresh, unbiased eyes]
[Finds: missing docstrings, no div-by-zero test]
[Calls workflow_review_result({ issues: [...] })]
```

**Stage 4: Fix Issues**
```
Fixing issues (6/10)

[LLM adds docstrings and div-by-zero test]
[Calls workflow_next]
```

**Stage 2: Verify**
```
Re-testing (7/10)

[Tests pass with new additions]
```

**Stage 3: Final Review**
```
Code review (clean context) (8/10)

[Context compacted again]
[No issues found]
```

**Stage 5: Complete**
```
Final verification (9/10)

Workflow Complete!

Iterations: 9
Tests: All passing
Review: No issues
```

---

## Understanding Context Isolation

This is the **key innovation** that makes context-workflow special.

### Without Context Isolation

```
Turn 1: Write code
Context: spec + all implementation thinking

Turn 2: Review
Context: spec + implementation + decisions + debugging + everything
         POLLUTED - LLM sees "I just wrote this"
         BIASED - "Looks good to me!"
```

### With Context Isolation

```
Turn 1: Write code  
Context: spec + all implementation details (needed for writing)

[COMPACT - Remove implementation conversation]

Turn 2: Review
Context: ONLY spec + code files
         CLEAN - Fresh perspective
         UNBIASED - Objective review
```

### What Gets Removed During Compaction

- Implementation conversation
- Debugging thoughts
- Decision-making process
- "I just wrote this" context
- All the implementation noise

### What Gets Kept

- Original spec
- File list
- Brief summary
- The actual code to review

---

## Commands Reference

### Starting Workflows

```bash
# With description
/workflow "Create a todo API with CRUD ops"

# With spec file
/workflow spec-auth.md

# With editor
/workflow
[editor opens, write spec, save]
```

### During Workflow

```bash
# Check progress
/workflow:status

# Cancel if needed
/workflow:cancel
```

### What You'll See

Footer updates automatically:
```
Writing implementation (1/10)
Running tests (2/10)
Fixing issues (3/10)
Code review (clean context) (5/10)
Improving based on review (6/10)
Final verification (9/10)
Complete
```

---

## Example 2: REST API

Let's try something more complex.

```bash
/workflow "Create a REST API for user management:

Requirements:
- POST /users - Create user (username, email, password)
- GET /users/:id - Get user by ID
- GET /users - List all users
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user
- Hash passwords with bcrypt
- Validate email format
- Include comprehensive tests
- Error handling for all endpoints"
```

Watch it:
1. Write all endpoints
2. Test (might fail initially)
3. Fix failures
4. Review with clean context
5. Find issues (missing validation, weak tests)
6. Fix issues
7. Verify everything works
8. Complete

All automatic. You just watch.

---

## Tips for Best Results

### 1. Be Specific in Your Spec

**Good:**
```
Create a calculator with add/subtract/multiply/divide.
Include error handling for division by zero.
Write tests for positive numbers, negative numbers, and edge cases.
Add docstrings to all functions.
```

**Too Vague:**
```
Make a calculator.
```

### 2. Trust the Process

- Don't interrupt mid-workflow
- Let it iterate through failures
- Context compaction takes a moment (worth it)
- Watch the footer for progress

### 3. Use `/workflow:status` Anytime

```bash
/workflow:status
```

Shows:
```
Stage: Code review (clean context)
Iteration: 5/10
Tests: Passing
Issues found: 2
Context: Compacted (clean)
```

### 4. For Long Features

Context-workflow excels at long tasks:
- State persists across restarts
- Context compaction prevents bloat
- Iteration tracking prevents infinite loops
- You can quit Pi and resume later

---

## Troubleshooting

### "Not finding issues in review"

Check if context is being compacted:
```bash
/workflow:status
```

Should show: `Context: Compacted (clean)`

### "Tests not validating properly"

The extension auto-detects common test commands:
- pytest (Python)
- npm test (JavaScript)
- cargo test (Rust)
- go test (Go)

Or explicitly call `workflow_test_result({ exitCode })`

### "Stuck in a loop"

Check iteration count:
```bash
/workflow:status
```

Max 10 iterations. Will auto-complete at limit.

### "Want to start over"

```bash
/workflow:cancel
/workflow spec.md
```

---

## Real-World Example: E-commerce API

```bash
/workflow "Create an e-commerce product API:

Requirements:
- Product CRUD operations
- Category management
- Price validation (must be positive)
- Stock tracking
- Search by name/category
- Pagination support
- Input validation
- Error handling
- Comprehensive tests

Success Criteria:
- All tests pass
- All edge cases handled
- Proper error messages
- Well documented
```

This will:
1. Create product and category models
2. Implement all CRUD endpoints
3. Add validation
4. Write comprehensive tests
5. Test and fix any failures
6. Review with clean context (catches missing edge cases)
7. Add missing validations
8. Verify everything
9. Complete

Time: ~5-10 minutes
Your effort: One command
Result: Production-ready API with tests

---

## What Makes This Special

### vs. Plain Prompts

| Plain Prompts | Context-Workflow |
|---------------|------------------|
| Manual "now review" | Automatic |
| Polluted context | Clean context |
| Might skip steps | Never skips |
| You orchestrate | Pi orchestrates |
| Time-consuming | Fast |

---

## Next Steps

### 1. Try It Now

```bash
/workflow "Create a password validator that checks:
- Minimum 8 characters
- At least one uppercase
- At least one lowercase  
- At least one number
- At least one special character
Include tests for all requirements"
```

### 2. Use With Real Work

Apply to your actual projects:
- API endpoints
- Data processors
- CLI tools
- Utility libraries
- Anything with tests

### 3. Customize If Needed

Edit `~/.pi/agent/extensions/context-workflow.ts` to:
- Change max iterations
- Customize compaction instructions
- Add new stages
- Modify workflow logic

### 4. Share Your Results

If context-workflow helps you, star the repo and share with others.

---

## Funny Status Bonus

You also installed **funny-status**. 

Instead of boring "Working...", you'll see:
- "Consulting the void..."
- "Bribing the compiler..."
- "Teaching old code new tricks..."
- "Debugging the matrix..."

Zero configuration. Just enjoy the humor while Pi works.

---

## Congratulations

You now know:
- How context-workflow solves real problems
- How to install and use it
- How context isolation works
- Tips for best results
- Troubleshooting common issues

**Go build amazing things with automated, unbiased workflows.**

---

## Get Help

- **Documentation**: [Context-Workflow README](extensions/context-workflow/README.md)
- **Issues**: [GitHub Issues](https://github.com/owainlewis/pi-extensions/issues)
- **Discussions**: [GitHub Discussions](https://github.com/owainlewis/pi-extensions/discussions)
- **Pi Discord**: [Join](https://discord.com/invite/3cU7Bz4UPx)
