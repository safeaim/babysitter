// Agent Adapter Controller — Slice 1.2a
// Manages AgentAdapter resources: validation, capabilities, transports, and health checks.

export const AGENT_ADAPTER_CONTROLLER_BOUNDARY = {
  role: 'agent-adapter-controller',
  scope: 'AgentAdapter lifecycle: validation, capabilities matrix, transport enumeration, health check stubs',
  owns: ['adapter validation', 'capabilities matrix', 'transport enumeration', 'health check stubs'],
  delegatesTo: ['resource-model'],
  mustNotOwn: ['secret values', 'dispatch execution', 'Agent Mux sessions']
};

const VALID_TRANSPORTS = ['stdio', 'http', 'websocket', 'unix'];
const VALID_ADAPTER_TYPES = ['subprocess', 'remote', 'programmatic'];

/**
 * Validate an AgentAdapter resource. Returns { valid, errors }.
 * @param {object} resource
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgentAdapter(resource) {
  const errors = [];

  // Guard against null/undefined resource
  if (resource == null) {
    errors.push('resource must not be null or undefined');
    return { valid: false, errors };
  }

  // Validate metadata.name
  if (!resource?.metadata?.name) {
    errors.push('metadata.name is required');
  }

  const spec = resource?.spec || {};

  // Validate adapterType
  const adapterType = spec.adapterType;
  if (!adapterType) {
    errors.push(`spec.adapterType is required; valid types are: ${VALID_ADAPTER_TYPES.join(', ')}`);
  } else if (!VALID_ADAPTER_TYPES.includes(adapterType)) {
    errors.push(`spec.adapterType "${adapterType}" is not supported; valid types are: ${VALID_ADAPTER_TYPES.join(', ')}`);
  }

  // Validate transport
  const transport = spec.transport;
  if (!transport) {
    errors.push(`spec.transport is required; valid transports are: ${VALID_TRANSPORTS.join(', ')}`);
  } else if (!VALID_TRANSPORTS.includes(transport)) {
    errors.push(`spec.transport "${transport}" is not supported; valid transports are: ${VALID_TRANSPORTS.join(', ')}`);
  }

  // Validate capabilities — must be a non-empty array
  const capabilities = spec.capabilities;
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    errors.push('spec.capabilities must be a non-empty array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Factory that returns an AgentAdapter controller instance.
 */
export function createAgentAdapterController() {
  return {
    role: 'agent-adapter-controller',

    /**
     * Validate an AgentAdapter resource.
     * @param {object} resource
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate(resource) {
      return validateAgentAdapter(resource);
    },

    /**
     * Return the capabilities matrix for an adapter.
     * @param {object} resource
     * @returns {{ adapterName: string, supported: string[] }}
     */
    getCapabilities(resource) {
      if (resource == null) {
        throw new Error('resource must not be null or undefined');
      }
      const supported = Array.isArray(resource?.spec?.capabilities)
        ? [...resource.spec.capabilities]
        : [];
      return {
        adapterName: resource?.metadata?.name,
        supported
      };
    },

    /**
     * Return the list of supported transport types.
     * @returns {string[]}
     */
    getSupportedTransports() {
      return [...VALID_TRANSPORTS];
    },

    /**
     * Return the list of supported adapter types.
     * @returns {string[]}
     */
    getSupportedAdapterTypes() {
      return [...VALID_ADAPTER_TYPES];
    },

    /**
     * Return a stub health check result.
     * If no healthEndpoint is configured in spec, returns status "unknown" with reason "no-endpoint".
     * If a healthEndpoint is configured, returns status "unknown" with reason "not-implemented".
     * @param {object} resource
     * @returns {{ adapterName: string, status: string, reason: string }}
     */
    healthCheck(resource) {
      if (resource == null) {
        throw new Error('resource must not be null or undefined');
      }
      const adapterName = resource?.metadata?.name;
      const endpoint = resource?.spec?.healthEndpoint;

      if (!endpoint) {
        return { adapterName, status: 'unknown', reason: 'no-endpoint' };
      }

      // Stub: health check is not yet implemented for real endpoints
      return { adapterName, status: 'unknown', reason: 'not-implemented' };
    }
  };
}
