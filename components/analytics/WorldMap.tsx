'use client'

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { countryCoordinates } from "@/lib/country-coordinates"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CountryStats {
  country: string;
  visits: number;
}

interface WorldMapProps {
  data: CountryStats[];
  className?: string;
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

export function WorldMap({ data, className }: WorldMapProps) {
  const maxVisits = Math.max(...data.map(d => d.visits))

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>User Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[400px] relative">
          <ComposableMap
            projectionConfig={{
              rotate: [0, 0, 0],
              scale: 170,
              center: [0, 0]
            }}
            width={800}
            height={400}
            style={{
              width: "100%",
              height: "auto"
            }}
          >
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#EAEAEC"
                      stroke="#D6D6DA"
                      style={{
                        default: {
                          outline: "none",
                        },
                        hover: {
                          fill: "#F5F4F9",
                          outline: "none",
                        },
                        pressed: {
                          outline: "none",
                        },
                      }}
                    />
                  ))
                }
              </Geographies>
              <TooltipProvider>
                {data.map(({ country, visits }) => {
                  const countryCode = country.toUpperCase()
                  const coordinates = countryCoordinates[countryCode]
                  
                  if (!coordinates) return null

                  return (
                    <Tooltip key={countryCode}>
                      <TooltipTrigger asChild>
                        <Marker coordinates={coordinates}>
                          <circle
                            r={Math.max(4, (visits / maxVisits) * 20)}
                            fill="#2563EB"
                            fillOpacity={0.6}
                            stroke="#fff"
                            strokeWidth={1}
                          />
                        </Marker>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{country}: {visits} visits</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </TooltipProvider>
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </CardContent>
    </Card>
  )
}