import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api } from './api';
import './App.css';

const PASSWORD = 'Mohamed@1279';

function Login({ onLogin }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (input === PASSWORD) {
      sessionStorage.setItem('auth', '1');
      onLogin();
    } else {
      setError('Mot de passe incorrect.');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0c0d10', flexDirection: 'column', gap: 16
    }}>
      <h2 style={{ color: '#fff', fontWeight: 300, letterSpacing: '-0.02em' }}>LLM Council</h2>
      <input
        type="password"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="Mot de passe"
        style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 14,
          width: 280, outline: 'none'
        }}
      />
      {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
      <button
        onClick={handleSubmit}
        style={{
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          border: 'none', borderRadius: 8, padding: '11px 32px',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: 280
        }}
      >
        Entrer
      </button>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(!!sessionStorage.getItem('auth'));
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (auth) loadConversations();
  }, [auth]);

  useEffect(() => {
    if (currentConversationId) loadConversation(currentConversationId);
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([{ id: newConv.id, created_at: newConv.created_at, message_count: 0 }, ...conversations]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => setCurrentConversationId(id);

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;
    setIsLoading(true);
    try {
      const userMessage = { role: 'user', content };
      setCurrentConversation(prev => ({ ...prev, messages: [...prev.messages, userMessage] }));
      const assistantMessage = { role: 'assistant', stage1: null, stage2: null, stage3: null, metadata: null, loading: { stage1: false, stage2: false, stage3: false } };
      setCurrentConversation(prev => ({ ...prev, messages: [...prev.messages, assistantMessage] }));
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start': setCurrentConversation(prev => { const messages = [...prev.messages]; messages[messages.length-1].loading.stage1 = true; return { ...prev, messages }; }); break;
          case 'stage1_complete': setCurrentConversation(prev => { const messages = [...prev.messages]; messages[messages.length-1].stage1 = event.data; messages[messages.length-1].loading.stage1 = false; return { ...prev, messages }; }); break;
          case 'stage2_start': setCurrentConversation(prev => { const messages = [...prev.messages]; messages[messages.length-1].loading.stage2 = true; return { ...prev, messages }; }); break;
          case 'stage2_complete': setCurrentConversation(prev => { const messages = [...prev.messages]; messages[messages.length-1].stage2 = event.data; messages[messages.length-1].metadata = event.metadata; messages[messages.length-1].loading.stage2 = false; return { ...prev, messages }; }); break;
          case 'stage3_start': setCurrentConversation(prev => { const messages = [...prev.messages]; messages[messages.length-1].loading.stage3 = true; return { ...prev, messages }; }); break;
          case 'stage3_complete': setCurrentConversation(prev => { const messages = [...prev.messages]; messages[messages.length-1].stage3 = event.data; messages[messages.length-1].loading.stage3 = false; return { ...prev, messages }; }); break;
          case 'title_complete': loadConversations(); break;
          case 'complete': loadConversations(); setIsLoading(false); break;
          case 'error': console.error('Stream error:', event.message); setIsLoading(false); break;
          default: console.log('Unknown event:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setCurrentConversation(prev => ({ ...prev, messages: prev.messages.slice(0, -2) }));
      setIsLoading(false);
    }
  };

  if (!auth) return <Login onLogin={() => setAuth(true)} />;

  return (
    <div className="app">
      <Sidebar conversations={conversations} currentConversationId={currentConversationId} onSelectConversation={handleSelectConversation} onNewConversation={handleNewConversation} />
      <ChatInterface conversation={currentConversation} onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}

export default App;