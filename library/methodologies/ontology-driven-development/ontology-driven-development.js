/**
 * @process methodologies/ontology-driven-development
 * @description Enhanced Ontology-Driven Development - Robust methodology for complex enterprise scenarios with advanced complexity management, stakeholder alignment, and quality assurance
 * @inputs { projectName: string, domainDescription?: string, ontologyScope?: string, projectComplexity?: string, stakeholderContext?: string, domainType?: string, riskProfile?: string }
 * @outputs { success: boolean, schema: object, knowledgeGraph: object, generators: object, documentation: object, testing: object, sdk: object, interfaces: object, governance: object, riskMitigation: object, metadata: object }
 *
 * @example
 * const result = await orchestrate('methodologies/ontology-driven-development', {
 *   projectName: 'Enterprise Patient Care Platform',
 *   domainDescription: 'Multi-tenant healthcare platform serving 50+ hospitals',
 *   ontologyScope: 'encyclopedic',
 *   projectComplexity: 'enterprise',
 *   stakeholderContext: 'multi-organizational',
 *   domainType: 'healthcare-regulatory',
 *   riskProfile: 'high'
 * });
 *
 * @references
 * - Research: Enterprise Ontology Engineering Best Practices (2024)
 * - METHONTOLOGY enhanced with agile practices
 * - NeOn methodology for networked ontologies
 * - Enterprise Knowledge Graph Development patterns
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

/**
 * Enhanced Ontology-Driven Development Process
 *
 * Methodology: Advanced graph-centric development with enterprise-grade complexity management,
 * multi-stakeholder alignment, robust quality assurance, and domain-specific adaptations.
 *
 * Research-Based Enhancements:
 * - Modular ontology design patterns for complexity management
 * - Multi-stakeholder alignment with collaborative modeling
 * - Advanced quality assurance with multi-level validation
 * - Domain-specific adaptation frameworks
 * - Risk management and technical debt prevention
 * - Enterprise tool integration and governance
 * - Change management for evolving requirements
 * - Scalability patterns for large organizations
 *
 * Complexity Management Framework:
 * - Modular design with clear boundaries and interfaces
 * - Dependency management for ontology modules
 * - Automated complexity monitoring and alerts
 * - Progressive refinement with complexity gates
 *
 * Enhanced Phase Structure:
 * 0. Project Analysis & Planning - Assess complexity, stakeholders, risks
 * 1. Modular Schema Definition - Domain-aware modular ontology design
 * 2. Collaborative Knowledge Graph Construction - Multi-stakeholder modeling
 * 3. Adaptive Generator Creation - Domain-specific generator patterns
 * 4. Strategic Documentation & Wiki - Stakeholder-aligned documentation
 * 5. Multi-Level Testing & Quality - Comprehensive validation framework
 * 6. Governance-Aware SDK Development - Enterprise integration patterns
 * 7. Federated Interface Development - Multi-stakeholder interface design
 * 8. Scalable UI Development - Enterprise-grade user interfaces
 * 9. Governance & Risk Management - Continuous governance and risk mitigation
 *
 * Advanced Quality Convergence:
 * - Multi-dimensional quality metrics (technical, business, stakeholder satisfaction)
 * - Adversarial review with domain expert panels
 * - Automated consistency checking and validation
 * - Business value measurement and ROI tracking
 * - Stakeholder alignment scoring
 * - Technical debt monitoring and prevention
 *
 * @param {Object} inputs - Enhanced process inputs
 * @param {string} inputs.projectName - Name of the project/domain
 * @param {string} inputs.domainDescription - High-level description of the domain
 * @param {string} inputs.ontologyScope - Scope: 'minimal', 'comprehensive', 'encyclopedic' (default: comprehensive)
 * @param {string} inputs.projectComplexity - Complexity: 'simple', 'moderate', 'complex', 'enterprise' (default: moderate)
 * @param {string} inputs.stakeholderContext - Context: 'single-team', 'multi-team', 'multi-department', 'multi-organizational' (default: multi-team)
 * @param {string} inputs.domainType - Domain: 'general', 'healthcare-regulatory', 'financial-compliance', 'manufacturing-iot', 'ai-ml-systems' (default: general)
 * @param {string} inputs.riskProfile - Risk: 'low', 'moderate', 'high', 'critical' (default: moderate)
 * @param {number} inputs.targetQuality - Target quality score 0-100 (default: 85)
 * @param {Object} ctx - Process context (see SDK)
 * @returns {Promise<Object>} Enhanced process result with governance and risk management
 */
export async function process(inputs, ctx) {
  const {
    projectName,
    domainDescription = '',
    ontologyScope = 'comprehensive',
    projectComplexity = 'moderate',
    stakeholderContext = 'multi-team',
    domainType = 'general',
    riskProfile = 'moderate',
    targetQuality = 85,
    maxIterationsPerPhase = getMaxIterations(projectComplexity),
    phase = 'full'
  } = inputs;

  const results = {
    projectName,
    ontologyScope,
    projectComplexity,
    stakeholderContext,
    domainType,
    riskProfile,
    targetQuality,
    schema: null,
    knowledgeGraph: null,
    generators: null,
    documentation: null,
    testing: null,
    sdk: null,
    interfaces: null,
    governance: null,
    riskMitigation: null,
    metadata: {
      totalIterations: 0,
      phaseIterations: {},
      qualityScores: {},
      stakeholderAlignment: {},
      riskMitigation: {},
      complexityMetrics: {},
      businessValueMetrics: {}
    }
  };

  const artifacts = [];

  ctx.log?.('info', `Starting Enhanced Ontology-Driven Development for "${projectName}"`);
  ctx.log?.('info', `Configuration: ${ontologyScope} scope, ${projectComplexity} complexity, ${stakeholderContext} stakeholders, ${domainType} domain, ${riskProfile} risk`);

  // ============================================================================
  // PHASE 0: PROJECT ANALYSIS & PLANNING
  // ============================================================================

  if (phase === 'full' || phase === 'analysis') {
    ctx.log?.('info', 'Phase 0: Project analysis and strategic planning...');

    const analysisResult = await executeIterativePhase(
      ctx,
      'analysis',
      {
        mainTask: projectAnalysisTask,
        taskInputs: {
          projectName,
          domainDescription,
          ontologyScope,
          projectComplexity,
          stakeholderContext,
          domainType,
          riskProfile
        },
        qualityDimensions: ['feasibility', 'stakeholder_alignment', 'risk_assessment', 'resource_planning'],
        targetQuality,
        maxIterations: Math.min(maxIterationsPerPhase, 3), // Analysis doesn't need many iterations
        phaseName: 'Project Analysis & Planning'
      }
    );

    results.projectAnalysis = analysisResult.result;
    results.metadata.phaseIterations['analysis'] = analysisResult.iterations;
    results.metadata.qualityScores['analysis'] = analysisResult.qualityMetrics;
    results.metadata.totalIterations += analysisResult.iterations;
    artifacts.push(...(analysisResult.artifacts || []));

    await ctx.breakpoint({
      question: `Project analysis complete. Complexity: ${analysisResult.result?.complexityAssessment?.level}, Stakeholders: ${analysisResult.result?.stakeholderAnalysis?.count}, Risk Level: ${analysisResult.result?.riskAssessment?.level}. Proceed with recommended approach?`,
      title: 'Project Analysis Review',
      context: {
        runId: ctx.runId,
        data: {
          complexityLevel: analysisResult.result?.complexityAssessment?.level,
          stakeholderCount: analysisResult.result?.stakeholderAnalysis?.count,
          riskLevel: analysisResult.result?.riskAssessment?.level,
          recommendedApproach: analysisResult.result?.recommendedApproach
        },
        files: [
          { path: 'artifacts/odd/PROJECT_ANALYSIS.md', format: 'markdown', label: 'Project Analysis' },
          { path: 'artifacts/odd/STAKEHOLDER_MAP.md', format: 'markdown', label: 'Stakeholder Analysis' },
          { path: 'artifacts/odd/RISK_ASSESSMENT.md', format: 'markdown', label: 'Risk Assessment' }
        ]
      }
    });
  }

  // ============================================================================
  // PHASE 1: MODULAR SCHEMA DEFINITION
  // ============================================================================

  if (phase === 'full' || phase === 'schema') {
    ctx.log?.('info', 'Phase 1: Modular schema definition with complexity management...');

    const phaseResult = await executeIterativePhase(
      ctx,
      'schema',
      {
        mainTask: defineModularOntologySchemaTask,
        taskInputs: {
          projectName,
          domainDescription,
          ontologyScope,
          projectComplexity,
          stakeholderContext,
          domainType,
          projectAnalysis: results.projectAnalysis,
          targetQuality
        },
        qualityDimensions: ['completeness', 'consistency', 'modularity', 'stakeholder_alignment', 'complexity_management'],
        targetQuality,
        maxIterations: maxIterationsPerPhase,
        phaseName: 'Modular Schema Definition'
      }
    );

    results.schema = phaseResult.result;
    results.metadata.phaseIterations['schema'] = phaseResult.iterations;
    results.metadata.qualityScores['schema'] = phaseResult.qualityMetrics;
    results.metadata.totalIterations += phaseResult.iterations;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // ============================================================================
  // PHASE 2: COLLABORATIVE KNOWLEDGE GRAPH CONSTRUCTION
  // ============================================================================

  if (phase === 'full' || phase === 'graph') {
    ctx.log?.('info', 'Phase 2: Collaborative knowledge graph construction...');

    const phaseResult = await executeIterativePhase(
      ctx,
      'graph',
      {
        mainTask: buildCollaborativeKnowledgeGraphTask,
        taskInputs: {
          projectName,
          domainDescription,
          ontologyScope,
          projectComplexity,
          stakeholderContext,
          domainType,
          schema: results.schema,
          projectAnalysis: results.projectAnalysis,
          targetQuality
        },
        qualityDimensions: ['completeness', 'consistency', 'stakeholder_alignment', 'business_value', 'performance'],
        targetQuality,
        maxIterations: maxIterationsPerPhase,
        phaseName: 'Collaborative Knowledge Graph Construction'
      }
    );

    results.knowledgeGraph = phaseResult.result;
    results.metadata.phaseIterations['graph'] = phaseResult.iterations;
    results.metadata.qualityScores['graph'] = phaseResult.qualityMetrics;
    results.metadata.totalIterations += phaseResult.iterations;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // ============================================================================
  // REMAINING PHASES (ABBREVIATED FOR SPACE)
  // ============================================================================

  // Phase 3: Adaptive Generator Creation
  if (phase === 'full' || phase === 'generators') {
    const phaseResult = await executeIterativePhase(ctx, 'generators', {
      mainTask: createAdaptiveGeneratorsTask,
      taskInputs: { projectName, knowledgeGraph: results.knowledgeGraph, domainType, projectComplexity, targetQuality },
      qualityDimensions: ['functionality', 'adaptability', 'performance', 'maintainability'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Adaptive Generator Creation'
    });
    results.generators = phaseResult.result;
    results.metadata.phaseIterations['generators'] = phaseResult.iterations;
    results.metadata.qualityScores['generators'] = phaseResult.qualityMetrics;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // Phase 4: Strategic Documentation & Wiki
  if (phase === 'full' || phase === 'documentation') {
    const phaseResult = await executeIterativePhase(ctx, 'documentation', {
      mainTask: generateStrategicDocumentationTask,
      taskInputs: { projectName, knowledgeGraph: results.knowledgeGraph, generators: results.generators, stakeholderContext, targetQuality },
      qualityDimensions: ['completeness', 'clarity', 'stakeholder_alignment', 'strategic_coherence'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Strategic Documentation & Wiki'
    });
    results.documentation = phaseResult.result;
    results.metadata.phaseIterations['documentation'] = phaseResult.iterations;
    results.metadata.qualityScores['documentation'] = phaseResult.qualityMetrics;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // Phase 5: Multi-Level Testing & Quality
  if (phase === 'full' || phase === 'testing') {
    const phaseResult = await executeIterativePhase(ctx, 'testing', {
      mainTask: designMultiLevelTestingTask,
      taskInputs: { projectName, knowledgeGraph: results.knowledgeGraph, documentation: results.documentation, domainType, riskProfile, targetQuality },
      qualityDimensions: ['coverage', 'effectiveness', 'automation', 'risk_mitigation'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Multi-Level Testing & Quality'
    });
    results.testing = phaseResult.result;
    results.metadata.phaseIterations['testing'] = phaseResult.iterations;
    results.metadata.qualityScores['testing'] = phaseResult.qualityMetrics;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // Phase 6: Governance-Aware SDK Development
  if (phase === 'full' || phase === 'sdk') {
    const phaseResult = await executeIterativePhase(ctx, 'sdk', {
      mainTask: developEnterpriseSDKTask,
      taskInputs: { projectName, knowledgeGraph: results.knowledgeGraph, documentation: results.documentation, testing: results.testing, generators: results.generators, domainType, projectComplexity, targetQuality },
      qualityDimensions: ['functionality', 'performance', 'maintainability', 'enterprise_integration', 'security'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Enterprise SDK Development'
    });
    results.sdk = phaseResult.result;
    results.metadata.phaseIterations['sdk'] = phaseResult.iterations;
    results.metadata.qualityScores['sdk'] = phaseResult.qualityMetrics;
    results.metadata.totalIterations += phaseResult.iterations;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // Phase 7: Federated Interface Development
  if (phase === 'full' || phase === 'interfaces') {
    const phaseResult = await executeIterativePhase(ctx, 'interfaces', {
      mainTask: buildFederatedInterfacesTask,
      taskInputs: { projectName, knowledgeGraph: results.knowledgeGraph, sdk: results.sdk, documentation: results.documentation, testing: results.testing, stakeholderContext, domainType, targetQuality },
      qualityDimensions: ['functionality', 'usability', 'performance', 'enterprise_integration', 'stakeholder_alignment'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Federated Interface Development'
    });
    results.interfaces = phaseResult.result;
    results.metadata.phaseIterations['interfaces'] = phaseResult.iterations;
    results.metadata.qualityScores['interfaces'] = phaseResult.qualityMetrics;
    results.metadata.totalIterations += phaseResult.iterations;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // Phase 8: Scalable UI Development
  if (phase === 'full' || phase === 'ui') {
    const phaseResult = await executeIterativePhase(ctx, 'ui', {
      mainTask: createScalableUITask,
      taskInputs: { projectName, knowledgeGraph: results.knowledgeGraph, interfaces: results.interfaces, sdk: results.sdk, documentation: results.documentation, stakeholderContext, domainType, targetQuality },
      qualityDimensions: ['usability', 'accessibility', 'performance', 'responsive_design', 'stakeholder_satisfaction'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Scalable UI Development'
    });
    if (!results.interfaces) results.interfaces = {};
    results.interfaces.ui = phaseResult.result;
    results.metadata.phaseIterations['ui'] = phaseResult.iterations;
    results.metadata.qualityScores['ui'] = phaseResult.qualityMetrics;
    results.metadata.totalIterations += phaseResult.iterations;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // Phase 9: Governance & Risk Management
  if (phase === 'full' || phase === 'governance') {
    const phaseResult = await executeIterativePhase(ctx, 'governance', {
      mainTask: establishGovernanceTask,
      taskInputs: { projectName, allPhaseResults: results, stakeholderContext, riskProfile, projectComplexity, targetQuality },
      qualityDimensions: ['effectiveness', 'sustainability', 'compliance', 'stakeholder_satisfaction'],
      targetQuality, maxIterations: maxIterationsPerPhase, phaseName: 'Governance & Risk Management'
    });
    results.governance = phaseResult.result;
    results.metadata.phaseIterations['governance'] = phaseResult.iterations;
    results.metadata.qualityScores['governance'] = phaseResult.qualityMetrics;
    artifacts.push(...(phaseResult.artifacts || []));
  }

  // ============================================================================
  // CONTINUOUS RISK MONITORING & MITIGATION
  // ============================================================================

  if (phase === 'full') {
    ctx.log?.('info', 'Continuous risk monitoring and mitigation...');

    const riskMitigationResult = await ctx.task(continuousRiskMonitoringTask, {
      projectName,
      allResults: results,
      riskProfile,
      projectComplexity
    });

    results.riskMitigation = riskMitigationResult;
    artifacts.push(...(riskMitigationResult.artifacts || []));
  }

  // ============================================================================
  // DEBT-DRIVEN DEVELOPMENT: TOP-DOWN GAP ANALYSIS BETWEEN PHASES
  // ============================================================================

  if (phase === 'full') {
    ctx.log?.('info', 'Starting debt-driven development: top-down gap analysis between phases...');

    let debtIterations = 0;
    const maxDebtIterations = Math.min(maxIterationsPerPhase, 3);
    let significantGapsFound = true;

    while (significantGapsFound && debtIterations < maxDebtIterations) {
      debtIterations++;
      ctx.log?.('info', `Debt-driven iteration ${debtIterations}/${maxDebtIterations}`);

      // Top-down gap analysis across all phases
      const crossPhaseGaps = await ctx.task(crossPhaseGapAnalysisTask, {
        projectName,
        allResults: results,
        targetQuality,
        realWorldContext: {
          // Real world against graph and schema
          newInformation: 'latest market trends, competitor analysis, regulatory updates',
          thirdPartyUpdates: 'technology changes, platform updates, security vulnerabilities',
          userFeedback: 'stakeholder feedback, early user testing, business metric changes',
          analyticsData: 'usage patterns, performance metrics, error rates'
        },
        gapTypes: [
          'real-world-vs-graph',    // 1. real world against graph and its schema
          'graph-vs-docs',          // 2. graph against docs
          'quality-vs-docs',        // 3. quality and delivery process against docs
          'generators-vs-docs',     // 4. generators against docs
          'sdk-vs-docs',           // 5. sdk against docs and stuff above
          'interfaces-vs-sdk',     // 6. programmable interfaces against sdk and everything above
          'ui-vs-everything'       // 7. interfaces against everything above
        ],
        iteration: debtIterations
      });

      artifacts.push(...(crossPhaseGaps.artifacts || []));

      if (crossPhaseGaps.significantGaps && crossPhaseGaps.significantGaps.length > 0) {
        ctx.log?.('info', `Found ${crossPhaseGaps.significantGaps.length} significant cross-phase gaps`);

        // Prioritize gaps by impact and cascade effects
        const gapPrioritization = await ctx.task(gapPrioritizationTask, {
          gaps: crossPhaseGaps.significantGaps,
          allResults: results,
          projectContext: { projectName, domainType, riskProfile, stakeholderContext },
          iteration: debtIterations
        });

        artifacts.push(...(gapPrioritization.artifacts || []));

        // Process high-priority gaps first
        for (const prioritizedGap of gapPrioritization.prioritizedGaps) {
          if (prioritizedGap.priority === 'critical' || prioritizedGap.priority === 'high') {
            ctx.log?.('info', `Addressing ${prioritizedGap.priority} gap: ${prioritizedGap.description}`);

            // Update affected phases based on gap analysis
            const gapResolution = await ctx.task(gapResolutionTask, {
              gap: prioritizedGap,
              allResults: results,
              targetQuality,
              affectedPhases: prioritizedGap.affectedPhases,
              iteration: debtIterations
            });

            artifacts.push(...(gapResolution.artifacts || []));

            // Update results with gap resolutions
            if (gapResolution.updatedResults) {
              Object.assign(results, gapResolution.updatedResults);
            }
          }
        }

        // Check if gaps are resolved or if we need another iteration
        const gapResolutionCheck = await ctx.task(gapResolutionVerificationTask, {
          originalGaps: crossPhaseGaps.significantGaps,
          allResults: results,
          targetQuality,
          iteration: debtIterations
        });

        artifacts.push(...(gapResolutionCheck.artifacts || []));
        significantGapsFound = gapResolutionCheck.remainingCriticalGaps > 0;

        if (significantGapsFound) {
          ctx.log?.('info', `${gapResolutionCheck.remainingCriticalGaps} critical gaps remain`);
        } else {
          ctx.log?.('info', 'All critical gaps resolved through debt-driven development');
        }
      } else {
        significantGapsFound = false;
        ctx.log?.('info', 'No significant cross-phase gaps found');
      }

      // Breakpoint for complex gap resolution decisions
      if (significantGapsFound && debtIterations >= maxDebtIterations - 1) {
        await ctx.breakpoint({
          question: `Debt-driven development has completed ${debtIterations} iterations with remaining gaps. Continue iterating or proceed with current state?`,
          title: 'Debt-Driven Development Decision',
          context: {
            runId: ctx.runId,
            data: {
              debtIterations,
              maxDebtIterations,
              remainingGaps: crossPhaseGaps?.significantGaps?.length || 0,
              criticalGaps: crossPhaseGaps?.significantGaps?.filter(g => g.severity === 'critical').length || 0
            }
          }
        });
      }
    }

    results.metadata.debtIterations = debtIterations;
    ctx.log?.('info', `Debt-driven development completed in ${debtIterations} iterations`);
  }

  // ============================================================================
  // FINAL QUALITY ASSESSMENT & BUSINESS VALUE MEASUREMENT
  // ============================================================================

  const finalQualityAssessment = await ctx.task(comprehensiveQualityAssessmentTask, {
    projectName,
    allResults: results,
    targetQuality,
    stakeholderContext,
    projectComplexity
  });

  results.metadata.overallQuality = finalQualityAssessment.overallScore;
  results.metadata.businessValueScore = finalQualityAssessment.businessValue;
  results.metadata.stakeholderSatisfaction = finalQualityAssessment.stakeholderAlignment;

  await ctx.breakpoint({
    question: 'Enhanced Ontology-Driven Development complete. Review comprehensive quality metrics and business value assessment?',
    title: 'Final Enhanced ODD Review',
    context: {
      runId: ctx.runId,
      data: {
        projectName,
        overallQuality: results.metadata.overallQuality,
        businessValue: results.metadata.businessValueScore,
        stakeholderSatisfaction: results.metadata.stakeholderSatisfaction,
        totalIterations: results.metadata.totalIterations,
        riskMitigationScore: results.riskMitigation?.effectivenessScore || 0
      },
      files: [
        { path: 'artifacts/odd/FINAL_QUALITY_ASSESSMENT.md', format: 'markdown', label: 'Quality Assessment' },
        { path: 'artifacts/odd/BUSINESS_VALUE_REPORT.md', format: 'markdown', label: 'Business Value Report' },
        { path: 'artifacts/odd/GOVERNANCE_FRAMEWORK.md', format: 'markdown', label: 'Governance Framework' }
      ]
    }
  });

  return {
    success: results.metadata.overallQuality >= targetQuality * 0.8,
    ...results,
    artifacts,
    metadata: {
      ...results.metadata,
      completedPhases: phase === 'full' ? 10 : 1,
      totalArtifacts: artifacts.length,
      qualityAchieved: results.metadata.overallQuality >= targetQuality,
      enhancementLevel: 'enterprise'
    }
  };
}

// ============================================================================
// ENHANCED PHASE EXECUTION FRAMEWORK
// ============================================================================

/**
 * Execute individual phase with internal iterative convergence
 * Each phase iterates internally until it converges its own deliverables
 */
async function executeIterativePhase(ctx, phaseId, config) {
  const {
    mainTask,
    taskInputs,
    qualityDimensions,
    targetQuality,
    maxIterations,
    phaseName
  } = config;

  ctx.log?.('info', `Starting iterative convergence for ${phaseName}`);

  let iteration = 0;
  let converged = false;
  let currentResult = null;
  let qualityHistory = [];
  let artifacts = [];

  // Initial gap identification - what needs to be achieved in this phase
  const initialGaps = await ctx.task(phaseGapIdentificationTask, {
    phase: phaseId,
    phaseName,
    qualityDimensions,
    targetQuality,
    context: taskInputs
  });

  artifacts.push(...(initialGaps.artifacts || []));

  while (!converged && iteration < maxIterations) {
    iteration++;
    ctx.log?.('info', `${phaseName} - Iteration ${iteration}/${maxIterations}`);

    // Execute the main phase task
    const phaseResult = await ctx.task(mainTask, {
      ...taskInputs,
      iteration,
      previousResult: currentResult,
      identifiedGaps: initialGaps.gaps,
      targetQuality,
      improvementPlan: iteration > 1 ? currentResult?.improvementPlan : null
    });

    artifacts.push(...(phaseResult.artifacts || []));

    // Internal gap analysis - find gaps in current phase output
    const gapAnalysis = await ctx.task(internalGapAnalysisTask, {
      phase: phaseId,
      deliverable: phaseResult,
      expectedOutcomes: initialGaps.expectedOutcomes,
      qualityDimensions,
      iteration,
      context: taskInputs
    });

    artifacts.push(...(gapAnalysis.artifacts || []));

    // Internal adversarial review of phase deliverable
    const adversarialReview = await ctx.task(adversarialReviewTask, {
      phase: phaseId,
      deliverable: phaseResult,
      context: taskInputs,
      iteration
    });

    artifacts.push(...(adversarialReview.artifacts || []));

    // Quality assessment specific to this phase
    const qualityAssessment = await ctx.task(qualityAssessmentTask, {
      phase: phaseId,
      deliverable: phaseResult,
      context: taskInputs,
      adversarialReview,
      iteration,
      targetQuality
    });

    artifacts.push(...(qualityAssessment.artifacts || []));
    qualityHistory.push(qualityAssessment);

    // Convergence assessment - has this phase converged?
    const convergenceResult = await ctx.task(convergenceAssessmentTask, {
      phase: phaseId,
      qualityHistory,
      currentQuality: qualityAssessment,
      adversarialReview,
      gapAnalysis,
      context: taskInputs,
      iteration,
      maxIterations,
      targetQuality
    });

    artifacts.push(...(convergenceResult.artifacts || []));

    currentResult = {
      ...phaseResult,
      qualityMetrics: qualityAssessment,
      gaps: gapAnalysis.gaps,
      adversarialFindings: adversarialReview,
      convergenceStatus: convergenceResult,
      improvementPlan: convergenceResult.recommendations
    };

    converged = convergenceResult.hasConverged;

    if (!converged) {
      ctx.log?.('info', `${phaseName} - Quality: ${qualityAssessment.overallScore}/${targetQuality}, Convergence: ${convergenceResult.convergenceReason}`);

      // Optional breakpoint for critical phases or when iteration limit approaching
      if (iteration >= maxIterations - 1 || qualityAssessment.overallScore < targetQuality * 0.7) {
        await ctx.breakpoint({
          question: `${phaseName} has not converged after ${iteration} iterations (Quality: ${qualityAssessment.overallScore}/${targetQuality}). Continue iterating or proceed with current result?`,
          title: `${phaseName} Convergence Decision`,
          context: {
            runId: ctx.runId,
            data: {
              iteration,
              maxIterations,
              quality: qualityAssessment.overallScore,
              targetQuality,
              convergenceReason: convergenceResult.convergenceReason,
              criticalIssues: adversarialReview.flaws.filter(f => f.severity === 'critical').length,
              majorIssues: adversarialReview.flaws.filter(f => f.severity === 'major').length
            }
          }
        });
      }
    } else {
      ctx.log?.('info', `${phaseName} converged in ${iteration} iterations with quality ${qualityAssessment.overallScore}/${targetQuality}`);
    }
  }

  return {
    result: currentResult,
    iterations: iteration,
    converged,
    qualityMetrics: qualityHistory[qualityHistory.length - 1],
    artifacts
  };
}

/**
 * Execute phase with iterative convergence, adversarial review, and quality gates
 */
async function executeEnhancedPhase(ctx, phaseId, config) {
  const {
    mainTask,
    taskInputs,
    qualityDimensions,
    targetQuality,
    maxIterations,
    phaseName
  } = config;

  let qualityMetrics = {};
  let iteration = 0;
  let result = null;
  const artifacts = [];
  let overallQuality = 0;
  let converged = false;

  ctx.log?.('info', `Starting iterative convergence for ${phaseName} (target: ${targetQuality})`);

  // ITERATIVE CONVERGENCE LOOP WITH ADVERSARIAL REVIEW
  while (!converged && overallQuality < targetQuality && iteration < maxIterations) {
    iteration++;
    ctx.log?.('info', `${phaseName} - Convergence Iteration ${iteration}/${maxIterations}`);

    // ========================================================================
    // STEP 1: EXECUTE MAIN PHASE TASK
    // ========================================================================
    const mainTaskInputs = {
      ...taskInputs,
      iteration,
      previousResult: result,
      qualityTargets: qualityDimensions.reduce((acc, dim) => ({ ...acc, [dim]: targetQuality }), {}),
      improvementPlan: iteration > 1 ? taskInputs.improvementPlan : null
    };

    result = await ctx.task(mainTask, mainTaskInputs);
    artifacts.push(...(result.artifacts || []));

    ctx.log?.('info', `${phaseName} - Phase task completed for iteration ${iteration}`);

    // ========================================================================
    // STEP 2: ADVERSARIAL REVIEW - ACTIVELY SEEK FLAWS
    // ========================================================================
    ctx.log?.('info', `${phaseName} - Conducting adversarial review iteration ${iteration}`);

    const adversarialReview = await ctx.task(adversarialReviewTask, {
      phaseResult: result,
      iteration,
      phaseName,
      stakeholderContext: taskInputs.stakeholderContext || 'multi-team',
      qualityDimensions,
      targetQuality,
      previousIterations: iteration > 1 ? { qualityMetrics, overallQuality } : null
    });

    ctx.log?.('info', `${phaseName} - Adversarial review found ${adversarialReview.issues?.length || 0} issues`);

    // ========================================================================
    // STEP 3: MULTI-DIMENSIONAL QUALITY SCORING
    // ========================================================================
    ctx.log?.('info', `${phaseName} - Quality scoring iteration ${iteration}`);

    const qualityAssessment = await ctx.task(qualityAssessmentTask, {
      phaseResult: result,
      adversarialReview,
      qualityDimensions,
      targetQuality,
      iteration,
      phaseName,
      previousQuality: overallQuality
    });

    qualityMetrics = qualityAssessment.dimensionalScores;
    const newOverallQuality = qualityAssessment.overall;
    const qualityImprovement = newOverallQuality - overallQuality;
    overallQuality = newOverallQuality;

    ctx.log?.('info', `${phaseName} - Quality Score: ${overallQuality}/${targetQuality} (improvement: +${qualityImprovement.toFixed(1)})`);

    // ========================================================================
    // STEP 4: CONVERGENCE ASSESSMENT
    // ========================================================================
    const convergenceResult = await ctx.task(convergenceAssessmentTask, {
      currentQuality: overallQuality,
      targetQuality,
      qualityImprovement,
      iteration,
      maxIterations,
      adversarialReview,
      qualityTrend: iteration > 1 ? qualityMetrics : null
    });

    converged = convergenceResult.converged;
    const shouldContinue = convergenceResult.shouldContinue;

    // ========================================================================
    // STEP 5: BUSINESS VALUE AND RISK ASSESSMENT
    // ========================================================================
    const businessValueResult = await ctx.task(businessValueMeasurementTask, {
      phaseResult: result,
      qualityMetrics,
      iteration,
      phaseName
    });

    const riskAssessment = await ctx.task(phaseRiskAssessmentTask, {
      phaseResult: result,
      qualityMetrics,
      businessValue: businessValueResult,
      iteration,
      phaseName,
      adversarialFindings: adversarialReview.issues
    });

    // ========================================================================
    // STEP 6: COMPLEXITY AND TECHNICAL DEBT MONITORING
    // ========================================================================
    const complexityMetrics = await ctx.task(complexityMonitoringTask, {
      phaseResult: result,
      iteration,
      phaseName,
      qualityTrend: { previous: overallQuality - qualityImprovement, current: overallQuality }
    });

    ctx.log?.('info', `${phaseName} Iteration ${iteration} Summary:`);
    ctx.log?.('info', `  Quality: ${overallQuality}/${targetQuality}`);
    ctx.log?.('info', `  Business Value: ${businessValueResult.score}`);
    ctx.log?.('info', `  Risk Level: ${riskAssessment.level}`);
    ctx.log?.('info', `  Complexity: ${complexityMetrics.complexityScore}`);
    ctx.log?.('info', `  Converged: ${converged}`);

    // ========================================================================
    // STEP 7: IMPROVEMENT PLANNING FOR NEXT ITERATION
    // ========================================================================
    if (!converged && overallQuality < targetQuality && iteration < maxIterations && shouldContinue) {
      ctx.log?.('info', `${phaseName} - Planning improvements for iteration ${iteration + 1}`);

      const improvementPlan = await ctx.task(enhancedImprovementPlanTask, {
        currentResult: result,
        qualityGaps: qualityAssessment.gaps,
        adversarialFindings: adversarialReview.issues,
        businessValueGaps: businessValueResult.gaps,
        riskFactors: riskAssessment.factors,
        complexityIssues: complexityMetrics.alerts,
        targetQuality,
        iteration,
        qualityImprovement
      });

      taskInputs.improvementPlan = improvementPlan;

      // Create detailed action plan for next iteration
      ctx.log?.('info', `${phaseName} - Improvement plan created with ${improvementPlan.priorities?.length || 0} priority actions`);
    }

    // ========================================================================
    // STEP 8: QUALITY GATE CHECKPOINT
    // ========================================================================
    if (iteration >= 2 && iteration % 2 === 0 && !converged) {
      const gateDecision = await ctx.breakpoint({
        question: `${phaseName} Quality Gate - Iteration ${iteration}:

Quality Score: ${overallQuality}/${targetQuality} (${converged ? 'CONVERGED' : 'NOT CONVERGED'})
Business Value: ${businessValueResult.score}/100
Risk Level: ${riskAssessment.level}
Issues Found: ${adversarialReview.issues?.length || 0}

Continue iterating to reach target quality, or accept current state and proceed?`,
        title: `${phaseName} Convergence Quality Gate`,
        context: {
          runId: ctx.runId,
          data: {
            phaseName,
            iteration,
            converged,
            qualityScore: overallQuality,
            targetQuality,
            businessValue: businessValueResult.score,
            riskLevel: riskAssessment.level,
            issuesFound: adversarialReview.issues?.length || 0,
            qualityTrend: qualityImprovement > 0 ? 'improving' : 'stagnant',
            remainingIterations: maxIterations - iteration
          },
          files: [
            { path: `artifacts/odd/${phaseId}/quality-assessment-${iteration}.md`, format: 'markdown', label: 'Quality Assessment' },
            { path: `artifacts/odd/${phaseId}/adversarial-review-${iteration}.md`, format: 'markdown', label: 'Adversarial Review' },
            { path: `artifacts/odd/${phaseId}/improvement-plan-${iteration}.md`, format: 'markdown', label: 'Improvement Plan' }
          ]
        }
      });

      if (!gateDecision) {
        ctx.log?.('info', `${phaseName} - User chose to proceed without reaching target quality`);
        break;
      }
    }

    // ========================================================================
    // STEP 9: CONVERGENCE DECISION
    // ========================================================================
    if (converged) {
      ctx.log?.('info', `${phaseName} - CONVERGED after ${iteration} iterations with quality ${overallQuality}`);
      break;
    }

    if (!shouldContinue) {
      ctx.log?.('info', `${phaseName} - Stopping iterations due to convergence assessment recommendation`);
      break;
    }

    if (iteration >= maxIterations) {
      ctx.log?.('info', `${phaseName} - Reached maximum iterations (${maxIterations}) with quality ${overallQuality}`);
      break;
    }
  }

  // FINAL PHASE SUMMARY
  const finalConverged = overallQuality >= targetQuality;
  ctx.log?.('info', `${phaseName} Complete: ${iteration} iterations, Quality: ${overallQuality}/${targetQuality}, Converged: ${finalConverged}`);

  return {
    result,
    iterations: iteration,
    qualityMetrics,
    overallQuality: Math.round(overallQuality),
    artifacts,
    converged: finalConverged,
    improvementAchieved: overallQuality > 0,
    qualityGrowth: iteration > 1 ? overallQuality - (taskInputs.initialQuality || 0) : overallQuality
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getMaxIterations(complexity) {
  const iterations = {
    'simple': 3,
    'moderate': 5,
    'complex': 7,
    'enterprise': 10
  };
  return iterations[complexity] || 5;
}

// ============================================================================
// ENHANCED TASK DEFINITIONS
// ============================================================================

/**
 * Task: Project Analysis & Planning
 */
const projectAnalysisTask = defineTask({
  name: 'enhanced-project-analysis',
  description: 'Comprehensive project analysis with complexity assessment, stakeholder mapping, and risk evaluation',

  inputs: {
    projectName: { type: 'string', required: true },
    domainDescription: { type: 'string', default: '' },
    ontologyScope: { type: 'string', default: 'comprehensive' },
    projectComplexity: { type: 'string', default: 'moderate' },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    domainType: { type: 'string', default: 'general' },
    riskProfile: { type: 'string', default: 'moderate' }
  },

  outputs: {
    complexityAssessment: { type: 'object' },
    stakeholderAnalysis: { type: 'object' },
    riskAssessment: { type: 'object' },
    resourcePlanning: { type: 'object' },
    recommendedApproach: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Enhanced Project Analysis: ${inputs.projectName}`,
      agent: {
        role: 'enterprise-ontology-strategist',
        goal: `Perform comprehensive project analysis for ${inputs.projectName} to inform strategic planning and risk mitigation`,
        instructions: [
          'Analyze project complexity across multiple dimensions: domain complexity, technical complexity, organizational complexity, regulatory complexity',
          'Map all stakeholders: domain experts, technical teams, business sponsors, end users, regulatory bodies, external partners',
          'Assess stakeholder influence, interest, and potential conflicts',
          'Identify all risk factors: technical risks, business risks, regulatory risks, organizational risks',
          'Evaluate resource requirements: team size, skills needed, timeline, budget implications',
          'Recommend ontology development approach based on complexity and stakeholder context',
          'Create domain-specific adaptation strategy based on domain type',
          'Establish success criteria and key performance indicators',
          'Design governance framework appropriate for stakeholder context',
          'Plan change management strategy for organizational adoption',
          'Create communication plan for multi-stakeholder alignment',
          'Establish quality gates and validation checkpoints'
        ],
        context: {
          projectName: inputs.projectName,
          domainDescription: inputs.domainDescription,
          ontologyScope: inputs.ontologyScope,
          projectComplexity: inputs.projectComplexity,
          stakeholderContext: inputs.stakeholderContext,
          domainType: inputs.domainType,
          riskProfile: inputs.riskProfile
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['project-analysis', 'stakeholder-mapping', 'risk-assessment', 'strategic-planning']
    };
  }
});

/**
 * Task: Define Modular Ontology Schema
 */
const defineModularOntologySchemaTask = defineTask({
  name: 'define-modular-ontology-schema',
  description: 'Define modular ontology schema with complexity management and domain-specific patterns',

  inputs: {
    projectName: { type: 'string', required: true },
    domainDescription: { type: 'string', default: '' },
    ontologyScope: { type: 'string', default: 'comprehensive' },
    projectComplexity: { type: 'string', default: 'moderate' },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    domainType: { type: 'string', default: 'general' },
    projectAnalysis: { type: 'object', default: null },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    modularDesign: { type: 'object' },
    domainOntologies: { type: 'object' },
    goalsOntology: { type: 'object' },      // Business, user, technical goals
    needsOntology: { type: 'object' },      // Functional, non-functional, emotional needs
    constraintsOntology: { type: 'object' }, // Technical, business, regulatory constraints
    productOntology: { type: 'object' },    // Product specs, features, user flows
    designOntology: { type: 'object' },     // UI/UX elements, layouts, interactions
    interfaceDefinitions: { type: 'object' },
    dependencyGraph: { type: 'object' },
    complexityMetrics: { type: 'object' },
    governanceRules: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Define Modular Ontology Schema: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'modular-ontology-architect',
        goal: `Design modular ontology schema for ${inputs.projectName} with complexity management and domain-specific adaptations`,
        instructions: [
          'Apply modular design patterns to manage ontology complexity',
          'Create clear module boundaries based on domain analysis and stakeholder boundaries',
          'Define interfaces and dependencies between ontology modules',
          'Implement domain-specific patterns based on domain type (healthcare, finance, manufacturing, etc.)',
          'Design for scalability and maintainability across enterprise environments',
          'Include strategic ontologies: goals (business, user, technical), needs (functional, non-functional, emotional), constraints (technical, business, regulatory)',
          'Create product ontology: features, user flows, product specifications, page layouts',
          'Design UI/UX ontology: components, visual elements, interactions, responsive behavior',
          'Model complete traceability: goals → needs → features → constraints → design decisions',
          'Create governance rules for module evolution and dependency management',
          'Establish complexity monitoring and alerting mechanisms',
          'Design for multi-stakeholder collaboration and parallel development',
          'Include version control and change management for modular evolution',
          'Address specific requirements from project analysis',
          'Implement improvement plan recommendations if provided',
          'Focus on quality targets for completeness, consistency, modularity, and stakeholder alignment',
          'Create automated validation rules for modular consistency'
        ],
        context: {
          projectName: inputs.projectName,
          domainDescription: inputs.domainDescription,
          projectComplexity: inputs.projectComplexity,
          stakeholderContext: inputs.stakeholderContext,
          domainType: inputs.domainType,
          projectAnalysis: inputs.projectAnalysis,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['modular-ontology', 'complexity-management', 'domain-specific', 'enterprise-architecture', 'strategic-alignment']
    };
  }
});

/**
 * Task: Build Collaborative Knowledge Graph
 */
const buildCollaborativeKnowledgeGraphTask = defineTask({
  name: 'build-collaborative-knowledge-graph',
  description: 'Build knowledge graph with multi-stakeholder collaboration and advanced validation',

  inputs: {
    projectName: { type: 'string', required: true },
    domainDescription: { type: 'string', default: '' },
    ontologyScope: { type: 'string', default: 'comprehensive' },
    projectComplexity: { type: 'string', default: 'moderate' },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    domainType: { type: 'string', default: 'general' },
    schema: { type: 'object', required: true },
    projectAnalysis: { type: 'object', default: null },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    complete: { type: 'object' },
    subgraphs: { type: 'object' },
    productGraph: { type: 'object' },     // Product specifications graph
    designGraph: { type: 'object' },      // UI/UX design graph
    goalsGraph: { type: 'object' },       // Goals and objectives graph
    needsGraph: { type: 'object' },       // User needs and requirements graph
    constraintsGraph: { type: 'object' }, // Constraints and limitations graph
    traceabilityGraph: { type: 'object' }, // Goal-to-feature traceability
    statistics: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Build Collaborative Knowledge Graph: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'collaborative-knowledge-engineer',
        goal: `Build comprehensive knowledge graph with multi-stakeholder collaboration for ${inputs.projectName}`,
        instructions: [
          'Implement collaborative modeling sessions with stakeholder groups',
          'Use domain-driven design principles for knowledge organization',
          'Build comprehensive strategic graphs: goals, needs, constraints with full traceability',
          'Create product specification graph with features, user flows, page layouts',
          'Model UI/UX design graph with components, interactions, responsive behavior',
          'Ensure complete goal-to-feature-to-constraint traceability throughout graph',
          'Create automated consistency checking and validation',
          'Implement performance optimization for enterprise scale',
          'Build stakeholder-specific views and interfaces',
          'Create change tracking and evolution management',
          'Include comprehensive cross-references for encyclopedia generation',
          'Model temporal aspects and evolution patterns',
          'Address improvement plan from previous iteration if provided',
          'Focus on quality targets for completeness, consistency, stakeholder alignment, and business value'
        ],
        context: {
          projectName: inputs.projectName,
          domainDescription: inputs.domainDescription,
          projectComplexity: inputs.projectComplexity,
          stakeholderContext: inputs.stakeholderContext,
          domainType: inputs.domainType,
          schema: inputs.schema,
          projectAnalysis: inputs.projectAnalysis,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['collaborative-modeling', 'knowledge-graph', 'stakeholder-alignment', 'strategic-traceability']
    };
  }
});

// Enhanced review and quality tasks
const multiStakeholderReviewTask = defineTask({
  name: 'multi-stakeholder-review',
  description: 'Multi-stakeholder review process with structured feedback collection',
  inputs: {
    phaseResult: { type: 'object', required: true },
    stakeholderContext: { type: 'string' },
    qualityDimensions: { type: 'array' },
    iteration: { type: 'number' },
    phaseName: { type: 'string' }
  },
  outputs: {
    stakeholderFeedback: { type: 'object' },
    consensusAreas: { type: 'array' },
    conflictAreas: { type: 'array' },
    issues: { type: 'array' },
    recommendations: { type: 'array' }
  },
  async run(inputs, taskCtx) {
    return {
      kind: 'agent',
      title: `Multi-Stakeholder Review - ${inputs.phaseName} Iteration ${inputs.iteration}`,
      agent: {
        role: 'stakeholder-alignment-facilitator',
        goal: 'Facilitate comprehensive review with multiple stakeholder groups',
        instructions: [
          'Coordinate review sessions with different stakeholder groups based on stakeholder context',
          'Collect structured feedback across all quality dimensions',
          'Identify areas of consensus and conflict between stakeholder groups',
          'Facilitate resolution of conflicting requirements through structured negotiation',
          'Document stakeholder priorities, concerns, and success criteria',
          'Create alignment strategies for next iteration',
          'Assess strategic alignment: goals, needs, constraints satisfaction',
          'Evaluate business value perception across stakeholder groups',
          'Document change requests and improvement suggestions'
        ],
        context: {
          phaseResult: inputs.phaseResult,
          stakeholderContext: inputs.stakeholderContext,
          qualityDimensions: inputs.qualityDimensions,
          iteration: inputs.iteration,
          phaseName: inputs.phaseName
        }
      },
      io: { inputJsonPath: `tasks/${taskCtx.effectId}/input.json`, outputJsonPath: `tasks/${taskCtx.effectId}/result.json` },
      labels: ['stakeholder-review', 'consensus-building', 'feedback-collection', 'conflict-resolution']
    };
  }
});

const multiDimensionalQualityTask = defineTask({
  name: 'multi-dimensional-quality-assessment',
  description: 'Multi-dimensional quality assessment with business value integration',
  inputs: {
    phaseResult: { type: 'object' },
    stakeholderReview: { type: 'object' },
    qualityDimensions: { type: 'array' },
    targetQuality: { type: 'number' },
    iteration: { type: 'number' },
    phaseName: { type: 'string' }
  },
  outputs: {
    dimensionalScores: { type: 'object' },
    overall: { type: 'number' },
    gaps: { type: 'array' },
    strengths: { type: 'array' },
    improvementPriorities: { type: 'array' }
  },
  async run(inputs, taskCtx) {
    return {
      kind: 'agent',
      title: `Multi-Dimensional Quality Assessment - ${inputs.phaseName} Iteration ${inputs.iteration}`,
      agent: {
        role: 'quality-assessment-specialist',
        goal: 'Provide comprehensive quality assessment across multiple dimensions with business value focus',
        instructions: [
          'Score quality across technical, business, and stakeholder dimensions',
          'Evaluate technical quality: consistency, completeness, performance, maintainability, modularity',
          'Assess business quality: goal alignment, stakeholder satisfaction, ROI potential, strategic coherence',
          'Measure stakeholder quality: consensus level, adoption readiness, training effectiveness',
          'Integrate stakeholder feedback into quality assessment',
          'Weight dimensions based on project context and stakeholder priorities',
          'Identify specific gaps that prevent higher scores',
          'Highlight strengths that should be preserved and built upon',
          'Prioritize improvements by impact on overall quality and business value',
          'Score each dimension 0-100 and calculate weighted overall score',
          'Provide actionable recommendations for quality improvement'
        ],
        context: {
          phaseResult: inputs.phaseResult,
          stakeholderReview: inputs.stakeholderReview,
          qualityDimensions: inputs.qualityDimensions,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          phaseName: inputs.phaseName
        }
      },
      io: { inputJsonPath: `tasks/${taskCtx.effectId}/input.json`, outputJsonPath: `tasks/${taskCtx.effectId}/result.json` },
      labels: ['quality-assessment', 'multi-dimensional', 'business-value', 'stakeholder-integration']
    };
  }
});

// Additional enhanced task definitions
const businessValueMeasurementTask = defineTask({
  name: 'business-value-measurement',
  description: 'Measure business value and ROI potential of phase results',

  inputs: {
    phaseResult: { type: 'object', required: true },
    qualityMetrics: { type: 'object', required: true },
    iteration: { type: 'number', default: 1 },
    phaseName: { type: 'string', required: true }
  },

  outputs: {
    score: { type: 'number' },
    gaps: { type: 'array' },
    projectedROI: { type: 'number' },
    valueDrivers: { type: 'array' },
    timeToValue: { type: 'object' },
    riskAdjustedValue: { type: 'number' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Business Value Assessment - ${inputs.phaseName} Iteration ${inputs.iteration}`,
      agent: {
        role: 'business-value-analyst',
        goal: `Measure and project business value from ${inputs.phaseName} phase results with ROI analysis`,
        instructions: [
          'Evaluate alignment with stated business goals and success metrics',
          'Assess potential for achieving target ROI and value objectives within specified timeframes',
          'Identify key value drivers: cost reduction, revenue enhancement, risk mitigation, efficiency gains',
          'Calculate projected ROI based on implementation costs and expected benefits',
          'Project realistic timeline for value realization and benefit delivery milestones',
          'Assess risk factors that could impact value delivery and adjust projections accordingly',
          'Identify specific gaps that limit business value achievement',
          'Quantify intangible benefits: improved decision making, better stakeholder alignment, reduced technical debt',
          'Compare value potential against industry benchmarks and similar implementations',
          'Recommend specific value enhancement strategies with implementation priorities',
          'Create business case documentation supporting continued investment'
        ],
        context: {
          phaseResult: inputs.phaseResult,
          qualityMetrics: inputs.qualityMetrics,
          iteration: inputs.iteration,
          phaseName: inputs.phaseName
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['business-value', 'roi-measurement', 'value-analysis', 'business-case']
    };
  }
});

const phaseRiskAssessmentTask = defineTask({
  name: 'phase-risk-assessment',
  description: 'Assess and evaluate risks for phase results with comprehensive analysis',

  inputs: {
    phaseResult: { type: 'object', required: true },
    qualityMetrics: { type: 'object', required: true },
    businessValue: { type: 'object', required: true },
    iteration: { type: 'number', default: 1 },
    phaseName: { type: 'string', required: true }
  },

  outputs: {
    level: { type: 'string' },
    factors: { type: 'array' },
    mitigationStrategies: { type: 'array' },
    monitoringPlan: { type: 'object' },
    riskScore: { type: 'number' },
    contingencyPlans: { type: 'array' },
    earlyWarningIndicators: { type: 'array' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Comprehensive Risk Assessment - ${inputs.phaseName} Iteration ${inputs.iteration}`,
      agent: {
        role: 'risk-assessment-specialist',
        goal: `Identify, assess, and develop mitigation strategies for risks in ${inputs.phaseName} phase results`,
        instructions: [
          'Identify technical risks: complexity explosion, performance degradation, integration failures, scalability bottlenecks, security vulnerabilities',
          'Assess business risks: stakeholder misalignment, value delivery shortfalls, resource constraints, market changes, competitive threats',
          'Evaluate organizational risks: change resistance, skills gaps, governance failures, cultural misalignment, training inadequacy',
          'Analyze regulatory and compliance risks: changing regulations, audit failures, data protection violations, industry standard compliance',
          'Determine overall risk level using quantitative scoring methodology',
          'Prioritize risk factors by probability, impact, and detectability',
          'Develop specific, actionable mitigation strategies for each identified risk',
          'Create contingency plans for high-impact, low-probability events',
          'Design early warning indicator systems for proactive risk detection',
          'Establish monitoring plan with regular review cycles and escalation procedures',
          'Assess risk interdependencies and cascading failure scenarios',
          'Calculate risk-adjusted impact on project timeline, budget, and value delivery',
          'Recommend risk tolerance levels and acceptance criteria'
        ],
        context: {
          phaseResult: inputs.phaseResult,
          qualityMetrics: inputs.qualityMetrics,
          businessValue: inputs.businessValue,
          iteration: inputs.iteration,
          phaseName: inputs.phaseName
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['risk-assessment', 'risk-mitigation', 'monitoring', 'contingency-planning']
    };
  }
});

const enhancedImprovementPlanTask = defineTask({
  name: 'enhanced-improvement-plan',
  description: 'Create comprehensive improvement plan for next iteration',
  inputs: {
    currentResult: { type: 'object', required: true },
    qualityGaps: { type: 'array', required: true },
    stakeholderFeedback: { type: 'object', required: true },
    businessValueGaps: { type: 'array', required: true },
    riskFactors: { type: 'array', required: true },
    targetQuality: { type: 'number', required: true },
    iteration: { type: 'number', required: true }
  },
  outputs: {
    improvementPlan: { type: 'object' },
    priorities: { type: 'array' },
    actionItems: { type: 'array' },
    successCriteria: { type: 'object' },
    resourceRequirements: { type: 'object' }
  },
  async run(inputs, taskCtx) {
    return {
      kind: 'agent',
      title: `Enhanced Improvement Planning - Iteration ${inputs.iteration}`,
      agent: {
        role: 'improvement-strategist',
        goal: 'Create comprehensive improvement plan addressing quality gaps, stakeholder feedback, business value, and risk factors',
        instructions: [
          'Analyze all sources of improvement needs: quality gaps, stakeholder feedback, business value gaps, risk factors',
          'Prioritize improvements by impact on target quality and business value',
          'Create specific, actionable items for next iteration',
          'Address highest-impact gaps first while considering stakeholder priorities',
          'Focus on areas that enable strategic goal achievement',
          'Plan improvements to product spec generation capabilities',
          'Design solutions that enhance stakeholder alignment',
          'Create implementation guidance with clear success criteria',
          'Estimate resource requirements and timeline for improvements',
          'Set measurable success criteria for next iteration'
        ],
        context: {
          currentResult: inputs.currentResult,
          qualityGaps: inputs.qualityGaps,
          stakeholderFeedback: inputs.stakeholderFeedback,
          businessValueGaps: inputs.businessValueGaps,
          riskFactors: inputs.riskFactors,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration
        }
      },
      io: { inputJsonPath: `tasks/${taskCtx.effectId}/input.json`, outputJsonPath: `tasks/${taskCtx.effectId}/result.json` },
      labels: ['improvement-planning', 'iteration-planning', 'strategic-enhancement']
    };
  }
});

const complexityMonitoringTask = defineTask({
  name: 'complexity-monitoring',
  description: 'Monitor and assess complexity metrics with proactive alerting',

  inputs: {
    phaseResult: { type: 'object', required: true },
    iteration: { type: 'number', default: 1 },
    phaseName: { type: 'string', required: true }
  },

  outputs: {
    complexityScore: { type: 'number' },
    metrics: { type: 'object' },
    alerts: { type: 'array' },
    recommendations: { type: 'array' },
    trends: { type: 'object' },
    thresholds: { type: 'object' },
    reductionStrategies: { type: 'array' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Complexity Monitoring - ${inputs.phaseName} Iteration ${inputs.iteration}`,
      agent: {
        role: 'complexity-management-specialist',
        goal: `Monitor and assess complexity metrics for ${inputs.phaseName} to prevent complexity explosion and maintain manageable system architecture`,
        instructions: [
          'Measure ontology complexity metrics: schema size, concept count, relationship depth, cyclomatic complexity, interconnection density',
          'Assess stakeholder complexity: number of stakeholder groups, requirement conflicts, communication pathways, decision-making overhead',
          'Evaluate technical complexity: integration points, API complexity, data flow complexity, performance requirements, scalability challenges',
          'Monitor business complexity: goal alignment complexity, constraint interaction complexity, traceability graph density',
          'Calculate composite complexity score using weighted multi-dimensional analysis',
          'Track complexity trends and growth patterns over iterations',
          'Compare against complexity thresholds and industry benchmarks',
          'Generate automated alerts for complexity threshold breaches',
          'Identify complexity hotspots and high-risk areas requiring immediate attention',
          'Recommend specific complexity reduction strategies: modularization, abstraction, refactoring, stakeholder alignment',
          'Design complexity management governance policies and procedures',
          'Create complexity dashboards and monitoring systems for ongoing visibility',
          'Assess impact of complexity on maintainability, performance, and stakeholder adoption'
        ],
        context: {
          phaseResult: inputs.phaseResult,
          iteration: inputs.iteration,
          phaseName: inputs.phaseName
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['complexity-monitoring', 'metrics', 'alerts', 'complexity-management']
    };
  }
});

// Additional task definitions for remaining phases and functions
const createAdaptiveGeneratorsTask = defineTask({
  name: 'create-adaptive-generators',
  description: 'Create comprehensive domain-specific adaptive generators',

  inputs: {
    projectName: { type: 'string', required: true },
    knowledgeGraph: { type: 'object', required: true },
    domainType: { type: 'string', default: 'general' },
    projectComplexity: { type: 'string', default: 'moderate' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    specifications: { type: 'array' },
    implementations: { type: 'object' },
    productSpecGenerators: { type: 'object' },
    uiSpecGenerators: { type: 'object' },
    documentationGenerators: { type: 'object' },
    testGenerators: { type: 'object' },
    validationFramework: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Create Adaptive Generators: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'adaptive-generator-architect',
        goal: `Create comprehensive domain-specific generators with adaptive capabilities for ${inputs.projectName}`,
        instructions: [
          'Design generators for domain-specific patterns based on domain type (healthcare, finance, manufacturing, AI/ML)',
          'Create comprehensive product specification generators that produce goal-driven features with constraint compliance',
          'Build UI/UX specification generators for responsive design with accessibility and user needs alignment',
          'Implement strategic documentation generators with complete traceability from goals to implementation',
          'Create test case generators for multi-level validation (syntactic, semantic, pragmatic, business)',
          'Build adaptive templates that adjust complexity and detail based on project complexity level',
          'Implement validation and consistency checking frameworks across all generated artifacts',
          'Create generators for strategic documentation with full goal-needs-constraints traceability',
          'Build encyclopedia/wiki generators for comprehensive domain knowledge capture',
          'Design API specification generators with enterprise integration patterns',
          'Create compliance documentation generators for regulatory requirements',
          'Implement cross-reference generators for navigation and discovery',
          'Build version control and evolution management for generated artifacts',
          'Design performance-optimized generators for enterprise-scale deployments',
          'Include stakeholder-specific view generators for different audiences',
          'Create business value tracking generators with ROI measurement capabilities',
          'Implement continuous integration generators with automated quality gates',
          'Address improvement plan recommendations if provided from previous iteration'
        ],
        context: {
          projectName: inputs.projectName,
          knowledgeGraph: inputs.knowledgeGraph,
          domainType: inputs.domainType,
          projectComplexity: inputs.projectComplexity,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['adaptive-generators', 'domain-specific', 'strategic-generation', 'enterprise-scale']
    };
  }
});

const generateStrategicDocumentationTask = defineTask({
  name: 'generate-strategic-documentation',
  description: 'Generate comprehensive strategic documentation with stakeholder alignment',

  inputs: {
    projectName: { type: 'string', required: true },
    knowledgeGraph: { type: 'object', required: true },
    generators: { type: 'object', required: true },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    requirements: { type: 'object' },
    specifications: { type: 'object' },
    productSpecification: { type: 'object' },
    uiSpecification: { type: 'object' },
    strategicAlignment: { type: 'object' },
    traceabilityMatrix: { type: 'object' },
    constraintCompliance: { type: 'object' },
    stakeholderViews: { type: 'object' },
    wiki: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Generate Strategic Documentation: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'strategic-documentation-architect',
        goal: `Generate comprehensive strategic documentation with complete stakeholder alignment and traceability for ${inputs.projectName}`,
        instructions: [
          'Generate goal-driven requirements specification with clear business rationale and success criteria',
          'Create comprehensive product specifications with complete feature-to-goal traceability',
          'Build detailed technical specifications with constraint-aware design decisions',
          'Generate UI/UX specifications with user needs alignment and accessibility compliance',
          'Create strategic alignment document showing goals-needs-constraints relationships and resolution strategies',
          'Generate comprehensive traceability matrix linking every feature to goals, user needs, and constraints',
          'Create constraint compliance documentation showing how solutions respect all limitations and regulations',
          'Build stakeholder-specific documentation views tailored to different audience needs and expertise levels',
          'Generate complete domain encyclopedia with strategic context, decision rationale, and cross-references',
          'Create API specifications and integration documentation with enterprise patterns',
          'Build architecture documentation with strategic decision rationale and pattern justification',
          'Generate compliance and regulatory documentation with audit trail capabilities',
          'Create change management documentation with training materials and adoption strategies',
          'Build business case documentation with ROI projections and value realization timelines',
          'Generate governance documentation with policies, procedures, and success metrics',
          'Create cross-reference systems for navigation between specifications and strategic context',
          'Ensure all documentation demonstrates clear goal-needs-constraints alignment and business value',
          'Address improvement plan recommendations if provided from previous iteration',
          'Focus on strategic completeness, traceability gaps, and stakeholder alignment consistency'
        ],
        context: {
          projectName: inputs.projectName,
          knowledgeGraph: inputs.knowledgeGraph,
          generators: inputs.generators,
          stakeholderContext: inputs.stakeholderContext,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['strategic-documentation', 'stakeholder-alignment', 'traceability', 'encyclopedia-generation']
    };
  }
});

const designMultiLevelTestingTask = defineTask({
  name: 'design-multi-level-testing',
  description: 'Design comprehensive multi-level testing and quality assurance framework',

  inputs: {
    projectName: { type: 'string', required: true },
    knowledgeGraph: { type: 'object', required: true },
    documentation: { type: 'object', required: true },
    domainType: { type: 'string', default: 'general' },
    riskProfile: { type: 'string', default: 'moderate' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    strategy: { type: 'object' },
    framework: { type: 'object' },
    verificationMethods: { type: 'array' },
    evidenceBoundaries: { type: 'array' },
    cicdSpecification: { type: 'object' },
    qualityMetrics: { type: 'object' },
    automationFramework: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Design Multi-Level Testing Framework: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'quality-assurance-architect',
        goal: `Design comprehensive multi-level testing and quality assurance framework for ${inputs.projectName} with domain-specific validation`,
        instructions: [
          'Design syntactic validation: OWL consistency checking, schema validation, automated reasoning, inference testing',
          'Create semantic validation: domain expert review processes, cross-reference consistency, logical inference validation',
          'Build pragmatic validation: end-user acceptance testing, performance and scalability testing, integration testing with enterprise systems',
          'Implement business validation: ROI measurement, goal achievement assessment, stakeholder satisfaction surveys',
          'Create domain-specific testing patterns for healthcare, finance, manufacturing, AI/ML systems as applicable',
          'Design stakeholder acceptance testing frameworks with role-based validation scenarios',
          'Build continuous quality monitoring systems with automated dashboards and alerting',
          'Create risk-based testing strategies prioritizing high-impact, high-risk areas',
          'Design evidence boundaries and quality gates for phase transitions',
          'Implement automated testing frameworks for ontology consistency, performance, and business rule validation',
          'Create comprehensive CI/CD pipeline specifications with automated quality gates',
          'Design end-to-end testing scenarios covering complete user journeys and business processes',
          'Build performance and scalability testing frameworks for enterprise-scale deployments',
          'Create security and compliance testing frameworks for regulated domains',
          'Design test data management and synthetic data generation strategies',
          'Implement automated regression testing for ontology evolution and knowledge graph updates',
          'Create quality metrics and KPI frameworks for continuous improvement',
          'Design disaster recovery and business continuity testing scenarios',
          'Address improvement plan recommendations if provided from previous iteration'
        ],
        context: {
          projectName: inputs.projectName,
          knowledgeGraph: inputs.knowledgeGraph,
          documentation: inputs.documentation,
          domainType: inputs.domainType,
          riskProfile: inputs.riskProfile,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['multi-level-testing', 'quality-framework', 'validation', 'automation', 'continuous-quality']
    };
  }
});

const establishGovernanceTask = defineTask({
  name: 'establish-governance',
  description: 'Establish comprehensive governance and risk management framework',

  inputs: {
    projectName: { type: 'string', required: true },
    allPhaseResults: { type: 'object', required: true },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    riskProfile: { type: 'string', default: 'moderate' },
    projectComplexity: { type: 'string', default: 'moderate' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    framework: { type: 'object' },
    policies: { type: 'array' },
    processes: { type: 'array' },
    stakeholderAlignment: { type: 'object' },
    changeManagement: { type: 'object' },
    complianceMapping: { type: 'object' },
    governanceMetrics: { type: 'object' },
    trainingProgram: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Establish Governance Framework: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'enterprise-governance-architect',
        goal: `Establish comprehensive governance and risk management framework for ${inputs.projectName} supporting long-term organizational adoption and sustainable operation`,
        instructions: [
          'Design federated governance model for multi-stakeholder environments with clear accountability and decision-making authority',
          'Create comprehensive change management and evolution policies for ontology lifecycle management',
          'Establish continuous compliance monitoring systems for regulatory requirements and industry standards',
          'Design risk management and mitigation frameworks with proactive identification and response capabilities',
          'Create organizational adoption and training programs with competency development and certification',
          'Build stakeholder alignment processes with conflict resolution and consensus-building mechanisms',
          'Design quality governance with continuous improvement processes and performance measurement',
          'Create data governance policies for information quality, privacy, security, and lifecycle management',
          'Establish technology governance for tool selection, integration standards, and architecture compliance',
          'Design business process governance for value delivery, resource allocation, and performance management',
          'Create compliance mapping and audit trail capabilities for regulatory reporting and verification',
          'Build governance metrics and KPI frameworks for effectiveness measurement and improvement',
          'Design center of excellence structure for capability building and knowledge sharing',
          'Create vendor and partner governance for external relationship management and quality assurance',
          'Establish intellectual property and knowledge management policies for organizational learning',
          'Design governance communication and reporting structures for transparency and accountability',
          'Create governance evolution and improvement processes for continuous framework enhancement',
          'Build crisis management and business continuity governance for resilience and recovery',
          'Address improvement plan recommendations if provided from previous iteration'
        ],
        context: {
          projectName: inputs.projectName,
          allPhaseResults: inputs.allPhaseResults,
          stakeholderContext: inputs.stakeholderContext,
          riskProfile: inputs.riskProfile,
          projectComplexity: inputs.projectComplexity,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['governance', 'risk-management', 'organizational-adoption', 'compliance', 'sustainability']
    };
  }
});

const continuousRiskMonitoringTask = defineTask({
  name: 'continuous-risk-monitoring',
  description: 'Continuous risk monitoring and proactive mitigation system',

  inputs: {
    projectName: { type: 'string', required: true },
    allResults: { type: 'object', required: true },
    riskProfile: { type: 'string', default: 'moderate' },
    projectComplexity: { type: 'string', default: 'moderate' }
  },

  outputs: {
    effectivenessScore: { type: 'number' },
    mitigationStrategies: { type: 'object' },
    monitoringPlan: { type: 'object' },
    earlyWarningSystem: { type: 'object' },
    riskTrends: { type: 'object' },
    contingencyPlans: { type: 'array' },
    escalationProcedures: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Continuous Risk Monitoring System: ${inputs.projectName}`,
      agent: {
        role: 'risk-monitoring-specialist',
        goal: `Implement comprehensive continuous risk monitoring and proactive mitigation system for ${inputs.projectName}`,
        instructions: [
          'Monitor technical debt accumulation and complexity growth with automated metrics and thresholds',
          'Track stakeholder alignment and satisfaction trends through regular surveys and feedback mechanisms',
          'Assess business value delivery and goal achievement progress against established KPIs and success criteria',
          'Monitor quality metrics trends across all phases and identify degradation patterns',
          'Implement proactive risk mitigation strategies with automated triggers and response protocols',
          'Create early warning systems for risk factor detection with predictive analytics and trend analysis',
          'Monitor integration health and performance degradation with real-time system monitoring',
          'Track regulatory compliance status and identify emerging compliance risks',
          'Monitor competitive landscape changes and technology evolution impacts',
          'Assess organizational change resistance and adoption challenges with change management metrics',
          'Create automated risk dashboards with real-time visibility and alert systems',
          'Design escalation procedures for different risk levels and impact categories',
          'Implement contingency planning activation based on risk threshold breaches',
          'Monitor vendor and partner performance with service level agreements and quality metrics',
          'Track project timeline and budget risks with predictive modeling and variance analysis',
          'Create risk communication and reporting systems for stakeholder awareness and decision support',
          'Design risk mitigation effectiveness measurement with continuous improvement feedback loops',
          'Implement disaster recovery and business continuity monitoring with regular testing and validation'
        ],
        context: {
          projectName: inputs.projectName,
          allResults: inputs.allResults,
          riskProfile: inputs.riskProfile,
          projectComplexity: inputs.projectComplexity
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['continuous-monitoring', 'risk-mitigation', 'early-warning', 'proactive-management']
    };
  }
});

const comprehensiveQualityAssessmentTask = defineTask({
  name: 'comprehensive-quality-assessment',
  description: 'Final comprehensive quality assessment across all dimensions',

  inputs: {
    projectName: { type: 'string', required: true },
    allResults: { type: 'object', required: true },
    targetQuality: { type: 'number', default: 85 },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    projectComplexity: { type: 'string', default: 'moderate' }
  },

  outputs: {
    overallScore: { type: 'number' },
    businessValue: { type: 'number' },
    stakeholderAlignment: { type: 'number' },
    technicalQuality: { type: 'number' },
    strategicAlignment: { type: 'number' },
    sustainabilityScore: { type: 'number' },
    recommendations: { type: 'array' },
    improvementPlan: { type: 'object' },
    successMetrics: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Comprehensive Quality Assessment: ${inputs.projectName}`,
      agent: {
        role: 'enterprise-quality-assessor',
        goal: `Perform final comprehensive quality assessment across all dimensions for ${inputs.projectName} with detailed recommendations for ongoing success`,
        instructions: [
          'Assess overall technical quality across all phases: schema design, knowledge graph construction, generators, documentation, testing, SDK, interfaces',
          'Measure business value achievement and ROI potential against established goals and success criteria',
          'Evaluate stakeholder satisfaction and alignment through comprehensive stakeholder feedback analysis',
          'Assess strategic goal achievement and traceability completeness from goals through implementation',
          'Measure ontology quality dimensions: completeness, consistency, modularity, maintainability, performance, scalability',
          'Evaluate documentation quality: clarity, comprehensiveness, accuracy, usability, strategic alignment',
          'Assess governance effectiveness: policy compliance, risk management, change management, organizational adoption',
          'Measure sustainability factors: long-term maintainability, evolution capability, organizational support, resource sustainability',
          'Evaluate complexity management effectiveness: modular design success, technical debt levels, scalability achievement',
          'Assess integration quality: enterprise system compatibility, performance at scale, security compliance',
          'Measure user experience quality: usability, accessibility, performance, satisfaction across all interfaces',
          'Evaluate compliance and regulatory adherence: audit readiness, regulatory requirement satisfaction, risk mitigation',
          'Calculate weighted overall quality score using multi-dimensional assessment framework',
          'Identify areas of excellence that should be preserved and replicated',
          'Identify improvement opportunities with prioritized action plans',
          'Provide strategic recommendations for ongoing evolution and enhancement',
          'Create success metrics framework for continuous quality monitoring and improvement',
          'Design quality governance framework for long-term quality assurance and continuous improvement'
        ],
        context: {
          projectName: inputs.projectName,
          allResults: inputs.allResults,
          targetQuality: inputs.targetQuality,
          stakeholderContext: inputs.stakeholderContext,
          projectComplexity: inputs.projectComplexity
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['comprehensive-assessment', 'final-quality', 'business-value', 'strategic-assessment', 'sustainability']
    };
  }
});

// ============================================================================
// ADDITIONAL PHASE TASK DEFINITIONS
// ============================================================================

/**
 * Task: Develop Enterprise SDK
 */
const developEnterpriseSDKTask = defineTask({
  name: 'develop-enterprise-sdk',
  description: 'Develop enterprise-grade SDK with governance and integration patterns',

  inputs: {
    projectName: { type: 'string', required: true },
    knowledgeGraph: { type: 'object', required: true },
    documentation: { type: 'object', required: true },
    testing: { type: 'object', required: true },
    generators: { type: 'object', required: true },
    domainType: { type: 'string', default: 'general' },
    projectComplexity: { type: 'string', default: 'moderate' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    design: { type: 'object' },
    specification: { type: 'object' },
    scaffolding: { type: 'object' },
    coreLibraries: { type: 'object' },
    integrationAdapters: { type: 'object' },
    securityFramework: { type: 'object' },
    performanceOptimizations: { type: 'object' },
    documentation: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Develop Enterprise SDK: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'enterprise-sdk-architect',
        goal: `Develop enterprise-grade SDK for ${inputs.projectName} with comprehensive integration patterns and governance support`,
        instructions: [
          'Design SDK architecture based on knowledge graph structure and enterprise requirements',
          'Create comprehensive SDK specification with API documentation and usage patterns',
          'Generate SDK scaffolding and core library components with modular design',
          'Build domain-specific integration adapters for enterprise systems (ERP, CRM, MES, etc.)',
          'Implement enterprise security framework with authentication, authorization, and encryption',
          'Design performance optimization strategies for high-throughput enterprise environments',
          'Create comprehensive SDK documentation with examples, tutorials, and best practices',
          'Build testing and validation frameworks for SDK quality assurance',
          'Design SDK versioning and backward compatibility management',
          'Implement SDK governance and compliance features for enterprise policies',
          'Create monitoring and telemetry capabilities for production usage tracking',
          'Design error handling and logging frameworks with enterprise-grade diagnostics',
          'Build caching and optimization strategies for enterprise-scale performance',
          'Create SDK configuration and customization frameworks for enterprise deployment',
          'Implement data transformation and serialization optimizations',
          'Design SDK plugin and extension architecture for customization',
          'Address improvement plan recommendations if provided from previous iteration'
        ],
        context: {
          projectName: inputs.projectName,
          knowledgeGraph: inputs.knowledgeGraph,
          documentation: inputs.documentation,
          testing: inputs.testing,
          generators: inputs.generators,
          domainType: inputs.domainType,
          projectComplexity: inputs.projectComplexity,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['enterprise-sdk', 'integration-patterns', 'performance', 'security', 'governance']
    };
  }
});

/**
 * Task: Build Federated Interfaces
 */
const buildFederatedInterfacesTask = defineTask({
  name: 'build-federated-interfaces',
  description: 'Build federated programmable interfaces (CLI/MCP/API) for multi-stakeholder environments',

  inputs: {
    projectName: { type: 'string', required: true },
    knowledgeGraph: { type: 'object', required: true },
    sdk: { type: 'object', required: true },
    documentation: { type: 'object', required: true },
    testing: { type: 'object', required: true },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    domainType: { type: 'string', default: 'general' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    cli: { type: 'object' },
    mcp: { type: 'object' },
    api: { type: 'object' },
    federationFramework: { type: 'object' },
    securityModel: { type: 'object' },
    performanceOptimizations: { type: 'object' },
    monitoringSystem: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Build Federated Interfaces: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'federated-interface-architect',
        goal: `Build comprehensive federated programmable interfaces for ${inputs.projectName} supporting multi-stakeholder access patterns`,
        instructions: [
          'Design comprehensive CLI interface with role-based command access and enterprise authentication',
          'Create MCP server specifications for Claude integration with federated governance',
          'Build REST/GraphQL API interfaces with comprehensive enterprise security and rate limiting',
          'Design federation framework for distributed ownership while maintaining coordination',
          'Implement role-based access control with fine-grained permissions and audit trails',
          'Create API gateway patterns for enterprise integration and traffic management',
          'Build comprehensive security model with OAuth2/OIDC, API keys, and certificate-based authentication',
          'Design performance optimization strategies for high-concurrency enterprise environments',
          'Implement caching and CDN strategies for global enterprise deployment',
          'Create monitoring and observability systems with metrics, logging, and distributed tracing',
          'Design error handling and resilience patterns with circuit breakers and fallback mechanisms',
          'Build comprehensive API documentation with interactive testing and code examples',
          'Create SDK bindings for multiple programming languages and enterprise platforms',
          'Implement versioning and backward compatibility strategies for enterprise API evolution',
          'Design batch processing and bulk operations for enterprise-scale data handling',
          'Create webhook and event streaming capabilities for real-time enterprise integration',
          'Address improvement plan recommendations if provided from previous iteration'
        ],
        context: {
          projectName: inputs.projectName,
          knowledgeGraph: inputs.knowledgeGraph,
          sdk: inputs.sdk,
          documentation: inputs.documentation,
          testing: inputs.testing,
          stakeholderContext: inputs.stakeholderContext,
          domainType: inputs.domainType,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['federated-interfaces', 'api-design', 'cli', 'mcp', 'enterprise-integration']
    };
  }
});

/**
 * Task: Create Scalable UI
 */
const createScalableUITask = defineTask({
  name: 'create-scalable-ui',
  description: 'Create scalable user interfaces (web/mobile/TUI) with accessibility and performance optimization',

  inputs: {
    projectName: { type: 'string', required: true },
    knowledgeGraph: { type: 'object', required: true },
    interfaces: { type: 'object', required: true },
    sdk: { type: 'object', required: true },
    documentation: { type: 'object', required: true },
    stakeholderContext: { type: 'string', default: 'multi-team' },
    domainType: { type: 'string', default: 'general' },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 },
    previousResult: { type: 'object', default: null },
    improvementPlan: { type: 'object', default: null },
    qualityTargets: { type: 'object', default: {} }
  },

  outputs: {
    web: { type: 'object' },
    mobile: { type: 'object' },
    tui: { type: 'object' },
    designSystem: { type: 'object' },
    accessibilityFramework: { type: 'object' },
    performanceOptimizations: { type: 'object' },
    internationalization: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Create Scalable UI: ${inputs.projectName} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'scalable-ui-architect',
        goal: `Create comprehensive scalable user interfaces for ${inputs.projectName} with accessibility, performance, and multi-stakeholder support`,
        instructions: [
          'Design responsive web application interface with modern frameworks and progressive web app capabilities',
          'Create mobile application specifications for iOS and Android with native and hybrid approaches',
          'Design terminal UI for command-line users with rich interactive capabilities and accessibility',
          'Build comprehensive design system with reusable components, consistent styling, and accessibility compliance',
          'Implement WCAG 2.1 AA accessibility compliance with screen reader support and keyboard navigation',
          'Create performance optimization strategies with lazy loading, code splitting, and caching',
          'Design internationalization framework with support for multiple languages and cultural adaptations',
          'Build responsive design patterns with mobile-first approach and adaptive layouts',
          'Create user experience optimization with usability testing and feedback integration',
          'Design dark mode and high contrast themes for accessibility and user preference',
          'Implement state management patterns for complex enterprise applications',
          'Create error handling and user feedback systems with graceful degradation',
          'Build offline capability and progressive enhancement for mobile and unreliable networks',
          'Design component testing and visual regression testing frameworks',
          'Create performance monitoring and real user monitoring (RUM) integration',
          'Build comprehensive UI documentation with component libraries and usage guidelines',
          'Address improvement plan recommendations if provided from previous iteration'
        ],
        context: {
          projectName: inputs.projectName,
          knowledgeGraph: inputs.knowledgeGraph,
          interfaces: inputs.interfaces,
          sdk: inputs.sdk,
          documentation: inputs.documentation,
          stakeholderContext: inputs.stakeholderContext,
          domainType: inputs.domainType,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration,
          previousResult: inputs.previousResult,
          improvementPlan: inputs.improvementPlan,
          qualityTargets: inputs.qualityTargets
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['scalable-ui', 'accessibility', 'performance', 'responsive-design', 'user-experience']
    };
  }
});

/**
 * Task: Adversarial Review
 * Purpose: Actively seek flaws, gaps, and weaknesses in phase deliverables
 */
const adversarialReviewTask = defineTask({
  name: 'adversarial-review',
  description: 'Conduct thorough adversarial review to identify flaws, gaps, and potential failures',

  inputs: {
    phase: { type: 'string', required: true },
    deliverable: { type: 'object', required: true },
    context: { type: 'object', required: true },
    previousReviews: { type: 'array', default: [] },
    iteration: { type: 'number', default: 0 }
  },

  outputs: {
    flaws: { type: 'array' },
    gaps: { type: 'array' },
    risks: { type: 'array' },
    recommendations: { type: 'array' },
    severity: { type: 'string' },
    needsIteration: { type: 'boolean' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Adversarial Review: ${inputs.phase} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'adversarial-reviewer',
        goal: `Identify flaws, gaps, and potential failures in ${inputs.phase} deliverables`,
        instructions: [
          'Act as a hostile critic seeking to identify every possible flaw and weakness',
          'Look for logical inconsistencies, missing requirements, and incomplete coverage',
          'Identify potential failure points and edge cases that could cause problems',
          'Challenge assumptions and question whether deliverables meet stated goals',
          'Check for alignment with business goals, user needs, and constraints',
          'Evaluate technical feasibility and potential implementation challenges',
          'Look for gaps in stakeholder coverage and requirement satisfaction',
          'Assess scalability, maintainability, and long-term viability concerns',
          'Identify missing traceability and documentation gaps',
          'Check for regulatory compliance and security vulnerabilities',
          'Look for performance bottlenecks and resource constraints',
          'Evaluate user experience and accessibility concerns',
          'Assess organizational change management and adoption risks',
          'Challenge the completeness and accuracy of strategic alignment',
          'Look for contradictions between different parts of the deliverable',
          'Identify areas where more detail or clarification is needed',
          'Categorize findings by severity: critical, major, minor',
          'Provide specific, actionable recommendations for each identified issue',
          'Determine whether another iteration is needed based on findings',
          'Focus on preventing real-world implementation failures'
        ],
        context: {
          phase: inputs.phase,
          deliverable: inputs.deliverable,
          projectContext: inputs.context,
          previousReviews: inputs.previousReviews,
          iteration: inputs.iteration
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['adversarial-review', 'quality-assurance', 'flaw-detection', 'risk-assessment']
    };
  }
});

/**
 * Task: Multi-Dimensional Quality Assessment
 * Purpose: Comprehensive quality scoring across multiple dimensions
 */
const qualityAssessmentTask = defineTask({
  name: 'quality-assessment',
  description: 'Comprehensive multi-dimensional quality assessment with scoring',

  inputs: {
    phase: { type: 'string', required: true },
    deliverable: { type: 'object', required: true },
    context: { type: 'object', required: true },
    adversarialReview: { type: 'object', required: true },
    iteration: { type: 'number', default: 0 },
    targetQuality: { type: 'number', default: 85 }
  },

  outputs: {
    overallScore: { type: 'number' },
    dimensionScores: { type: 'object' },
    qualityMetrics: { type: 'object' },
    strengths: { type: 'array' },
    weaknesses: { type: 'array' },
    improvementAreas: { type: 'array' },
    meetsTarget: { type: 'boolean' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Quality Assessment: ${inputs.phase} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'quality-assessor',
        goal: `Comprehensively assess quality of ${inputs.phase} deliverables across multiple dimensions`,
        instructions: [
          'Evaluate technical quality: completeness, consistency, correctness, maintainability',
          'Assess business quality: goal alignment, value delivery, stakeholder satisfaction',
          'Evaluate process quality: methodology adherence, documentation quality, traceability',
          'Assess strategic quality: alignment with goals, needs satisfaction, constraint compliance',
          'Check usability quality: user experience, accessibility, performance',
          'Evaluate security quality: threat mitigation, compliance, data protection',
          'Assess scalability quality: performance under load, architectural soundness',
          'Check integration quality: system compatibility, API design, data flow',
          'Score each dimension on 0-100 scale with detailed justification',
          'Calculate weighted overall score based on phase importance and context',
          'Identify specific strengths that should be preserved and enhanced',
          'Pinpoint weaknesses that require immediate attention',
          'Provide concrete improvement recommendations with priority levels',
          'Consider feedback from adversarial review in scoring',
          'Account for iteration progress and improvement trajectory',
          'Determine if deliverable meets target quality threshold',
          'Provide detailed metrics and evidence for all scores',
          'Include comparative analysis with previous iterations if applicable',
          'Focus on objective, measurable criteria where possible',
          'Balance perfectionism with practical delivery constraints'
        ],
        context: {
          phase: inputs.phase,
          deliverable: inputs.deliverable,
          projectContext: inputs.context,
          adversarialReview: inputs.adversarialReview,
          iteration: inputs.iteration,
          targetQuality: inputs.targetQuality
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['quality-assessment', 'multi-dimensional-scoring', 'metrics', 'evaluation']
    };
  }
});

/**
 * Task: Convergence Assessment
 * Purpose: Determine if phase has converged to acceptable quality
 */
const convergenceAssessmentTask = defineTask({
  name: 'convergence-assessment',
  description: 'Assess whether phase has converged to acceptable quality and completion',

  inputs: {
    phase: { type: 'string', required: true },
    qualityHistory: { type: 'array', required: true },
    currentQuality: { type: 'object', required: true },
    adversarialReview: { type: 'object', required: true },
    context: { type: 'object', required: true },
    iteration: { type: 'number', default: 0 },
    maxIterations: { type: 'number', default: 5 },
    targetQuality: { type: 'number', default: 85 }
  },

  outputs: {
    hasConverged: { type: 'boolean' },
    shouldContinue: { type: 'boolean' },
    convergenceReason: { type: 'string' },
    qualityTrend: { type: 'object' },
    recommendations: { type: 'array' },
    nextActions: { type: 'array' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Convergence Assessment: ${inputs.phase} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'convergence-analyst',
        goal: `Determine convergence status and next actions for ${inputs.phase}`,
        instructions: [
          'Analyze quality improvement trend across iterations',
          'Assess whether target quality threshold has been achieved',
          'Evaluate diminishing returns and improvement plateau patterns',
          'Check if critical flaws from adversarial review have been addressed',
          'Determine if maximum iteration limit should trigger conclusion',
          'Analyze cost-benefit of additional iterations vs. current quality level',
          'Assess readiness for next phase or if more work is needed in current phase',
          'Consider business value delivery vs. perfectionism balance',
          'Evaluate stakeholder satisfaction and acceptance criteria',
          'Check for emergent issues that require fundamental approach changes',
          'Assess resource constraints and timeline pressures',
          'Determine if quality is "good enough" for current project context',
          'Look for signs of over-iteration or analysis paralysis',
          'Evaluate improvement velocity and likelihood of future gains',
          'Consider risk tolerance and failure consequences',
          'Provide clear convergence decision with evidence-based reasoning',
          'Recommend specific next actions based on convergence status',
          'If not converged: provide prioritized improvement plan',
          'If converged: recommend transition strategy to next phase',
          'Document lessons learned and convergence insights for future phases'
        ],
        context: {
          phase: inputs.phase,
          qualityHistory: inputs.qualityHistory,
          currentQuality: inputs.currentQuality,
          adversarialReview: inputs.adversarialReview,
          projectContext: inputs.context,
          iteration: inputs.iteration,
          maxIterations: inputs.maxIterations,
          targetQuality: inputs.targetQuality
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['convergence-assessment', 'decision-making', 'quality-analysis', 'iteration-control']
    };
  }
});

/**
 * Task: Phase Gap Identification
 * Purpose: Identify what needs to be achieved in this phase
 */
const phaseGapIdentificationTask = defineTask({
  name: 'phase-gap-identification',
  description: 'Identify gaps and required outcomes for a specific phase',

  inputs: {
    phase: { type: 'string', required: true },
    phaseName: { type: 'string', required: true },
    qualityDimensions: { type: 'array', required: true },
    targetQuality: { type: 'number', default: 85 },
    context: { type: 'object', required: true }
  },

  outputs: {
    gaps: { type: 'array' },
    expectedOutcomes: { type: 'object' },
    successCriteria: { type: 'array' },
    qualityTargets: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Phase Gap Identification: ${inputs.phaseName}`,
      agent: {
        role: 'phase-gap-analyst',
        goal: `Identify gaps and required outcomes for ${inputs.phaseName} phase`,
        instructions: [
          'Analyze what specific outcomes this phase must deliver',
          'Identify gaps between current state and required phase deliverables',
          'Define success criteria specific to this phase',
          'Establish quality targets for each quality dimension',
          'Consider phase-specific requirements based on project context',
          'Identify potential challenges and obstacles for this phase',
          'Define clear, measurable outcomes that indicate phase completion',
          'Consider dependencies on previous phases (if any)',
          'Establish criteria for internal convergence within this phase',
          'Identify stakeholder expectations specific to this phase',
          'Define what "good enough" looks like for this phase context',
          'Consider domain-specific requirements and constraints',
          'Establish priorities among different outcome categories',
          'Identify critical vs. nice-to-have outcomes',
          'Define validation criteria for each expected outcome'
        ],
        context: {
          phase: inputs.phase,
          phaseName: inputs.phaseName,
          qualityDimensions: inputs.qualityDimensions,
          targetQuality: inputs.targetQuality,
          projectContext: inputs.context
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['gap-identification', 'phase-planning', 'outcome-definition']
    };
  }
});

/**
 * Task: Internal Gap Analysis
 * Purpose: Find gaps in current phase deliverable against expected outcomes
 */
const internalGapAnalysisTask = defineTask({
  name: 'internal-gap-analysis',
  description: 'Analyze gaps in phase deliverable against expected outcomes',

  inputs: {
    phase: { type: 'string', required: true },
    deliverable: { type: 'object', required: true },
    expectedOutcomes: { type: 'object', required: true },
    qualityDimensions: { type: 'array', required: true },
    iteration: { type: 'number', default: 0 },
    context: { type: 'object', required: true }
  },

  outputs: {
    gaps: { type: 'array' },
    missingElements: { type: 'array' },
    qualityDeficits: { type: 'array' },
    improvementAreas: { type: 'array' },
    gapSeverity: { type: 'string' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Internal Gap Analysis: ${inputs.phase} (Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'gap-analyst',
        goal: `Identify gaps in ${inputs.phase} deliverable against expected outcomes`,
        instructions: [
          'Compare current deliverable against expected phase outcomes',
          'Identify missing elements that were expected but not delivered',
          'Assess quality deficits in delivered elements',
          'Look for incomplete or superficial treatment of requirements',
          'Identify areas where more depth or detail is needed',
          'Check coverage of all quality dimensions for this phase',
          'Assess whether deliverable meets phase success criteria',
          'Identify gaps in alignment with project context and constraints',
          'Look for internal inconsistencies within the deliverable',
          'Assess completeness of traceability and documentation',
          'Identify areas where stakeholder needs are not addressed',
          'Check for missing domain-specific considerations',
          'Evaluate whether deliverable supports next phases effectively',
          'Assess practical implementability of current deliverable',
          'Identify gaps that could lead to downstream problems',
          'Prioritize gaps by severity and impact on overall success',
          'Provide specific, actionable recommendations for each gap',
          'Consider iteration history and improvement trajectory',
          'Balance thoroughness with practical delivery constraints',
          'Focus on gaps that matter for phase convergence'
        ],
        context: {
          phase: inputs.phase,
          currentDeliverable: inputs.deliverable,
          expectedOutcomes: inputs.expectedOutcomes,
          qualityDimensions: inputs.qualityDimensions,
          iteration: inputs.iteration,
          projectContext: inputs.context
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['gap-analysis', 'quality-assessment', 'improvement-identification']
    };
  }
});

/**
 * Task: Cross-Phase Gap Analysis
 * Purpose: Top-down analysis of gaps between phases and real world
 */
const crossPhaseGapAnalysisTask = defineTask({
  name: 'cross-phase-gap-analysis',
  description: 'Comprehensive top-down gap analysis across all phases against real world',

  inputs: {
    projectName: { type: 'string', required: true },
    allResults: { type: 'object', required: true },
    targetQuality: { type: 'number', default: 85 },
    realWorldContext: { type: 'object', required: true },
    gapTypes: { type: 'array', required: true },
    iteration: { type: 'number', default: 0 }
  },

  outputs: {
    significantGaps: { type: 'array' },
    gapsByType: { type: 'object' },
    crossPhaseInconsistencies: { type: 'array' },
    realWorldMisalignments: { type: 'array' },
    cascadeEffects: { type: 'array' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Cross-Phase Gap Analysis: ${inputs.projectName} (Debt Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'cross-phase-gap-analyst',
        goal: `Identify gaps between phases and against real-world context for ${inputs.projectName}`,
        instructions: [
          '1. REAL WORLD vs GRAPH & SCHEMA: Compare current results against latest real-world information',
          '   - Check for new market trends, competitor moves, regulatory changes',
          '   - Verify technology updates, security vulnerabilities, platform changes',
          '   - Analyze user feedback, analytics data, performance metrics',
          '   - Identify gaps between solution model and current reality',
          '2. GRAPH vs DOCUMENTATION: Verify knowledge graph aligns with generated documentation',
          '   - Check traceability from graph to requirements, specs, architecture docs',
          '   - Identify missing documentation of graph concepts',
          '   - Find inconsistencies between graph structure and documented design',
          '3. QUALITY PROCESS vs DOCS: Verify testing and delivery processes match documentation',
          '   - Check test coverage aligns with documented requirements',
          '   - Verify CI/CD processes match architecture specifications',
          '   - Identify gaps in quality assurance documentation',
          '4. GENERATORS vs DOCS: Verify generators produce outputs consistent with documentation',
          '   - Check generated code matches architectural specifications',
          '   - Verify generated APIs align with documented interfaces',
          '   - Identify inconsistencies in generated vs specified behavior',
          '5. SDK vs DOCS & ABOVE: Verify SDK consistency with documentation and upstream artifacts',
          '   - Check SDK APIs match documented interfaces',
          '   - Verify SDK behavior aligns with generated code and architecture',
          '   - Identify missing SDK features documented in requirements',
          '6. INTERFACES vs SDK & EVERYTHING: Verify programmable interfaces align with SDK and all upstream',
          '   - Check API consistency with SDK and documentation',
          '   - Verify MCP/CLI interfaces match architectural specifications',
          '   - Identify gaps between programmatic and documented interfaces',
          '7. UI vs EVERYTHING: Verify user interfaces align with all upstream artifacts',
          '   - Check UI consistency with SDK, APIs, and documentation',
          '   - Verify user experience matches documented requirements',
          '   - Identify usability gaps against original user needs',
          'For each gap type, identify:',
          '- Specific inconsistencies and missing elements',
          '- Severity and impact on overall solution quality',
          '- Cascade effects that could impact multiple phases',
          '- Root causes and recommended resolution approaches',
          'Prioritize gaps by business impact and technical risk',
          'Consider stakeholder perspectives and change management implications',
          'Focus on gaps that could cause real-world implementation failures'
        ],
        context: {
          projectName: inputs.projectName,
          allResults: inputs.allResults,
          targetQuality: inputs.targetQuality,
          realWorldContext: inputs.realWorldContext,
          gapTypes: inputs.gapTypes,
          iteration: inputs.iteration
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['cross-phase-gap-analysis', 'debt-driven-development', 'real-world-alignment']
    };
  }
});

/**
 * Task: Gap Prioritization
 * Purpose: Prioritize identified gaps by impact and cascade effects
 */
const gapPrioritizationTask = defineTask({
  name: 'gap-prioritization',
  description: 'Prioritize gaps by business impact, technical risk, and cascade effects',

  inputs: {
    gaps: { type: 'array', required: true },
    allResults: { type: 'object', required: true },
    projectContext: { type: 'object', required: true },
    iteration: { type: 'number', default: 0 }
  },

  outputs: {
    prioritizedGaps: { type: 'array' },
    impactAnalysis: { type: 'object' },
    cascadeEffects: { type: 'object' },
    resolutionPlan: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Gap Prioritization (Debt Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'gap-prioritization-analyst',
        goal: 'Prioritize gaps by business impact, technical risk, and cascade effects',
        instructions: [
          'Analyze each gap for business impact: revenue effect, customer satisfaction, competitive advantage',
          'Assess technical risk: system stability, security vulnerabilities, maintainability',
          'Evaluate cascade effects: how fixing this gap affects other phases and deliverables',
          'Consider implementation effort vs. benefit ratio',
          'Assess stakeholder urgency and regulatory compliance implications',
          'Prioritize using framework: Critical > High > Medium > Low',
          'Critical: Blocking deployment, security risk, legal compliance issue',
          'High: Major business impact, significant technical debt, user experience degradation',
          'Medium: Moderate impact, optimization opportunities, nice-to-have features',
          'Low: Minor improvements, cosmetic issues, future enhancements',
          'For each gap, provide:',
          '- Priority level with clear justification',
          '- Affected phases and downstream impacts',
          '- Estimated effort and complexity',
          '- Dependencies and prerequisites',
          '- Risk of not addressing the gap',
          'Create resolution plan with optimal sequencing',
          'Consider resource constraints and timeline pressures',
          'Balance perfectionism with practical delivery needs'
        ],
        context: {
          gaps: inputs.gaps,
          allResults: inputs.allResults,
          projectContext: inputs.projectContext,
          iteration: inputs.iteration
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['gap-prioritization', 'impact-analysis', 'resolution-planning']
    };
  }
});

/**
 * Task: Gap Resolution
 * Purpose: Resolve specific identified gaps and update affected phases
 */
const gapResolutionTask = defineTask({
  name: 'gap-resolution',
  description: 'Resolve specific gap and update affected phases accordingly',

  inputs: {
    gap: { type: 'object', required: true },
    allResults: { type: 'object', required: true },
    targetQuality: { type: 'number', default: 85 },
    affectedPhases: { type: 'array', required: true },
    iteration: { type: 'number', default: 0 }
  },

  outputs: {
    updatedResults: { type: 'object' },
    resolutionActions: { type: 'array' },
    affectedArtifacts: { type: 'array' },
    validationResults: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Gap Resolution: ${inputs.gap.description} (Debt Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'gap-resolution-specialist',
        goal: `Resolve gap: ${inputs.gap.description} and update affected phases`,
        instructions: [
          'Analyze the specific gap and its root causes',
          'Determine optimal resolution approach considering affected phases',
          'Update affected phase deliverables to address the gap',
          'Ensure resolution maintains consistency across all phases',
          'Validate that resolution does not introduce new gaps',
          'Update documentation, code, tests, and other artifacts as needed',
          'Verify resolution against original requirements and constraints',
          'Check for side effects or unintended consequences',
          'Ensure stakeholder alignment with proposed resolution',
          'Update traceability links and cross-references',
          'Validate resolution effectiveness through appropriate testing',
          'Document resolution rationale and implementation details',
          'Consider impact on project timeline and resources',
          'Ensure resolution aligns with overall project goals and quality targets',
          'Provide clear evidence that gap has been resolved',
          'Update affected phase results with resolution changes'
        ],
        context: {
          gap: inputs.gap,
          allResults: inputs.allResults,
          targetQuality: inputs.targetQuality,
          affectedPhases: inputs.affectedPhases,
          iteration: inputs.iteration
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['gap-resolution', 'phase-updates', 'consistency-maintenance']
    };
  }
});

/**
 * Task: Gap Resolution Verification
 * Purpose: Verify that gap resolutions are effective and complete
 */
const gapResolutionVerificationTask = defineTask({
  name: 'gap-resolution-verification',
  description: 'Verify effectiveness and completeness of gap resolutions',

  inputs: {
    originalGaps: { type: 'array', required: true },
    allResults: { type: 'object', required: true },
    targetQuality: { type: 'number', default: 85 },
    iteration: { type: 'number', default: 0 }
  },

  outputs: {
    resolvedGaps: { type: 'array' },
    remainingGaps: { type: 'array' },
    remainingCriticalGaps: { type: 'number' },
    verificationResults: { type: 'object' },
    qualityImprovement: { type: 'object' },
    artifacts: { type: 'array' }
  },

  async run(inputs, taskCtx) {
    const effectId = taskCtx.effectId;

    return {
      kind: 'agent',
      title: `Gap Resolution Verification (Debt Iteration ${inputs.iteration + 1})`,
      agent: {
        role: 'gap-verification-specialist',
        goal: 'Verify effectiveness and completeness of gap resolutions',
        instructions: [
          'Re-examine each original gap to determine resolution status',
          'Verify that resolved gaps are truly addressed in updated results',
          'Check for any gaps that were only partially resolved',
          'Identify any new gaps introduced during resolution process',
          'Assess overall quality improvement from gap resolution',
          'Verify consistency maintained across all phases after resolutions',
          'Check that resolutions align with original requirements and goals',
          'Validate that stakeholder needs are still met after changes',
          'Ensure no regression in previously working functionality',
          'Assess whether remaining gaps are acceptable for deployment',
          'Count critical vs. non-critical remaining gaps',
          'Determine if additional debt-driven iterations are needed',
          'Provide evidence-based assessment of resolution effectiveness',
          'Document lessons learned from gap resolution process',
          'Recommend next steps: continue iterating vs. proceed to deployment',
          'Balance perfectionism with practical delivery constraints'
        ],
        context: {
          originalGaps: inputs.originalGaps,
          allResults: inputs.allResults,
          targetQuality: inputs.targetQuality,
          iteration: inputs.iteration
        }
      },
      io: {
        inputJsonPath: `tasks/${effectId}/input.json`,
        outputJsonPath: `tasks/${effectId}/result.json`
      },
      labels: ['gap-verification', 'resolution-effectiveness', 'quality-validation']
    };
  }
});