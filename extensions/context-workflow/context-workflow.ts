/**
 * Context-Isolated Workflow Extension
 * 
 * Automated iteration with clean review context:
 * 1. Write code (full context)
 * 2. Run tests (deterministic validation)
 * 3. Review code (FRESH context - no implementation bias)
 * 4. Fix issues (back to full context)
 * 5. Verify (final check)
 * 
 * Key features:
 * - Automated iteration cycle (no manual "now review" prompts)
 * - Context compaction before review (clean slate)
 * - Deterministic test validation (parse actual exit codes)
 * - State persistence across long tasks
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

type WorkflowStage = "write" | "test" | "review" | "fix" | "verify" | "done";

interface Workflow {
  active: boolean;
  stage: WorkflowStage;
  spec: string;
  iteration: number;
  maxIterations: number;
  testsPassed: boolean;
  reviewIssues: string[];
  contextCompacted: boolean;
}

const STAGE_DESCRIPTIONS: Record<WorkflowStage, string> = {
  "write": "📝 Writing implementation",
  "test": "🧪 Running tests",
  "review": "🔍 Code review (clean context)",
  "fix": "🔧 Fixing issues",
  "verify": "✅ Final verification",
  "done": "🎉 Complete",
};

export default function (pi: ExtensionAPI) {
  let workflow: Workflow | null = null;

  // Restore state
  pi.on("session_start", async (_event, ctx) => {
    workflow = null;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === "context-workflow-state") {
        workflow = entry.data as Workflow;
      }
    }
    
    if (workflow?.active) {
      updateStatus(ctx);
    }
  });

  const updateStatus = (ctx: any) => {
    if (workflow?.active) {
      const desc = STAGE_DESCRIPTIONS[workflow.stage];
      ctx.ui.setStatus("context-workflow", `${desc} (${workflow.iteration}/${workflow.maxIterations})`);
      pi.appendEntry("context-workflow-state", workflow);
    } else {
      ctx.ui.setStatus("context-workflow", undefined);
    }
  };

  // Start workflow
  pi.registerCommand("workflow", {
    description: "Start context-isolated workflow (spec or description)",
    handler: async (args, ctx) => {
      let spec = args || "";
      
      // Read from file if provided
      if (spec.endsWith(".md") || spec.endsWith(".txt")) {
        try {
          const fs = await import("node:fs/promises");
          spec = await fs.readFile(spec, "utf-8");
        } catch (error) {
          ctx.ui.notify(`Could not read file: ${spec}`, "error");
          return;
        }
      }
      
      // Or open editor
      if (!spec) {
        spec = await ctx.ui.editor(
          "Enter feature description or spec:",
          "# Feature\n\nCreate a calculator with add/subtract operations.\nInclude comprehensive tests."
        );
        
        if (!spec) {
          ctx.ui.notify("Description required", "error");
          return;
        }
      }

      workflow = {
        active: true,
        stage: "write",
        spec,
        iteration: 0,
        maxIterations: 10,
        testsPassed: false,
        reviewIssues: [],
        contextCompacted: false,
      };

      updateStatus(ctx);

      pi.sendMessage({
        customType: "context-workflow",
        content: [
          "🚀 **Context-Isolated Workflow Started**",
          "",
          "**Spec/Description:**",
          "```",
          spec,
          "```",
          "",
          "**How this works:**",
          "1. Write implementation with tests",
          "2. Run tests automatically (parsed deterministically)",
          "3. Review with CLEAN context (no implementation bias)",
          "4. Fix issues found in review",
          "5. Verify everything works",
          "",
          "All automatic - just watch!",
          "",
          `**Stage 1: ${STAGE_DESCRIPTIONS["write"]}**`,
        ].join("\n"),
        display: true,
      });
      
      // Start the workflow
      pi.sendUserMessage(
        "Implement this feature based on the spec. Create all necessary files and comprehensive tests. When done, call workflow_next to proceed to testing.",
        { deliverAs: "followUp" }
      );
    },
  });

  // Check workflow status
  pi.registerCommand("workflow:status", {
    description: "Check workflow status",
    handler: async (_args, ctx) => {
      if (!workflow?.active) {
        ctx.ui.notify("No active workflow", "info");
        return;
      }

      const status = [
        `**Stage**: ${STAGE_DESCRIPTIONS[workflow.stage]}`,
        `**Iteration**: ${workflow.iteration}/${workflow.maxIterations}`,
        `**Tests**: ${workflow.testsPassed ? "✅ Passing" : "❌ Not passing"}`,
        `**Issues found**: ${workflow.reviewIssues.length}`,
        `**Context**: ${workflow.contextCompacted ? "Compacted (clean)" : "Full"}`,
      ].join("\n");

      pi.sendMessage({
        customType: "context-workflow",
        content: status,
        display: true,
      });
    },
  });

  // Cancel workflow
  pi.registerCommand("workflow:cancel", {
    description: "Cancel the workflow",
    handler: async (_args, ctx) => {
      if (!workflow?.active) {
        ctx.ui.notify("No active workflow to cancel", "info");
        return;
      }

      workflow.active = false;
      updateStatus(ctx);
      ctx.ui.notify("Workflow cancelled", "info");
      workflow = null;
    },
  });

  // Progress to next stage
  pi.registerTool({
    name: "workflow_next",
    label: "Progress Workflow",
    description: "Move to the next stage of the workflow. Call when current stage is complete.",
    parameters: Type.Object({
      notes: Type.Optional(Type.String({ description: "Notes about what was completed" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return {
          content: [{ type: "text", text: "❌ No active workflow" }],
          details: {},
        };
      }

      workflow.iteration++;

      if (workflow.iteration >= workflow.maxIterations) {
        workflow.active = false;
        updateStatus(ctx);
        return {
          content: [{ type: "text", text: "⚠️ Maximum iterations reached. Workflow complete." }],
          details: { workflow },
        };
      }

      let nextStage: WorkflowStage;
      let message: string;
      let nextPrompt: string | null = null;

      switch (workflow.stage) {
        case "write":
          nextStage = "test";
          message = "✅ Code written!\n\n**Stage 2: Running Tests**\n\nRunning test suite to check implementation...";
          nextPrompt = "Run the test suite using the bash tool. Use pytest, npm test, cargo test, or appropriate test command for the project. After running tests, call workflow_test_result with the exit code.";
          break;

        case "test":
          if (workflow.testsPassed) {
            nextStage = "review";
            message = "✅ Tests passed!\n\n**Stage 3: Code Review (Clean Context)**\n\nCompacting context for unbiased review...";
            
            // CRITICAL: Compact context before review
            ctx.compact({
              customInstructions: "Keep only: 1) The original spec/description, 2) List of files created, 3) Brief summary of what was implemented. Remove all implementation details and conversation history.",
              onComplete: () => {
                if (workflow) {
                  workflow.contextCompacted = true;
                  updateStatus(ctx);
                }
              },
            });
            
            nextPrompt = "Review the code with fresh eyes. Read all files that were created and check for: 1) Code quality and readability, 2) Test coverage, 3) Edge cases, 4) Error handling, 5) Best practices. Call workflow_review_result with your findings.";
          } else {
            nextStage = "fix";
            message = "❌ Tests failed!\n\n**Stage 4: Fixing Issues**\n\nFixing test failures...";
            nextPrompt = "Fix the test failures. Review the test output, identify the issues, and fix the code. When done, call workflow_next to re-run tests.";
          }
          break;

        case "review":
          if (workflow.reviewIssues.length === 0) {
            nextStage = "verify";
            message = "✅ Code review passed!\n\n**Stage 5: Final Verification**\n\nRunning final verification...";
            nextPrompt = "Run the full test suite one final time to ensure everything works. Call workflow_complete when tests pass.";
          } else {
            nextStage = "fix";
            message = `📋 Review found ${workflow.reviewIssues.length} issue(s)\n\n**Stage 4: Fixing Issues**\n\nAddressing review feedback...`;
            nextPrompt = `Fix these issues from the code review:\n${workflow.reviewIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}\n\nWhen done, call workflow_next to re-test.`;
          }
          break;

        case "fix":
          nextStage = "test";
          message = "🔧 Fixes applied!\n\n**Stage 2: Re-testing**\n\nVerifying fixes with test suite...";
          nextPrompt = "Run the test suite again to verify the fixes. Call workflow_test_result with the exit code.";
          break;

        case "verify":
          nextStage = "done";
          workflow.active = false;
          message = "🎉 **Workflow Complete!**\n\nAll stages passed successfully.";
          nextPrompt = null;
          break;

        default:
          nextStage = "done";
          message = "✅ Complete";
          nextPrompt = null;
      }

      workflow.stage = nextStage;
      workflow.contextCompacted = false; // Reset for next cycle
      updateStatus(ctx);

      // Auto-send next prompt
      if (nextPrompt) {
        pi.sendUserMessage(nextPrompt, { deliverAs: "followUp" });
      }

      return {
        content: [{ type: "text", text: message }],
        details: { workflow, stage: nextStage, notes: params.notes },
      };
    },
  });

  // Deterministic test result
  pi.registerTool({
    name: "workflow_test_result",
    label: "Report Test Result",
    description: "Report test execution result with exit code",
    parameters: Type.Object({
      exitCode: Type.Number({ description: "Exit code from test command (0 = pass, non-zero = fail)" }),
      output: Type.Optional(Type.String({ description: "Test output summary" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return {
          content: [{ type: "text", text: "❌ No active workflow" }],
          details: {},
        };
      }

      // DETERMINISTIC: Parse actual exit code
      workflow.testsPassed = params.exitCode === 0;

      let message: string;
      if (workflow.testsPassed) {
        message = `✅ Tests passed! (exit code: ${params.exitCode})`;
      } else {
        message = `❌ Tests failed (exit code: ${params.exitCode})`;
        if (params.output) {
          message += `\n\nOutput:\n${params.output.substring(0, 500)}`;
        }
      }

      updateStatus(ctx);

      // Auto-progress
      pi.sendUserMessage("Call workflow_next to progress to the next stage.", { deliverAs: "followUp" });

      return {
        content: [{ type: "text", text: message }],
        details: { workflow, testsPassed: workflow.testsPassed, exitCode: params.exitCode },
      };
    },
  });

  // Review result
  pi.registerTool({
    name: "workflow_review_result",
    label: "Report Review Result",
    description: "Report code review findings",
    parameters: Type.Object({
      issues: Type.Array(Type.String(), { 
        description: "List of issues found (empty array if no issues)" 
      }),
      summary: Type.Optional(Type.String({ description: "Overall review summary" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return {
          content: [{ type: "text", text: "❌ No active workflow" }],
          details: {},
        };
      }

      workflow.reviewIssues = params.issues;

      let message: string;
      if (params.issues.length === 0) {
        message = "✅ Review passed! No issues found.";
      } else {
        message = `📋 Review found ${params.issues.length} issue(s):\n`;
        params.issues.forEach((issue, i) => {
          message += `\n${i + 1}. ${issue}`;
        });
      }

      if (params.summary) {
        message += `\n\n**Summary**: ${params.summary}`;
      }

      updateStatus(ctx);

      // Auto-progress
      pi.sendUserMessage("Call workflow_next to progress.", { deliverAs: "followUp" });

      return {
        content: [{ type: "text", text: message }],
        details: { workflow, issues: params.issues, summary: params.summary },
      };
    },
  });

  // Complete workflow
  pi.registerTool({
    name: "workflow_complete",
    label: "Complete Workflow",
    description: "Mark workflow as complete",
    parameters: Type.Object({
      summary: Type.String({ description: "Summary of what was accomplished" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!workflow?.active) {
        return {
          content: [{ type: "text", text: "❌ No active workflow" }],
          details: {},
        };
      }

      workflow.stage = "done";
      workflow.active = false;
      updateStatus(ctx);

      const message = [
        "🎉 **Workflow Complete!**",
        "",
        params.summary,
        "",
        `**Iterations**: ${workflow.iteration}`,
        `**Tests**: ${workflow.testsPassed ? "✅ All passing" : "⚠️ Some failures"}`,
        `**Review issues resolved**: ${workflow.reviewIssues.length === 0 ? "✅ Yes" : "⚠️ No"}`,
        "",
        "Start another with `/workflow [spec]`",
      ].join("\n");

      return {
        content: [{ type: "text", text: message }],
        details: { workflow, summary: params.summary },
      };
    },
  });

  // Inject workflow context
  pi.on("before_agent_start", async (event, ctx) => {
    if (!workflow?.active) return {};

    const guidance = [
      "",
      "---",
      "**🔄 CONTEXT-AWARE WORKFLOW ACTIVE**",
      "",
      `**Stage**: ${STAGE_DESCRIPTIONS[workflow.stage]} (${workflow.iteration}/${workflow.maxIterations})`,
      `**Context**: ${workflow.contextCompacted ? "COMPACTED (Fresh review context)" : "Full implementation context"}`,
      "",
      workflow.contextCompacted 
        ? "⚠️ You're reviewing with CLEAN context. You don't see the implementation conversation - only the final code files. Review objectively."
        : `**Original Spec**: ${workflow.spec.substring(0, 200)}...`,
      "",
      "Follow the workflow instructions and call the appropriate workflow tool when done.",
      "---",
    ].join("\n");

    return {
      systemPrompt: event.systemPrompt + guidance,
    };
  });

  // Deterministic test detection (optional enhancement)
  pi.on("tool_result", async (event, ctx) => {
    if (!workflow?.active || workflow.stage !== "test") return;

    // Auto-detect test commands
    if (event.toolName === "bash" && event.input?.command) {
      const cmd = event.input.command.toLowerCase();
      const isTestCommand = 
        cmd.includes("pytest") ||
        cmd.includes("npm test") ||
        cmd.includes("cargo test") ||
        cmd.includes("go test") ||
        cmd.includes("mvn test");

      if (isTestCommand && event.details?.exitCode !== undefined) {
        // Auto-report test result
        const exitCode = event.details.exitCode;
        ctx.ui.notify(
          `Auto-detected test result: ${exitCode === 0 ? "✅ Passed" : "❌ Failed"}`,
          exitCode === 0 ? "success" : "error"
        );
      }
    }
  });

  pi.on("session_shutdown", async () => {
    workflow = null;
  });
}
