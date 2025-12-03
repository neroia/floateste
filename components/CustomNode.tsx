import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
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
  Zap,
  List,
  Mic,
  Variable,
  Code,
  Headset,
  Check,
  X as XIcon
} from 'lucide-react';
import { NodeData, NodeType } from '../types';

const getNodeIcon = (type: string) => {
  switch (type) {
    case NodeType.START: return <Zap size={16} className="text-white" />;
    case NodeType.MESSAGE: return <MessageSquare size={16} className="text-blue-500" />;
    case NodeType.INTERACTIVE: return <List size={16} className="text-violet-500" />;
    case NodeType.IMAGE: return <ImageIcon size={16} className="text-purple-500" />;
    case NodeType.AUDIO: return <Mic size={16} className="text-pink-600" />;
    case NodeType.CONDITION: return <Split size={16} className="text-orange-500" />;
    case NodeType.SET_VARIABLE: return <Variable size={16} className="text-yellow-600" />;
    case NodeType.CODE: return <Code size={16} className="text-slate-600" />;
    case NodeType.AI_GEMINI: return <BrainCircuit size={16} className="text-teal-500" />;
    case NodeType.DATABASE_SAVE: return <Database size={16} className="text-emerald-500" />;
    case NodeType.DELAY: return <Clock size={16} className="text-gray-500" />;
    case NodeType.INPUT: return <FileInput size={16} className="text-pink-500" />;
    case NodeType.WEBHOOK: return <Webhook size={16} className="text-indigo-500" />;
    case NodeType.API_REQUEST: return <Globe size={16} className="text-cyan-500" />;
    case NodeType.AGENT_HANDOFF: return <Headset size={16} className="text-red-500" />;
    default: return <MessageSquare size={16} />;
  }
};

const CustomNode = ({ data, type, selected }: NodeProps<NodeData>) => {
  const isStart = type === NodeType.START;
  const isCondition = type === NodeType.CONDITION;
  const isInteractive = type === NodeType.INTERACTIVE;
  
  const getSubtext = () => {
    if (type === NodeType.API_REQUEST) {
      return `${data.apiMethod || 'GET'} ${data.apiUrl || ''}`;
    }
    if (isInteractive) {
      return 'Menu (Lista)';
    }
    if (type === NodeType.SET_VARIABLE) {
      return `${data.variable || '?'} = ${data.value || '?'}`;
    }
    if (type === NodeType.CODE) {
      return "Executar Script JS";
    }
    if (type === NodeType.AGENT_HANDOFF) {
      return "Pausar e chamar humano";
    }
    if (isStart) {
       if (data.triggerType === 'keyword_exact') return `Se for exatamente: "${data.triggerKeywords}"`;
       if (data.triggerType === 'keyword_contains') return `Se conter: "${data.triggerKeywords}"`;
       return "Qualquer mensagem";
    }
    return data.content || data.systemInstruction || "Sem configuração";
  };
  
  return (
    <div 
      className={`
        relative min-w-[200px] max-w-[250px] rounded-2xl shadow-sm transition-all duration-200
        ${isStart ? 'bg-zinc-900 text-white shadow-md' : 'bg-white/90 backdrop-blur-md border border-gray-200/60 hover:border-blue-400'}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 p-3 border-b ${isStart ? 'border-zinc-700' : 'border-gray-100'}`}>
        <div className={`p-1.5 rounded-lg ${isStart ? 'bg-zinc-700' : 'bg-gray-100'}`}>
          {getNodeIcon(type || 'default')}
        </div>
        <span className={`text-sm font-semibold ${isStart ? 'text-white' : 'text-gray-800'}`}>
          {data.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 text-xs">
        {/* Main Content Text */}
        {!isInteractive && (
          <p className={`${isStart ? 'text-zinc-400' : 'text-gray-500'} line-clamp-2 break-all mb-1`}>
             {getSubtext()}
          </p>
        )}

        {/* Condition Visuals */}
        {isCondition && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="relative flex items-center justify-between p-1.5 bg-green-50 rounded border border-green-100 text-green-700 font-medium">
              <span className="flex items-center gap-1"><Check size={12}/> Verdadeiro</span>
              <Handle
                type="source"
                position={Position.Right}
                id="true"
                className="!w-2.5 !h-2.5 !bg-green-500 !border-2 !border-white !-right-[18px]"
              />
            </div>
            <div className="relative flex items-center justify-between p-1.5 bg-red-50 rounded border border-red-100 text-red-700 font-medium">
              <span className="flex items-center gap-1"><XIcon size={12}/> Falso</span>
              <Handle
                type="source"
                position={Position.Right}
                id="false"
                className="!w-2.5 !h-2.5 !bg-red-500 !border-2 !border-white !-right-[18px]"
              />
            </div>
          </div>
        )}

        {/* Interactive Options Visuals */}
        {isInteractive && (
          <div className="flex flex-col gap-1.5 mt-1">
             <p className="text-gray-400 mb-1">{data.content || 'Escolha uma opção:'}</p>
             {data.options?.map((opt) => (
               <div key={opt.id} className="relative flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 font-medium group hover:bg-violet-50 hover:border-violet-100 transition-colors">
                  <span className="truncate pr-2">{opt.label}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={opt.id}
                    className="!w-2.5 !h-2.5 !bg-violet-400 !border-2 !border-white group-hover:!bg-violet-600 !-right-[18px]"
                  />
               </div>
             ))}
             {(!data.options || data.options.length === 0) && (
               <span className="text-gray-400 italic">Sem opções definidas</span>
             )}
          </div>
        )}

        {/* Standard Variable Tag */}
        {(data.variable && type !== NodeType.SET_VARIABLE && type !== NodeType.CONDITION) && (
          <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 text-[10px] font-mono">
            var: {data.variable}
          </div>
        )}
      </div>

      {/* Standard Input Handle (Left) */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white hover:!bg-blue-500 transition-colors -ml-1.5"
        />
      )}

      {/* Standard Output Handle (Right) - Only if NOT Condition or Interactive */}
      {(!isCondition && !isInteractive) && (
        <Handle
          type="source"
          position={Position.Right}
          id="default" 
          className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white hover:!bg-blue-500 transition-colors -mr-1.5"
        />
      )}
    </div>
  );
};

export default memo(CustomNode);