# Breakpoints Mux Skill

## When to Use

Use the `submit_breakpoint` tool when you need authoritative answers on topics that require specialized domain knowledge. Common scenarios:

- **Architecture decisions**: "Should we use event sourcing or CQRS for this service?"
- **Security reviews**: "Is this authentication flow secure against CSRF?"
- **API design**: "What's the best pagination strategy for this GraphQL endpoint?"
- **Domain-specific implementation**: "How should we handle currency rounding in this billing module?"
- **Performance concerns**: "Will this query scale to 10M rows?"

Do NOT use this tool for questions you can confidently answer yourself from context, documentation, or code analysis.

## Before Asking

1. **Survey available experts first.** Run `list_responders` or inspect the `.a5c/expert/` directory to see who is available and what domains they cover.
2. **Check if the question truly needs an expert.** If you can answer with high confidence from existing code, docs, or general knowledge, do so directly.
3. **Gather context.** Before asking, collect relevant code snippets, file paths, error messages, and constraints that the expert will need.

## Formulating Good Questions

- **Be specific.** Instead of "How should we handle errors?", ask "Should our REST API return RFC 7807 Problem Details or a custom error envelope, given we have both internal and public consumers?"
- **Include context.** Provide the `context` field with what you already know, what you've tried, and what constraints exist.
- **Tag expertise areas.** Use `requiredExpertise` to help match the right expert (e.g., `["typescript", "react"]`).
- **Specify target experts** when you know exactly who should answer (use their expert IDs from the profiles).

## Routing Strategy Guidance

| Strategy | When to Use |
|---|---|
| `single` | You know exactly one expert should answer |
| `first-response-wins` | You want a fast answer and any qualified expert will do |
| `collect-all` | You want multiple perspectives (design reviews, architecture decisions) |
| `quorum` | You want consensus from a majority of experts |

## Example Usage

```
submit_breakpoint({
  questions: [{
    question: "Should we migrate our session store from Redis to DynamoDB given our multi-region deployment?",
    context: "We currently use Redis Cluster in us-east-1. We're expanding to eu-west-1 and ap-southeast-1. Latency SLA is <100ms for session lookups. Current peak: 50k ops/sec.",
    requiredExpertise: ["infrastructure", "aws", "distributed-systems"]
  }],
  routingStrategy: "collect-all",
  timeout: 600000
})
```

## Handling Responses

- If the answer status is `"answered"`, use the expert's response to inform your work.
- If `"timeout"` or `"expired"`, note this to the user and proceed with your best judgment.
- If multiple answers are returned (collect-all / quorum), synthesize them into a coherent recommendation.
- Always attribute expert input: "According to [expert name], ..."
