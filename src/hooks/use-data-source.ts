"use client";

import { useSyncExternalStore } from "react";

import type { AuthProfileState, DataMode } from "@/lib/map/types";

const DATA_SOURCE_KEY = "app.dataSource";
const HAS_CHOSEN_DATA_SOURCE_KEY = "app.hasChosenDataSource";
const DATA_SOURCE_CHANGE_EVENT = "app:data-source-change";

export function useDataSource(auth: AuthProfileState) {
  const storedMode = useSyncExternalStore(
    subscribeToDataSource,
    readStoredDataMode,
    () => null,
  );
  const canSwitchDataSource =
    Boolean(auth.userId) &&
    (auth.profile?.role === "owner" || auth.profile?.role === "manager");
  const isEmployee = auth.profile?.role === "employee";

  const dataMode = resolveDataMode({
    auth,
    canSwitchDataSource,
    isEmployee,
    storedMode,
  });

  function setDataMode(mode: DataMode) {
    if (!canSwitchDataSource) return;

    window.localStorage.setItem(DATA_SOURCE_KEY, mode);
    window.localStorage.setItem(HAS_CHOSEN_DATA_SOURCE_KEY, "true");
    window.dispatchEvent(new Event(DATA_SOURCE_CHANGE_EVENT));
  }

  function resetDataSourceChoice() {
    window.localStorage.removeItem(DATA_SOURCE_KEY);
    window.localStorage.removeItem(HAS_CHOSEN_DATA_SOURCE_KEY);
    window.dispatchEvent(new Event(DATA_SOURCE_CHANGE_EVENT));
  }

  return {
    canSwitchDataSource,
    dataMode,
    isEmployee,
    resetDataSourceChoice,
    setDataMode,
  };
}

export function resolveDataMode({
  auth,
  canSwitchDataSource,
  isEmployee,
  storedMode,
}: {
  auth: AuthProfileState;
  canSwitchDataSource: boolean;
  isEmployee: boolean;
  storedMode: DataMode | null;
}): DataMode {
  if (!auth.userId) return "demo";
  if (isEmployee) return "cloud";
  if (!auth.profile) return "cloud";
  if (canSwitchDataSource && storedMode) return storedMode;

  return "cloud";
}

function readStoredDataMode(): DataMode | null {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(DATA_SOURCE_KEY);
  return value === "cloud" || value === "demo" ? value : null;
}

function subscribeToDataSource(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DATA_SOURCE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DATA_SOURCE_CHANGE_EVENT, onStoreChange);
  };
}
