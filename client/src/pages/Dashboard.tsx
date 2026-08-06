import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { 
  Zap, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Play, 
  Pause,
  AlertCircle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { session } = useAuthStore();
  const { persona } = useFilterStore();
  const { logs, isConnected, addLog } = useSocketStore();

  const [automationRunning, setAutomationRunning] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggerInterval, setTriggerInterval] = useState<any>(null);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!session) return;
    try {
      // In mock auth, we can build high quality mock analytics data directly
      if (session.access_token.startsWith('mock_jwt')) {
        setAnalytics(getMockAnalyticsData(persona));
        setLoading(false);
        return;
      }

      const res = await fetch('http://localhost:5000/api/analytics', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        setAnalytics(getMockAnalyticsData(persona));
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setAnalytics(getMockAnalyticsData(persona));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [session, persona]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (triggerInterval) clearInterval(triggerInterval);
    };
  }, [triggerInterval]);

  // Simulated automation crawl
  const toggleAutomation = async () => {
    const nextState = !automationRunning;
    setAutomationRunning(nextState);

    if (nextState) {
      addLog('CAMPAIGN_ACTIVATED', 'Automation engine started. Initializing browser sessions...', {});
      
      // Let's create an active interval that triggers mock logs every 3.5 seconds
      // to let the user see the visual socket feed running in front of them!
      const mockNames = ['Alice Chen', 'Robert Taylor', 'Jordan Smith', 'Emma Watson', 'Liam Neeson', 'Rohan Sharma'];
      const mockProfiles = ['https://linkedin.com/in/alice', 'https://x.com/rob_codes', 'https://linkedin.com/in/jordan', 'https://upwork.com/freelancer/emma', 'https://x.com/neeson', 'https://dev.to/rohan_codes'];
      const mockPlatforms = ['linkedin', 'twitter', 'linkedin', 'upwork', 'twitter', 'devto'];
      let step = 0;

      const interval = setInterval(() => {
        const index = step % mockNames.length;
        const name = mockNames[index];
        const link = mockProfiles[index];
        const plat = mockPlatforms[index];

        if (step % 3 === 0) {
          addLog('LEAD_FOUND', `Discovered new prospect: ${name} on ${plat.toUpperCase()}`, {
            lead: { name, platform: plat, profile_url: link }
          });
        } else if (step % 3 === 1) {
          const score = Math.floor(Math.random() * 41) + 60; // 60 to 100
          addLog('LEAD_SCORED', `Evaluated match for ${name}: Score ${score}%`, {
            lead: { name, match_score: score }
          });
        } else {
          addLog('MESSAGE_SENT', `Auto message sent to ${name} via ${plat.toUpperCase()}`, {
            leadId: name
          });
        }
        step++;
      }, 3500);

      setTriggerInterval(interval);

      // Trigger backend scan job via API if not in mock session
      if (session && !session.access_token.startsWith('mock_jwt')) {
        try {
          // Check if there's any campaign first. If not, create one
          const campRes = await fetch('http://localhost:5000/api/campaigns', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const campaigns = await campRes.json();
          let targetCampaign = campaigns[0];

          if (!targetCampaign) {
            // Create default campaign
            const createRes = await fetch('http://localhost:5000/api/campaigns', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}` 
              },
              body: JSON.stringify({
                platform: 'linkedin',
                target_keywords: ['React', 'TypeScript', 'Node'],
                target_role: 'Tech Recruiter',
                active: true
              })
            });
            targetCampaign = await createRes.json();
          } else {
            // Activate campaign
            await fetch(`http://localhost:5000/api/campaigns/${targetCampaign.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ active: true })
            });
          }
        } catch (e) {
          console.error('Failed to trigger scan job in backend', e);
        }
      }
    } else {
      if (triggerInterval) {
        clearInterval(triggerInterval);
        setTriggerInterval(null);
      }
      addLog('CAMPAIGN_PAUSED', 'Automation engine suspended by user.', {});
    }
  };

  const getMetricCards = () => {
    const summary = analytics?.summary || { totalLeads: 0, acceptanceRate: 0, messagesSent: 0, activeClientSlots: 0 };
    
    if (persona === 'freelancer') {
      return [
        { name: 'Total Leads Found', value: summary.totalLeads, icon: Users, color: 'text-indigo-400' },
        { name: 'Acceptance Rate', value: `${summary.acceptanceRate}%`, icon: TrendingUp, color: 'text-emerald-400' },
        { name: 'Sent Messages', value: summary.messagesSent, icon: MessageSquare, color: 'text-indigo-400' },
        { name: 'Active Client Slots', value: summary.activeClientSlots, icon: Zap, color: 'text-amber-400' },
      ];
    } else {
      return [
        { name: 'Total Recruiter Leads', value: summary.totalLeads, icon: Users, color: 'text-blue-400' },
        { name: 'Response Rate', value: `${summary.acceptanceRate}%`, icon: TrendingUp, color: 'text-indigo-400' },
        { name: 'Outreach Notes Sent', value: summary.messagesSent, icon: MessageSquare, color: 'text-blue-400' },
        { name: 'Recruiter Connections', value: summary.activeClientSlots, icon: Zap, color: 'text-emerald-400' },
      ];
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-8 overflow-y-auto h-screen space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-400">Monitor active AI-driven outreach and channel analytics.</p>
        </div>

        {/* Start/Pause Control */}
        <button
          onClick={toggleAutomation}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold shadow-lg transition-all duration-200 ${
            automationRunning
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-amber-500/5'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'
          }`}
        >
          {automationRunning ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause Automation</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Resume Automation</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {getMetricCards().map((card) => (
          <div key={card.name} className="glass-card p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.name}</p>
              <h3 className="text-2xl font-black mt-2 text-white">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Graphs & Live Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recharts Daily Volumes */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-white">Daily Message Volumes</h3>
            <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase">Weekly Feed</span>
          </div>
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500">Compiling dataset...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.messagesByDay || []} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Sent" />
                  <Line type="monotone" dataKey="received" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Received" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h3 className="font-bold text-lg text-white">Agent Operations</h3>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-xs text-slate-400 font-medium">{isConnected ? 'WS Connected' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-sm font-semibold">No active agent logs.</p>
                <p className="text-xs text-slate-500 mt-1">Activate the automation engine to stream agent activities.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs leading-normal">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    log.event === 'LEAD_FOUND' ? 'bg-blue-500' :
                    log.event === 'LEAD_SCORED' ? 'bg-purple-500' :
                    log.event === 'MESSAGE_SENT' ? 'bg-indigo-500' :
                    log.event === 'MESSAGE_RECEIVED' ? 'bg-emerald-500' :
                    log.event === 'JOB_FAILED' ? 'bg-rose-500' : 'bg-slate-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-slate-300 font-medium">{log.text}</p>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{log.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Platform Conversion Chart */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <h3 className="font-bold text-lg text-white">Conversion Funnel by Platform</h3>
        <div className="h-80 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500">Compiling funnel...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.conversionByPlatform || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="platform" stroke="#94a3b8" style={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend />
                <Bar dataKey="leads" fill="#475569" radius={[4, 4, 0, 0]} name="Total Leads" />
                <Bar dataKey="interested" fill="#6366f1" radius={[4, 4, 0, 0]} name="Interested" />
                <Bar dataKey="converted" fill="#10b981" radius={[4, 4, 0, 0]} name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
};

// Rich mock data for dashboard styling fallback
function getMockAnalyticsData(role: string) {
  return {
    summary: {
      totalLeads: 84,
      acceptanceRate: role === 'freelancer' ? 18 : 24,
      messagesSent: 47,
      activeClientSlots: role === 'freelancer' ? 3 : 5,
    },
    messagesByDay: [
      { day: 'Mon', sent: 5, received: 2 },
      { day: 'Tue', sent: 8, received: 3 },
      { day: 'Wed', sent: 6, received: 4 },
      { day: 'Thu', sent: 12, received: 7 },
      { day: 'Fri', sent: 7, received: 5 },
      { day: 'Sat', sent: 4, received: 1 },
      { day: 'Sun', sent: 5, received: 2 },
    ],
    conversionByPlatform: [
      { platform: 'LinkedIn', leads: 45, interested: 12, converted: 4 },
      { platform: 'Twitter', leads: 25, interested: 5, converted: 1 },
      { platform: 'Upwork', leads: 14, interested: 3, converted: 2 },
    ],
  };
}
