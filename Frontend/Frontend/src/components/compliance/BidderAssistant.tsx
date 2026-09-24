import React, { useCallback, useEffect, useRef, useState } from 'react';
import { complianceService } from '../../services/complianceService';
import type { AssistantMessage } from '../../types';
import { Send, Bot, User, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "What documents are required for this tender?",
  "Which documents am I missing?",
  "Why is my bid under review?",
  "What are the eligibility requirements?",
  "Is my certificate valid?",
  "What should I correct before submission?",
  "What are the financial requirements?",
  "What are the technical requirements?",
];

interface BidderAssistantProps {
  bidId: string;
}

export const BidderAssistant: React.FC<BidderAssistantProps> = ({ bidId }) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (question?: string) => {
    const text = (question || input).trim();
    if (!text || loading) return;

    setLoading(true);
    setError('');

    const userMessage: AssistantMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const response = await complianceService.assistantChat(bidId, text, [...messages, userMessage]);
      
      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        timestamp: new Date().toISOString(),
        groundingStatus: response.grounding_status
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to get response from AI assistant.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getGroundingBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'GROUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Grounded
          </span>
        );
      case 'INSUFFICIENT_EVIDENCE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="w-2.5 h-2.5" />
            Insufficient Evidence
          </span>
        );
      case 'GENERATION_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertCircle className="w-2.5 h-2.5" />
            Generation Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col h-full min-h-[500px] max-h-[700px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-900/10 border border-blue-900/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">Bidder AI Assistant</h3>
            <p className="text-3xs text-slate-500">Tender-aware • Evidence-grounded • Citation-backed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getGroundingBadge(messages.findLast(m => m.role === 'assistant')?.groundingStatus)}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">Dismiss</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Bot className="w-12 h-12 mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-700">How can I help with your tender?</p>
            <p className="text-xs text-slate-500 mt-1">Ask about requirements, missing documents, or compliance status.</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              message.role === 'user' 
                ? 'bg-blue-900 text-white' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${
                message.role === 'user'
                  ? 'bg-blue-900 text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-900 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.citations.map((citation, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-3xs font-medium text-slate-600 border border-slate-200"
                        title={`Type: ${citation.type}, ID: ${citation.id}${citation.page ? `, Page ${citation.page}` : ''}`}
                      >
                        <span className="font-mono">{citation.type === 'requirement' ? 'R' : citation.type === 'fact' ? 'F' : citation.type === 'compliance' ? 'C' : citation.type === 'preliminary' ? 'P' : citation.type === 'evidence' ? 'E' : citation.type === 'risk' ? 'Rk' : 'Cf'}</span>
                        <span>{citation.id}</span>
                        {citation.page && <span className="text-slate-400">p.{citation.page}</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-1 text-3xs text-slate-400">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {message.groundingStatus && (
                  <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-bold">
                    {message.groundingStatus === 'GROUNDED' && '✓ Grounded'}
                    {message.groundingStatus === 'INSUFFICIENT_EVIDENCE' && '⚠ Insufficient Evidence'}
                    {message.groundingStatus === 'GENERATION_FAILED' && '✗ Generation Failed'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (only when empty) */}
      {messages.length === 0 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-3xs font-bold uppercase text-slate-500 mb-2">Suggested questions</p>
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="text-left px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all text-left truncate"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask about requirements, missing docs, compliance status..."
            className="flex-1 min-h-[44px] max-h-[120px] px-4 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent resize-none disabled:bg-slate-100 disabled:text-slate-400"
            rows={1}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-1 text-3xs text-slate-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-3xs font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-3xs font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
};