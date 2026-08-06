import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config.js';

interface PortfolioData {
  html_code: string;
  css_code: string;
  slug: string;
}

export const PublicPortfolio: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicPortfolio = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/portfolio/${slug}`, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPortfolio(data);
        } else {
          // Provide fallback demo portfolio if portfolio isn't found on backend
          setPortfolio({
            slug: slug || 'demo',
            css_code: `
              .demo-portfolio { font-family: sans-serif; padding: 2rem; color: #f8fafc; max-width: 800px; margin: 0 auto; text-align: center; }
              .demo-header { font-size: 2.5rem; font-weight: 900; background: linear-gradient(to right, #EACEAA, #D39858); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
              .demo-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 1rem; margin-top: 1.5rem; text-align: left; }
            `,
            html_code: `
              <div class="demo-portfolio">
                <h1 class="demo-header">User Portfolio (${slug})</h1>
                <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem;">Autonomous Outreach AI Generated Showcase</p>
                <div class="demo-card">
                  <h3 style="font-[#EACEAA]; font-weight: 700; margin-bottom: 0.5rem;">Featured Projects & Skills</h3>
                  <p style="color: #cbd5e1; font-size: 0.85rem; line-height: 1.6;">Fullstack developer specializing in AI orchestration, headless browser automation, and high-converting outreach systems.</p>
                </div>
              </div>
            `,
          });
        }
      } catch (err) {
        console.error('Failed to load portfolio from API:', err);
        // Fallback for standalone/mock deployment when backend server is offline
        setPortfolio({
          slug: slug || 'demo',
          css_code: `
            .demo-portfolio { font-family: system-ui, sans-serif; padding: 3rem 1.5rem; color: #f8fafc; max-width: 800px; margin: 0 auto; text-align: center; }
            .demo-header { font-size: 2.5rem; font-weight: 900; background: linear-gradient(to right, #EACEAA, #D39858); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .demo-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 1rem; margin-top: 1.5rem; text-align: left; }
          `,
          html_code: `
            <div class="demo-portfolio">
              <h1 class="demo-header">User Portfolio</h1>
              <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem;">Portfolio Slug: ${slug}</p>
              <div class="demo-card">
                <h3 style="color: #EACEAA; font-weight: 700; margin-bottom: 0.5rem;">AI Engineering & Automation Showcase</h3>
                <p style="color: #cbd5e1; font-size: 0.85rem; line-height: 1.6;">Fullstack developer & operator specializing in AI orchestration, scraper automation, and full-funnel outreach systems.</p>
              </div>
            </div>
          `,
        });
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPublicPortfolio();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#EACEAA] animate-spin" />
        <p className="text-xs text-slate-400 mt-4 font-bold tracking-wider font-mono uppercase">Fetching Web Layout...</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex flex-col items-center justify-center p-4">
        <div className="hud-card max-w-md p-8 border-red-500/20 bg-[#34150F]/20 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-black text-white tracking-tight">Portfolio Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">Unable to locate portfolio slug.</p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-bold text-slate-300 uppercase tracking-wider transition-colors"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {/* Inject custom CSS generated by portfolio compiler */}
      {portfolio.css_code && <style>{portfolio.css_code}</style>}

      {/* Render custom compiled HTML */}
      <div 
        dangerouslySetInnerHTML={{ __html: portfolio.html_code }}
      />
    </div>
  );
};
