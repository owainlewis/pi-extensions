# Funny Status Messages Extension

Replaces Pi's boring "Working..." status with random hilarious messages. Make waiting for the AI more entertaining!

## What It Does

Automatically replaces the default "Working..." message with funny, random messages like:
- "Consulting the void..."
- "Bribing the compiler..."
- "Teaching old code new tricks..."
- "Debugging the matrix..."
- ...and 27 more!

## Installation

### Using the install script (recommended):

```bash
./install.sh funny-status
```

### Manual installation:

```bash
cp extensions/funny-status/funny-status.ts ~/.pi/agent/extensions/
```

Then in Pi:
```
/reload
```

## Usage

No commands needed! Once installed, funny messages appear automatically whenever Pi is working.

### What You'll See

Instead of:
```
Working...
```

You'll see:
```
Consulting the void...
Bribing the compiler...
Teaching old code new tricks...
Herding cats...
Debugging the matrix...
```

And many more!

## Features

- ✅ 30 different funny messages
- ✅ Random selection each time
- ✅ Changes during tool execution (50% chance)
- ✅ Automatically restores default when done
- ✅ Zero configuration needed
- ✅ Works with all Pi features

## Message List

The extension includes these messages:

```
Consulting the void...
Bribing the compiler...
Teaching old code new tricks...
Asking the rubber duck...
Summoning the code demons...
Reading the tea leaves...
Herding cats...
Dividing by zero (safely)...
Reticulating splines...
Convincing electrons to behave...
Mining bitcoins... kidding!
Calculating the meaning of life...
Optimizing the flux capacitor...
Downloading more RAM...
Untangling spaghetti code...
Negotiating with dependencies...
Reverse engineering the universe...
Polishing pixels...
Transcoding reality...
Debugging the matrix...
Overclocking brain cells...
Quantum tunneling through bugs...
Applying duct tape to pointers...
Refactoring your expectations...
Waiting for heat death of universe...
Compiling excuses...
Generating plausible deniability...
Converting caffeine to code...
Initializing genius mode...
Sacrificing to the demo gods...
```

## Customization

### Add Your Own Messages

Edit `funny-status.ts` and add to the `FUNNY_MESSAGES` array:

```typescript
const FUNNY_MESSAGES = [
  "Consulting the void...",
  "Your custom message here...",
  "Another funny message...",
  // Add as many as you want!
];
```

### Change Update Frequency

Currently updates with 50% chance during tool execution. To change:

```typescript
pi.on("tool_execution_start", async (_event, ctx) => {
  if (currentMessage && Math.random() > 0.5) {  // Change 0.5 to adjust probability
    currentMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
    ctx.ui.setWorkingMessage(currentMessage);
  }
});
```

### Disable Random Updates

Comment out the `tool_execution_start` handler to only show one message per agent session:

```typescript
// pi.on("tool_execution_start", async (_event, ctx) => {
//   // Disabled
// });
```

## When Messages Appear

Messages show:
- ✅ When agent starts processing (always)
- ✅ During tool execution (50% chance to change)
- ✅ Any time Pi is "working"

Messages clear:
- ✅ When agent finishes
- ✅ When user gets control back

## Examples

### Before (Boring):
```
> Create a function to validate emails

Working...
[Pi creates code]
Working...
[Pi runs tests]
Working...
```

### After (Fun!):
```
> Create a function to validate emails

Consulting the void...
[Pi creates code]
Bribing the compiler...
[Pi runs tests]
Teaching old code new tricks...
```

## Compatibility

Works with:
- ✅ All Pi modes (interactive, print, RPC)
- ✅ All workflow extensions
- ✅ Any model
- ✅ All built-in tools
- ✅ Custom tools from other extensions

## Tips

1. **Combine with workflows** - Makes waiting through TDD cycles more fun
2. **Customize messages** - Add your own jokes
3. **Show your team** - Fun for demos and pair programming
4. **Gaming references** - Add messages from your favorite games

## Inspiration for Custom Messages

### Developer Humor:
```
"Refactoring your technical debt..."
"Converting TODO to DONE..."
"Removing console.log statements..."
"Fixing bugs created by previous fixes..."
```

### Gaming References:
```
"Building additional pylons..."
"Waiting for respawn timer..."
"Rolling for initiative..."
"Grinding for XP..."
```

### Pop Culture:
```
"Making it so..."
"Engaging hyperdrive..."
"Reversing the polarity..."
"Calibrating flux capacitor..."
```

### Realistic:
```
"Reading Stack Overflow..."
"Googling the error message..."
"Trying random solutions..."
"Copying from documentation..."
```

## Troubleshooting

### Messages not showing?

Check extension loaded:
```bash
pi
/reload
# Look for "funny-status" in loaded extensions
```

### Still seeing "Working..."?

The extension might have an error. Check:
```bash
pi --verbose
# Look for error messages
```

### Want to disable?

Remove or rename the extension file:
```bash
mv ~/.pi/agent/extensions/funny-status.ts ~/.pi/agent/extensions/funny-status.ts.disabled
```

Then:
```bash
pi
/reload
```

## Advanced

### Context-Aware Messages

Make messages match the current task:

```typescript
pi.on("agent_start", async (_event, ctx) => {
  // Get last user message to determine context
  const messages = ctx.sessionManager.getBranch();
  const lastUser = messages
    .filter(m => m.type === "message" && m.message.role === "user")
    .pop();
  
  if (lastUser?.message.content.includes("test")) {
    currentMessage = "Writing comprehensive tests...";
  } else if (lastUser?.message.content.includes("refactor")) {
    currentMessage = "Refactoring with extreme prejudice...";
  } else {
    currentMessage = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
  }
  
  ctx.ui.setWorkingMessage(currentMessage);
});
```

### Progress Messages

Show progress through a sequence:

```typescript
const PROGRESS_MESSAGES = [
  "Starting up...",
  "Getting warmed up...",
  "Making progress...",
  "Almost there...",
  "Putting finishing touches...",
];

let progressIndex = 0;

pi.on("tool_execution_start", async (_event, ctx) => {
  currentMessage = PROGRESS_MESSAGES[progressIndex % PROGRESS_MESSAGES.length];
  progressIndex++;
  ctx.ui.setWorkingMessage(currentMessage);
});
```

## Contributing

Have a funny message idea? Submit a PR!

The funnier, the better. Bonus points for:
- Programming puns
- Pop culture references
- Absurdist humor
- Meta jokes about AI

## License

MIT

## Author

Created for Pi coding agent - https://github.com/badlogic/pi-mono

Made with ❤️ and a sense of humor
