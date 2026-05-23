# Review

Task:

{{ .Task }}

Run directory: {{ .RunDir }}
Plan file: {{ .RunDir }}/PLAN.md
Build report: {{ .RunDir }}/BUILD.md

Review the current diff for task completeness, correctness, scope control, maintainability, and practical verification gaps.

Do not edit files.

Write actionable feedback to:

{{ .RunDir }}/REVIEW.md

If there is no actionable feedback, write that explicitly.
