# Claude Agent SDK TypeScript Playground

A comprehensive, hands-on tutorial project for learning the **Claude Agent SDK** in TypeScript. This repository contains practical examples that progressively introduce SDK concepts, from basic queries to advanced features like subagents and MCP servers.

## 📚 What You'll Learn

This playground covers everything you need to build autonomous AI agents with Claude:

1. **Basic Queries** - Simple interactions and conversations
2. **Custom Tools** - Extending agent capabilities with type-safe tools
3. **File Operations** - Reading, writing, and editing files
4. **MCP Servers** - Creating reusable Model Context Protocol servers
5. **Streaming** - Real-time response handling
6. **Subagents** - Parallel task processing and domain specialists

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (or Bun if you prefer)
- An **Anthropic API key** ([Get one here](https://console.anthropic.com/))
- Basic TypeScript knowledge

### Installation

1. **Clone or download this repository**

```bash
git clone <repository-url>
cd claude-sdk-playground
```

2. **Install dependencies**

Using npm:
```bash
npm install
```

Using Bun (alternative):
```bash
bun install
```

3. **Configure your API key**

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your API key:
```env
ANTHROPIC_API_KEY=your_api_key_here
```

### Running Examples

Each example can be run independently using npm scripts:

```bash
# Example 01: Basic Query
npm run 01

# Example 02: Custom Tools
npm run 02

# Example 03: File Operations
npm run 03

# Example 04: MCP Server
npm run 04

# Example 05: Streaming
npm run 05

# Example 06: Subagents
npm run 06
```

**Recommended**: Run examples in order (01 → 06) for the best learning experience.

## 📖 Tutorial Guide

### Example 01: Basic Query

**File:** `src/01-basic-query.ts`

Learn the fundamentals of the Claude Agent SDK:
- Setting up the SDK
- Using the `query()` function
- Handling responses
- System prompts
- Multi-turn conversations

**Key Concepts:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = await query({
  prompt: 'What are the three laws of robotics?',
  options: {
    model: 'claude-sonnet-4-5',
    maxTokens: 1024,
  },
});

for await (const message of result) {
  for (const content of message.content) {
    if (content.type === 'text') {
      console.log(content.text);
    }
  }
}
```

**What You'll Build:**
- Simple Q&A interactions
- Conversational agents
- Custom-prompted assistants

---

### Example 02: Custom Tools

**File:** `src/02-custom-tools.ts`

Extend agent capabilities with custom tools:
- Creating tools with `tool()` function
- Using Zod schemas for validation
- Tool handlers and execution
- Combining multiple tools

**Key Concepts:**
```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const calculatorTool = tool(
  'calculator',
  'Performs arithmetic operations',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number(),
  },
  async (args) => {
    // Tool implementation
    return {
      content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
    };
  }
);

// Use the tool
const result = await query({
  prompt: 'What is 156 multiplied by 23?',
  options: {
    tools: [calculatorTool],
  },
});
```

**What You'll Build:**
- Calculator agents
- Database lookup tools
- API integration tools
- Domain-specific utilities

---

### Example 03: File Operations

**File:** `src/03-file-operations.ts`

Enable Claude to work with your file system:
- Reading files
- Writing new files
- Editing existing files
- Permission management
- Security considerations

**Key Concepts:**
```typescript
const result = await query({
  prompt: 'Please read sample.txt and summarize it',
  options: {
    allowedTools: ['Read', 'Write', 'Edit'],
    workingDirectory: process.cwd(),
  },
});
```

**Available File Tools:**
- `Read` - Read file contents
- `Write` - Create or overwrite files
- `Edit` - Modify existing files
- `Bash` - Execute shell commands
- `Glob` - Find files by pattern
- `Grep` - Search file contents

**What You'll Build:**
- Code analysis tools
- File transformation utilities
- Automated documentation generators
- Project scaffolding tools

---

### Example 04: MCP Server

**File:** `src/04-mcp-server.ts`

Create reusable Model Context Protocol servers:
- Understanding MCP architecture
- Creating servers with `createSdkMcpServer()`
- Packaging tools into modules
- Combining multiple servers

**Key Concepts:**
```typescript
import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';

const mathServer = createSdkMcpServer({
  name: 'math-operations',
  version: '1.0.0',
  tools: [addTool, multiplyTool, powerTool],
});

const result = await query({
  prompt: 'Calculate 15 to the power of 3',
  options: {
    mcpServers: [mathServer],
  },
});
```

**MCP Server Benefits:**
- Code reusability
- Modular architecture
- Easy maintenance
- Shareable across projects

**What You'll Build:**
- Domain-specific tool collections
- API integration servers
- Database operation modules
- Analytics and reporting servers

---

### Example 05: Streaming

**File:** `src/05-streaming.ts`

Handle real-time response streaming:
- Understanding streaming vs. batch
- Processing response chunks
- Building typewriter effects
- Progress indicators
- Performance optimization

**Key Concepts:**
```typescript
const result = query({ prompt: 'Write a story...' });

// Process streamed responses
for await (const message of result) {
  for (const content of message.content) {
    if (content.type === 'text') {
      // Display text as it arrives
      process.stdout.write(content.text);
    }
  }
}
```

**Streaming Benefits:**
- Better user experience
- Lower perceived latency
- Progressive processing
- Memory efficiency

**What You'll Build:**
- Chat interfaces
- Real-time content generators
- Progress tracking systems
- Interactive applications

---

### Example 06: Subagents

**File:** `src/06-subagents.ts`

Leverage parallel processing with subagents:
- Understanding subagent architecture
- Parallel task delegation
- Context isolation
- Domain specialists
- Coordinating multiple agents

**Key Concepts:**
```typescript
// Delegate independent tasks to subagents
const delegateTool = tool(
  'delegate_research',
  'Delegates research to a specialized subagent',
  { topic: z.string(), focus: z.string() },
  async (args) => {
    // Subagent processes independently
    return { content: [{ type: 'text', text: 'Research results...' }] };
  }
);
```

**Subagent Patterns:**

**Map-Reduce Pattern:**
```
Main Agent
    │
    ├──→ Subagent 1 (processes item 1)
    ├──→ Subagent 2 (processes item 2)
    ├──→ Subagent 3 (processes item 3)
    └──→ Subagent 4 (processes item 4)
    │
Aggregates Results
```

**Specialist Consultation:**
```
Main Agent
    │
    ├──→ Security Specialist
    ├──→ Performance Specialist
    ├──→ Architecture Specialist
    └──→ Testing Specialist
    │
Synthesizes Insights
```

**What You'll Build:**
- Parallel data processors
- Multi-specialist consultation systems
- Distributed task managers
- Complex workflow orchestrators

---

## 🎯 Common Patterns

### Pattern 1: Simple Q&A Bot

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function askClaude(question: string) {
  const result = await query({
    prompt: question,
    options: { model: 'claude-sonnet-4-5', maxTokens: 1024 },
  });

  for await (const message of result) {
    for (const content of message.content) {
      if (content.type === 'text') return content.text;
    }
  }
}
```

### Pattern 2: Tool-Enhanced Agent

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const weatherTool = tool(
  'get_weather',
  'Gets weather for a location',
  { location: z.string() },
  async (args) => {
    // Call weather API
    return { content: [{ type: 'text', text: 'Sunny, 72°F' }] };
  }
);

const agent = await query({
  prompt: 'What\'s the weather in SF?',
  options: { tools: [weatherTool] },
});
```

### Pattern 3: File Processing Agent

```typescript
const result = await query({
  prompt: 'Analyze all TypeScript files in src/ and report on code quality',
  options: {
    allowedTools: ['Read', 'Glob', 'Grep'],
    workingDirectory: process.cwd(),
  },
});
```

### Pattern 4: Multi-Agent System

```typescript
const specialists = [securityTool, performanceTool, architectureTool];

const result = await query({
  prompt: 'Review this codebase and provide expert analysis',
  options: {
    tools: specialists,
    maxTokens: 8192,
  },
});
```

## 🔧 Configuration

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Optional
CLAUDE_MODEL=claude-sonnet-4-5
CLAUDE_MAX_TOKENS=4096
```

### Available Models

- `claude-opus-4` - Most powerful, best for complex tasks
- `claude-sonnet-4-5` - Balanced performance and cost (recommended)
- `claude-haiku-4` - Fastest, best for simple tasks

### Permission Modes

Control how tools request permissions:

```typescript
options: {
  permissionMode: 'default',           // User confirms each operation (default)
  permissionMode: 'bypassPermissions', // Auto-allow all operations (use carefully!)
  permissionMode: 'acceptEdits',       // Auto-accept edit operations only
  permissionMode: 'plan',              // Plan mode only, no execution
}
```

**Note:** All examples in this project use `permissionMode: 'bypassPermissions'` for demo purposes to avoid requiring manual approval for each tool use.

## 🛡️ Security Best Practices

### 1. API Key Protection

- Never commit `.env` files
- Use environment variables
- Rotate keys regularly
- Use separate keys for dev/prod

### 2. File Operations

```typescript
// ✅ Good: Restrict to specific directory
options: {
  allowedTools: ['Read'],
  workingDirectory: path.join(process.cwd(), 'data'),
}

// ❌ Bad: No restrictions
options: {
  allowedTools: ['Read', 'Write', 'Edit', 'Bash'],
  workingDirectory: '/',
}
```

### 3. Tool Permissions

```typescript
// Only enable tools you need
options: {
  allowedTools: ['Read', 'Grep'],  // Read-only access
}
```

### 4. Input Validation

```typescript
// Use Zod for robust validation
const safeTool = tool(
  'safe_tool',
  'Description',
  {
    input: z.string().min(1).max(1000),
    number: z.number().min(0).max(100),
  },
  async (args) => { /* ... */ }
);
```

## 🐛 Troubleshooting

### Common Issues

**1. `ANTHROPIC_API_KEY is not set`**
- Ensure `.env` file exists
- Check API key is correct
- Verify `.env` is in project root

**2. `Module not found` errors**
- Run `npm install`
- Check Node.js version (18+)
- Delete `node_modules` and reinstall

**3. Permission errors with file operations**
- Check `workingDirectory` is correct
- Ensure files exist
- Verify file permissions

**4. TypeScript errors**
- Run `npm run type-check`
- Check `tsconfig.json` is correct
- Ensure all dependencies are installed

### Getting Help

- 📚 [Official Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- 💬 [Claude Developers Discord](https://anthropic.com/discord)
- 🐛 [GitHub Issues](https://github.com/anthropics/claude-agent-sdk-typescript/issues)

## 📚 Additional Resources

### Official Documentation

- [Agent SDK Overview](https://docs.claude.com/en/api/agent-sdk/overview)
- [TypeScript SDK Reference](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Building Agents Guide](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)

### Example Projects

- [Email Agent](https://github.com/anthropics/claude-code-sdk-demos) - IMAP email assistant
- Community agents and subagents collections

### Learning Path

1. **Beginner**: Run examples 01-02
   - Understand basic queries
   - Create simple tools

2. **Intermediate**: Run examples 03-04
   - Work with files
   - Build MCP servers

3. **Advanced**: Run examples 05-06
   - Implement streaming
   - Create multi-agent systems

## 🤝 Contributing

Found a bug or want to add an example? Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning and building your own agents!

## 🎓 Next Steps

After completing these examples, you can:

1. **Build a Real Application**
   - Chat interface
   - Code assistant
   - Research tool
   - Content generator

2. **Explore Advanced Features**
   - Custom MCP servers
   - Multi-agent orchestration
   - External API integration
   - Production deployment

3. **Join the Community**
   - Share your projects
   - Contribute to open source
   - Help other learners

## 🌟 Project Ideas

Get inspired with these project ideas:

- **Code Review Bot** - Automated code analysis with specialist subagents
- **Documentation Generator** - Analyzes code and creates comprehensive docs
- **Data Analyst** - Processes CSV/JSON data with parallel subagents
- **Research Assistant** - Gathers and synthesizes information from multiple sources
- **Project Scaffolder** - Creates project templates based on requirements
- **Testing Assistant** - Generates tests for existing code
- **Refactoring Tool** - Suggests and implements code improvements

---

**Happy Building! 🚀**

If you found this tutorial helpful, please ⭐ star the repository and share it with others learning to build with Claude!
