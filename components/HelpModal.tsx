import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Image, 
  Mic, 
  FileInput, 
  Split, 
  Variable, 
  Code, 
  BrainCircuit, 
  Globe, 
  Database, 
  Headset, 
  List, 
  Zap, 
  Clock, 
  CornerUpLeft, 
  Webhook 
} from 'lucide-react';
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
    { id: NodeType.AI_GEMINI, label: 'Inteligência Artificial', icon: <BrainCircuit size={16} /> },
    { id: NodeType.CONDITION, label: 'Condicional (If/Else)', icon: <Split size={16} /> },
    { id: NodeType.JUMP, label: 'Ir Para (Jump)', icon: <CornerUpLeft size={16} /> },
    { id: NodeType.SET_VARIABLE, label: 'Definir Variável', icon: <Variable size={16} /> },
    { id: NodeType.DELAY, label: 'Aguardar (Delay)', icon: <Clock size={16} /> },
    { id: NodeType.API_REQUEST, label: 'API Externa', icon: <Globe size={16} /> },
    { id: NodeType.DATABASE_SAVE, label: 'Salvar Banco de Dados', icon: <Database size={16} /> },
    { id: NodeType.CODE, label: 'Javascript Code', icon: <Code size={16} /> },
    { id: NodeType.WEBHOOK, label: 'Webhook', icon: <Webhook size={16} /> },
    { id: NodeType.AGENT_HANDOFF, label: 'Transbordo Humano', icon: <Headset size={16} /> },
    { id: NodeType.IMAGE, label: 'Imagem', icon: <Image size={16} /> },
    { id: NodeType.AUDIO, label: 'Áudio', icon: <Mic size={16} /> },
  ];

  const renderContent = () => {
    switch (selectedTopic) {
      case 'intro':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Bem-vindo ao WhaleFlow</h3>
            <p className="text-gray-600">O WhaleFlow é um construtor de automação para WhatsApp. Você arrasta blocos, conecta-os e cria conversas inteligentes.</p>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
              <h4 className="font-bold text-blue-700 mb-2">Conceitos Básicos</h4>
              <ul className="list-disc pl-5 space-y-2 text-sm text-blue-800">
                <li><strong>Gatilho (Start):</strong> Define como o bot começa (qualquer mensagem ou palavra-chave).</li>
                <li><strong>Variáveis:</strong> Use <code className="bg-blue-200 px-1 rounded">{`{{nome_variavel}}`}</code> para inserir dados dinâmicos em mensagens.</li>
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
              <p className="text-sm text-gray-600">"Olá <strong>{`{{nome}}`}</strong>! Tudo bem?"</p>
            </div>
            <p className="text-xs text-gray-500">Dica: Use o botão "Magic Write" para gerar textos com IA.</p>
          </div>
        );

      case NodeType.INTERACTIVE:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><List className="text-violet-500"/> Botões e Listas</h3>
            <p className="text-gray-600">Envia opções clicáveis. O fluxo para e espera o usuário clicar em uma opção.</p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li><strong>Botões:</strong> Até 3 opções. Aparecem direto na tela.</li>
              <li><strong>Lista:</strong> Até 10 opções. Aparece um botão "Ver Opções" que abre um menu.</li>
            </ul>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800 mt-2">
              <strong>Importante:</strong> Cada opção criada gera uma saída (bolinha) específica no bloco. Conecte cada saída ao fluxo correspondente àquela escolha.
            </div>
          </div>
        );

      case NodeType.INPUT:
        return (
          <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileInput className="text-pink-500"/> Entrada de Dados</h3>
             <p className="text-gray-600">Faz uma pergunta e aguarda o usuário digitar qualquer texto.</p>
             
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
               <div>
                  <h4 className="font-bold text-gray-700 text-xs uppercase">Pergunta:</h4>
                  <p className="text-sm text-gray-600">"Qual é o seu nome?"</p>
               </div>
               <div>
                  <h4 className="font-bold text-gray-700 text-xs uppercase">Salvar em Variável:</h4>
                  <code className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">nome_cliente</code>
               </div>
             </div>
             <p className="text-sm text-gray-500">Depois, você pode usar <code className="text-xs bg-gray-200 px-1">{`{{nome_cliente}}`}</code> em outras mensagens.</p>
          </div>
        );

      case NodeType.AI_GEMINI:
        return (
           <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><BrainCircuit className="text-teal-500"/> Gemini AI</h3>
             <p className="text-gray-600">Envia um prompt para a IA do Google (Gemini 2.5 Flash) e salva a resposta em uma variável.</p>
             
             <div className="space-y-3">
               <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                 <strong className="text-teal-800 text-sm">Prompt (Entrada):</strong>
                 <p className="text-xs text-teal-700 mt-1">Aqui você define o que a IA deve fazer. Pode usar variáveis.</p>
                 <p className="text-xs italic mt-1 text-gray-500">Ex: "Analise o sentimento desta mensagem: {`{{resposta_cliente}}`}"</p>
               </div>

               <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                 <strong className="text-gray-700 text-sm">Instrução do Sistema:</strong>
                 <p className="text-xs text-gray-600 mt-1">Define a "personalidade" ou regras da IA.</p>
                 <p className="text-xs italic mt-1 text-gray-500">Ex: "Você é um atendente de pizzaria sarcástico."</p>
               </div>
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
                Body: {`{ "telefone": "{{phone}}" }`}
              </div>
            </div>

            <p className="text-sm text-gray-600">A resposta da API (JSON) será salva na <strong>Variável de Saída</strong>. Ex: se a API retornar <code className="text-xs bg-gray-200 px-1">{`{"saldo": 50}`}</code> e você salvar em <code className="text-xs bg-gray-200 px-1">api_res</code>, use <code className="text-xs bg-gray-200 px-1">{`{{api_res.saldo}}`}</code> depois.</p>
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
                <p className="text-xs text-green-600">Conecte aqui se a variável for <strong>IGUAL</strong> ao valor definido.</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <strong className="text-red-700 block mb-1">Caminho Falso</strong>
                <p className="text-xs text-red-600">Conecte aqui caso contrário.</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Exemplo: Se <code className="bg-gray-100 px-1 rounded">escolha_menu</code> for igual a "1", vai para cima. Se não, vai para baixo.</p>
          </div>
        );

      case NodeType.JUMP:
        return (
           <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><CornerUpLeft className="text-gray-700"/> Ir Para (Jump)</h3>
             <p className="text-gray-600">Redireciona o fluxo imediatamente para outro bloco existente.</p>
             <p className="text-sm text-gray-600">Útil para:</p>
             <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
               <li>Criar loops (ex: voltar ao Menu Principal se o usuário digitar algo errado).</li>
               <li>Reaproveitar partes do fluxo sem cruzar linhas por toda a tela.</li>
               <li>Conectar finais de diferentes ramos a um único ponto de encerramento.</li>
             </ul>
           </div>
        );

      case NodeType.SET_VARIABLE:
         return (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Variable className="text-yellow-600"/> Definir Variável</h3>
              <p className="text-gray-600">Cria ou atualiza o valor de uma variável manualmente sem pedir input ao usuário.</p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
                <p><strong>Nome:</strong> <code className="text-yellow-700">status_cliente</code></p>
                <p><strong>Valor:</strong> <code className="text-blue-600">novo_lead</code></p>
              </div>
              <p className="text-sm text-gray-500 mt-2">Você também pode copiar valores de outras variáveis usando <code className="text-xs bg-gray-100 px-1">{`{{outra_var}}`}</code> no campo valor.</p>
            </div>
         );

      case NodeType.DELAY:
        return (
           <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Clock className="text-gray-500"/> Aguardar (Delay)</h3>
             <p className="text-gray-600">Pausa o fluxo por um determinado tempo antes de prosseguir.</p>
             <p className="text-sm text-gray-600">Isso ajuda a tornar a conversa mais natural, evitando que o bot mande várias mensagens instantaneamente ("metralhadora de mensagens").</p>
           </div>
        );
      
      case NodeType.CODE:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Code className="text-slate-600"/> Javascript Code</h3>
            <p className="text-gray-600">Execute lógica complexa, cálculos ou manipulação de texto.</p>
            <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono">
              <p>// Variáveis atuais estão disponíveis em 'variables'</p>
              <p>const total = variables.preco * variables.quantidade;</p>
              <p>return {`{ ...variables, total_compra: total };`}</p>
            </div>
            <p className="text-xs text-gray-500">Você DEVE retornar um objeto com as novas variáveis para que elas sejam salvas.</p>
          </div>
        );

      case NodeType.DATABASE_SAVE:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Database className="text-emerald-500"/> Salvar no Banco</h3>
            <p className="text-gray-600">Salva todas as variáveis da sessão atual em um arquivo local no servidor.</p>
            <ul className="list-disc pl-5 text-sm text-gray-600">
               <li><strong>JSON:</strong> Salva em <code>/database/leads.jsonl</code></li>
               <li><strong>CSV:</strong> Salva em <code>/database/leads.csv</code> (Pode abrir no Excel).</li>
            </ul>
            <p className="text-xs text-gray-500">Útil para capturar Leads, inscrições e contatos.</p>
          </div>
        );

      case NodeType.WEBHOOK:
        return (
           <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Webhook className="text-indigo-500"/> Webhook</h3>
             <p className="text-gray-600">Registra um evento no log do sistema.</p>
             <p className="text-sm text-gray-600">Atualmente funciona como um marcador de eventos para debug. No futuro, poderá disparar eventos para outros sistemas sem esperar resposta (Fire-and-forget).</p>
           </div>
        );
      
      case NodeType.AGENT_HANDOFF:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Headset className="text-red-500"/> Transbordo Humano</h3>
            <p className="text-gray-600">Pausa o bot para este usuário específico.</p>
            <p className="text-sm text-gray-600">Ao chegar neste bloco, o bot envia a mensagem de despedida configurada e para de processar novas mensagens deste número, permitindo que um atendente humano assuma a conversa.</p>
          </div>
        );

      case NodeType.IMAGE:
        return (
           <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Image className="text-purple-500"/> Enviar Imagem</h3>
             <p className="text-gray-600">Envia uma imagem para o usuário.</p>
             <p className="text-sm text-gray-600">Você pode fazer upload de um arquivo do seu computador (será convertido para Base64) ou colar uma URL pública de imagem.</p>
           </div>
        );

      case NodeType.AUDIO:
        return (
           <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mic className="text-pink-600"/> Enviar Áudio</h3>
             <p className="text-gray-600">Envia um arquivo de áudio (como se fosse gravado na hora).</p>
             <p className="text-sm text-gray-600">Suporta arquivos MP3/OGG via upload ou URL. Ideal para mensagens de boas-vindas mais pessoais.</p>
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
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto custom-scrollbar">
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
           <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
             {renderContent()}
           </div>
           <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
             <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm">
               Fechar
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;