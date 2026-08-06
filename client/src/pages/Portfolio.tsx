import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useSocketStore } from '../store/socketStore.js';
import { 
  Sparkles, 
  Plus, 
  Trash, 

  Eye, 
  Loader2, 
  ExternalLink,
  ClipboardCheck,
  Clipboard
} from 'lucide-react';

interface WorkSample {
  title: string;
  description: string;
  technologies: string[];
  url?: string;
}

export const Portfolio: React.FC = () => {
  const { session, profile, updateProfile } = useAuthStore();
  const { socket } = useSocketStore();

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

  // Load profile work samples and portfolio config
  const loadPortfolioConfig = async () => {
    if (!session) return;
    if (profile?.work_samples) {
      setSamples(profile.work_samples as WorkSample[]);
    }

    try {
      const res = await fetch('http://localhost:5000/api/portfolio/my/config', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSlug(data.slug || '');
        setIsPublished(data.is_published || false);
        setHtmlCode(data.html_code || '');
        setCssCode(data.css_code || '');
      } else {
        // Mock fallback
        setSlug('mock-designer');
        setIsPublished(true);
        setHtmlCode(getMockPortfolioHtml());
        setCssCode(getMockPortfolioCss());
      }
    } catch (e) {
      setSlug('mock-designer');
      setIsPublished(true);
      setHtmlCode(getMockPortfolioHtml());
      setCssCode(getMockPortfolioCss());
    }
  };

  useEffect(() => {
    loadPortfolioConfig();
  }, [session, profile]);

  // Listen for portfolio generation success from background worker via socket
  useEffect(() => {
    if (!socket) return;

    socket.on('PORTFOLIO_GENERATED', (data: { slug: string; is_published: boolean; message: string }) => {
      console.log('[Socket] Portfolio generated successfully:', data);
      setGenerating(false);
      loadPortfolioConfig(); // Reload new html/css
    });

    return () => {
      socket.off('PORTFOLIO_GENERATED');
    };
  }, [socket]);

  // Add work sample
  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const techArray = newTech.split(',').map(t => t.trim()).filter(Boolean);
    const newSample: WorkSample = {
      title: newTitle,
      description: newDesc,
      technologies: techArray,
      url: newUrl || undefined,
    };

    const updatedSamples = [...samples, newSample];
    setSamples(updatedSamples);

    // Save profile to db
    await updateProfile({ work_samples: updatedSamples });

    // Clear form
    setNewTitle('');
    setNewDesc('');
    setNewTech('');
    setNewUrl('');
  };

  // Remove work sample
  const handleRemoveSample = async (index: number) => {
    const updated = samples.filter((_, i) => i !== index);
    setSamples(updated);
    await updateProfile({ work_samples: updated });
  };

  // Call portfolio generation endpoint
  const handleGenerate = async () => {
    if (samples.length === 0) {
      alert('Please add at least one project/work sample first.');
      return;
    }
    if (!session) return;

    setGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/portfolio/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        // Local simulation fallback
        setTimeout(() => {
          setHtmlCode(getMockPortfolioHtml());
          setCssCode(getMockPortfolioCss());
          setGenerating(false);
        }, 3000);
      }
    } catch (e) {
      // Offline fallback
      setTimeout(() => {
        setHtmlCode(getMockPortfolioHtml());
        setCssCode(getMockPortfolioCss());
        setGenerating(false);
      }, 3000);
    }
  };

  // Toggle publish state
  const handleTogglePublish = async (publish: boolean) => {
    if (!session) return;
    setIsPublished(publish);
    try {
      await fetch('http://localhost:5000/api/portfolio/publish', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_published: publish, slug }),
      });
    } catch (e) {
      console.error('Failed to update publish settings:', e);
    }
  };

  const shareUrl = `http://localhost:5000/api/portfolio/${slug}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Combine HTML and CSS inside the iframe doc preview
  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          ${cssCode || 'body { background: #0f172a; color: #94a3b8; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }'}
        </style>
      </head>
      <body>
        ${htmlCode || '<div style="text-align: center;"><h1>No Portfolio Generated</h1><p>Add projects and click Generate above to build your web portfolio website!</p></div>'}
      </body>
    </html>
  `;

  return (
    <div className="flex-1 bg-slate-950 p-8 overflow-y-auto h-screen space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Web Presence Generator</h2>
          <p className="text-sm text-slate-400">Design your personal responsive web portfolio automatically using Gemini AI models.</p>
        </div>
        
        {/* Generate Trigger */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-600/10 active:scale-98 transition-all duration-200 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating Portfolio...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 fill-current animate-pulse" />
              <span>Generate Web Portfolio</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Side: Work Samples Management */}
        <div className="space-y-8">
          
          {/* Add Work Sample Form */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-lg text-white">Add Project / Work Sample</h3>
            <form onSubmit={handleAddSample} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Outreach AI Core"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Demo URL (Optional)</label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Describe your role and impact..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Technologies (comma separated)</label>
                <input
                  type="text"
                  value={newTech}
                  onChange={(e) => setNewTech(e.target.value)}
                  placeholder="React, TypeScript, Node.js"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Work Sample</span>
              </button>
            </form>
          </div>

          {/* List of projects */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white px-1">Your Work Samples ({samples.length})</h3>
            {samples.length === 0 ? (
              <p className="text-sm text-slate-500 italic px-1">No projects registered. Add one above to construct your portfolio index.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {samples.map((sample, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{sample.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3">{sample.description}</p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {sample.technologies.map(t => (
                          <span key={t} className="text-[9px] font-semibold bg-slate-950 text-indigo-400 px-2 py-0.5 rounded border border-slate-850">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-850">
                      {sample.url ? (
                        <a href={sample.url} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
                          <span>Demo Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span />}
                      <button
                        onClick={() => handleRemoveSample(idx)}
                        className="text-rose-500 hover:text-rose-400 p-1 hover:bg-rose-500/5 rounded transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Preview & Settings */}
        <div className="space-y-6 flex flex-col h-full">
          
          {/* Share links */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Publish Settings</h3>
              
              {/* Publish Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Published</span>
                <button
                  onClick={() => handleTogglePublish(!isPublished)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                    isPublished ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    isPublished ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Shareable Public Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  placeholder="portfolio-slug"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
                
                <button
                  onClick={copyToClipboard}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                >
                  {copied ? <ClipboardCheck className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl flex items-center justify-center transition-colors font-bold text-xs"
                >
                  <Eye className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[10px] text-slate-500 italic font-mono truncate">{shareUrl}</p>
            </div>
          </div>

          {/* IFrame Screen Preview */}
          <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <span className="text-xs text-slate-400 font-bold ml-2 font-mono truncate">{slug}.outreach.ai</span>
            </div>
            <iframe
              srcDoc={iframeSrcDoc}
              title="Live Portfolio Preview"
              className="flex-1 w-full bg-slate-900"
            />
          </div>

        </div>

      </div>

    </div>
  );
};

// Fallback HTML preview details
function getMockPortfolioHtml() {
  return `
    <div class="portfolio-wrap">
      <header class="hero">
        <h1>Jane Developer</h1>
        <p class="subtitle">Fullstack Architect | Web presence</p>
        <p class="bio">Building clean SaaS interfaces, database engines, and automated microservice workflows.</p>
      </header>
      <section class="skills-sec">
        <h2>Developer Toolkit</h2>
        <div class="skills-grid">
          <span class="skill-pill">React</span>
          <span class="skill-pill">TypeScript</span>
          <span class="skill-pill">Node.js</span>
          <span class="skill-pill">Playwright</span>
          <span class="skill-pill">Postgres</span>
        </div>
      </section>
    </div>
  `;
}

function getMockPortfolioCss() {
  return `
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
      background: #090d16;
      color: #cbd5e1;
      display: flex;
      justify-content: center;
      padding: 40px 20px;
    }
    .portfolio-wrap { max-width: 600px; width: 100%; }
    .hero { text-align: center; padding: 40px 0; border-bottom: 1px solid #1e293b; }
    .hero h1 { font-size: 2.5rem; margin: 0 0 8px 0; color: #ffffff; background: linear-gradient(to right, #6366f1, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;}
    .subtitle { font-size: 1.1rem; color: #6366f1; margin: 0 0 15px 0; font-weight: bold; }
    .bio { line-height: 1.6; color: #94a3b8; }
    .skills-sec { padding: 30px 0; }
    .skills-sec h2 { font-size: 1.5rem; color: white; margin-top: 0; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill-pill { background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
  `;
}
