import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { 
  ChevronRight, 
  ChevronLeft,
  ExternalLink
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  platform: 'linkedin' | 'twitter' | 'upwork';
  profile_url: string;
  company: string;
  match_score: number;
  status: 'discovered' | 'evaluated' | 'messaged' | 'interested' | 'rejected' | 'converted';
  reason: string;
}

const COLUMNS = [
  { id: 'discovered', name: 'Discovered', color: 'bg-slate-900 border-slate-800' },
  { id: 'evaluated', name: 'Evaluated', color: 'bg-slate-900 border-indigo-950' },
  { id: 'messaged', name: 'Message Sent', color: 'bg-slate-900 border-blue-950' },
  { id: 'interested', name: 'Interested (Handoff)', color: 'bg-slate-900 border-emerald-950' },
  { id: 'converted', name: 'Converted', color: 'bg-slate-900 border-amber-950' },
] as const;

export const Pipeline: React.FC = () => {
  const { session } = useAuthStore();
  const { platform } = useFilterStore();
  const { socket } = useSocketStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch leads with status filters matching Kanban
  const fetchPipelineLeads = async () => {
    if (!session) return;
    try {
      const p = platform !== 'all' ? `platform=${platform}` : '';
      const url = `http://localhost:5000/api/leads?${p}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        setLeads(getMockPipelineLeads(platform));
      }
    } catch (e) {
      setLeads(getMockPipelineLeads(platform));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineLeads();
  }, [session, platform]);

  // Sync real-time lead discoveries / scoring via Socket.io
  useEffect(() => {
    if (!socket) return;

    socket.on('LEAD_FOUND', (data: { lead: Lead }) => {
      setLeads((prev) => {
        if (prev.find(l => l.id === data.lead.id)) return prev;
        return [data.lead, ...prev];
      });
    });

    socket.on('LEAD_SCORED', (data: { lead: Lead }) => {
      setLeads((prev) => {
        const filtered = prev.filter(l => l.id !== data.lead.id);
        return [data.lead, ...filtered];
      });
    });

    return () => {
      socket.off('LEAD_FOUND');
      socket.off('LEAD_SCORED');
    };
  }, [socket]);

  // Transition lead status
  const moveLead = async (leadId: string, nextStatus: Lead['status']) => {
    // Optimistic UI state update
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead))
    );

    if (session && !session.access_token.startsWith('mock_jwt')) {
      try {
        // Find lead details first to get matching endpoints, or update leads database directly using supabase client!
        // Yes, supabase user client runs RLS policies. Wait, Express doesn't have a direct lead PATCH status, but we can write a simple PATCH endpoint or just call database updates. Wait, in the server routes we did not implement an explicit PATCH lead status route, but we can call supabase directly from frontend or update via Express. Wait! Calling database update directly using client-side Supabase client is the canonical Supabase way!
        // Auth store already imported
        const { supabase } = await import('../store/authStore.js');
        if (supabase) {
          await supabase
            .from('leads')
            .update({ status: nextStatus })
            .eq('id', leadId);
        }
      } catch (err) {
        console.error('Failed to update lead status on database:', err);
      }
    }
  };

  const getLeadsByStatus = (statusId: typeof COLUMNS[number]['id']) => {
    // Exclude rejected status from display in Kanban
    return leads.filter((lead) => lead.status === statusId);
  };

  // Get color for match score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 60) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  return (
    <div className="flex-1 bg-slate-950 p-8 overflow-y-auto h-screen space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight font-sans">CRM Pipeline</h2>
        <p className="text-sm text-slate-400">Track candidates and prospects as they proceed through outreach scoring and responses.</p>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500">Loading pipeline board...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
          {COLUMNS.map((col) => {
            const colLeads = getLeadsByStatus(col.id);
            return (
              <div key={col.id} className="flex flex-col space-y-4">
                {/* Column Header */}
                <div className="flex justify-between items-center px-2">
                  <h4 className="font-bold text-sm text-slate-200 tracking-wide">{col.name}</h4>
                  <span className="text-xs font-black text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                    {colLeads.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className={`p-4 rounded-2xl border ${col.color} space-y-3 min-h-[450px] bg-slate-900/10 backdrop-blur-sm`}>
                  {colLeads.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-center text-xs text-slate-600 italic">
                      Empty column
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <div key={lead.id} className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 p-4 rounded-xl space-y-3 transition-all duration-200 group">
                        
                        {/* Name & Badge */}
                        <div className="flex justify-between items-start gap-2">
                          <h5 className="font-bold text-sm text-slate-200 truncate">{lead.name}</h5>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 border ${
                            lead.platform === 'linkedin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            lead.platform === 'twitter' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {lead.platform}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1">{lead.company}</p>

                        {/* Match Score & Link */}
                        <div className="flex justify-between items-center pt-2">
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(lead.match_score)}`}>
                            Score: {lead.match_score}%
                          </div>
                          
                          <a
                            href={lead.profile_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-indigo-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        {/* Reason / AI analysis */}
                        <p className="text-[10px] text-slate-500 italic line-clamp-2 pt-1 border-t border-slate-850">
                          {lead.reason}
                        </p>

                        {/* Control buttons to shift status */}
                        <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-850">
                          {col.id !== 'discovered' && (
                            <button
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.id === col.id);
                                if (idx > 0) moveLead(lead.id, COLUMNS[idx - 1].id);
                              }}
                              className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {col.id !== 'converted' && (
                            <button
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.id === col.id);
                                if (idx < COLUMNS.length - 1) moveLead(lead.id, COLUMNS[idx + 1].id);
                              }}
                              className="p-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Mock pipeline leads
function getMockPipelineLeads(platform: string): Lead[] {
  const allLeads: Lead[] = [
    {
      id: 'l1',
      name: 'Alex Rivera',
      platform: 'linkedin',
      profile_url: 'http://localhost:5000/mock/linkedin/profile/alex-rivera',
      company: 'Lead Frontend Engineer | Seeking React Developers',
      match_score: 95,
      status: 'discovered',
      reason: 'Recruiter looking for React skills, high match.',
    },
    {
      id: 'l2',
      name: 'Sarah Jenkins',
      platform: 'linkedin',
      profile_url: 'http://localhost:5000/mock/linkedin/profile/sarah-jenkins',
      company: 'Technical Recruiter at TechCorp',
      match_score: 85,
      status: 'interested',
      reason: 'AI match score 85%. Recruiter interested in portfolio link.',
    },
    {
      id: 'l3',
      name: 'David Chen',
      platform: 'linkedin',
      profile_url: 'http://localhost:5000/mock/linkedin/profile/david-chen',
      company: 'CTO & Founder (Looking for freelancers)',
      match_score: 78,
      status: 'evaluated',
      reason: 'CTO looking for freelancer with react skills, good match.',
    },
    {
      id: 'l4',
      name: 'Elena Rostova',
      platform: 'twitter',
      profile_url: 'http://localhost:5000/mock/twitter',
      company: 'Twitter/X Tech Lead',
      match_score: 92,
      status: 'messaged',
      reason: 'AI match score 92%. Message sent to DM thread.',
    },
    {
      id: 'l5',
      name: 'Marcus Brody',
      platform: 'upwork',
      profile_url: 'http://localhost:5000/mock/upwork',
      company: 'SaaS Dashboard Project Manager',
      match_score: 80,
      status: 'converted',
      reason: 'Contract signed! Freelancer client landed.',
    },
  ];

  if (platform === 'all') return allLeads;
  return allLeads.filter(l => l.platform === platform);
}
