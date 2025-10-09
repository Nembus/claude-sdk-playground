import { query } from '@anthropic-ai/claude-agent-sdk';
import { validateEnv, printHeader, printSection } from './utils/config.js';

const PROJECT_BRIEF = `
Release Objective: ship a CLI utility that turns raw uptime logs into daily health digests for engineering leadership.

Key inputs the subagents should consider:
- Current telemetry pain points: noisy alerts, slow manual synthesis, lack of success metrics.
- Stakeholders: platform engineering (wants actionable signals), SRE (cares about anomaly detection), leadership (needs crisp rollups).
- Guardrails: prefer TypeScript, must plug into existing log ingestion, emphasize resiliency and observability.

Deliverable expectations for the orchestrator:
- A consolidated package that includes research highlights, an implementation outline, and risk/QA guidance.
- Evidence that parallel delegation saved time compared to serial execution.
- A clear next-step checklist the team can execute immediately.
`;

function extractText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry && typeof entry === 'object' && 'text' in entry) {
          return String((entry as { text: unknown }).text ?? '');
        }
        return '';
      })
      .join(' ')
      .trim();
  }
  if (content && typeof content === 'object' && 'text' in content) {
    return String((content as { text: unknown }).text ?? '').trim();
  }
  return '';
}

async function run(): Promise<void> {
  printHeader('Example 08: Multi-Agent Orchestration');
  validateEnv();

  printSection('Coordinated delegation across specialized subagents');

  const toolRuns = new Map<string, { label: string; start: number; ticker?: ReturnType<typeof setInterval> }>();

  const startTicker = (id: string, label: string): void => {
    const entry = toolRuns.get(id);
    if (!entry) return;
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - entry.start) / 1000);
      console.log(`\n⏳ ${label} subagent still working (${elapsed}s elapsed)...`);
    }, 5000);
    entry.ticker = interval;
    toolRuns.set(id, entry);
  };

  const finishTicker = (id: string, label?: string): void => {
    const entry = toolRuns.get(id);
    if (!entry) return;
    if (entry.ticker) {
      clearInterval(entry.ticker);
    }
    if (label) {
      const total = Math.round((Date.now() - entry.start) / 1000);
      console.log(`\n✅ ${label} subagent returned after ${total}s.`);
    }
    toolRuns.delete(id);
  };

  const orchestratorPrompt = `You are the lead orchestrator for a rapid parallel working session.

Shared project brief:
${PROJECT_BRIEF}

Subagents that you can launch via the Task tool (set subagent_type to the agent id):
- researcher: fast context harvesting, prefers concise bullet summaries with source tagging.
- coder: implementation planner that turns findings into technical work packages and pseudo-code stubs.
- reviewer: quality advocate who checks cohesion, risks, and success metrics.

Execution expectations:
1. Start with a short game plan that explains how the work will be split and why the subagents can operate concurrently.
2. Immediately dispatch the three Task calls so their work happens in parallel; give each subagent focused instructions tailored to its strengths.
3. Wait for all subagent results, then synthesize a single integrated deliverable with these sections:
   - Unified Outcome (one narrative blending all contributions).
   - Integrated Deliverables (table mapping each subagent to its key outputs and how they combine).
   - Parallel Impact (quantify or narrate the time saved versus a sequential approach, referencing overlapping work).
   - Next Actions (numbered checklist the primary team should execute next).
4. The final answer must explicitly weave information from every subagent so nothing feels siloed.
`;

  try {
    const result = query({
      prompt: orchestratorPrompt,
      options: {
        model: 'claude-sonnet-4-5',
        cwd: process.cwd(),
        permissionMode: 'bypassPermissions',
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Task'],
        agents: {
          researcher: {
            description: 'Lightweight analyst who surfaces supporting context and quick wins.',
            prompt:
              'You are a research specialist. Extract the top 3-4 insights that help a team ship a CLI log digest. Reference telemetry pain points and stakeholder needs. Keep output under 160 words.',
            tools: ['Read', 'Bash'],
            model: 'haiku',
          },
          coder: {
            description: 'Implementation planner who converts insights into build steps.',
            prompt:
              'Translate research into an implementation outline. Provide module breakdowns, task sequencing, and pseudo-code snippets. Close with integration checkpoints.',
            tools: ['Write', 'Edit'],
            model: 'sonnet',
          },
          reviewer: {
            description: 'Quality and risk reviewer ensuring the combined plan is resilient.',
            prompt:
              'Audit the research and build plan, list critical risks, validation tactics, and success metrics. Deliver a crisp go/no-go recommendation with rationale.',
            tools: ['Read'],
            model: 'haiku',
          },
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            console.log(block.text);
            continue;
          }

          if (block.type === 'tool_use') {
            const { id, input } = block as unknown as {
              id?: string;
              input?: { subagent_type?: string; description?: string; prompt?: string };
            };
            if (input?.subagent_type && id) {
              toolRuns.set(id, { label: input.subagent_type, start: Date.now() });
              const context = input.description ?? input.prompt;
              const contextSuffix = context ? ` — ${context.slice(0, 90)}${context.length > 90 ? '…' : ''}` : '';
              console.log(`\n🚀 Delegating to ${input.subagent_type} subagent${contextSuffix}`);
              startTicker(id, input.subagent_type);
            } else {
              if (id) {
                toolRuns.set(id, { label: block.name, start: Date.now() });
              }
              console.log(`\n🚀 Using tool: ${block.name}`);
            }
            continue;
          }

          const { content, tool_use_id: toolUseId } = block as unknown as {
            content?: unknown;
            tool_use_id?: string;
          };
          const summary = extractText(content ?? '');
          if (summary) {
            const label = toolUseId ? toolRuns.get(toolUseId)?.label ?? 'subagent' : 'subagent';
            console.log(`\n📥 ${label} result: ${summary}`);
          }
          if (toolUseId) {
            const label = toolRuns.get(toolUseId)?.label;
            finishTicker(toolUseId, label);
          }
        }
      } else if (message.type === 'stream_event') {
        const event = message.event as unknown as Record<string, unknown>;
        const eventType = typeof event.type === 'string' ? event.type : '';
        if (eventType.startsWith('tool_result')) {
          const toolUseId = typeof event.tool_use_id === 'string' ? event.tool_use_id : undefined;
          const label = toolUseId ? toolRuns.get(toolUseId)?.label ?? 'subagent' : 'subagent';
          const delta = event.delta as Record<string, unknown> | undefined;
          let progress = '';

          if (delta) {
            if (typeof delta.text === 'string') {
              progress = delta.text;
            } else if (typeof delta.output === 'string') {
              progress = delta.output;
            } else if (Array.isArray(delta.output)) {
              progress = extractText(delta.output);
            } else if (Array.isArray(delta.content)) {
              progress = extractText(delta.content);
            }
          }

          const outputTextDelta = event.output_text_delta as { text?: string } | undefined;
          if (!progress && outputTextDelta?.text) {
            progress = outputTextDelta.text;
          }

          if (progress.trim()) {
            console.log(`\n🔄 ${label} update: ${progress.trim()}`);
          }
          if (toolUseId && eventType === 'tool_result') {
            finishTicker(toolUseId, label);
          }
        }
      } else if (message.type === 'result') {
        console.log(`\n⏱️ Total duration: ${message.duration_ms}ms`);
        console.log(`💰 Total cost: $${message.total_cost_usd.toFixed(4)}`);
      }
    }

    for (const [id] of toolRuns) {
      finishTicker(id);
    }

    console.log('\n✅ Multi-agent orchestration example finished.');
  } catch (error) {
    console.error('❌ Error during multi-agent orchestration:', (error as Error).message);
    process.exit(1);
  }
}

run();
