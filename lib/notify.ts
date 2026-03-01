/**
 * Rocky Notification Bus
 * Uses BroadcastChannel API for cross-tab communication
 * and a simple event emitter for same-tab communication.
 */

import type { Incident } from "./types";

const CHANNEL_NAME = "rocky-notifications";

type NotificationListener = (incident: Incident) => void;

// Same-tab listeners
const listeners = new Set<NotificationListener>();

// Cross-tab channel (created lazily)
let bc: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
    if (typeof window === "undefined") return null;
    if (!bc) {
        try {
            bc = new BroadcastChannel(CHANNEL_NAME);
            bc.onmessage = (ev) => {
                if (ev.data?.type === "rocky-incident") {
                    const inc = ev.data.incident as Incident;
                    // Notify all same-tab listeners about cross-tab incident
                    listeners.forEach((fn) => fn(inc));
                }
            };
        } catch {
            // BroadcastChannel not supported (e.g. some Safari versions)
            return null;
        }
    }
    return bc;
}

/**
 * Call this whenever a new incident is created (from LiveMonitor, heartrate, etc.)
 * It broadcasts to all tabs AND notifies same-tab listeners.
 */
export function broadcastIncident(incident: Incident) {
    // Same-tab listeners
    listeners.forEach((fn) => fn(incident));

    // Cross-tab via BroadcastChannel
    const channel = getBroadcastChannel();
    if (channel) {
        channel.postMessage({ type: "rocky-incident", incident });
    }
}

/**
 * Subscribe to incident notifications (same-tab + cross-tab).
 * Returns an unsubscribe function.
 */
export function onIncidentNotification(fn: NotificationListener): () => void {
    listeners.add(fn);

    // Ensure BroadcastChannel is initialized to receive cross-tab messages
    getBroadcastChannel();

    return () => {
        listeners.delete(fn);
    };
}
