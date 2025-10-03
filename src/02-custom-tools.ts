/**
 * Example 02: Custom Tools
 *
 * This example demonstrates how to create custom tools that extend
 * the agent's capabilities beyond simple text generation.
 *
 * CONCEPTS COVERED:
 * - Creating tools with the tool() function
 * - Using Zod schemas for type-safe input validation
 * - Providing tools to the query function
 * - Tool execution and result handling
 * - Best practices for tool design
 *
 * RUN THIS EXAMPLE:
 * npm run 02
 */

import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { validateEnv, printHeader, printSection } from './utils/config.js';

/**
 * STEP 1: Define a simple calculator tool
 *
 * Tools are defined using the tool() function which takes:
 * - name: A descriptive name for the tool
 * - description: What the tool does (helps Claude decide when to use it)
 * - inputSchema: A Zod schema defining the expected inputs
 * - handler: An async function that performs the tool's action
 */
const calculatorTool = tool(
  'calculator',
  'Performs basic arithmetic operations (add, subtract, multiply, divide)',
  // Define input schema using Zod for type safety
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The arithmetic operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  },
  // Handler function - this is what executes when Claude uses the tool
  async (args) => {
    let result: number;

    switch (args.operation) {
      case 'add':
        result = args.a + args.b;
        break;
      case 'subtract':
        result = args.a - args.b;
        break;
      case 'multiply':
        result = args.a * args.b;
        break;
      case 'divide':
        if (args.b === 0) {
          return {
            content: [{ type: 'text', text: 'Error: Division by zero is not allowed' }],
            isError: true,
          };
        }
        result = args.a / args.b;
        break;
    }

    // Return the result in the expected format
    return {
      content: [
        {
          type: 'text',
          text: `The result of ${args.a} ${args.operation} ${args.b} is ${result}`,
        },
      ],
    };
  }
);

/**
 * STEP 2: Define a more complex tool with object inputs
 *
 * This tool demonstrates working with more complex data structures
 */
const weatherTool = tool(
  'get_weather',
  'Gets the current weather for a specified location. Returns temperature in Fahrenheit and conditions.',
  {
    location: z.string().describe('City name, e.g., "San Francisco" or "London"'),
    units: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature units (defaults to fahrenheit)'),
  },
  async (args) => {
    // In a real application, you would call an actual weather API here
    // For this demo, we'll return mock data
    const mockTemperature = Math.floor(Math.random() * 40) + 50; // Random temp between 50-90°F
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)];

    const temp = args.units === 'celsius'
      ? Math.round((mockTemperature - 32) * 5 / 9)
      : mockTemperature;
    const unit = args.units === 'celsius' ? '°C' : '°F';

    return {
      content: [
        {
          type: 'text',
          text: `Weather in ${args.location}: ${temp}${unit}, ${conditions}`,
        },
      ],
    };
  }
);

/**
 * STEP 3: Define a tool that accesses external data
 *
 * This tool demonstrates how to integrate with external systems
 */
const databaseLookupTool = tool(
  'database_lookup',
  'Looks up user information from a database by user ID',
  {
    userId: z.string().describe('The unique user identifier'),
  },
  async (args) => {
    // Mock database
    const mockDatabase: Record<string, { name: string; email: string; role: string }> = {
      '1': { name: 'Alice Smith', email: 'alice@example.com', role: 'Engineer' },
      '2': { name: 'Bob Jones', email: 'bob@example.com', role: 'Designer' },
      '3': { name: 'Carol White', email: 'carol@example.com', role: 'Manager' },
    };

    const user = mockDatabase[args.userId];

    if (!user) {
      return {
        content: [{ type: 'text', text: `No user found with ID: ${args.userId}` }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `User Info:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}`,
        },
      ],
    };
  }
);

/**
 * STEP 4: Package tools into an MCP server
 *
 * Custom tools must be packaged into an MCP server to be used
 */
const toolsServer = createSdkMcpServer({
  name: 'custom-tools',
  version: '1.0.0',
  tools: [calculatorTool, weatherTool, databaseLookupTool],
});

/**
 * Main function demonstrating tool usage
 */
async function main() {
  printHeader('Example 02: Custom Tools');

  validateEnv();

  printSection('Using the Calculator Tool');

  // STEP 5: Provide tools via MCP server
  try {
    const result = query({
      prompt: 'What is 156 multiplied by 23? Please use the calculator tool.',
      options: {
        model: 'claude-sonnet-4-5',
        // Provide tools via MCP server (Record format)
        mcpServers: {
          'custom-tools': toolsServer,
        },
      },
    });

    // Process responses
    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log(content.text);
          } else if (content.type === 'tool_use') {
            console.log(`\n🔧 Tool used: ${content.name}`);
            console.log(`📥 Input:`, JSON.stringify(content.input, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Using Multiple Tools');

  // STEP 6: Multiple tools - Claude chooses which to use
  try {
    const result = query({
      prompt: 'What is the weather like in Tokyo? Also, can you tell me about user with ID 2?',
      options: {
        model: 'claude-sonnet-4-5',
        // All tools in the MCP server are available
        mcpServers: {
          'custom-tools': toolsServer,
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
            console.log(`📥 Input:`, JSON.stringify(content.input, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Complex Multi-Tool Workflow');

  // STEP 7: Let Claude orchestrate multiple tool calls
  try {
    const result = query({
      prompt:
        'Please do the following: ' +
        '1. Calculate what 45 times 12 is ' +
        '2. Get the weather in Paris ' +
        '3. Look up user ID 1',
      options: {
        model: 'claude-sonnet-4-5',
        mcpServers: {
          'custom-tools': toolsServer,
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
            console.log(`📥 Input:`, JSON.stringify(content.input, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Tools extend agent capabilities beyond text generation
 * 2. Use the tool() function to create type-safe tools
 * 3. Zod schemas provide input validation and type safety
 * 4. Custom tools must be packaged in an MCP server
 * 5. Pass MCP servers via mcpServers option (Record format)
 * 6. Claude intelligently decides when and how to use tools
 * 7. Tools can access external systems, APIs, databases, etc.
 * 8. Multiple tools can be combined for complex workflows
 * 9. Clear descriptions help Claude choose the right tool
 *
 * BEST PRACTICES:
 * - Give tools descriptive names and detailed descriptions
 * - Use Zod schemas to validate inputs properly
 * - Handle errors gracefully in tool handlers
 * - Return structured, informative results
 * - Keep tools focused on single responsibilities
 *
 * NEXT STEPS:
 * - Run example 03 to learn about file operations
 * - Create your own custom tools for your use case
 * - Experiment with tool combinations
 */

main().catch(console.error);
