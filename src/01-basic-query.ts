/**
 * Example 01: Basic Query
 *
 * This example demonstrates the most fundamental usage of the Claude Agent SDK:
 * sending a simple query and getting a response.
 *
 * CONCEPTS COVERED:
 * - Setting up the SDK
 * - Using the query() function
 * - Basic error handling
 * - Accessing response content
 *
 * RUN THIS EXAMPLE:
 * npm run 01
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { validateEnv, printHeader, printSection } from './utils/config.js';

/**
 * Main function demonstrating basic query usage
 */
async function main() {
  printHeader('Example 01: Basic Query');

  // STEP 1: Validate environment
  // Always check that your API key is configured before making requests
  try {
    validateEnv();
  } catch (error) {
    console.error('❌', (error as Error).message);
    process.exit(1);
  }

  printSection('Simple Question-Answer');

  // STEP 2: Create a basic query
  // The query() function is the primary way to interact with Claude
  // It takes a prompt (string or async iterable) and optional configuration
  try {
    const result = query({
      prompt: 'What are the three laws of robotics? Please be concise.',
      options: {
        model: 'claude-sonnet-4-5',
      },
    });

    // STEP 3: Process the response
    // The query returns a Query object that extends AsyncGenerator
    // We can iterate through the messages as they arrive
    for await (const message of result) {
      // SDKAssistantMessage contains the actual response
      if (message.type === 'assistant') {
        // Content is in message.message.content (nested)
        const content = message.message.content;
        for (const block of content) {
          if (block.type === 'text') {
            console.log(block.text);
          }
        }
      }

      // Result message contains summary info
      if (message.type === 'result') {
        console.log(`\n📊 Completed in ${message.duration_ms}ms`);
        console.log(`💰 Cost: $${message.total_cost_usd.toFixed(4)}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }

  printSection('With Custom Working Directory');

  // STEP 4: Configure working directory
  try {
    const result = query({
      prompt: 'List the files in the current directory.',
      options: {
        model: 'claude-sonnet-4-5',
        cwd: process.cwd(),
        allowedTools: ['Bash'],
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        const content = message.message.content;
        for (const block of content) {
          if (block.type === 'text') {
            console.log(block.text);
          } else if (block.type === 'tool_use') {
            console.log(`\n🔧 Tool: ${block.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }

  printSection('Using System Prompt');

  // STEP 5: Using custom system prompts
  // You can append to the claude_code preset or replace entirely
  try {
    const result = query({
      prompt: 'Explain what TypeScript is.',
      options: {
        model: 'claude-sonnet-4-5',
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: 'You are a helpful programming tutor. Keep responses concise and beginner-friendly.',
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        const content = message.message.content;
        for (const block of content) {
          if (block.type === 'text') {
            console.log(block.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. The query() function is the core of the SDK
 * 2. It accepts a prompt (string) and options
 * 3. Responses are streamed as async generators
 * 4. Messages have different types: 'assistant', 'result', 'system'
 * 5. Content is accessed via message.message.content for assistant messages
 * 6. Always handle errors appropriately
 *
 * MESSAGE TYPES:
 * - assistant: Claude's response with content blocks
 * - result: Summary with duration, cost, and usage stats
 * - system: System messages about session state
 * - user: Echo of user messages
 *
 * OPTIONS YOU CAN USE:
 * - model: Claude model to use
 * - cwd: Working directory for file operations
 * - allowedTools: Array of allowed tool names
 * - disallowedTools: Array of disallowed tool names
 * - systemPrompt: String or { type: 'preset', preset: 'claude_code', append: '...' }
 * - permissionMode: 'default', 'acceptEdits', 'bypassPermissions', 'plan'
 * - mcpServers: Record of MCP server configurations
 * - agents: Define sub-agents with specific tools and prompts
 *
 * NEXT STEPS:
 * - Run example 02 to learn about custom tools
 * - Experiment with different prompts and options
 * - Try different models (claude-opus-4, claude-haiku-4)
 */

// Run the example
main().catch(console.error);
