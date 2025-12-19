import React, { useEffect, useState } from 'react';
import { Activity, ArrowLeft, Power, Smartphone, ShieldCheck, Wifi, Clock, Server, Terminal, Users, MessageSquare, FolderOpen } from 'lucide-react';

interface DashboardProps {
  onBack: () => void;
  onStop: () => void;
  isRunning: boolean;
}

interface SystemStats {
  startTime: number | null;
  messagesProcessed: number;
  activeSessions: number;
  logs: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ onBack, onStop, isRunning }) => {
  const [waStatus, setWaStatus] = useState<string>('checking');
  const [uptimeStr, setUptimeStr] = useState('--:--:--');
  const [stats, setStats] = useState<SystemStats>({
    startTime: null,
    messagesProcessed: 0,
    activeSessions: 0,
    logs: []
  });

  // Fetch real data from server
  useEffect(() => {
    const fetchData = async () => {
      try {
        // WhatsApp Status
        const statusRes = await fetch('/api/whatsapp/status');
        const statusData = await statusRes.json();
        setWaStatus(statusData.status);

        // System Stats
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

      } catch (e) {
        setWaStatus('error');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000); // Polling every 2s

    return () => clearInterval(interval);
  }, []);

  // Calculate Uptime locally based on server startTime
  useEffect(() => {
    const updateTime = () => {
      if (!stats.startTime || !isRunning) {
        setUptimeStr('--:--:--');
        return;
      }
      const now = Date.now();
      const diff = Math.floor((now - stats.startTime) / 1000);
      
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptimeStr(`${h}:${m}:${s}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [stats.startTime, isRunning]);

  const handleOpenFolder = async () => {
      try {
          await fetch('/api/open-folder', { method: 'POST' });
      } catch(e) {
          alert("Não foi possível abrir a pasta.");
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 z-0" />

      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 text-white">
           <div>
             <h1 className="text-2xl font-bold flex items-center gap-2">
               <Activity className="text-green-400" /> Monitoramento em Tempo Real
             </h1>
             <p className="text-slate-400 text-sm">Painel de controle WhaleFlow</p>
           </div>
           <button 
             onClick={onBack}
             className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
           >
             <ArrowLeft size={16} /> Voltar ao Editor
           </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
           {/* WhatsApp Status */}
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                 <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <Smartphone size={20} />
                 </div>
                 <div className={`w-3 h-3 rounded-full ${waStatus === 'open' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              </div>
              <div>
                 <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Conexão</p>
                 <h3 className="text-xl font-bold text-slate-800">
                    {waStatus === 'open' ? 'Conectado' : 'Offline'}
                 </h3>
              </div>
           </div>

           {/* Uptime */}
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Clock size={20} />
                 </div>
              </div>
              <div>
                 <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Tempo Ativo</p>
                 <h3 className="text-xl font-bold text-slate-800 font-mono tracking-tight">
                    {uptimeStr}
                 </h3>
              </div>
           </div>

           {/* Active Sessions */}
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Users size={20} />
                 </div>
              </div>
              <div>
                 <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Sessões Ativas</p>
                 <h3 className="text-xl font-bold text-slate-800">
                    {stats.activeSessions}
                 </h3>
              </div>
           </div>

           {/* Processed Messages */}
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                 <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <MessageSquare size={20} />
                 </div>
              </div>
              <div>
                 <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Msgs Processadas</p>
                 <h3 className="text-xl font-bold text-slate-800">
                    {stats.messagesProcessed}
                 </h3>
              </div>
           </div>
        </div>

        {/* Central Status (Full Width) */}
        <div className="flex-1 flex flex-col justify-center items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center min-h-[300px]">
            {isRunning ? (
              <div className="animate-in fade-in zoom-in duration-300 max-w-md w-full">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-green-100 rounded-full animate-ping opacity-20" />
                      <Wifi size={40} className="text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Sistema Operacional</h2>
                  <p className="text-slate-500 text-base mb-8">
                    O bot está processando mensagens em tempo real.
                  </p>
                  
                  <div className="flex justify-center gap-3 mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-slate-600 text-sm">
                        <ShieldCheck size={16} className="text-blue-500" />
                        <span>Modo Seguro</span>
                    </div>
                    
                    <button onClick={handleOpenFolder} className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 rounded-full border border-yellow-100 text-yellow-700 text-sm transition-colors">
                        <FolderOpen size={16} />
                        <span>Abrir Dados (CSV/JSON)</span>
                    </button>
                   </div>

                   <button 
                    onClick={onStop}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-all active:scale-95 text-base"
                    >
                    <Power size={20} /> Parar Servidor
                    </button>
              </div>
            ) : (
              <div className="opacity-60 max-w-md w-full">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Power size={40} className="text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Sistema Parado</h2>
                  <p className="text-slate-500 text-base mb-6">Inicie o bot para começar a automação.</p>
                  
                  <button onClick={handleOpenFolder} className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-gray-600 text-sm transition-colors">
                        <FolderOpen size={16} />
                        <span>Ver Arquivos Salvos</span>
                  </button>
              </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;