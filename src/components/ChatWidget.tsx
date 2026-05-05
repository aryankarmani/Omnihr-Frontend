
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import api from '../utils/api';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    options?: { label: string; query: string }[];
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: "Hi! I'm your HR Assistant. How can I help you today?",
            sender: 'bot',
            options: [
                { label: 'My Leaves', query: 'pending leaves' },
                { label: 'Holidays', query: 'upcoming holidays' },
                { label: 'Salary Info', query: 'my salary info' },
                { label: 'Policy', query: 'leave policy' }
            ]
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (msgText?: string) => {
        const textToSend = msgText || input;
        if (!textToSend.trim()) return;

        const userMsg: Message = { id: Date.now(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const response = await api.post('/chat', { message: userMsg.text, userId: 1 });
            const data = response.data;
            const botMsg: Message = {
                id: Date.now() + 1,
                text: data.reply || "Sorry, I didn't get that.",
                sender: 'bot',
                options: data.options
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = { id: Date.now() + 1, text: "Service unavailable. Please try again later.", sender: 'bot' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white w-[400px] h-[600px] rounded-2xl shadow-2xl flex flex-col mb-4 border border-gray-200 overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
                        <h3 className="font-semibold flex items-center gap-2">
                            <MessageCircle size={20} /> HR Assistant
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-brand-700 p-1 rounded">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap shadow-sm ${msg.sender === 'user'
                                    ? 'bg-brand-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                                {/* Clickable Options in Chat Bubble */}
                                {msg.options && (
                                    <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
                                        {msg.options.map(opt => (
                                            <button
                                                key={opt.label}
                                                onClick={() => handleSend(opt.query)}
                                                className="text-xs bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors"
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-bl-none shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions at Layout Bottom (Optional, keeping them for persistence) */}
                    <div className="px-4 py-2 bg-gray-50 flex gap-2 overflow-x-auto no-scrollbar border-t border-gray-100">
                        {[
                            { label: 'My Leaves', query: 'pending leaves' },
                            { label: 'Holidays', query: 'upcoming holidays' },
                            { label: 'Salary', query: 'my salary info' },
                            { label: 'Policy', query: 'leave policy' }
                        ].map(action => (
                            <button
                                key={action.label}
                                onClick={() => handleSend(action.query)}
                                className="text-xs bg-white border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-50 whitespace-nowrap transition-colors shadow-sm"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>



                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                            placeholder="Ask about leaves..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            className="bg-brand-600 text-white p-2 rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center group"
                >
                    <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
                </button>
            )}
        </div>
    );
}
