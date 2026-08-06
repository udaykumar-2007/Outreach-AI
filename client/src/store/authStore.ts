import { createClient, User, Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { API_BASE_URL } from '../config.js';

// Setup Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if we should run in mock mode
const isMockMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || import.meta.env.VITE_USE_MOCK_AUTH === 'true';

export const supabase = !isMockMode ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (isMockMode) {
  console.log('Outreach AI Auth: Supabase credentials not found. Operating in developer Mock Auth Mode.');
}

interface Profile {
  id: string;
  full_name: string;
  role: 'student' | 'freelancer';
  bio: string;
  skills: string[];
  work_samples: Array<{
    title: string;
    description: string;
    technologies?: string[];
    url?: string;
  }>;
  is_busy: boolean;
  active_platforms: {
    linkedin: boolean;
    twitter: boolean;
    upwork: boolean;
  };
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isMock: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, fullName: string, role: 'student' | 'freelancer') => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => Promise<boolean>;
}

// Generate a mock JWT token
function generateMockToken(userId: string) {
  return `mock_jwt_header.${btoa(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 36000 }))}.mock_signature`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isMock: isMockMode,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    
    if (isMockMode) {
      // Check localStorage for mock session
      const savedUser = localStorage.getItem('outreach_mock_user');
      const savedProfile = localStorage.getItem('outreach_mock_profile');
      let user = savedUser ? JSON.parse(savedUser) : null;
      let profile = savedProfile ? JSON.parse(savedProfile) : null;

      if (!user || !profile) {
        user = user || {
          id: 'mock-user-uuid-12345678',
          email: 'developer@domain.com',
          user_metadata: { full_name: 'Jane Developer', role: 'freelancer' },
        };
        profile = profile || {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Jane Developer',
          role: user.user_metadata?.role || 'freelancer',
          bio: 'Fullstack developer specializing in AI orchestration and automation.',
          skills: ['React', 'TypeScript', 'Node.js', 'Playwright', 'Gemini'],
          work_samples: [
            { title: 'Portfolio Generator', description: 'Scaffolds web pages dynamically.', technologies: ['TypeScript', 'Gemini'] },
            { title: 'Crawler Service', description: 'Headless browser crawler built with Playwright.', technologies: ['Node.js', 'Playwright'] },
          ],
          is_busy: false,
          active_platforms: { linkedin: true, twitter: true, upwork: true },
        };
        localStorage.setItem('outreach_mock_user', JSON.stringify(user));
        localStorage.setItem('outreach_mock_profile', JSON.stringify(profile));
      }

      set({
        user,
        profile,
        session: {
          access_token: generateMockToken(user.id),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock_refresh',
          user: user as any,
        } as any,
      });
      set({ isLoading: false });
      return;
    }

    try {
      // Real Supabase Auth Init
      const { data: { session } } = await supabase!.auth.getSession();
      if (session) {
        set({ session, user: session.user });
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase!.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          set({ session, user: session.user });
          await get().fetchProfile();
        } else {
          set({ session: null, user: null, profile: null });
        }
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to initialize session' });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    if (isMockMode) {
      const mockUser = {
        id: 'mock-user-uuid-12345678',
        email,
        user_metadata: { full_name: 'Jane Developer', role: 'freelancer' },
      };
      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: 'Jane Developer',
        role: 'freelancer',
        bio: 'Fullstack developer specializing in AI orchestration and automation.',
        skills: ['React', 'TypeScript', 'Node.js', 'Playwright', 'Gemini'],
        work_samples: [
          { title: 'Portfolio Generator', description: 'Scaffolds web pages dynamically.', technologies: ['TypeScript', 'Gemini'] },
          { title: 'Crawler Service', description: 'Headless browser crawler built with Playwright.', technologies: ['Node.js', 'Playwright'] },
        ],
        is_busy: false,
        active_platforms: { linkedin: true, twitter: true, upwork: true },
      };

      localStorage.setItem('outreach_mock_user', JSON.stringify(mockUser));
      localStorage.setItem('outreach_mock_profile', JSON.stringify(mockProfile));

      set({
        user: mockUser as any,
        profile: mockProfile,
        session: {
          access_token: generateMockToken(mockUser.id),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock_refresh',
          user: mockUser as any,
        } as any,
        isLoading: false,
      });
      return true;
    }

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      await get().fetchProfile();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  signup: async (email, password, fullName, role) => {
    set({ isLoading: true, error: null });

    if (isMockMode) {
      const mockUser = {
        id: 'mock-user-uuid-12345678',
        email,
        user_metadata: { full_name: fullName, role },
      };
      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: fullName,
        role,
        bio: '',
        skills: [],
        work_samples: [],
        is_busy: false,
        active_platforms: { linkedin: true, twitter: true, upwork: true },
      };

      localStorage.setItem('outreach_mock_user', JSON.stringify(mockUser));
      localStorage.setItem('outreach_mock_profile', JSON.stringify(mockProfile));

      set({
        user: mockUser as any,
        profile: mockProfile,
        session: {
          access_token: generateMockToken(mockUser.id),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock_refresh',
          user: mockUser as any,
        } as any,
        isLoading: false,
      });
      return true;
    }

    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      if (data.session) {
        await get().fetchProfile();
      }
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Signup failed', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    if (isMockMode) {
      localStorage.removeItem('outreach_mock_user');
      localStorage.removeItem('outreach_mock_profile');
      set({ session: null, user: null, profile: null, isLoading: false });
      return;
    }

    await supabase!.auth.signOut();
    set({ session: null, user: null, profile: null, isLoading: false });
  },

  fetchProfile: async () => {
    const session = get().session;
    if (!session) return;

    if (isMockMode) {
      const savedProfile = localStorage.getItem('outreach_mock_profile');
      if (savedProfile) {
        set({ profile: JSON.parse(savedProfile) });
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const profile = await response.json();
        set({ profile });
      } else {
        console.error('Failed to retrieve profile API');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  },

  updateProfile: async (profileData) => {
    const session = get().session;
    if (!session) return false;

    set({ isLoading: true });

    if (isMockMode) {
      const currentProfile = get().profile || {
        id: get().user?.id || 'mock-user-uuid-12345678',
        full_name: 'Jane Developer',
        role: 'freelancer',
        bio: 'Fullstack developer specializing in AI orchestration and automation.',
        skills: ['React', 'TypeScript', 'Node.js', 'Playwright', 'Gemini'],
        work_samples: [],
        is_busy: false,
        active_platforms: { linkedin: true, twitter: true, upwork: true },
      };
      
      const updatedProfile = { ...currentProfile, ...profileData };
      const currentUser = get().user;
      let updatedUser = currentUser;

      if (currentUser) {
        updatedUser = {
          ...currentUser,
          user_metadata: {
            ...currentUser.user_metadata,
            full_name: updatedProfile.full_name,
            role: updatedProfile.role,
          },
        };
        localStorage.setItem('outreach_mock_user', JSON.stringify(updatedUser));
      }

      localStorage.setItem('outreach_mock_profile', JSON.stringify(updatedProfile));
      set({ profile: updatedProfile as any, user: updatedUser as any, isLoading: false });
      return true;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const profile = await response.json();
        const currentUser = get().user;
        let updatedUser = currentUser;
        if (currentUser && profile.full_name) {
          updatedUser = {
            ...currentUser,
            user_metadata: {
              ...currentUser.user_metadata,
              full_name: profile.full_name,
              role: profile.role,
            },
          };
        }
        set({ profile, user: updatedUser, isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (err: any) {
      console.error('Profile update error:', err);
      set({ error: err.message || 'Profile update failed', isLoading: false });
      return false;
    }
  },
}));
export { isMockMode };
