import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  Zap, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Play, 
  Pause,
  Bot,
  Brain,
  Cpu,
  Terminal
} from 'lucide-react';

const AnimatedCounter: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 900;
    const increment = Math.ceil(value / 40) || 1;
    const stepTime = Math.floor(duration / (value / increment)) || 15;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count}{suffix}</span>;
};

export const Dashboard: React.FC = () => {
  const { session, profile } = useAuthStore();
  const { persona } = useFilterStore();
  const { logs, isConnected, addLog } = useSocketStore();

  const [automationRunning, setAutomationRunning] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggerInterval, setTriggerInterval] = useState<any>(null);
  const [aiState, setAiState] = useState<'idle' | 'processing'>('idle');
  const [aiProgressText, setAiProgressText] = useState('SYSTEM MONITOR / STANDBY');
  const [activeStep, setActiveStep] = useState(0);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    { sender: 'ai', text: 'AI-OS kernel active. Monitoring freelance bids and student internships. Command me.' }
  ]);
  const [userInput, setUserInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchAnalytics = async () => {
    if (!session) return;
    try {
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

  useEffect(() => {
    return () => {
      if (triggerInterval) clearInterval(triggerInterval);
    };
  }, [triggerInterval]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, aiState]);

  const toggleAutomation = async () => {
    const nextState = !automationRunning;
    setAutomationRunning(nextState);

    if (nextState) {
      setAiState('processing');
      setAiProgressText('✨ Thinking...');
      setActiveStep(0);
      addLog('CAMPAIGN_ACTIVATED', 'AI OS: Initializing background scanning kernel...', {});
      
      const mockNames = ['Alice Chen', 'Robert Taylor', 'Jordan Smith', 'Emma Watson', 'Liam Neeson', 'Rohan Sharma'];
      const mockProfiles = ['https://linkedin.com/in/alice', 'https://x.com/rob_codes', 'https://linkedin.com/in/jordan', 'https://upwork.com/freelancer/emma', 'https://x.com/neeson', 'https://dev.to/rohan_codes'];
      const mockPlatforms = ['linkedin', 'twitter', 'linkedin', 'upwork', 'twitter', 'devto'];
      let step = 0;

      const progressSteps = [
        'Scanning skills...',
        'Matching opportunities...',
        'Creating proposal...',
        'Connecting freelancers...',
        'Structuring analytics logs...',
      ];

      const interval = setInterval(() => {
        const index = step % mockNames.length;
        const name = mockNames[index];
        const link = mockProfiles[index];
        const plat = mockPlatforms[index];

        setAiProgressText(progressSteps[step % progressSteps.length]);
        setActiveStep(step % progressSteps.length);

        if (step % 3 === 0) {
          addLog('LEAD_FOUND', `Prospect found: ${name} via ${plat.toUpperCase()}`, {
            lead: { name, platform: plat, profile_url: link }
          });
        } else if (step % 3 === 1) {
          const score = Math.floor(Math.random() * 41) + 60;
          addLog('LEAD_SCORED', `Match evaluated for ${name}: Rating ${score}%`, {
            lead: { name, match_score: score }
          });
        } else {
          addLog('MESSAGE_SENT', `Direct message pushed to ${name} on ${plat.toUpperCase()}`, {
            leadId: name
          });
        }
        step++;
      }, 3500);

      setTriggerInterval(interval);

      if (session && !session.access_token.startsWith('mock_jwt')) {
        try {
          const campRes = await fetch('http://localhost:5000/api/campaigns', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const campaigns = await campRes.json();
          let targetCampaign = campaigns[0];

          if (!targetCampaign) {
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
      setAiState('idle');
      setAiProgressText('SYSTEM MONITOR / STANDBY');
      addLog('CAMPAIGN_PAUSED', 'AI OS: Background worker processes suspended.', {});
    }
  };

  const getMetricCards = () => {
    const summary = analytics?.summary || { totalLeads: 0, acceptanceRate: 0, messagesSent: 0, activeClientSlots: 0 };
    
    return [
      { name: 'INDEXED LEADS', value: summary.totalLeads, icon: Users, color: 'text-[#EACEAA]' },
      { name: 'MATCH RATING', value: summary.acceptanceRate, suffix: '%', icon: TrendingUp, color: 'text-slate-300' },
      { name: 'MESSAGES ROUTED', value: summary.messagesSent, icon: MessageSquare, color: 'text-slate-300' },
      { name: 'ACTIVE SLOTS', value: summary.activeClientSlots, icon: Zap, color: 'text-[#EACEAA]' },
    ];
  };

  const getFreelanceOpportunities = () => [
    { title: 'SaaS Integration Architect', budget: '$4,200', source: 'Upwork', match: '94%', tags: ['React', 'Postgres'] },
    { title: 'AI Assistant Copilot UI', budget: '$2,800', source: 'Twitter/X', match: '89%', tags: ['Tailwind', 'TS'] }
  ];

  const getStudentOpportunities = () => [
    { title: 'Frontend Developer Intern', company: 'Linear Labs', duration: '3 Months', match: '96%', tags: ['React', 'Framer'] },
    { title: 'TypeScript Core Contributor', company: 'OSS Fellowship', duration: '6 Months', match: '91%', tags: ['Node', 'TypeScript'] }
  ];

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    const userMsg = userInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setUserInput('');
    setAiState('processing');

    setTimeout(() => {
      let reply = 'AI-OS response: ';
      if (userMsg.toLowerCase().includes('portfolio') || userMsg.toLowerCase().includes('presence')) {
        reply += 'Web portfolio compilation active. Custom styles can be compiled inside the Web Presence generator module.';
      } else if (userMsg.toLowerCase().includes('key') || userMsg.toLowerCase().includes('setting')) {
        reply += 'API keys are stored securely using Supabase pgcrypto. You can configure active credentials inside Settings.';
      } else {
        reply += 'Crawler loops active. Playwright sessions are waiting to schedule the next batch.';
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
      setAiState('idle');
    }, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex-1 bg-transparent p-8 overflow-y-auto h-screen space-y-8 relative pb-24"
    >
      
      {/* Welcome Hero Section */}
      <div className="hud-card p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border-[#EACEAA]/10 bg-[#34150F]/20 backdrop-blur-xl">
        <div className="space-y-3 z-10 flex-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#EACEAA]" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Autonomous Core / V1.0</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-none gold-header">
            Welcome back, {profile?.full_name || 'Operator'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed font-medium">
            Your personal AI Operating System is actively monitoring freelance channels and student developer internship vacancies.
          </p>
          
          {/* Think status badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {['✨ Scanning skills', 'Matching candidates', 'Connecting targets'].map((step, idx) => (
              <span 
                key={step}
                className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all duration-300 border font-mono ${
                  automationRunning && activeStep === idx
                    ? 'bg-[#EACEAA]/15 text-[#EACEAA] border-[#EACEAA]/30'
                    : 'bg-white/[0.02] text-slate-500 border-white/5'
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* AI Orb Assistant Container */}
        <div className="flex flex-col items-center gap-3 shrink-0 relative p-6 bg-white/[0.01] border border-white/5 rounded-2xl">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Orbits */}
            <div className="absolute w-24 h-24 rounded-full border border-white/[0.06] ai-particle-1" />
            <div className="absolute w-24 h-24 rounded-full border-t border-[#EACEAA]/40 ai-particle-1" />
            <div className="absolute w-28 h-28 rounded-full border border-white/[0.04] ai-particle-2" />
            <div className="absolute w-28 h-28 rounded-full border-b border-[#D39858]/30 ai-particle-2" />
            
            {/* Core Orb */}
            <div className="w-14 h-14 rounded-full ai-orb-core flex items-center justify-center shadow-2xl">
              <Brain className="w-5 h-5 text-[#0B0F14]" />
            </div>
          </div>
          
          <div className="text-center">
            <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-widest">{aiProgressText}</span>
            <button
              onClick={toggleAutomation}
              className="mt-2.5 text-[9px] font-black text-white hover:text-[#EACEAA] uppercase tracking-wider flex items-center gap-1.5 transition-colors font-mono"
            >
              {automationRunning ? (
                <>
                  <Pause className="w-3 h-3 fill-current" />
                  <span>Suspend Process</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Bootstrap OS Kernel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Section (Hud Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {getMetricCards().map((card) => (
          <motion.div 
            key={card.name} 
            whileHover={{ y: -2 }}
            className="hud-card p-6 border-white/8 bg-[#34150F]/20 flex items-center justify-between relative overflow-hidden"
          >
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">{card.name}</p>
              <h3 className="text-2xl font-black mt-2 tracking-tight gold-header">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-white/5 animate-pulse rounded" />
                ) : (
                  <AnimatedCounter value={card.value} suffix={card.suffix} />
                )}
              </h3>
            </div>
            <div className={`p-2 rounded-xl bg-white/[0.02] border border-white/5 ${card.color}`}>
              <card.icon className="w-4.5 h-4.5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main OS Workspace: Opportunities & Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Freelance Opportunities */}
        <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 backdrop-blur-md flex flex-col justify-between">
          <div className="pb-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest font-mono">Freelance Bids</h3>
            <span className="text-[8px] font-black text-[#EACEAA] border border-[#EACEAA]/20 px-2 py-0.5 rounded uppercase tracking-wider font-mono">Upwork Bids</span>
          </div>

          <div className="py-4 space-y-4 flex-1">
            {getFreelanceOpportunities().map((opp, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all group">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs text-white group-hover:text-[#EACEAA] transition-colors">{opp.title}</h4>
                  <span className="text-[10px] font-black text-[#EACEAA] font-mono">{opp.budget}</span>
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
                  <div className="flex gap-1.5">
                    {opp.tags.map(t => (
                      <span key={t} className="text-[8px] font-bold bg-white/[0.03] text-slate-400 px-1.5 py-0.5 rounded border border-white/5 font-mono">{t}</span>
                    ))}
                  </div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 font-mono">{opp.source}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full text-center text-[10px] text-slate-500 hover:text-white transition-colors py-1.5 border border-white/5 rounded-xl font-bold font-mono">
            Monitor Bidding Pipelines
          </button>
        </div>

        {/* Student Opportunities */}
        <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 backdrop-blur-md flex flex-col justify-between">
          <div className="pb-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest font-mono">Student Internships</h3>
            <span className="text-[8px] font-black text-[#D39858] border border-[#D39858]/25 px-2 py-0.5 rounded uppercase tracking-wider font-mono">Recruiter Matches</span>
          </div>

          <div className="py-4 space-y-4 flex-1">
            {getStudentOpportunities().map((opp, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all group">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-xs text-white group-hover:text-[#EACEAA] transition-colors">{opp.title}</h4>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">{opp.match} Match</span>
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
                  <div className="flex gap-1.5">
                    {opp.tags.map(t => (
                      <span key={t} className="text-[8px] font-bold bg-white/[0.03] text-slate-400 px-1.5 py-0.5 rounded border border-white/5 font-mono">{t}</span>
                    ))}
                  </div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 font-mono">{opp.company}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full text-center text-[10px] text-slate-500 hover:text-white transition-colors py-1.5 border border-white/5 rounded-xl font-bold font-mono">
            Monitor Recruiter Targets
          </button>
        </div>

        {/* Skill Analysis */}
        <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 backdrop-blur-md flex flex-col justify-between">
          <div className="pb-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest font-mono">AI Skill Analysis</h3>
            <span className="text-[8px] font-black text-[#EACEAA] border border-[#EACEAA]/25 px-2 py-0.5 rounded uppercase tracking-wider font-mono">Optimized</span>
          </div>

          <div className="flex flex-col gap-4 py-4 flex-1 justify-center">
            {[
              { skill: 'React Development', rate: 94 },
              { skill: 'TypeScript Strict Compiler', rate: 89 },
              { skill: 'Playwright Automation', rate: 76 }
            ].map(s => (
              <div key={s.skill} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-300">
                  <span>{s.skill}</span>
                  <span className="font-mono">{s.rate}% Match</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${s.rate}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[#D39858] to-[#EACEAA] rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 italic text-center font-mono">Gemini is automatically aligning campaign search tags with these skill indexes.</p>
        </div>

      </div>

      {/* Analytics Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Volume Graph */}
        <div className="lg:col-span-2 hud-card p-6 border-white/8 bg-[#34150F]/20 backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest font-mono">Traffic Analyzer</h3>
            </div>
            <span className="text-[9px] text-[#EACEAA] font-black bg-[#EACEAA]/5 border border-[#EACEAA]/25 px-2 py-0.5 rounded uppercase tracking-wider font-mono">KERNEL FEED</span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">DATASET_INDEXING...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.messagesByDay || []} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.015)" />
                  <XAxis dataKey="day" stroke="#475569" style={{ fontSize: 9, fontWeight: 'bold' }} tickLine={false} />
                  <YAxis stroke="#475569" style={{ fontSize: 9, fontWeight: 'bold' }} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0F14', borderColor: 'rgba(234,206,170,0.15)', borderRadius: 12, fontSize: 11 }} />
                  <Line type="monotone" dataKey="sent" stroke="#EACEAA" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Outgoing Bids" />
                  <Line type="monotone" dataKey="received" stroke="#D39858" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Incoming Leads" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Operations Feed */}
        <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 backdrop-blur-xl flex flex-col h-[320px]">
          <div className="pb-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#EACEAA]" />
              <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest font-mono">OS System Log</h3>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#EACEAA] animate-pulse' : 'bg-slate-700'}`} />
              <span className="text-[9px] font-mono text-slate-500">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3 font-mono text-[10px] pr-1">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic font-mono">
                <span>[KERNEL STALL / STANDBY]</span>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2.5 leading-relaxed text-slate-400">
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span>{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Floating chatbot bubble */}
      <button
        onClick={() => setShowAiDrawer(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-[#34150F] border border-[#EACEAA]/20 text-[#EACEAA] shadow-2xl hover:scale-105 transition-all duration-300 z-30 group"
      >
        <Bot className="w-5 h-5 animate-pulse" />
      </button>

      {/* AI Assistant Chatbot Drawer */}
      <AnimatePresence>
        {showAiDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiDrawer(false)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-[#0B0F14] border-l border-[#EACEAA]/15 shadow-2xl z-50 flex flex-col p-6 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#EACEAA]" />
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">AI Strategy Core</h3>
                </div>
                <button 
                  onClick={() => setShowAiDrawer(false)}
                  className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-wider p-1 font-mono"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] pr-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#EACEAA] text-[#0B0F14] font-bold'
                        : 'bg-[#34150F]/40 border border-white/5 text-slate-300'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiState === 'processing' && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-xl bg-[#34150F]/40 border border-white/5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#EACEAA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#EACEAA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#EACEAA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-white/5">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="EXECUTE COMMAND..."
                  className="flex-1 glass-input rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  className="btn-hud-primary px-4 py-2 rounded-xl text-xs font-black font-mono"
                >
                  RUN
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

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
      { platform: 'Dev.to', leads: 18, interested: 4, converted: 1 },
    ],
  };
}
