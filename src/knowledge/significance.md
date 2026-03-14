# What Makes Research Significant — Through the Ratchet Lens

<!-- KNOWLEDGE FILE -->
<!-- Injected into classification prompts as zone assignment criteria -->

The "So What" test for every paper: "If this works as claimed, does it change when a task can migrate tiers?" If yes → YELLOW minimum. If it changes the trajectory itself → RED.

Zone assignment is not about excitement. It's about consequence.

---

## RED Zone — Requires Human Strategic Judgment

RED means the system surfaces information only. The human decides what it means and what to do about it. RED is not "the most valuable signal." RED is "the signal with the highest consequence, where autonomous action would be irresponsible."

Assign RED if ANY of these apply:

- **Potential tier migration event.** A paper that could change *when* a task moves down a tier. A fine-tuned 350M model outperforming ChatGPT on tool calling is not incremental — it's a structural signal about the economics of Tier 1 deployment.
- **Ratchet falsification evidence.** A paper suggesting the gap between frontier and local models is widening, not holding constant. Evidence that reasoning capability requires scale that can't be distilled. This is too consequential for autonomous processing — it challenges the foundational thesis.
- **First demonstration of a new capability class at edge scale.** "GPT-4 class inference on a Raspberry Pi" changes the deployment landscape.
- **Major open-weight release with competitive benchmarks.** A new Llama, Mistral, or Qwen release that shifts the sovereignty equation.

RED zone papers are rare. Most "breakthrough" claims don't survive the contrarian lens. Protect the signal.

---

## YELLOW Zone — System Proposes, Human Approves

YELLOW means the system generates a briefing. The human reviews and approves before publication or action. This is the default for papers worth reading.

Assign YELLOW if ANY of these apply:

- **Trajectory confirmation.** Incremental evidence the Ratchet holds — a new quantization method with 2-10% improvement, a small model closing the gap on a specific benchmark.
- **Strong results on practical hardware.** Consumer GPUs, MacBooks, edge devices — not data center hardware.
- **Novel technique with clear tier migration implications.** A new method that makes an existing workflow 20% cheaper or faster at a lower tier.
- **Code released and reproducible.** Results others can verify and build on.
- **From a research group with a track record.** Meta FAIR, Google DeepMind, Microsoft Research, NVIDIA Research, Hugging Face.
- **New governance framework or autonomy taxonomy.** Papers that address the governance gap, even partially.

When in doubt, YELLOW. Better to surface a paper for human review than to auto-archive a signal.

---

## GREEN Zone — Autonomous, No Human Attention Needed

GREEN means the system handles it. Auto-archived. No briefing generated. The system's judgment is sufficient.

Assign GREEN if ANY of these apply:

- **Doesn't affect deployment timelines.** Applies existing methods to a new domain without innovation relevant to tier migration.
- **Theoretical work without implementation.** No empirical results, no hardware benchmarks.
- **Results only on toy models** (<1B parameters) without clear scaling evidence.
- **No comparison to recent baselines.** If you're not benchmarking against GPTQ, AWQ, or current SOTA, the results don't contextualize.
- **Benchmark gaming.** Optimized for metric, not real performance.
- **Survey/review paper** without novel synthesis relevant to the six strategic questions.

GREEN papers are the majority. That's by design. The filter exists to surface the rare signals that matter.

---

## Author Signals

Papers from these groups warrant automatic relevance boost:

**Tier 1 — Watch Closely:**
- Meta FAIR (LLaMA, quantization research)
- Google DeepMind (Gemma, efficiency research)
- Microsoft Research (Phi series, BitNet)
- NVIDIA Research (SLM-for-agents thesis, deployment optimization)
- Hugging Face (practical implementation, transformers library)

**Tier 2 — Worth Noting:**
- EleutherAI / Nous Research (open source focus)
- Together AI (inference optimization)
- Databricks / Mosaic (training efficiency)
- University labs with efficiency focus (CMU, Stanford, Berkeley, MIT)

**Individual Contributors:**
- Georgi Gerganov (llama.cpp — the plumbing of local inference)
- Tim Dettmers (bitsandbytes, QLoRA — quantization that ships)
- Song Han (MIT — efficient AI architecture)

---

## Benchmark Hierarchy

Not all benchmarks are equal. Prioritize evidence that translates to deployment decisions.

**High Signal (affects tier migration):**
- Downstream task performance (MMLU, HumanEval, GSM8K, ToolBench, BFCL)
- Real hardware benchmarks (tokens/sec on specific consumer GPU or edge device)
- Memory usage at inference — determines what hardware tier a model requires
- Total cost of ownership comparisons (cloud vs. self-hosted)
- Energy per request — operational sustainability metric

**Medium Signal:**
- Perplexity on standard datasets (useful but not decisive)
- Zero-shot classification accuracy
- Schema validity and executable call rates for agentic workloads

**Low Signal (does not affect tier migration):**
- Custom benchmarks without public baselines
- Theoretical FLOPs without measured latency
- "Relative improvement" without absolute numbers
- Results only on proprietary benchmarks

---

## Jidoka Triggers — When the Pipeline Stops

The pipeline halts — visibly, with a full trace — under these conditions. These are governance decisions, not error handling.

- **Confidence below threshold.** Classification returns a relevance score in the dead zone (below 0.25). The pipeline doesn't guess. It halts at Recognition: "Confidence below threshold. Manual classification required."
- **Conflicting thesis evidence.** Paper matches keywords for both "gap closing" (Q1) and "gap widening" (Q6). Contradictory signals require human resolution. The pipeline halts at Recognition.
- **Unknown high-signal entity.** New author or institution producing tier-migration-relevant work that's not on the watchlist. Pipeline halts: "New entity detected. Add to watchlist or dismiss."
- **API failure.** No fallback to cached results. No degraded briefing. The Recognition stage fires the andon. Telemetry logs the failure. You don't get a degraded output. You get nothing until you fix it.
- **Malformed data.** arXiv API returns unexpected structure. Telemetry stage fires the andon. No silent retry. No partial processing.

This is Digital Jidoka — machines detect abnormalities, humans approve fixes. It's a philosophical position expressed through constraint.
