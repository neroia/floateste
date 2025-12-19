
import React from 'react';
import { NodeType } from '../types';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Split, 
  BrainCircuit, 
  Database, 
  Clock, 
  FileInput,
  Webhook,
  Globe,
  List,
  Mic,
  Variable,
  Code,
  Headset,
  HelpCircle,
  CornerUpLeft
} from 'lucide-react';

interface SidebarProps {
  onHelpClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onHelpClick }) => {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const menuItems = [
    { type: NodeType.MESSAGE, label: 'Mensagem', icon: <MessageSquare size={18} />, color: 'text-blue-500 bg-blue-50' },
    { type: NodeType.INTERACTIVE, label: 'Menu (Lista)', icon: <List size={18} />, color: 'text-violet-500 bg-violet-50' },
    { type: NodeType.JUMP, label: 'Ir Para / Voltar', icon: <CornerUpLeft size={18} />, color: 'text-gray-700 bg-gray-100' },
    { type: NodeType.IMAGE, label: 'Imagem', icon: <ImageIcon size={18} />, color: 'text-purple-500 bg-purple-50' },
    { type: NodeType.AUDIO, label: 'Áudio', icon: <Mic size={18} />, color: 'text-pink-600 bg-pink-50' },
    { type: NodeType.INPUT, label: 'Entrada Usuario', icon: <FileInput size={18} />, color: 'text-pink-500 bg-pink-50' },
    { type: NodeType.CONDITION, label: 'Condição', icon: <Split size={18} />, color: 'text-orange-500 bg-orange-50' },
    { type: NodeType.SET_VARIABLE, label: 'Definir Variável', icon: <Variable size={18} />, color: 'text-yellow-600 bg-yellow-50' },
    { type: NodeType.CODE, label: 'Javascript', icon: <Code size={18} />, color: 'text-slate-600 bg-slate-50' },
    { type: NodeType.AI_GEMINI, label: 'Gemini AI', icon: <BrainCircuit size={18} />, color: 'text-teal-500 bg-teal-50' },
    { type: NodeType.API_REQUEST, label: 'API Externa', icon: <Globe size={18} />, color: 'text-cyan-500 bg-cyan-50' },
    { type: NodeType.DATABASE_SAVE, label: 'Salvar JSON', icon: <Database size={18} />, color: 'text-emerald-500 bg-emerald-50' },
    { type: NodeType.AGENT_HANDOFF, label: 'Transbordo', icon: <Headset size={18} />, color: 'text-red-500 bg-red-50' },
    { type: NodeType.WEBHOOK, label: 'Webhook', icon: <Webhook size={18} />, color: 'text-indigo-500 bg-indigo-50' },
    { type: NodeType.DELAY, label: 'Aguardar', icon: <Clock size={18} />, color: 'text-gray-500 bg-gray-50' },
  ];

  return (
    <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200 h-full flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-6 border-b border-gray-100 flex flex-col items-start">
        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent leading-none">
          WhaleFlow
        </h1>
        <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-1.5">WhatsApp Automation</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-1">Blocos</div>
        <div className="grid gap-2">
          {menuItems.map((item) => (
            <div
              key={item.type}
              className="flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 group"
              onDragStart={(event) => onDragStart(event, item.type)}
              draggable
            >
              <div className={`p-2 rounded-lg ${item.color} group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end">
        <button 
          onClick={onHelpClick}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title="Ajuda"
        >
          <HelpCircle size={16} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
