/**
 * Configuration utilities for Claude Agent SDK examples
 *
 * This module provides shared configuration and helper functions
 * used across all example files.
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Validates that required environment variables are set
 * Throws an error if ANTHROPIC_API_KEY is missing
 */
export function validateEnv(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. ' +
      'Please create a .env file with your API key. ' +
      'See .env.example for reference.'
    );
  }
}

/**
 * Get the Claude model to use
 * Defaults to claude-sonnet-4-5 if not specified
 */
export function getModel(): string {
  return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5';
}

/**
 * Get the max tokens for responses
 * Defaults to 4096 if not specified
 */
export function getMaxTokens(): number {
  const tokens = process.env.CLAUDE_MAX_TOKENS;
  return tokens ? parseInt(tokens, 10) : 4096;
}

/**
 * Format output with a header for better readability
 */
export function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Format output with a section header
 */
export function printSection(section: string): void {
  console.log(`\n--- ${section} ---\n`);
}

/**
 * Common options for agent queries
 */
export const defaultOptions = {
  model: getModel(),
  maxTokens: getMaxTokens(),
};
