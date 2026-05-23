# Refine

Task:

{{ .Task }}

Run directory: {{ .RunDir }}
Plan file: {{ .RunDir }}/PLAN.md
Build report: {{ .RunDir }}/BUILD.md
Review feedback: {{ .RunDir }}/REVIEW.md

Make one focused refinement pass.

Rules:
- Address only actionable, in-scope review feedback.
- If there is nothing actionable, make no changes.
- Do not broaden scope or rewrite unrelated code.

Write a refiner report to:

{{ .RunDir }}/REFINE.md
