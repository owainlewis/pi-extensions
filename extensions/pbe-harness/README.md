# PBE Extension

PBE now has two layers:

```text
/pbe-issue <issue>          # GitHub issue convenience flow
/pbe-flow <flow.yml> <task> # generic YAML pipeline runner
```

## Generic flows

A flow is an ordered YAML list of `agent` and `command` steps:

```yaml
steps:
  - name: build
    type: agent
    prompt: flows/BUILD.md

  - name: test
    type: command
    run: bin/rails test

  - name: finalizer
    type: agent
    prompt: flows/FINALIZER.md
```

Run it with:

```text
/pbe-flow flows/build-flow.yml "Fix issue 21"
```

Runtime behavior:

- steps run in order
- agent steps pass when nested `pi` exits successfully
- command steps pass on exit code `0`
- any command failure or agent runtime error stops the flow
- progress is shown as a checklist
- basic artifacts are written to `.pi/pbe/runs/<run-id>/`

## Template variables

Prompts and command strings support:

```text
{{ .Task }}
{{ .RunID }}
{{ .RunDir }}
{{ .CWD }}
{{ .FlowPath }}
{{ .StepName }}
```

Issue flows also receive:

```text
{{ .IssueNumber }}
{{ .IssueTitle }}
{{ .IssueURL }}
{{ .Branch }}
```

## `/pbe-issue`

```text
/pbe-issue 21
/pbe-issue https://github.com/owner/repo/issues/21
```

This command:

1. requires a clean git worktree
2. fetches the GitHub issue with `gh`
3. creates a branch
4. runs the default issue flow

Flow resolution:

```text
.pi/pbe/issue-flow.yml                         # repo override
~/.pi/agent/extensions/pbe/flows/issue-flow.yml # bundled default
```

The bundled flow is intentionally simple:

```text
plan → check_plan → build → review → refine → finalizer
```

`check_plan` is a command step that fails fast if the planner did not write a non-empty `{{ .RunDir }}/PLAN.md` artifact.

The finalizer is an agent step that may commit, push, and open a PR using git/gh.

## Notes

- There are no loops in the generic flow runner.
- There is no semantic agent pass/fail gate in the flow runner.
- Users control artifacts from prompts, usually under `{{ .RunDir }}`.
- Large nested-agent prompts are passed as temporary `@file` references instead of argv.
- Nested agent steps show start/thinking/tool/text-preview progress and time out after 15 minutes by default. Override with `PBE_AGENT_TIMEOUT_SECONDS`.
- See [`SMOKE.md`](SMOKE.md) for a command-only smoke test and optional nested-agent check.
