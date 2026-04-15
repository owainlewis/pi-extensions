# Contributing to Pi Extensions

Thank you for your interest in contributing! This document provides guidelines for contributing new extensions or improving existing ones.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/pi-extensions.git`
3. Create a branch: `git checkout -b feature/your-extension-name`
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## Adding a New Extension

### Directory Structure

```
extensions/
└── your-extension/
    ├── your-extension.ts    # Main extension file
    └── README.md            # Comprehensive documentation
```

### Extension File Guidelines

1. **Clear Purpose**: One feature per extension
2. **Documentation**: Inline comments explaining complex logic
3. **Error Handling**: Graceful failures with user feedback
4. **Type Safety**: Use TypeScript types properly
5. **User Feedback**: Show what's happening via UI methods

### Example Extension Template

```typescript
/**
 * Extension Name
 * 
 * Brief description of what it does.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Restore state on session start
  pi.on("session_start", async (_event, ctx) => {
    // Initialize or restore extension state
  });

  // Register commands
  pi.registerCommand("your-command", {
    description: "What this command does",
    handler: async (args, ctx) => {
      // Command implementation
    },
  });

  // Register tools
  pi.registerTool({
    name: "your_tool",
    label: "Your Tool",
    description: "What this tool does",
    parameters: Type.Object({
      // Tool parameters
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      // Tool implementation
      return {
        content: [{ type: "text", text: "Result" }],
        details: {},
      };
    },
  });

  // Cleanup on shutdown
  pi.on("session_shutdown", async () => {
    // Cleanup code
  });
}
```

### README Template

Your extension's README should include:

```markdown
# Extension Name

Brief description

## What It Does

Detailed explanation

## Installation

[Install instructions]

## Usage

[Usage examples]

## Commands

[Command reference]

## Features

[Feature list]

## Configuration

[How to configure]

## When to Use

[Use cases]

## Tips

[Helpful tips]

## Troubleshooting

[Common issues and solutions]

## Examples

[Real-world examples]

## License

MIT
```

## Code Standards

### TypeScript

- Use TypeScript features (types, interfaces)
- Avoid `any` type
- Use `async/await` for async operations
- Handle errors properly

### Naming Conventions

- Commands: `kebab-case` (e.g., `my-command`)
- Tools: `snake_case` (e.g., `my_tool`)
- Functions: `camelCase`
- Types: `PascalCase`

### Comments

- Document why, not what
- Use JSDoc for functions
- Explain complex logic
- Note any limitations or gotchas

### User Interface

- Provide clear feedback
- Use appropriate notification levels (info, warning, error)
- Update status indicators
- Show progress where applicable

### Error Handling

```typescript
try {
  // Operation
} catch (error) {
  ctx.ui.notify(`Failed: ${error.message}`, "error");
  return;
}
```

### State Management

If your extension needs state:

1. **Persist to session** for survival across restarts
2. **Restore in `session_start`** event
3. **Clean up in `session_shutdown`** event

```typescript
// Persist
pi.appendEntry("your-extension-state", state);

// Restore
pi.on("session_start", async (_event, ctx) => {
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === "your-extension-state") {
      state = entry.data;
    }
  }
});
```

## Testing

Before submitting:

1. **Test installation**: Run `./install.sh your-extension`
2. **Test in Pi**: Verify `/reload` works
3. **Test functionality**: Try all commands and tools
4. **Test edge cases**: Invalid input, errors, cancellation
5. **Test persistence**: Quit and restart Pi

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Commands work as documented
- [ ] Tools execute correctly
- [ ] UI feedback is clear
- [ ] Errors are handled gracefully
- [ ] State persists across restarts
- [ ] Works with other extensions
- [ ] Documentation is accurate

## Documentation

### In-Code Documentation

```typescript
/**
 * Brief description of function
 * 
 * @param param1 - Description
 * @returns Description of return value
 */
function myFunction(param1: string): boolean {
  // Implementation
}
```

### README Documentation

Your README should:
- Explain what the extension does clearly
- Provide installation instructions
- Show usage examples
- Document all commands and tools
- Include troubleshooting section
- Provide real-world use cases

### Example Code

Include working examples users can copy-paste:

```bash
# Good example
pi
/your-command "example input"
# Expected output shown here
```

## Pull Request Process

1. **Update documentation**: README, inline comments
2. **Test thoroughly**: Manual testing checklist
3. **Update main README**: Add your extension to the list
4. **Update install script**: If needed
5. **Write clear PR description**: What, why, how

### PR Description Template

```markdown
## Extension: [Name]

### What
Brief description of what this extension does

### Why
Problem it solves or value it adds

### How
Brief technical overview

### Testing
- [ ] Tested installation
- [ ] Tested all commands
- [ ] Tested error cases
- [ ] Documentation reviewed
- [ ] Examples verified

### Screenshots/Examples
[If applicable]
```

## Code Review

Reviewers will check:

- Code quality and style
- Documentation completeness
- Error handling
- User experience
- Test coverage (manual testing checklist)
- Performance considerations

## Release Process

After your PR is merged:

1. Extension is added to next release
2. Updated `install.sh` if needed
3. Main README updated
4. CHANGELOG updated (if we add one)

## Questions?

- Open an issue for questions
- Check existing issues first
- Join Pi Discord for discussions

## Resources

- [Pi Extension Docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [Pi Examples](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Welcome newcomers

## Recognition

Contributors will be:
- Listed in release notes
- Credited in extension documentation
- Recognized in README (if we add a contributors section)

Thank you for contributing! 🎉
