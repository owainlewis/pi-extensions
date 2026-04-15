# Context-Isolated Workflow Extension

**The workflow that actually solves the real problem.**

## The Problem It Solves

### What You're Doing Now (Manual & Painful)

```
You: Write this feature
LLM: [writes code with implementation details in context]

You: Review it                    ← Manual prompt
LLM: [reviews but context is polluted - sees all implementation thinking]
     "Hmm, I just wrote this, looks good to me!" ← Biased

You: Fix these 5 issues          ← Manual prompt
LLM: [fixes]

You: Run the tests               ← Manual prompt
LLM: [tests fail]

You: Fix the failures            ← Manual prompt
...endless manual orchestration, polluted context, lost state
```

### What This Extension Does (Automated & Clean)

```
You: /workflow spec.md

LLM: [writes code]
     [auto-progresses to testing]
     [runs tests, deterministically validates]
     [COMPACTS CONTEXT - fresh slate]
     [reviews with clean eyes - no implementation bias]
     [finds real issues]
     [auto-progresses to fixing]
     [fixes issues]
     [re-tests automatically]
     [verifies]
     🎉 Done!

You: [just watched it happen] 🍿
```

## Key Innovations

### 1. **Context Compaction Before Review**

The game-changer:

```typescript
// After tests pass, BEFORE review:
ctx.compact({
  customInstructions: "Keep only: spec, file list, brief summary. 
                      Remove all implementation details."
});

// Now review happens with CLEAN context
// No bias from "I just wrote this"
// Fresh, objective review
```

**Why this matters:**
- Review doesn't see the messy implementation process
- Not biased by recent writing decisions
- Catches real issues that were invisible in polluted context
- Like having a fresh pair of eyes every time

### 2. **Deterministic Test Validation**

No more "did tests pass?" guessing:

```typescript
workflow_test_result({ exitCode: 0 })  // ✅ Deterministic
// Not: "I think tests passed" ❌ Unreliable
```

The extension **parses actual exit codes**:
- Exit code 0 = Tests passed → Move to review
- Exit code non-zero = Tests failed → Fix and retry
- No LLM interpretation needed

### 3. **Automated Iteration Management**

Manages the entire cycle automatically:

```
write → test → review → fix → test → verify → done
         ↓      ↓        ↓      ↓      ↓
    auto   auto    auto   auto   auto
```

No manual "now review" or "now test" prompts needed.

### 4. **State Persistence Across Long Tasks**

Over 10+ iterations:
- ✅ Remembers current stage
- ✅ Tracks test status
- ✅ Maintains review issues list
- ✅ Counts iterations
- ✅ Survives restarts

## Installation

```bash
./install.sh context-workflow
```

Or manually:
```bash
cp extensions/context-workflow/context-workflow.ts ~/.pi/agent/extensions/
```

Then in Pi:
```
/reload
```

## Usage

### Start with a spec file:

```bash
pi
/workflow spec-calculator.md
```

### Start with a description:

```bash
pi
/workflow "Create a REST API for user management with CRUD operations and comprehensive tests"
```

### Start with editor:

```bash
pi
/workflow
# Editor opens - write your spec, save, exit
```

## What Happens (The Magic)

### Stage 1: Write (Full Context)

```
📝 Writing implementation (1/10)

LLM has full context:
- Original spec
- All previous conversation
- Implementation details

Writes code + tests
Calls workflow_next
```

### Stage 2: Test (Deterministic)

```
🧪 Running tests (2/10)

LLM runs: pytest tests/
Extension parses exit code:
  Exit 0 → Tests passed ✅
  Exit 1 → Tests failed ❌

Calls workflow_test_result({ exitCode: 0 })
```

### Stage 3: Review (CLEAN Context) ⭐

```
🔍 Code review (clean context) (3/10)

CRITICAL: Context compacted first!
- Removes all implementation details
- Keeps only: spec, file list, summary

LLM reviews with fresh eyes:
✓ No implementation bias
✓ Objective assessment
✓ Catches real issues

Calls workflow_review_result({ issues: [...] })
```

### Stage 4: Fix (If Issues Found)

```
🔧 Fixing issues (4/10)

LLM sees:
- Review issues list
- Full context restored
- Files to fix

Fixes issues
Calls workflow_next
→ Back to Stage 2 (Test)
```

### Stage 5: Verify (Final Check)

```
✅ Final verification (5/10)

Tests passed ✅
Review passed ✅

Runs final test suite
Calls workflow_complete
```

## Commands

### User Commands

- `/workflow [spec]` - Start workflow
- `/workflow:status` - Check progress
- `/workflow:cancel` - Cancel workflow

### LLM Tools (Used Automatically)

- `workflow_next` - Progress to next stage
- `workflow_test_result` - Report test exit code
- `workflow_review_result` - Report review findings
- `workflow_complete` - Mark workflow complete

## Real Example

```bash
$ pi

> /workflow spec-calculator.md

🚀 Context-Isolated Workflow Started

[Shows spec]

Stage 1: 📝 Writing implementation

[LLM writes calculator.py and test_calculator.py]
[Calls workflow_next]

✅ Code written!

Stage 2: 🧪 Running tests

[LLM runs: pytest tests/]
[Output: exit code 1 - tests failed]
[Calls workflow_test_result({ exitCode: 1 })]

❌ Tests failed (exit code: 1)

[Auto-progresses to fix stage]

Stage 4: 🔧 Fixing issues

[LLM fixes the bug]
[Calls workflow_next]

🔧 Fixes applied!

Stage 2: 🧪 Re-testing

[LLM runs: pytest tests/]
[Output: exit code 0 - tests passed]
[Calls workflow_test_result({ exitCode: 0 })]

✅ Tests passed! (exit code: 0)

Stage 3: 🔍 Code review (clean context)

[Context compacted - clean slate]
[LLM reviews with fresh eyes]
[Finds: missing docstrings, no error handling for division by zero]
[Calls workflow_review_result({ 
  issues: [
    "Missing docstrings",
    "No error handling for division by zero"
  ]
})]

📋 Review found 2 issue(s):
1. Missing docstrings
2. No error handling for division by zero

Stage 4: 🔧 Fixing issues

[LLM adds docstrings and error handling]
[Calls workflow_next]

Stage 2: 🧪 Re-testing

[Tests pass]

Stage 3: 🔍 Code review (clean context)

[Context compacted again]
[LLM reviews]
[No issues found]
[Calls workflow_review_result({ issues: [] })]

✅ Review passed! No issues found.

Stage 5: ✅ Final verification

[Final test run]
[All pass]
[Calls workflow_complete]

🎉 Workflow Complete!

Total iterations: 7
Tests: ✅ All passing
Review issues resolved: ✅ Yes
```

## Features

### Automated
- ✅ Iteration management
- ✅ Stage progression
- ✅ Test execution
- ✅ Context compaction
- ✅ Issue tracking

### Deterministic
- ✅ Test validation (exit codes)
- ✅ Stage transitions
- ✅ Iteration limits

### Context Management
- ✅ Full context for writing
- ✅ Clean context for review
- ✅ Context restoration after review
- ✅ Long-task support

### Visibility
- ✅ Footer shows current stage
- ✅ Iteration counter
- ✅ Test status
- ✅ Review issues count
- ✅ Context state

## Why This Is Better

### vs. Plain Prompts

| Plain Prompts | Context Workflow |
|---------------|------------------|
| Manual "now review" | Automatic |
| Polluted review context | Clean review context |
| LLM might get lost | State tracked |
| No iteration management | Automated iteration |
| No test validation | Deterministic exit codes |

### vs. Simple Workflow Extension

| Simple Workflow | Context Workflow |
|-----------------|------------------|
| Same context throughout | Compacts before review |
| LLM interprets test results | Parses exit codes |
| No context hygiene | Explicit compaction |
| Review sees everything | Review sees only code |

### vs. Manual Review

| Manual | Context Workflow |
|--------|------------------|
| You manually orchestrate | Fully automated |
| You get tired | Never tires |
| You might miss steps | Never skips steps |
| Polluted context | Clean context |
| Time-consuming | Fast |

## Configuration

### Max Iterations

Default: 10

Edit the extension:
```typescript
maxIterations: 10,  // Change this
```

### Compaction Instructions

Customize what's kept during review:

```typescript
ctx.compact({
  customInstructions: "Keep only: spec and code files. Remove conversation."
});
```

## Tips for Best Results

### 1. Write Good Specs

```markdown
# Feature Name

## Requirements
- Specific requirement 1
- Specific requirement 2

## Tests Required
- Test scenario 1
- Edge cases

## Success Criteria
- All tests pass
- Code documented
```

### 2. Trust the Process

Let it run through the full cycle:
- Don't interrupt mid-review
- Let it iterate on failures
- Watch the footer for progress

### 3. Use Status Check

```
/workflow:status
```

Shows:
- Current stage
- Iteration count
- Test status
- Review issues
- Context state

### 4. For Long Features

The extension handles long tasks well:
- State persists across restarts
- Context compaction prevents bloat
- Iteration limits prevent infinite loops

## Troubleshooting

### "Review not finding issues"

Might not be compacting properly. Check:
```
/workflow:status
```

Should show: `Context: Compacted (clean)`

### "Tests not being validated"

The extension auto-detects test commands:
- pytest
- npm test
- cargo test
- go test
- mvn test

Or explicitly use `workflow_test_result`

### "Getting stuck in fix loop"

Check iteration count:
```
/workflow:status
```

Max iterations will auto-complete at limit.

### "Want to restart"

```
/workflow:cancel
/workflow spec.md
```

## Advanced: How Context Compaction Works

### Before Compaction (Polluted)

```
Turn 1: Write feature (context: spec + requirements + thinking)
Turn 2: Implement (context: spec + thinking + code + decisions)
Turn 3: More code (context: all above + more thinking)
Turn 4: Review (context: EVERYTHING - biased!)
         ↑ Sees all the implementation details
         ↑ "I just wrote this, looks good!"
```

### After Compaction (Clean)

```
Turn 1-3: Write feature (full context needed)
[COMPACT: Remove conversation, keep spec + file list]
Turn 4: Review (context: ONLY spec + files)
        ↑ FRESH - no implementation bias
        ↑ "Let me objectively review this code"
```

### What Gets Removed

- Implementation conversation
- Debugging thoughts
- Decision-making process
- All the "noise"

### What Gets Kept

- Original spec/description
- List of files created
- Brief implementation summary
- The actual code to review

## When to Use This

### ✅ Perfect For

- Features with clear specs
- TDD workflows
- Long implementation tasks
- When review quality matters
- Iterative development
- When context gets noisy

### ⚠️ Not Ideal For

- Quick one-off tasks
- When you want to guide each step
- Exploratory development
- When you need full context for review

## Comparison with Other Extensions

| Feature | Context Workflow | Auto Workflow | Manual Workflow |
|---------|------------------|---------------|-----------------|
| **Input** | Spec or prompt | Spec file | Prompt |
| **Automation** | Full | Full | Partial |
| **Context management** | ✅ Compacts | ❌ Same context | ❌ Same context |
| **Test validation** | ✅ Deterministic | ❌ LLM interprets | ❌ LLM interprets |
| **Review quality** | ✅ Clean context | ❌ Polluted | ❌ Polluted |
| **Long tasks** | ✅ Excellent | ⚠️ Ok | ⚠️ Gets lost |
| **Best for** | Production features | Quick features | Learning |

## The Bottom Line

This extension solves your **actual problem**:

1. ✅ No more manual "now review" prompts
2. ✅ Review happens with CLEAN, unbiased context
3. ✅ Deterministic test validation
4. ✅ Automated iteration until done
5. ✅ State persists across long tasks
6. ✅ You just watch it work

**This is the workflow you were really asking for.** 🎯

## License

MIT

## Author

Created for Pi coding agent - https://github.com/badlogic/pi-mono
