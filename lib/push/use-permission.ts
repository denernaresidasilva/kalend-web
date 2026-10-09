"use client";
import { useSyncExternalStore } from "react";
import { readPushPermission, subscribePushPermission, type PushPermission } from "./permission";
const serverPermission = (): PushPermission => "unsupported";
export function usePushPermission() {
  return useSyncExternalStore(subscribePushPermission, readPushPermission, serverPermission);
}
