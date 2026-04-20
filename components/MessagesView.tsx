import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Trash2, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { AppMessage } from '../types';
import { db } from '../databaseService';
import { auth } from '../firebaseConfig';

interface MessagesViewProps {
    onClose: () => void;
    messages: AppMessage[];
    onSendMessage: (content: string) => void;
    onDeleteMessage: (id: string) => void;
}

const MessagesView: React.FC<MessagesViewProps> = ({ onClose, messages, onSendMessage, onDeleteMessage }) => {
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentUser = auth.currentUser;
    const isAdmin = currentUser?.email === 'selahattin50@gmail.com';

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!content.trim()) return;
        setIsSending(true);
        await onSendMessage(content.trim());
        setContent('');
        setIsSending(false);
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + ' ' +
                date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-0 pb-32 flex flex-col h-screen">
            <div className="sticky top-0 z-[200] -mx-4 px-4 py-4 mb-2 bg-[#030712] backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="bg-white/5 p-3 rounded-xl active:scale-90 transition-all border border-white/5 hover:bg-white/10"
                >
                    <ArrowLeft size={22} className="text-zinc-400" />
                </button>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center">
                    <Mail size={16} className="mr-2" />
                    MESAJ PANOSU
                </h3>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-4 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Mail size={48} className="mb-4 text-emerald-500" />
                        <p className="text-xs font-bold uppercase tracking-widest text-white/50">Henüz Mesaj Yok</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMe = msg.senderEmail === currentUser?.email;

                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}
                            >
                                <div className="flex items-center space-x-2 mb-1 px-1">
                                    <span className="text-[10px] font-bold text-white/50">
                                        {msg.senderName || msg.senderEmail}
                                    </span>
                                    {msg.senderEmail === 'selahattin50@gmail.com' && (
                                        <ShieldCheck size={12} className="text-emerald-400" />
                                    )}
                                </div>

                                <div className={`relative max-w-[85%] rounded-2xl p-4 ${isMe ? 'bg-emerald-600/20 border border-emerald-500/30 text-white rounded-tr-sm' : 'bg-white/10 border border-white/10 text-white rounded-tl-sm'}`}>
                                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap word-break break-words">
                                        {msg.content}
                                    </p>

                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                                        <span className="text-[9px] font-bold text-white/40 tracking-wider">
                                            {formatDate(msg.createdAt)}
                                        </span>

                                        {isAdmin && (
                                            <button
                                                onClick={() => onDeleteMessage(msg.id)}
                                                className="text-red-400 hover:text-red-300 active:scale-90 p-1 rounded transition-all ml-4"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="sticky bottom-0 left-0 right-0 max-w-md mx-auto p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-[#030712]/90 backdrop-blur-xl border-t border-white/5 z-[150]">
                <div className="flex items-end space-x-2 bg-white/5 rounded-3xl p-2 border border-white/10 focus-within:border-emerald-500/50 transition-all">
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 resize-none p-3 max-h-32 min-h-[44px] outline-none"
                        rows={1}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        disabled={!content.trim() || isSending}
                        onClick={handleSend}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-2xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-90 shadow-lg shadow-emerald-600/20 mb-1"
                    >
                        {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessagesView;
