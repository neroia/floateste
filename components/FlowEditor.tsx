import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
  OnConnect
} from 'reactflow';
import Sidebar from './Sidebar';
import CustomNode from './CustomNode';
import PropertiesPanel from './PropertiesPanel';
import Simulator from './Simulator';
import SettingsModal from './SettingsModal';
import { FlowNode, NodeType, NodeData } from '../types';
import { Play, Download, Upload, Smartphone, Settings, Square, Loader2 } from 'lucide-react';

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
  const [botConfig, setBotConfig] = useState<any>(null);
  
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
      // Optionally select the new node immediately
      setSelectedNodeId(newNode.id);
    },
    [reactFlowInstance, setNodes]
  );

  // Single click handler - Wrapped in useCallback for performance
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Click on background closes the panel - Wrapped in useCallback
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
    if (id === 'start-1') return; // Protect start node
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  };

  // --- Toolbar Actions ---

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
          // Optional: Reset viewport logic here if needed
        } else {
          alert('Arquivo de fluxo inválido.');
        }
      } catch (error) {
        console.error("Erro ao importar", error);
        alert('Erro ao ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = ''; 
  };

  const saveConfig = (newConfig: any) => {
    setBotConfig(newConfig);
    localStorage.setItem('flow_bot_config', JSON.stringify(newConfig));
  };

  const toggleBot = () => {
    // Basic validation
    if (!botConfig || !botConfig.apiKey) {
      alert("Por favor, configure a API do WhatsApp nas configurações antes de iniciar.");
      setSettingsOpen(true);
      return;
    }
    
    // Simulation of starting the backend process
    if (!isBotRunning) {
      // Logic to start...
      setIsBotRunning(true);
      // alert("Bot iniciado no ambiente local!");
    } else {
      // Logic to stop...
      setIsBotRunning(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f7]">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-full relative" ref={reactFlowWrapper}>
        
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 h-16 bg-white/80 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm z-10 flex items-center justify-between px-6 transition-all">
           
           {/* Left: Status */}
           <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isBotRunning ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                {isBotRunning ? <Loader2 size={14} className="animate-spin" /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
                {isBotRunning ? 'Bot Executando (Local)' : 'Bot Parado'}
             </div>
           </div>
           
           {/* Right: Actions */}
           <div className="flex items-center gap-3">
             {/* Config Group */}
             <div className="flex items-center bg-gray-100/50 rounded-xl p-1 border border-gray-200/50">
                <button 
                  onClick={handleImportClick} 
                  className="p-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all shadow-sm hover:shadow"
                  title="Importar JSON"
                >
                  <Upload size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
                
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
                  className={`p-2 text-gray-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all shadow-sm hover:shadow ${!botConfig?.apiKey ? 'text-orange-500 animate-pulse' : ''}`}
                  title="Configurações da API"
                >
                  <Settings size={18} />
                </button>
             </div>
             
             {/* Simulator Button */}
             <button 
                onClick={() => setSimulatorOpen(true)}
                className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-all active:scale-95 shadow-md hover:shadow-lg border border-gray-700"
             >
                <Smartphone size={16} />
                <span className="hidden md:inline">Testar</span>
             </button>

             {/* Start/Stop Button */}
             <button 
                onClick={toggleBot}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md hover:shadow-lg border
                  ${isBotRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white border-red-400' 
                    : 'bg-green-500 hover:bg-green-600 text-white border-green-400'
                  }
                `}
             >
                {isBotRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                <span className="hidden md:inline">{isBotRunning ? 'Parar Bot' : 'Iniciar'}</span>
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