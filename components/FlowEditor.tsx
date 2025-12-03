import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Node,
  OnConnect
} from 'reactflow';
import Sidebar from './Sidebar';
import CustomNode from './CustomNode';
import PropertiesPanel from './PropertiesPanel';
import Simulator from './Simulator';
import SettingsModal from './SettingsModal';
import { FlowNode, NodeType, NodeData } from '../types';
import { Play, Download, Upload, Smartphone, Settings, Square, Loader2, Send } from 'lucide-react';

const nodeTypes = {
  [NodeType.START]: CustomNode,
  [NodeType.MESSAGE]: CustomNode,
  [NodeType.IMAGE]: CustomNode,
  [NodeType.AUDIO]: CustomNode,
  [NodeType.INPUT]: CustomNode,
  [NodeType.INTERACTIVE]: CustomNode,
  [NodeType.CONDITION]: CustomNode,
  [NodeType.SET_VARIABLE]: CustomNode,
  [NodeType.CODE]: CustomNode,
  [NodeType.AI_GEMINI]: CustomNode,
  [NodeType.DATABASE_SAVE]: CustomNode,
  [NodeType.API_REQUEST]: CustomNode,
  [NodeType.AGENT_HANDOFF]: CustomNode,
  [NodeType.DELAY]: CustomNode,
  [NodeType.WEBHOOK]: CustomNode,
};

const initialNodes: FlowNode[] = [
  {
    id: 'start-1',
    type: NodeType.START,
    position: { x: 250, y: 100 },
    data: { label: 'Gatilho de Entrada', triggerType: 'all' },
  },
];

const FlowEditor = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // States related to UI/Features
  const [isSimulatorOpen, setSimulatorOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isLoadingBot, setIsLoadingBot] = useState(false);
  const [botConfig, setBotConfig] = useState<any>(null);
  
  // Manual Trigger State
  const [isTestModalOpen, setTestModalOpen] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Load config from local storage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('flow_bot_config');
    if (savedConfig) {
      setBotConfig(JSON.parse(savedConfig));
    }
  }, []);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: FlowNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `Novo ${type}` },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id);
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const deleteNode = (id: string) => {
    if (id === 'start-1') return;
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  };

  const handleExport = () => {
    const flow = { nodes, edges };
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow-backup.json';
    a.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flow = JSON.parse(e.target?.result as string);
        if (flow.nodes && flow.edges) {
          setNodes(flow.nodes);
          setEdges(flow.edges);
        } else {
          alert('Arquivo de fluxo inválido.');
        }
      } catch (error) {
        console.error("Erro ao importar", error);
        alert('Erro ao ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const saveConfig = (newConfig: any) => {
    setBotConfig(newConfig);
    localStorage.setItem('flow_bot_config', JSON.stringify(newConfig));
  };

  const handleManualTrigger = async () => {
     if (!testPhoneNumber) {
       alert("Digite um número de telefone (Ex: 551199999999)");
       return;
     }

     // Find the first message node connected to Start
     const startEdge = edges.find(e => e.source === 'start-1');
     if (!startEdge) {
       alert("Conecte o bloco 'Início' a uma 'Mensagem' para testar.");
       return;
     }
     const firstNode = nodes.find(n => n.id === startEdge.target);
     if (!firstNode) return;

     const messageContent = firstNode.data.content || "Olá! Teste do Flow.";

     setIsSendingTest(true);
     try {
       const res = await fetch('/api/send-message', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           to: testPhoneNumber,
           message: messageContent,
           config: botConfig
         })
       });
       
       const data = await res.json();
       if (data.success) {
         alert(`✅ Mensagem enviada com sucesso!`);
         setTestModalOpen(false);
       } else {
         alert(`❌ Erro ao enviar: ${data.error || 'Verifique se o WhatsApp está conectado.'}`);
       }
     } catch (e) {
       alert("Erro de conexão com o servidor.");
     } finally {
       setIsSendingTest(false);
     }
  };

  const toggleBot = async () => {
    setIsLoadingBot(true);
    const baseUrl = '/api';

    try {
      if (!isBotRunning) {
        // Verificar status antes de iniciar
        const statusRes = await fetch(`${baseUrl}/whatsapp/status`);
        const statusData = await statusRes.json();
        
        if (statusData.status !== 'open') {
           alert("WhatsApp não conectado! Abra a engrenagem e conecte o QR Code antes de iniciar.");
           setSettingsOpen(true);
           setIsLoadingBot(false);
           return;
        }

        // IMPORTANT: Sending the current flow state (nodes and edges) to the backend
        const res = await fetch(`${baseUrl}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             ...botConfig, 
             flowData: { nodes, edges } 
          })
        });
        const data = await res.json();
        
        if (data.success) {
          setIsBotRunning(true);
        } else {
          alert("Falha ao iniciar bot: " + data.message);
        }
      } else {
        const res = await fetch(`${baseUrl}/stop`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setIsBotRunning(false);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o Servidor. Verifique se a aplicação está rodando.");
    } finally {
      setIsLoadingBot(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f7]">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative" ref={reactFlowWrapper}>
        
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 h-16 bg-white/80 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm z-10 flex items-center justify-between px-6 transition-all">
           
           {/* Status */}
           <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isBotRunning ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                {isLoadingBot ? <Loader2 size={14} className="animate-spin" /> : <div className={`w-2 h-2 rounded-full ${isBotRunning ? 'bg-green-500' : 'bg-gray-400'}`}></div>}
                {isBotRunning ? 'Bot Online' : 'Bot Offline'}
             </div>
           </div>
           
           {/* Actions */}
           <div className="flex items-center gap-3">
             <div className="flex items-center bg-gray-100/50 rounded-xl p-1 border border-gray-200/50">
                <button 
                  onClick={handleImportClick} 
                  className="p-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all shadow-sm hover:shadow"
                  title="Importar JSON"
                >
                  <Upload size={18} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                
                <button 
                  onClick={handleExport} 
                  className="p-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all shadow-sm hover:shadow"
                  title="Exportar JSON"
                >
                  <Download size={18} />
                </button>

                <div className="w-px h-4 bg-gray-300 mx-1"></div>

                <button 
                  onClick={() => setSettingsOpen(true)} 
                  className={`p-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all shadow-sm hover:shadow`}
                  title="Configurações da API"
                >
                  <Settings size={18} />
                </button>
             </div>
             
             <button 
                onClick={() => setTestModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-md hover:shadow-lg border border-blue-500"
             >
                <Send size={16} />
                <span className="hidden md:inline">Disparo Manual</span>
             </button>

             <button 
                onClick={() => setSimulatorOpen(true)}
                className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all active:scale-95 shadow-md hover:shadow-lg border border-gray-700"
             >
                <Smartphone size={16} />
                <span className="hidden md:inline">Simulador</span>
             </button>

             <button 
                onClick={toggleBot}
                disabled={isLoadingBot}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md hover:shadow-lg border disabled:opacity-70 disabled:cursor-not-allowed
                  ${isBotRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-400' 
                    : 'bg-green-500 hover:bg-green-600 text-white border-green-400'
                  }
                `}
             >
                {isLoadingBot ? <Loader2 size={16} className="animate-spin"/> : (isBotRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />)}
                <span className="hidden md:inline">{isBotRunning ? 'Parar' : 'Iniciar'}</span>
             </button>
           </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls className="!bg-white !border-gray-200 !shadow-lg !rounded-xl overflow-hidden" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <PropertiesPanel 
          node={selectedNode} 
          onChange={updateNodeData} 
          onClose={() => setSelectedNodeId(null)} 
          onDelete={deleteNode}
        />
      )}

      {isSimulatorOpen && (
        <Simulator 
          nodes={nodes} 
          edges={edges} 
          onClose={() => setSimulatorOpen(false)} 
        />
      )}

      {/* Manual Trigger Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center animate-in fade-in">
           <div className="bg-white rounded-2xl p-6 w-[400px] shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Teste de Disparo Real</h3>
              <p className="text-sm text-gray-500 mb-4">
                Isso enviará a primeira mensagem do fluxo para o número abaixo usando a conexão atual do WhatsApp.
              </p>
              
              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase">Número do Destinatário</label>
                <input 
                  type="text" 
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleManualTrigger}
                  disabled={isSendingTest}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                >
                  {isSendingTest && <Loader2 size={16} className="animate-spin" />}
                  Enviar Teste
                </button>
              </div>
           </div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={botConfig}
        onSave={saveConfig}
      />

    </div>
  );
};

export default FlowEditor;