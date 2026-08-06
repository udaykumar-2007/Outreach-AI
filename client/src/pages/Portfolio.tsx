import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config.js';
import { 
  Sparkles, 
  Plus, 
  Trash, 
  Eye, 
  Loader2, 
  ExternalLink,
  ClipboardCheck,
  Clipboard,
  Briefcase
} from 'lucide-react';

interface WorkSample {
  title: string;
  description: string;
  technologies: string[];
  url?: string;
}

export const Portfolio: React.FC = () => {
  const { session, profile, updateProfile } = useAuthStore();

  const [samples, setSamples] = useState<WorkSample[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const [generating, setGenerating] = useState(false);
  const [slug, setSlug] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoposting, setAutoposting] = useState(false);

  const loadPortfolioConfig = async () => {
    if (!session) return;
    if (profile?.work_samples) {
      setSamples(profile.work_samples as WorkSample[]);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolio/my/config`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSlug(data.slug || '');
        setIsPublished(data.published || false);
        setHtmlCode(data.html_content || '');
        setCssCode(data.css_content || '');
      }
    } catch (err) {
      console.error('Failed to load portfolio config:', err);
    }
  };

  useEffect(() => {
    loadPortfolioConfig();
  }, [session]);

  const handleAddSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const techArray = newTech
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated = [
      ...samples,
      {
        title: newTitle.trim(),
        description: newDesc.trim(),
        technologies: techArray,
        url: newUrl.trim() || undefined,
      },
    ];

    setSamples(updated);
    updateProfile({ work_samples: updated });

    setNewTitle('');
    setNewDesc('');
    setNewTech('');
    setNewUrl('');
  };

  const handleRemoveSample = (index: number) => {
    const updated = samples.filter((_, i) => i !== index);
    setSamples(updated);
    updateProfile({ work_samples: updated });
  };

  const handleGeneratePortfolio = async () => {
    if (!session) return;
    setGenerating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolio/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          work_samples: samples,
          theme: 'dark',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSlug(data.slug);
        setIsPublished(true);
        setHtmlCode(data.html_content);
        setCssCode(data.css_content);
      } else {
        const fallbackSlug = (profile?.full_name || 'user').toLowerCase().replace(/\s+/g, '-');
        setSlug(fallbackSlug);
        setIsPublished(true);
        setHtmlCode(getFallbackHtml(profile, samples));
        setCssCode(getFallbackCss());
      }
    } catch (err) {
      const fallbackSlug = (profile?.full_name || 'user').toLowerCase().replace(/\s+/g, '-');
      setSlug(fallbackSlug);
      setIsPublished(true);
      setHtmlCode(getFallbackHtml(profile, samples));
      setCssCode(getFallbackCss());
    } finally {
      setGenerating(false);
    }
  };

  const handleDevToAutopost = async () => {
    if (!session) return;
    setAutoposting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/portfolio/devto-autopost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: `${profile?.full_name || 'Developer'} Portfolio Launch & Career Summary`,
          tags: ['javascript', 'webdev', 'career', 'react'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully published portfolio announcement to Dev.to! Article URL: ${data.url}`);
      } else {
        const err = await res.json();
        alert(`Dev.to auto-post failed: ${err.message || 'Check Dev.to API Key in Settings'}`);
      }
    } catch (err) {
      alert('Failed to connect to Dev.to service. Please verify your server connection.');
    } finally {
      setAutoposting(false);
    }
  };

  const handleCopyUrl = () => {
    const publicUrl = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex-1 bg-[#0B0F14] text-white p-8 overflow-y-auto h-screen space-y-8 relative pb-24"
    >
      <div className="absolute inset-0 hud-grid opacity-[0.1] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h2 className="text-2xl font-black tracking-tight gold-header">Web Presence Generator</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Synthesize work samples, generate hosted web portfolios, and publish technical articles to Dev.to.</p>
        </div>

        <div className="flex gap-2">
          {isPublished && (
            <button
              onClick={handleDevToAutopost}
              disabled={autoposting}
              className="px-4 py-2 rounded-xl border border-[#EACEAA]/20 bg-[#EACEAA]/10 hover:bg-[#EACEAA] text-[#EACEAA] hover:text-[#0B0F14] text-xs font-black transition-all flex items-center gap-2"
            >
              {autoposting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Publish to Dev.to</span>
            </button>
          )}

          <button
            onClick={handleGeneratePortfolio}
            disabled={generating || samples.length === 0}
            className="btn-hud-primary px-5 py-2 rounded-xl text-xs flex items-center gap-2 font-black transition-all disabled:opacity-50 shadow-lg shadow-amber-500/10"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling Portfolio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Compile AI Web Presence</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Left Col: Work Samples & Add Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Add Sample Form */}
          <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Briefcase className="w-4 h-4 text-[#EACEAA]" />
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">Add Work Sample / Case Study</h3>
            </div>

            <form onSubmit={handleAddSample} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Project Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Autonomous Scraper Engine"
                    className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Project URL (Optional)</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Description & Key Contributions</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Engineered high-performance Playwright crawlers and Node.js microservices..."
                  rows={2}
                  className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Technologies (Comma separated)</label>
                <input
                  type="text"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  placeholder="React, TypeScript, Playwright, PostgreSQL"
                  className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl border border-[#EACEAA]/20 bg-[#EACEAA]/10 hover:bg-[#EACEAA] text-[#EACEAA] hover:text-[#0B0F14] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Work Sample to Portfolio</span>
              </button>
            </form>
          </div>

          {/* Current Samples List */}
          <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider font-mono">Indexed Case Studies ({samples.length})</h3>

            {samples.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic font-mono">
                No work samples added yet. Use the form above to add projects.
              </div>
            ) : (
              <div className="space-y-3">
                {samples.map((sample, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-white/10 transition-all flex justify-between items-start group"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-white group-hover:text-[#EACEAA] transition-colors">{sample.title}</h4>
                        {sample.url && (
                          <a href={sample.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{sample.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {sample.technologies.map((t) => (
                          <span key={t} className="text-[9px] font-mono bg-white/[0.03] text-[#EACEAA] border border-[#EACEAA]/20 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveSample(idx)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Col: Live Preview Link & HTML Code */}
        <div className="space-y-6">
          {isPublished && (
            <div className="hud-card p-6 border-[#EACEAA]/20 bg-[#EACEAA]/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-black text-[#EACEAA] uppercase tracking-widest">LIVE PORTFOLIO ACTIVE</span>
                <span className="w-2 h-2 rounded-full bg-[#EACEAA] animate-pulse" />
              </div>

              <div className="p-3 bg-[#0B0F14] border border-white/8 rounded-xl flex items-center justify-between font-mono text-xs">
                <span className="text-slate-300 truncate mr-2">/portfolio/{slug}</span>
                <button onClick={handleCopyUrl} className="text-[#EACEAA] hover:text-white transition-colors shrink-0">
                  {copied ? <ClipboardCheck className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                </button>
              </div>

              <a
                href={`/portfolio/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="w-full btn-hud-primary py-2.5 rounded-xl text-xs uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2"
              >
                <span>View Public Portfolio Page</span>
                <Eye className="w-4 h-4" />
              </a>
            </div>
          )}

          <div className="hud-card p-6 border-white/8 bg-[#34150F]/20 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider font-mono">Compiled Code Output</h3>

            <div className="space-y-3 font-mono text-[10px]">
              <div>
                <span className="text-slate-500 block mb-1">HTML Component Markup</span>
                <div className="h-32 bg-[#0B0F14] border border-white/5 rounded-xl p-3 text-slate-400 overflow-y-auto whitespace-pre">
                  {htmlCode || '<!-- Click "Compile AI Web Presence" to generate HTML markup -->'}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">CSS Design Tokens</span>
                <div className="h-32 bg-[#0B0F14] border border-white/5 rounded-xl p-3 text-slate-400 overflow-y-auto whitespace-pre">
                  {cssCode || '/* CSS design tokens compiled automatically */'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

function getFallbackHtml(profile: any, samples: WorkSample[]) {
  return `<div class="portfolio-container">
  <h1>${profile?.full_name || 'User'}</h1>
  <p>${profile?.role === 'freelancer' ? 'Software Integration Engineer' : 'Computer Science Student'}</p>
  <div class="samples">
    ${samples.map((s) => `<div class="sample-card"><h3>${s.title}</h3><p>${s.description}</p></div>`).join('\n    ')}
  </div>
</div>`;
}

function getFallbackCss() {
  return `.portfolio-container { background: #0B0F14; color: #FFFFFF; font-family: sans-serif; padding: 40px; }
.sample-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(234, 206, 170, 0.2); border-radius: 12px; padding: 20px; margin-top: 16px; }`;
}
