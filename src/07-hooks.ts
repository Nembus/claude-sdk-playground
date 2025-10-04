/**
 * Example 07: Hooks
 *
 * This example demonstrates how to use hooks to monitor, control, and
 * customize the behavior of the Claude Agent SDK during execution.
 *
 * CONCEPTS COVERED:
 * - What are hooks and when to use them
 * - PreToolUse and PostToolUse hooks for tool monitoring
 * - Session lifecycle hooks (SessionStart, SessionEnd)
 * - Hook outputs: continue, decision, systemMessage, suppressOutput
 * - Practical use cases: logging, approval workflows, monitoring
 * - Hook matchers for selective execution
 *
 * RUN THIS EXAMPLE:
 * npm run 07
 */

import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import type { HookInput, HookJSONOutput } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { validateEnv, printHeader, printSection } from './utils/config.js';

/**
 * WHAT ARE HOOKS?
 *
 * Hooks are event handlers that intercept SDK operations at specific points:
 * - PreToolUse: Before a tool executes (validate, approve, or block)
 * - PostToolUse: After a tool executes (log results, track metrics)
 * - SessionStart: When a session begins (initialize, setup)
 * - SessionEnd: When a session ends (cleanup, reporting)
 * - Notification: When SDK sends notifications
 * - Stop: When execution stops
 *
 * Think of hooks as middleware that let you:
 * - Monitor what the agent is doing
 * - Control whether actions should proceed
 * - Add custom logic at key points
 * - Implement approval workflows
 * - Track performance and audit trails
 */

/**
 * STEP 1: Create simple tools to demonstrate hooks
 */
const calculateTool = tool(
  'calculate',
  'Performs a mathematical calculation',
  {
    expression: z.string().describe('Mathematical expression to calculate'),
  },
  async (args) => {
    // Simulate calculation (using eval for demo - don't do this in production!)
    try {
      const result = eval(args.expression);
      return {
        content: [{ type: 'text', text: `Result: ${result}` }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

const sendEmailTool = tool(
  'send_email',
  'Sends an email (simulated - requires approval)',
  {
    to: z.string().describe('Recipient email address'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body'),
  },
  async (args) => {
    // Simulate email sending
    console.log(`\n📧 Email sent to ${args.to}`);
    console.log(`   Subject: ${args.subject}`);
    return {
      content: [{ type: 'text', text: `Email sent successfully to ${args.to}` }],
    };
  }
);

const deleteDatabaseTool = tool(
  'delete_database',
  'Deletes a database (dangerous operation - requires approval)',
  {
    database_name: z.string().describe('Name of database to delete'),
  },
  async (args) => {
    // This would be dangerous in real use!
    return {
      content: [{ type: 'text', text: `Database ${args.database_name} deleted` }],
    };
  }
);

/**
 * Package tools into an MCP server
 */
const hooksToolsServer = createSdkMcpServer({
  name: 'hooks-demo-tools',
  version: '1.0.0',
  tools: [calculateTool, sendEmailTool, deleteDatabaseTool],
});

/**
 * STEP 2: Logging Hook
 *
 * Tracks all tool usage for audit purposes
 */
const toolUsageLog: Array<{
  toolName: string;
  input: unknown;
  output?: unknown;
  timestamp: Date;
}> = [];

async function loggingHook(
  input: HookInput,
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  if (input.hook_event_name === 'PreToolUse') {
    console.log(`\n📝 [LOG] PreToolUse: ${input.tool_name}`);
    console.log(`    Input: ${JSON.stringify(input.tool_input)}`);

    toolUsageLog.push({
      toolName: input.tool_name,
      input: input.tool_input,
      timestamp: new Date(),
    });
  }

  if (input.hook_event_name === 'PostToolUse') {
    console.log(`\n✅ [LOG] PostToolUse: ${input.tool_name}`);
    console.log(`    Output: ${JSON.stringify(input.tool_response).substring(0, 100)}...`);

    const logEntry = toolUsageLog.find(
      entry => entry.toolName === input.tool_name && !entry.output
    );
    if (logEntry) {
      logEntry.output = input.tool_response;
    }
  }

  return { continue: true };
}

/**
 * STEP 3: Approval Hook
 *
 * Requires user confirmation before executing sensitive operations
 */
const dangerousTools = ['send_email', 'delete_database'];

async function approvalHook(
  input: HookInput,
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  if (input.hook_event_name === 'PreToolUse') {
    if (dangerousTools.includes(input.tool_name)) {
      console.log(`\n⚠️  [APPROVAL] ${input.tool_name} requires approval`);
      console.log(`    Input: ${JSON.stringify(input.tool_input, null, 2)}`);

      // In a real application, you would prompt the user here
      // For this demo, we'll auto-approve
      const approved = true; // Simulate user approval

      if (!approved) {
        console.log(`\n❌ [BLOCKED] Tool use blocked by user`);
        return {
          decision: 'block',
          systemMessage: `The ${input.tool_name} operation was blocked by the approval hook.`,
        };
      }

      console.log(`\n✅ [APPROVED] Tool use approved`);
    }
  }

  return { continue: true };
}

/**
 * STEP 4: Performance Monitoring Hook
 *
 * Tracks execution time of tools
 */
const performanceMetrics = new Map<string, { start: number; duration?: number }>();

async function performanceHook(
  input: HookInput,
  toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  const key = `${input.hook_event_name}-${toolUseID}`;

  if (input.hook_event_name === 'PreToolUse') {
    performanceMetrics.set(key, { start: Date.now() });
  }

  if (input.hook_event_name === 'PostToolUse') {
    const preKey = `PreToolUse-${toolUseID}`;
    const metric = performanceMetrics.get(preKey);
    if (metric) {
      const duration = Date.now() - metric.start;
      metric.duration = duration;
      console.log(`\n⏱️  [PERF] ${input.tool_name} executed in ${duration}ms`);
    }
  }

  return { continue: true };
}

/**
 * STEP 5: Session Lifecycle Hooks
 */
async function sessionStartHook(
  input: HookInput,
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  if (input.hook_event_name === 'SessionStart') {
    console.log('\n🚀 [SESSION] Session started');
    console.log(`    Session ID: ${input.session_id}`);
    console.log(`    Source: ${input.source}`);
    console.log(`    Working Directory: ${input.cwd}`);
  }

  return { continue: true };
}

async function sessionEndHook(
  input: HookInput,
  _toolUseID: string | undefined,
  _options: { signal: AbortSignal }
): Promise<HookJSONOutput> {
  if (input.hook_event_name === 'SessionEnd') {
    console.log('\n🏁 [SESSION] Session ended');
    console.log(`    Reason: ${input.reason}`);
    console.log(`    Session ID: ${input.session_id}`);

    // Print summary
    console.log('\n📊 Session Summary:');
    console.log(`    Total tools used: ${toolUsageLog.length}`);

    const toolCounts: Record<string, number> = {};
    toolUsageLog.forEach(log => {
      toolCounts[log.toolName] = (toolCounts[log.toolName] || 0) + 1;
    });

    Object.entries(toolCounts).forEach(([tool, count]) => {
      console.log(`    - ${tool}: ${count} time(s)`);
    });
  }

  return { continue: true };
}

/**
 * Main function demonstrating hooks
 */
async function main() {
  printHeader('Example 07: Hooks');

  validateEnv();

  printSection('Basic Logging Hooks');

  // STEP 6: Using PreToolUse and PostToolUse hooks for logging
  try {
    console.log('🎯 Running query with logging hooks...\n');

    const result = query({
      prompt: 'Please calculate 15 * 23 using the calculate tool.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'hooks-demo-tools': hooksToolsServer,
        },
        permissionMode: 'bypassPermissions',
        hooks: {
          PreToolUse: [{ hooks: [loggingHook] }],
          PostToolUse: [{ hooks: [loggingHook] }],
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log('\n💬 Assistant:', content.text);
          }
        }
      }
    }

    console.log('\n📋 Tool Usage Log:');
    toolUsageLog.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.toolName} at ${entry.timestamp.toISOString()}`);
    });
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Approval Workflow Hooks');

  // STEP 7: Using approval hooks for sensitive operations
  try {
    console.log('🎯 Testing approval workflow for sensitive tools...\n');

    const result = query({
      prompt: 'Please send an email to user@example.com with subject "Test" and body "Hello World".',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'hooks-demo-tools': hooksToolsServer,
        },
        permissionMode: 'bypassPermissions',
        hooks: {
          PreToolUse: [{ hooks: [approvalHook, loggingHook] }],
          PostToolUse: [{ hooks: [loggingHook] }],
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log('\n💬 Assistant:', content.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Performance Monitoring Hooks');

  // STEP 8: Using performance monitoring hooks
  try {
    console.log('🎯 Running with performance monitoring...\n');

    const result = query({
      prompt: 'Calculate 100 * 50 and then calculate 200 + 75.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'hooks-demo-tools': hooksToolsServer,
        },
        permissionMode: 'bypassPermissions',
        hooks: {
          PreToolUse: [{ hooks: [performanceHook, loggingHook] }],
          PostToolUse: [{ hooks: [performanceHook, loggingHook] }],
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log('\n💬 Assistant:', content.text);
          }
        }
      }
    }

    console.log('\n📊 Performance Summary:');
    performanceMetrics.forEach((metric, key) => {
      if (metric.duration !== undefined) {
        console.log(`  ${key}: ${metric.duration}ms`);
      }
    });
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Combining Multiple Hooks');

  // STEP 9: Using all hooks together
  try {
    console.log('🎯 Running with all hooks enabled...\n');

    // Clear previous metrics
    toolUsageLog.length = 0;
    performanceMetrics.clear();

    const result = query({
      prompt: 'Calculate 456 * 789, then explain the result briefly.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'hooks-demo-tools': hooksToolsServer,
        },
        permissionMode: 'bypassPermissions',
        hooks: {
          SessionStart: [{ hooks: [sessionStartHook] }],
          PreToolUse: [{ hooks: [approvalHook, loggingHook, performanceHook] }],
          PostToolUse: [{ hooks: [loggingHook, performanceHook] }],
          SessionEnd: [{ hooks: [sessionEndHook] }],
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log('\n💬 Assistant:', content.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Hook Matchers - Selective Execution');

  console.log(`
🎯 HOOK MATCHERS:

Hook matchers allow you to selectively apply hooks based on patterns:

interface HookCallbackMatcher {
  matcher?: string;  // Optional regex pattern to match tool names
  hooks: HookCallback[];
}

Example - Only log specific tools:
hooks: {
  PreToolUse: [
    {
      matcher: 'send_email|delete_database',  // Only these tools
      hooks: [approvalHook]
    },
    {
      // No matcher = applies to all tools
      hooks: [loggingHook]
    }
  ]
}
  `);

  printSection('Hook Best Practices and Patterns');

  console.log(`
💡 HOOK BEST PRACTICES:

1. **Performance**: Keep hooks fast - they run on every event
   - Avoid heavy computations
   - Use async operations sparingly
   - Consider debouncing for frequent events

2. **Error Handling**: Always handle errors in hooks
   - Hooks can crash the entire session if they throw
   - Use try-catch blocks
   - Return { continue: true } on errors to keep execution going

3. **Hook Outputs**:
   - continue: false - Stops execution entirely
   - decision: 'block' - Blocks specific tool use
   - decision: 'approve' - Explicitly approves tool use
   - systemMessage - Adds context to conversation
   - suppressOutput - Hides output from user

4. **Common Use Cases**:
   ✅ Audit logging and compliance
   ✅ Approval workflows for sensitive operations
   ✅ Performance monitoring and profiling
   ✅ Custom authentication/authorization
   ✅ Rate limiting and quotas
   ✅ Error recovery and retry logic
   ✅ Session analytics and reporting

5. **Hook Order**: Hooks execute in the order they're defined
   - Put validation hooks first
   - Put logging hooks last
   - Consider dependencies between hooks

6. **Testing**: Test hooks in isolation
   - Mock the SDK events
   - Verify hook outputs
   - Test error conditions

REAL-WORLD EXAMPLES:

1. Enterprise Compliance:
   - Log all AI interactions for audit trails
   - Require approval for data modifications
   - Track token usage and costs

2. Development/Debugging:
   - Log all tool inputs/outputs
   - Measure performance of different tools
   - Debug agent decision-making

3. Production Safety:
   - Block dangerous operations in production
   - Implement rate limiting
   - Add confirmation for irreversible actions

4. User Experience:
   - Show progress indicators during long operations
   - Provide real-time feedback
   - Handle errors gracefully with custom messages
  `);

  printSection('Hook Events Reference');

  console.log(`
📚 AVAILABLE HOOK EVENTS:

1. PreToolUse
   - Fired: Before a tool executes
   - Access: tool_name, tool_input
   - Use: Validation, approval, blocking

2. PostToolUse
   - Fired: After a tool executes
   - Access: tool_name, tool_input, tool_response
   - Use: Logging, metrics, result processing

3. SessionStart
   - Fired: When session begins
   - Access: session_id, source, cwd
   - Use: Initialization, setup, logging

4. SessionEnd
   - Fired: When session ends
   - Access: session_id, reason
   - Use: Cleanup, summaries, reporting

5. Notification
   - Fired: When SDK sends notifications
   - Access: message, title
   - Use: Custom notification handling

6. UserPromptSubmit
   - Fired: When user submits a prompt
   - Access: prompt
   - Use: Input validation, logging

7. Stop
   - Fired: When execution stops
   - Access: stop_hook_active
   - Use: Cleanup, state management

8. SubagentStop
   - Fired: When a subagent stops
   - Access: stop_hook_active
   - Use: Subagent lifecycle management

9. PreCompact
   - Fired: Before conversation compaction
   - Access: trigger, custom_instructions
   - Use: Save state before compaction
  `);

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Hooks intercept SDK operations at specific points
 * 2. PreToolUse hooks can validate, approve, or block tool execution
 * 3. PostToolUse hooks track results and performance
 * 4. Session hooks manage lifecycle events
 * 5. Multiple hooks can be combined for complex workflows
 * 6. Hook matchers enable selective hook execution
 * 7. Common uses: logging, approval workflows, monitoring
 *
 * HOOK CAPABILITIES:
 * - Monitor all agent actions
 * - Implement approval workflows
 * - Track performance and usage
 * - Add custom business logic
 * - Enforce security policies
 * - Generate audit trails
 *
 * IMPLEMENTATION NOTES:
 * - Hooks run synchronously in order
 * - Keep hooks fast to avoid performance issues
 * - Always handle errors gracefully
 * - Use hook matchers for selective application
 * - Test hooks thoroughly before production use
 *
 * NEXT STEPS:
 * - Implement custom hooks for your use case
 * - Build approval workflows for sensitive operations
 * - Create comprehensive logging systems
 * - Add performance monitoring to production agents
 * - Explore hook matchers for complex filtering
 */

main().catch(console.error);
