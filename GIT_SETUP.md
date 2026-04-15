# Git Setup Instructions

Quick guide to get this repository on GitHub.

## Step 1: Create Initial Commit

```bash
cd ~/Code/github/owainlewis/pi-extensions

git add -A
git commit -m "Initial commit: Pi Extensions - Workflow automation for Pi coding agent

- Add autonomous workflow extension (spec → auto execution)
- Add workflow engine (manual TDD workflow)
- Add plan-based workflow (task management)
- Add funny status messages
- Include comprehensive documentation
- Add install script with backups
- Add tutorial and examples
- Add contributing guidelines"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `pi-extensions`
3. Description: `Powerful workflow automation extensions for Pi coding agent`
4. Public repository
5. Do NOT initialize with README (we have one)
6. Click "Create repository"

## Step 3: Push to GitHub

```bash
git remote add origin https://github.com/owainlewis/pi-extensions.git
git branch -M main
git push -u origin main
```

## Step 4: Configure Repository

### Add Topics

On GitHub repository page:
1. Click the gear icon next to "About"
2. Add topics:
   - `pi-coding-agent`
   - `workflow-automation`
   - `ai-coding`
   - `developer-tools`
   - `typescript`
   - `productivity`
   - `tdd`
   - `code-automation`

### Enable Features

Settings → Options:
- ✅ Issues
- ✅ Discussions
- ✅ Projects (optional)
- ✅ Wiki (optional)

### Repository Settings

- Description: `Powerful workflow automation extensions for Pi coding agent`
- Website: (leave empty or add docs site later)
- Topics: (added above)

## Step 5: Create Release (Optional)

1. Go to "Releases" → "Create a new release"
2. Tag: `v1.0.0`
3. Title: `v1.0.0 - Initial Release`
4. Description:

```markdown
## 🎉 Initial Release

First public release of Pi Extensions!

### Extensions Included

- **Autonomous Workflow** - Fully hands-off spec → implementation
- **Workflow Engine** - Guided TDD workflow with enforcement
- **Plan-Based Workflow** - Task management with visual tracking
- **Funny Status** - Fun status messages while waiting

### Features

✨ One-command installation
📚 Comprehensive documentation
🎓 Complete tutorial
🔧 Example specs included
🤝 Contributing guidelines

### Quick Start

```bash
git clone https://github.com/owainlewis/pi-extensions.git
cd pi-extensions
./install.sh
```

See [TUTORIAL.md](TUTORIAL.md) for complete walkthrough!

### Requirements

- Pi coding agent ([install guide](https://github.com/badlogic/pi-mono))
```

5. Click "Publish release"

## Step 6: Share with Community

### Pi Discord

Join: https://discord.com/invite/3cU7Bz4UPx

Post in appropriate channel:

```
🎉 Just released Pi Extensions!

Autonomous workflows for Pi:
✨ Give it a spec → Watch it build → Done!

Features:
- Fully automatic execution
- Code review included
- Auto-retry on failures
- Real-time progress

4 extensions included:
📝 Autonomous workflow
🔄 Manual TDD workflow
📋 Task management
😄 Fun status messages

Check it out: https://github.com/owainlewis/pi-extensions

Tutorial included! One-command install.
```

### Twitter/X

```
🎉 Just released Pi Extensions!

Autonomous workflows for @badlogicgames's Pi coding agent

✨ Spec → Auto-build → Done!

• Fully automatic execution
• Code review included  
• Auto-retry on failures
• Real-time progress tracking

4 extensions. One-command install. 10-min tutorial.

https://github.com/owainlewis/pi-extensions

#PiCodingAgent #Automation #DevTools #AI
```

### Hacker News (Optional)

Title: `Pi Extensions – Workflow automation for Pi coding agent`
URL: `https://github.com/owainlewis/pi-extensions`

### Reddit (Optional)

Subreddits:
- r/programming
- r/coding
- r/learnprogramming
- r/devtools

## Step 7: Monitor and Respond

- Watch for GitHub stars
- Respond to issues promptly
- Answer questions in discussions
- Review and merge PRs
- Thank contributors!

## Future Updates

### Making Changes

```bash
git add .
git commit -m "Description of changes"
git push
```

### Creating New Releases

```bash
git tag v1.1.0
git push origin v1.1.0
```

Then create release on GitHub as described above.

## Maintenance

### Weekly

- Check issues
- Review PRs
- Answer discussions

### Monthly

- Update dependencies (if any)
- Review and improve documentation
- Add new example specs

### As Needed

- Fix bugs
- Add new extensions
- Improve existing extensions

## Success Metrics

Track:
- ⭐ GitHub stars
- 🍴 Forks
- 📥 Clones
- 🐛 Issues (and resolution rate)
- 💬 Discussions
- 🎉 PRs from community

## You're Ready!

The repository is professional, complete, and ready for the world. 

Push it live and watch the community benefit from your work! 🚀
