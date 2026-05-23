# Pi Extensions

Experimental extensions for the [Pi coding agent](https://github.com/badlogic/pi-mono) that explore development workflow ideas.

> **Experimental / not production-ready:** These extensions are prototypes for personal workflow exploration. They may be incomplete, unstable, or unsafe for unattended use, and are not designed or supported for production environments.

## Demo

See it in action:

```bash
cd demo
pi
/workflow ../examples/specs/user-api.md
```

Watches Pi build a complete FastAPI user management API with tests, automatically iterating through write → test → review → fix cycles with clean, unbiased code reviews.

[View demo details →](demo/README.md)

---

## Extensions

### Context-Isolated Workflow

**The workflow that solves the real problem.**

Stop manually prompting "now review", "now test", "now fix" at every step. Stop getting biased reviews because the LLM sees all the implementation details. Let Pi handle the entire development cycle automatically with clean, unbiased code reviews.

```bash
/workflow spec.md
```

**What makes it special:**
- Context compaction before review - LLM reviews with fresh eyes, no implementation bias
- Deterministic test validation - Parses actual exit codes, no guessing
- Automated iteration cycle - write → test → review → fix → verify (all automatic)
- State persistence - Handles long tasks, survives restarts
- Flexible input - Spec file, prompt, or editor

**The problem it solves:**

```
BEFORE:
You: Write this feature
LLM: [writes code]
You: Now review it                    (Manual)
LLM: [reviews but context polluted]   (Biased - "I just wrote this!")
You: Fix these issues                 (Manual)
LLM: [fixes]
You: Run tests                        (Manual)
...endless manual orchestration

AFTER:
You: /workflow spec.md
LLM: [writes → tests → COMPACTS CONTEXT → reviews with clean eyes → 
      finds real issues → fixes → verifies → done!]
You: [just watched]
```

[Read full documentation →](extensions/context-workflow/README.md)

---

### Funny Status Messages

**Make waiting for Pi more entertaining.**

Replaces boring "Working..." with random hilarious messages like:
- "Consulting the void..."
- "Bribing the compiler..."
- "Teaching old code new tricks..."
- "Debugging the matrix..."
- ...and 27 more!

```bash
# Just install - works automatically
```

Zero configuration. Pure entertainment. 30 different messages.

[Read full documentation →](extensions/funny-status/README.md)

---

## Quick Install

### Install Everything

```bash
git clone https://github.com/owainlewis/pi-extensions.git
cd pi-extensions
./install.sh
```

### Install Specific Extension

```bash
./install.sh context-workflow
./install.sh funny-status
```

### Manual Installation

```bash
cp extensions/context-workflow/context-workflow.ts ~/.pi/agent/extensions/
cp extensions/funny-status/funny-status.ts ~/.pi/agent/extensions/
```

Then in Pi:
```
/reload
```

---

## Why Context-Workflow?

Most "workflow" extensions are just fancy prompts. **Context-workflow** actually solves real problems:

### 1. Clean Code Reviews

The key innovation:

```typescript
// After tests pass, BEFORE review:
ctx.compact({
  customInstructions: "Remove all implementation details. 
                      Keep only: spec, file list, summary."
});

// Now LLM reviews with FRESH context
// No bias from "I just wrote this"
// Catches real issues
```

### 2. Deterministic Validation

```typescript
// Not: "I think tests passed" (unreliable)
// Yes: Parse actual exit code (reliable)
workflow_test_result({ exitCode: 0 })  // Pass
workflow_test_result({ exitCode: 1 })  // Fail
```

### 3. Automated Iteration

No more manual prompting:

```
write → test → review → fix → test → verify
  ↓      ↓       ↓       ↓      ↓       ↓
auto   auto   auto    auto   auto    auto
```

### 4. State Management

Tracks everything across long tasks:
- Current stage
- Iteration count
- Test status
- Review issues list
- Context state (compacted or full)

---

## Real Example

```bash
$ pi

> /workflow "Create a calculator with add/subtract/multiply/divide. Include tests."

Context-Isolated Workflow Started

[Pi automatically:]

Stage 1: Writing implementation (1/10)
  - Creates calculator.py
  - Creates test_calculator.py
  → Calls workflow_next

Stage 2: Running tests (2/10)
  - Runs: pytest tests/
  - Exit code: 1 (tests failed)
  → Calls workflow_test_result({ exitCode: 1 })

Stage 4: Fixing issues (3/10)
  - Fixes the bug
  → Calls workflow_next

Stage 2: Re-testing (4/10)
  - Runs: pytest tests/
  - Exit code: 0 (tests passed)
  → Calls workflow_test_result({ exitCode: 0 })

[CONTEXT COMPACTION - Removes all implementation details]

Stage 3: Code review (clean context) (5/10)
  - Reviews with fresh eyes
  - Finds: missing docstrings, no div-by-zero check
  → Calls workflow_review_result({ issues: [...] })

Stage 4: Fixing issues (6/10)
  - Adds docstrings
  - Adds div-by-zero error handling
  → Calls workflow_next

Stage 2: Re-testing (7/10)
  - Tests still pass
  → workflow_test_result({ exitCode: 0 })

[CONTEXT COMPACTION AGAIN]

Stage 3: Code review (clean context) (8/10)
  - Reviews again
  - No issues found
  → workflow_review_result({ issues: [] })

Stage 5: Final verification (9/10)
  - Final test run
  - Everything works
  → workflow_complete

Workflow Complete!

Iterations: 9
Tests: All passing
Review: No issues

You: [just watched it happen]
```

---

## Documentation

- **[Context-Workflow README](extensions/context-workflow/README.md)** - Complete documentation
- **[Funny Status README](extensions/funny-status/README.md)** - Usage and customization
- **[TUTORIAL.md](TUTORIAL.md)** - Step-by-step walkthrough
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute

---

## Tutorial

See [TUTORIAL.md](TUTORIAL.md) for a complete walkthrough:
1. Installation (2 min)
2. First workflow run (5 min)
3. Understanding stages (5 min)
4. Tips for best results

---

## Usage Examples

### Example 1: REST API

```bash
/workflow "Create a REST API for user management with:
- CRUD operations (create, read, update, delete)
- Input validation
- Error handling
- Comprehensive tests"
```

### Example 2: With Spec File

Create `spec-auth.md`:
```markdown
# Authentication System

## Requirements
- Password hashing with bcrypt
- JWT token generation
- Login/logout endpoints
- Session management
- Rate limiting

## Tests
- Valid/invalid credentials
- Token validation
- Session expiry
- Rate limit enforcement
```

Then:
```bash
/workflow spec-auth.md
```

### Example 3: Using Editor

```bash
/workflow
# Editor opens - write your spec
# Save and exit
# Watch it execute
```

### Example 4: Demo Project

```bash
cd demo
/workflow ../examples/specs/user-api.md
```

Builds a complete FastAPI user management API with CRUD operations, validation, tests, and documentation.

---

## Commands Reference

### Context-Workflow

- `/workflow [spec]` - Start workflow
- `/workflow:status` - Check progress
- `/workflow:cancel` - Cancel workflow

### Status While Running

Watch the footer:
```
Writing implementation (1/10)
Running tests (2/10)
Code review (clean context) (5/10)
Improving based on review (6/10)
Final verification (9/10)
Complete
```

---

## FAQ

### Q: Is this just a fancy prompt?

**No!** It has:
- State management (tracks stage, iteration, issues)
- Context compaction (removes bias before review)
- Deterministic validation (parses exit codes)
- Automated progression (no manual steps)

### Q: How is review "unbiased"?

Before review, it **compacts the context** - removing all implementation details. The LLM only sees:
- Original spec
- List of files
- Brief summary
- The actual code to review

Not:
- Implementation conversation
- Debugging thoughts  
- Decision-making process
- "I just wrote this" bias

### Q: What if tests never pass?

Max 10 iterations. It will complete automatically and show you where it got stuck.

### Q: Can I customize the stages?

Yes! Edit `context-workflow.ts` to add stages, change logic, or customize behavior.

### Q: What test frameworks does it support?

Auto-detects:
- pytest (Python)
- npm test (JavaScript)
- cargo test (Rust)
- go test (Go)
- mvn test (Java)
- Any command that returns exit codes

---

## Why This Matters

### The Old Way (Manual)

```
You write prompt
→ LLM writes code
→ You: "now review"
→ LLM reviews (biased - sees everything)
→ You: "fix these issues"
→ LLM fixes
→ You: "run tests"
→ LLM tests
→ You: "fix failures"
→ ...endless back and forth
```

**Problems:**
- Manual orchestration
- Polluted context (biased reviews)
- Easy to skip steps
- Time-consuming
- LLM gets lost in long tasks

### The New Way (Context-Workflow)

```
You: /workflow spec.md
→ Pi does everything automatically
→ With clean reviews
→ Deterministic validation
→ State tracking
```

**Benefits:**
- Fully automated
- Clean, unbiased reviews
- Reliable progression
- Fast
- Handles long tasks

---

## Requirements

- Pi coding agent ([Installation guide](https://github.com/badlogic/pi-mono))
- Node.js (for Pi)

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Ideas for extensions:
- Git workflow automation
- Deployment pipelines
- Documentation generation
- Performance profiling

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Acknowledgments

- [Pi coding agent](https://github.com/badlogic/pi-mono) by @badlogic
- Built to solve real development workflow problems
- Community feedback welcome

---

## Support

- **Issues**: [GitHub Issues](https://github.com/owainlewis/pi-extensions/issues)
- **Discussions**: [GitHub Discussions](https://github.com/owainlewis/pi-extensions/discussions)
- **Pi Discord**: [Join](https://discord.com/invite/3cU7Bz4UPx)

---

**Made for developers tired of manual workflow orchestration**
