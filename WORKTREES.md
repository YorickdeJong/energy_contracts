# Git Worktrees Guide

This project uses **git worktrees** to manage multiple feature branches simultaneously without switching branches or dealing with stashing changes.

## What are Git Worktrees?

Git worktrees allow you to have multiple working directories (worktrees) from a single git repository. Each worktree can have a different branch checked out, enabling you to work on multiple features simultaneously without context switching.

### Benefits:
- Work on multiple features without switching branches
- No need to stash changes when switching contexts
- Run multiple development servers for different features
- Compare features side-by-side
- Keep your main workspace clean

## Directory Structure

```
energy_contracts/                  # Main repository (main branch)
├── backend/
├── frontend/
├── worktrees/                     # All feature worktrees go here
│   ├── user-authentication/       # Feature branch worktree
│   │   ├── backend/
│   │   └── frontend/
│   ├── dashboard-redesign/        # Another feature worktree
│   │   ├── backend/
│   │   └── frontend/
│   └── api-improvements/          # Yet another feature worktree
│       ├── backend/
│       └── frontend/
├── worktree                       # Helper script
└── WORKTREES.md                   # This file
```

## Quick Start

### Creating a New Feature Worktree

```bash
# Create a new worktree for a feature
./worktree new user-authentication

# This creates:
# - A new branch: feature/user-authentication
# - A new worktree directory: worktrees/user-authentication/
# - Checks out the branch in that directory
```

### Working in a Worktree

```bash
# Navigate to your worktree
cd worktrees/user-authentication

# Install dependencies (first time)
cd frontend
pnpm install

# Start development server
pnpm dev

# The server will automatically find an available port (3000, 3001, etc.)
```

### Listing Worktrees

```bash
# See all active worktrees
./worktree list
```

### Removing a Worktree

```bash
# Remove a worktree when done
./worktree remove user-authentication

# You'll be prompted whether to delete the branch too
```

### Switching Between Worktrees

```bash
# Get the path to a worktree
./worktree switch user-authentication

# Or manually navigate
cd worktrees/user-authentication
```

## Common Workflows

### Working on Multiple Features Simultaneously

```bash
# Terminal 1: Main development
cd energy_contracts/frontend
pnpm dev  # Runs on port 3000

# Terminal 2: Feature A
cd energy_contracts
./worktree new payment-integration
cd worktrees/payment-integration/frontend
pnpm install && pnpm dev  # Runs on port 3001

# Terminal 3: Feature B
cd energy_contracts
./worktree new email-notifications
cd worktrees/email-notifications/frontend
pnpm install && pnpm dev  # Runs on port 3002
```

### Creating a Feature from Scratch

```bash
# 1. Create the worktree
./worktree new my-awesome-feature

# 2. Navigate to the worktree
cd worktrees/my-awesome-feature

# 3. Make your changes
# ... edit files ...

# 4. Commit your changes
git add .
git commit -m "Add my awesome feature"

# 5. Push the branch
git push -u origin feature/my-awesome-feature

# 6. Create a pull request (using GitHub CLI)
gh pr create --title "Add my awesome feature" --body "Description"

# 7. When merged, clean up
cd ../..
./worktree remove my-awesome-feature
```

### Comparing Features Side-by-Side

```bash
# Open two code editors or terminals
# Editor 1: Main branch
cd energy_contracts

# Editor 2: Feature branch
cd energy_contracts/worktrees/my-feature

# You can now compare files, run tests, or view both UIs simultaneously
```

## Helper Script Commands

```bash
./worktree new <feature-name>     # Create new worktree
./worktree list                   # List all worktrees
./worktree remove <feature-name>  # Remove worktree
./worktree switch <feature-name>  # Get path to worktree
./worktree clean                  # Clean up stale worktrees
./worktree help                   # Show help
```

## Best Practices

### 1. **Naming Conventions**
   - Use kebab-case for feature names: `user-authentication`, `api-improvements`
   - Keep names descriptive but concise
   - The script will automatically create branches as `feature/<name>`

### 2. **Dependency Management**
   - Each worktree needs its own `node_modules` for the frontend
   - Run `pnpm install` in each new worktree's frontend directory
   - Backend dependencies are shared (Python virtualenv)

### 3. **Port Management**
   - The custom `start-server.js` automatically finds available ports
   - Default: 3000, then tries 3001, 3002, etc.
   - Update `NEXTAUTH_URL` in `.env.local` if using a different port

### 4. **Cleanup**
   - Remove worktrees when features are merged
   - Use `./worktree clean` to remove stale references
   - Delete feature branches after merging to keep repo clean

### 5. **Git Operations**
   - You can run git commands from any worktree
   - Changes are isolated to each worktree's branch
   - Pushing/pulling works normally in each worktree

## Environment Variables

Each worktree can have its own environment configuration:

```bash
# In worktrees/my-feature/frontend/.env.local
NEXTAUTH_URL=http://localhost:3001  # Adjust port as needed
NEXTAUTH_SECRET=<your-secret>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Troubleshooting

### Worktree Already Exists
```bash
# If you get "worktree already exists" error
git worktree list  # Check existing worktrees
./worktree remove <name>  # Remove old worktree
./worktree new <name>  # Create fresh worktree
```

### Branch Already Checked Out
```bash
# Git worktrees don't allow the same branch in multiple worktrees
# Solution: Create a new branch or switch the existing worktree
```

### Port Already in Use
```bash
# The start-server.js script handles this automatically
# It will find the next available port (3001, 3002, etc.)
```

### Stale Worktree References
```bash
# If you manually deleted a worktree directory
./worktree clean  # Prune stale references
```

## Advanced Usage

### Working with Remote Branches

```bash
# Create worktree from remote branch
git fetch origin
./worktree new feature-name  # If branch exists remotely, it will check it out
```

### Temporary Worktrees for Testing

```bash
# Create a temporary worktree for quick testing
./worktree new test-something
cd worktrees/test-something
# ... test changes ...
cd ../..
./worktree remove test-something  # Clean up when done
```

### Sharing Worktrees in Team

```bash
# Worktrees are local to your machine
# Share the branch, not the worktree
git push origin feature/my-feature

# Teammate can create their own worktree
./worktree new my-feature  # Creates from existing branch
```

## Integration with IDEs

### VS Code
```bash
# Open a worktree in VS Code
code worktrees/my-feature
```

### Cursor
```bash
# Open a worktree in Cursor
cursor worktrees/my-feature
```

### Multiple IDE Windows
You can have multiple IDE windows open simultaneously, one for each worktree!

## Git Worktree Native Commands

If you prefer using git directly:

```bash
# Create worktree
git worktree add -b feature/my-feature worktrees/my-feature main

# List worktrees
git worktree list

# Remove worktree
git worktree remove worktrees/my-feature

# Prune stale worktrees
git worktree prune
```

## Further Reading

- [Official Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git Worktree Tutorial](https://www.gitkraken.com/learn/git/git-worktree)

---

**Pro Tip:** Add an alias to your shell config for quick access:
```bash
# In ~/.bashrc or ~/.zshrc
alias wt='./worktree'

# Then use:
wt new my-feature
wt list
wt remove my-feature
```
