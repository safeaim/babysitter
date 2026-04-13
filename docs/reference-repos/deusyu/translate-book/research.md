# deusyu/translate-book

- **Archetype**: utility-with-skill
- **Stars**: 616
- **Last pushed**: 2026-04-04
- **License**: MIT
- **Discovered**: 2026-04-12
- **Skills found**: 1

## Summary
Claude Code skill that translates entire books (PDF/DOCX/EPUB) into any language using parallel subagents. Implements a multi-step pipeline: collect parameters -> preprocess (convert to Markdown chunks via Python script) -> discover chunks -> parallel translate (1 chunk = 1 subagent = 1 fresh context) -> reassemble. Default concurrency of 8 parallel subagents per batch. Supports custom translation instructions. The skill explicitly declares allowed-tools and has openclaw metadata requiring python3, pandoc, and calibre/ebook-convert binaries.

## Assessment
MEDIUM-HIGH VALUE. The parallel subagent pattern for large document processing maps directly to babysitter's ctx.parallel.map() pattern. Key design decisions are transferable: 1 chunk = 1 subagent = 1 fresh context (prevents context accumulation and output truncation), batch-based dispatch respecting API rate limits, manifest.json for tracking chunk state, and the preprocess -> parallel process -> reassemble pipeline. The allowed-tools declaration and openclaw requires metadata show how to declare skill dependencies on external binaries. The chunking + manifest pattern is applicable to any embarrassingly parallel document processing task.

## Extraction Priority
- Medium
- Rationale: The parallel document processing pipeline is directly extractable as a babysitter process. The 1-chunk-1-subagent-1-context pattern and batch-based rate limit management are reusable orchestration patterns. However, the translation-specific logic is not broadly transferable. Best suited for specializations/shared/large-document-processing as a methodology template.

## Processes
- **Parallel Document Translation Process**: Collect parameters (file, target language, concurrency, custom instructions) -> preprocess with convert.py (PDF/DOCX/EPUB -> HTML -> Markdown -> chunks + manifest) -> discover untranslated chunks (source chunks minus output_chunks) -> translate in parallel batches (concurrency subagents per batch) -> reassemble translated chunks -> export to target format. A complete babysitter process with ctx.parallel.map() for the translation phase.
- **Large Document Chunking Pipeline**: Convert source format -> split into manageable chunks -> generate manifest for tracking -> process chunks in parallel -> reassemble. A reusable template for any large-document processing task (translation, summarization, analysis, transformation).

## Plugin Ideas
- **Book Translation plugin**: Install.md-driven plugin that sets up the translation pipeline. Install.md verifies python3, pandoc, and calibre dependencies, installs the convert.py script, and configures default concurrency. Provides a /translate-book skill.
- **Parallel Document Processor plugin**: A generic document chunking + parallel processing framework. Install.md configures chunk size, concurrency limits, and processing strategy. Adaptable for translation, summarization, or any chunk-level transformation.

## Patterns
- **1 chunk = 1 subagent = 1 fresh context**: Each chunk gets its own independent subagent with fresh context to prevent context accumulation and output truncation. Critical for quality in large-document processing.
- **Batch-based parallel dispatch**: Launch up to N subagents per batch, wait for batch completion before launching next. Respects API rate limits while maximizing parallelism.
- **Manifest-based progress tracking**: manifest.json tracks all chunks and their processing state. Enables resume-from-failure by discovering which chunks lack output files.
- **Incremental progress detection**: Glob for source chunks vs output chunks to determine remaining work. Supports idempotent re-execution.
- **Binary dependency declaration**: openclaw metadata declaring required binaries (python3, pandoc, ebook-convert) with anyBins for alternatives (calibre OR ebook-convert). A dependency specification pattern for skills with external tool requirements.
- **Preprocess -> parallel process -> reassemble**: The canonical pipeline for embarrassingly parallel document processing. Reusable across translation, summarization, analysis, and transformation tasks.
