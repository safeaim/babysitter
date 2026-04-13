# jackwener/xhs-cli

- **Archetype**: utility-with-skill
- **Stars**: 438
- **Last pushed**: 2026-04-12 (approx)
- **License**: Apache-2.0
- **Discovered**: 2026-04-12
- **Source**: gh-search (code: SKILL.md)
- **Skills found**: 1

## Summary
Headless-browser-based CLI skill for Xiaohongshu (RedNote/XHS). Supports searching notes, reading posts, browsing profiles, liking, favoriting, commenting, and publishing from the terminal. Uses camoufox headless browser for resilience against risk-control detection. Python package installable via uv/pipx.

## Assessment
MEDIUM VALUE. Social media automation skill with interesting anti-detection patterns. The CLI-as-skill pattern and authentication management (cookies, QR code login) are useful patterns for social media domain skills.

## Extraction Priority
LOW-MEDIUM -- The social media automation workflow pattern is extractable for specializations/business/social-media-management. The auth management pattern is reusable.

## Processes
1. **social-media-cli-workflow** -- Authenticate -> search/browse -> interact (like/comment) -> publish
2. **cookie-based-auth-management** -- Auto-extract browser cookies -> fallback to QR code login

## Plugin Ideas
- **social-media-bridge plugin**: Babysitter plugin pattern for CLI-based social media automation

## Implicit Procedural Knowledge
- Headless browser approach vs reverse-engineered API tradeoff
- Anti-detection resilience patterns for social media automation
- Cookie-based authentication with multi-fallback strategy
