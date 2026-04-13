# vuejs-ai/skills

- **Archetype**: domain-skill-pack
- **Stars**: 2,187
- **Last pushed**: 2026-03-26
- **License**: MIT
- **Discovered**: 2026-04-12
- **Skills found**: 8

## Summary

Official-style Vue.js agent skills for Vue 3 development. Ships 8 skills covering the Vue ecosystem: `vue-best-practices` (core, mandates Composition API + `<script setup>` + TypeScript), `vue-debug-guides` (20KB, largest skill), `vue-router-best-practices`, `vue-pinia-best-practices`, `vue-testing-best-practices`, `vue-options-api-best-practices`, `vue-jsx-best-practices`, and `create-adaptable-composable`. Uses a reference-file architecture (`references/reactivity.md`, `references/sfc.md`, etc.) loaded at task start. Skills cross-reference each other (main skill loads Options API or JSX skill based on project detection).

## Assessment

Strong domain specialization candidate. The 8 skills form a cohesive Vue.js ecosystem covering framework core, routing, state management, testing, and composable patterns. The cross-referencing pattern (main skill conditionally loading sub-skills) demonstrates skill composition. The versioned metadata (`version: "18.0.0"`) suggests active maintenance. The 20KB debug guide is particularly valuable as a structured debugging methodology.

## Extraction Priority
- Medium
- Rationale: Well-structured Vue.js domain skills suitable for `specializations/frontend/vue/`. The cross-referencing pattern and reference-file architecture are transferable. Vue.js is a major framework with broad applicability.

## Processes

### 1. Vue.js Project Quality Audit
- **Source skills**: vue-best-practices, vue-testing-best-practices, vue-debug-guides
- **Placement**: `specializations/frontend/vue-project-quality-audit.js`
- **Description**: Comprehensive Vue.js project audit: architecture confirmation (Composition API vs Options API) -> component boundary planning -> reactivity review -> state management audit (Pinia patterns) -> testing coverage check -> debug guide application for found issues.

### 2. Vue.js Composable Design
- **Source skills**: create-adaptable-composable
- **Placement**: `specializations/frontend/vue-composable-design.js`
- **Description**: Process for designing reusable Vue composables: identify shared logic -> extract composable -> ensure reactivity correctness -> add TypeScript types -> write tests.

## Plugin Ideas

- **Framework Detection plugin**: Auto-detect frontend framework (Vue/React/Svelte/Angular) and load appropriate domain skills for quality audits. Category: DevX.

## Patterns

- Cross-referencing skill composition (main skill conditionally loads sub-skills based on project detection)
- Reference-file architecture with mandatory reading at task start
- "Confirm architecture before coding" as required first step
- Versioned skill metadata with semver
- Ecosystem coverage pattern: core + router + state + testing + variants
- Component boundary planning as mandatory pre-implementation step
