# Important SDK API Notes

## ⚠️ Key Differences from Initial Documentation

The Claude Agent SDK (v0.1.5) has some important differences from generic AI SDK patterns:

### 1. Message Structure

**Access assistant message content:**
```typescript
for await (const message of result) {
  if (message.type === 'assistant') {
    // Content is nested: message.message.content (not message.content)
    const content = message.message.content;
    for (const block of content) {
      if (block.type === 'text') {
        console.log(block.text);
      }
    }
  }
}
```

### 2. Options Interface

**NOT SUPPORTED:**
- ❌ `maxTokens` - Token limits are managed automatically
- ❌ `temperature` - Not exposed in this SDK
- ❌ `systemPrompt: { type: 'text', text: '...' }` - Wrong format

**SUPPORTED:**
```typescript
options: {
  model: 'claude-sonnet-4-5',  // or 'claude-opus-4', 'claude-haiku-4'
  cwd: process.cwd(),           // Working directory
  allowedTools: ['Read', 'Write', 'Bash'],
  disallowedTools: ['Edit'],
  appendSystemPrompt: 'Additional instructions...',  // String only
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan',
  mcpServers: {                 // Record, not array
    'server-name': {
      type: 'sdk',
      name: 'server-name',
      instance: serverInstance
    }
  }
}
```

### 3. MCP Servers

**Correct format:**
```typescript
const mathServer = createSdkMcpServer({
  name: 'math-operations',
  version: '1.0.0',
  tools: [addTool, multiplyTool],
});

// Use as Record
const result = query({
  prompt: 'Calculate something',
  options: {
    mcpServers: {
      'math-ops': mathServer,  // Key-value pairs
    }
  }
});
```

### 4. Message Types

The SDK returns different message types:

- **`assistant`**: Claude's responses
  - Access via: `message.message.content`

- **`result`**: Summary statistics
  - `duration_ms`: Time taken
  - `total_cost_usd`: API cost
  - `usage`: Token usage
  - `is_error`: Whether task succeeded

- **`system`**: System initialization messages
  - `model`: Model being used
  - `tools`: Available tools
  - `mcp_servers`: Connected MCP servers

- **`user`**: User message echoes

### 5. Tool Definition

Tools work correctly as documented with `tool()` function:

```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  'tool_name',
  'Description',
  {
    param: z.string(),
  },
  async (args) => ({
    content: [{ type: 'text', text: 'Result' }]
  })
);
```

## Quick Fix Guide

If you see TypeScript errors in the examples:

1. **Replace** `maxTokens` → Remove it entirely
2. **Replace** `message.content` → `message.message.content` (for assistant messages)
3. **Replace** `systemPrompt: { type: 'text', ... }` → `appendSystemPrompt: '...'`
4. **Replace** `mcpServers: [server]` → `mcpServers: { 'name': server }`

## Working Example

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = query({
  prompt: 'Hello, Claude!',
  options: {
    model: 'claude-sonnet-4-5',
    cwd: process.cwd(),
  }
});

for await (const message of result) {
  if (message.type === 'assistant') {
    for (const block of message.message.content) {
      if (block.type === 'text') {
        console.log(block.text);
      }
    }
  }

  if (message.type === 'result' && !message.is_error) {
    console.log(`✅ Done in ${message.duration_ms}ms`);
  }
}
```
