import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  ExternalLink,
  Loader2,
  Inbox as InboxIcon
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  platform: 'linkedin' | 'twitter' | 'upwork';
  profile_url: string;
  company: string;
  status: string;
  reason: string;
}

interface Message {
  id: string;
  lead_id: string;
  direction: 'sent' | 'received';
  content: string;
  created_at: string;
}

export const Inbox: React.FC = () => {
  const { session, profile } = useAuthStore();
  const { platform: globalPlatform } = useFilterStore();
  const { socket } = useSocketStore();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchLeads = async () => {
    if (!session) return;
    try {
      const p = globalPlatform !== 'all' ? `platform=${globalPlatform}&` : '';
      const url = `http://localhost:5000/api/leads?${p}status=interested`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
        if (data.length > 0 && !selectedLead) {
          setSelectedLead(data[0]);
        }
      } else {
        const mockData = getMockLeads();
        setLeads(mockData);
        if (!selectedLead) setSelectedLead(mockData[0]);
      }
    } catch (err) {
      const mockData = getMockLeads();
      setLeads(mockData);
      if (!selectedLead) setSelectedLead(mockData[0]);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [session, globalPlatform]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedLead || !session) return;
      setLoadingMessages(true);
      try {
        const res = await fetch(`http://localhost:5000/api/leads/${selectedLead.id}/messages`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        } else {
          setMessages(getMockMessages(selectedLead.id));
        }
      } catch (err) {
        setMessages(getMockMessages(selectedLead.id));
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedLead, session]);

  useEffect(() => {
    if (!socket || !selectedLead) return;
    const handleNewMessage = (newMsg: Message) => {
      if (newMsg.lead_id === selectedLead.id) {
        setMessages((prev) => [...prev, newMsg]);
      }
    };
    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, selectedLead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedLead || !session) return;

    setSending(true);
    const contentToSend = replyText;

    try {
      const res = await fetch(`http://localhost:5000/api/leads/${selectedLead.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: contentToSend }),
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => [...prev, sentMsg]);
        setReplyText('');
      } else {
        const mockNewMsg: Message = {
          id: `msg_mock_${Date.now()}`,
          lead_id: selectedLead.id,
          direction: 'sent',
          content: contentToSend,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, mockNewMsg]);
        setReplyText('');
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const getQuickReplies = () => {
    if (profile?.role === 'student') {
      return [
        "Thank you! I'd love to connect. Are you free for a 15-min call next week?",
        "I appreciate the response. Here is a link to view my work samples: http://localhost:3000/portfolio",
        "Thanks for reaching out! What specific skills or profiles are you sourcing for?",
      ];
    } else {
      return [
        "Thanks for your interest! Let's schedule a call to review your scope. How does Thursday look?",
        "Glad to connect! You can inspect my previous projects here: http://localhost:3000/portfolio",
        "Thanks! I am available to start next week. Let me know if you'd like to sign a retainer contract.",
      ];
    }
  };

  return (
    <div className="flex-1 bg-[#0B0F14] flex h-screen overflow-hidden text-white">
      
      {/* Left Panel: Conversations List */}
      <div className="w-80 border-r border-[#EACEAA]/10 bg-[#34150F]/20 flex flex-col shrink-0">
        <div className="p-6 border-b border-[#EACEAA]/10">
          <h3 className="font-extrabold text-base tracking-tight gold-header">Human Handoff</h3>
          <p className="text-xs text-slate-400 mt-1">Genuinely interested replies waiting for you.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingLeads ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#EACEAA]" />
              Loading handoffs...
            </div>
          ) : leads.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
              <InboxIcon className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Inbox is clear!</p>
              <p className="text-[10px] text-slate-500 mt-1">Leads with positive replies appear here.</p>
            </div>
          ) : (
            leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedLead?.id === lead.id
                    ? 'bg-[#EACEAA]/15 border-[#EACEAA]/40 text-white shadow-lg'
                    : 'bg-white/[0.01] border-white/5 hover:border-white/10 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs truncate pr-2">{lead.name}</h4>
                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 border ${
                    lead.platform === 'linkedin' ? 'bg-[#EACEAA]/10 text-[#EACEAA] border-[#EACEAA]/20' :
                    lead.platform === 'twitter' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {lead.platform}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 truncate">{lead.company}</p>
                <div className="mt-2 text-[9px] text-[#EACEAA] font-mono bg-[#EACEAA]/5 px-2 py-1 rounded border border-[#EACEAA]/10">
                  {lead.reason}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Active Conversation Thread */}
      <div className="flex-1 flex flex-col h-full bg-[#0B0F14] relative">
        <div className="absolute inset-0 hud-grid opacity-[0.1] pointer-events-none" />
        
        {selectedLead ? (
          <>
            {/* Thread Header */}
            <div className="p-6 border-b border-[#EACEAA]/10 flex justify-between items-center bg-[#34150F]/20 relative z-10">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <span>{selectedLead.name}</span>
                  <span className="text-xs font-mono font-normal text-slate-400">({selectedLead.company})</span>
                </h3>
                <p className="text-xs text-[#EACEAA] mt-0.5 font-mono">{selectedLead.reason}</p>
              </div>

              <a
                href={selectedLead.profile_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#EACEAA]/20 bg-[#EACEAA]/10 hover:bg-[#EACEAA] text-[#EACEAA] hover:text-[#0B0F14] text-xs font-bold transition-all"
              >
                <span>View Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#EACEAA]" />
                  Retrieving thread messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 text-xs my-8 font-mono">
                  No conversation history logged yet. Start the thread below.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.direction === 'sent' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.direction === 'sent'
                          ? 'bg-[#EACEAA] text-[#0B0F14] font-medium shadow-lg'
                          : 'bg-[#34150F]/40 border border-white/8 text-slate-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick Suggestions & Reply Input */}
            <div className="p-6 border-t border-[#EACEAA]/10 bg-[#34150F]/20 space-y-4 relative z-10">
              
              {/* AI Assistant Quick Reply Chips */}
              <div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Sparkles className="w-3 h-3 text-[#EACEAA]" />
                  <span>AI Copilot Smart Response Options</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getQuickReplies().map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setReplyText(suggestion)}
                      className="text-[10px] bg-white/[0.02] hover:bg-[#EACEAA]/10 text-slate-300 hover:text-[#EACEAA] border border-white/5 hover:border-[#EACEAA]/20 px-3 py-1.5 rounded-xl transition-all text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area & Submit */}
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message or select an AI suggestion above..."
                  className="flex-1 glass-input rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="btn-hud-primary px-6 rounded-xl text-xs flex items-center gap-2 font-black transition-all disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-400">Select a conversation thread</p>
          </div>
        )}
      </div>
    </div>
  );
};

function getMockLeads(): Lead[] {
  return [
    {
      id: 'lead_1',
      name: 'Sarah Jenkins',
      platform: 'linkedin',
      profile_url: 'https://linkedin.com/in/sarahjenkins',
      company: 'TechCorp Recruiter',
      status: 'interested',
      reason: 'Asked for technical project portfolio link',
    },
    {
      id: 'lead_2',
      name: 'Alex Rivera',
      platform: 'twitter',
      profile_url: 'https://x.com/alexrivera_dev',
      company: 'Founding Engineer @ StartupX',
      status: 'interested',
      reason: 'Replied asking for freelance availability',
    },
    {
      id: 'lead_3',
      name: 'David Chen',
      platform: 'upwork',
      profile_url: 'https://upwork.com/freelancer/davidchen',
      company: 'Agency Lead',
      status: 'interested',
      reason: 'Requested proposal quote for React Next.js contract',
    },
  ];
}

function getMockMessages(leadId: string): Message[] {
  return [
    {
      id: 'msg_1',
      lead_id: leadId,
      direction: 'sent',
      content: "Hi there! I noticed you are hiring for React and TypeScript developers. I'd love to contribute.",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'msg_2',
      lead_id: leadId,
      direction: 'received',
      content: "Hey! Thanks for reaching out. Your profile looks interesting. Do you have a portfolio link or past projects?",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}
