# tech-leads-club/agent-skills

- **Archetype**: skill-registry-platform
- **Stars**: 2,082
- **Last pushed**: 2026-04-01
- **License**: NOASSERTION
- **Discovered**: 2026-04-12
- **Skills found**: 77

## Summary

A validated skill registry for professional AI coding agents by Tech Leads Club. 77 SKILL.md files organized into categorized directories: architecture (10: domain analysis, coupling analysis, component sizing, legacy migration planner, frontend blueprint), cloud (5: AWS, Cloudflare, Netlify, Render, Vercel deploy), creation (6: ADR, RFC, technical design doc, skill architect, subagent creator), decision-making, design (4: Figma, frontend design, web design), development (9: codenavi, coding guidelines, Confluence, Jira, NestJS, React Native, Shopify, spec-driven), GTM/go-to-market (16: cold outreach, pricing, SDR, SEO, UGC ads, content pipeline, sales motion), learning, monitoring (Sentry), performance (4: Core Web Vitals, Astro, Lighthouse), quality (5: React best practices, SEO, accessibility, web quality audit), security (3: best practices, ownership map, threat model), tooling (7: Chrome DevTools, Excalidraw, gh-fix-ci, Mermaid, Nx suite), web-automation (Playwright). Supports Antigravity, Claude Code, Cursor, Copilot.

## Assessment

Extremely high value -- the largest and most well-organized skill collection in this batch. The 77 skills span development, architecture, security, performance, design, GTM/marketing, and tooling domains. The categorization system (parenthesized directory names) is clean and maps directly to babysitter specialization domains. The GTM skills (16) are particularly unique -- go-to-market processes for technical founders are not found in other repos. The architecture skills (domain analysis, coupling analysis, decomposition planning) align well with babysitter's domain-driven methodology.

## Extraction Priority
- High
- Rationale: 77 well-categorized skills across 13 domains. The architecture, GTM, security, and performance categories are immediately extractable as babysitter specializations. The spec-driven development skill directly mirrors babysitter's recommended methodology.

## Processes

### 1. Domain-Driven Architecture Analysis
- **Source skills**: domain-analysis, coupling-analysis, component-identification-sizing, domain-identification-grouping, decomposition-planning-roadmap
- **Placement**: `specializations/architecture/domain-driven-analysis.js`
- **Description**: Full DDD strategic design analysis: identify subdomains (Core/Supporting/Generic) -> map bounded contexts -> analyze coupling -> size components -> plan decomposition roadmap.

### 2. Technical Document Generation
- **Source skills**: create-adr, create-rfc, create-technical-design-doc
- **Placement**: `specializations/shared/technical-document-generation.js`
- **Description**: Generate structured technical documents: ADR for decisions, RFC for proposals, full design docs for features. Select format based on scope/audience.

### 3. Go-to-Market Execution
- **Source skills**: solo-founder-gtm, positioning-icp, sales-motion-design, content-to-pipeline, multi-platform-launch, gtm-metrics
- **Placement**: `specializations/business/gtm-execution.js`
- **Description**: End-to-end GTM process for technical founders: positioning/ICP definition -> sales motion design -> content strategy -> multi-platform launch -> metrics tracking -> expansion/retention.

### 4. Web Performance Audit
- **Source skills**: core-web-vitals, perf-lighthouse, perf-web-optimization, perf-astro
- **Placement**: `specializations/frontend/web-performance-audit.js`
- **Description**: Comprehensive web performance audit: Core Web Vitals measurement -> Lighthouse analysis -> optimization recommendations -> framework-specific optimizations (Astro SSG).

### 5. Security Threat Modeling
- **Source skills**: security-threat-model, security-ownership-map, security-best-practices
- **Placement**: `specializations/security/threat-modeling.js`
- **Description**: Security assessment process: threat model creation -> security ownership mapping -> best practices gap analysis -> remediation prioritization.

### 6. Legacy Migration Planning
- **Source skills**: legacy-migration-planner, component-flattening-analysis
- **Placement**: `specializations/architecture/legacy-migration-planning.js`
- **Description**: Legacy system migration process: analyze existing architecture -> identify migration boundaries -> plan phased migration -> flatten overly nested components.

## Plugin Ideas

- **Jira/Confluence Integration plugin**: Bidirectional sync between babysitter runs and Jira tickets/Confluence pages. Category: tools integration.
- **Nx Monorepo plugin**: Nx workspace discovery, task execution, and CI monitoring as babysitter tasks. Category: DevX.
- **GTM Dashboard plugin**: Track go-to-market metrics and pipeline health from babysitter-orchestrated marketing processes. Category: workflow automation.
- **Figma Design Bridge plugin**: Import Figma designs as implementation specifications for frontend processes. Category: tools integration.

## Patterns

- Parenthesized category directories for semantic grouping: `(architecture)`, `(cloud)`, `(gtm)`
- Monorepo structure: `packages/skills-catalog/skills/` with separate package
- DDD-aligned skill descriptions with explicit "when to use" / "when NOT to use" routing
- Skill disambiguation in descriptions (e.g., "Do NOT use for X, use Y instead")
- GTM skills applying engineering rigor to marketing/sales processes
- Skill architect meta-skill for creating new skills
