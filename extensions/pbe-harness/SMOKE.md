# PBE Harness Smoke Tests

These checks validate the PBE extension without needing a real GitHub issue.

## 1. Load the extension

```bash
pi --no-session -e ~/.pi/agent/extensions/pbe/index.ts
```

Expected: Pi starts without extension errors and the footer shows PBE command hints.

## 2. Command-only flow, no model required

Run this in a disposable directory:

```bash
tmp=$(mktemp -d)
cd "$tmp"
git init

mkdir -p flows
cat > flows/smoke.yml <<'YAML'
steps:
  - name: make_plan
    type: command
    run: mkdir -p "{{ .RunDir }}" && echo "# Smoke plan" > "{{ .RunDir }}/PLAN.md"

  - name: check_plan
    type: command
    run: test -s "{{ .RunDir }}/PLAN.md" || { echo "Missing plan artifact" >&2; exit 1; }

  - name: final_check
    type: command
    run: grep -q "Smoke plan" "{{ .RunDir }}/PLAN.md"
YAML

pi -e ~/.pi/agent/extensions/pbe/index.ts
```

Then run inside Pi:

```text
/pbe-flow flows/smoke.yml "smoke test"
```

Expected:

- UI shows `make_plan → check_plan → final_check`.
- all steps pass.
- `.pi/pbe/runs/<run-id>/` contains `RUN.json` and command artifacts.

## 3. Failure path for `check_plan`

In the same disposable directory:

```bash
cat > flows/smoke-fail.yml <<'YAML'
steps:
  - name: check_plan
    type: command
    run: test -s "{{ .RunDir }}/PLAN.md" || { echo "Missing plan artifact" >&2; exit 1; }
YAML
```

Run inside Pi:

```text
/pbe-flow flows/smoke-fail.yml "smoke failure"
```

Expected:

- `check_plan` is marked failed in the UI.
- the flow stops.
- the error includes `Missing plan artifact`.

## 4. Optional nested-agent timeout/progress check

This uses the model, so keep the task tiny:

```bash
cat > flows/agent-smoke.yml <<'YAML'
steps:
  - name: tiny_agent
    type: agent
    prompt: prompts/TINY.md
YAML
mkdir -p flows/prompts
cat > flows/prompts/TINY.md <<'MD'
Say exactly: PBE agent smoke OK
MD

PBE_AGENT_TIMEOUT_SECONDS=30 pi -e ~/.pi/agent/extensions/pbe/index.ts
```

Run inside Pi:

```text
/pbe-flow flows/agent-smoke.yml "agent smoke"
```

Expected: while the nested agent runs, the UI shows start/thinking/text progress, then the step passes.
