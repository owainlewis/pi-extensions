# PBE Extension

Project-local Pi extension demonstrating a custom coding-agent harness.

The main demo flow is:

```text
GitHub Issue → Plan → Branch → Build → Default Evals → Review → Commit → Push → PR
```

## Files

```text
.pi/extensions/pbe/index.ts  # extension commands
.pi/pbe/planner.md           # issue-to-plan subagent prompt
.pi/pbe/builder.md           # Builder subagent prompt
.pi/pbe/evaluator.md         # Review/evaluator subagent prompt
```

## Commands

### `/pbe-issue <issue-number-or-url>`

Runs the end-to-end issue harness:

```text
1. Fetching issue
2. Writing plan
3. Creating branch
4. Writing code
5. Running default evaluations
6. Reviewing implementation
7. Committing changes
8. Pushing branch
9. Opening PR
```

Requirements:

- run inside a git repository
- clean working tree before starting
- `gh` installed and authenticated
- GitHub remote configured

The issue is treated as the approved task. The harness writes one local planning artifact:

```text
docs/issues/<issue-number>/plan.md
```

No approval gate is used. If evaluations pass, the harness commits, pushes, and opens a PR referencing the issue.

When `/pbe-issue` starts, it best-effort marks the issue as in progress by adding an existing `in progress` / `in-progress` label. Configure a custom existing label with `PBE_IN_PROGRESS_LABEL="Status: In Progress"`, or disable this with `PBE_MARK_IN_PROGRESS=false`.

### `/pbe-run <plan.md|task.md>`

Runs the local Builder → default evaluations → review loop without git branch/commit/PR automation.

## Run logs

Each `/pbe-issue` and `/pbe-run` appends diagnostic events to the current workspace log:

```text
.pi/pbe/pbe.log
```

The log includes a run ID, start event, step transitions, planner/builder/reviewer progress, default evaluation command results with output excerpts, failed-round summaries, PR creation, and top-level command errors. Logging is best-effort and never blocks the harness.

## Evaluations

V1 uses a simple default workflow:

```text
Default evaluations = commands from plan/task `## Verify` section
Review = always-run code review evaluator
```

A generated plan should include:

````md
## Verify

```bash
npm test -- login
npm run typecheck
```
````

The UI shows each command check and then a separate review step.

Future versions may add repo-level custom evaluations, but YAML is not required for the current flow.

## UI

During `/pbe-issue`, the extension shows a workflow checklist:

```text
PBE Issue Harness

Issue: #123 Add login validation
Branch: pbe/123-add-login-validation
Round: 1/3

✓ Fetching issue              1/9
✓ Writing plan                2/9
✓ Creating branch             3/9
▶ Writing code                4/9
○ Running default evaluations 5/9
○ Reviewing implementation    6/9
○ Committing changes          7/9
○ Pushing branch              8/9
○ Opening PR                  9/9
```

The extension installs an always-on PBE footer. When idle, it shows the workspace/branch and a `PBE ready` command hint. During a PBE run, that footer expands into workflow mode showing current step, round, issue, branch, latest detail, evaluation progress, and failed-round count. Full evaluation details also appear in a custom progress widget while default evaluations run, without Pi's simple 10-line widget cap. The footer and workflow widget use subtle ANSI colors: soft green for PBE/pass states, amber for running work, red for failures, cyan labels, and muted gray for pending/skipped metadata.

## Failure behavior

If evaluations fail, the Builder receives failed command results and review feedback. The harness retries up to 3 rounds. Each failed round is also summarized in the live UI and footer status so it is clear when a retry has happened.

If the task still fails:

- no commit is created
- no branch is pushed
- no PR is opened
- the failure report is shown in the conversation
