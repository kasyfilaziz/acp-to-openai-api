import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

dotenv.config();

export interface AgentConfig {
  command: string;
  args: string[];
  cwd: string;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface Config {
  agent: AgentConfig;
  server: ServerConfig;
  logDir?: string;
}

const DEFAULT_CONFIG: Config = {
  agent: {
    command: process.env.AGENT_COMMAND || 'gemini',
    args: process.env.AGENT_ARGS ? process.env.AGENT_ARGS.split(' ') : ['--stdio'],
    cwd: process.cwd()
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8080', 10)
  },
  logDir: process.env.LOG_DIR || '/tmp/acp-middleware'
};

export function loadConfig(configPath?: string): Config {
  const configFilePath = configPath || path.join(process.cwd(), 'config.yaml');
  
  let fileConfig: Partial<Config> = {};
  
  if (fs.existsSync(configFilePath)) {
    try {
      const fileContent = fs.readFileSync(configFilePath, 'utf-8');
      fileConfig = yaml.load(fileContent) as Partial<Config> || {};
    } catch (err) {
      console.warn(`Failed to load config from ${configFilePath}: ${err}`);
    }
  }
  
  return {
    agent: {
      command: process.env.AGENT_COMMAND || fileConfig.agent?.command || DEFAULT_CONFIG.agent.command,
      args: process.env.AGENT_ARGS 
        ? process.env.AGENT_ARGS.split(' ') 
        : fileConfig.agent?.args || DEFAULT_CONFIG.agent.args,
      cwd: fileConfig.agent?.cwd || DEFAULT_CONFIG.agent.cwd
    },
    server: {
      host: process.env.HOST || fileConfig.server?.host || DEFAULT_CONFIG.server.host,
      port: parseInt(process.env.PORT || String(fileConfig.server?.port), 10) || DEFAULT_CONFIG.server.port
    },
    logDir: process.env.LOG_DIR || fileConfig.logDir || DEFAULT_CONFIG.logDir
  };
}

export const config = loadConfig();

export default config;