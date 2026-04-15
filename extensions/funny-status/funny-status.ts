/**
 * Funny Status Messages Extension
 * 
 * Replaces the default "Working..." status with random humorous messages
 * to make waiting for the AI more entertaining.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const FUNNY_MESSAGES = [
  "Consulting the void...",
  "Bribing the compiler...",
  "Teaching old code new tricks...",
  "Asking the rubber duck...",
  "Summoning the code demons...",
  "Reading the tea leaves...",
  "Herding cats...",
  "Dividing by zero (safely)...",
  "Reticulating splines...",
  "Convincing electrons to behave...",
  "Mining bitcoins... kidding!",
  "Calculating the meaning of life...",
  "Optimizing the flux capacitor...",
  "Downloading more RAM...",
  "Untangling spaghetti code...",
  "Negotiating with dependencies...",
  "Reverse engineering the universe...",
  "Polishing pixels...",
  "Transcoding reality...",
  "Debugging the matrix...",
  "Overclocking brain cells...",
  "Quantum tunneling through bugs...",
  "Applying duct tape to pointers...",
  "Refactoring your expectations...",
  "Waiting for heat death of universe...",
  "Compiling excuses...",
  "Generating plausible deniability...",
  "Converting caffeine to code...",
  "Initializing genius mode...",
  "Sacrificing to the demo gods...",
];

export default function (pi: ExtensionAPI) {
  let currentMessage: string | undefined;

  // When agent starts processing, show a funny message
  pi.on("agent_start", async (_event, ctx) => {
    // Pick a random message
    currentMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
    ctx.ui.setWorkingMessage(currentMessage);
  });

  // When agent finishes, restore default behavior
  pi.on("agent_end", async (_event, ctx) => {
    ctx.ui.setWorkingMessage(); // Clear/restore default
    currentMessage = undefined;
  });

  // Optional: Also show funny messages during tool execution
  pi.on("tool_execution_start", async (_event, ctx) => {
    // Only update if we're already showing a message and randomly decide to change it (50% chance)
    if (currentMessage && Math.random() > 0.5) {
      currentMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
      ctx.ui.setWorkingMessage(currentMessage);
    }
  });
}
