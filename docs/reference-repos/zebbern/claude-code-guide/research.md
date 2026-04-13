# zebbern/claude-code-guide

- **Archetype**: skill-collection
- **Stars**: 3,916
- **Last pushed**: 2026-04-11
- **License**: MIT
- **Discovered**: 2026-04-12
- **Skills found**: 29

## Summary

A comprehensive Claude Code guide bundled with 29 security/pentesting-focused SKILL.md files. Skills cover penetration testing workflows: IDOR testing, XSS/HTML injection, Burp Suite, Wireshark analysis, file path traversal, network 101, red team tools, scanning tools, pentest checklists, active directory attacks, API fuzzing, AWS pentesting, broken authentication, cloud pentesting, and ethical hacking methodology. Despite the generic repo name, the skill content is heavily security-oriented.

## Assessment

High value for security domain specialization extraction. The 29 pentesting/security skills represent a coherent domain that maps directly to `specializations/security/`. Covers both offensive (red team, fuzzing, exploitation) and defensive (scanning, analysis) security workflows. The ethical hacking methodology skill could inform a full security-audit babysitter process.

## Extraction Priority
- High
- Rationale: 29 well-structured security skills covering a domain not currently represented in the babysitter process library. Security audit processes are high-demand and directly extractable as `specializations/security/` processes.

## Processes

### 1. Security Penetration Test Workflow
- **Source skills**: pentest-checklist, ethical-hacking-methodology, scanning-tools, red-team-tools
- **Placement**: `specializations/security/penetration-test-workflow.js`
- **Description**: End-to-end pentest process: reconnaissance -> scanning -> vulnerability identification -> exploitation -> reporting. Orchestrates sub-tasks for each phase.

### 2. Web Application Security Audit
- **Source skills**: xss-html-injection, idor-testing, file-path-traversal, broken-authentication, burp-suite-testing
- **Placement**: `specializations/security/web-app-security-audit.js`
- **Description**: OWASP-aligned web app security audit covering injection, authentication, access control, and traversal vulnerabilities.

### 3. Cloud Security Assessment
- **Source skills**: aws-penetration-testing, cloud-penetration-testing
- **Placement**: `specializations/security/cloud-security-assessment.js`
- **Description**: Cloud-specific security assessment covering IAM misconfigurations, exposed services, and cloud-native attack vectors.

### 4. Network Traffic Analysis
- **Source skills**: wireshark-analysis, network-101
- **Placement**: `specializations/security/network-traffic-analysis.js`
- **Description**: Network forensics process for packet capture analysis, protocol inspection, and anomaly detection.

## Plugin Ideas

- **Security Scanner Integration plugin**: Integrate Burp Suite, Nmap, and other security tools as babysitter task executors with structured result parsing. Category: security.
- **Vulnerability Report Generator plugin**: Auto-generate structured vulnerability reports from security audit process runs. Category: security.

## Patterns

- Domain-focused skill collection disguised as general guide
- Checklist-driven security methodology (pentest-checklist as orchestration backbone)
- Tool-specific skills (Burp Suite, Wireshark) as reusable sub-processes
