import React, { useState, useEffect, useRef, Component, ReactNode, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, BookOpen, Layers, Monitor, Star } from 'lucide-react';

// Lazy load R3F 3D Canvas Scene
const Hero3DCanvas = lazy(() => import('../components/Hero3DCanvas.js'));

// ----------------------------------------------------
// Error Boundary to prevent WebGL crashes from breaking React
// ----------------------------------------------------
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('WebGL Context Error caught by boundary. Falling back to CSS 3D Scene:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ----------------------------------------------------
// GPU Accelerated 3D Floating Cubes Fallback Scene
// ----------------------------------------------------
const ThreeDScene: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
      {/* Floating 3D Cubes using GPU Accelerated CSS Transforms */}
      <div className="absolute top-[20%] left-[15%] w-16 h-16 bg-gradient-to-tr from-[#EACEAA]/20 to-[#D39858]/5 border border-[#EACEAA]/30 rounded-2xl animate-bounce backdrop-blur-md" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-[25%] right-[18%] w-24 h-24 bg-gradient-to-br from-[#D39858]/20 to-[#85431E]/5 border border-[#D39858]/30 rounded-3xl animate-pulse backdrop-blur-md" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[50%] right-[35%] w-12 h-12 bg-gradient-to-tr from-white/10 to-[#EACEAA]/10 border border-white/10 rounded-xl animate-spin" style={{ animationDuration: '14s' }} />
      
      {/* Soft Ambient Beams */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#EACEAA]/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

// ----------------------------------------------------
// Stat Counter Component
// ----------------------------------------------------
const StatCounter: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasStarted(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    let start = 0;
    const duration = 1200;
    const increment = Math.ceil(target / 40) || 1;
    const stepTime = Math.floor(duration / (target / increment)) || 20;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [hasStarted, target]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ----------------------------------------------------
// Main Landing Component
// ----------------------------------------------------
export const Landing: React.FC = () => {
  const navigate = useNavigate();

  // First Visit Check: Intro displays ONLY on first visit in session
  const [introStep, setIntroStep] = useState<number>(() => {
    try {
      return sessionStorage.getItem('hasSeenCinematicIntro') ? 3 : 0;
    } catch (e) {
      return 3; // Safe mode fallback: skip intro if storage throws
    }
  });

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);

  const testimonials = [
    { name: 'Sarah Jenkins', role: 'Intern Developer', text: 'The Nothing UI layout makes tracing campaign crawlers feel like an operating system terminal. Outstanding.', rating: 5 },
    { name: 'Marcus Brody', role: 'Freelancer', text: 'Saved API configurations and landed two Upwork slots in a single afternoon. Pure class.', rating: 5 },
    { name: 'Liam Neeson', role: 'CS Student', text: 'Excellent, elegant, and modern. Truly feels like a premium Apple product launch.', rating: 5 },
    { name: 'Elena Rostova', role: 'Dev.to Blogger', text: 'Auto-posting portfolio updates is seamless. The champagne UI elements are gorgeous.', rating: 5 }
  ];

  // Mouse move and scroll handling (Active on Home page ONLY)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Cinematic Intro Sequence (Automatically finishes after 3 seconds)
  useEffect(() => {
    let t1: any, t2: any;

    try {
      t1 = setTimeout(() => setIntroStep(1), 300); // 0.3s: Golden light assembly
      t2 = setTimeout(() => {
        try {
          sessionStorage.setItem('hasSeenCinematicIntro', 'true');
        } catch (e) {}
        setIntroStep(3); // 3.0s: Dissolve overlay and reveal Home page
      }, 3000);
    } catch (err) {
      console.warn('Intro animation timer warning, skipping to Hero:', err);
      setIntroStep(3);
    }

    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0B0F14] text-white selection:bg-[#EACEAA]/20 selection:text-[#EACEAA] overflow-x-hidden">
      
      {/* Custom Cursor (Home Page Only) */}
      <div 
        className={`hidden md:block fixed w-8 h-8 rounded-full border border-[#EACEAA]/40 pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ease-out ${
          cursorHover ? 'scale-[2.2] bg-[#EACEAA]/5 border-[#EACEAA]' : ''
        }`}
        style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
      />
      <div 
        className="hidden md:block fixed w-1.5 h-1.5 rounded-full bg-[#EACEAA] pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
      />

      {/* Cinematic Intro Overlay (First-visit only) */}
      <AnimatePresence>
        {introStep < 3 && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(12px)', scale: 1.05 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-[#0B0F14] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background HUD Grid */}
            <div className="absolute inset-0 hud-grid opacity-[0.15] pointer-events-none" />

            {/* Dual Volumetric Light Beams */}
            <div className="absolute top-1/3 left-1/3 w-[450px] h-[450px] ambient-circle-1 pointer-events-none" />
            <div className="absolute bottom-1/3 right-1/3 w-[450px] h-[450px] ambient-circle-2 pointer-events-none" />

            {/* Glowing Golden Light Assembly */}
            {introStep >= 1 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-6 relative z-10 p-8 rounded-3xl hud-card border-[#EACEAA]/15 bg-[#34150F]/20 backdrop-blur-2xl max-w-sm w-full mx-4 shadow-2xl shadow-black/80"
              >
                {/* Animated Dual Orbital Core */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#EACEAA]/20 animate-spin" style={{ animationDuration: '12s' }} />
                  <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#EACEAA] border-r-[#D39858] animate-spin shadow-lg shadow-amber-500/20" style={{ animationDuration: '1.8s' }} />
                  <div className="absolute inset-3 rounded-full border-2 border-transparent border-b-[#EACEAA] border-l-[#85431E] animate-spin" style={{ animationDuration: '2.5s', animationDirection: 'reverse' }} />

                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#34150F] to-[#0B0F14] border border-[#EACEAA]/40 flex items-center justify-center shadow-xl shadow-amber-500/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#EACEAA]/10 animate-pulse" />
                    <span className="font-mono font-black text-sm text-[#EACEAA] tracking-widest relative z-10">OA</span>
                  </div>
                </div>

                <div className="text-center space-y-1.5 font-mono">
                  <h3 className="text-xs text-[#EACEAA] tracking-[0.25em] uppercase font-black text-white">BOOTSTRAPPING AI OS</h3>
                  <span className="text-[10px] text-[#EACEAA]/70 uppercase tracking-widest font-bold block">OUTREACH AI / V1.0</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Navbar */}
      <header 
        className={`fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl rounded-full hud-glass border-[#EACEAA]/10 px-6 py-3 flex items-center justify-between z-40 transition-all duration-500 ${
          showNavbar ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#EACEAA] to-[#D39858] flex items-center justify-center shrink-0 shadow-md shadow-amber-500/10">
            <span className="font-black text-xs text-[#0B0F14] font-mono">OA</span>
          </div>
          <span className="font-mono text-xs font-black uppercase tracking-wider text-[#EACEAA]">Outreach AI</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {['Features', 'Curriculum', 'Testimonials'].map((link) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase()}`}
              onMouseEnter={() => setCursorHover(true)}
              onMouseLeave={() => setCursorHover(false)}
              className="text-[11px] font-bold text-slate-400 hover:text-[#EACEAA] uppercase tracking-widest transition-colors duration-200"
            >
              {link}
            </a>
          ))}
        </nav>

        <button
          onClick={() => navigate('/login')}
          onMouseEnter={() => setCursorHover(true)}
          onMouseLeave={() => setCursorHover(false)}
          className="px-4 py-1.5 rounded-full border border-[#EACEAA]/20 bg-[#EACEAA]/10 hover:bg-[#EACEAA] text-[#EACEAA] hover:text-[#0B0F14] text-[10px] font-black uppercase tracking-wider transition-all duration-300"
        >
          Operator Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center items-center px-6 overflow-hidden pt-20">
        <div className="absolute inset-0 hud-grid opacity-[0.2] pointer-events-none z-0" />
        
        {/* Lazy Loaded R3F 3D Canvas with WebGL Fallback Safety */}
        <WebGLErrorBoundary fallback={<ThreeDScene />}>
          <Suspense fallback={<ThreeDScene />}>
            <Hero3DCanvas />
          </Suspense>
        </WebGLErrorBoundary>

        <div className="z-10 max-w-4xl text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#EACEAA]" />
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">Autonomous Learning Framework</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1.0 }}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]"
          >
            THE FUTURISTIC <br />
            <span className="gold-header">AI OPERATING SYSTEM</span> <br />
            FOR STUDENT OPPORTUNITIES
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-medium"
          >
            Accelerate your career. Index matching internships, submit AI-customized proposals, and publish technical portfolio articles automatically under one Nothing OS dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4"
          >
            <button
              onClick={() => navigate('/login')}
              onMouseEnter={() => setCursorHover(true)}
              onMouseLeave={() => setCursorHover(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-full btn-hud-primary text-[#0B0F14] font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-amber-500/10"
            >
              <span>Bootstrap Kernel</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#features"
              onMouseEnter={() => setCursorHover(true)}
              onMouseLeave={() => setCursorHover(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/8 hover:border-[#EACEAA]/30 bg-white/[0.01] hover:bg-white/[0.04] text-slate-300 text-xs font-black uppercase tracking-widest text-center transition-all"
            >
              Explore Features
            </a>
          </motion.div>
        </div>
      </section>

      {/* Feature Section with Viewport Scroll Reveals */}
      <section id="features" className="py-24 px-8 relative max-w-6xl mx-auto space-y-16">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-3"
        >
          <span className="text-[9px] font-mono font-black text-[#EACEAA] uppercase tracking-widest font-mono">Platform Core Architecture</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight gold-header">ENGINEERING ADVANTAGES</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-medium">Highly optimized algorithms routing your portfolio details to live developer streams.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Playwright Scrapers', desc: 'Secure local session crawlers index recruitment listings in real-time, completely bypassing bot detection.', icon: Monitor },
            { title: 'Gemini Proposals', desc: 'Synthesizes matching keywords and drafts tailored pitches with precise matching score thresholds.', icon: Layers },
            { title: 'Dev.to Publisher', desc: 'Pushes educational blogs and announcements to author channels automatically.', icon: BookOpen }
          ].map((feat, idx) => (
            <motion.div 
              key={feat.title}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="hud-card p-6 border-white/8 bg-[#34150F]/20 flex flex-col justify-between h-56 relative overflow-hidden group hover:border-[#EACEAA]/30 transition-all"
            >
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl w-fit text-[#EACEAA]">
                <feat.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-white">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Curriculum Showcase with Viewport Scroll Reveals */}
      <section id="curriculum" className="py-24 px-8 relative border-t border-white/5 max-w-6xl mx-auto space-y-16">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-3"
        >
          <span className="text-[9px] font-mono font-black text-[#EACEAA] uppercase tracking-widest font-mono">Skill Upgrading Core</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight gold-header">OS CURRICULUM STREAM</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'React 19 & Next.js Performance', instructor: 'Gemini Core Planner', progress: 90, difficulty: 'Intermediate', duration: '12 Classes' },
            { title: 'TypeScript Deep Typing & Metaprogramming', instructor: 'AI Copilot Assistant', progress: 75, difficulty: 'Advanced', duration: '18 Classes' }
          ].map((course, idx) => (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="hud-card p-6 border-white/8 bg-[#34150F]/20 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:border-[#D39858]/30 transition-all"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[9px] font-black bg-[#EACEAA]/10 text-[#EACEAA] border border-[#EACEAA]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">{course.difficulty}</span>
                  <h3 className="font-extrabold text-sm text-white mt-3 group-hover:text-[#EACEAA] transition-colors">{course.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Instructor: {course.instructor}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-bold font-mono">{course.duration}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  <span>Match rating completeness</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#D39858] to-[#EACEAA]" style={{ width: `${course.progress}%` }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Infinite Auto-scroll */}
      <section id="testimonials" className="py-24 border-t border-white/5 overflow-hidden relative space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-3 px-8"
        >
          <span className="text-[9px] font-mono font-black text-[#EACEAA] uppercase tracking-widest font-mono">Live Reviews feed</span>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight gold-header">OPERATOR FEEDBACK</h2>
        </motion.div>

        <div className="flex w-[200%] gap-4 animate-scroll-testimonials">
          <div className="flex justify-around gap-4 w-1/2">
            {testimonials.map((test, i) => (
              <div key={i} className="hud-card p-6 border-white/8 bg-[#34150F]/20 w-80 shrink-0 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{test.name}</h4>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">{test.role}</span>
                  </div>
                  <div className="flex gap-0.5 text-[#EACEAA]">
                    {[...Array(test.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">"{test.text}"</p>
              </div>
            ))}
          </div>

          <div className="flex justify-around gap-4 w-1/2">
            {testimonials.map((test, i) => (
              <div key={`dup-${i}`} className="hud-card p-6 border-white/8 bg-[#34150F]/20 w-80 shrink-0 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{test.name}</h4>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">{test.role}</span>
                  </div>
                  <div className="flex gap-0.5 text-[#EACEAA]">
                    {[...Array(test.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">"{test.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section with Viewport Scroll Reveals */}
      <section className="py-24 px-8 border-t border-white/5 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { target: 450, suffix: '+', label: 'CAMPAIGNS MONITORED' },
          { target: 98, suffix: '%', label: 'ACCURACY EVALUATED' },
          { target: 1200, suffix: '+', label: 'PROPOSALS TRANSMITTED' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center space-y-2"
          >
            <h3 className="text-4xl sm:text-5xl font-mono font-black text-[#EACEAA] tracking-tight">
              <StatCounter target={stat.target} suffix={stat.suffix} />
            </h3>
            <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase font-mono">{stat.label}</p>
          </motion.div>
        ))}
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 px-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-500 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">Outreach AI OS</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-4">
          <a href="#features" className="hover:text-white transition-colors">FEATURES</a>
          <a href="#curriculum" className="hover:text-white transition-colors">CURRICULUM</a>
          <a href="#testimonials" className="hover:text-white transition-colors">REVIEWS</a>
        </div>
      </footer>

    </div>
  );
};
export default Landing;
