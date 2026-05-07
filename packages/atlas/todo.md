[ ] - agent ui frameworks
[ ] - llm proxy
[ ] - agent orchestration (sublayer of interaction)  - vibe-kanban, etc.
[ ] - cicd types, triggering abilities, etc.
[ ] - dispatches and remote dispatches
[ ] - more features and capabilities of the stack of cc-revex and oh-my-pi 
[ ] - populate memory systems, agentsh and other tools to the graph.
[ ] - testable claims for parts of the agentic ecosystem (tests that can be automated and run in the cicd), e.g. "claude code session lifecycle is X" -> smallest tests (with mocks) to validate or invalidate the claim, then add to the graph. (this will make regression testing and monitoring much easier - of external dependencies integrations) 
[ ] cicd for testable claims - process that runs the tests for the testable claims on a regular basis (e.g. daily) and reports any failures, so we can quickly identify when an external change has broken our assumptions and react accordingly.
[ ] - process that finds untested claims or assumptions in the graph and add "testable claims" to the graph, then prioritize them and add to the test suite. (this will make sure we have good coverage of the most important assumptions in our ecosystem)
[ ] - get rid of graph and schema backward compatability and get rid of process and wave related mentions in the graph. the graph shouldn't track the graph building process itself at all (waves, etc.) - besides defered nodes.
[ ] - defered nodes - nodes that are placeholders and represent a defered task to complete the graph. this will allow us to build the graph iteratively and in parallel, without having to wait for all the information to be available upfront. we can create defered nodes for parts of the graph that we haven't fully defined yet, and then fill them in later as we gather more information. and integrate this concepts with the processes designs in .a5c/processes/ and also create a new process there that detects defered tasks in the graph and replaces them with the actual nodes once the information is available.


https://dev.to/boucle2026/what-claude-code-hooks-can-and-cannot-enforce-148o
https://blakecrosley.com/guides/codex#hooks
https://blakecrosley.com/guides/claude-code

- guide generator (agentic) - from graph:
- course/kit/hub generator (agentic) - from graph:

meta:
sourcing for information
defered nodes (comments too)
scope and context
evidence, experiments. including scoping to what they prove and how it is scoped to the existing entities.
trust tiers on information
(have this in the ontology driven process, some of them as setup-process, including creating the validation script, scaffolding the tools, wiki, sdk, cli, and experiment generation, cicd, etc.)


https://blakecrosley.com/writing/taste-infrastructure


unify canonicalized_to edges nodes to compact the graph.