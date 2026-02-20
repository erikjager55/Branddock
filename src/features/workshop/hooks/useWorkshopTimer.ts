import { useEffect, useRef, useCallback } from "react";
import { useWorkshopStore } from "../store/useWorkshopStore";
import { syncTimer } from "../api/workshop.api";

const SYNC_INTERVAL = 30; // Sync every 30 seconds

export function useWorkshopTimer(workshopId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef(0);

  const {
    timerRunning,
    timerSeconds,
    startTimer,
    stopTimer,
    tickTimer,
    setTimerSeconds,
  } = useWorkshopStore();

  // Timer tick logic
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        tickTimer();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerRunning, tickTimer]);

  // Sync to server every 30 seconds
  useEffect(() => {
    if (!workshopId || !timerRunning) return;

    if (timerSeconds > 0 && timerSeconds - lastSyncRef.current >= SYNC_INTERVAL) {
      lastSyncRef.current = timerSeconds;
      syncTimer(workshopId, timerSeconds).catch(() => {
        // Silent fail — timer continues locally
      });
    }
  }, [workshopId, timerRunning, timerSeconds]);

  const toggle = useCallback(() => {
    if (timerRunning) {
      stopTimer();
      // Sync on pause
      if (workshopId && timerSeconds > 0) {
        syncTimer(workshopId, timerSeconds).catch(() => {});
      }
    } else {
      startTimer();
    }
  }, [timerRunning, stopTimer, startTimer, workshopId, timerSeconds]);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);

  return {
    timerRunning,
    timerSeconds,
    formattedTime: formatTime(timerSeconds),
    toggle,
    setTimerSeconds,
  };
}
