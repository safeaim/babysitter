/**
 * @process specializations/common-utilities
 * @description Common reusable utilities for babysitter process composition
 * @graph
 *   domains: [domain:software-engineering]
 *   skillAreas: [skill-area:orchestration-loop]
 *   topics: [topic:developer-experience]
 *   roles: [role:platform-engineer, role:backend-engineer]
 */

export { convertToDocxTask } from './docx-conversion.js';
export { fanOutFanIn, pipeline } from './parallel-combinator.js';
