/**
 * Example 05: Streaming Responses
 *
 * This example demonstrates how to work with streaming responses
 * from Claude, enabling real-time display and processing of outputs.
 *
 * CONCEPTS COVERED:
 * - Understanding streaming vs. non-streaming responses
 * - Processing streamed content chunks
 * - Real-time UI updates
 * - Handling different event types
 * - Progress indicators
 *
 * RUN THIS EXAMPLE:
 * npm run 05
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { validateEnv, printHeader, printSection } from './utils/config.js';

/**
 * Helper function to simulate a typewriter effect
 */
function printWithDelay(text: string, delay = 30): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        const char = text[i];
        if (char !== undefined) {
          process.stdout.write(char);
        }
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, delay);
  });
}

/**
 * Main function demonstrating streaming
 */
async function main() {
  printHeader('Example 05: Streaming Responses');

  validateEnv();

  printSection('Basic Streaming');

  // STEP 1: Basic streaming example
  // The query() function returns an AsyncGenerator that yields messages as they arrive
  try {
    console.log('🎯 Asking Claude to explain streaming...\n');

    const result = query({
      prompt: 'Explain what streaming responses are and why they are useful for AI applications. Keep it concise.',
      options: {
        model: 'claude-sonnet-4-5',
      },
    });

    // Iterate through streamed messages
    for await (const message of result) {
      // Each message can contain multiple content blocks
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            // Print text as it arrives for real-time display
            console.log(content.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Streaming with Typewriter Effect');

  // STEP 2: Create a typewriter effect for better UX
  try {
    console.log('🎯 Writing a story with typewriter effect...\n');

    const result = query({
      prompt: 'Write a very short 3-sentence sci-fi story about AI and humans working together.',
      options: {
        model: 'claude-sonnet-4-5',
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            // Apply typewriter effect to streamed text
            await printWithDelay(content.text);
            console.log('\n');
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Streaming with Progress Indicators');

  // STEP 3: Show progress while streaming
  try {
    console.log('🎯 Generating code with progress indicator...\n');

    let chunkCount = 0;
    const startTime = Date.now();

    const result = query({
      prompt:
        'Write a TypeScript function that implements a binary search algorithm. ' +
        'Include comments explaining the logic.',
      options: {
        model: 'claude-sonnet-4-5',
      },
    });

    console.log('📊 Streaming response...\n');

    for await (const message of result) {
      chunkCount++;

      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            // Show chunk count and elapsed time
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            process.stdout.write(`\r[Chunk ${chunkCount}] [${elapsed}s] `);

            // Print the content
            console.log('\n' + content.text);
          }
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Received ${chunkCount} chunks in ${totalTime}s`);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Streaming with Tool Calls');

  // STEP 4: Stream responses that include tool usage
  try {
    console.log('🎯 Streaming with file operations...\n');

    const result = query({
      prompt: 'List the TypeScript files in the src directory and briefly describe what streaming is.',
      options: {
        model: 'claude-sonnet-4-5',
        allowedTools: ['Bash', 'Glob'],
        cwd: process.cwd(),
        permissionMode: 'bypassPermissions',
      },
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            console.log('📝 Text:', content.text);
          } else if (content.type === 'tool_use') {
            console.log(`\n🔧 Tool Called: ${content.name}`);
            console.log('📥 Input:', JSON.stringify(content.input, null, 2));
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Advanced: Accumulating Streamed Content');

  // STEP 5: Accumulate streamed content for processing
  try {
    console.log('🎯 Accumulating streamed response...\n');

    const result = query({
      prompt: 'List 5 programming languages and their primary use cases. Be concise.',
      options: {
        model: 'claude-sonnet-4-5',
      },
    });

    // Accumulate all text content
    let accumulatedText = '';
    let messageCount = 0;

    for await (const message of result) {
      messageCount++;

      if (message.type === 'assistant') {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            accumulatedText += content.text;
            // Show progress
            process.stdout.write(`\rReceiving message ${messageCount}... (${accumulatedText.length} chars)`);
          }
        }
      }
    }

    console.log('\n\n📋 Complete accumulated response:');
    console.log(accumulatedText);
    console.log(`\n📊 Total messages: ${messageCount}`);
    console.log(`📊 Total characters: ${accumulatedText.length}`);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }

  printSection('Streaming Benefits and Best Practices');

  console.log(`
🌟 WHY USE STREAMING?

1. Better User Experience:
   - Users see responses as they're generated
   - Reduces perceived latency
   - Provides immediate feedback

2. Progressive Processing:
   - Start processing data before the full response arrives
   - Build UI incrementally
   - Show progress indicators

3. Memory Efficiency:
   - Process large responses chunk by chunk
   - Avoid holding entire response in memory
   - Better for long-form content

4. Cancellation Support:
   - Can stop processing early if needed
   - Save API costs by stopping unnecessary generation
   - Better control over resource usage

💡 BEST PRACTICES:

1. Error Handling:
   - Wrap streaming in try-catch blocks
   - Handle connection interruptions gracefully
   - Provide fallback for failed streams

2. UI Updates:
   - Use debouncing for frequent updates
   - Implement loading states
   - Show progress indicators

3. Performance:
   - Process chunks efficiently
   - Avoid blocking the event loop
   - Consider buffering for very fast streams

4. User Control:
   - Provide ability to cancel streaming
   - Allow pausing/resuming if applicable
   - Show streaming status clearly

WHEN TO USE STREAMING:

✅ Good for:
- Chat interfaces
- Long-form content generation
- Real-time transcription
- Progress tracking
- Interactive applications

❌ Not ideal for:
- Simple, short responses (overhead not worth it)
- Batch processing
- When complete response is needed before processing
- Highly structured data that needs validation

EXAMPLE PATTERNS:

// Pattern 1: Simple display
for await (const msg of query({ prompt: "..." })) {
  console.log(msg.content);
}

// Pattern 2: Accumulation
let fullText = '';
for await (const msg of query({ prompt: "..." })) {
  for (const content of msg.content) {
    if (content.type === 'text') fullText += content.text;
  }
}

// Pattern 3: Real-time processing
for await (const msg of query({ prompt: "..." })) {
  processChunk(msg);
  updateUI();
}
  `);

  console.log('\n✅ Example completed successfully!\n');
}

/**
 * KEY TAKEAWAYS:
 *
 * 1. query() returns an AsyncGenerator for streaming
 * 2. Messages arrive in chunks as they're generated
 * 3. Each message contains content blocks (text, tool_use, etc.)
 * 4. Streaming enables real-time UI updates
 * 5. You can accumulate or process chunks individually
 * 6. Streaming improves perceived performance
 *
 * STREAMING WORKFLOW:
 * 1. Call query() to get AsyncGenerator
 * 2. Iterate with for-await-of loop
 * 3. Process each message as it arrives
 * 4. Handle different content types appropriately
 * 5. Update UI or accumulate results
 *
 * CONTENT TYPES:
 * - text: Generated text content
 * - tool_use: Tool invocation
 * - tool_result: Result from tool execution
 *
 * NEXT STEPS:
 * - Run example 06 to learn about subagents
 * - Implement streaming in a UI application
 * - Experiment with different streaming patterns
 * - Add cancellation and pause/resume capabilities
 */

main().catch(console.error);
