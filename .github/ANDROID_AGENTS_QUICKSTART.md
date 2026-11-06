# 🚀 Android Agents Team — Quick Reference Guide

## 📋 What We Created

A comprehensive team of **8 specialized AI agents** for Android development, all configured in your ProyectoLectorV workspace.

### Location
```
C:\Users\exede\OneDrive\Desktop\ProyectoLectorV\.github\agents\
├── README.md (you are here)
├── AGENTS.md (team coordination guide)
├── mobile-analyst.agent.md
├── android-developer.agent.md
├── android-app-architect.agent.md
├── jetpack-compose-architect.agent.md
├── material-design-3-architect.agent.md
├── gradle-build-specialist.agent.md
├── android-performance-specialist.agent.md
└── mobile-qa.agent.md
```

## 🎯 Quick Start

### Invoke an Agent
In your Copilot chat, simply type:
```
@android-developer: How do I create a Compose list?
```

Or:
```
@mobile-qa: Write tests for my product feature
```

### The 8 Agents at a Glance

| # | Agent | Best For | Command |
|---|-------|----------|---------|
| 1 | 📱 **mobile-analyst** | Requirements, scope, feasibility | `@mobile-analyst: Define requirements for...` |
| 2 | 💻 **android-developer** | Code, implementation, debugging | `@android-developer: Implement feature X...` |
| 3 | 🏗️ **android-app-architect** | Architecture, MVVM, multi-module | `@android-app-architect: Design architecture for...` |
| 4 | 🎨 **jetpack-compose-architect** | Compose UI, performance, state | `@jetpack-compose-architect: Optimize recomposition...` |
| 5 | 🎭 **material-design-3-architect** | M3 design, theming, accessibility | `@material-design-3-architect: Apply Material Design...` |
| 6 | ⚙️ **gradle-build-specialist** | Build system, dependencies, optimization | `@gradle-build-specialist: Configure Gradle...` |
| 7 | ⚡ **android-performance-specialist** | Performance, profiling, jank, memory | `@android-performance-specialist: Profile this...` |
| 8 | ✅ **mobile-qa** | Testing, accessibility, QA automation | `@mobile-qa: Create test suite for...` |

## 🔄 Common Workflows

### Implement a New Feature (Recommended Flow)
```
1️⃣  @mobile-analyst
    "Define MVP scope for product search feature"
    ↓
2️⃣  @android-app-architect
    "Design MVVM architecture with Repository pattern"
    ↓
3️⃣  @android-developer
    "Implement ProductSearchViewModel and Repository"
    ↓
4️⃣  @jetpack-compose-architect
    "Optimize ProductSearchScreen recomposition"
    ↓
5️⃣  @material-design-3-architect
    "Apply Material Design 3 search bar and chips"
    ↓
6️⃣  @mobile-qa
    "Write unit, UI, and accessibility tests"
    ↓
7️⃣  @android-performance-specialist
    "Profile memory and frame rate performance"
```

### Fix a Performance Issue
```
1️⃣  @android-performance-specialist
    "My product list is janky when scrolling. Profile?"
    ↓
2️⃣  @jetpack-compose-architect
    "Optimize the ProductList recomposition"
    ↓
3️⃣  @android-developer
    "Implement the optimizations"
    ↓
4️⃣  @mobile-qa
    "Regression test to ensure no breaks"
```

### Setup Multi-Module Architecture
```
1️⃣  @android-app-architect
    "Design multi-module structure for features"
    ↓
2️⃣  @gradle-build-specialist
    "Configure Gradle with version catalogs"
    ↓
3️⃣  @android-developer
    "Implement feature modules"
```

## 📚 What Each Agent Knows

### 📱 mobile-analyst
**Specializes in**: Requirements discovery, scope definition, feasibility analysis
**Delivers**: Requirement matrices, risk registers, phased scope, assumptions
**Ask for**: 
- "Define MVP scope for Android app"
- "Identify platform constraints for migration"
- "Analyze feasibility of offline-first approach"

### 💻 android-developer
**Specializes in**: Kotlin, Jetpack Compose, coroutines, implementation
**Delivers**: Production code, debugging steps, code review checklists
**Ask for**:
- "Implement ProductViewModel with state management"
- "Write CoroutineScope-aware code for data fetching"
- "Debug ANR in product list screen"

### 🏗️ android-app-architect
**Specializes in**: MVVM, CLEAN, Hilt DI, Room, WorkManager, multi-module
**Delivers**: Architecture diagrams, module structure, Repository examples
**Ask for**:
- "Design 3-layer architecture for offline-capable app"
- "Setup Hilt dependency graph for repositories"
- "Design Room schema for products with categories"

### 🎨 jetpack-compose-architect
**Specializes in**: Composition, state hoisting, recomposition optimization
**Delivers**: Composable designs, performance recommendations, state patterns
**Ask for**:
- "Optimize recomposition in my ProductList"
- "Design component hierarchy for complex screen"
- "Implement proper state hoisting for search feature"

### 🎭 material-design-3-architect
**Specializes in**: M3 design tokens, dynamic color, theming, accessibility
**Delivers**: ColorScheme setup, M3 components, WCAG checklist
**Ask for**:
- "Setup Material Design 3 theme with dynamic color"
- "Create accessible M3 component library"
- "Verify WCAG 2.1 AA compliance"

### ⚙️ gradle-build-specialist
**Specializes in**: Gradle, AGP, version catalogs, R8, KSP, build optimization
**Delivers**: Build configurations, version catalogs, optimization reports
**Ask for**:
- "Configure Gradle with version catalog"
- "Optimize build time from 90s to 30s"
- "Setup R8 proguard rules for release build"

### ⚡ android-performance-specialist
**Specializes in**: Profiling, baseline profiles, jank, ANR, memory, battery
**Delivers**: Performance analysis, optimization roadmaps, baseline profiles
**Ask for**:
- "Profile CPU/memory usage of my app"
- "Generate baseline profile for startup"
- "Diagnose ANR in background sync"

### ✅ mobile-qa
**Specializes in**: Unit tests, UI tests, accessibility testing, automation
**Delivers**: Test code, test strategy, accessibility audit
**Ask for**:
- "Write unit tests for ProductViewModel"
- "Create UI tests for product list screen"
- "Audit accessibility compliance"

## 💡 Tips for Getting Best Responses

### ✅ Good Request
```
@android-developer: I need to implement a product list with:
- Load products from Room database
- Show loading state while fetching
- Handle error scenarios
- Show empty state if no products

Here's my ProductViewModel skeleton:
[paste code]

The products are expensive to fetch — what's the best pattern?
```

### ❌ Vague Request
```
@android-developer: How do I make a list?
```

### ✅ Good Request
```
@jetpack-compose-architect: My ProductList screen recomposes 
whenever ANY product changes, even if it's not visible. 
Here's my code: [paste code]
How do I fix this with key() or remember()?
```

### ❌ Vague Request
```
@jetpack-compose-architect: My app is slow
```

## 🎓 Learning Path

**If new to Android:**
1. Start with `@mobile-analyst` to understand requirements
2. Use `@android-app-architect` to learn architecture patterns
3. Use `@android-developer` to implement with examples
4. Use `@jetpack-compose-architect` to optimize

**If experienced:**
1. Skip to `@android-developer` for quick implementation
2. Use specialists (`@jetpack-compose-architect`, `@gradle-build-specialist`) as needed
3. Always involve `@mobile-qa` before shipping

**For design system:**
1. `@material-design-3-architect` → design tokens and components
2. `@jetpack-compose-architect` → implement composables
3. `@mobile-qa` → test accessibility

## 🔍 Context: ProyectoLectorV

**Current App**: Product/expiry tracker (React + Supabase)
**Android Port Goal**: Bring same functionality to Android

**These agents will help:**
- Adapt web requirements to mobile constraints (network, battery, storage)
- Design offline-first architecture with Room + Retrofit
- Implement OCR for product scanning (with Tesseract/ML Kit)
- Build Material Design 3 UI
- Optimize for 60 FPS on mid-range devices
- Comprehensive testing for Play Store release

## 🚀 Next Actions

1. **Reload extensions** (VS Code may need restart to recognize new agents)
   
2. **Try first agent**:
   ```
   @mobile-analyst: What are the key requirements for migrating 
   ProyectoLectorV to Android?
   ```

3. **Follow workflow** for your first feature
   
4. **Save good responses** to project docs for team reference

## 📖 Full Documentation

For detailed workflows and best practices, see:
- **[AGENTS.md](.github/agents/AGENTS.md)** — Team coordination guide
- **[README.md](.github/agents/README.md)** — Agents overview

Each `.agent.md` file also contains detailed guidance for its specialty.

## 🎯 Success Metrics

You're using the team well when:
- ✅ Chat responses include specific code examples
- ✅ Architecture decisions documented by android-app-architect
- ✅ Features have tests written by mobile-qa
- ✅ Performance baseline set by android-performance-specialist
- ✅ Pull reviews reference agent guidance

---

**Ready to build Android?** Start with `@mobile-analyst` in your next chat! 🚀

