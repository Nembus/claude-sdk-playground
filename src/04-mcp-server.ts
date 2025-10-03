/**
 * Example 04: MCP Server
 *
 * This example demonstrates how to create a Model Context Protocol (MCP) server
 * that provides custom tools and capabilities to Claude.
 *
 * CONCEPTS COVERED:
 * - What is MCP (Model Context Protocol)
 * - Creating an MCP server with createSdkMcpServer()
 * - Defining server tools
 * - Integrating MCP servers with queries
 * - Use cases for MCP servers
 *
 * RUN THIS EXAMPLE:
 * npm run 04
 */

import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { validateEnv, printHeader, printSection } from './utils/config.js';

/**
 * WHAT IS MCP?
 *
 * The Model Context Protocol (MCP) is a standard that allows you to:
 * - Create reusable tool collections
 * - Package functionality into modular servers
 * - Share capabilities across different agents
 * - Integrate with external systems and APIs
 *
 * Think of MCP servers as plugin systems for AI agents!
 */

/**
 * STEP 1: Define tools for our MCP server
 *
 * Let's create a simple "Math Operations" MCP server
 */
const addTool = tool(
  'add',
  'Adds two numbers together',
  {
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  },
  async (args) => ({
    content: [{ type: 'text', text: `${args.a} + ${args.b} = ${args.a + args.b}` }],
  })
);

const multiplyTool = tool(
  'multiply',
  'Multiplies two numbers',
  {
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  },
  async (args) => ({
    content: [{ type: 'text', text: `${args.a} × ${args.b} = ${args.a * args.b}` }],
  })
);

const powerTool = tool(
  'power',
  'Raises a number to a power',
  {
    base: z.number().describe('Base number'),
    exponent: z.number().describe('Exponent'),
  },
  async (args) => ({
    content: [{ type: 'text', text: `${args.base}^${args.exponent} = ${Math.pow(args.base, args.exponent)}` }],
  })
);

/**
 * STEP 2: Create a more complex tool with external data simulation
 */
const statisticsTool = tool(
  'calculate_statistics',
  'Calculates mean, median, and mode for a list of numbers',
  {
    numbers: z.array(z.number()).describe('Array of numbers to analyze'),
  },
  async (args) => {
    const numbers = args.numbers.sort((a, b) => a - b);
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;

    // Calculate median
    const mid = Math.floor(numbers.length / 2);
    const median = numbers.length % 2 === 0
      ? (numbers[mid - 1]! + numbers[mid]!) / 2
      : numbers[mid]!;

    // Calculate mode (simplified)
    const frequency: Record<number, number> = {};
    numbers.forEach(n => frequency[n] = (frequency[n] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const modes = Object.keys(frequency).filter(k => frequency[Number(k)] === maxFreq);

    return {
      content: [{
        type: 'text',
        text: `Statistics:\n` +
          `Mean: ${mean.toFixed(2)}\n` +
          `Median: ${median}\n` +
          `Mode: ${modes.join(', ')}\n` +
          `Count: ${numbers.length}`,
      }],
    };
  }
);

/**
 * STEP 3: Create the MCP server
 *
 * This bundles all our tools into a reusable server
 */
const mathServer = createSdkMcpServer({
  name: 'math-operations',
  version: '1.0.0',
  tools: [addTool, multiplyTool, powerTool, statisticsTool],
});

/**
 * STEP 4: Create another MCP server for text operations
 */
const reverseTextTool = tool(
  'reverse_text',
  'Reverses a string',
  {
    text: z.string().describe('Text to reverse'),
  },
  async (args) => ({
    content: [{ type: 'text', text: args.text.split('').reverse().join('') }],
  })
);

const countWordsTool = tool(
  'count_words',
  'Counts words in a text',
  {
    text: z.string().describe('Text to analyze'),
  },
  async (args) => {
    const words = args.text.trim().split(/\s+/);
    return {
      content: [{
        type: 'text',
        text: `Word count: ${words.length}\nCharacter count: ${args.text.length}`,
      }],
    };
  }
);

const toUpperCaseTool = tool(
  'to_uppercase',
  'Converts text to uppercase',
  {
    text: z.string().describe('Text to convert'),
  },
  async (args) => ({
    content: [{ type: 'text', text: args.text.toUpperCase() }],
  })
);

const textServer = createSdkMcpServer({
  name: 'text-operations',
  version: '1.0.0',
  tools: [reverseTextTool, countWordsTool, toUpperCaseTool],
});

/**
 * Main function demonstrating MCP server usage
 */
async function main() {
  printHeader('Example 04: MCP Server');

  validateEnv();

  printSection('Using a Single MCP Server');

  // STEP 5: Use the math server with a query
  try {
    const result = query({
      prompt: 'What is 15 raised to the power of 3? Also, what is 25 multiplied by 4?',
      options: {
        model: 'claude-sonnet-4-5',
        // Provide MCP servers as Record
        mcpServers: {
          'math-operations': mathServer,
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          } else if (content.type === 'tool_use') {
            console.log(`\n🔧 Tool: ${content.name} from ${mathServer.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Using Multiple MCP Servers');

  // STEP 6: Use both servers simultaneously
  try {
    const result = query({
      prompt:
        'Please do two things: ' +
        '1. Calculate statistics for these numbers: [12, 15, 12, 20, 25, 12, 18] ' +
        '2. Count the words in this sentence: "The quick brown fox jumps over the lazy dog"',
      options: {
        model: 'claude-sonnet-4-5',
        // Claude can use tools from both servers
        mcpServers: {
          'math-operations': mathServer,
          'text-operations': textServer,
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          } else if (content.type === 'tool_use') {
            console.log(`\n🔧 Tool used: ${content.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Complex Workflow with MCP');

  // STEP 7: Demonstrate complex multi-server workflow
  try {
    const result = query({
      prompt:
        'I have the sentence "Hello World from Claude". ' +
        'Please: 1) reverse it, 2) convert it to uppercase, ' +
        'and 3) calculate what 100 raised to the power of 2 is.',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'math-operations': mathServer,
          'text-operations': textServer,
        },
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          } else if (content.type === 'tool_use') {
            console.log(`\n🔧 Tool: ${content.name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('MCP Server Best Practices');

  console.log(`
📚 MCP SERVER DESIGN PRINCIPLES:

1. Single Responsibility:
   - Each server should focus on one domain (math, text, database, etc.)
   - Keep tools related and cohesive

2. Naming Conventions:
   - Use clear, descriptive server names (e.g., 'database-operations')
   - Version your servers for compatibility tracking

3. Tool Design:
   - Tools should be atomic and focused
   - Provide clear, detailed descriptions
   - Use proper input validation with Zod

4. Reusability:
   - Design servers to be reusable across projects
   - Keep servers independent and modular
   - Document server capabilities clearly

5. Performance:
   - Minimize external API calls in tool handlers
   - Implement caching when appropriate
   - Use async operations efficiently

EXAMPLE USE CASES:

- Database MCP Server: Query, insert, update operations
- API Integration Server: External API calls and data fetching
- File System Server: Advanced file operations
- Analytics Server: Data analysis and visualization
- Notification Server: Email, SMS, push notifications
- Authentication Server: User management and auth operations
  `);

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. MCP servers package tools into reusable modules
 * 2. Create servers with createSdkMcpServer()
 * 3. Multiple servers can be used simultaneously
 * 4. Servers promote code reusability and organization
 * 5. Each server should have a focused purpose
 * 6. Tools within a server should be related
 *
 * MCP SERVER STRUCTURE:
 * - name: Unique identifier for the server
 * - version: Semantic version for tracking changes
 * - tools: Array of tool definitions
 *
 * BENEFITS OF MCP:
 * - Modular architecture
 * - Code reusability
 * - Easy maintenance
 * - Clear separation of concerns
 * - Shareable across projects
 *
 * NEXT STEPS:
 * - Run example 05 to learn about streaming
 * - Create your own domain-specific MCP server
 * - Combine MCP servers with file operations
 */

main().catch(console.error);
