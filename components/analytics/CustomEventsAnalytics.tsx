'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

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
    <Card>
      <CardHeader>
        <CardTitle>Custom Events</CardTitle>
        <span className="text-sm text-muted-foreground">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom events tracked yet
            </p>
          ) : (
            events.map((event, index) => (
              <div
                key={`${event.event_name}-${index}-${event.created_at}`}
                className="flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{event.event_name}</p>
                  {event.message && (
                    <p className="text-sm text-muted-foreground">
                      {event.message}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}