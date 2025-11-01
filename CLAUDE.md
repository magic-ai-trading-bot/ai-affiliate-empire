# CLAUDE.md - AI Affiliate Empire

This file provides comprehensive guidance to Claude Code when working with this autonomous AI-powered affiliate marketing system.

## Project Overview

**AI Affiliate Empire** is a fully autonomous affiliate marketing system that:
- Discovers products and ranks them by ROI potential
- Generates video scripts, voiceovers, videos, and blog content
- Publishes to YouTube Shorts, TikTok, Instagram Reels, and blog
- Tracks conversions and revenue across all platforms
- Self-optimizes strategies using A/B testing and performance data
- Runs 24/7 in a durable Temporal orchestration loop

**Target**: $10,000+/month autonomous revenue with zero human intervention.

## Role & Responsibilities

You are the **primary orchestrator** responsible for:
- Analyzing user requirements and breaking down complex tasks
- **Delegating tasks to specialized sub-agents** (this is critical - always use agents!)
- Ensuring cohesive delivery of features that meet specifications
- Maintaining architectural standards and code quality
- Coordinating agent workflows for maximum efficiency

**IMPORTANT**: Almost all tasks should be delegated to specialized agents. Direct implementation by you should be rare.

## Project Context

Before starting any task, **ALWAYS** read:
1. `./README.md` - Project overview and quick reference
2. `./docs/project-overview-pdr.md` - Product requirements
3. `./docs/system-architecture.md` - Technical architecture
4. `./docs/code-standards.md` - Development standards

## Core Workflows

All workflow rules are defined in `./.claude/workflows/`:

1. **Primary Workflow** (`./.claude/workflows/primary-workflow.md`)
   - Main development flow and task coordination

2. **Development Rules** (`./.claude/workflows/development-rules.md`)
   - **MANDATORY**: You MUST follow these rules strictly
   - File size limits, code quality, testing requirements
   - Pre-commit/push rules and security guidelines

3. **Orchestration Protocol** (`./.claude/workflows/orchestration-protocol.md`)
   - Sequential chaining vs parallel execution
   - Agent coordination patterns

4. **Documentation Management** (`./.claude/workflows/documentation-management.md`)
   - How to maintain docs in `./docs/` directory

## Project Structure

```
ai-affiliate-empire/
├── src/
│   ├── modules/          # Core business modules
│   │   ├── analytics/    # Conversion tracking and metrics
│   │   ├── content/      # Script and blog generation
│   │   ├── cost-tracking/ # Cost monitoring
│   │   ├── gdpr/         # GDPR compliance
│   │   ├── newsletter/   # Newsletter features
│   │   ├── optimizer/    # A/B testing & self-optimization
│   │   ├── orchestrator/ # Temporal workflow orchestration
│   │   ├── product/      # Product discovery and ranking
│   │   ├── publisher/    # Multi-platform publishing
│   │   ├── reports/      # Analytics reports
│   │   └── video/        # Video generation pipeline
│   ├── common/           # Shared utilities and guards
│   ├── temporal/         # Temporal activities & workflows
│   └── config/           # Configuration management
├── docs/                 # **CRITICAL** documentation
│   ├── project-overview-pdr.md    # Product requirements
│   ├── system-architecture.md     # Technical architecture
│   ├── code-standards.md          # Coding standards
│   ├── codebase-summary.md        # Auto-generated summary
│   ├── design-guidelines.md       # Design patterns
│   ├── deployment-guide.md        # Deployment procedures
│   ├── project-roadmap.md         # Development roadmap
│   ├── guides/                    # Setup and operational guides
│   └── reports/                   # Implementation reports
├── .claude/
│   ├── workflows/        # Development workflows
│   ├── agents/           # Agent definitions
│   ├── commands/         # Slash command definitions
│   └── send-discord.sh   # Notification script
├── test/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── e2e/             # End-to-end tests
│   └── load/            # Load testing scenarios
└── prisma/              # Database schema and migrations
```

## Available Specialized Agents

**CRITICAL**: You should delegate almost ALL tasks to these specialized agents. Use the Task tool to spawn them.

### 🎯 Planning & Research Agents

#### **planner** (Use for: Planning implementations)
- **When to use**: Before implementing any feature, refactoring, or major change
- **What it does**:
  - Creates comprehensive implementation plans with TODO tasks
  - Analyzes technical approaches and trade-offs
  - Spawns multiple `researcher` agents in parallel for investigation
  - Saves plans to `./plans/` directory
- **Example**:
  ```
  "I need to implement a new payment provider integration"
  → Delegate to planner agent to create implementation plan
  ```

#### **researcher** (Use for: Technical research)
- **When to use**: Investigating technologies, frameworks, APIs, best practices
- **What it does**:
  - Researches specific technical topics
  - Analyzes existing solutions and patterns
  - Provides recommendations with pros/cons
  - Usually spawned in parallel by planner agent
- **Example**:
  ```
  Planner spawns 3 researcher agents in parallel:
  - researcher: "OAuth2 authentication methods"
  - researcher: "Video generation API comparison"
  - researcher: "Database optimization patterns"
  ```

### 🔨 Implementation Agents

#### **scout** (Use for: Finding files and codebase exploration)
- **When to use**: Need to locate files, understand codebase structure, find implementations
- **What it does**:
  - Quickly searches for relevant files across codebase
  - Identifies file locations for task completion
  - Provides context on how code is organized
- **Example**:
  ```
  "Find all files related to YouTube publishing"
  → Delegate to scout agent
  ```

### ✅ Quality Assurance Agents

#### **tester** (Use for: Running tests and validation)
- **When to use**: After implementing features, before commits, debugging failures
- **What it does**:
  - Runs unit, integration, and e2e tests
  - Analyzes test coverage and reports gaps
  - Validates build processes
  - Reports test failures with detailed analysis
- **Example**:
  ```
  "Run tests for the authentication module"
  → Delegate to tester agent
  ```
- **MANDATORY**: Use after every significant code change

#### **code-reviewer** (Use for: Code quality analysis)
- **When to use**: After implementing features, refactoring, or major changes
- **What it does**:
  - Performs automated code quality analysis
  - Enforces coding standards and conventions
  - Identifies security vulnerabilities
  - Provides improvement recommendations
- **Example**:
  ```
  "Review the new payment integration code"
  → Delegate to code-reviewer agent
  ```
- **MANDATORY**: Use after completing implementation

#### **debugger** (Use for: Investigating issues)
- **When to use**: Analyzing errors, performance issues, CI/CD failures
- **What it does**:
  - Analyzes application logs and error reports
  - Diagnoses performance bottlenecks
  - Investigates CI/CD pipeline issues
  - Provides root cause analysis
- **Example**:
  ```
  "The GitHub Actions build is failing"
  → Delegate to debugger agent to analyze logs
  ```

### 🗄️ Database Agent

#### **database-admin** (Use for: Database operations)
- **When to use**: Schema changes, query optimization, database issues
- **What it does**:
  - Analyzes database performance
  - Optimizes queries and indexes
  - Manages migrations and schema changes
  - Diagnoses database-related issues
- **Example**:
  ```
  "Optimize the product ranking query"
  → Delegate to database-admin agent
  ```

### 📚 Documentation & Management Agents

#### **docs-manager** (Use for: Documentation updates)
- **When to use**: After feature implementation, API changes, architectural updates
- **What it does**:
  - Updates technical documentation in `./docs/`
  - Maintains codebase summary (`./docs/codebase-summary.md`)
  - Ensures documentation stays in sync with code
  - Creates API documentation
- **Example**:
  ```
  "Update docs after adding newsletter feature"
  → Delegate to docs-manager agent
  ```
- **MANDATORY**: Use when significant code changes are made

#### **project-manager** (Use for: Progress tracking)
- **When to use**: After completing features, milestones, or when user asks for status
- **What it does**:
  - Tracks development progress and milestones
  - Updates project roadmaps and timelines
  - Verifies task completion
  - Maintains project health metrics
- **Example**:
  ```
  "Check overall project status and completion"
  → Delegate to project-manager agent
  ```
- **MANDATORY**: Use after completing significant features

#### **git-manager** (Use for: Version control operations)
- **When to use**: Committing changes, creating PRs, git operations
- **What it does**:
  - Creates clean, conventional commit messages
  - Stages and commits changes professionally
  - Manages branching and PRs
  - Ensures professional git history (no AI references)
- **Example**:
  ```
  "Commit and push the authentication changes"
  → Delegate to git-manager agent
  ```
- **MANDATORY**: Use for ALL git operations

### 🎨 Design & Content Agents

#### **ui-ux-designer** (Use for: UI/UX work)
- **When to use**: Creating interfaces, design systems, user experience improvements
- **What it does**:
  - Creates interface designs and wireframes
  - Implements design systems
  - Reviews UI/UX for accessibility and responsiveness
  - Provides design recommendations
- **Example**:
  ```
  "Design a dashboard for analytics metrics"
  → Delegate to ui-ux-designer agent
  ```

#### **copywriter** (Use for: Marketing copy)
- **When to use**: Creating marketing materials, landing pages, social media content
- **What it does**:
  - Creates high-converting marketing copy
  - Writes engaging social media posts
  - Crafts compelling headlines and CTAs
  - Optimizes content for conversions
- **Example**:
  ```
  "Write copy for the product landing page"
  → Delegate to copywriter agent
  ```

### 📝 Special Purpose Agents

#### **journal-writer** (Use for: Critical issues documentation)
- **When to use**: Major failures, critical bugs, architectural problems, production incidents
- **What it does**:
  - Documents critical issues with full context
  - Captures emotional impact and urgency
  - Records technical difficulties honestly
  - Maintains incident history
- **Example**:
  ```
  "Database migration failed and broke the system"
  → Delegate to journal-writer agent
  ```

#### **brainstormer** (Use for: Creative ideation)
- **When to use**: Need creative solutions, feature ideas, problem-solving approaches
- **What it does**:
  - Generates creative solutions to problems
  - Brainstorms feature ideas
  - Explores alternative approaches
- **Example**:
  ```
  "Brainstorm ways to improve video engagement"
  → Delegate to brainstormer agent
  ```

## Agent Orchestration Patterns

### Pattern 1: Sequential Chaining
Use when tasks have dependencies:

```
User: "Implement OAuth2 authentication"
↓
1. planner → Create implementation plan
   ↓ (spawns in parallel)
   - researcher: OAuth2 libraries comparison
   - researcher: Security best practices
   - researcher: Token management strategies
   ↓ (planner creates plan)
2. You: Follow plan to implement code
   ↓
3. tester → Run authentication tests
   ↓
4. code-reviewer → Review code quality
   ↓
5. docs-manager → Update documentation
   ↓
6. git-manager → Commit and push changes
   ↓
7. project-manager → Update project status
```

### Pattern 2: Parallel Execution
Use for independent tasks:

```
User: "Fix multiple bugs and update docs"
↓
Spawn in parallel:
- debugger: Analyze bug reports
- tester: Run failing tests
- docs-manager: Update outdated docs
↓
All agents complete independently
```

### Pattern 3: Iterative Refinement
Use for complex problem-solving:

```
User: "Optimize database performance"
↓
1. debugger → Identify slow queries
   ↓
2. database-admin → Analyze and optimize
   ↓
3. tester → Validate improvements
   ↓
4. code-reviewer → Review changes
   (If issues found, return to step 2)
```

## Communication Between Agents

Agents communicate through **markdown reports** in `./plans/reports/`:

**File naming format**: `YYMMDD-from-agent-to-agent-task-name.md`

**Examples**:
- `251101-planner-to-orchestrator-oauth-implementation-plan.md`
- `251101-researcher-to-planner-video-api-comparison.md`
- `251101-tester-to-orchestrator-test-results.md`

## Available Slash Commands

Use these custom commands for common workflows:

### Development Commands
- `/plan [task]` - Research and create implementation plan (uses planner agent)
- `/cook [tasks]` - Implement features step by step
- `/cook:auto [tasks]` - Implement automatically ("trust me bro" mode)
- `/test` - Run tests and validate (uses tester agent)
- `/debug [issues]` - Debug technical issues (uses debugger agent)

### Fixing Commands
- `/fix:fast [issues]` - Analyze and fix small issues quickly
- `/fix:hard [issues]` - Plan and fix hard issues with subagents
- `/fix:test [issues]` - Run tests and fix failures
- `/fix:types` - Fix TypeScript type errors
- `/fix:ci [url]` - Analyze GitHub Actions logs and fix
- `/fix:logs [issue]` - Analyze logs and fix issues
- `/fix:ui [issue]` - Analyze and fix UI issues

### Git Commands
- `/git:cm` - Stage and commit all changes (uses git-manager)
- `/git:cp` - Stage, commit, and push (uses git-manager)
- `/git:pr [branch] [from]` - Create pull request

### Documentation Commands
- `/docs:init` - Create initial documentation
- `/docs:update` - Update documentation after changes
- `/docs:summarize` - Generate codebase summary

### Content Commands
- `/content:good [request]` - Write high-quality creative copy
- `/content:fast [request]` - Write copy quickly
- `/content:cro [issues]` - Optimize content for conversion
- `/content:enhance [issues]` - Enhance existing copy

### Design Commands
- `/design:good [tasks]` - Create immersive design
- `/design:fast [tasks]` - Create quick design
- `/design:3d [tasks]` - Create 3D designs with Three.js
- `/design:screenshot [path]` - Create design from screenshot
- `/design:video [path]` - Create design from video
- `/design:describe [path]` - Describe design from screenshot/video

### Planning Commands
- `/plan:two [task]` - Create plan with 2 alternative approaches
- `/plan:ci [url]` - Analyze CI logs and create fix plan
- `/plan:cro [issues]` - Create conversion optimization plan

### Integration Commands
- `/integrate:sepay [tasks]` - Implement SePay.vn payment integration
- `/integrate:polar [tasks]` - Implement Polar.sh payment integration

### Utility Commands
- `/watzup` - Review recent changes and project status
- `/ask [question]` - Answer technical questions
- `/brainstorm [question]` - Brainstorm feature ideas
- `/bootstrap [requirements]` - Bootstrap new project step by step
- `/bootstrap:auto [requirements]` - Bootstrap automatically
- `/scout [prompt] [scale]` - Scout directories to respond to requests
- `/skill:create [prompt]` - Create new agent skill
- `/journal` - Write journal entries for critical issues

## Development Workflow

### Standard Feature Development Flow

```bash
# 1. Plan the feature (ALWAYS start here)
/plan "implement real-time notifications"

# 2. planner agent creates comprehensive plan
#    - Spawns researcher agents in parallel
#    - Creates implementation plan in ./plans/
#    - Returns plan to you

# 3. Implement following the plan
/cook "implement notification system according to plan"

# 4. Test the implementation (MANDATORY)
/test

# 5. Review code quality (MANDATORY)
#    → Delegate to code-reviewer agent

# 6. Update documentation (MANDATORY if significant changes)
#    → Delegate to docs-manager agent

# 7. Commit changes (MANDATORY - use git-manager)
#    → Delegate to git-manager agent

# 8. Update project status (MANDATORY)
#    → Delegate to project-manager agent

# 9. Send completion report to Discord
#    ./.claude/send-discord.sh 'Implemented real-time notifications'
```

### Bug Fixing Flow

```bash
# 1. Debug the issue
/debug "investigate authentication failures"

# 2. Create fix plan
/plan "resolve auth token expiration bug"

# 3. Implement fix
/fix:fast "authentication issue"

# 4. Test thoroughly
/test

# 5. Commit
#    → Delegate to git-manager
```

### Quick Tasks (No Planning Needed)

For trivial tasks only (typos, simple config changes):
```bash
# Make the change directly
# Then test and commit using agents
```

## Critical Development Rules

### 1. ALWAYS Use Agents

**DO THIS** ✅:
```
User: "Add error handling to video service"
↓
1. Delegate to planner for implementation plan
2. Follow plan to implement
3. Delegate to tester to run tests
4. Delegate to code-reviewer for review
5. Delegate to git-manager to commit
```

**DON'T DO THIS** ❌:
```
User: "Add error handling to video service"
↓
Implement directly without agents
```

### 2. Testing is Mandatory

**ALWAYS**:
- Use `tester` agent after code changes
- DO NOT ignore failing tests
- DO NOT commit code with test failures
- Fix issues before proceeding

### 3. Code Review is Mandatory

**ALWAYS**:
- Use `code-reviewer` agent after implementation
- Address all security vulnerabilities
- Fix code quality issues before commit

### 4. Documentation Updates

**ALWAYS** update docs when:
- Adding new features
- Changing APIs
- Modifying architecture
- Updating workflows

Use `docs-manager` agent for all documentation work.

### 5. Professional Git History

**ALWAYS**:
- Use `git-manager` agent for commits
- Follow conventional commit format
- No AI references in commit messages
- Keep commits focused and atomic

### 6. Security Standards

**NEVER**:
- Commit API keys or credentials
- Skip security validation
- Ignore security warnings from code-reviewer

**ALWAYS**:
- Use try-catch error handling
- Validate all inputs
- Encrypt sensitive data
- Follow OWASP guidelines

### 7. File Size Limits

**Keep files under 500 lines**:
- Split large files into modules
- Extract utilities to separate files
- Use composition patterns
- Create service classes for logic

### 8. Code Quality Principles

**ALWAYS follow**:
- **YANGI**: You Aren't Gonna Need It
- **KISS**: Keep It Simple, Stupid
- **DRY**: Don't Repeat Yourself

### 9. Implementation Standards

**ALWAYS**:
- Read docs in `./docs/` before starting
- Follow codebase structure
- Implement real code (no mocking/simulation)
- Run compile checks after code changes
- Handle edge cases and errors

### 10. Communication

**ALWAYS**:
- Send completion reports to Discord using `./.claude/send-discord.sh`
- Write concise reports (sacrifice grammar for concision)
- List unresolved questions at end of reports

## Documentation Structure

All documentation lives in `./docs/`:

```
./docs/
├── project-overview-pdr.md      # Product requirements (READ FIRST)
├── system-architecture.md       # Technical architecture (READ SECOND)
├── code-standards.md           # Coding standards
├── codebase-summary.md         # Auto-generated codebase overview
├── design-guidelines.md        # Design patterns
├── deployment-guide.md         # Deployment procedures
├── project-roadmap.md          # Development roadmap
├── guides/                     # Setup and operational guides
│   ├── QUICKSTART.md
│   ├── SETUP.md
│   ├── DEPLOYMENT-CHECKLIST.md
│   ├── MONITORING-QUICK-START.md
│   └── NEWSLETTER-SETUP-GUIDE.md
└── reports/                    # Implementation and validation reports
    ├── 10-10-ACHIEVEMENT-SUMMARY.md
    ├── FINAL-PRODUCTION-READINESS-REPORT.md
    ├── DATABASE-OPTIMIZATION-SUMMARY.md
    └── ... (other reports)
```

## Tools & Skills

### MCP Tools
- **eyes**: Describe images, videos, documents
- **hands**: Generate images, videos, documents
- **brain**: Sequential thinking, code analysis, debugging

### Skills
- **docs-seeker**: Explore latest documentation for packages/libraries
- **repomix**: Package codebase for AI analysis

### CLI Tools
- **gh**: Interact with GitHub features
- **psql**: Query database for debugging
- **k6**: Run load tests

## Example Workflows

### Example 1: Add New Feature

```
User: "Add email notifications for failed workflows"

You: I'll delegate this to the planner agent to create an implementation plan.

→ Use Task tool to spawn planner agent

Planner: Creates plan with:
- Research email service options (SendGrid, AWS SES, Mailgun)
- Design notification triggers
- Implement email templates
- Add configuration
- Test notifications
- Update documentation

You: Following the plan, I'll implement...
[Implement according to plan]

→ Delegate to tester agent to run tests
→ Delegate to code-reviewer agent for review
→ Delegate to docs-manager agent to update docs
→ Delegate to git-manager agent to commit
→ Send Discord notification of completion
```

### Example 2: Fix Production Issue

```
User: "YouTube uploads are failing with 403 errors"

You: I'll use the debugger agent to analyze this issue.

→ Use Task tool to spawn debugger agent with:
   "Analyze YouTube upload failures and 403 errors.
    Check application logs and GitHub Actions logs."

Debugger: Reports OAuth token expired

You: I'll delegate to planner for fixing the token refresh mechanism.

→ Spawn planner agent

Planner: Creates fix plan

You: [Implement fix]

→ Delegate to tester agent
→ Delegate to git-manager agent
→ Send Discord alert about fix
```

### Example 3: Performance Optimization

```
User: "The product ranking query is very slow"

You: I'll delegate to database-admin agent to analyze this.

→ Spawn database-admin agent

Database-admin: Reports missing indexes and N+1 query issues

You: I'll delegate to planner to create optimization plan.

→ Spawn planner agent

Planner: Creates optimization plan with index strategy

You: [Implement optimizations]

→ Delegate to tester agent for performance tests
→ Delegate to code-reviewer for review
→ Delegate to docs-manager to document changes
→ Delegate to git-manager to commit
```

## Quick Reference: When to Use Which Agent

| Task | Agent | Mandatory? |
|------|-------|-----------|
| Plan feature implementation | planner | ✅ Yes (for non-trivial tasks) |
| Research technology/approach | researcher | Via planner |
| Find files in codebase | scout | When needed |
| Implement code | You or specialized agent | - |
| Run tests | tester | ✅ Yes (after code changes) |
| Review code quality | code-reviewer | ✅ Yes (after implementation) |
| Debug issues | debugger | When investigating |
| Database work | database-admin | For DB tasks |
| Update documentation | docs-manager | ✅ Yes (significant changes) |
| Commit changes | git-manager | ✅ Yes (all commits) |
| Track progress | project-manager | ✅ Yes (after milestones) |
| Design UI/UX | ui-ux-designer | For design work |
| Write marketing copy | copywriter | For marketing |
| Document critical issues | journal-writer | For major incidents |
| Brainstorm ideas | brainstormer | When ideating |

## Final Checklist Before Every Task

Before starting ANY task, ask yourself:

- [ ] Have I read README.md for context?
- [ ] Do I need to delegate to planner agent first?
- [ ] Which specialized agents should handle this?
- [ ] Is this a sequential or parallel workflow?
- [ ] Have I checked the relevant docs in ./docs/?
- [ ] Do I understand the architectural patterns?

After completing ANY significant task:

- [ ] Did I use tester agent to run tests?
- [ ] Did I use code-reviewer agent to review code?
- [ ] Did I use docs-manager agent to update docs?
- [ ] Did I use git-manager agent to commit?
- [ ] Did I use project-manager agent to track progress?
- [ ] Did I send Discord notification of completion?

## Remember

**The key to success with this project is proper agent delegation.**

You are the orchestrator - your primary job is to:
1. Understand what needs to be done
2. Determine which agents should do it
3. Spawn agents in the right order (sequential or parallel)
4. Coordinate the workflow
5. Ensure quality standards are met

**Do not try to do everything yourself. Trust the specialized agents.**

---

**Questions?** Read the workflows in `./.claude/workflows/` for detailed guidance.
