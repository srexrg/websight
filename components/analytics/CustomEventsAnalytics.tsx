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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom events tracked yet</p>
          ) : (
            events.map((event) => (
              <div key={event.event_name} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{event.event_name}</p>
                  {event.message && (
                    <p className="text-sm text-muted-foreground">{event.message}</p>
                  )}
                  {/* <p className="text-sm text-muted-foreground">
                    {event.count} {event.count === 1 ? 'time' : 'times'}
                  </p> */}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}