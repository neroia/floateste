import React, { useState, useEffect } from 'react';
import { X, Save, BrainCircuit, QrCode, RefreshCw, CheckCircle, LogOut, Smartphone, AlertTriangle, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: any;
  onSave: (config: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [geminiKey, setGeminiKey] = useState('');
  
  const [connectionStatus, setConnectionStatus] = useState<string>('close');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

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
      interval = setInterval(checkStatus, 2000); 
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
      const text = await res.text();

      if (!res.ok) {
        console.warn("Status Endpoint Error:", text);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn("Invalid JSON received:", text);
        return;
      }
      
      setConnectionStatus(data.status);
      setStatusMessage(data.message || '');
      setQrCodeData(data.qrCode);
      
      if (data.status !== 'close' && data.status !== 'error_start' && data.status !== 'timeout' && data.status !== 'error_dependency') {
          setIsRestarting(false);
      }
    } catch (e) {
      console.error("Connection check failed:", e);
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

  const handleForceRestart = async () => {
      setIsRestarting(true);
      try {
        await fetch('/api/whatsapp/restart', { method: 'POST' });
        setConnectionStatus('initializing_browser');
        setStatusMessage('Solicitando reinício...');
      } catch (e) {
        alert("Erro ao reiniciar serviço.");
        setIsRestarting(false);
      }
  };

  const getStatusDisplay = () => {
      switch(connectionStatus) {
          case 'open': return { text: 'Conectado', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle size={48} className="text-green-500 mx-auto" /> };
          case 'qr_pending': return { text: 'Aguardando Leitura', color: 'text-blue-600', bg: 'bg-blue-100', icon: null };
          case 'initializing_browser': return { text: 'Iniciando Motor...', color: 'text-orange-600', bg: 'bg-orange-100', icon: <Loader2 size={32} className="text-orange-500 mx-auto animate-spin" /> };
          case 'timeout': return { text: 'Tempo limite excedido', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertTriangle size={32} className="text-red-500 mx-auto" /> };
          case 'error_dependency': return { text: 'Erro de Dependência (Nativo)', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertTriangle size={32} className="text-red-500 mx-auto" /> };
          case 'error_start': return { text: 'Falha ao Iniciar', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertTriangle size={32} className="text-red-500 mx-auto" /> };
          default: return { text: 'Desconectado', color: 'text-gray-500', bg: 'bg-gray-100', icon: <Smartphone size={32} className="text-gray-300 mx-auto" /> };
      }
  };

  const statusInfo = getStatusDisplay();

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

             <div className="flex flex-col items-center justify-center min-h-[220px] bg-gray-50 rounded-lg border border-gray-100 p-4 relative">
                
                {connectionStatus === 'open' ? (
                  <div className="text-center space-y-3 animate-in zoom-in">
                    {statusInfo.icon}
                    <p className="text-sm font-medium text-green-700">Conectado com sucesso!</p>
                    <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto mt-2 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors">
                      <LogOut size={12}/> Desconectar
                    </button>
                  </div>
                ) : qrCodeData ? (
                  <div className="text-center space-y-2 animate-in fade-in">
                    <p className="text-xs text-gray-500 mb-2">Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar</p>
                    <img src={qrCodeData} alt="QR Code" className="w-48 h-48 mx-auto border-4 border-white shadow-sm rounded-lg" />
                    <div className="flex justify-center gap-2">
                         <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full animate-pulse">Aguardando leitura...</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    {statusInfo.icon}
                    <p className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</p>
                    
                    {/* Status Message Detalhado */}
                    <div className="bg-gray-100 rounded px-2 py-1 mt-2 inline-block max-w-full">
                         <p className="text-[10px] text-gray-500 font-mono break-all line-clamp-4">
                             {statusMessage || 'Aguardando...'}
                         </p>
                    </div>
                    
                    {connectionStatus === 'error_dependency' && (
                        <p className="text-[10px] text-red-400 mt-2 max-w-[240px] mx-auto">
                            Tente instalar o <strong>Visual C++ Redistributable</strong> no Windows ou recompile o app usando o script <code>npm run dist:win:linux</code>.
                        </p>
                    )}

                    {connectionStatus === 'initializing_browser' && (
                        <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto leading-tight mt-2">
                            Isso pode demorar um pouco na primeira vez enquanto baixamos o navegador.
                        </p>
                    )}

                    {/* Botão de Reinício Forçado disponível em mais estados de erro/timeout */}
                    {(connectionStatus === 'error_start' || connectionStatus === 'error_dependency' || connectionStatus === 'close' || connectionStatus === 'timeout' || connectionStatus === 'initializing_browser') && (
                        <button 
                            onClick={handleForceRestart} 
                            disabled={isRestarting}
                            className="mt-4 text-xs flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 mx-auto shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isRestarting ? 'animate-spin' : ''}/> 
                            {isRestarting ? 'Reiniciando...' : 'Reiniciar Serviço'}
                        </button>
                    )}
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