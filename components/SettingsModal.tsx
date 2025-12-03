import React, { useState, useEffect } from 'react';
import { X, Save, BrainCircuit, QrCode, RefreshCw, CheckCircle, LogOut, Smartphone } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  onSave: (config: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [geminiKey, setGeminiKey] = useState('');
  
  const [connectionStatus, setConnectionStatus] = useState<'open' | 'close' | 'connecting'>('close');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    if (config?.geminiApiKey) {
      setGeminiKey(config.geminiApiKey);
    }
  }, [config, isOpen]);

  // Polling para checar status e pegar QR Code
  useEffect(() => {
    let interval: any;
    if (isOpen) {
      checkStatus();
      interval = setInterval(checkStatus, 2000); // Check every 2s for updates
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ ...config, geminiApiKey: geminiKey });
    onClose();
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      
      setConnectionStatus(data.status);
      setQrCodeData(data.qrCode);
    } catch (e) {
      console.error("Erro check status", e);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Desconectar WhatsApp?')) return;
    try {
       await fetch('/api/whatsapp/logout', { method: 'POST' });
       setConnectionStatus('close');
       setQrCodeData(null);
    } catch (e) {
      alert('Erro ao desconectar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl w-[500px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Conexões</h2>
            <p className="text-xs text-gray-500">WhatsApp & IA</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* WhatsApp Connection */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                 <QrCode size={16} className="text-green-600"/>
                 WhatsApp
               </h3>
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${connectionStatus === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                 {connectionStatus === 'open' ? 'Online' : 'Offline'}
               </span>
             </div>

             <div className="flex flex-col items-center justify-center min-h-[180px] bg-gray-50 rounded-lg border border-gray-100 p-4">
                {connectionStatus === 'open' ? (
                  <div className="text-center space-y-3 animate-in zoom-in">
                    <CheckCircle size={48} className="text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-green-700">Conectado!</p>
                    <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto mt-2">
                      <LogOut size={12}/> Desconectar
                    </button>
                  </div>
                ) : qrCodeData ? (
                  <div className="text-center space-y-2">
                    <p className="text-xs text-gray-500 mb-2">Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar</p>
                    <img src={qrCodeData} alt="QR Code" className="w-48 h-48 mx-auto border-4 border-white shadow-sm rounded-lg" />
                    <p className="text-[10px] text-gray-400">Aguardando leitura...</p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Smartphone size={32} className="text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-400">Iniciando motor WhatsApp...</p>
                    <RefreshCw size={16} className="mx-auto text-blue-500 animate-spin" />
                  </div>
                )}
             </div>
          </div>

          {/* Gemini API */}
           <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <BrainCircuit size={14} /> Gemini AI
            </h3>
            <input 
              type="password" 
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
              placeholder="Cole sua API Key do Google AI Studio"
            />
            <p className="text-[10px] text-gray-400">Necessário para usar os recursos de IA e Magic Write.</p>
           </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
            <Save size={16} className="inline mr-2"/> Salvar
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;