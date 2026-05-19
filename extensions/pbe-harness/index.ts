import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";

type AgentName = "planner" | "builder" | "evaluator";
type Verdict = "PASS" | "FAIL" | "UNKNOWN";
type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

type WorkflowStepId =
	| "fetch_issue"
	| "write_plan"
	| "create_branch"
	| "write_code"
	| "default_evaluations"
	| "review"
	| "commit"
	| "push"
	| "open_pr";

interface RunAgentOptions {
	cwd: string;
	agent: AgentName;
	prompt: string;
	tools: string[];
	signal?: AbortSignal;
	onProgress?: (message: string) => void;
}

interface ProcessResult {
	command: string;
	args: string[];
	exitCode: number;
	stdout: string;
	stderr: string;
	durationMs: number;
	timedOut: boolean;
}

interface GitHubIssue {
	number: number;
	title: string;
	body: string;
	url: string;
	state?: string;
	labels?: Array<{ name?: string } | string>;
	comments?: Array<{ author?: { login?: string }; body?: string; createdAt?: string }>;
}

interface CommandCheck {
	id: string;
	type: "command";
	label: string;
	command: string;
	blocking: boolean;
	timeoutSeconds?: number;
}

interface CommandCheckResult {
	id: string;
	type: "command";
	label: string;
	command: string;
	blocking: boolean;
	status: "passed" | "failed" | "error";
	exitCode?: number;
	durationMs: number;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	summary: string;
}

interface ReviewResult {
	id: "code-review";
	type: "review";
	label: "Code review";
	blocking: true;
	status: "passed" | "failed";
	verdict: Verdict;
	report: string;
	summary: string;
}

interface BuildEvaluateResult {
	passed: boolean;
	round: number;
	builderReport: string;
	commandResults: CommandCheckResult[];
	reviewResult: ReviewResult;
	feedback: string;
}

interface WorkflowStep {
	id: WorkflowStepId;
	label: string;
	status: StepStatus;
	detail?: string;
}

interface PbeLogger {
	runId: string;
	log(message: string, details?: unknown): void;
}

const MAX_ROUNDS = 3;
const DEFAULT_CHECK_TIMEOUT_SECONDS = 120;
const EXTENSION_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOG_DETAIL_LIMIT = 6000;

const ANSI = {
	reset: "\u001b[0m",
	dim: "\u001b[2m",
	bold: "\u001b[1m",
	green: "\u001b[38;5;114m",
	softGreen: "\u001b[38;5;108m",
	amber: "\u001b[38;5;179m",
	red: "\u001b[38;5;167m",
	gray: "\u001b[38;5;245m",
	cyan: "\u001b[38;5;110m",
};

function color(text: string, code: string): string {
	return `${code}${text}${ANSI.reset}`;
}

function statusColor(status: StepStatus): string {
	if (status === "passed") return ANSI.green;
	if (status === "failed") return ANSI.red;
	if (status === "running") return ANSI.amber;
	return ANSI.gray;
}

function colorEvaluationLine(line: string): string {
	if (line.startsWith("✓")) return color(line, ANSI.green);
	if (line.startsWith("✗")) return color(line, ANSI.red);
	if (line.startsWith("▶")) return color(line, ANSI.amber);
	if (line.startsWith("○")) return color(line, ANSI.gray);
	return line;
}

function formatLogDetails(details: unknown): string {
	if (details === undefined) return "";
	const text = typeof details === "string" ? details : JSON.stringify(details, null, 2);
	const truncated = text.length > LOG_DETAIL_LIMIT ? `${text.slice(0, LOG_DETAIL_LIMIT)}…` : text;
	return `\n${truncated}`;
}

function createPbeLogger(cwd: string, kind: string, target: string): PbeLogger {
	const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
	const logDir = path.join(cwd, ".pi", "pbe");
	const logPath = path.join(logDir, "pbe.log");
	const logger: PbeLogger = {
		runId,
		log(message, details) {
			try {
				fs.mkdirSync(logDir, { recursive: true });
				fs.appendFileSync(
					logPath,
					`[${new Date().toISOString()}] [${runId}] ${message}${formatLogDetails(details)}\n`,
				);
			} catch {
				// Logging must never break the harness.
			}
		},
	};
	logger.log(`starting ${kind} run`, { cwd, target, logPath });
	return logger;
}

function workspaceFooterLine(ctx: any, footerData: any, branchFallback = ""): string {
	const home = process.env.HOME || process.env.USERPROFILE || "";
	let cwd = ctx.cwd as string;
	if (home && cwd.startsWith(home)) cwd = `~${cwd.slice(home.length)}`;
	const currentBranch = footerData?.getGitBranch?.() ?? branchFallback;
	return currentBranch ? `${cwd} (${currentBranch})` : cwd;
}

function setPbeReadyFooter(ctx: any): void {
	if (!ctx.hasUI) return;
	ctx.ui.setFooter((_tui: any, _theme: any, footerData: any) => ({
		render(width: number) {
			return [
				truncateToWidth(color(workspaceFooterLine(ctx, footerData), ANSI.dim), width),
				truncateToWidth(`${color("PBE ready", ANSI.softGreen)} ${color("•", ANSI.gray)} /pbe-issue <issue> ${color("•", ANSI.gray)} /pbe-run <plan.md> ${color("•", ANSI.gray)} /pbe-status`, width),
			];
		},
		invalidate() {},
	}));
}

function slugify(input: string): string {
	return (
		input
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 72) || "pbe"
	);
}

function truncate(input: string, max = 120): string {
	const compact = input.replace(/\s+/g, " ").trim();
	return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

function getPromptPath(cwd: string, agent: AgentName): string {
	const projectPrompt = path.join(cwd, ".pi", "pbe", `${agent}.md`);
	if (fs.existsSync(projectPrompt)) return projectPrompt;

	const bundledPrompt = path.join(EXTENSION_DIR, "prompts", `${agent}.md`);
	if (fs.existsSync(bundledPrompt)) return bundledPrompt;

	return projectPrompt;
}

function relativeForPrompt(cwd: string, filePath: string): string {
	const relative = path.relative(cwd, filePath);
	return relative.startsWith("..") ? filePath : relative;
}

function extractAssistantText(message: any): string {
	const parts = message?.content;
	if (!Array.isArray(parts)) return "";
	return parts
		.filter((part) => part?.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n");
}

function summarizeToolArgs(toolName: string, args: any): string {
	if (!args || typeof args !== "object") return "";
	if (toolName === "bash" && typeof args.command === "string") return truncate(args.command, 80);
	const rawPath = args.path ?? args.file_path;
	if (typeof rawPath === "string") return rawPath;
	return truncate(JSON.stringify(args), 80);
}

function parseVerdict(report: string): Verdict {
	const verdictSection = report.match(/##\s*Verdict\s*\n+\s*(PASS|FAIL)\b/i);
	if (verdictSection) return verdictSection[1].toUpperCase() as Verdict;

	const inlineVerdict = report.match(/\bVerdict\s*:\s*(PASS|FAIL)\b/i);
	if (inlineVerdict) return inlineVerdict[1].toUpperCase() as Verdict;

	return "UNKNOWN";
}

function formatIssueMarkdown(issue: GitHubIssue): string {
	const labels = (issue.labels ?? [])
		.map((label) => (typeof label === "string" ? label : label.name))
		.filter(Boolean)
		.join(", ");
	const comments = (issue.comments ?? [])
		.map((comment, index) => {
			const author = comment.author?.login ?? "unknown";
			return `### Comment ${index + 1} by ${author}\n\n${comment.body ?? ""}`;
		})
		.join("\n\n");

	return `# GitHub Issue #${issue.number}: ${issue.title}

- URL: ${issue.url}
- State: ${issue.state ?? "unknown"}
- Labels: ${labels || "none"}

## Body

${issue.body || "No body provided."}

${comments ? `## Comments\n\n${comments}` : ""}
`;
}

function stripMarkdownFence(markdown: string): string {
	const trimmed = markdown.trim();
	const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
	return fenced ? fenced[1].trim() : trimmed;
}

function extractSection(markdown: string, heading: string): string {
	const lines = markdown.split(/\r?\n/);
	const startRegex = new RegExp(`^##\\s+${heading}\\b`, "i");
	let start = -1;
	for (let i = 0; i < lines.length; i++) {
		if (startRegex.test(lines[i])) {
			start = i + 1;
			break;
		}
	}
	if (start === -1) return "";

	let end = lines.length;
	for (let i = start; i < lines.length; i++) {
		if (/^##\s+/.test(lines[i])) {
			end = i;
			break;
		}
	}
	return lines.slice(start, end).join("\n").trim();
}

function extractVerifyCommands(markdown: string): string[] {
	const verify = extractSection(markdown, "Verify");
	if (!verify) return [];

	const commands: string[] = [];
	const fenceRegex = /```(?:bash|sh|shell)?\s*\n([\s\S]*?)\n```/gi;
	let match: RegExpExecArray | null;
	while ((match = fenceRegex.exec(verify))) {
		for (const line of match[1].split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			commands.push(trimmed);
		}
	}

	if (commands.length > 0) return commands;

	for (const line of verify.split(/\r?\n/)) {
		const inlineCommand = line.match(/^\s*[-*]\s+`([^`]+)`\s*$/)?.[1];
		if (inlineCommand) commands.push(inlineCommand.trim());
	}
	return commands;
}

function commandToCheck(command: string, index: number): CommandCheck {
	return {
		id: `verify-${index + 1}`,
		type: "command",
		label: truncate(command, 72),
		command,
		blocking: true,
		timeoutSeconds: DEFAULT_CHECK_TIMEOUT_SECONDS,
	};
}

async function runProcess(
	command: string,
	args: string[],
	options: { cwd: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<ProcessResult> {
	const startedAt = Date.now();
	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, {
			cwd: options.cwd,
			stdio: ["ignore", "pipe", "pipe"],
			shell: false,
		});

		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let settled = false;

		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			if (timeout) clearTimeout(timeout);
			fn();
		};

		const timeout = options.timeoutMs
			? setTimeout(() => {
				timedOut = true;
				try {
					proc.kill("SIGTERM");
				} catch {
					// ignore
				}
			}, options.timeoutMs)
			: undefined;

		proc.stdout.on("data", (data) => {
			stdout += data.toString();
		});
		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});
		proc.on("error", (error) => finish(() => reject(error)));
		proc.on("close", (code) => {
			finish(() =>
				resolve({
					command,
					args,
					exitCode: code ?? (timedOut ? 124 : 1),
					stdout,
					stderr,
					durationMs: Date.now() - startedAt,
					timedOut,
				}),
			);
		});

		if (options.signal) {
			const abort = () => {
				try {
					proc.kill("SIGTERM");
				} catch {
					// ignore
				}
			};
			if (options.signal.aborted) abort();
			else options.signal.addEventListener("abort", abort, { once: true });
		}
	});
}

async function runRequiredProcess(command: string, args: string[], cwd: string, signal?: AbortSignal): Promise<ProcessResult> {
	const result = await runProcess(command, args, { cwd, signal });
	if (result.exitCode !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} failed with exit code ${result.exitCode}\n${result.stderr || result.stdout}`.trim(),
		);
	}
	return result;
}

async function runShellCheck(cwd: string, check: CommandCheck, signal?: AbortSignal): Promise<CommandCheckResult> {
	const result = await runProcess("bash", ["-lc", check.command], {
		cwd,
		signal,
		timeoutMs: (check.timeoutSeconds ?? DEFAULT_CHECK_TIMEOUT_SECONDS) * 1000,
	});
	const passed = result.exitCode === 0;
	return {
		id: check.id,
		type: "command",
		label: check.label,
		command: check.command,
		blocking: check.blocking,
		status: passed ? "passed" : "failed",
		exitCode: result.exitCode,
		durationMs: result.durationMs,
		stdout: result.stdout,
		stderr: result.stderr,
		timedOut: result.timedOut,
		summary: passed
			? `passed in ${result.durationMs}ms`
			: `failed with exit code ${result.exitCode}${result.timedOut ? " (timed out)" : ""}`,
	};
}

async function runPiAgent(options: RunAgentOptions): Promise<string> {
	const promptPath = getPromptPath(options.cwd, options.agent);
	if (!fs.existsSync(promptPath)) throw new Error(`Missing PBE ${options.agent} prompt: ${promptPath}`);

	const args = [
		"--mode",
		"json",
		"-p",
		"--no-session",
		"--append-system-prompt",
		promptPath,
		"--tools",
		options.tools.join(","),
		options.prompt,
	];

	return new Promise((resolve, reject) => {
		const proc = spawn("pi", args, {
			cwd: options.cwd,
			stdio: ["ignore", "pipe", "pipe"],
			shell: false,
		});

		let stdoutBuffer = "";
		let stderr = "";
		let lastAssistantText = "";
		let textPreview = "";
		let lastPreviewAt = 0;
		let settled = false;

		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			fn();
		};

		const processLine = (line: string) => {
			if (!line.trim()) return;
			let event: any;
			try {
				event = JSON.parse(line);
			} catch {
				return;
			}

			if (event.type === "agent_start") options.onProgress?.(`${options.agent} started`);
			if (event.type === "turn_start") options.onProgress?.(`${options.agent} thinking`);

			if (event.type === "tool_execution_start") {
				const toolArgs = summarizeToolArgs(event.toolName, event.args);
				options.onProgress?.(`${options.agent} tool: ${event.toolName}${toolArgs ? ` — ${toolArgs}` : ""}`);
			}

			if (event.type === "tool_execution_end") {
				options.onProgress?.(`${options.agent} tool done: ${event.toolName}${event.isError ? " (error)" : ""}`);
			}

			if (event.type === "message_update" && event.assistantMessageEvent?.type === "text_delta") {
				textPreview += event.assistantMessageEvent.delta;
				const now = Date.now();
				if (now - lastPreviewAt > 1200) {
					lastPreviewAt = now;
					if (textPreview.trim()) options.onProgress?.(`${options.agent}: ${truncate(textPreview.slice(-200), 120)}`);
				}
			}

			if (event.type === "message_end" && event.message?.role === "assistant") {
				const text = extractAssistantText(event.message).trim();
				if (text) lastAssistantText = text;
			}
		};

		proc.stdout.on("data", (data) => {
			stdoutBuffer += data.toString();
			const lines = stdoutBuffer.split("\n");
			stdoutBuffer = lines.pop() ?? "";
			for (const line of lines) processLine(line);
		});

		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("error", (error) => finish(() => reject(error)));
		proc.on("close", (code) => {
			if (stdoutBuffer.trim()) processLine(stdoutBuffer);
			if (code !== 0) {
				finish(() => reject(new Error(`PBE ${options.agent} exited with code ${code}:\n${stderr}`)));
				return;
			}
			if (!lastAssistantText) {
				finish(() => reject(new Error(`PBE ${options.agent} produced no assistant output. stderr:\n${stderr}`)));
				return;
			}
			finish(() => resolve(lastAssistantText));
		});

		if (options.signal) {
			const abort = () => {
				try {
					proc.kill("SIGTERM");
				} catch {
					// ignore
				}
			};
			if (options.signal.aborted) abort();
			else options.signal.addEventListener("abort", abort, { once: true });
		}
	});
}

function createIssueWorkflowUi(ctx: any, initialTitle: string, logger?: PbeLogger) {
	const steps: WorkflowStep[] = [
		{ id: "fetch_issue", label: "Fetching issue", status: "pending" },
		{ id: "write_plan", label: "Writing plan", status: "pending" },
		{ id: "create_branch", label: "Creating branch", status: "pending" },
		{ id: "write_code", label: "Writing code", status: "pending" },
		{ id: "default_evaluations", label: "Running default evaluations", status: "pending" },
		{ id: "review", label: "Reviewing implementation", status: "pending" },
		{ id: "commit", label: "Committing changes", status: "pending" },
		{ id: "push", label: "Pushing branch", status: "pending" },
		{ id: "open_pr", label: "Opening PR", status: "pending" },
	];

	let title = initialTitle;
	let branch = "";
	let round = 1;
	let maxRounds = MAX_ROUNDS;
	let activeStep: WorkflowStepId = "fetch_issue";
	let detail = "starting";
	let evaluationLines: string[] = [];
	let roundFailures: string[] = [];
	let footerInstalled = false;

	const symbol = (status: StepStatus) => {
		if (status === "passed") return color("✓", ANSI.green);
		if (status === "failed") return color("✗", ANSI.red);
		if (status === "running") return color("▶", ANSI.amber);
		if (status === "skipped") return color("-", ANSI.gray);
		return color("○", ANSI.gray);
	};

	const installFooter = () => {
		if (footerInstalled || !ctx.hasUI) return;
		ctx.ui.setFooter((_tui: any, _theme: any, footerData: any) => ({
			render(width: number) {
				const activeIndex = steps.findIndex((step) => step.id === activeStep);
				const active = steps[activeIndex] ?? steps[0];
				const failedRounds = roundFailures.length ? ` • failed rounds: ${roundFailures.length}` : "";
				const activeDetail = detail ? ` • ${truncate(detail, 90)}` : "";
				const evalLine = evaluationLines.length ? `Eval: ${truncate(evaluationLines[evaluationLines.length - 1], 120)}` : "";
				const footerLines = [
					color(workspaceFooterLine(ctx, footerData, branch), ANSI.dim),
					`${color("PBE", ANSI.softGreen)} ${color(`${activeIndex + 1}/${steps.length}`, statusColor(active.status))}: ${color(active.label, statusColor(active.status))} ${color("•", ANSI.gray)} round ${round}/${maxRounds}${failedRounds}${activeDetail}`,
					`${color("Issue:", ANSI.cyan)} ${title}${branch ? ` ${color("•", ANSI.gray)} ${color("Branch:", ANSI.cyan)} ${branch}` : ""}${evalLine ? ` ${color("•", ANSI.gray)} ${colorEvaluationLine(evalLine)}` : ""}`,
				];
				return footerLines.map((line) => truncateToWidth(line, width));
			},
			invalidate() {},
		}));
		footerInstalled = true;
	};

	const render = () => {
		installFooter();
		const activeIndex = steps.findIndex((step) => step.id === activeStep);
		const active = steps[activeIndex] ?? steps[0];
		const failedRounds = roundFailures.length ? ` • failed rounds: ${roundFailures.length}` : "";
		const compactDetail = detail ? ` • ${truncate(detail, 70)}` : "";
		ctx.ui.setStatus(
			"pbe",
			`PBE ${activeIndex + 1}/${steps.length} ${active.label} • round ${round}/${maxRounds}${failedRounds}${compactDetail}`,
		);

		const lines = [
			color("PBE Issue Harness", ANSI.softGreen + ANSI.bold),
			`${color("Issue:", ANSI.cyan)} ${title}`,
			branch ? `${color("Branch:", ANSI.cyan)} ${branch}` : `${color("Branch:", ANSI.cyan)} ${color("pending", ANSI.gray)}`,
			`${color("Round:", ANSI.cyan)} ${round}/${maxRounds}${failedRounds ? color(failedRounds, ANSI.red) : ""}`,
			"",
			...steps.map((step, index) => {
				const suffix = step.detail ? color(` — ${step.detail}`, step.status === "failed" ? ANSI.red : ANSI.dim) : "";
				return `${symbol(step.status)} ${color(step.label.padEnd(28), statusColor(step.status))} ${color(`${index + 1}/${steps.length}`, ANSI.gray)}${suffix}`;
			}),
		];

		if (roundFailures.length > 0) {
			lines.push("", color("Failed rounds:", ANSI.red), ...roundFailures.map((line) => `  ${color(line, ANSI.red)}`));
		}
		if (evaluationLines.length > 0) {
			lines.push("", color("Evaluations:", ANSI.cyan), ...evaluationLines.map((line) => `  ${colorEvaluationLine(line)}`));
		}
		if (detail) lines.push("", `${color("Detail:", ANSI.cyan)} ${color(detail, ANSI.dim)}`);

		ctx.ui.setWidget("pbe-issue-progress", (_tui: any, _theme: any) => ({
			render(width: number) {
				const rendered: string[] = [];
				for (const line of lines) {
					const wrapped = wrapTextWithAnsi(line, Math.max(20, width - 2));
					for (const wrappedLine of wrapped) {
						rendered.push(truncateToWidth(` ${wrappedLine}`, width));
					}
				}
				return rendered;
			},
			invalidate() {},
		}), { placement: "aboveEditor" });
	};

	const setStep = (id: WorkflowStepId, status: StepStatus, stepDetail?: string) => {
		logger?.log(`step ${id} ${status}`, stepDetail);
		activeStep = id;
		for (const step of steps) {
			if (step.id === id) {
				step.status = status;
				step.detail = stepDetail;
			}
		}
		detail = stepDetail ?? detail;
		render();
	};

	return {
		setTitle(nextTitle: string) {
			title = nextTitle;
			render();
		},
		setBranch(nextBranch: string) {
			branch = nextBranch;
			render();
		},
		setRound(nextRound: number) {
			round = nextRound;
			render();
		},
		setStep,
		detail(message: string) {
			logger?.log("detail", message);
			detail = truncate(message, 160);
			render();
		},
		setEvaluations(lines: string[]) {
			logger?.log("evaluation display update", lines);
			evaluationLines = lines;
			render();
		},
		addRoundFailure(failedRound: number, summary: string) {
			logger?.log(`round ${failedRound} failed`, summary);
			roundFailures.push(`Round ${failedRound}: ${truncate(summary, 180)}`);
			render();
		},
		failActive(message: string) {
			logger?.log("active step failed", message);
			setStep(activeStep, "failed", truncate(message, 80));
		},
		clear() {
			ctx.ui.setStatus("pbe", undefined);
			ctx.ui.setWidget("pbe-issue-progress", undefined);
			setPbeReadyFooter(ctx);
			footerInstalled = false;
		},
	};
}

async function fetchGitHubIssue(cwd: string, issueRef: string, signal?: AbortSignal): Promise<GitHubIssue> {
	const result = await runRequiredProcess(
		"gh",
		["issue", "view", issueRef, "--json", "number,title,body,url,state,labels,comments"],
		cwd,
		signal,
	);
	return JSON.parse(result.stdout) as GitHubIssue;
}

function issueLabelNames(issue: GitHubIssue): string[] {
	return (issue.labels ?? [])
		.map((label) => (typeof label === "string" ? label : label.name ?? ""))
		.filter(Boolean);
}

function shouldMarkIssueInProgress(): boolean {
	const value = (process.env.PBE_MARK_IN_PROGRESS ?? "true").trim().toLowerCase();
	return !["0", "false", "no", "off"].includes(value);
}

async function findInProgressLabel(cwd: string, issue: GitHubIssue, signal?: AbortSignal): Promise<string | undefined> {
	const configured = process.env.PBE_IN_PROGRESS_LABEL?.trim();
	if (configured) return configured;

	const candidates = ["in progress", "in-progress", "In Progress", "status: in progress", "Status: In Progress"];
	const currentLabels = issueLabelNames(issue);
	const current = candidates.find((candidate) =>
		currentLabels.some((label) => label.toLowerCase() === candidate.toLowerCase()),
	);
	if (current) return current;

	const labelList = await runProcess("gh", ["label", "list", "--limit", "200", "--json", "name"], { cwd, signal });
	if (labelList.exitCode !== 0) return undefined;

	try {
		const labels = JSON.parse(labelList.stdout) as Array<{ name?: string }>;
		const byLowerName = new Map(
			labels
				.map((label) => label.name)
				.filter((name): name is string => Boolean(name))
				.map((name) => [name.toLowerCase(), name]),
		);
		for (const candidate of candidates) {
			const label = byLowerName.get(candidate.toLowerCase());
			if (label) return label;
		}
	} catch {
		// Ignore malformed gh output; marking in-progress is best-effort.
	}

	return undefined;
}

async function markIssueInProgress(cwd: string, issue: GitHubIssue, signal?: AbortSignal): Promise<string> {
	if (!shouldMarkIssueInProgress()) return "in-progress marking disabled";

	const label = await findInProgressLabel(cwd, issue, signal);
	if (!label) return "no in-progress label found";

	const result = await runProcess("gh", ["issue", "edit", String(issue.number), "--add-label", label], { cwd, signal });
	if (result.exitCode === 0) return `marked in progress (${label})`;

	const details = (result.stderr || result.stdout).trim();
	return `could not mark in progress${details ? `: ${truncate(details, 120)}` : ""}`;
}

async function ensureGitReady(cwd: string, signal?: AbortSignal): Promise<void> {
	await runRequiredProcess("git", ["rev-parse", "--is-inside-work-tree"], cwd, signal);
	const status = await runRequiredProcess("git", ["status", "--porcelain"], cwd, signal);
	if (status.stdout.trim()) {
		throw new Error("Working tree is not clean. Commit, stash, or discard existing changes before running /pbe-issue.");
	}
	await runRequiredProcess("gh", ["auth", "status"], cwd, signal);
}

async function branchExists(cwd: string, branch: string, signal?: AbortSignal): Promise<boolean> {
	const result = await runProcess("git", ["rev-parse", "--verify", branch], { cwd, signal });
	return result.exitCode === 0;
}

async function createIssueBranch(cwd: string, issue: GitHubIssue, signal?: AbortSignal): Promise<string> {
	const base = `pbe/${issue.number}-${slugify(issue.title).slice(0, 48)}`;
	let branch = base;
	if (await branchExists(cwd, branch, signal)) {
		const suffix = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
		branch = `${base}-${suffix}`;
	}
	await runRequiredProcess("git", ["checkout", "-b", branch], cwd, signal);
	return branch;
}

async function generateIssuePlan(
	cwd: string,
	issue: GitHubIssue,
	onProgress?: (message: string) => void,
	signal?: AbortSignal,
): Promise<string> {
	const issueMarkdown = formatIssueMarkdown(issue);
	const prompt = `
Create a concise implementation plan for this GitHub issue.

The plan is an execution contract for an autonomous local coding harness. The harness will proceed directly from this plan into coding, so be specific enough for implementation and evaluation, but do not over-specify internals that should be discovered from the repo.

The plan MUST include these sections:

# Plan for Issue #${issue.number}: ${issue.title}

## Source Issue
## Summary
## Goal
## Acceptance Criteria
## Implementation Plan
## Verify
## Evaluation Notes
## Out of Scope

In ## Verify, include a bash code block with practical commands to validate the task. Prefer focused tests first, then lint/typecheck/build commands if the repo supports them. If the repo has no clear test tooling, include the strongest practical checks or explain why verification is limited.

If the issue is too ambiguous or unsafe to implement, include:

## Status
Blocked

and explain the blockers. Otherwise do not include a Status section.

GitHub issue:

${issueMarkdown}

Return only the markdown plan. Do not edit files.
`;

	const plan = await runPiAgent({
		cwd,
		agent: "planner",
		tools: ["read", "bash"],
		prompt,
		signal,
		onProgress,
	});
	return stripMarkdownFence(plan);
}

function planIsBlocked(plan: string): boolean {
	return /##\s*Status\s*\n+\s*Blocked\b/i.test(plan);
}

async function writeIssuePlan(cwd: string, issue: GitHubIssue, plan: string): Promise<string> {
	const dir = path.join(cwd, "docs", "issues", String(issue.number));
	await mkdir(dir, { recursive: true });
	const planPath = path.join(dir, "plan.md");
	await writeFile(planPath, `${plan.trim()}\n`);
	return planPath;
}

async function runBuilderRound(
	cwd: string,
	issue: GitHubIssue | undefined,
	planPath: string,
	planMarkdown: string,
	previousFeedback: string,
	onProgress?: (message: string) => void,
	signal?: AbortSignal,
): Promise<string> {
	const issueContext = issue ? formatIssueMarkdown(issue) : "No GitHub issue context was provided.";
	const prompt = `
You are the Builder in a custom issue-to-PR coding harness.

Implement exactly the approved plan. Do not open a PR, commit, or push. The harness will handle those steps after evaluation passes.

Plan file: ${relativeForPrompt(cwd, planPath)}

GitHub issue context:

${issueContext}

Plan:

${planMarkdown}

${previousFeedback ? `Feedback from the previous failed evaluation round:\n\n${previousFeedback}\n\nFix only the blocking failed checks and review feedback.` : "No previous feedback."}

Implement the plan now. Then return the Builder Report in the required format.
`;

	return runPiAgent({
		cwd,
		agent: "builder",
		tools: ["read", "bash", "edit", "write"],
		prompt,
		signal,
		onProgress,
	});
}

function formatCommandResultsForPrompt(results: CommandCheckResult[]): string {
	if (results.length === 0) return "No default command evaluations were configured.";
	return results
		.map((result) => {
			const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
			return `## ${result.label}\n\n- id: ${result.id}\n- command: \`${result.command}\`\n- status: ${result.status}\n- exitCode: ${result.exitCode}\n- summary: ${result.summary}\n\n${output ? `Output excerpt:\n\`\`\`\n${output.slice(0, 2000)}\n\`\`\`` : "No output."}`;
		})
		.join("\n\n");
}

async function runReview(
	cwd: string,
	issue: GitHubIssue | undefined,
	planPath: string,
	planMarkdown: string,
	builderReport: string,
	commandResults: CommandCheckResult[],
	previousFeedback: string,
	onProgress?: (message: string) => void,
	signal?: AbortSignal,
): Promise<ReviewResult> {
	const issueContext = issue ? formatIssueMarkdown(issue) : "No GitHub issue context was provided.";
	const prompt = `
You are the Review step in a custom issue-to-PR coding harness.

The harness has already run the default command evaluations below. Do not rerun them unless absolutely necessary. Your job is the qualitative implementation review: task completeness, correctness, edge cases, scope control, code quality, test quality, and PR readiness.

GitHub issue context:

${issueContext}

Plan file: ${relativeForPrompt(cwd, planPath)}

Plan:

${planMarkdown}

Builder report:

${builderReport}

Default evaluation results:

${formatCommandResultsForPrompt(commandResults)}

Previous failed feedback, if any:

${previousFeedback || "None."}

Inspect the current repository state and current diff if available. Return the Evaluator Report in the required format, with PASS only if the implementation is ready for PR.
`;

	const report = await runPiAgent({
		cwd,
		agent: "evaluator",
		tools: ["read", "bash"],
		prompt,
		signal,
		onProgress,
	});
	const verdict = parseVerdict(report);
	return {
		id: "code-review",
		type: "review",
		label: "Code review",
		blocking: true,
		status: verdict === "PASS" ? "passed" : "failed",
		verdict,
		report,
		summary: verdict === "PASS" ? "Code review passed" : `Code review returned ${verdict}`,
	};
}

function summarizeRoundFailure(commandFailures: CommandCheckResult[], reviewResult: ReviewResult): string {
	const parts: string[] = [];
	if (commandFailures.length > 0) {
		parts.push(`${commandFailures.length} default eval(s) failed`);
		parts.push(...commandFailures.slice(0, 2).map((result) => result.label));
	}
	if (reviewResult.status !== "passed") {
		parts.push(`review ${reviewResult.verdict}`);
	}
	return parts.join("; ") || "unknown failure";
}

function formatEvaluationFeedback(commandResults: CommandCheckResult[], reviewResult: ReviewResult): string {
	const failedCommands = commandResults.filter((result) => result.blocking && result.status !== "passed");
	const parts: string[] = ["# Evaluation Failed"];

	if (failedCommands.length > 0) {
		parts.push("\n## Failed Default Evaluations");
		for (const result of failedCommands) {
			const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
			parts.push(
				`\n- ${result.label}\n  - command: \`${result.command}\`\n  - status: ${result.status}\n  - exitCode: ${result.exitCode}\n  - summary: ${result.summary}${output ? `\n  - output excerpt:\n\n\`\`\`\n${output.slice(0, 1200)}\n\`\`\`` : ""}`,
			);
		}
	}

	if (reviewResult.status !== "passed") {
		parts.push("\n## Review Feedback\n", reviewResult.report);
	}

	parts.push("\n## Builder Instructions\nFix only the blocking failed evaluations and review feedback. Do not expand scope.");
	return parts.join("\n");
}

async function runBuildEvaluateLoop(options: {
	cwd: string;
	issue?: GitHubIssue;
	planPath: string;
	planMarkdown: string;
	signal?: AbortSignal;
	ui?: ReturnType<typeof createIssueWorkflowUi>;
	logger?: PbeLogger;
}): Promise<BuildEvaluateResult> {
	let feedback = "";
	let lastBuilderReport = "";
	let lastCommandResults: CommandCheckResult[] = [];
	let lastReviewResult: ReviewResult = {
		id: "code-review",
		type: "review",
		label: "Code review",
		blocking: true,
		status: "failed",
		verdict: "UNKNOWN",
		report: "Review did not run.",
		summary: "Review did not run.",
	};

	const verifyCommands = extractVerifyCommands(options.planMarkdown);
	const checks = verifyCommands.map(commandToCheck);
	options.logger?.log("verify commands extracted", verifyCommands);

	for (let round = 1; round <= MAX_ROUNDS; round++) {
		options.logger?.log(`round ${round} started`);
		options.ui?.setRound(round);
		options.ui?.setStep("write_code", "running", round > 1 ? "fixing evaluation feedback" : "builder running");
		lastBuilderReport = await runBuilderRound(
			options.cwd,
			options.issue,
			options.planPath,
			options.planMarkdown,
			feedback,
			(message) => options.ui?.detail(message),
			options.signal,
		);
		options.logger?.log(`round ${round} builder completed`, lastBuilderReport);
		options.ui?.setStep("write_code", "passed", `round ${round} complete`);

		options.ui?.setStep("default_evaluations", "running", checks.length ? `${checks.length} check(s)` : "none configured");
		lastCommandResults = [];
		if (checks.length === 0) {
			options.ui?.setEvaluations(["✓ No Verify commands configured"]);
		} else {
			for (let i = 0; i < checks.length; i++) {
				const check = checks[i];
				options.ui?.setEvaluations([
					...lastCommandResults.map((result) => `${result.status === "passed" ? "✓" : "✗"} ${result.label}`),
					`▶ Check ${i + 1}/${checks.length}: ${check.label}`,
					...checks.slice(i + 1).map((pending) => `○ ${pending.label}`),
				]);
				const result = await runShellCheck(options.cwd, check, options.signal);
				options.logger?.log(`default evaluation ${result.status}: ${check.command}`, {
					exitCode: result.exitCode,
					durationMs: result.durationMs,
					timedOut: result.timedOut,
					summary: result.summary,
					stdout: result.stdout.slice(0, 3000),
					stderr: result.stderr.slice(0, 3000),
				});
				lastCommandResults.push(result);
			}
			options.ui?.setEvaluations(
				lastCommandResults.map((result) => `${result.status === "passed" ? "✓" : "✗"} ${result.label}`),
			);
		}
		const commandFailures = lastCommandResults.filter((result) => result.blocking && result.status !== "passed");
		options.ui?.setStep(
			"default_evaluations",
			commandFailures.length ? "failed" : "passed",
			commandFailures.length ? `${commandFailures.length} failed` : "passed",
		);

		options.ui?.setStep("review", "running", "code review");
		lastReviewResult = await runReview(
			options.cwd,
			options.issue,
			options.planPath,
			options.planMarkdown,
			lastBuilderReport,
			lastCommandResults,
			feedback,
			(message) => options.ui?.detail(message),
			options.signal,
		);
		options.logger?.log(`round ${round} review ${lastReviewResult.verdict}`, lastReviewResult.report);
		options.ui?.setStep(
			"review",
			lastReviewResult.status === "passed" ? "passed" : "failed",
			lastReviewResult.verdict,
		);

		const passed = commandFailures.length === 0 && lastReviewResult.status === "passed";
		if (passed) {
			options.logger?.log(`round ${round} passed`);
			return {
				passed: true,
				round,
				builderReport: lastBuilderReport,
				commandResults: lastCommandResults,
				reviewResult: lastReviewResult,
				feedback: "",
			};
		}

		const failureSummary = summarizeRoundFailure(commandFailures, lastReviewResult);
		options.logger?.log(`round ${round} failed`, { failureSummary, commandFailures, review: lastReviewResult.report });
		options.ui?.addRoundFailure(round, failureSummary);
		options.ui?.detail(round < MAX_ROUNDS ? `round ${round} failed — retrying` : `round ${round} failed — no retries left`);
		feedback = formatEvaluationFeedback(lastCommandResults, lastReviewResult);
	}

	options.logger?.log("run failed after max rounds", feedback);
	return {
		passed: false,
		round: MAX_ROUNDS,
		builderReport: lastBuilderReport,
		commandResults: lastCommandResults,
		reviewResult: lastReviewResult,
		feedback,
	};
}

function makeCommitTitle(issue: GitHubIssue): string {
	const labels = (issue.labels ?? []).map((label) => (typeof label === "string" ? label : label.name ?? ""));
	const type = labels.some((label) => /bug|fix/i.test(label)) ? "fix" : "feat";
	return truncate(`${type}: ${issue.title}`, 72);
}

function formatPrBody(issue: GitHubIssue, planPath: string, result: BuildEvaluateResult): string {
	const checkLines = result.commandResults.length
		? result.commandResults.map((check) => `- ${check.status === "passed" ? "✅" : "❌"} ${check.label}`).join("\n")
		: "- No default Verify commands configured";

	return `## Summary

Implemented GitHub issue #${issue.number}: ${issue.title}

## Source Issue

Closes #${issue.number}

Issue: ${issue.url}

## Plan

\`${planPath}\`

## PBE Harness Evaluation

Round: ${result.round}/${MAX_ROUNDS}

### Default Evaluations

${checkLines}

### Review

- ${result.reviewResult.status === "passed" ? "✅" : "❌"} Code review: ${result.reviewResult.verdict}

## Builder Report

${result.builderReport.slice(0, 4000)}

## Review Report

${result.reviewResult.report.slice(0, 4000)}
`;
}

async function commitPushAndOpenPr(
	cwd: string,
	issue: GitHubIssue,
	branch: string,
	planPath: string,
	result: BuildEvaluateResult,
	ui: ReturnType<typeof createIssueWorkflowUi>,
	signal?: AbortSignal,
	logger?: PbeLogger,
): Promise<string> {
	ui.setStep("commit", "running", "git add/commit");
	await runRequiredProcess("git", ["add", "-A"], cwd, signal);
	const status = await runRequiredProcess("git", ["status", "--porcelain"], cwd, signal);
	if (!status.stdout.trim()) throw new Error("No changes to commit after successful evaluations.");
	await runRequiredProcess(
		"git",
		["commit", "-m", makeCommitTitle(issue), "-m", `Closes #${issue.number}.`],
		cwd,
		signal,
	);
	logger?.log("commit created", makeCommitTitle(issue));
	ui.setStep("commit", "passed", "committed");

	ui.setStep("push", "running", branch);
	await runRequiredProcess("git", ["push", "-u", "origin", branch], cwd, signal);
	logger?.log("branch pushed", branch);
	ui.setStep("push", "passed", "pushed");

	ui.setStep("open_pr", "running", "gh pr create");
	const body = formatPrBody(issue, relativeForPrompt(cwd, planPath), result);
	const pr = await runRequiredProcess(
		"gh",
		["pr", "create", "--title", makeCommitTitle(issue), "--body", body],
		cwd,
		signal,
	);
	const prUrl = pr.stdout.trim();
	logger?.log("pull request opened", prUrl || pr.stdout || pr.stderr);
	ui.setStep("open_pr", "passed", prUrl || "opened");
	return prUrl;
}

async function runIssueHarness(cwd: string, issueRef: string, signal: AbortSignal | undefined, ctx: any, pi: ExtensionAPI) {
	const logger = createPbeLogger(cwd, "issue", issueRef);
	const ui = createIssueWorkflowUi(ctx, issueRef, logger);
	ui.setStep("fetch_issue", "running", issueRef);

	await ensureGitReady(cwd, signal);
	const issue = await fetchGitHubIssue(cwd, issueRef, signal);
	logger.log("issue fetched", { number: issue.number, title: issue.title, url: issue.url });
	ui.setTitle(`#${issue.number} ${issue.title}`);
	ui.detail("marking issue in progress");
	const inProgressResult = await markIssueInProgress(cwd, issue, signal);
	ui.setStep("fetch_issue", "passed", `fetched; ${inProgressResult}`);

	ui.setStep("write_plan", "running", "planner running");
	const plan = await generateIssuePlan(cwd, issue, (message) => ui.detail(message), signal);
	const planPath = await writeIssuePlan(cwd, issue, plan);
	logger.log("plan written", { planPath: relativeForPrompt(cwd, planPath), plan });
	ui.setStep("write_plan", "passed", relativeForPrompt(cwd, planPath));

	if (planIsBlocked(plan)) {
		ui.setStep("create_branch", "skipped", "plan blocked");
		ui.setStep("write_code", "skipped", "plan blocked");
		throw new Error(`Planner marked issue #${issue.number} as blocked. Review ${relativeForPrompt(cwd, planPath)}.`);
	}

	ui.setStep("create_branch", "running", "git checkout -b");
	const branch = await createIssueBranch(cwd, issue, signal);
	logger.log("branch created", branch);
	ui.setBranch(branch);
	ui.setStep("create_branch", "passed", branch);

	const result = await runBuildEvaluateLoop({ cwd, issue, planPath, planMarkdown: plan, signal, ui, logger });
	if (!result.passed) {
		ui.setStep("commit", "skipped", "evaluations failed");
		ui.setStep("push", "skipped", "evaluations failed");
		ui.setStep("open_pr", "skipped", "evaluations failed");
		logger.log("issue harness blocked", result.feedback);
		pi.sendMessage(
			{
				customType: "pbe-issue-failed",
				content: `# PBE Issue Harness Blocked\n\nIssue #${issue.number} did not pass after ${MAX_ROUNDS} rounds.\n\n${result.feedback}`,
				display: true,
			},
			{ triggerTurn: false },
		);
		return;
	}

	const prUrl = await commitPushAndOpenPr(cwd, issue, branch, planPath, result, ui, signal, logger);
	logger.log("issue harness complete", { issue: issue.number, branch, planPath: relativeForPrompt(cwd, planPath), prUrl });
	pi.sendMessage(
		{
			customType: "pbe-issue-complete",
			content: `# PBE Issue Harness Complete\n\n- Issue: #${issue.number} ${issue.title}\n- Branch: \`${branch}\`\n- Plan: \`${relativeForPrompt(cwd, planPath)}\`\n- PR: ${prUrl || "opened"}\n\n## Evaluation\n\n${result.commandResults.map((check) => `- ${check.status === "passed" ? "✅" : "❌"} ${check.label}`).join("\n") || "- No Verify commands configured"}\n- ${result.reviewResult.status === "passed" ? "✅" : "❌"} Code review: ${result.reviewResult.verdict}`,
			display: true,
		},
		{ triggerTurn: false },
	);
}

async function runLocalPlan(cwd: string, planFile: string, signal: AbortSignal | undefined, ctx: any, pi: ExtensionAPI) {
	const logger = createPbeLogger(cwd, "local", planFile);
	const planPath = path.resolve(cwd, planFile);
	if (!fs.existsSync(planPath)) {
		logger.log("local plan missing", planPath);
		throw new Error(`Plan/task file not found: ${planPath}`);
	}
	const planMarkdown = await readFile(planPath, "utf8");
	logger.log("local plan loaded", { planPath: relativeForPrompt(cwd, planPath), plan: planMarkdown });
	const ui = createIssueWorkflowUi(ctx, path.basename(planPath), logger);
	ui.setStep("fetch_issue", "skipped", "local plan");
	ui.setStep("write_plan", "passed", relativeForPrompt(cwd, planPath));
	ui.setStep("create_branch", "skipped", "local run");

	const result = await runBuildEvaluateLoop({ cwd, planPath, planMarkdown, signal, ui, logger });
	ui.setStep("commit", "skipped", "local run");
	ui.setStep("push", "skipped", "local run");
	ui.setStep("open_pr", "skipped", "local run");

	logger.log(result.passed ? "local run passed" : "local run failed", result.passed ? result.reviewResult.report : result.feedback);
	pi.sendMessage(
		{
			customType: result.passed ? "pbe-run-result" : "pbe-run-failed",
			content: result.passed
				? `# PBE Run Result\n\nPASS after round ${result.round}.\n\n## Review\n\n${result.reviewResult.report}`
				: `# PBE Run Blocked\n\nFailed after ${MAX_ROUNDS} rounds.\n\n${result.feedback}`,
			display: true,
		},
		{ triggerTurn: false },
	);
}

export default function pbeExtension(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		setPbeReadyFooter(ctx);
	});

	pi.registerCommand("pbe-issue", {
		description: "Fetch a GitHub issue, plan, build, evaluate, commit, push, and open a PR",
		handler: async (args, ctx) => {
			const issueRef = args.trim();
			if (!issueRef) {
				ctx.ui.notify("Usage: /pbe-issue <issue-number-or-url>", "error");
				return;
			}

			const ui = createIssueWorkflowUi(ctx, issueRef);
			ui.clear();
			try {
				await runIssueHarness(ctx.cwd, issueRef, ctx.signal, ctx, pi);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				try {
					fs.mkdirSync(path.join(ctx.cwd, ".pi", "pbe"), { recursive: true });
					fs.appendFileSync(path.join(ctx.cwd, ".pi", "pbe", "pbe.log"), `[${new Date().toISOString()}] [command-error] /pbe-issue failed\n${message}\n`);
				} catch {
					// ignore logging failures
				}
				ctx.ui.notify(`PBE issue harness failed: ${message}`, "error");
				pi.sendMessage(
					{
						customType: "pbe-issue-error",
						content: `# PBE Issue Harness Error\n\n${message}`,
						display: true,
					},
					{ triggerTurn: false },
				);
			} finally {
				ctx.ui.setStatus("pbe", undefined);
				ctx.ui.setWidget("pbe-issue-progress", undefined);
				setPbeReadyFooter(ctx);
			}
		},
	});

	pi.registerCommand("pbe-run", {
		description: "Run local Builder → default evaluations → review loop for a plan/task markdown file",
		handler: async (args, ctx) => {
			const planFile = args.trim();
			if (!planFile) {
				ctx.ui.notify("Usage: /pbe-run <plan.md|task.md>", "error");
				return;
			}

			try {
				await runLocalPlan(ctx.cwd, planFile, ctx.signal, ctx, pi);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				try {
					fs.mkdirSync(path.join(ctx.cwd, ".pi", "pbe"), { recursive: true });
					fs.appendFileSync(path.join(ctx.cwd, ".pi", "pbe", "pbe.log"), `[${new Date().toISOString()}] [command-error] /pbe-run failed\n${message}\n`);
				} catch {
					// ignore logging failures
				}
				ctx.ui.notify(`PBE run failed: ${message}`, "error");
				pi.sendMessage(
					{
						customType: "pbe-run-error",
						content: `# PBE Run Error\n\n${message}`,
						display: true,
					},
					{ triggerTurn: false },
				);
			} finally {
				ctx.ui.setStatus("pbe", undefined);
				ctx.ui.setWidget("pbe-issue-progress", undefined);
				setPbeReadyFooter(ctx);
			}
		},
	});

	pi.registerCommand("pbe-status", {
		description: "Show PBE harness command summary",
		handler: async (_args, ctx) => {
			pi.sendMessage(
				{
					customType: "pbe-status",
					content: `# PBE Harness Status\n\nAvailable commands:\n\n- \`/pbe-issue <issue-number-or-url>\` — full GitHub issue → plan → build → eval → PR flow.\n- \`/pbe-run <plan.md|task.md>\` — local build/eval/review loop without git or PR automation.\n\nRequired issue flow tools: \`git\`, \`gh\`, and a clean working tree.\n\nRuns are logged to \`.pi/pbe/pbe.log\` in the current workspace.\n\nIssue flow marks issues in progress best-effort by adding an existing \`in progress\` / \`in-progress\` label. Set \`PBE_IN_PROGRESS_LABEL\` to use a custom label, or \`PBE_MARK_IN_PROGRESS=false\` to disable it.`,
					display: true,
				},
				{ triggerTurn: false },
			);
		},
	});
}
