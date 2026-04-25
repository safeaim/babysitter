# Process Library

The Babysitter Process Library is the SDK-managed library under [`library/`](../../../library/README.md). In this repository snapshot, it contains **2,236 JavaScript process files**: **148 methodology process files**, **2,036 specialization process files**, and a shared-process layer used to compose larger workflows.

---

## In Plain English

> **Think of the Process Library like a cookbook with 2,236 recipes in this repo snapshot.**
>
> Just like how a cookbook has recipes for Italian, Mexican, Japanese, and French cuisine - the Process Library has "recipes" for building web apps, mobile apps, APIs, security audits, and much more.
>
> **You don't need to read the whole cookbook.** Just tell Babysitter what you want to make:
> - "Build me a REST API" → Babysitter picks the right recipe automatically
> - "Use the TDD methodology" → You pick a specific recipe
>
> Each recipe includes:
> - **Ingredients** (inputs you provide)
> - **Steps** (phases of work)
> - **Quality checks** (tests to ensure it's done right)
> - **Approval points** (places where you review before continuing)

---

## Quick Start: Using the Library

**Most users never need to browse the library directly.** Just describe what you want:

```
/babysitter:call build a user authentication system with login, registration, and password reset
```

Babysitter automatically finds and combines the right processes. Want a specific methodology?

```
/babysitter:call with TDD methodology, create a REST API for managing tasks
```

That's it! See the sections below for details on what's available.

---

## What is the Process Library?

The Process Library provides ready-to-use orchestration workflows for virtually any task you might encounter. Each process is:

- **Battle-tested**: Designed with best practices and quality gates built-in
- **Composable**: Can be combined with other processes to create complex workflows
- **Customizable**: Extend or modify any process to match your requirements
- **Self-documenting**: Includes clear inputs, outputs, and execution flow

Instead of writing orchestration logic from scratch, you can leverage these pre-built processes and focus on what matters: your actual work.

## How Babysitter Uses the Process Library

When you describe a task to Babysitter, the agent **automatically selects the most relevant processes** from the library and adapts them to your specific needs. This happens in several ways:

### Automatic Process Selection

Simply describe what you want to accomplish in natural language:

```
Use babysitter to build a Next.js app with authentication and PostgreSQL
```

Babysitter will:
1. Identify relevant processes (e.g., `nextjs-fullstack-app`, `jwt-authentication`, `database-setup`)
2. Combine and adapt them to your requirements
3. Execute the orchestrated workflow with quality gates

### Explicit Process Selection

You can also request a specific process by name:

```
Use babysitter with the tdd-quality-convergence process to implement user authentication
```

Or:

```
Use babysitter with the devin methodology to build a REST API
```

### Mix and Match

For complex tasks, Babysitter intelligently combines multiple processes:

```
Use babysitter to create a microservices architecture with:
- GraphQL gateway
- Kubernetes deployment
- Monitoring and alerting
```

This might pull from `graphql-api-apollo`, `kubernetes-setup`, `monitoring-setup`, and `cicd-pipeline-setup` processes, adapting each to work together coherently.

### Customizing for Your Use Case

You can also modify existing processes or provide additional context:

```
Use babysitter with the security-audit process but focus specifically on
OWASP Top 10 vulnerabilities and include PCI-DSS compliance checks
```

The agent will take the base process and adapt it to your specific requirements.

## Library Structure

The built-in library lives under [`library/`](../../../library/README.md). Harness plugins do **not** ship the whole process tree under `skills/babysit/`; instead, they expose the `babysit` skill and rely on the SDK-managed active process-library binding. Project-local copies under `.a5c/` are an override layer that can be created by plugins or by you.

### How The Layers Relate

1. **Built-in library**: [`library/`](../../../library/README.md) is the canonical source tree for built-in processes, methodologies, shared components, references, and examples.
2. **Plugin package**: the harness plugin ships skills, hooks, and packaging files such as [`plugins/babysitter-codex/skills/babysit/SKILL.md`](../../../plugins/babysitter-codex/skills/babysit/SKILL.md), then asks the SDK which process-library binding is active.
3. **Project-local `.a5c/` copies**: files like `.a5c/processes/`, `.a5c/skills/`, and `.a5c/agents/` inside a workspace override the shared library when present.

### Active Lookup Order

Babysitter process discovery should prefer:

1. Project-local `.a5c/processes/`
2. The SDK-managed active process-library binding resolved by `babysitter process-library:active --json`
3. Other installed skill/plugin roots only as compatibility fallback

### Main Library Areas

Click any link to view the current source location:

| Area | Description | Link |
|------|-------------|------|
| **library/methodologies/** | Methodology families such as Agile, Devin, GSD, Kanban, Spec-Kit, and more | [Browse →](../../../library/methodologies/) |
| **library/methodologies/gsd/** | Get Shit Done workflows | [Browse →](../../../library/methodologies/gsd/README.md) |
| **library/specializations/** | Domain-specific processes across 39 top-level specialization directories | [Browse →](../../../library/specializations/) |
| **library/processes/shared/** | Shared reusable process components | [Browse →](../../../library/processes/shared/README.md) |
| **library/tdd-quality-convergence.js** | Featured TDD workflow at the library root | [View →](../../../library/tdd-quality-convergence.js) |

### Specializations Sub-Structure

| Category | Description | Link |
|----------|-------------|------|
| **Development and technical specializations** | Web, mobile, DevOps, AI, security, collaboration, authoring, and more | [Browse →](../../../library/specializations/) |
| **domains/business/** | Finance, HR, marketing, sales, legal, logistics, and related business domains | [Browse →](../../../library/specializations/domains/business/) |
| **domains/science/** | Physics, chemistry, engineering, mathematics, scientific discovery, and related domains | [Browse →](../../../library/specializations/domains/science/) |
| **domains/social-sciences-humanities/** | Education, healthcare, philosophy, arts, and social-science research workflows | [Browse →](../../../library/specializations/domains/social-sciences-humanities/) |
| **meta/** | Process creation, validation, and library tooling | [Browse →](../../../library/specializations/meta/) |

## Browsing and Discovering Processes

### Asking Claude

The easiest way to discover processes is to ask Claude:

```
What processes are available for web development?
```

```
Show me security-related processes in the babysitter library
```

Claude can browse the process library and recommend the best match for your needs.

### Process Naming Convention

Process files follow a consistent naming pattern:

- `feature-name.js` - The process definition
- `README.md` - Category documentation
- `examples/` - Example inputs and usage
- `agents/` - Specialized agents for the category

### Finding the Right Process

1. **Start with the category** that matches your domain
2. **Review the README.md** in that category for an overview
3. **Check the JSDoc** at the top of each `.js` file for inputs/outputs
4. **Look at examples/** for sample usage patterns

## Categories Overview

## Current Snapshot Counts

These counts are derived from the current repository state:

| Area | Current Count | Source |
|------|---------------|--------|
| **All library `.js` process files** | 2,236 | [`library/`](../../../library/) |
| **Methodology directories** | 38 | [`library/methodologies/`](../../../library/methodologies/) |
| **Methodology `.js` process files** | 148 | [`library/methodologies/`](../../../library/methodologies/) |
| **Specialization `.js` process files** | 2,036 | [`library/specializations/`](../../../library/specializations/) |
| **Top-level specialization directories** | 39 | [`library/specializations/`](../../../library/specializations/) |
| **Development and technical specialization processes** | 834 | [`library/specializations/`](../../../library/specializations/) |
| **Business-domain specialization processes** | 491 | [`library/specializations/domains/business/`](../../../library/specializations/domains/business/) |
| **Science-domain specialization processes** | 551 | [`library/specializations/domains/science/`](../../../library/specializations/domains/science/) |
| **Social-sciences-and-humanities specialization processes** | 160 | [`library/specializations/domains/social-sciences-humanities/`](../../../library/specializations/domains/social-sciences-humanities/) |

### Development And Technical Specializations (834 process files)

| Category | Processes | Description | Browse |
|----------|-----------|-------------|--------|
| **web-development** | 61 | Full-stack web development, frameworks, deployment | [→](../../../library/specializations/web-development/) |
| **algorithms-optimization** | 45 | Algorithm implementation, performance tuning | [→](../../../library/specializations/algorithms-optimization/) |
| **ai-agents-conversational** | 43 | LLM applications, RAG, multi-agent systems | [→](../../../library/specializations/ai-agents-conversational/) |
| **cryptography-blockchain** | 33 | Smart contracts, DeFi, cryptographic protocols | [→](../../../library/specializations/cryptography-blockchain/) |
| **security-research** | 32 | Penetration testing, vulnerability research | [→](../../../library/specializations/security-research/) |
| **meta** | 31 | Process creation, validation, and library tooling | [→](../../../library/specializations/meta/) |
| **robotics-simulation** | 30 | ROS2, simulation, autonomous systems | [→](../../../library/specializations/robotics-simulation/) |
| **performance-optimization** | 30 | Profiling, optimization, benchmarking | [→](../../../library/specializations/performance-optimization/) |
| **network-programming** | 30 | Protocols, distributed systems, networking | [→](../../../library/specializations/network-programming/) |
| **game-development** | 30 | Game engines, mechanics, production | [→](../../../library/specializations/game-development/) |
| **cli-mcp-development** | 30 | CLI tools, MCP servers, developer tooling | [→](../../../library/specializations/cli-mcp-development/) |
| **devops-sre-platform** | 29 | CI/CD, infrastructure, observability | [→](../../../library/specializations/devops-sre-platform/) |
| **mobile-development** | 26 | iOS, Android, React Native, Flutter | [→](../../../library/specializations/mobile-development/) |
| **embedded-systems** | 26 | Firmware, drivers, real-time systems | [→](../../../library/specializations/embedded-systems/) |
| **security-compliance** | 26 | Security standards, compliance automation | [→](../../../library/specializations/security-compliance/) |
| **sdk-platform-development** | 25 | SDKs, APIs, platform engineering | [→](../../../library/specializations/sdk-platform-development/) |
| **programming-languages** | 25 | Compilers, interpreters, language design | [→](../../../library/specializations/programming-languages/) |
| **gpu-programming** | 25 | CUDA, compute shaders, parallel processing | [→](../../../library/specializations/gpu-programming/) |
| **fpga-programming** | 25 | HDL, synthesis, hardware design | [→](../../../library/specializations/fpga-programming/) |
| **code-migration-modernization** | 25 | Legacy modernization, framework upgrades | [→](../../../library/specializations/code-migration-modernization/) |
| **desktop-development** | 24 | Electron, native apps, cross-platform | [→](../../../library/specializations/desktop-development/) |
| **ux-ui-design** | 24 | Design systems, accessibility, prototyping | [→](../../../library/specializations/ux-ui-design/) |
| **technical-documentation** | 21 | API docs, guides, documentation systems | [→](../../../library/specializations/technical-documentation/) |
| **software-architecture** | 20 | System design, patterns, architecture reviews | [→](../../../library/specializations/software-architecture/) |
| **qa-testing-automation** | 20 | Test automation, quality assurance | [→](../../../library/specializations/qa-testing-automation/) |
| **data-science-ml** | 18 | ML pipelines, model training, MLOps | [→](../../../library/specializations/data-science-ml/) |
| **data-engineering-analytics** | 18 | Data pipelines, analytics, ETL | [→](../../../library/specializations/data-engineering-analytics/) |
| **product-management** | 17 | Roadmaps, specifications, product strategy | [→](../../../library/specializations/product-management/) |

### Business Domains (491 process files)
[Browse all business domains →](../../../library/specializations/domains/business/)

| Category | Processes | Description | Browse |
|----------|-----------|-------------|--------|
| **knowledge-management** | 36 | Documentation, wikis, knowledge bases | [→](../../../library/specializations/domains/business/knowledge-management/) |
| **decision-intelligence** | 33 | Decision frameworks, analysis models | [→](../../../library/specializations/domains/business/decision-intelligence/) |
| **legal** | 28 | Contract analysis, compliance, legal ops | [→](../../../library/specializations/domains/business/legal/) |
| **operations** | 26 | Business process optimization | [→](../../../library/specializations/domains/business/operations/) |
| **business-strategy** | 26 | Strategic planning, competitive analysis | [→](../../../library/specializations/domains/business/business-strategy/) |
| **venture-capital** | 25 | Due diligence, portfolio management | [→](../../../library/specializations/domains/business/venture-capital/) |
| **supply-chain** | 25 | Logistics, inventory, procurement | [→](../../../library/specializations/domains/business/supply-chain/) |
| **sales** | 25 | Sales processes, CRM workflows | [→](../../../library/specializations/domains/business/sales/) |
| **public-relations** | 25 | Communications, media relations | [→](../../../library/specializations/domains/business/public-relations/) |
| **marketing** | 25 | Campaigns, analytics, content strategy | [→](../../../library/specializations/domains/business/marketing/) |
| **logistics** | 25 | Distribution, routing, fulfillment | [→](../../../library/specializations/domains/business/logistics/) |
| **finance-accounting** | 25 | Financial analysis, reporting, auditing | [→](../../../library/specializations/domains/business/finance-accounting/) |
| **entrepreneurship** | 25 | Startup workflows, business planning | [→](../../../library/specializations/domains/business/entrepreneurship/) |
| **project-management** | 25 | Project planning, tracking, delivery | [→](../../../library/specializations/domains/business/project-management/) |
| **human-resources** | 24 | Recruiting, onboarding, HR processes | [→](../../../library/specializations/domains/business/human-resources/) |
| **digital-marketing** | 23 | SEO, PPC, social media, analytics | [→](../../../library/specializations/domains/business/digital-marketing/) |
| **customer-experience** | 20 | CX design, feedback loops, journey mapping | [→](../../../library/specializations/domains/business/customer-experience/) |

### Science And Engineering (551 process files)
[Browse all science domains →](../../../library/specializations/domains/science/)

| Category | Processes | Description | Browse |
|----------|-----------|-------------|--------|
| **scientific-discovery** | 168 | Research methodologies, reasoning patterns | [→](../../../library/specializations/domains/science/scientific-discovery/) |
| **quantum-computing** | 27 | Quantum algorithms, circuit design | [→](../../../library/specializations/domains/science/quantum-computing/) |
| **mechanical-engineering** | 26 | CAD, simulation, manufacturing | [→](../../../library/specializations/domains/science/mechanical-engineering/) |
| **computer-science** | 25 | Theory, algorithms, formal methods | [→](../../../library/specializations/domains/science/computer-science/) |
| **civil-engineering** | 25 | Structural analysis, infrastructure | [→](../../../library/specializations/domains/science/civil-engineering/) |
| **chemical-engineering** | 25 | Process design, reaction engineering | [→](../../../library/specializations/domains/science/chemical-engineering/) |
| **biomedical-engineering** | 25 | Medical devices, biomechanics | [→](../../../library/specializations/domains/science/biomedical-engineering/) |
| **automotive-engineering** | 25 | Vehicle systems, ADAS, EV | [→](../../../library/specializations/domains/science/automotive-engineering/) |
| **aerospace-engineering** | 25 | Flight systems, propulsion, avionics | [→](../../../library/specializations/domains/science/aerospace-engineering/) |
| **physics** | 24 | Simulation, modeling, analysis | [→](../../../library/specializations/domains/science/physics/) |
| **mathematics** | 24 | Proofs, modeling, computation | [→](../../../library/specializations/domains/science/mathematics/) |
| **materials-science** | 24 | Material characterization, discovery | [→](../../../library/specializations/domains/science/materials-science/) |
| **environmental-engineering** | 24 | Environmental modeling, sustainability | [→](../../../library/specializations/domains/science/environmental-engineering/) |
| **industrial-engineering** | 23 | Process optimization, operations research | [→](../../../library/specializations/domains/science/industrial-engineering/) |
| **electrical-engineering** | 21 | Circuit design, signal processing | [→](../../../library/specializations/domains/science/electrical-engineering/) |
| **nanotechnology** | 20 | Nanofabrication, characterization | [→](../../../library/specializations/domains/science/nanotechnology/) |
| **bioinformatics** | 20 | Genomics, proteomics, computational biology | [→](../../../library/specializations/domains/science/bioinformatics/) |

### Social Sciences And Humanities (160 process files)
[Browse social sciences domains →](../../../library/specializations/domains/social-sciences-humanities/)

Processes for research methodologies, analysis frameworks, and academic workflows in social sciences, humanities, and interdisciplinary fields.

## Example Processes by Category

### Web Development
[Browse all web-development processes →](../../../library/specializations/web-development/)

| Process | Description | Source |
|---------|-------------|--------|
| nextjs-fullstack-app | Complete Next.js application | [View](../../../library/specializations/web-development/nextjs-fullstack-app.js) |
| graphql-api-apollo | GraphQL API with Apollo | [View](../../../library/specializations/web-development/graphql-api-apollo.js) |
| jwt-authentication | JWT auth implementation | [View](../../../library/specializations/web-development/jwt-authentication.js) |
| e2e-testing-playwright | Playwright E2E testing | [View](../../../library/specializations/web-development/e2e-testing-playwright.js) |
| micro-frontend-module-federation | Micro-frontend architecture | [View](../../../library/specializations/web-development/micro-frontend-module-federation.js) |
| accessibility-audit-remediation | WCAG compliance | [View](../../../library/specializations/web-development/accessibility-audit-remediation.js) |
| docker-containerization | Docker deployment | [View](../../../library/specializations/web-development/docker-containerization.js) |

### AI Agents and Conversational
[Browse all ai-agents-conversational processes →](../../../library/specializations/ai-agents-conversational/)

| Process | Description | Source |
|---------|-------------|--------|
| multi-agent-system | Multi-agent orchestration | [View](../../../library/specializations/ai-agents-conversational/multi-agent-system.js) |
| advanced-rag-patterns | Advanced RAG implementation | [View](../../../library/specializations/ai-agents-conversational/advanced-rag-patterns.js) |
| langgraph-workflow-design | LangGraph workflows | [View](../../../library/specializations/ai-agents-conversational/langgraph-workflow-design.js) |
| conversational-memory-system | Long-term memory for agents | [View](../../../library/specializations/ai-agents-conversational/conversational-memory-system.js) |
| function-calling-agent | Tool-using agents | [View](../../../library/specializations/ai-agents-conversational/function-calling-agent.js) |
| agent-evaluation-framework | Agent testing and eval | [View](../../../library/specializations/ai-agents-conversational/agent-evaluation-framework.js) |
| llm-observability-monitoring | LLM monitoring setup | [View](../../../library/specializations/ai-agents-conversational/llm-observability-monitoring.js) |

### Security Research
[Browse all security-research processes →](../../../library/specializations/security-research/)

| Process | Description | Source |
|---------|-------------|--------|
| binary-reverse-engineering | Binary analysis | [View](../../../library/specializations/security-research/binary-reverse-engineering.js) |
| exploit-development | Exploit writing workflow | [View](../../../library/specializations/security-research/exploit-development.js) |
| fuzzing-campaign | Fuzzing setup and execution | [View](../../../library/specializations/security-research/fuzzing-campaign.js) |
| malware-analysis | Malware analysis workflow | [View](../../../library/specializations/security-research/malware-analysis.js) |
| network-penetration-testing | Network pentesting | [View](../../../library/specializations/security-research/network-penetration-testing.js) |
| capture-the-flag-challenges | CTF solving workflow | [View](../../../library/specializations/security-research/capture-the-flag-challenges.js) |
| bug-bounty-workflow | Bug bounty methodology | [View](../../../library/specializations/security-research/bug-bounty-workflow.js) |

### DevOps and SRE
[Browse all devops-sre-platform processes →](../../../library/specializations/devops-sre-platform/)

| Process | Description | Source |
|---------|-------------|--------|
| kubernetes-setup | Kubernetes cluster setup | [View](../../../library/specializations/devops-sre-platform/kubernetes-setup.js) |
| cicd-pipeline-setup | CI/CD pipeline creation | [View](../../../library/specializations/devops-sre-platform/cicd-pipeline-setup.js) |
| monitoring-setup | Observability stack | [View](../../../library/specializations/devops-sre-platform/monitoring-setup.js) |
| incident-response | Incident management | [View](../../../library/specializations/devops-sre-platform/incident-response.js) |
| disaster-recovery-plan | DR planning and testing | [View](../../../library/specializations/devops-sre-platform/disaster-recovery-plan.js) |
| slo-sli-tracking | SLO/SLI implementation | [View](../../../library/specializations/devops-sre-platform/slo-sli-tracking.js) |
| secrets-management | Secrets management setup | [View](../../../library/specializations/devops-sre-platform/secrets-management.js) |

### Scientific Discovery
[Browse all scientific-discovery processes →](../../../library/specializations/domains/science/scientific-discovery/)

| Process | Description | Source |
|---------|-------------|--------|
| hypothesis-formulation-testing | Scientific method | [View](../../../library/specializations/domains/science/scientific-discovery/hypothesis-formulation-testing.js) |
| causal-inference | Causal analysis | [View](../../../library/specializations/domains/science/scientific-discovery/causal-inference.js) |
| bayesian-probabilistic-reasoning | Bayesian reasoning | [View](../../../library/specializations/domains/science/scientific-discovery/bayesian-probabilistic-reasoning.js) |
| experimental-design-reasoning | Experiment planning | [View](../../../library/specializations/domains/science/scientific-discovery/experimental-design-reasoning.js) |
| literature-review-synthesis | Literature review | [View](../../../library/specializations/domains/science/scientific-discovery/literature-review-synthesis.js) |
| reproducible-research-pipeline | Reproducibility | [View](../../../library/specializations/domains/science/scientific-discovery/reproducible-research-pipeline.js) |
| systems-thinking | Systems analysis | [View](../../../library/specializations/domains/science/scientific-discovery/systems-thinking.js) |

## Using a Pre-Built Process

**Recommended: Just use `/babysitter:call <request>`** - it selects the right process automatically:

```
/babysitter:call build a Next.js app with authentication, PostgreSQL database, and Vercel deployment
```

Babysitter will find the `nextjs-fullstack-app` process and configure it based on your request.

## Methodologies Reference

The current repository snapshot includes **38 methodology directories** under [`library/methodologies/`](../../../library/methodologies/).
[Browse all methodologies →](../../../library/methodologies/)

### Core Methodologies

| Methodology | Description | Best For | Source |
|-------------|-------------|----------|--------|
| **devin** | Plan -> Code -> Debug -> Deploy with autonomous iteration | Full feature implementation | [View](../../../library/methodologies/devin.js) |
| **ralph** | Simple iterative loop until task completion | Persistent tasks with unclear scope | [View](../../../library/methodologies/ralph.js) |
| **plan-and-execute** | Detailed planning phase followed by execution | Complex, well-defined features | [View](../../../library/methodologies/plan-and-execute.js) |
| **tdd-quality-convergence** | TDD with iterative quality scoring | High-quality, tested code | [View](../../../library/tdd-quality-convergence.js) |
| **spec-driven-development** | Executable specifications drive implementation | Enterprise, governance-heavy projects | [View](../../../library/methodologies/spec-driven-development.js) |

### Agile and Iterative

| Methodology | Description | Best For | Source |
|-------------|-------------|----------|--------|
| **agile** | Sprint-based iterative development | Team-based projects | [View](../../../library/methodologies/agile.js) |
| **scrum** | Full Scrum implementation with ceremonies | Scrum teams | [View](../../../library/methodologies/scrum/README.md) |
| **kanban** | Continuous flow with WIP limits | Continuous delivery | [View](../../../library/methodologies/kanban/README.md) |
| **extreme-programming** | XP practices (pair programming, TDD) | High-quality code | [View](../../../library/methodologies/extreme-programming/README.md) |
| **feature-driven-development** | Feature-centric development | Large codebases | [View](../../../library/methodologies/feature-driven-development/README.md) |

### Architecture and Design

| Methodology | Description | Best For | Source |
|-------------|-------------|----------|--------|
| **top-down** | Architecture-first development | New systems, clear requirements | [View](../../../library/methodologies/top-down.js) |
| **bottom-up** | Component-first development | Exploratory, uncertain requirements | [View](../../../library/methodologies/bottom-up.js) |
| **domain-driven-design** | DDD strategic and tactical patterns | Complex business domains | [View](../../../library/methodologies/domain-driven-design/README.md) |
| **event-storming** | Collaborative domain discovery | Domain modeling | [View](../../../library/methodologies/event-storming/README.md) |
| **evolutionary** | Incremental architecture evolution | Legacy modernization | [View](../../../library/methodologies/evolutionary.js) |

### Specialized Approaches

| Methodology | Description | Best For | Source |
|-------------|-------------|----------|--------|
| **graph-of-thoughts** | Multi-path reasoning exploration | Complex problem solving | [View](../../../library/methodologies/graph-of-thoughts.js) |
| **adversarial-spec-debates** | Red team/blue team specification | Critical systems | [View](../../../library/methodologies/adversarial-spec-debates.js) |
| **consensus-and-voting-mechanisms** | Multi-agent consensus building | Distributed decisions | [View](../../../library/methodologies/consensus-and-voting-mechanisms.js) |
| **state-machine-orchestration** | State-based workflow management | Complex state transitions | [View](../../../library/methodologies/state-machine-orchestration.js) |
| **build-realtime-remediation** | Real-time error detection and fixing | CI/CD pipelines | [View](../../../library/methodologies/build-realtime-remediation.js) |

### GSD (Get Shit Done) Workflows
[Browse GSD workflows →](../../../library/methodologies/gsd/README.md)

| Workflow | Purpose | Source |
|----------|---------|--------|
| **new-project** | Project initialization with vision capture | [View](../../../library/methodologies/gsd/new-project.js) |
| **discuss-phase** | Capture implementation preferences | [View](../../../library/methodologies/gsd/discuss-phase.js) |
| **plan-phase** | Generate verified task plans | [View](../../../library/methodologies/gsd/plan-phase.js) |
| **execute-phase** | Parallel task execution with commits | [View](../../../library/methodologies/gsd/execute-phase.js) |
| **verify-work** | User acceptance testing | [View](../../../library/methodologies/gsd/verify-work.js) |
| **audit-milestone** | Milestone completion verification | [View](../../../library/methodologies/gsd/audit-milestone.js) |
| **map-codebase** | Brownfield project analysis | [View](../../../library/methodologies/gsd/map-codebase.js) |
| **iterative-convergence** | Quality-gated development loop | [View](../../../library/methodologies/gsd/iterative-convergence.js) |

## Customizing Processes

### Extending an Existing Process

```javascript
import { process as baseProcess } from '../../../library/specializations/web-development/nextjs-fullstack-app.js';

export async function process(inputs, ctx) {
  // Add pre-processing
  const enhancedInputs = {
    ...inputs,
    additionalChecks: true,
    customConfig: myConfig
  };

  // Run base process
  const result = await baseProcess(enhancedInputs, ctx);

  // Add post-processing
  await ctx.task(myCustomValidation, result);

  return {
    ...result,
    customData: myCustomData
  };
}
```

### Composing Multiple Processes

```javascript
import { process as planPhase } from '../../../library/methodologies/gsd/plan-phase.js';
import { process as executePhase } from '../../../library/methodologies/gsd/execute-phase.js';
import { process as tddConvergence } from '../../../library/tdd-quality-convergence.js';

export async function process(inputs, ctx) {
  // Planning with GSD
  const plan = await planPhase(inputs, ctx);

  // Execute with TDD quality gates
  const implementation = await tddConvergence({
    ...inputs,
    plan: plan.tasks,
    targetQuality: 90
  }, ctx);

  // Verify with GSD
  const verification = await executePhase({
    ...inputs,
    tasks: implementation.artifacts
  }, ctx);

  return { plan, implementation, verification };
}
```

### Modifying Process Parameters

Most processes accept configuration through inputs:

```json
{
  "feature": "User authentication",
  "targetQuality": 95,
  "maxIterations": 10,
  "requirements": [
    "Support OAuth2",
    "Include MFA"
  ],
  "constraints": [
    "Must use existing user table",
    "No breaking API changes"
  ]
}
```

## Quick Reference: All Categories

| Category | Count | Focus Area | Browse |
|----------|-------|------------|--------|
| scientific-discovery | 168 | Research reasoning patterns | [→](../../../library/specializations/domains/science/scientific-discovery/) |
| web-development | 61 | Full-stack web development | [→](../../../library/specializations/web-development/) |
| algorithms-optimization | 45 | Algorithm implementation | [→](../../../library/specializations/algorithms-optimization/) |
| ai-agents-conversational | 43 | LLM and agent development | [→](../../../library/specializations/ai-agents-conversational/) |
| knowledge-management | 36 | Documentation and knowledge systems | [→](../../../library/specializations/domains/business/knowledge-management/) |
| cryptography-blockchain | 33 | Blockchain and crypto | [→](../../../library/specializations/cryptography-blockchain/) |
| decision-intelligence | 33 | Decision frameworks | [→](../../../library/specializations/domains/business/decision-intelligence/) |
| security-research | 32 | Security research and testing | [→](../../../library/specializations/security-research/) |
| meta | 31 | Process tooling | [→](../../../library/specializations/meta/) |
| robotics-simulation | 30 | Robotics and simulation | [→](../../../library/specializations/robotics-simulation/) |
| performance-optimization | 30 | Performance tuning | [→](../../../library/specializations/performance-optimization/) |
| network-programming | 30 | Network and protocols | [→](../../../library/specializations/network-programming/) |
| game-development | 30 | Game development | [→](../../../library/specializations/game-development/) |
| cli-mcp-development | 30 | CLI and MCP tools | [→](../../../library/specializations/cli-mcp-development/) |
| devops-sre-platform | 29 | DevOps and SRE | [→](../../../library/specializations/devops-sre-platform/) |
| legal | 28 | Legal operations | [→](../../../library/specializations/domains/business/legal/) |
| quantum-computing | 27 | Quantum computing | [→](../../../library/specializations/domains/science/quantum-computing/) |
| mobile-development | 26 | Mobile app development | [→](../../../library/specializations/mobile-development/) |
| embedded-systems | 26 | Embedded and firmware | [→](../../../library/specializations/embedded-systems/) |
| security-compliance | 26 | Security compliance | [→](../../../library/specializations/security-compliance/) |
| mechanical-engineering | 26 | Mechanical engineering | [→](../../../library/specializations/domains/science/mechanical-engineering/) |
| sdk-platform-development | 25 | SDK development | [→](../../../library/specializations/sdk-platform-development/) |
| programming-languages | 25 | Language implementation | [→](../../../library/specializations/programming-languages/) |
| gpu-programming | 25 | GPU and parallel computing | [→](../../../library/specializations/gpu-programming/) |
| fpga-programming | 25 | FPGA design | [→](../../../library/specializations/fpga-programming/) |
| code-migration-modernization | 25 | Code modernization | [→](../../../library/specializations/code-migration-modernization/) |
| ux-ui-design | 24 | UX/UI design | [→](../../../library/specializations/ux-ui-design/) |
| data-science-ml | 18 | Machine learning | [→](../../../library/specializations/data-science-ml/) |
| data-engineering-analytics | 18 | Data engineering | [→](../../../library/specializations/data-engineering-analytics/) |

## Best Practices

### Choosing the Right Process

1. **Match your domain**: Start with the specialization that matches your work
2. **Check the methodology**: Consider which methodology fits your project style
3. **Review inputs carefully**: Understand what configuration options are available
4. **Read the examples**: Look at example inputs in the `examples/` directories under `library/`

### Customization Tips

1. **Start simple**: Use processes as-is before customizing
2. **Layer changes**: Extend rather than modify base processes
3. **Preserve breakpoints**: Keep human approval gates in critical paths
4. **Test incrementally**: Validate customizations with small inputs first

### Quality Considerations

1. **Use quality convergence**: Processes with quality scoring help ensure high standards
2. **Enable breakpoints**: Human review catches issues early
3. **Compose methodologies**: Combine TDD with your domain process for better results
4. **Track iterations**: Monitor how many iterations processes require

## See Also

- [Process Definitions](./process-definitions.md) - How to create your own processes
- [Quality Convergence](./quality-convergence.md) - Quality gates and scoring
- [Breakpoints](./breakpoints.md) - Human-in-the-loop approval
- [Parallel Execution](./parallel-execution.md) - Running tasks concurrently
