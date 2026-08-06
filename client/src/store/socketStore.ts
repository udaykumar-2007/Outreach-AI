import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config.js';

interface LogItem {
  id: string;
  event: string;
  text: string;
  timestamp: string;
  data: any;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  logs: LogItem[];
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  clearLogs: () => void;
  addLog: (event: string, text: string, data: any) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  logs: [],

  connectSocket: (token) => {
    // Prevent duplicate connections
    if (get().socket?.connected) return;

    // Check if token is mock
    if (token.startsWith('mock_jwt')) {
      console.log('[Socket] Mock token detected. Simulating Socket connection.');
      set({ isConnected: true });
      return;
    }

    try {
      const socket = io(API_BASE_URL, {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected to backend WS room successfully.');
        set({ isConnected: true, socket });
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from backend WS.');
        set({ isConnected: false });
      });

      socket.on('connect_error', (err) => {
        console.error('[Socket] Connection failed:', err.message);
        set({ isConnected: false });
      });

      // Register agents events
      const events = [
        'LEAD_FOUND',
        'LEAD_SCORED',
        'MESSAGE_SENT',
        'MESSAGE_RECEIVED',
        'SENTIMENT_CLASSIFIED',
        'JOB_FAILED',
        'CAMPAIGN_PAUSED',
        'PORTFOLIO_GENERATED',
      ];

      events.forEach((event) => {
        socket.on(event, (data) => {
          console.log(`[Socket Event] ${event}`, data);
          let logText = '';

          switch (event) {
            case 'LEAD_FOUND':
              logText = `Discovered new lead: ${data.lead?.name || 'Unknown'} on ${data.lead?.platform || 'platform'}`;
              break;
            case 'LEAD_SCORED':
              logText = `Evaluated match for ${data.lead?.name || 'lead'}: Score ${data.lead?.match_score || 0}%`;
              break;
            case 'MESSAGE_SENT':
              logText = `Outbound message sent to ${data.leadId || 'lead'}`;
              break;
            case 'MESSAGE_RECEIVED':
              logText = `Inbound message received from ${data.leadId || 'lead'}`;
              break;
            case 'SENTIMENT_CLASSIFIED':
              logText = `AI classified message sentiment as: ${data.message?.sentiment?.toUpperCase() || 'NEUTRAL'}`;
              break;
            case 'CAMPAIGN_PAUSED':
              logText = `Campaign paused: ${data.reason || 'Manual'}`;
              break;
            case 'JOB_FAILED':
              logText = `Job Failed: ${data.error || 'Unknown error'}`;
              break;
            case 'PORTFOLIO_GENERATED':
              logText = `Portfolio generated successfully. URL slug: ${data.slug}`;
              break;
            default:
              logText = `Event ${event} received.`;
          }

          get().addLog(event, logText, data);
        });
      });

      set({ socket });
    } catch (err) {
      console.error('Socket initialization failed:', err);
    }
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  clearLogs: () => set({ logs: [] }),

  addLog: (event, text, data) => {
    const newLog: LogItem = {
      id: Math.random().toString(36).substring(2, 9),
      event,
      text,
      timestamp: new Date().toLocaleTimeString(),
      data,
    };
    
    set((state) => ({
      logs: [newLog, ...state.logs].slice(0, 100), // Limit feed length to 100 items
    }));
  },
}));
