import React, { useEffect, useState } from 'react';
import { FlowNode, NodeType, NodeOption } from '../types';
import { X, Sparkles, Save, Trash2, Globe, Zap, Plus, GripVertical } from 'lucide-react';
import { suggestMessageContent } from '../services/geminiService';

interface PropertiesPanelProps {
  node: FlowNode | null;
  onChange: (id: string, data: any) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onChange, onClose, onDelete }) => {
  const [localData, setLocalData] = useState<any>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (node) {
      setLocalData({ ...node.data });
    }
  }, [node]);

  if (!node) return null;

  const handleChange = (key: string, value: any) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    onChange(node.id, newData);
  };

  const handleMagicWrite = async () => {
    if (!localData.label) return;
    setIsGenerating(true);
    const suggestion = await suggestMessageContent(localData.label);
    if (suggestion) {
      handleChange('content', suggestion);
    }
    setIsGenerating(false);
  };

  // Interactive Options Handlers
  const addOption = () => {
    const currentOptions = localData.options || [];
    const newOption: NodeOption = { id: `opt-${Date.now()}`, label: 'Nova Opção' };
    handleChange('options', [...currentOptions, newOption]);
  };

  const removeOption = (id: string) => {
    const currentOptions = localData.options || [];
    handleChange('options', currentOptions.filter((o: NodeOption) => o.id !== id));
  };

  const updateOption = (id: string, label: string) => {
    const currentOptions = localData.options || [];
    const updated = currentOptions.map((o: NodeOption) => o.id === id ? { ...o, label } : o);
    handleChange('options', updated);
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] animate-in slide-in-from-right-10 duration-300 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          {node.type === NodeType.START && <Zap size={16} className="text-yellow-600"/>}
          {node.type === NodeType.API_REQUEST && <Globe size={16} className="text-cyan-600"/>}
          Editar {node.data.label}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
        
        {/* Common: Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nome do Bloco</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
            value={localData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </div>

        {/* Start / Trigger Node */}
        {node.type === NodeType.START && (
           <div className="space-y-4">
             <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gatilho (Como inicia?)</label>
              <select 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={localData.triggerType || 'all'}
                onChange={(e) => handleChange('triggerType', e.target.value)}
              >
                <option value="all">Qualquer Mensagem</option>
                <option value="keyword_exact">Palavra-chave Exata</option>
                <option value="keyword_contains">Contém Palavra-chave</option>
              </select>
             </div>

             {localData.triggerType !== 'all' && (
               <div className="space-y-1.5">
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Palavras-chave</label>
                 <input
                   type="text"
                   className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                   value={localData.triggerKeywords || ''}
                   onChange={(e) => handleChange('triggerKeywords', e.target.value)}
                   placeholder="Ex: oi, menu, comprar"
                 />
                 <p className="text-[10px] text-gray-400">Separe por vírgula para múltiplas opções.</p>
               </div>
             )}
           </div>
        )}

        {/* Message / Interactive Content */}
        {(node.type === NodeType.MESSAGE || node.type === NodeType.INPUT || node.type === NodeType.INTERACTIVE) && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagem de Texto</label>
              <button 
                onClick={handleMagicWrite}
                disabled={isGenerating}
                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
              >
                <Sparkles size={12} />
                {isGenerating ? 'Gerando...' : 'Magic Write'}
              </button>
            </div>
            <textarea
              rows={4}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm resize-none"
              value={localData.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Olá! Como posso ajudar?"
            />
          </div>
        )}

        {/* Interactive Specifics */}
        {node.type === NodeType.INTERACTIVE && (
          <div className="space-y-4">
             <div className="space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo de Interação</label>
               <select 
                 className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                 value={localData.interactiveType || 'button'}
                 onChange={(e) => handleChange('interactiveType', e.target.value)}
               >
                 <option value="button">Botões (Max 3)</option>
                 <option value="list">Lista de Opções (Max 10)</option>
               </select>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Opções</label>
               <div className="space-y-2">
                 {(localData.options || []).map((opt: NodeOption, idx: number) => (
                   <div key={opt.id} className="flex items-center gap-2">
                      <div className="p-1 text-gray-300 cursor-move"><GripVertical size={14} /></div>
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        value={opt.label}
                        onChange={(e) => updateOption(opt.id, e.target.value)}
                        placeholder={`Opção ${idx + 1}`}
                      />
                      <button onClick={() => removeOption(opt.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                   </div>
                 ))}
               </div>
               <button 
                 onClick={addOption}
                 className="w-full py-2 flex items-center justify-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 border-dashed transition-colors"
               >
                 <Plus size={14} /> Adicionar Opção
               </button>
             </div>

             <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salvar escolha em</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-mono text-sm">$</span>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-mono"
                  value={localData.variable || ''}
                  onChange={(e) => handleChange('variable', e.target.value)}
                  placeholder="opcao_escolhida"
                />
              </div>
            </div>
          </div>
        )}

        {node.type === NodeType.IMAGE && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">URL da Imagem</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              value={localData.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
        )}

        {node.type === NodeType.AUDIO && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">URL do Áudio (MP3/OGG)</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
              value={localData.content || ''}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="https://exemplo.com/audio.mp3"
            />
          </div>
        )}

        {node.type === NodeType.SET_VARIABLE && (
           <div className="space-y-4">
             <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nome da Variável</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">$</span>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono"
                    value={localData.variable || ''}
                    onChange={(e) => handleChange('variable', e.target.value)}
                    placeholder="score"
                  />
                </div>
             </div>
             <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Valor</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  value={localData.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  placeholder="100 ou {{outra_var}}"
                />
             </div>
           </div>
        )}

        {node.type === NodeType.CODE && (
           <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Javascript Code</label>
              <p className="text-[10px] text-gray-400 mb-1">Use <code>variables</code> object. Return new vars object.</p>
              <textarea
                rows={8}
                className="w-full px-3 py-2 bg-slate-900 text-green-400 border border-gray-700 rounded-lg text-xs font-mono resize-none"
                value={localData.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder={`// Exemplo:\nconst nome = variables.nome;\nreturn { ...variables, nome_upper: nome.toUpperCase() };`}
              />
           </div>
        )}

        {(node.type === NodeType.INPUT || node.type === NodeType.AI_GEMINI || node.type === NodeType.API_REQUEST) && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Salvar Resposta em Variável</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-mono text-sm">$</span>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-mono"
                value={localData.variable || ''}
                onChange={(e) => handleChange('variable', e.target.value)}
                placeholder="resultado_api"
              />
            </div>
            <p className="text-[10px] text-gray-400">Variável para usar depois (ex: @resultado_api)</p>
          </div>
        )}

        {node.type === NodeType.CONDITION && (
          <div className="space-y-3">
             <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verificar Variável</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono"
                value={localData.variable || ''}
                onChange={(e) => handleChange('variable', e.target.value)}
                placeholder="escolha_menu"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Se igual a</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={localData.conditionValue || ''}
                onChange={(e) => handleChange('conditionValue', e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        )}

        {node.type === NodeType.AI_GEMINI && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prompt do Usuário (Entrada)</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                value={localData.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Use {{variavel}} para inserir dados"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Instrução do Sistema</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none"
                value={localData.systemInstruction || ''}
                onChange={(e) => handleChange('systemInstruction', e.target.value)}
                placeholder="Ex: Você é um vendedor de carros experiente..."
              />
            </div>
          </div>
        )}

        {node.type === NodeType.API_REQUEST && (
          <div className="space-y-4">
             <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Método & URL</label>
              <div className="flex gap-2">
                <select 
                  className="w-24 px-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold"
                  value={localData.apiMethod || 'GET'}
                  onChange={(e) => handleChange('apiMethod', e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono"
                  value={localData.apiUrl || ''}
                  onChange={(e) => handleChange('apiUrl', e.target.value)}
                  placeholder="https://api.site.com/dados"
                />
              </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Headers (JSON)</label>
               <textarea
                 rows={3}
                 className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono resize-none"
                 value={localData.apiHeaders || ''}
                 onChange={(e) => handleChange('apiHeaders', e.target.value)}
                 placeholder='{"Authorization": "Bearer token"}'
               />
            </div>

            {localData.apiMethod !== 'GET' && (
              <div className="space-y-1.5">
                 <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Body (JSON)</label>
                 <textarea
                   rows={4}
                   className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono resize-none"
                   value={localData.apiBody || ''}
                   onChange={(e) => handleChange('apiBody', e.target.value)}
                   placeholder='{"nome": "{{nome_usuario}}"}'
                 />
              </div>
            )}
          </div>
        )}
        
        {node.type === NodeType.AGENT_HANDOFF && (
           <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mensagem de despedida do Bot</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none"
                value={localData.content || ''}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Aguarde um momento, um humano irá atendê-lo."
              />
           </div>
        )}

        {node.type === NodeType.DATABASE_SAVE && (
          <div className="space-y-1.5">
             <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Formato</label>
             <select 
               className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
               value={localData.dbType || 'json'}
               onChange={(e) => handleChange('dbType', e.target.value)}
             >
               <option value="json">JSON (Local)</option>
               <option value="csv">CSV (Planilha)</option>
             </select>
             <p className="text-[10px] text-gray-400">Salva todas as variáveis atuais no arquivo.</p>
          </div>
        )}

        {node.type === NodeType.DELAY && (
          <div className="space-y-1.5">
             <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tempo (segundos)</label>
             <input
               type="number"
               className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
               value={localData.duration || 1}
               onChange={(e) => handleChange('duration', parseInt(e.target.value))}
             />
          </div>
        )}

      </div>

      <div className="p-4 border-t border-gray-100 flex gap-2">
        {node.type !== NodeType.START && (
          <button 
            onClick={() => onDelete(node.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} /> Excluir
          </button>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;