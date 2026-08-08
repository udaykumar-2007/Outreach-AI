import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config.js';
import { 
  Save, 
  User, 
  Settings2, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { session, profile, updateProfile } = useAuthStore();
  const { setPersona } = useFilterStore();

  // Profile forms
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [role, setRole] = useState<'student' | 'freelancer'>('student');
  const [isBusy, setIsBusy] = useState(false);

  // API Integrations settings
  const [linkedinLiAt, setLinkedinLiAt] = useState('');
  const [twitterApiKey, setTwitterApiKey] = useState('');
  const [twitterApiSecret, setTwitterApiSecret] = useState('');
  const [twitterAccessToken, setTwitterAccessToken] = useState('');
  const [twitterAccessSecret, setTwitterAccessSecret] = useState('');
  const [devtoApiKey, setDevtoApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // API Connection statuses
  const [geminiConnStatus, setGeminiConnStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [geminiConnError, setGeminiConnError] = useState<string | null>(null);
  const [devtoConnStatus, setDevtoConnStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [devtoConnError, setDevtoConnError] = useState<string | null>(null);
  const [linkedinConnStatus, setLinkedinConnStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [linkedinConnError, setLinkedinConnError] = useState<string | null>(null);
  const [twitterConnStatus, setTwitterConnStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [twitterConnError, setTwitterConnError] = useState<string | null>(null);

  // Campaign configurations
  const [targetRole, setTargetRole] = useState('');
  const [keywords, setKeywords] = useState('');
  const [activeLinkedIn, setActiveLinkedIn] = useState(true);
  const [activeTwitter, setActiveTwitter] = useState(true);
  const [activeUpwork, setActiveUpwork] = useState(true);
  const [activeDevto, setActiveDevto] = useState(true);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Populate state on load
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setSkills(profile.skills?.join(', ') || '');
      setRole(profile.role || 'student');
      setIsBusy(profile.is_busy || false);

      const platforms = (profile.active_platforms as any) || { linkedin: true, twitter: true, upwork: true, devto: true };
      setActiveLinkedIn(platforms.linkedin !== false);
      setActiveTwitter(platforms.twitter !== false);
      setActiveUpwork(platforms.upwork !== false);
      setActiveDevto(platforms.devto !== false);

      const keys = (profile as any).api_keys || {};
      setLinkedinLiAt(keys.linkedin_li_at || '');
      setTwitterApiKey(keys.twitter_api_key || '');
      setTwitterApiSecret(keys.twitter_api_secret || '');
      setTwitterAccessToken(keys.twitter_access_token || '');
      setTwitterAccessSecret(keys.twitter_access_secret || '');
      setDevtoApiKey(keys.devto_api_key || '');
      setGeminiApiKey(keys.gemini_api_key || '');
    }
    loadCampaignSettings();
  }, [profile]);

  const loadCampaignSettings = async () => {
    if (!session || session.access_token.startsWith('mock_jwt')) {
      setTargetRole('Technical Recruiter');
      setKeywords('React, TypeScript, Node');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/campaigns`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const campaigns = await res.json();
        const activeCamp = campaigns[0];
        if (activeCamp) {
          setTargetRole(activeCamp.target_role || '');
          setKeywords(activeCamp.target_keywords?.join(', ') || '');
        }
      }
    } catch (e) {
      console.error('Failed to load campaigns settings:', e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setErrorMsg(null);

    const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
    const keywordsArray = keywords.split(',').map(k => k.trim()).filter(Boolean);

    const profileSuccess = await updateProfile({
      full_name: fullName,
      bio,
      skills: skillsArray,
      role,
      is_busy: isBusy,
      active_platforms: {
        linkedin: activeLinkedIn,
        twitter: activeTwitter,
        upwork: activeUpwork,
        devto: activeDevto,
      },
      api_keys: {
        linkedin_li_at: linkedinLiAt || null,
        twitter_api_key: twitterApiKey || null,
        twitter_api_secret: twitterApiSecret || null,
        twitter_access_token: twitterAccessToken || null,
        twitter_access_secret: twitterAccessSecret || null,
        devto_api_key: devtoApiKey || null,
        gemini_api_key: geminiApiKey || null,
      },
    } as any);

    if (!profileSuccess) {
      setErrorMsg('Failed to update core profile settings.');
      setSaving(false);
      return;
    }

    setPersona(role);

    if (session && !session.access_token.startsWith('mock_jwt')) {
      try {
        const activePlatforms: string[] = [];
        if (activeLinkedIn) activePlatforms.push('linkedin');
        if (activeTwitter) activePlatforms.push('twitter');
        if (activeUpwork) activePlatforms.push('upwork');
        if (activeDevto) activePlatforms.push('devto');

        for (const plat of activePlatforms) {
          await fetch(`${API_BASE_URL}/api/campaigns`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              platform: plat,
              target_keywords: keywordsArray,
              target_role: targetRole,
              active: true,
            }),
          });
        }
      } catch (err: any) {
        console.error('Failed to save campaign:', err);
      }
    }

    setSavedSuccess(true);
    setSaving(false);
    
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const testConnection = async (
    platform: 'gemini' | 'devto' | 'linkedin' | 'twitter',
    keyVal?: string,
    additionalKeys?: any
  ) => {
    if (platform === 'gemini') { setGeminiConnStatus('loading'); setGeminiConnError(null); }
    if (platform === 'devto') { setDevtoConnStatus('loading'); setDevtoConnError(null); }
    if (platform === 'linkedin') { setLinkedinConnStatus('loading'); setLinkedinConnError(null); }
    if (platform === 'twitter') { setTwitterConnStatus('loading'); setTwitterConnError(null); }

    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/verify-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          platform,
          key: keyVal,
          additionalKeys,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (platform === 'gemini') setGeminiConnStatus('success');
        if (platform === 'devto') setDevtoConnStatus('success');
        if (platform === 'linkedin') setLinkedinConnStatus('success');
        if (platform === 'twitter') setTwitterConnStatus('success');
      } else {
        const error = data.error || 'Connection failed';
        if (platform === 'gemini') { setGeminiConnStatus('error'); setGeminiConnError(error); }
        if (platform === 'devto') { setDevtoConnStatus('error'); setDevtoConnError(error); }
        if (platform === 'linkedin') { setLinkedinConnStatus('error'); setLinkedinConnError(error); }
        if (platform === 'twitter') { setTwitterConnStatus('error'); setTwitterConnError(error); }
      }
    } catch (err: any) {
      const error = err.message || 'Network error';
      if (platform === 'gemini') { setGeminiConnStatus('error'); setGeminiConnError(error); }
      if (platform === 'devto') { setDevtoConnStatus('error'); setDevtoConnError(error); }
      if (platform === 'linkedin') { setLinkedinConnStatus('error'); setLinkedinConnError(error); }
      if (platform === 'twitter') { setTwitterConnStatus('error'); setTwitterConnError(error); }
    }
  };

  const renderConnectButton = (
    status: 'idle' | 'loading' | 'success' | 'error',
    errorMsg: string | null,
    onClick: () => void
  ) => {
    return (
      <div className="flex flex-col gap-1 shrink-0 justify-end">
        <button
          type="button"
          onClick={onClick}
          disabled={status === 'loading'}
          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 flex items-center gap-1.5 min-w-[90px] justify-center ${
            status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : status === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
          {status === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
          {status === 'loading' ? 'Testing' : status === 'success' ? 'Connected' : status === 'error' ? 'Failed' : 'Connect'}
        </button>
        {status === 'error' && errorMsg && (
          <span className="text-[8px] text-rose-400 font-medium max-w-[110px] truncate block" title={errorMsg}>
            {errorMsg}
          </span>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex-1 bg-transparent p-6 overflow-y-auto h-screen space-y-6 pb-24"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight gold-header">Outreach Settings</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">Configure target keywords, active platforms, and automate freelancer busy replies.</p>
      </div>

      {/* Success/Error blocks */}
      {savedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully. Scanner jobs updated.</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Core Profile Settings */}
        <div className="glass-panel p-5 rounded-2xl space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <User className="w-4.5 h-4.5 text-[#EACEAA]" />
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">Core Profile Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">User Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Profile Persona</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'student' | 'freelancer')}
                  className="w-full bg-[#080C16]/65 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="student">Student / Intern Seeker</option>
                  <option value="freelancer">Freelancer / Developer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Short Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your skills and outreach intent..."
                rows={2}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Core Skills (comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, TypeScript, Node.js"
                className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-[#080C16]/25">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Set Busy Buffer Message</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Auto-respond to client opportunities when you are unavailable.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBusy(!isBusy)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
                  isBusy ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
                  isBusy ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Targets & Channels */}
        <div className="glass-panel p-5 rounded-2xl space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Settings2 className="w-4.5 h-4.5 text-purple-400" />
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Campaign Scanner Strategy</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Target Job/Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Technical Recruiter"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Target Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="React, Frontend, Hiring, Contract"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200"
                  required
                />
              </div>
            </div>

            {/* Checkboxes for active channels */}
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Active Outreach Channels</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { state: activeLinkedIn, setter: setActiveLinkedIn, label: 'LinkedIn crawler' },
                  { state: activeTwitter, setter: setActiveTwitter, label: 'Twitter/X direct monitor' },
                  { state: activeUpwork, setter: setActiveUpwork, label: 'Upwork search bids' },
                  { state: activeDevto, setter: setActiveDevto, label: 'Dev.to article author crawler' }
                ].map((channel, i) => (
                  <label key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/5 bg-[#080C16]/20 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={channel.state}
                      onChange={(e) => channel.setter(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500 bg-[#080C16] border-white/10"
                    />
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Integrations & API Keys Panel */}
        <div className="glass-panel p-5 rounded-2xl space-y-5 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Settings2 className="w-4.5 h-4.5 text-[#EACEAA]" />
            <h3 className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">API Keys & Integrations</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Google Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini AI API Key"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                {renderConnectButton(geminiConnStatus, geminiConnError, () => testConnection('gemini', geminiApiKey))}
              </div>
              <p className="text-[9px] text-slate-500 font-medium">Used for cognitive match scoring, web design, and drafting outreach.</p>

              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Dev.to API Key</label>
                  <input
                    type="password"
                    value={devtoApiKey}
                    onChange={(e) => setDevtoApiKey(e.target.value)}
                    placeholder="Enter your Dev.to API Key"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                {renderConnectButton(devtoConnStatus, devtoConnError, () => testConnection('devto', devtoApiKey))}
              </div>
              <p className="text-[9px] text-slate-500 font-medium">Used to automatically publish technical portfolio announcement articles.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">LinkedIn li_at Cookie</label>
                  <input
                    type="password"
                    value={linkedinLiAt}
                    onChange={(e) => setLinkedinLiAt(e.target.value)}
                    placeholder="AQEDAVtN0PUAKP..."
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                {renderConnectButton(linkedinConnStatus, linkedinConnError, () => testConnection('linkedin', linkedinLiAt))}
              </div>
              <p className="text-[9px] text-slate-500 font-medium">Your active session cookie (`li_at`) to authenticate the background Playwright browser.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Twitter API Key</label>
                  <input
                    type="password"
                    value={twitterApiKey}
                    onChange={(e) => setTwitterApiKey(e.target.value)}
                    placeholder="API Key"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Twitter API Secret</label>
                  <input
                    type="password"
                    value={twitterApiSecret}
                    onChange={(e) => setTwitterApiSecret(e.target.value)}
                    placeholder="API Secret"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Twitter Access Token</label>
                  <input
                    type="password"
                    value={twitterAccessToken}
                    onChange={(e) => setTwitterAccessToken(e.target.value)}
                    placeholder="Access Token"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Twitter Access Secret</label>
                  <input
                    type="password"
                    value={twitterAccessSecret}
                    onChange={(e) => setTwitterAccessSecret(e.target.value)}
                    placeholder="Access Secret"
                    className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <span className="text-[9px] text-slate-500 font-medium">Verify credentials</span>
                {renderConnectButton(twitterConnStatus, twitterConnError, () => testConnection('twitter', undefined, {
                  apiKey: twitterApiKey,
                  apiSecret: twitterApiSecret,
                  accessToken: twitterAccessToken,
                  accessSecret: twitterAccessSecret
                }))}
              </div>
            </div>
          </div>
        </div>

        {/* Save button at the bottom */}
        <div className="col-span-1 lg:col-span-2 pt-2">
          <motion.button
            whileHover={{ scale: 1.01, boxShadow: '0px 0px 20px rgba(234, 206, 170, 0.25)' }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={saving}
            className="w-full btn-hud-primary py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all duration-300 disabled:opacity-50 font-mono"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#080C16]" />
                <span>Saving Configurations...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#080C16]" />
                <span>Save All Settings</span>
              </>
            )}
          </motion.button>
        </div>

      </form>
    </motion.div>
  );
};
