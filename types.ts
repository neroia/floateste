
import { Node, Edge } from 'reactflow';

export enum NodeType {
  START = 'start',
  MESSAGE = 'message',
  IMAGE = 'image',
  AUDIO = 'audio',
  INPUT = 'input',
  INTERACTIVE = 'interactive',
  CONDITION = 'condition',
  SET_VARIABLE = 'set_variable',
  CODE = 'code',
  AI_GEMINI = 'ai_gemini',
  DATABASE_SAVE = 'database_save',
  API_REQUEST = 'api_request',
  AGENT_HANDOFF = 'agent_handoff',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  JUMP = 'jump'
}

export interface NodeOption {
  id: string;
  label: string;
  description?: string;
}

export interface NodeData {
  label: string;
  content?: string;
  variable?: string;
  value?: string;
  conditionValue?: string;
  options?: NodeOption[];
  interactiveType?: 'button' | 'list';
  dbType?: 'json' | 'csv';
  duration?: number;
  systemInstruction?: string;
  
  // Jump / Back Specific
  jumpNodeId?: string;

  // API Request Specific
  apiMethod?: string;
  apiUrl?: string;
  apiHeaders?: string;
  apiBody?: string;

  // Webhook Specific
  webhookUrl?: string;
  webhookMethod?: 'POST' | 'GET';

  // Trigger Specific (Start Node)
  triggerType?: 'all' | 'keyword_exact' | 'keyword_contains';
  triggerKeywords?: string;
}

export type FlowNode = Node<NodeData>;

export interface FlowState {
  nodes: FlowNode[];
  edges: Edge[];
  selectedNode: FlowNode | null;
}

export type VariableMap = Record<string, string | number | boolean>;

export interface ChatMessage {
  role: 'bot' | 'user' | 'system';
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'interactive';
  options?: NodeOption[];
  timestamp: number;
}
