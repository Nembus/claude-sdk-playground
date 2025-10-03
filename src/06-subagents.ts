/**
 * Example 06: Subagents
 *
 * This example demonstrates how to use subagents for parallel task processing
 * and isolated context management. Subagents allow you to delegate work to
 * specialized agents that operate independently.
 *
 * CONCEPTS COVERED:
 * - What are subagents and when to use them
 * - Creating and managing subagents
 * - Parallel vs. sequential task delegation
 * - Context isolation and sharing
 * - Coordinating multiple agents
 * - Real-world use cases
 *
 * RUN THIS EXAMPLE:
 * npm run 06
 */

import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { validateEnv, printHeader, printSection } from './utils/config.js';

/**
 * WHAT ARE SUBAGENTS?
 *
 * Subagents are independent instances of Claude that can:
 * - Work on separate tasks in parallel
 * - Maintain isolated context and memory
 * - Specialize in specific domains
 * - Coordinate with the main agent
 *
 * Think of subagents like delegating work to team members:
 * - Main agent = Project manager
 * - Subagents = Specialized team members
 */

/**
 * STEP 1: Create a tool that spawns a subagent
 *
 * This tool demonstrates how to delegate a task to a subagent
 */
const delegateResearchTool = tool(
  'delegate_research',
  'Delegates a research task to a specialized subagent that can analyze information independently',
  {
    topic: z.string().describe('The research topic or question'),
    focus: z.string().describe('Specific aspect to focus on (e.g., "history", "technical", "practical")'),
  },
  async (args) => {
    // In a real implementation, you would spawn a subagent here
    // For this example, we'll simulate the subagent's work

    console.log(`\n🤖 Subagent activated for: ${args.topic}`);
    console.log(`🔍 Focus area: ${args.focus}\n`);

    // Simulate subagent processing
    const research = `[Subagent Research Report]
Topic: ${args.topic}
Focus: ${args.focus}

Key Findings:
1. Primary aspects analyzed with ${args.focus} perspective
2. Cross-referenced multiple sources
3. Generated comprehensive insights

This research was conducted by an independent subagent with
isolated context, allowing for focused analysis without
interference from the main agent's conversation history.`;

    return {
      content: [{ type: 'text', text: research }],
    };
  }
);

/**
 * STEP 2: Create a tool for parallel data processing
 */
const parallelProcessTool = tool(
  'parallel_process',
  'Processes multiple data items in parallel using subagents',
  {
    items: z.array(z.string()).describe('Array of items to process'),
    operation: z.string().describe('Operation to perform on each item'),
  },
  async (args) => {
    console.log(`\n⚡ Spawning ${args.items.length} subagents for parallel processing...`);

    // Simulate parallel processing with subagents
    const results = args.items.map((item, index) => {
      console.log(`  🤖 Subagent ${index + 1}: Processing "${item}"`);
      return `[Subagent ${index + 1}] ${args.operation} "${item}" → Completed`;
    });

    const summary = `Parallel Processing Complete:
- Items processed: ${args.items.length}
- Operation: ${args.operation}
- Agents spawned: ${args.items.length}

Results:
${results.join('\n')}

Each subagent operated independently, allowing for true parallel execution
without context contamination between tasks.`;

    return {
      content: [{ type: 'text', text: summary }],
    };
  }
);

/**
 * STEP 3: Create a specialized domain agent tool
 */
const consultSpecialistTool = tool(
  'consult_specialist',
  'Consults a domain specialist subagent with expertise in a specific area',
  {
    domain: z.enum(['security', 'performance', 'architecture', 'testing', 'documentation'])
      .describe('The specialist domain to consult'),
    question: z.string().describe('Question or task for the specialist'),
  },
  async (args) => {
    console.log(`\n👨‍💼 Consulting ${args.domain} specialist subagent...\n`);

    // Simulate specialist subagent response
    const specialistResponses: Record<string, string> = {
      security: `[Security Specialist Analysis]
From a security perspective on: "${args.question}"

Recommendations:
- Implement defense in depth strategies
- Follow principle of least privilege
- Validate all inputs and sanitize outputs
- Use encryption for sensitive data
- Regular security audits and penetration testing

This analysis was performed by a security-focused subagent with specialized
knowledge in cybersecurity best practices.`,

      performance: `[Performance Specialist Analysis]
Regarding performance for: "${args.question}"

Optimization strategies:
- Profile before optimizing (measure first!)
- Focus on algorithmic complexity
- Implement caching strategies
- Use lazy loading and code splitting
- Monitor and measure continuously

This evaluation comes from a performance optimization specialist subagent.`,

      architecture: `[Architecture Specialist Analysis]
Architectural review of: "${args.question}"

Design principles:
- Maintain separation of concerns
- Favor composition over inheritance
- Follow SOLID principles
- Plan for scalability from the start
- Document architectural decisions

This assessment is from an architecture-specialized subagent.`,

      testing: `[Testing Specialist Analysis]
Testing approach for: "${args.question}"

Test strategy:
- Write tests before implementation (TDD)
- Aim for high coverage on critical paths
- Include unit, integration, and e2e tests
- Automate testing in CI/CD pipeline
- Test edge cases and error scenarios

Provided by a testing-focused specialist subagent.`,

      documentation: `[Documentation Specialist Analysis]
Documentation plan for: "${args.question}"

Documentation strategy:
- Write clear, concise explanations
- Include code examples
- Document the "why" not just the "what"
- Keep docs close to code
- Version documentation with releases

Created by a documentation specialist subagent.`,
    };

    return {
      content: [{ type: 'text', text: specialistResponses[args.domain] || 'Unknown domain' }],
    };
  }
);

/**
 * Package all subagent tools into an MCP server
 */
const subagentServer = createSdkMcpServer({
  name: 'subagent-tools',
  version: '1.0.0',
  tools: [delegateResearchTool, parallelProcessTool, consultSpecialistTool],
});

/**
 * Main function demonstrating subagent usage
 */
async function main() {
  printHeader('Example 06: Subagents');

  validateEnv();

  printSection('Single Subagent Delegation');

  // STEP 4: Delegate a research task to a subagent
  try {
    const result = query({
      prompt:
        'I need to research "TypeScript generics". Please delegate this to a subagent ' +
        'and focus on practical applications.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'subagent-tools': subagentServer,
        },
        permissionMode: 'bypassPermissions',
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Parallel Subagent Processing');

  // STEP 5: Process multiple items in parallel
  try {
    const result = query({
      prompt:
        'Please process these programming languages in parallel: ["Python", "TypeScript", "Rust", "Go"]. ' +
        'For each one, analyze their primary use cases.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'subagent-tools': subagentServer,
        },
        permissionMode: 'bypassPermissions',
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Consulting Domain Specialists');

  // STEP 6: Consult multiple specialist subagents
  try {
    const result = query({
      prompt:
        'I\'m building a new web application with user authentication. ' +
        'Please consult the security specialist about authentication best practices, ' +
        'and then consult the architecture specialist about structuring the auth system.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'subagent-tools': subagentServer,
        },
        permissionMode: 'bypassPermissions',
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          } else if (content.type === 'tool_use') {
            console.log(`\n📞 Consulting: ${content.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Complex Multi-Subagent Workflow');

  // STEP 7: Orchestrate multiple subagents for a complex task
  try {
    const result = query({
      prompt:
        'I need help designing a REST API for a blog platform. ' +
        'Please: 1) Consult the architecture specialist about API design, ' +
        '2) Consult the security specialist about API security, ' +
        '3) Consult the documentation specialist about API documentation.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'subagent-tools': subagentServer,
        },
        permissionMode: 'bypassPermissions',
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Subagent Concepts and Best Practices');

  console.log(`
🧠 SUBAGENT FUNDAMENTALS:

1. Context Isolation:
   - Each subagent has its own conversation context
   - Prevents context contamination between tasks
   - Allows specialized prompting per subagent
   - Better for focused, independent work

2. Parallel Processing:
   - Multiple subagents can work simultaneously
   - Significantly reduces total processing time
   - Each subagent processes independently
   - Main agent coordinates and aggregates results

3. Specialization:
   - Subagents can have specialized system prompts
   - Different tools available to different subagents
   - Domain-specific knowledge and behavior
   - Better results for specialized tasks

4. Resource Management:
   - Each subagent consumes API tokens
   - Be mindful of parallel subagent limits
   - Balance parallelization with costs
   - Consider sequential processing for related tasks

📊 WHEN TO USE SUBAGENTS:

✅ Good use cases:
- Parallel data processing (analyze multiple files/items)
- Independent research tasks (separate topics)
- Domain-specific consultations (security, performance, etc.)
- Long-running background tasks
- Tasks requiring fresh context
- Multi-perspective analysis

❌ Not ideal for:
- Simple, sequential operations
- Tasks requiring shared context
- Very short, quick operations
- Budget-constrained scenarios
- Tasks that build on each other incrementally

💡 SUBAGENT PATTERNS:

Pattern 1: Map-Reduce
┌─────────┐
│  Main   │
└────┬────┘
     │ (distributes work)
     ├─────┬─────┬─────┐
     ▼     ▼     ▼     ▼
   Sub1  Sub2  Sub3  Sub4  (parallel processing)
     │     │     │     │
     └─────┴─────┴─────┘
           │
           ▼
      (aggregates results)
        Main

Pattern 2: Specialist Consultation
┌─────────┐
│  Main   │
└────┬────┘
     │ (consults specialists)
     ├──────────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼
  Security  Performance  Testing  Architecture
     │          │          │          │
     └──────────┴──────────┴──────────┘
                 │
                 ▼
         (gathers insights)
              Main

Pattern 3: Hierarchical Delegation
┌─────────┐
│  Main   │
└────┬────┘
     │
     ├──────────┐
     ▼          ▼
  Manager1  Manager2 (coordinate subteams)
     │          │
     ├───┬───┐  ├───┬───┐
     ▼   ▼   ▼  ▼   ▼   ▼
    W1  W2  W3 W4  W5  W6 (workers)

🎯 BEST PRACTICES:

1. Clear Task Definition:
   - Give each subagent a well-defined task
   - Provide necessary context
   - Set clear success criteria

2. Result Aggregation:
   - Main agent should synthesize subagent outputs
   - Look for conflicts or contradictions
   - Provide unified recommendations

3. Error Handling:
   - Handle subagent failures gracefully
   - Implement retries for transient failures
   - Have fallback strategies

4. Cost Management:
   - Monitor token usage across subagents
   - Use subagents judiciously
   - Consider sequential processing when appropriate

5. Context Management:
   - Provide minimal necessary context to each subagent
   - Avoid redundant information
   - Share results efficiently

REAL-WORLD EXAMPLES:

1. Code Review System:
   - Security subagent: Checks for vulnerabilities
   - Performance subagent: Analyzes algorithmic complexity
   - Style subagent: Ensures code standards
   - Testing subagent: Verifies test coverage

2. Content Creation:
   - Research subagents: Gather information on topics
   - Writing subagents: Draft sections in parallel
   - Review subagent: Synthesizes and edits

3. Data Analysis:
   - Processing subagents: Analyze different datasets
   - Visualization subagent: Create charts
   - Report subagent: Compile findings

4. Customer Support:
   - Classification subagent: Categorizes requests
   - Specialist subagents: Handle domain-specific issues
   - Escalation subagent: Manages complex cases
  `);

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Subagents enable parallel task processing
 * 2. Each subagent has isolated context
 * 3. Subagents can be specialized for domains
 * 4. Use subagents for independent, parallelizable work
 * 5. Main agent coordinates and aggregates results
 * 6. Consider costs and resource usage
 *
 * SUBAGENT BENEFITS:
 * - Parallel processing for faster results
 * - Context isolation prevents interference
 * - Specialization improves quality
 * - Better handling of complex workflows
 * - Scalable architecture
 *
 * IMPLEMENTATION NOTES:
 * - Create tools that spawn subagents
 * - Define clear interfaces between agents
 * - Implement proper error handling
 * - Aggregate and synthesize results
 * - Monitor resource usage
 *
 * NEXT STEPS:
 * - Review all examples in sequence
 * - Build a multi-agent system for your use case
 * - Experiment with different delegation patterns
 * - Implement error handling and monitoring
 * - Read the comprehensive README for full tutorial
 */

main().catch(console.error);
