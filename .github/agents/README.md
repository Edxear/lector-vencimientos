# 🏗️ Android Agents Team

This directory contains specialized AI agents for Android development, each expertly trained in their domain.

## Quick Start

Each `.agent.md` file defines a specialized agent that can be invoked in Copilot chat. Simply type `@agent-name` to start using them.

### Available Agents (8 specialists)

1. **mobile-analyst** — Requirements discovery and platform analysis
2. **android-developer** — Kotlin/Compose implementation and debugging
3. **android-app-architect** — MVVM, multi-module, DI architecture
4. **jetpack-compose-architect** — UI composition and performance optimization
5. **material-design-3-architect** — Design system and accessibility
6. **gradle-build-specialist** — Build configuration and optimization
7. **android-performance-specialist** — Performance profiling and optimization
8. **mobile-qa** — Testing strategy and automation

## Using the Agents

### In Chat
```
@android-developer: How do I implement a product list with Jetpack Compose?

@jetpack-compose-architect: I'm seeing jank in my scrolling list. Help optimize it.

@mobile-qa: Create comprehensive tests for the product feature.
```

### Team Workflows
See [AGENTS.md](./AGENTS.md) for:
- When to use each agent
- Multi-agent workflows for complex features
- Troubleshooting guide
- Best practices for team coordination

## Agent Files Overview

| Agent File | Focus Area | Key Domains |
|---|---|---|
| `mobile-analyst.agent.md` | Requirements & Discovery | User needs, platform constraints, feasibility |
| `android-developer.agent.md` | Implementation | Kotlin, Compose, coroutines, state management |
| `android-app-architect.agent.md` | Architecture Design | MVVM, CLEAN, Hilt, Room, WorkManager, multi-module |
| `jetpack-compose-architect.agent.md` | UI Architecture | Composition, state hoisting, recomposition, performance |
| `material-design-3-architect.agent.md` | Design System | M3 tokens, theming, accessibility (WCAG) |
| `gradle-build-specialist.agent.md` | Build System | Gradle, AGP, version catalogs, R8, KSP, performance |
| `android-performance-specialist.agent.md` | Performance | Profiling, jank, ANR, memory leaks, battery, Play Vitals |
| `mobile-qa.agent.md` | Quality Assurance | Unit tests, UI tests, accessibility, automation |
| `AGENTS.md` | **Team Coordination** | **Workflows, integration, best practices** |

## Project Context: ProyectoLectorV

This workspace is configured for **ProyectoLectorV**, a product/expiry tracking application.

**Current Stack**: React/Vite + Supabase backend
**Android Migration**: These agents provide expert guidance for Android port

## Getting Most from Agents

### Be Specific
✅ "I need to implement a product search with category filters. How do I structure the ViewModel and Repository?"
❌ "How do I make a search feature?"

### Provide Context
✅ "My ProductList recomposes when unrelated state changes. Here's my code: [paste code]"
❌ "My app is slow"

### Request Actionable Output
✅ "Generate a unit test for ProductViewModel.loadProducts() that verifies error handling"
❌ "Tell me about testing"

## Recommended Workflows

### 🎯 Implement a Feature
`mobile-analyst` → `android-app-architect` → `android-developer` → `jetpack-compose-architect` → `mobile-qa` → `android-performance-specialist`

### 🐛 Debug Performance Issue
`android-performance-specialist` → `jetpack-compose-architect` → `android-developer` → `mobile-qa`

### 🏗️ Setup Multi-Module Project
`android-app-architect` → `gradle-build-specialist` → `android-developer`

### ✨ Apply Design System
`material-design-3-architect` → `jetpack-compose-architect` → `mobile-qa`

## Tips & Tricks

- **Multiple agents on one task**: Ask one agent, then ask follow-up with another agent for different perspective
- **Code generation**: Include specific requirements, constraints, and API levels (target 34+)
- **Architecture review**: Have `android-app-architect` validate decisions before coding
- **Testing early**: Involve `mobile-qa` from design phase, not just at end
- **Performance baseline**: Ask `android-performance-specialist` to set metrics early in development

## File Format: .agent.md

Each file uses YAML frontmatter + Markdown body:

```markdown
---
name: agent-name
description: "Use when: specific scenarios; key capabilities"
model: claude-sonnet-5
reasoning_effort: high
tool_restrictions: [optional tool limits]
---

# Agent Name

Agent expertise and guidelines...
```

The `description` field is how Copilot discovers when to load each agent.

## Troubleshooting

| Issue | Fix |
|---|---|
| Agent not appearing | Check frontmatter YAML syntax, ensure `description` is quoted if contains colons |
| Generic response | Add specific requirements, constraints, and code examples |
| Wrong agent loaded | Use `@agent-name` explicitly to invoke specific agent |
| Outdated advice | Specify target API level and mention you want modern patterns |

## Next Steps

1. **Read [AGENTS.md](./AGENTS.md)** for team coordination patterns
2. **Start a feature** by requesting help from `@mobile-analyst`
3. **Build confidence** by working with agents on small tasks first
4. **Establish team workflows** based on recommended patterns

---

**Version**: 1.0.0  
**Android API Level Target**: 26+ (API 34+ recommended)  
**Kotlin Version**: 1.9+  
**Jetpack Compose**: Material Design 3  
**Architecture**: MVVM + CLEAN + multi-module  

