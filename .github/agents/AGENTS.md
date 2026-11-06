---
name: AGENTS.md
description: "Android Development Agents Team — Complete guide to specialized agents for Android projects"
---

# 🚀 Android Development Agents Team

This workspace includes a comprehensive team of specialized agents for Android development. Each agent is an expert in their domain and can be invoked for specific tasks.

## Quick Reference

| Agent | When to Use | Key Skills |
|-------|------------|-----------|
| **mobile-analyst** | Requirements gathering, platform analysis, scope definition | Discovery, feasibility assessment, risk analysis |
| **android-developer** | Implement features, write Kotlin/Compose code, debug runtime issues | Kotlin, Jetpack Compose, coroutines, state management |
| **android-app-architect** | Design app architecture, multi-module structure, MVVM/CLEAN patterns | Architecture, Hilt, Room, WorkManager, navigation |
| **jetpack-compose-architect** | Optimize Compose performance, design component systems, solve recomposition issues | Composition, state hoisting, recomposition profiling, design tokens |
| **material-design-3-architect** | Implement M3 components, dynamic theming, accessible UI design | Material Design 3, color systems, typography, accessibility |
| **gradle-build-specialist** | Configure build system, optimize compile time, manage dependencies | Gradle, AGP, version catalogs, R8, KSP, build caching |
| **android-performance-specialist** | Profile performance, reduce jank, optimize memory/battery, improve Play Vitals | Profiling, baseline profiles, ANR debugging, memory leaks |
| **mobile-qa** | Plan testing strategy, write tests, verify accessibility, manage QA automation | Unit tests, UI tests, accessibility, test architecture |

## How to Use These Agents

### 1. Direct Invocation in Chat

Simply mention the agent name when asking for help:

```
@android-developer: How do I implement a list of products with Jetpack Compose?

@jetpack-compose-architect: I have recomposition issues in my product list. Help optimize it.

@mobile-qa: Create a comprehensive test suite for the product feature.
```

### 2. Task-Based Workflow

For complex tasks, chain multiple agents:

```
1. Start with @mobile-analyst to define requirements
   → Output: Requirements document, scope definition

2. Use @android-app-architect to design the architecture
   → Output: Architecture diagram, module structure

3. Have @android-developer implement the feature
   → Output: Production code

4. Use @material-design-3-architect to apply M3 design
   → Output: Styled, accessible UI

5. Have @mobile-qa write comprehensive tests
   → Output: Test suite

6. Use @android-performance-specialist to profile & optimize
   → Output: Performance optimizations, baseline profiles
```

## Project Context: ProyectoLectorV

This workspace is set up for **ProyectoLectorV** — a web-based product/expiry tracking app currently built with:
- **Frontend**: React/Vue/Vite
- **Backend**: Supabase
- **Purpose**: Track product expiration dates, waste analytics

### Android Migration Path

If migrating ProyectoLectorV to Android, these agents will handle:

1. **mobile-analyst** → Identify mobile-specific constraints
2. **android-app-architect** → Design MVVM architecture with Room for offline
3. **android-developer** → Implement core features (product list, OCR integration)
4. **jetpack-compose-architect** → Build high-performance UI
5. **material-design-3-architect** → Apply cohesive design system
6. **gradle-build-specialist** → Optimize multi-module build
7. **android-performance-specialist** → Ensure smooth 60 FPS experience
8. **mobile-qa** → Test across devices and configurations

## Agent Communication Protocol

When requesting agent help:

### ✅ Good Request

```
@android-app-architect: I need to design an architecture for a product 
inventory app with offline support. Requirements:
- Room database for local persistence
- Sync with Supabase API
- Product search & filtering
- Batch operations

Please provide:
1. Module structure (feature vs core layers)
2. Data flow diagram
3. Repository pattern example for Product feature
```

### ❌ Vague Request

```
@android-developer: Make my app better
```

## Expected Outputs by Agent

### mobile-analyst
- **Requirements matrix** (must-have vs nice-to-have)
- **Risk register** with mitigation strategies
- **Phased scope** (MVP, Phase 2, etc.)
- **Assumptions & open questions**

### android-developer
- **Production-ready code** in Kotlin
- **Code review checklist** items verified
- **Debugging steps** if issues arise

### android-app-architect
- **Architecture diagrams** (module structure, data flow)
- **Module configuration** (build.gradle.kts snippets)
- **Repository pattern examples** for key features

### jetpack-compose-architect
- **Composable component designs** (stateless, reusable)
- **Performance optimization** recommendations
- **State management patterns** for your use case

### material-design-3-architect
- **Color token system** (ColorScheme, typography)
- **Component examples** using M3 standards
- **Accessibility checklist** for WCAG compliance

### gradle-build-specialist
- **Build configuration** (build.gradle.kts, Gradle properties)
- **Version catalog** (gradle/libs.versions.toml)
- **Build time analysis** & optimization recommendations

### android-performance-specialist
- **Performance profiling results** (CPU, memory, frame rate)
- **Baseline profile generation** script
- **Optimization roadmap** with estimated improvements

### mobile-qa
- **Test strategy document** (test pyramid breakdown)
- **Test code** (JUnit 4, Compose tests, integration tests)
- **Accessibility test checklist**

## Common Team Workflows

### Workflow 1: Implement a New Feature

```
Step 1: Requirements (mobile-analyst)
  → "We need a product search feature with filters"

Step 2: Design (android-app-architect)
  → "Here's the ViewModel, Repository, and data layer structure"

Step 3: Compose UI (jetpack-compose-architect)
  → "Here's the SearchScreen composable with optimal recomposition"

Step 4: Material Design (material-design-3-architect)
  → "Apply M3 tokens for consistent theming"

Step 5: Implementation (android-developer)
  → "Here's the complete implementation with error handling"

Step 6: Testing (mobile-qa)
  → "Unit tests, UI tests, and accessibility tests"

Step 7: Performance (android-performance-specialist)
  → "Memory profile: 45MB peak, frame rate: 60 FPS stable"
```

### Workflow 2: Debug Performance Issue

```
Step 1: Identify issue (android-performance-specialist)
  → Profile with Android Profiler
  → Find jank in product list scrolling

Step 2: Design fix (jetpack-compose-architect)
  → Optimize recomposition with key()
  → Hoist state properly

Step 3: Implementation (android-developer)
  → Apply fixes to composables

Step 4: Verify (mobile-qa)
  → Regression testing
  → Frame rate validation
```

### Workflow 3: Set Up Multi-Module Architecture

```
Step 1: Architecture (android-app-architect)
  → Define module structure and dependencies

Step 2: Gradle setup (gradle-build-specialist)
  → Create version catalog
  → Configure multi-module build

Step 3: Implement (android-developer)
  → Create feature modules with proper structure
```

## Tips for Getting the Best Responses

### 1. Provide Context
❌ "How do I use Hilt?"
✅ "I need to set up dependency injection for a product repository that fetches from both Room and Retrofit API. The repository needs to be injected into ViewModels. Show me the Hilt module setup."

### 2. Specify Constraints
❌ "Design a database"
✅ "Design a Room database for product inventory with: products table (id, name, price, expiryDate), categories table (id, name), and a many-to-many relationship. Need fast search on product name."

### 3. Request Actionable Output
❌ "Tell me about testing"
✅ "Write a unit test for ProductViewModel.loadProducts() that verifies: (1) repository.getProducts() is called, (2) uiState updates to Success with products, (3) error state on exception."

### 4. Include Your Current Approach (if applicable)
✅ "I'm using Jetpack Compose with a ProductViewModel. My ProductList composable is recomposing every time a single product changes. Here's my code: [paste code]. How do I fix this?"

## Agent Specialization Matrix

```
Task                              Best Agent           Secondary Agents
─────────────────────────────────────────────────────────────────────────
Define MVP scope                  mobile-analyst       android-app-architect
Design architecture               android-app-architect mobile-analyst
Implement Compose UI              android-developer    jetpack-compose-architect
Optimize recomposition            jetpack-compose-architect android-developer
Apply Material Design 3           material-design-3-architect jetpack-compose-architect
Configure Gradle/build            gradle-build-specialist android-app-architect
Generate baseline profiles        android-performance-specialist gradle-build-specialist
Profile performance/jank          android-performance-specialist android-developer
Write unit tests                  mobile-qa            android-developer
Write UI tests                    mobile-qa            jetpack-compose-architect
Accessibility audit               mobile-qa            material-design-3-architect
Debug ANR                         android-performance-specialist android-developer
Optimize memory leaks             android-performance-specialist mobile-qa
Setup Hilt/DI                     android-app-architect android-developer
Design Room schema                android-app-architect android-developer
Implement WorkManager             android-app-architect android-developer
```

## Integration with Development Workflow

### Daily Development
- **Code**: Use **android-developer**
- **Architecture decisions**: Consult **android-app-architect**
- **Performance concerns**: Ask **android-performance-specialist**
- **UI/UX questions**: Discuss with **jetpack-compose-architect** + **material-design-3-architect**

### Pull Request Review
- **Code review**: **android-developer** can validate patterns
- **Architecture**: **android-app-architect** ensures design adherence
- **Tests**: **mobile-qa** ensures coverage and quality
- **Performance**: **android-performance-specialist** catches regressions

### Sprint Planning
- **Requirements**: **mobile-analyst** defines scope
- **Architecture**: **android-app-architect** estimates complexity
- **QA**: **mobile-qa** defines test strategy
- **Performance**: **android-performance-specialist** sets baselines

## Troubleshooting Agent Responses

| Issue | Solution |
|-------|----------|
| Agent response too generic | Add specific code examples or constraints to your request |
| Agent gave outdated Android API advice | Remind the agent about target API level (34+) and modern patterns |
| Need more detail on specific aspect | Ask follow-up questions with `@agent-name` — they retain context |
| Agent missed your constraint | Rephrase request with constraint listed first |
| Want code in Kotlin DSL (not Groovy) | Explicitly request "Kotlin DSL build.gradle.kts" format |

## Best Practices for Team Coordination

1. **Clear Ownership**: Assign one primary agent per task, consult secondary agents as needed
2. **Documentation**: Have mobile-analyst document decisions for future reference
3. **Incremental Builds**: Let android-app-architect review module dependencies regularly
4. **Continuous Testing**: mobile-qa should be involved from feature design, not just at end
5. **Performance From Day 1**: android-performance-specialist should set baselines early
6. **Accessibility First**: material-design-3-architect should design with WCAG in mind from start

## Contact Patterns

**To start a feature implementation:**
```
@mobile-analyst: Gather requirements for [feature]
→ @android-app-architect: Design architecture
→ @android-developer: Implement
→ @mobile-qa: Test
```

**To debug a performance issue:**
```
@android-performance-specialist: Profile this issue
→ @jetpack-compose-architect: Optimize compose
→ @android-developer: Implement fix
→ @mobile-qa: Verify no regression
```

**For design system consistency:**
```
@material-design-3-architect: Review component design
→ @jetpack-compose-architect: Implement composable
→ @mobile-qa: Test accessibility
```

---

**Team Lead**: Use this AGENTS.md as your playbook for coordinating specialist agents. Refer to individual agent files for deep technical guidance.

