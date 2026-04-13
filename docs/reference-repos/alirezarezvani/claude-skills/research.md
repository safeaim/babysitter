# alirezarezvani/claude-skills

- **Archetype:** mega-skill-pack
- **Stars:** 10,670
- **Last pushed:** 2026-04-12
- **License:** MIT
- **Discovered:** 2026-04-12
- **Source**: gh-search

## Summary

The largest open-source Claude Code skills collection (235 skills across 9 domains). Organized by domain: engineering, business-growth, c-level-advisor, marketing, product-team, project-management, ra-qm-team, finance, and documentation. Each skill is a SKILL.md + optional Python scripts (305 total, all stdlib-only) + reference docs. Includes a lightweight orchestration protocol (persona + skill + phase pattern) and multi-tool conversion scripts.

## Assessment

The vast majority of skills are single-domain reference sheets / prompt engineering -- not multi-phase workflows. However, the **ra-qm-team** (Regulatory Affairs / Quality Management) domain contains genuine multi-phase audit and investigation workflows with Python tooling:

- **CAPA Officer**: Full CAPA investigation workflow (trigger -> assess -> investigate -> RCA -> corrective action -> effectiveness verification) with `capa_tracker.py` and `root_cause_analyzer.py`
- **FDA Consultant Specialist**: Regulatory submission workflows
- Other RA/QM skills with compliance-oriented multi-phase pipelines

The orchestration protocol is a prompt-engineering pattern (persona + skill + phase handoff), not a deterministic process -- no extractable process there.

The Python scripts across domains (churn_risk_analyzer, pipeline_analyzer, burn_rate_calculator, etc.) represent potential plugin tooling.

## Extraction Priority

**Medium-Low.** Most content is prompt engineering. The RA/QM domain has genuine process value. The Python scripts are interesting as plugin building blocks but are standalone calculators, not orchestration-worthy.

---

## Processes

### 1. CAPA Investigation Pipeline

- **Source:** `ra-qm-team/capa-officer/SKILL.md`
- **Placement:** `specializations/quality-management/capa-investigation.js`
- **Description:** Systematic Corrective and Preventive Action investigation for quality management systems. Phases: (1) Document trigger event with evidence, (2) Assess severity and determine CAPA necessity using classification matrix, (3) Form investigation team per severity tier, (4) Collect evidence via structured checklist, (5) Select and apply RCA methodology (5-Why, Fishbone, Fault Tree), (6) Identify and validate root cause(s), (7) Develop corrective/preventive actions, (8) Implement with tracking, (9) Effectiveness verification with defined criteria and timeframes.
- **Key inputs:** Trigger event description, severity classification, affected processes/products
- **Key outputs:** CAPA report, root cause determination, action plan with owners/dates, effectiveness verification results
- **Breakpoints:** CAPA necessity determination (human decides if CAPA is warranted), root cause validation (human confirms root cause before corrective actions), action plan approval (management review before implementation)
- **Why it fits babysitter:** Clear phase gates, human approval points at severity classification and action approval, deterministic checklist execution, artifact generation at each phase.

### 2. Regulatory Compliance Audit Pipeline

- **Source:** `ra-qm-team/` (multiple skills: FDA consultant, compliance tracker, quality system skills)
- **Placement:** `specializations/quality-management/regulatory-audit.js`
- **Description:** Multi-phase regulatory compliance audit workflow. Phases: (1) Scope definition and regulatory standard identification, (2) Document collection and gap analysis, (3) Finding classification (Major/Minor/Observation), (4) Risk assessment per finding, (5) Remediation planning with priority ordering, (6) Evidence package assembly.
- **Key inputs:** Regulatory standard (FDA 21 CFR, ISO 13485, etc.), scope boundaries, existing documentation
- **Key outputs:** Gap analysis matrix, findings report with severity classifications, remediation plan, evidence packages
- **Breakpoints:** Scope approval, finding classification review, remediation plan sign-off
- **Why it fits babysitter:** Structured audit phases, mandatory human review of findings before remediation, deterministic gap analysis checklist.

## Plugin Ideas

### 1. Business Metrics Calculator Suite

- **Name:** `business-metrics-calculators`
- **install.md description:** Installs a collection of Python-based business metric calculators as CLI tools accessible via babysitter tasks. Includes: burn rate calculator (`cfo-advisor/scripts/burn_rate_calculator.py`), unit economics analyzer, pipeline analyzer, churn risk analyzer, health score calculator, forecast accuracy tracker, growth model simulator. All stdlib-only Python, zero dependencies. The install.md would copy scripts to a tools directory and register them as available task executors.
- **Source scripts:** 20+ Python scripts across `c-level-advisor/`, `business-growth/`, `finance/` directories
- **Value:** Gives babysitter processes access to quantitative business analysis without external API dependencies.

### 2. Competitive Intelligence Toolkit

- **Name:** `competitive-intel`
- **install.md description:** Installs competitive analysis tools: competitive matrix builder (`sales-engineer/scripts/competitive_matrix_builder.py`), RFP response analyzer, POC planner. Provides structured frameworks for competitive teardown workflows.
- **Source:** `business-growth/sales-engineer/scripts/`

## Implicit Procedural Knowledge

- **Orchestration phase handoff pattern:** The orchestration protocol documents a clean pattern for context passing between phases: "Decisions made, Artifacts created, Open questions" as the handoff payload. This maps directly to babysitter process context passing between tasks.
- **Severity-gated team composition:** The CAPA investigation uses severity level to determine required team members (Critical = 5 people, Major = 3, Minor = 2). This is a reusable pattern for breakpoint routing via expert fields.
- **CAPA necessity determination matrix:** A decision table mapping trigger types (customer complaint, audit finding, nonconformance, trend) to CAPA-required/evaluate/recommended -- reusable as an auto-approval pattern for breakpoints.
