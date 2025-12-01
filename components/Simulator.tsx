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

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  // Start logic
  useEffect(() => {
    startFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startFlow = () => {
    setMessages([]);
    setVariables({});
    const startNode = nodes.find((n) => n.type === NodeType.START);
    if (startNode) {
      let triggerMsg = "Iniciado manualmente.";
      if (startNode.data.triggerType === 'keyword_exact') triggerMsg = `Aguardando: "${startNode.data.triggerKeywords}"`;
      if (startNode.data.triggerType === 'keyword_contains') triggerMsg = `Aguardando conter: "${startNode.data.triggerKeywords}"`;
      addMessage('system', triggerMsg);
      
      processNode(startNode.id);
    } else {
      addMessage('system', 'Erro: Nó de início não encontrado.');
    }
  };

  const addMessage = (role: 'bot' | 'user' | 'system', content: string, type: 'text' | 'image' | 'audio' | 'interactive' = 'text', options?: NodeOption[]) => {
    setMessages((prev) => [...prev, { role, content, type, options, timestamp: Date.now() }]);
  };

  const processNode = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setCurrentNodeId(nodeId);
    setIsProcessing(true);

    if (node.type !== NodeType.API_REQUEST && node.type !== NodeType.CODE) {
      await new Promise(r => setTimeout(r, 600));
    }

    switch (node.type) {
      case NodeType.START:
        moveToNextNode(nodeId);
        break;

      case NodeType.MESSAGE:
        addMessage('bot', replaceVariables(node.data.content || '', variables));
        moveToNextNode(nodeId);
        break;

      case NodeType.INTERACTIVE:
        addMessage('bot', replaceVariables(node.data.content || 'Escolha uma opção:', variables), 'interactive', node.data.options);
        setIsProcessing(false); 
        // Logic stops here, waiting for button click which triggers handleInput -> moveToNextNode with optionId
        break;

      case NodeType.IMAGE:
        addMessage('bot', node.data.content || '', 'image');
        moveToNextNode(nodeId);
        break;
      
      case NodeType.AUDIO:
         addMessage('bot', node.data.content || '', 'audio');
         moveToNextNode(nodeId);
         break;

      case NodeType.DELAY:
        await new Promise(r => setTimeout(r, (node.data.duration || 1) * 1000));
        moveToNextNode(nodeId);
        break;

      case NodeType.INPUT:
        addMessage('bot', replaceVariables(node.data.content || 'Aguardando resposta...', variables));
        setIsProcessing(false); 
        // Logic stops here until user inputs text
        break;
      
      case NodeType.SET_VARIABLE:
         if (node.data.variable) {
           const val = replaceVariables(node.data.value || '', variables);
           setVariables(prev => ({...prev, [node.data.variable!]: val }));
         }
         moveToNextNode(nodeId);
         break;
      
      case NodeType.CODE:
         addMessage('system', 'Executando script...');
         try {
           const code = node.data.content || '';
           // Safe-ish eval: create a function with variables as arg
           // eslint-disable-next-line no-new-func
           const runCode = new Function('variables', `${code}`);
           const resultVars = runCode({...variables}); // pass copy
           
           if (typeof resultVars === 'object') {
             setVariables(resultVars);
             addMessage('system', 'Script executado com sucesso.');
           }
         } catch(e) {
           console.error(e);
           addMessage('system', 'Erro no script JS.');
         }
         moveToNextNode(nodeId);
         break;

      case NodeType.CONDITION:
        const varName = node.data.variable;
        const checkVal = node.data.conditionValue;
        const actualVal = varName ? variables[varName] : '';
        
        // Loose equality check (string vs number)
        // eslint-disable-next-line eqeqeq
        const isTrue = actualVal == checkVal;
        
        addMessage('system', `Condição: ${varName} (${actualVal}) == ${checkVal}? ${isTrue ? 'VERDADEIRO' : 'FALSO'}`);
        
        // Determine which handle to follow
        moveToNextNode(nodeId, isTrue ? 'true' : 'false');
        break;

      case NodeType.AI_GEMINI:
        addMessage('system', 'Gemini está pensando...');
        const prompt = replaceVariables(node.data.content || '', variables);
        const aiResponse = await generateAIResponse(prompt, node.data.systemInstruction);
        
        if (node.data.variable) {
          setVariables(prev => ({ ...prev, [node.data.variable!]: aiResponse }));
        }
        addMessage('bot', aiResponse);
        moveToNextNode(nodeId);
        break;
      
      case NodeType.AGENT_HANDOFF:
        addMessage('bot', node.data.content || 'Transferindo para um atendente...');
        addMessage('system', 'BOT PAUSADO: Transbordo iniciado.');
        setIsProcessing(false);
        break;

      case NodeType.API_REQUEST:
        addMessage('system', `API: ${node.data.apiMethod} ${node.data.apiUrl}...`);
        try {
          const url = replaceVariables(node.data.apiUrl || '', variables);
          const method = node.data.apiMethod || 'GET';
          const headersStr = replaceVariables(node.data.apiHeaders || '{}', variables);
          const bodyStr = replaceVariables(node.data.apiBody || '{}', variables);
          
          let headers = {};
          try { headers = JSON.parse(headersStr); } catch (e) { console.error("Bad headers JSON", e); }

          const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
          };

          if (method !== 'GET' && method !== 'HEAD') {
            options.body = bodyStr;
          }

          const response = await fetch(url, options);
          const json = await response.json();
          const resultStr = JSON.stringify(json);

          if (node.data.variable) {
            setVariables(prev => ({ ...prev, [node.data.variable!]: resultStr }));
          }
          addMessage('system', 'API OK.');
        } catch (error) {
          addMessage('system', 'Erro API.');
        }
        moveToNextNode(nodeId);
        break;

      case NodeType.DATABASE_SAVE:
        addMessage('system', `Dados salvos em ${node.data.dbType || 'JSON'} local.`);
        moveToNextNode(nodeId);
        break;
        
      case NodeType.WEBHOOK:
        addMessage('system', 'Webhook disparado.');
        moveToNextNode(nodeId);
        break;

      default:
        moveToNextNode(nodeId);
    }
  };

  const moveToNextNode = (currentNodeId: string, sourceHandleId?: string) => {
    // Find edge starting from this node
    let outgoingEdge;
    
    if (sourceHandleId) {
       // Exact handle match (for Conditions and Interactive)
       outgoingEdge = edges.find(edge => edge.source === currentNodeId && edge.sourceHandle === sourceHandleId);
    } else {
       // Fallback for single-output nodes (try default handle or any edge from this node)
       outgoingEdge = edges.find(edge => edge.source === currentNodeId && (edge.sourceHandle === 'default' || !edge.sourceHandle));
    }

    if (outgoingEdge) {
      processNode(outgoingEdge.target);
    } else {
      setIsProcessing(false);
      // Optional: addMessage('system', 'Fim do fluxo (sem conexão).');
    }
  };

  const replaceVariables = (text: string, vars: VariableMap) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] || ''));
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleInput(inputValue);
  };

  const handleInput = (val: string, optionId?: string) => {
    if (!currentNodeId) return;

    addMessage('user', val);
    const userInput = val;
    setInputValue('');
    setIsProcessing(true);

    const currentNode = nodes.find(n => n.id === currentNodeId);
    
    // Check if we are handling an Interactive Node click or Text Input
    if (currentNode) {
      if (currentNode.type === NodeType.INTERACTIVE) {
         // If it was interactive, we MUST follow the specific option handle
         if (optionId) {
            // Save variable if configured
            if (currentNode.data.variable) {
                setVariables(prev => ({ ...prev, [currentNode.data.variable!]: userInput }));
            }
            moveToNextNode(currentNodeId, optionId);
            return;
         }
      }

      // Standard Input Node
      if (currentNode.type === NodeType.INPUT && currentNode.data.variable) {
        setVariables(prev => ({ ...prev, [currentNode.data.variable!]: userInput }));
      }
    }

    // Default move for text input
    moveToNextNode(currentNodeId);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-[380px] h-[700px] shadow-2xl flex flex-col overflow-hidden relative border-8 border-gray-900">
        
        {/* Notch/Header */}
        <div className="bg-gray-100 p-4 border-b border-gray-200 flex justify-between items-center pt-6">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                <Bot size={18} />
             </div>
             <div>
                <h3 className="font-semibold text-sm">Bot Teste</h3>
                <p className="text-[10px] text-green-600 font-medium">Online</p>
             </div>
           </div>
           <div className="flex gap-2">
             <button onClick={startFlow} className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
               <RefreshCw size={18} />
             </button>
             <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
               <X size={18} />
             </button>
           </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 bg-[#e5ddd5] p-4 overflow-y-auto flex flex-col gap-3"
          style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat' }}
        >
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm relative ${
                msg.role === 'user' 
                  ? 'self-end bg-[#dcf8c6] text-gray-800 rounded-tr-none' 
                  : msg.role === 'system'
                  ? 'self-center bg-gray-200/80 text-gray-600 text-xs py-1 px-3 rounded-full shadow-none'
                  : 'self-start bg-white text-gray-800 rounded-tl-none'
              }`}
            >
              {msg.type === 'image' && (
                <img src={msg.content} alt="content" className="rounded-lg max-w-full mb-2" />
              )}
              
              {msg.type === 'audio' && (
                <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md w-full">
                  <Play size={16} className="text-gray-500"/>
                  <div className="h-1 bg-gray-300 flex-1 rounded-full relative">
                    <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-[10px] text-gray-500">0:15</span>
                </div>
              )}

              {msg.content}

              {/* Interactive Buttons */}
              {msg.type === 'interactive' && msg.options && (
                <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-gray-100">
                   {msg.options.map((opt) => (
                     <button 
                       key={opt.id}
                       onClick={() => handleInput(opt.label, opt.id)}
                       disabled={isProcessing}
                       className="w-full py-2 bg-white text-blue-500 font-semibold text-center border border-gray-100 shadow-sm rounded-lg hover:bg-gray-50 transition-colors active:bg-blue-50"
                     >
                       {opt.label}
                     </button>
                   ))}
                </div>
              )}

              {msg.role !== 'system' && (
                <span className="text-[9px] text-gray-400 absolute bottom-1 right-2 block leading-none pt-2">
                   {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
          ))}
          {isProcessing && (
             <div className="self-start bg-white p-3 rounded-lg rounded-tl-none shadow-sm w-16 flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleUserSubmit} className="p-3 bg-gray-100 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 focus:outline-none focus:border-green-500 text-sm"
            placeholder="Digite uma mensagem..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isProcessing}
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isProcessing}
            className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-green-600 transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default Simulator;