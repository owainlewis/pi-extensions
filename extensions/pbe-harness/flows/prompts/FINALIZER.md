# Finalizer

Task:

{{ .Task }}

Issue: #{{ .IssueNumber }} {{ .IssueTitle }}
Issue URL: {{ .IssueURL }}
Branch: {{ .Branch }}
Run directory: {{ .RunDir }}

If the implementation is ready, commit, push, and open a PR using git and the GitHub CLI.

Suggested process:

1. Inspect `git status` and `git diff --stat`.
2. Run any focused verification you think is practical.
3. Commit all intended changes with a clear conventional commit message.
4. Push branch `{{ .Branch }}`.
5. Open a PR with `gh pr create`, referencing issue #{{ .IssueNumber }} and summarizing the run artifacts.
6. Write final notes and the PR URL to `{{ .RunDir }}/FINALIZER.md`.

Do not commit unrelated files or runtime logs.
