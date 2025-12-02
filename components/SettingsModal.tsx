import React, { useState, useEffect } from 'react';
import { X, Save, Server, Key, Smartphone, Wifi, BrainCircuit } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  onSave: (config: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState({
    instanceName: '',
    baseUrl: 'http://localhost:8080',
    apiKey: '',
    geminiApiKey: '', // New field
    webhookUrl: 'http://localhost:3000/webhook',
    phoneNumber: ''
  });

  useEffect(() => {
    if (config) {
      setLocalConfig(prev => ({ ...prev, ...config }));
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl w-[500px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Configurações do Sistema</h2>
            <p className="text-xs text-gray-500">Conexão com API Oficial/Local do WhatsApp</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* WhatsApp API Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Server size={14} /> Servidor WhatsApp
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">URL da Instância (API)</label>
                <input 
                  type="text" 
                  value={localConfig.baseUrl}
                  onChange={(e) => handleChange('baseUrl', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="http://localhost:8080"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Chave da API (WhatsApp Token)</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input 
                    type="password" 
                    value={localConfig.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Ex: secret_key_123"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Gemini API Section */}
           <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BrainCircuit size={14} /> Inteligência Artificial (Gemini)
            </h3>
            
            <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Gemini API Key</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input 
                    type="password" 
                    value={localConfig.geminiApiKey}
                    onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="Ex: AIzaSy..."
                  />
                </div>
                <p className="text-[10px] text-gray-500">Necessário para Magic Write e respostas de IA.</p>
            </div>
           </div>

          <hr className="border-gray-100" />

          {/* Bot Config Section */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Smartphone size={14} /> Dados do Bot
            </h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Nome da Sessão</label>
                  <input 
                    type="text" 
                    value={localConfig.instanceName}
                    onChange={(e) => handleChange('instanceName', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                    placeholder="flow_bot_01"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Webhook URL</label>
                  <input 
                    type="text" 
                    value={localConfig.webhookUrl}
                    onChange={(e) => handleChange('webhookUrl', e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
                    placeholder="/webhook"
                  />
                </div>
             </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
             <Wifi size={18} className="text-blue-600 mt-0.5" />
             <div>
                <h4 className="text-xs font-bold text-blue-800">Modo Local (Electron)</h4>
                <p className="text-[11px] text-blue-600 leading-relaxed">
                  As chaves são salvas apenas no seu computador. Ao iniciar o bot, um servidor local Node.js será utilizado.
                </p>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Save size={16} /> Salvar Configuração
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;