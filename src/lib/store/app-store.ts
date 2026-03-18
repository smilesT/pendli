import { create } from 'zustand';
import type { Appointment, UserConfig, DayPlan } from '../../types/index.ts';
import { calculateDayPlan } from '../planner/route-calculator.ts';
import { v4 as uuidv4 } from 'uuid';

export type AppStep = 'setup' | 'import' | 'plan' | 'result';

interface AppState {
  // Config
  config: UserConfig | null;
  setConfig: (config: UserConfig) => void;

  // Appointments
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  removeAppointment: (id: string) => void;

  // Day Plan
  dayPlan: DayPlan | null;
  isCalculating: boolean;
  calculationProgress: string;
  calculatePlan: () => Promise<void>;

  // UI State
  currentStep: AppStep;
  setStep: (step: AppStep) => void;

  // Demo data
  loadDemoData: () => void;
}

const DEFAULT_CONFIG: UserConfig = {
  homeAddress: {
    name: 'Zürich Altstetten',
    latitude: 47.3914,
    longitude: 8.4889,
    station: 'Zürich Altstetten',
    stationId: '8503001',
  },
  workAddress: {
    name: 'Zürich, ETH/Universitätsspital',
    latitude: 47.3763,
    longitude: 8.5483,
    station: 'Zürich, ETH/Universitätsspital',
    stationId: '8591123',
  },
  workSchedule: {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: '08:00',
    endTime: '17:00',
  },
  bufferMinutes: 10,
};

const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: uuidv4(),
    title: 'Team Standup',
    startTime: new Date(2026, 2, 18, 9, 0),
    endTime: new Date(2026, 2, 18, 10, 0),
    location: 'ETH Zürich, Rämistrasse 101, 8092 Zürich',
  },
  {
    id: uuidv4(),
    title: 'Kundentermin',
    startTime: new Date(2026, 2, 18, 11, 30),
    endTime: new Date(2026, 2, 18, 12, 30),
    location: 'Paradeplatz, 8001 Zürich',
  },
  {
    id: uuidv4(),
    title: 'Zahnarzt',
    startTime: new Date(2026, 2, 18, 14, 0),
    endTime: new Date(2026, 2, 18, 15, 0),
    location: 'Marktgasse 12, 3011 Bern',
  },
  {
    id: uuidv4(),
    title: 'Fussball-Training',
    startTime: new Date(2026, 2, 18, 17, 30),
    endTime: new Date(2026, 2, 18, 18, 30),
    location: 'Sportanlage Buchlern, Zürich',
  },
  {
    id: uuidv4(),
    title: 'Kino mit Freunden',
    startTime: new Date(2026, 2, 18, 20, 0),
    endTime: new Date(2026, 2, 18, 22, 0),
    location: 'Arena Cinemas Sihlcity, Zürich',
  },
];

export const useAppStore = create<AppState>((set, get) => ({
  // Config
  config: null,
  setConfig: (config) => set({ config }),

  // Appointments
  appointments: [],
  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
    })),
  removeAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== id),
    })),

  // Day Plan
  dayPlan: null,
  isCalculating: false,
  calculationProgress: '',

  calculatePlan: async () => {
    if (get().isCalculating) return;
    const { config, appointments } = get();
    if (!config || appointments.length === 0) return;

    set({ isCalculating: true, calculationProgress: 'Starte Berechnung...', currentStep: 'plan' });

    try {
      const plan = await calculateDayPlan(
        appointments,
        config,
        (message) => set({ calculationProgress: message })
      );
      set({ dayPlan: plan, isCalculating: false, currentStep: 'result' });
    } catch (error) {
      set({
        isCalculating: false,
        currentStep: 'import',
        calculationProgress: `Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`,
      });
    }
  },

  // UI State
  currentStep: 'setup',
  setStep: (step) => set({ currentStep: step }),

  // Demo data
  loadDemoData: () => {
    set({
      config: DEFAULT_CONFIG,
      appointments: DEMO_APPOINTMENTS.map((a) => ({ ...a, id: uuidv4() })),
      currentStep: 'import',
    });
  },
}));
