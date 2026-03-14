# What We Watch and Why

<!-- KNOWLEDGE FILE -->
<!-- Injected into Tier 1/2 prompts as strategic context for paper classification -->

This is a research intelligence tool with a thesis. The thesis: frontier AI capability propagates to local models on a predictable trajectory. What requires a cloud API today runs on consumer hardware in under two years. Six years of METR data. Exponential fit. R² > 0.95.

Every paper on arXiv is evaluated through six strategic questions. These questions are the lens — not the keywords. Keywords cast a net. The questions decide what the net catches.

---

## 1. Is the Gap Closing?

The primary Ratchet evidence. Frontier model capability doubles roughly every 7 months. Local models follow the same trajectory with a ~21-month lag. The gap is ~8x and stays remarkably constant — both ends advance in lockstep.

Every time a smaller model matches a larger one on a production task, that task can migrate down a tier. The Cognitive Router makes this a config change, not a rewrite.

**What to scan for:** SLM benchmarks vs. frontier models. Distillation breakthroughs. Task-specific fine-tuning that narrows the frontier-to-local gap. Per-parameter efficiency gains. Papers that show a 1B or 7B model matching a frontier model on a production task — not toy benchmarks, not cherry-picked datasets. Real tasks, real comparisons.

**Signals of significance:** A fine-tuned 350M model achieving 77% on ToolBench while ChatGPT-CoT scores 26% is not an incremental improvement. It's a structural signal that specialized small models can outperform generalist large ones on constrained tasks. Watch for this pattern repeating across domains.

**Connection to Cognitive Routing:** Every paper in this category is evidence about *when* the next tier migration becomes viable. A task that required Tier 3 yesterday might be Tier 1 tomorrow. The Cognitive Router exists to make that transition a configuration change.

---

## 2. Is the Cost Falling?

Today's miracle becomes tomorrow's commodity. The techniques that matter here are the plumbing that moves frontier capability onto consumer hardware. When a new quantization method drops 4-bit model degradation below 2%, that's not a benchmark improvement — it's a cost collapse event for anyone running a Cognitive Router.

Self-hosted inference already lands at $0.001–0.04 per million tokens — 40–200x cheaper than cloud APIs. Hardware break-even in under 4 months at moderate volume. These numbers shift every quarter.

**What to scan for:** Quantization methods (GPTQ, AWQ, GGUF, NVFP4, MXFP4). Tokens-per-second on specific consumer hardware (RTX 5090, Apple Silicon, Raspberry Pi). Memory footprint reductions. Inference cost comparisons (cloud vs. self-hosted). First-token latency improvements. Energy efficiency per request.

**Signals of significance:** Papers benchmarking on actual consumer hardware — not A100s, not H100s. Break-even analyses. Cost-per-token comparisons that include total cost of ownership. The moment a $35 Raspberry Pi runs production inference is not a curiosity. It's the mainframe-to-PC transition happening again.

**Connection to Cognitive Routing:** Cost collapse events are the trigger for tier migration decisions. When running 27B parameters locally costs less than a cloud API call, Tier 2 becomes Tier 1.

---

## 3. Is Governance Missing?

The gap between capability and accountability is the reason the Autonomaton Pattern exists. Agent autonomy frameworks proliferate. Cascading error risks multiply. Production deployments ship without zone-based governance. The industry is building self-driving cars without traffic laws.

**What to scan for:** Agent autonomy frameworks. Papers on cascading failures in autonomous systems. Governance taxonomies — Google's "Levels of Autonomy," NVIDIA's autonomy definitions, dimensional governance proposals. Production incident reports from autonomous AI systems. Any paper that describes "controllable autonomy" or "execution constraints" — they're converging on the Zone Model without having read it.

**Signals of significance:** Researchers independently arriving at zone-like classifications. Papers that identify the governance gap without solving it structurally. Multi-agent systems with no formal accountability model. These validate the architectural thesis — every paper that identifies the problem without solving it structurally is evidence that the pattern fills a real need.

**Connection to Cognitive Routing:** The governance gap validates the Autonomaton Pattern's existence. A system without governance boundaries is a system where autonomous action is unconstrained. The Zone Model is the answer to a question these papers keep asking.

---

## 4. Is Sovereignty Possible?

Sovereignty is not a philosophy — it's a deployment requirement. Every regulatory mandate for local processing and every open-weight release that makes local competitive is structural pressure toward the distributed model. You don't have to rent cognition. You can own it.

**What to scan for:** Major open-weight releases (Llama, Mistral, Qwen, DeepSeek). On-device inference benchmarks. Data residency regulations that mandate local processing (GDPR, AI Act). Enterprise case studies of self-hosted inference. Hardware advances (NPUs, Apple Silicon, RTX inference). Papers comparing self-hosted total cost of ownership against cloud API contracts.

**Signals of significance:** Open-weight models achieving parity with proprietary models on specific tasks. Regulatory frameworks that structurally mandate local processing. Enterprise deployments where sovereignty was the deciding factor. The gap between "technically possible" and "practically deployed" closing.

**Connection to Cognitive Routing:** The Cognitive Router's Tier 0 and Tier 1 *are* sovereignty. Data never leaves the device. Processing happens locally. Every open-weight release that makes local competitive extends the range of tasks that can run sovereign.

---

## 5. What's the Frontier Doing?

Track the wave the Ratchet rides. What the frontier does today, local does in 21 months. Frontier advances are not threats to the distributed model — they're a preview of what Tier 1 looks like in two years.

**What to scan for:** Flagship releases from Anthropic, OpenAI, Google, Meta. New training techniques. Architecture innovations (MoE, state-space models, hybrid approaches). Scaling law papers. SLM-LLM collaboration frameworks — cascade routing, speculative decoding, hybrid ecosystems where specialized SLMs manage most tasks locally while frontier models handle edge cases.

**Signals of significance:** New capability classes that emerge at scale. Training techniques that later get distilled. Architecture innovations that reduce compute requirements. Collaboration surveys that validate the tiered routing thesis from an academic perspective.

**Connection to Cognitive Routing:** The Cognitive Router's Tier 3 is today's frontier. Tracking frontier advances is tracking what Tier 1 looks like in two years. Collaboration frameworks that pair SLMs with LLMs are the Cognitive Router thesis expressed in academic language.

---

## 6. Is the Gap Widening? (The Falsification Watch)

This section gets the same structural rigor as Questions 1–5. A research intelligence tool that only surfaces confirming evidence is a confirmation bias engine, not intelligence. Credibility comes from being willing to find evidence against your own thesis.

The Ratchet is a bet, not a guarantee. The evidence supports it. The trajectory favors it. But the honest position: we measure whether it holds, including evidence it doesn't.

**What to scan for:** Papers showing diminishing returns from model compression. Evidence that reasoning capability requires scale that can't be distilled. Benchmark categories where small models plateau while large models accelerate. Training techniques that only work at >100B parameters. Emergent capabilities that don't transfer downward. Any data suggesting the Ratchet curve is flattening at the local end.

**Signals of significance:** Specific task categories where the gap demonstrably widens. Reasoning benchmarks where compression produces disproportionate degradation. Open-domain reasoning and long-horizon planning as persistent LLM-only domains. Papers that explicitly delineate limits of SLM capability — not as failure, but as honest boundary-setting.

**Connection to Cognitive Routing:** If the gap is widening, the tier migration thesis weakens. Tier 2 and Tier 3 dependencies become structural rather than transitional. The Cognitive Router still works — but the economics of tier migration change. Some tasks may permanently require apex cognition. That's worth knowing.

---

## A Note on Honest Measurement

The question is not whether capability propagates but who is positioned to benefit when it does. These six questions are not arranged in order of importance. They're arranged as a complete picture — five confirming lenses and one falsifying lens. The falsification watch is not a footnote. It's what makes the other five credible.
