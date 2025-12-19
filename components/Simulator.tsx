
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, RefreshCw, Play } from 'lucide-react';
import { FlowNode, NodeType, VariableMap, ChatMessage, NodeOption } from '../types';
import { Edge } from 'reactflow';
import { generateAIResponse } from '../services/geminiService';

interface SimulatorProps {
  nodes: FlowNode[];
  edges: Edge[];
  onClose: () => void;
}

const Simulator: React.FC<SimulatorProps> = ({ nodes, edges, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [variables, setVariables] = useState<VariableMap>({});
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  useEffect(() => {
    startFlow();
  }, []);

  const startFlow = () => {
    setMessages([]);
    setVariables({ phone: '551199999999', name: 'Usuário Teste' });
    const startNode = nodes.find((n) => n.type === NodeType.START);
    if (startNode) processNode(startNode.id);
  };

  const addMessage = (role: 'bot' | 'user' | 'system', content: string, type: 'text' | 'image' | 'audio' | 'interactive' = 'text', options?: NodeOption[]) => {
    setMessages((prev) => [...prev, { role, content, type, options, timestamp: Date.now() }]);
  };

  const processNode = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setCurrentNodeId(nodeId);
    setIsProcessing(true);

    await new Promise(r => setTimeout(r, 600));

    switch (node.type) {
      case NodeType.WEBHOOK:
        addMessage('system', `Disparando Webhook para ${node.data.webhookUrl}...`);
        try {
            const url = node.data.webhookUrl || '';
            const method = node.data.webhookMethod || 'POST';
            if (url) {
                await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: method === 'POST' ? JSON.stringify(variables) : undefined
                });
                addMessage('system', 'Webhook enviado com sucesso!');
            }
        } catch (e) {
            addMessage('system', 'Falha ao enviar Webhook (Simulação).');
        }
        moveToNextNode(nodeId);
        break;

      case NodeType.START: moveToNextNode(nodeId); break;
      case NodeType.MESSAGE:
        addMessage('bot', replaceVariables(node.data.content || '', variables));
        moveToNextNode(nodeId);
        break;
      case NodeType.INTERACTIVE:
        addMessage('bot', replaceVariables(node.data.content || 'Escolha:', variables), 'interactive', node.data.options);
        setIsProcessing(false);
        break;
      case NodeType.INPUT:
        addMessage('bot', replaceVariables(node.data.content || '?', variables));
        setIsProcessing(false);
        break;
      default: moveToNextNode(nodeId); break;
    }
  };

  const moveToNextNode = (currentNodeId: string, sourceHandleId?: string) => {
    const outgoingEdge = sourceHandleId 
        ? edges.find(edge => edge.source === currentNodeId && edge.sourceHandle === sourceHandleId)
        : edges.find(edge => edge.source === currentNodeId && (edge.sourceHandle === 'default' || !edge.sourceHandle));

    if (outgoingEdge) processNode(outgoingEdge.target);
    else setIsProcessing(false);
  };

  const replaceVariables = (text: string, vars: VariableMap) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] || ''));
  };

  const handleInput = (val: string, optionId?: string) => {
    if (!currentNodeId) return;
    addMessage('user', val);
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (currentNode?.type === NodeType.INPUT && currentNode.data.variable) {
        setVariables(prev => ({ ...prev, [currentNode.data.variable!]: val }));
    }
    moveToNextNode(currentNodeId, optionId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-[32px] w-[340px] h-[85vh] shadow-2xl flex flex-col overflow-hidden border-8 border-gray-900">
        <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
            <span className="font-bold text-sm">Simulador WhaleFlow</span>
            <button onClick={onClose}><X size={18}/></button>
        </div>
        <div className="flex-1 bg-[#e5ddd5] p-3 overflow-y-auto flex flex-col gap-2">
            {messages.map((m, i) => (
                <div key={i} className={`p-2 rounded-lg text-xs max-w-[90%] ${m.role === 'user' ? 'self-end bg-[#dcf8c6]' : m.role === 'system' ? 'self-center bg-gray-200 italic' : 'self-start bg-white'}`}>
                    {m.content}
                </div>
            ))}
        </div>
        <div className="p-3 bg-gray-100 flex gap-2">
            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} className="flex-1 p-2 rounded-full border border-gray-300 text-sm" placeholder="Teste..." />
            <button onClick={() => handleInput(inputValue)} className="p-2 bg-green-500 text-white rounded-full"><Send size={16}/></button>
        </div>
      </div>
    </div>
  );
};

export default Simulator;
