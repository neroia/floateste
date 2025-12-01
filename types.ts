import { Node, Edge } from 'reactflow';

export enum NodeType {
  START = 'start',
  MESSAGE = 'message',
  IMAGE = 'image',
  AUDIO = 'audio', // New
  INPUT = 'input',
  INTERACTIVE = 'interactive', // New (Buttons/List)
  CONDITION = 'condition',
  SET_VARIABLE = 'set_variable', // New
  CODE = 'code', // New
  AI_GEMINI = 'ai_gemini',
  DATABASE_SAVE = 'database_save',
  API_REQUEST = 'api_request',
  AGENT_HANDOFF = 'agent_handoff', // New
  DELAY = 'delay',
  WEBHOOK = 'webhook'
}

export interface NodeOption {
  id: string;
  label: string;
  description?: string;
}

export interface NodeData {
  label: string;
  content?: string; // Text content, prompt, url, or code
  variable?: string; // Variable name to save input or AI result
  value?: string; // For Set Variable
  conditionValue?: string; // For condition nodes
  options?: NodeOption[]; // For interactive lists or buttons
  interactiveType?: 'button' | 'list';
  dbType?: 'json' | 'csv';
  duration?: number; // For delay
  systemInstruction?: string; // For Gemini
  
  // API Request Specific
  apiMethod?: string;
  apiUrl?: string;
  apiHeaders?: string; // JSON string
  apiBody?: string;

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
  options?: NodeOption[]; // For interactive messages
  timestamp: number;
}