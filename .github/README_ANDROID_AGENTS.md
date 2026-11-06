# 📚 Android Agents Documentation Index

Complete guide to the Android specialist agents team for ProyectoLectorV.

## 🎯 Start Here

1. **[ANDROID_AGENTS_SUMMARY.md](./ANDROID_AGENTS_SUMMARY.md)** ← Read this FIRST
   - Complete overview of the 8-agent team
   - What each agent does
   - How to use them
   - Recommended workflows

2. **[ANDROID_AGENTS_QUICKSTART.md](./ANDROID_AGENTS_QUICKSTART.md)** ← Quick Reference
   - Cheat sheet for invoking agents
   - Common workflows
   - Tips for getting best responses
   - Context: ProyectoLectorV

## 📖 Agents Documentation

### In `.github/agents/` folder:

#### 🔧 Overview & Coordination
- **[agents/README.md](./agents/README.md)** — Agents team overview and quick start
- **[agents/AGENTS.md](./agents/AGENTS.md)** — Team coordination, workflows, and best practices

#### 🎯 The 8 Specialist Agents

| # | Agent | File | Purpose |
|---|-------|------|---------|
| 1 | 📱 **mobile-analyst** | [agents/mobile-analyst.agent.md](./agents/mobile-analyst.agent.md) | Requirements discovery, scope definition, platform analysis |
| 2 | 💻 **android-developer** | [agents/android-developer.agent.md](./agents/android-developer.agent.md) | Kotlin/Compose implementation, debugging, code examples |
| 3 | 🏗️ **android-app-architect** | [agents/android-app-architect.agent.md](./agents/android-app-architect.agent.md) | MVVM, CLEAN, Hilt, Room, multi-module architecture |
| 4 | 🎨 **jetpack-compose-architect** | [agents/jetpack-compose-architect.agent.md](./agents/jetpack-compose-architect.agent.md) | Compose composition, state, recomposition optimization |
| 5 | 🎭 **material-design-3-architect** | [agents/material-design-3-architect.agent.md](./agents/material-design-3-architect.agent.md) | M3 tokens, theming, dynamic color, accessibility |
| 6 | ⚙️ **gradle-build-specialist** | [agents/gradle-build-specialist.agent.md](./agents/gradle-build-specialist.agent.md) | Gradle, AGP, dependencies, build optimization |
| 7 | ⚡ **android-performance-specialist** | [agents/android-performance-specialist.agent.md](./agents/android-performance-specialist.agent.md) | Profiling, jank, ANR, memory, battery, baseline profiles |
| 8 | ✅ **mobile-qa** | [agents/mobile-qa.agent.md](./agents/mobile-qa.agent.md) | Unit/UI/integration tests, accessibility, test automation |

## 🚀 How to Use Agents

### In VS Code Chat
```
@agent-name: Your question here
```

### Example Queries

```
@mobile-analyst: Define MVP scope for ProyectoLectorV Android

@android-app-architect: Design MVVM architecture with offline Room sync

@android-developer: Implement ProductViewModel with error handling

@jetpack-compose-architect: Optimize ProductList recomposition

@material-design-3-architect: Setup Material Design 3 theme

@gradle-build-specialist: Configure multi-module Gradle setup

@android-performance-specialist: Profile and optimize frame rate

@mobile-qa: Create comprehensive test suite
```

## 📋 Documentation Structure

```
.github/
├── ANDROID_AGENTS_SUMMARY.md     ← Master guide (read first!)
├── ANDROID_AGENTS_QUICKSTART.md  ← Quick reference (tips & tricks)
└── agents/
    ├── README.md                 ← Agents overview
    ├── AGENTS.md                 ← Team coordination guide
    ├── mobile-analyst.agent.md
    ├── android-developer.agent.md
    ├── android-app-architect.agent.md
    ├── jetpack-compose-architect.agent.md
    ├── material-design-3-architect.agent.md
    ├── gradle-build-specialist.agent.md
    ├── android-performance-specialist.agent.md
    └── mobile-qa.agent.md
```

## 🎓 Reading Order

**For Beginners:**
1. Start: [ANDROID_AGENTS_SUMMARY.md](./ANDROID_AGENTS_SUMMARY.md)
2. Then: [agents/README.md](./agents/README.md)
3. Then: [agents/AGENTS.md](./agents/AGENTS.md)
4. Then: Try first agent in chat: `@mobile-analyst`

**For Experienced Developers:**
1. Skim: [ANDROID_AGENTS_QUICKSTART.md](./ANDROID_AGENTS_QUICKSTART.md)
2. Reference: Specific agent docs as needed
3. Use: [agents/AGENTS.md](./agents/AGENTS.md) for workflow patterns

**For Team Leads:**
1. Read: [ANDROID_AGENTS_SUMMARY.md](./ANDROID_AGENTS_SUMMARY.md)
2. Study: [agents/AGENTS.md](./agents/AGENTS.md) for team workflows
3. Share: [ANDROID_AGENTS_QUICKSTART.md](./ANDROID_AGENTS_QUICKSTART.md) with team

## 🔄 Recommended Workflows

### Feature Implementation Workflow
```
@mobile-analyst → Requirements & Scope
        ↓
@android-app-architect → Architecture & Design
        ↓
@android-developer → Implementation
        ↓
@jetpack-compose-architect → UI Optimization
        ↓
@material-design-3-architect → Design System
        ↓
@mobile-qa → Testing & Accessibility
        ↓
@gradle-build-specialist → Build Configuration
        ↓
@android-performance-specialist → Performance Optimization
```

### Performance Debugging Workflow
```
@android-performance-specialist → Profile & Analyze
        ↓
@jetpack-compose-architect → Optimize Compose
        ↓
@android-developer → Implement Fixes
        ↓
@mobile-qa → Regression Testing
```

### Architecture Setup Workflow
```
@android-app-architect → Design Architecture
        ↓
@gradle-build-specialist → Configure Build
        ↓
@android-developer → Implement Modules
```

## 💡 Key Capabilities by Agent

### 📱 mobile-analyst
- MVP scope definition
- Platform constraint analysis
- Feasibility assessment
- Risk identification
- Phased roadmap planning

### 💻 android-developer
- Kotlin code implementation
- Jetpack Compose development
- Coroutine management
- Lifecycle handling
- Runtime debugging
- Code review guidance

### 🏗️ android-app-architect
- MVVM architecture
- CLEAN layer separation
- Hilt dependency injection
- Room database design
- Repository pattern
- Multi-module structure
- Navigation architecture
- Data flow patterns

### 🎨 jetpack-compose-architect
- Composable design
- State hoisting
- Recomposition optimization
- Performance analysis
- Component hierarchy
- Local vs lifted state
- Side effects management
- Custom modifiers

### 🎭 material-design-3-architect
- Color system (tonal palette)
- Typography hierarchy
- Elevation & surfaces
- Component theming
- Dynamic color setup
- Accessibility (WCAG AA)
- Dark/light mode
- Design tokens

### ⚙️ gradle-build-specialist
- Multi-module configuration
- Version catalogs
- Dependency management
- Build optimization
- R8 ProGuard rules
- KSP configuration
- Build caching
- Conflict resolution

### ⚡ android-performance-specialist
- CPU profiling
- Memory analysis
- Jank detection
- ANR debugging
- Battery optimization
- Baseline profile generation
- Play Store Vitals
- Frame rate monitoring
- Memory leak detection

### ✅ mobile-qa
- Unit test strategy
- UI test automation
- Integration testing
- Accessibility testing
- Test data builders
- Mock frameworks
- CI/CD integration
- Coverage reporting

## 🎯 Context: ProyectoLectorV

**Current Stack:** React/Vite web app + Supabase backend
**Purpose:** Product/expiry tracker with OCR capability
**Target:** Android migration

**Agents Help With:**
- Adapting web requirements to mobile constraints
- Offline-first architecture with Room + Retrofit
- OCR integration (Tesseract or ML Kit)
- Material Design 3 UI implementation
- Performance optimization for 60 FPS
- Play Store release preparation

## 📞 Getting Help

### If you're stuck on...
- **Requirements** → Use `@mobile-analyst`
- **Architecture** → Use `@android-app-architect`
- **Implementation** → Use `@android-developer`
- **Compose UI** → Use `@jetpack-compose-architect`
- **Design System** → Use `@material-design-3-architect`
- **Build Issues** → Use `@gradle-build-specialist`
- **Performance** → Use `@android-performance-specialist`
- **Testing** → Use `@mobile-qa`

### Getting Better Responses
1. ✅ Be specific and include requirements
2. ✅ Provide code examples
3. ✅ State your constraints
4. ✅ Request actionable output format
5. ❌ Avoid vague questions

## 🔍 Quick Links

- **Agent Invocation**: Type `@agent-name` in VS Code chat
- **YAML Frontmatter**: Each `.agent.md` has name, description, model settings
- **Documentation**: All `.agent.md` files contain detailed expertise guides
- **Workflows**: See [agents/AGENTS.md](./agents/AGENTS.md) for complete patterns
- **Team Setup**: See [agents/README.md](./agents/README.md) for overview

## ✨ Summary

You have **8 world-class specialist agents** ready to help with:
- ✅ Requirements & discovery
- ✅ Architecture design
- ✅ Implementation
- ✅ UI & composition
- ✅ Design system
- ✅ Build configuration
- ✅ Performance optimization
- ✅ Testing & QA

**Next Step:** Open VS Code and type `@mobile-analyst` to start! 🚀

---

**Version:** 1.0.0  
**Created:** 2026-11-05  
**Project:** ProyectoLectorV  
**Android Target:** API 26+ (API 34+ recommended)  

