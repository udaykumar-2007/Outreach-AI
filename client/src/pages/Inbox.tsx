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

  // Fetch interested leads (Human hand-off list)
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
      } else {
        // Fallback mock leads
        setLeads(getMockInterestedLeads(globalPlatform));
      }
    } catch (e) {
      setLeads(getMockInterestedLeads(globalPlatform));
    } finally {
      setLoadingLeads(false);
    }
  };

  // Fetch messages for active lead
  const fetchMessages = async (leadId: string) => {
    if (!session) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`http://localhost:5000/api/leads/${leadId}/messages`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        setMessages(getMockMessages(leadId));
      }
    } catch (e) {
      setMessages(getMockMessages(leadId));
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [session, globalPlatform]);

  useEffect(() => {
    if (selectedLead) {
      fetchMessages(selectedLead.id);
    }
  }, [selectedLead]);

  // Listen for real-time messages coming from WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on('MESSAGE_RECEIVED', (data: { message: Message; leadId: string }) => {
      if (selectedLead && data.leadId === selectedLead.id) {
        setMessages(prev => [...prev, data.message]);
      }
      fetchLeads(); // Refresh list to update badge/last message
    });

    socket.on('MESSAGE_SENT', (data: { message: Message; leadId: string }) => {
      if (selectedLead && data.leadId === selectedLead.id) {
        // Avoid duplicate message inserts
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => {
      socket.off('MESSAGE_RECEIVED');
      socket.off('MESSAGE_SENT');
    };
  }, [socket, selectedLead]);

  // Send message handler
  const handleSend = async (contentToSend: string) => {
    if (!selectedLead || !contentToSend.trim() || !session) return;

    setSending(true);
    try {
      const response = await fetch(`http://localhost:5000/api/leads/${selectedLead.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: contentToSend }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
        setReplyText('');
      } else {
        // Sandbox mock send fallback
        const mockNewMsg: Message = {
          id: Math.random().toString(),
          lead_id: selectedLead.id,
          direction: 'sent',
          content: contentToSend,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, mockNewMsg]);
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
    <div className="flex-1 bg-slate-950 flex h-screen overflow-hidden">
      
      {/* Left Panel: Conversations List */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h3 className="font-extrabold text-lg text-white">Human Handoff</h3>
          <p className="text-xs text-slate-400 mt-1">Genuinely interested replies waiting for you.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadingLeads ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading handoffs...
            </div>
          ) : leads.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
              <InboxIcon className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold">Inbox is clear!</p>
              <p className="text-xs text-slate-500 mt-1">Leads with positive replies appear here.</p>
            </div>
          ) : (
            leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedLead?.id === lead.id
                    ? 'bg-indigo-600/10 border-indigo-500 text-white'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm truncate pr-2">{lead.name}</h4>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 border ${
                    lead.platform === 'linkedin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    lead.platform === 'twitter' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {lead.platform}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-1">{lead.company}</p>
                <p className="text-[10px] text-indigo-400 italic truncate mt-2">{lead.reason}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Chat Thread */}
      <div className="flex-1 flex flex-col bg-slate-950/20 justify-between h-full">
        {selectedLead ? (
          <>
            {/* Active Chat Header */}
            <div className="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 bg-slate-950/40">
              <div>
                <h3 className="font-extrabold text-white text-base">{selectedLead.name}</h3>
                <p className="text-xs text-slate-400">{selectedLead.company}</p>
              </div>
              <a
                href={selectedLead.profile_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <span>Source Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading message history...
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.direction === 'sent'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-850 text-slate-100 rounded-tl-none'
                    }`}>
                      <p>{msg.content}</p>
                      <span className={`text-[9px] block mt-1.5 ${
                        msg.direction === 'sent' ? 'text-indigo-200' : 'text-slate-500'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AI Quick Replies + Send Area */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/40 space-y-4 shrink-0">
              
              {/* Quick Replies Panel */}
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-indigo-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Gemini Suggested Quick Replies</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getQuickReplies().map((reply) => (
                    <button
                      key={reply}
                      onClick={() => handleSend(reply)}
                      disabled={sending}
                      className="text-xs bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(replyText);
                }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a manual response..."
                  disabled={sending}
                  className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-indigo-600/10 active:scale-95 transition-all duration-200"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-2" />
            <h4 className="font-bold text-slate-400">No Conversation Selected</h4>
            <p className="text-xs text-slate-500 mt-1">Select an active contact from the sidebar list to respond.</p>
          </div>
        )}
      </div>

    </div>
  );
};

// Mock interested leads dataset
function getMockInterestedLeads(platform: string): Lead[] {
  const allLeads: Lead[] = [
    {
      id: 'lead-1',
      name: 'Sarah Jenkins',
      platform: 'linkedin',
      profile_url: 'http://localhost:5000/mock/linkedin/profile/sarah-jenkins',
      company: 'Technical Recruiter at TechCorp',
      status: 'interested',
      reason: 'AI match score 85%. Interested in React/TS portfolio.',
    },
    {
      id: 'lead-2',
      name: 'Elena Rostova',
      platform: 'twitter',
      profile_url: 'http://localhost:5000/mock/twitter',
      company: 'Twitter/X Tech Lead',
      status: 'interested',
      reason: 'AI match score 92%. Replied positively to tweet pitch.',
    },
  ];
  if (platform === 'all') return allLeads;
  return allLeads.filter(l => l.platform === platform);
}

// Mock messages history
function getMockMessages(leadId: string): Message[] {
  return [
    {
      id: 'm1',
      lead_id: leadId,
      direction: 'sent',
      content: 'Hi there, saw you are sourcing frontend developer talent. I specialize in react and node.js, check out my projects!',
      created_at: new Date(Date.now() - 3600 * 2000).toISOString(),
    },
    {
      id: 'm2',
      lead_id: leadId,
      direction: 'received',
      content: 'Hello! Thanks for connecting. Your skills and profile look promising. Are you available for a brief tech intro call next week?',
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ];
}
