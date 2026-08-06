import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Globe, AlertCircle } from 'lucide-react';

interface PortfolioData {
  html_code: string;
  css_code: string;
  slug: string;
}

export const PublicPortfolio: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicPortfolio = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/portfolio/${slug}`, {
          headers: {
            Accept: 'application/json', // fetch JSON payload
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPortfolio(data);
        } else {
          setError('This portfolio is either private, not published, or does not exist.');
        }
      } catch (err) {
        console.error('Failed to load portfolio:', err);
        setError('Network connection failed. Could not load portfolio site.');
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-400 mt-4 font-semibold tracking-wider font-mono">Fetching Web Layout...</p>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="font-extrabold text-xl text-white">Portfolio Unavailable</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          <a
            href="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
          >
            Go to Portal
          </a>
        </div>
      </div>
    );
  }

  // Combine HTML and CSS inside the iframe doc preview
  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${portfolio.slug} | Portfolio</title>
        <style>
          ${portfolio.css_code}
        </style>
      </head>
      <body>
        ${portfolio.html_code}
      </body>
    </html>
  `;

  return (
    <div className="w-screen h-screen relative bg-slate-900">
      <iframe
        srcDoc={iframeSrcDoc}
        title={`${portfolio.slug} portfolio`}
        className="w-full h-full border-none"
      />
      
      {/* Floating brand badge */}
      <div className="absolute bottom-4 right-4 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all select-none">
        <Globe className="w-3.5 h-3.5 text-indigo-400" />
        <span>Published with Outreach AI</span>
      </div>
    </div>
  );
};
