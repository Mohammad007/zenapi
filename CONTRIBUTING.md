# Contributing to AstraAPI

First off, thank you for considering contributing to AstraAPI! 🎉

It's people like you that make AstraAPI such a great tool for the Bun community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

### Our Pledge

- Be welcoming and inclusive
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0.0 or higher
- [Git](https://git-scm.com/)
- A code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/Mohammad007/astraapi.git
   cd astraapi
   ```

3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Mohammad007/astraapi.git
   ```

## 💻 Development Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Run the example to verify setup:**
   ```bash
   bun run example
   ```

3. **Run tests:**
   ```bash
   bun test
   ```

4. **Build the project:**
   ```bash
   bun run build
   ```

### Project Structure

```
astraapi/
├── core/           # Core framework (server, router, context)
├── context/        # Dependency Injection
├── Injection/      # Features (decorators, auth, db, cli)
│   ├── decorators/ # @Controller, @Get, @Body, etc.
│   ├── auth/       # JWT, OAuth2, Guards
│   ├── database/   # Prisma, SQLite
│   ├── validation/ # Zod integration
│   ├── openapi/    # Swagger generator
│   └── cli/        # CLI commands
├── examples/       # Example applications
└── tests/          # Test files
```

## 🤝 How to Contribute

### Types of Contributions

We welcome many types of contributions:

| Type | Description |
|------|-------------|
| 🐛 **Bug Fixes** | Fix bugs and issues |
| ✨ **Features** | Add new features |
| 📚 **Documentation** | Improve docs, add examples |
| 🧪 **Tests** | Add or improve tests |
| 🎨 **Refactoring** | Improve code quality |
| 🌍 **Translations** | Translate documentation |

### Finding Issues to Work On

- Look for issues labeled [`good first issue`](https://github.com/Mohammad007/astraapi/labels/good%20first%20issue) - great for newcomers!
- Check [`help wanted`](https://github.com/Mohammad007/astraapi/labels/help%20wanted) for issues needing help
- Browse [`enhancement`](https://github.com/Mohammad007/astraapi/labels/enhancement) for feature requests

### Working on an Issue

1. Comment on the issue to let others know you're working on it
2. Create a new branch from `main`:
   ```bash
   git checkout -b feature/issue-123-description
   ```
3. Make your changes
4. Write or update tests as needed
5. Ensure all tests pass
6. Submit a pull request

## 📤 Pull Request Process

### Before Submitting

1. **Update your fork:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests:**
   ```bash
   bun test
   ```

3. **Check code style:**
   - Follow existing code patterns
   - Use TypeScript strict mode
   - Add JSDoc comments for public APIs

### Submitting Your PR

1. Push your branch:
   ```bash
   git push origin feature/your-feature
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template:
   - Describe what changes you made
   - Reference any related issues
   - Include screenshots for UI changes

4. Wait for review - maintainers will review your PR and may request changes

### PR Review Process

- PRs require at least one maintainer approval
- CI tests must pass
- Address review feedback promptly
- Keep PRs focused and reasonably sized

## 📝 Coding Standards

### TypeScript

```typescript
// ✅ Good - Use explicit types
function createUser(data: CreateUserInput): Promise<User> {
  return db.user.create({ data });
}

// ❌ Bad - Avoid 'any'
function createUser(data: any): any {
  return db.user.create({ data });
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `user.controller.ts` |
| Classes | PascalCase | `UserController` |
| Functions | camelCase | `createUser` |
| Constants | UPPER_SNAKE | `MAX_LIMIT` |
| Interfaces | PascalCase | `CreateUserInput` |

### Documentation

```typescript
/**
 * Create a new user
 * 
 * @param data - User creation data
 * @returns The created user
 * @throws ConflictException if email already exists
 * 
 * @example
 * ```ts
 * const user = await createUser({ name: "John", email: "john@example.com" });
 * ```
 */
async function createUser(data: CreateUserInput): Promise<User> {
  // implementation
}
```

## 💬 Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
# Feature
feat(auth): add OAuth2 Google provider

# Bug fix
fix(router): handle trailing slashes correctly

# Documentation
docs(readme): add installation instructions

# Breaking change
feat(api)!: change response format

BREAKING CHANGE: Response now returns { data, meta } instead of raw data
```

## 🐛 Reporting Bugs

Before reporting a bug:

1. Search existing issues to avoid duplicates
2. Try to reproduce with the latest version

When reporting, include:

- **Title:** Clear, descriptive title
- **Environment:** Bun version, OS, AstraAPI version
- **Steps to Reproduce:** Minimal code to reproduce
- **Expected Behavior:** What you expected to happen
- **Actual Behavior:** What actually happened
- **Additional Context:** Screenshots, logs, etc.

### Bug Report Template

```markdown
**Describe the bug**
A clear description of the bug.

**To Reproduce**
```typescript
// Minimal code to reproduce
```

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g., Windows 11]
- Bun version: [e.g., 1.0.0]
- AstraAPI version: [e.g., 1.0.0]

**Additional context**
Any other context about the problem.
```

## 💡 Suggesting Features

We love feature suggestions! Before suggesting:

1. Check if it's already been suggested
2. Consider if it fits the project scope

When suggesting, include:

- **Problem:** What problem does this solve?
- **Solution:** How would you like it to work?
- **Alternatives:** Other solutions you've considered
- **Examples:** Code examples if possible

---

## 🙏 Thank You!

Every contribution, no matter how small, is valued. Whether you're fixing a typo, reporting a bug, or implementing a major feature, you're helping make AstraAPI better for everyone.

**Happy coding!** 🧘

---

<p align="center">
  <a href="https://github.com/Mohammad007/astraapi">GitHub</a> •
  <a href="https://discord.gg/astraapi">Discord</a> •
  <a href="https://twitter.com/astraapi">Twitter</a>
</p>
