import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useFilterStore } from '../store/filterStore.js';
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

  // Campaign configurations
  const [targetRole, setTargetRole] = useState('');
  const [keywords, setKeywords] = useState('');
  const [activeLinkedIn, setActiveLinkedIn] = useState(true);
  const [activeTwitter, setActiveTwitter] = useState(true);
  const [activeUpwork, setActiveUpwork] = useState(true);

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

      const platforms = profile.active_platforms || { linkedin: true, twitter: true, upwork: true };
      setActiveLinkedIn(platforms.linkedin !== false);
      setActiveTwitter(platforms.twitter !== false);
      setActiveUpwork(platforms.upwork !== false);

      const keys = (profile as any).api_keys || {};
      setLinkedinLiAt(keys.linkedin_li_at || '');
      setTwitterApiKey(keys.twitter_api_key || '');
      setTwitterApiSecret(keys.twitter_api_secret || '');
      setTwitterAccessToken(keys.twitter_access_token || '');
      setTwitterAccessSecret(keys.twitter_access_secret || '');
      setDevtoApiKey(keys.devto_api_key || '');
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
      const res = await fetch('http://localhost:5000/api/campaigns', {
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

    // 1. Update Profile details
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
      },
      api_keys: {
        linkedin_li_at: linkedinLiAt || null,
        twitter_api_key: twitterApiKey || null,
        twitter_api_secret: twitterApiSecret || null,
        twitter_access_token: twitterAccessToken || null,
        twitter_access_secret: twitterAccessSecret || null,
        devto_api_key: devtoApiKey || null,
      },
    } as any);

    if (!profileSuccess) {
      setErrorMsg('Failed to update core profile settings.');
      setSaving(false);
      return;
    }

    // Keep global filter store persona in sync
    setPersona(role);

    // 2. Save active Campaign settings
    if (session && !session.access_token.startsWith('mock_jwt')) {
      try {
        const activePlatforms: string[] = [];
        if (activeLinkedIn) activePlatforms.push('linkedin');
        if (activeTwitter) activePlatforms.push('twitter');
        if (activeUpwork) activePlatforms.push('upwork');

        // Create campaign for each active platform
        for (const plat of activePlatforms) {
          await fetch('http://localhost:5000/api/campaigns', {
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
    
    // Auto clear success indicator
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 bg-slate-950 p-8 overflow-y-auto h-screen space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Outreach Settings</h2>
        <p className="text-sm text-slate-400">Configure target keywords, active platforms, and automate freelancer busy replies.</p>
      </div>

      {/* Success/Error blocks */}
      {savedSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3.5 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Settings saved successfully. Scanner jobs updated.</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-4 py-3.5 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Core Profile Settings */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Profile Customization</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Persona Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="student">Student</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>

            {/* Freelancer busy buffer settings */}
            {role === 'freelancer' && (
              <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Freelancer Busy Mode</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Auto-apologize to leads, asking them to wait ~2 days.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBusy(!isBusy)}
                    className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                      isBusy ? 'bg-emerald-600' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                      isBusy ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Short Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Talk about what you build and solve..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Skills (comma separated)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, TypeScript, Node.js"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Campaign Automation Settings */}
        <div className="space-y-8">
          
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Settings2 className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-base text-white">Outreach Automation Config</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Recruiter/Client Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Technical Recruiter or Engineering Lead"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Keywords (comma separated)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="React, Frontend, Hiring, Contract"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Checkboxes for active channels */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Active Outreach Channels</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={activeLinkedIn}
                      onChange={(e) => setActiveLinkedIn(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800"
                    />
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">LinkedIn crawler</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={activeTwitter}
                      onChange={(e) => setActiveTwitter(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800"
                    />
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Twitter/X direct monitor</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-850 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={activeUpwork}
                      onChange={(e) => setActiveUpwork(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800"
                    />
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Upwork search bids</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Integrations & API Keys Panel */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">API Keys & Integrations</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dev.to & LinkedIn */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dev.to API Key</label>
                <input
                  type="password"
                  value={devtoApiKey}
                  onChange={(e) => setDevtoApiKey(e.target.value)}
                  placeholder="Enter your Dev.to Developer API Key"
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Used to automatically publish technical portfolio announcement articles.</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">LinkedIn li_at Cookie</label>
                <input
                  type="password"
                  value={linkedinLiAt}
                  onChange={(e) => setLinkedinLiAt(e.target.value)}
                  placeholder="AQEDAVtN0PUAKP..."
                  className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">Your active session cookie (`li_at`) to authenticate the Playwright background bot.</p>
              </div>
            </div>

            {/* Twitter API Keys */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Twitter API Key</label>
                  <input
                    type="password"
                    value={twitterApiKey}
                    onChange={(e) => setTwitterApiKey(e.target.value)}
                    placeholder="API Key"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Twitter API Secret</label>
                  <input
                    type="password"
                    value={twitterApiSecret}
                    onChange={(e) => setTwitterApiSecret(e.target.value)}
                    placeholder="API Secret"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Twitter Access Token</label>
                  <input
                    type="password"
                    value={twitterAccessToken}
                    onChange={(e) => setTwitterAccessToken(e.target.value)}
                    placeholder="Access Token"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Twitter Access Secret</label>
                  <input
                    type="password"
                    value={twitterAccessSecret}
                    onChange={(e) => setTwitterAccessSecret(e.target.value)}
                    placeholder="Access Secret"
                    className="w-full bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Save Button at the bottom */}
        <div className="col-span-1 lg:col-span-2 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 transition-all duration-200"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving Configurations...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
