'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formatDistanceToNow } from 'date-fns'

interface TrackedEvent {
  event_name: string
  message?: string
  created_at: string
}

interface CustomEventsAnalyticsProps {
  events: TrackedEvent[]
}

export function CustomEventsAnalytics({ events }: CustomEventsAnalyticsProps) {
  return (
    <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">Custom Events</CardTitle>
        <span className="text-sm text-zinc-400">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-zinc-400">
                No custom events tracked yet
              </p>
            </div>
          ) : (
            events.map((event, index) => (
              <div
                key={`${event.event_name}-${index}-${event.created_at}`}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{event.event_name}</p>
                    <span className="text-xs text-zinc-500">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {event.message && (
                    <p className="text-sm text-zinc-400">
                      {event.message}
                    </p>
                  )}
                </div>
                <div className="h-2 w-2 rounded-full bg-violet-500" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}