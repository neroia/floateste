import React, { useState } from 'react';
import { X, MessageSquare, Image, Mic, FileInput, Split, Variable, Code, BrainCircuit, Globe, Database, Headset, List, Zap, Clock, ChevronRight } from 'lucide-react';
import { NodeType } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [selectedTopic, setSelectedTopic] = useState<NodeType | 'intro'>('intro');

  if (!isOpen) return null;

  const topics = [
    { id: 'intro', label: 'Introdução', icon: <Zap size={16} /> },
    { id: NodeType.MESSAGE, label: 'Mensagem', icon: <MessageSquare size={16} /> },
    { id: NodeType.INTERACTIVE, label: 'Botões e Listas', icon: <List size={16} /> },
    { id: NodeType.INPUT, label: 'Entrada de Dados', icon: <FileInput size={16} /> },
    { id: NodeType.CONDITION, label: 'Condicional (If/Else)', icon: <Split size={16} /> },
    { id: NodeType.API_REQUEST, label: 'API Externa', icon: <Globe size={16} /> },
    { id: NodeType.AI_GEMINI, label: 'Inteligência Artificial', icon: <BrainCircuit size={16} /> },
    { id: NodeType.SET_VARIABLE, label: 'Definir Variável', icon: <Variable size={16} /> },
    { id: NodeType.CODE, label: 'Javascript Code', icon: <Code size={16} /> },
    { id: NodeType.IMAGE, label: 'Imagem', icon: <Image size={16} /> },
    { id: NodeType.AUDIO, label: 'Áudio', icon: <Mic size={16} /> },
  ];

  const renderContent = () => {
    switch (selectedTopic) {
      case 'intro':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Bem-vindo ao Flow</h3>
            <p className="text-gray-600">O Flow é um construtor de automação para WhatsApp. Você arrasta blocos, conecta-os e cria conversas inteligentes.</p>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
              <h4 className="font-bold text-blue-700 mb-2">Conceitos Básicos</h4>
              <ul className="list-disc pl-5 space-y-2 text-sm text-blue-800">
                <li><strong>Gatilho (Start):</strong> Define como o bot começa (qualquer mensagem ou palavra-chave).</li>
                <li><strong>Variáveis:</strong> Use <code className="bg-blue-200 px-1 rounded">{'{{nome_variavel}}'}</code> para inserir dados dinâmicos em mensagens.</li>
                <li><strong>Conexões:</strong> Ligue a "bolinha" direita de um bloco à esquerda do próximo para definir a ordem.</li>
              </ul>
            </div>
          </div>
        );

      case NodeType.MESSAGE:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><MessageSquare className="text-blue-500"/> Bloco de Mensagem</h3>
            <p className="text-gray-600">Envia um texto simples para o usuário.</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-bold text-gray-700 text-sm mb-2">Exemplo de uso:</h4>
              <p className="text-sm text-gray-600">"Olá <strong>{'{{nome}}'}</strong>! Tudo bem?"</p>
            </div>
            <p className="text-xs text-gray-500">Dica: Use o botão "Magic Write" para gerar textos com IA.</p>
          </div>
        );

      case NodeType.INTERACTIVE:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><List className="text-violet-500"/> Botões e Listas</h3>
            <p className="text-gray-600">Envia opções clicáveis. O fluxo para e espera o usuário clicar.</p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li><strong>Botões:</strong> Até 3 opções. Aparecem direto na tela.</li>
              <li><strong>Lista:</strong> Até 10 opções. Aparece um botão "Ver Opções" que abre um menu.</li>
            </ul>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800">
              <strong>Atenção:</strong> Cada opção tem uma saída (bolinha) específica. Conecte cada uma ao seu respectivo destino.
            </div>
          </div>
        );

      case NodeType.API_REQUEST:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Globe className="text-cyan-500"/> API Externa</h3>
            <p className="text-gray-600">Faz uma requisição HTTP para um servidor externo para buscar ou enviar dados.</p>
            
            <div className="space-y-2">
              <h4 className="font-bold text-gray-700 text-sm">Configuração:</h4>
              <div className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                Method: POST<br/>
                URL: https://api.meusistema.com/clientes<br/>
                Body: {'{ "telefone": "{{phone}}" }'}
              </div>
            </div>

            <p className="text-sm text-gray-600">A resposta da API (JSON) será salva na <strong>Variável de Saída</strong> que você definir. Ex: se a API retornar <code className="text-xs bg-gray-200 px-1">{'{"saldo": 50}'}</code> e você salvar em <code className="text-xs bg-gray-200 px-1">api_res</code>, use <code className="text-xs bg-gray-200 px-1">{'{{api_res.saldo}}'}</code> depois.</p>
          </div>
        );

      case NodeType.CONDITION:
        return (
           <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Split className="text-orange-500"/> Condicional</h3>
            <p className="text-gray-600">Desvia o fluxo baseando-se no valor de uma variável.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <strong className="text-green-700 block mb-1">Caminho Verdadeiro</strong>
                <p className="text-xs text-green-600">Conecte aqui o que acontece se a condição for atingida.</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <strong className="text-red-700 block mb-1">Caminho Falso</strong>
                <p className="text-xs text-red-600">Conecte aqui o que acontece caso contrário.</p>
              </div>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500">Selecione um tópico ao lado para ver os detalhes.</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center animate-in fade-in">
      <div className="bg-white w-[800px] h-[600px] rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="font-bold text-gray-800 mb-4 px-2">Ajuda & Documentação</h2>
          <div className="space-y-1">
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedTopic === topic.id ? 'bg-white text-blue-600 shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {topic.icon}
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
           <div className="flex-1 p-8 overflow-y-auto">
             {renderContent()}
           </div>
           <div className="p-4 border-t border-gray-100 flex justify-end">
             <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
               Fechar
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;