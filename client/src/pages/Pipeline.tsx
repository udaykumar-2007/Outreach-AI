import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config.js';
import { 
  ChevronRight, 
  ChevronLeft,
  ExternalLink,
  Bot
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  platform: 'linkedin' | 'twitter' | 'upwork' | 'devto';
  profile_url: string;
  company: string;
  match_score: number;
  status: 'discovered' | 'evaluated' | 'messaged' | 'interested' | 'rejected' | 'converted';
  reason: string;
}

const COLUMNS = [
  { id: 'discovered', name: 'Discovered', color: 'border-white/5 bg-[#34150F]/10' },
  { id: 'evaluated', name: 'Evaluated', color: 'border-white/5 bg-[#34150F]/20' },
  { id: 'messaged', name: 'Message Sent', color: 'border-white/5 bg-[#34150F]/30' },
  { id: 'interested', name: 'Interested', color: 'border-[#EACEAA]/20 bg-[#EACEAA]/5' },
  { id: 'converted', name: 'Converted', color: 'border-[#D39858]/30 bg-[#D39858]/10' },
] as const;

export const Pipeline: React.FC = () => {
  const { session } = useAuthStore();
  const { platform } = useFilterStore();
  const { socket } = useSocketStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPipelineLeads = async () => {
    if (!session) return;
    try {
      const p = platform !== 'all' ? `platform=${platform}` : '';
      const url = `${API_BASE_URL}/api/leads?${p}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        setLeads(getMockPipelineLeads());
      }
    } catch (err) {
      setLeads(getMockPipelineLeads());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineLeads();
  }, [session, platform]);

  useEffect(() => {
    if (!socket) return;

    const handleLeadDiscovered = (data: any) => {
      if (data.lead) {
        setLeads((prev) => {
          if (prev.some((l) => l.id === data.lead.id)) return prev;
          return [data.lead, ...prev];
        });
      }
    };

    const handleLeadScored = (data: any) => {
      if (data.lead) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === data.lead.id || l.name === data.lead.name
              ? { ...l, match_score: data.lead.match_score, status: 'evaluated' }
              : l
          )
        );
      }
    };

    const handleMessageSent = (data: any) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === data.leadId ? { ...l, status: 'messaged' } : l))
      );
    };

    socket.on('lead_discovered', handleLeadDiscovered);
    socket.on('lead_scored', handleLeadScored);
    socket.on('message_sent', handleMessageSent);

    return () => {
      socket.off('lead_discovered', handleLeadDiscovered);
      socket.off('lead_scored', handleLeadScored);
      socket.off('message_sent', handleMessageSent);
    };
  }, [socket]);

  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    if (!session) return;
    try {
      await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const getNextStatus = (current: Lead['status']): Lead['status'] | null => {
    const order: Lead['status'][] = ['discovered', 'evaluated', 'messaged', 'interested', 'converted'];
    const idx = order.indexOf(current);
    if (idx !== -1 && idx < order.length - 1) return order[idx + 1];
    return null;
  };

  const getPrevStatus = (current: Lead['status']): Lead['status'] | null => {
    const order: Lead['status'][] = ['discovered', 'evaluated', 'messaged', 'interested', 'converted'];
    const idx = order.indexOf(current);
    if (idx > 0) return order[idx - 1];
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 bg-[#0B0F14] text-white p-8 overflow-x-auto h-screen space-y-6 relative"
    >
      <div className="absolute inset-0 hud-grid opacity-[0.1] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h2 className="text-2xl font-black tracking-tight gold-header">Prospect Pipeline</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Real-time status tracking for crawler matches, proposal pitches, and recruiter replies.</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl">
          <Bot className="w-4 h-4 text-[#EACEAA]" />
          <span className="text-slate-400">Total Tracked:</span>
          <span className="font-extrabold text-[#EACEAA]">{leads.length}</span>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex gap-4 items-start min-w-[1100px] h-[calc(100vh-160px)] pb-4 relative z-10">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[220px] max-w-[280px] rounded-2xl border ${col.color} p-4 flex flex-col h-full backdrop-blur-xl shadow-xl`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 font-mono">{col.name}</h3>
                <span className="text-[10px] font-mono font-black bg-white/[0.04] text-[#EACEAA] border border-white/5 px-2 py-0.5 rounded-full">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {loading ? (
                  <div className="h-20 bg-white/[0.02] border border-white/5 animate-pulse rounded-xl" />
                ) : colLeads.length === 0 ? (
                  <div className="h-32 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[10px] text-slate-600 font-mono italic">
                    NO_LEADS_QUEUED
                  </div>
                ) : (
                  <AnimatePresence>
                    {colLeads.map((lead) => {
                      const next = getNextStatus(lead.status);
                      const prev = getPrevStatus(lead.status);

                      return (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className="hud-card p-4 border-white/8 bg-[#34150F]/20 space-y-3 relative group"
                        >
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-xs text-white group-hover:text-[#EACEAA] transition-colors">{lead.name}</h4>
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                              lead.platform === 'linkedin' ? 'bg-[#EACEAA]/10 text-[#EACEAA] border-[#EACEAA]/20' :
                              lead.platform === 'twitter' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                              lead.platform === 'devto' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {lead.platform === 'devto' ? 'dev.to' : lead.platform}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 truncate">{lead.company}</p>

                          {/* Match rating badge */}
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-slate-500">Rating</span>
                            <span className="font-bold text-[#EACEAA]">{lead.match_score}% Match</span>
                          </div>

                          {/* Action navigation */}
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <a
                              href={lead.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            <div className="flex gap-1">
                              {prev && (
                                <button
                                  onClick={() => updateLeadStatus(lead.id, prev)}
                                  className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                                  title={`Move to ${prev}`}
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}
                              {next && (
                                <button
                                  onClick={() => updateLeadStatus(lead.id, next)}
                                  className="p-1 rounded bg-[#EACEAA]/10 hover:bg-[#EACEAA] text-[#EACEAA] hover:text-[#0B0F14] transition-colors"
                                  title={`Move to ${next}`}
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

function getMockPipelineLeads(): Lead[] {
  return [
    {
      id: 'lead_101',
      name: 'Michael Scott',
      platform: 'linkedin',
      profile_url: 'https://linkedin.com/in/michaelscott',
      company: 'Dunder Mifflin Tech',
      match_score: 92,
      status: 'discovered',
      reason: 'Tech recruiter search keyword match',
    },
    {
      id: 'lead_102',
      name: 'Pam Beesly',
      platform: 'twitter',
      profile_url: 'https://x.com/pam_designs',
      company: 'Scranton Studios',
      match_score: 88,
      status: 'evaluated',
      reason: 'UI/UX Developer opportunity',
    },
    {
      id: 'lead_103',
      name: 'Jim Halpert',
      platform: 'upwork',
      profile_url: 'https://upwork.com/freelancer/jimhalpert',
      company: 'Athlead Software',
      match_score: 95,
      status: 'messaged',
      reason: 'Direct proposal sent on Upwork',
    },
    {
      id: 'lead_104',
      name: 'Dwight Schrute',
      platform: 'devto',
      profile_url: 'https://dev.to/dwightschrute',
      company: 'Beet Algorithms',
      match_score: 84,
      status: 'interested',
      reason: 'Commented on portfolio article',
    },
  ];
}
