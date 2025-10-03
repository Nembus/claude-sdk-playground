/**
 * Example 03: File Operations
 *
 * This example demonstrates how to enable Claude to work with files
 * in your system using built-in file operation tools.
 *
 * CONCEPTS COVERED:
 * - Enabling built-in file tools (Read, Write, Edit)
 * - File permissions and security
 * - Working directory configuration
 * - Practical file manipulation tasks
 *
 * RUN THIS EXAMPLE:
 * npm run 03
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { validateEnv, printHeader, printSection } from './utils/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Main function demonstrating file operations
 */
async function main() {
  printHeader('Example 03: File Operations');

  validateEnv();

  // Create a temporary directory for our examples
  const tempDir = path.join(process.cwd(), 'temp');
  await fs.mkdir(tempDir, { recursive: true });

  printSection('Reading Files');

  // STEP 1: Create a sample file to read
  const sampleFile = path.join(tempDir, 'sample.txt');
  await fs.writeFile(
    sampleFile,
    'This is a sample text file.\nIt has multiple lines.\nClaude can read this!'
  );

  try {
    // Enable the Read tool to allow Claude to read files
    const result = query({
      prompt: `Please read the file at ${sampleFile} and summarize its contents.`,
      options: {
        model: 'claude-sonnet-4-5',
        // Enable specific file tools
        allowedTools: ['Read'],
        // Set the working directory for file operations
        cwd: process.cwd(),
        permissionMode: 'bypassPermissions',
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

  printSection('Writing Files');

  // STEP 2: Let Claude create a new file
  try {
    const result = query({
      prompt:
        `Please create a JSON file at ${path.join(tempDir, 'data.json')} ` +
        'with the following structure: ' +
        '{"name": "Claude", "type": "AI Assistant", "capabilities": ["text", "code", "analysis"]}',
      options: {
        model: 'claude-sonnet-4-5',
        // Enable Write tool for creating files
        allowedTools: ['Write'],
        cwd: process.cwd(),
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

    // Verify the file was created
    const fileExists = await fs.access(path.join(tempDir, 'data.json'))
      .then(() => true)
      .catch(() => false);

    if (fileExists) {
      console.log('\n✅ File created successfully!');
      const content = await fs.readFile(path.join(tempDir, 'data.json'), 'utf-8');
      console.log('File contents:', content);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Editing Files');

  // STEP 3: Create a file to edit
  const editFile = path.join(tempDir, 'config.txt');
  await fs.writeFile(
    editFile,
    'DEBUG_MODE=false\nMAX_RETRIES=3\nTIMEOUT=5000\n'
  );

  try {
    const result = query({
      prompt:
        `Please edit the file at ${editFile} and change DEBUG_MODE to true ` +
        'and increase MAX_RETRIES to 5.',
      options: {
        model: 'claude-sonnet-4-5',
        // Enable both Read and Edit tools
        allowedTools: ['Read', 'Edit'],
        cwd: process.cwd(),
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

    // Show the edited file
    const editedContent = await fs.readFile(editFile, 'utf-8');
    console.log('\nEdited file contents:');
    console.log(editedContent);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Complex File Task: Code Analysis');

  // STEP 4: Create a sample code file
  const codeFile = path.join(tempDir, 'example.ts');
  await fs.writeFile(
    codeFile,
    `
function calculateTotal(items: number[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total = total + items[i];
  }
  return total;
}

const prices = [10, 20, 30, 40];
console.log(calculateTotal(prices));
`.trim()
  );

  try {
    const result = query({
      prompt:
        `Please analyze the TypeScript file at ${codeFile}. ` +
        'Identify any potential improvements and suggest a more modern implementation. ' +
        'Then create a new file called example-improved.ts with your improved version.',
      options: {
        model: 'claude-sonnet-4-5',
        // Enable multiple tools for a complex workflow
        allowedTools: ['Read', 'Write', 'Edit'],
        cwd: process.cwd(),
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

  printSection('File Permissions and Security');

  console.log(`
🔒 SECURITY CONSIDERATIONS:

1. Working Directory:
   - Always set a working directory to limit file access scope
   - Current working directory: ${process.cwd()}

2. Allowed Tools:
   - Use allowedTools to explicitly control which operations are permitted
   - Be cautious with Write and Edit tools in production

3. Permission Modes:
   - 'auto': Claude prompts user for permission (default)
   - 'allow': Automatically allow all operations (use carefully!)
   - 'deny': Block all operations

4. Best Practices:
   - Never allow file operations on sensitive directories
   - Always validate file paths before operations
   - Use read-only access (Read tool only) when possible
   - Monitor and log file operations in production

Example with strict permissions:
`);

  console.log(`
const strictResult = await query({
  prompt: "Read the config file",
  options: {
    allowedTools: ['Read'],  // Only allow reading
    workingDirectory: tempDir,  // Restricted to temp directory
    permissionMode: 'auto',  // Require user confirmation
  }
});
  `);

  // Cleanup
  printSection('Cleanup');
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.error('⚠️  Could not clean up temp directory:', (error as Error).message);
  }

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. Built-in file tools: Read, Write, Edit, Bash, Glob, Grep
 * 2. Use allowedTools to control which operations are permitted
 * 3. Set workingDirectory to limit file access scope
 * 4. Permission modes control automation level
 * 5. Claude can perform complex file operations intelligently
 * 6. Always consider security when enabling file access
 *
 * AVAILABLE FILE TOOLS:
 * - Read: Read file contents
 * - Write: Create or overwrite files
 * - Edit: Modify existing files
 * - Bash: Execute shell commands
 * - Glob: Find files by pattern
 * - Grep: Search file contents
 *
 * SECURITY BEST PRACTICES:
 * - Limit working directory scope
 * - Use minimal required permissions
 * - Never expose sensitive directories
 * - Validate file paths
 * - Log file operations
 * - Use permissionMode: 'auto' for user oversight
 *
 * NEXT STEPS:
 * - Run example 04 to learn about MCP servers
 * - Experiment with different file operations
 * - Try combining file tools with custom tools
 */

main().catch(console.error);
