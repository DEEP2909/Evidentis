"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth";
import { getAccessToken } from "@/lib/api";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

interface DocumentEvent {
  type: "processing_started" | "processing_progress" | "processing_completed" | "processing_failed";
  documentId: string;
  documentName?: string;
  progress?: number;
  stage?: string;
  error?: string;
}

interface MatterEvent {
  type: "matter_updated" | "document_added" | "obligation_due";
  matterId: string;
  data?: Record<string, unknown>;
}

interface NotificationEvent {
  type: "notification";
  title: string;
  message: string;
  severity?: "info" | "success" | "warning" | "error";
}

type WebSocketEvent = DocumentEvent | MatterEvent | NotificationEvent;

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (event: string, callback: (data: WebSocketEvent) => void) => () => void;
  emit: <T = unknown>(event: string, payload?: T) => void;
  documentProgress: Map<string, { progress: number; stage: string }>;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: WebSocketEvent) => void>>>(
    new Map()
  );
  const subscribersRef = useRef(subscribers);
  const [documentProgress, setDocumentProgress] = useState<Map<string, { progress: number; stage: string }>>(
    new Map()
  );

  useEffect(() => {
    subscribersRef.current = subscribers;
  }, [subscribers]);

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      setSocket((existingSocket) => {
        existingSocket?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    // Determine Socket.IO host (without /ws suffix)
    const configuredUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL;
    const socketHost = configuredUrl
      ? configuredUrl.replace(/^ws/i, "http").replace(/\/ws\/?$/, "")
      : window.location.origin;
    const token = getAccessToken() ?? localStorage.getItem("evidentis_access_token");

    const ws = io(socketHost, {
      path: "/ws",
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });

    ws.on("connect", () => {
      setIsConnected(true);
    });

    const notifySubscribers = (eventType: string, payload: WebSocketEvent) => {
      const typedSubscribers = subscribersRef.current.get(eventType);
      if (typedSubscribers) {
        for (const callback of typedSubscribers) {
          callback(payload);
        }
      }
      const allSubscribers = subscribersRef.current.get("*");
      if (allSubscribers) {
        for (const callback of allSubscribers) {
          callback(payload);
        }
      }
    };

    ws.on("document:event", (rawEvent: unknown) => {
      if (!rawEvent || typeof rawEvent !== "object") {
        return;
      }
      const event = rawEvent as {
        documentId?: unknown;
        fileName?: unknown;
        progress?: unknown;
        status?: unknown;
        error?: unknown;
      };
      const documentId = typeof event.documentId === "string" ? event.documentId : "";
      if (!documentId) {
        return;
      }

      const status = typeof event.status === "string" ? event.status : "";
      if (status === "processing") {
        setDocumentProgress((prev) => {
          const next = new Map(prev);
          next.set(documentId, {
            progress: typeof event.progress === "number" ? event.progress : 0,
            stage: "Processing",
          });
          return next;
        });
      } else if (status === "processed") {
        setDocumentProgress((prev) => {
          const next = new Map(prev);
          next.delete(documentId);
          return next;
        });
        toast.success(
          `Document processed: ${typeof event.fileName === "string" ? event.fileName : "Document"}`
        );
      } else if (status === "failed") {
        setDocumentProgress((prev) => {
          const next = new Map(prev);
          next.delete(documentId);
          return next;
        });
        toast.error(
          `Processing failed: ${typeof event.error === "string" ? event.error : "Unknown error"}`
        );
      }

      notifySubscribers(
        "document:event",
        {
          type:
            status === "processed"
              ? "processing_completed"
              : status === "failed"
                ? "processing_failed"
                : "processing_progress",
          documentId,
          documentName: typeof event.fileName === "string" ? event.fileName : undefined,
          progress: typeof event.progress === "number" ? event.progress : undefined,
          stage: "Processing",
          error: typeof event.error === "string" ? event.error : undefined,
        } satisfies DocumentEvent
      );
    });

    ws.on("processing:progress", (rawEvent: unknown) => {
      if (!rawEvent || typeof rawEvent !== "object") {
        return;
      }
      const event = rawEvent as { documentId?: unknown; progress?: unknown; stage?: unknown };
      const documentId = typeof event.documentId === "string" ? event.documentId : "";
      if (!documentId) {
        return;
      }
      const progress = typeof event.progress === "number" ? event.progress : 0;
      const stage = typeof event.stage === "string" ? event.stage : "Processing";
      setDocumentProgress((prev) => {
        const next = new Map(prev);
        next.set(documentId, { progress, stage });
        return next;
      });
      notifySubscribers(
        "processing:progress",
        { type: "processing_progress", documentId, progress, stage } satisfies DocumentEvent
      );
    });

    ws.on("matter:event", (rawEvent: unknown) => {
      if (!rawEvent || typeof rawEvent !== "object") {
        return;
      }
      const event = rawEvent as Record<string, unknown>;
      const matterId =
        typeof event.matterId === "string"
          ? event.matterId
          : typeof event.matter_id === "string"
            ? event.matter_id
            : "";
      if (!matterId) {
        return;
      }
      notifySubscribers(
        "matter:event",
        {
          type: "matter_updated",
          matterId,
          data: event,
        } satisfies MatterEvent
      );
    });

    ws.on("obligation:reminder", (rawEvent: unknown) => {
      if (!rawEvent || typeof rawEvent !== "object") {
        return;
      }
      const event = rawEvent as Record<string, unknown>;
      const matterId =
        typeof event.matterId === "string"
          ? event.matterId
          : typeof event.matter_id === "string"
            ? event.matter_id
            : "";
      if (!matterId) {
        return;
      }
      notifySubscribers(
        "obligation:reminder",
        {
          type: "obligation_due",
          matterId,
          data: event,
        } satisfies MatterEvent
      );
    });

    ws.on("notification", (rawEvent: unknown) => {
      if (!rawEvent || typeof rawEvent !== "object") {
        return;
      }
      const event = rawEvent as Record<string, unknown>;
      const severityRaw = typeof event.type === "string" ? event.type : "info";
      const severity =
        severityRaw === "success" || severityRaw === "warning" || severityRaw === "error"
          ? severityRaw
          : "info";
      const title = typeof event.title === "string" ? event.title : "Notification";
      const message = typeof event.message === "string" ? event.message : "";

      switch (severity) {
        case "success":
          toast.success(title, { description: message });
          break;
        case "warning":
          toast.warning(title, { description: message });
          break;
        case "error":
          toast.error(title, { description: message });
          break;
        default:
          toast.info(title, { description: message });
      }

      notifySubscribers(
        "notification",
        { type: "notification", title, message, severity } satisfies NotificationEvent
      );
    });

    ws.on("disconnect", () => {
      setIsConnected(false);
    });

    ws.on("connect_error", (error) => {
      const message = typeof error?.message === "string" ? error.message : "";
      // Auth failures should be visible; transient transport retries should remain quiet.
      if (message.toLowerCase().includes("auth")) {
        console.warn("[WebSocket] Authentication failed.");
        toast.error("Realtime connection failed", {
          description: "Please sign in again to restore live updates.",
        });
      }
    });

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      ws.removeAllListeners();
      ws.disconnect();
    };
  }, [isAuthenticated, user]);

  const emit = useCallback(
    <T,>(event: string, payload?: T) => {
      if (!socket || !isConnected) {
        return;
      }
      socket.emit(event, payload);
    },
    [socket, isConnected]
  );

  const subscribe = useCallback(
    (event: string, callback: (data: WebSocketEvent) => void) => {
      setSubscribers((prev) => {
        const next = new Map(prev);
        if (!next.has(event)) {
          next.set(event, new Set());
        }
        next.get(event)?.add(callback);
        return next;
      });

      // Return unsubscribe function
      return () => {
        setSubscribers((prev) => {
          const next = new Map(prev);
          const eventSet = next.get(event);
          if (eventSet) {
            eventSet.delete(callback);
            if (eventSet.size === 0) {
              next.delete(event);
            }
          }
          return next;
        });
      };
    },
    []
  );

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, emit, documentProgress }}>
      {children}
    </WebSocketContext.Provider>
  );
}
