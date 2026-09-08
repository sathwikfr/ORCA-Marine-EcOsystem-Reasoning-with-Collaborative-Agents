// frontend/src/store/alertStore.js
import { create } from 'zustand';

export const useAlertStore = create((set, get) => ({
  alerts: [],
  activeCount: 0,

  setAlerts: (alerts) =>
    set({ alerts, activeCount: alerts.filter((a) => a.is_active).length }),

  addAlert: (alert) =>
    set((s) => ({
      alerts: [alert, ...s.alerts],
      activeCount: s.activeCount + (alert.is_active ? 1 : 0),
    })),

  updateAlert: (alertId, patch) =>
    set((s) => ({
      alerts: s.alerts.map((a) =>
        a.alert_id === alertId ? { ...a, ...patch } : a
      ),
    })),
}));
