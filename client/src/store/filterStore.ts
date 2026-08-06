import { create } from 'zustand';

interface FilterState {
  persona: 'student' | 'freelancer';
  platform: 'all' | 'linkedin' | 'twitter' | 'upwork' | 'devto';
  automationActive: boolean;
  setPersona: (persona: 'student' | 'freelancer') => void;
  setPlatform: (platform: 'all' | 'linkedin' | 'twitter' | 'upwork' | 'devto') => void;
  setAutomationActive: (active: boolean) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  persona: 'student',
  platform: 'all',
  automationActive: false,
  setPersona: (persona) => set({ persona }),
  setPlatform: (platform) => set({ platform }),
  setAutomationActive: (automationActive) => set({ automationActive }),
}));
