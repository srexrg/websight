"use client";

import dynamic from "next/dynamic";

const World = dynamic(
  () => import("@/components/ui/globe").then((m) => m.Globe),
  { ssr: false }
);

const globeConfig = {
  pointSize: 2,
  globeColor: "#0A241B",
  showAtmosphere: true,
  atmosphereColor: "#5FD3A6",
  atmosphereAltitude: 0.16,
  emissive: "#0A241B",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "rgba(125,230,185,0.62)",
  ambientLight: "#6FE0AE",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 22.3193, lng: 114.1694 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

const colors = ["#5FD3A6", "#ffffff", "#34D399"];

const sampleArcs = [
  { order: 1, startLat: -19.885592, startLng: -43.951191, endLat: -15.595412, endLng: -35.294643, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 1, startLat: 28.6139, startLng: 77.209, endLat: 3.139, endLng: 101.6869, arcAlt: 0.2, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 1, startLat: -19.885592, startLng: -43.951191, endLat: -1.303396, endLng: 36.80272, arcAlt: 0.5, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 1, startLat: 1.3521, startLng: 103.8198, endLat: 35.6762, endLng: 139.6503, arcAlt: 0.2, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 2, startLat: 51.5072, startLng: -0.1276, endLat: 3.139, endLng: 101.6869, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 2, startLat: 11.986597, startLng: 8.571831, endLat: 35.6762, endLng: 139.6503, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 2, startLat: -15.595412, startLng: -35.294643, endLat: -33.8688, endLng: 151.2093, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 3, startLat: -33.8688, startLng: 151.2093, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.2, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 3, startLat: 21.3099, startLng: -157.8581, endLat: 40.7128, endLng: -74.006, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 3, startLat: -6.2088, startLng: 106.8456, endLat: 51.5072, endLng: -0.1276, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 4, startLat: 11.986597, startLng: 8.571831, endLat: -15.595412, endLng: -35.294643, arcAlt: 0.5, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 4, startLat: -34.6037, startLng: -58.3816, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.7, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 5, startLat: 51.5072, startLng: -0.1276, endLat: 0.1807, endLng: 37.9083, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 5, startLat: 51.5072, startLng: -0.1276, endLat: 34.047, endLng: -118.243, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 5, startLat: 22.3193, startLng: 114.1694, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 6, startLat: 25.0343, startLng: 121.5654, endLat: -33.8688, endLng: 151.2093, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 6, startLat: 40.7128, startLng: -74.006, endLat: 34.047, endLng: -118.243, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 7, startLat: -19.885592, startLng: -43.951191, endLat: -15.595412, endLng: -35.294643, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 7, startLat: 48.8566, startLng: 2.3522, endLat: 52.52, endLng: 13.405, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 8, startLat: 1.3521, startLng: 103.8198, endLat: 40.7128, endLng: -74.006, arcAlt: 0.5, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 8, startLat: 51.5072, startLng: -0.1276, endLat: 48.8566, endLng: 2.3522, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 9, startLat: 22.3193, startLng: 114.1694, endLat: -22.9068, endLng: -43.1729, arcAlt: 0.7, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 9, startLat: 34.047, startLng: -118.243, endLat: 40.7128, endLng: -74.006, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 10, startLat: -22.9068, startLng: -43.1729, endLat: 28.6139, endLng: 77.209, arcAlt: 0.7, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 10, startLat: 34.047, startLng: -118.243, endLat: 31.2304, endLng: 121.4737, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 11, startLat: 41.0082, startLng: 28.9784, endLat: 40.7128, endLng: -74.006, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 11, startLat: 28.6139, startLng: 77.209, endLat: 22.3193, endLng: 114.1694, arcAlt: 0.2, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 12, startLat: -19.885592, startLng: -43.951191, endLat: 2.0469, endLng: 45.3182, arcAlt: 0.7, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 12, startLat: 37.5665, startLng: 126.978, endLat: 35.6762, endLng: 139.6503, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 13, startLat: -22.9068, startLng: -43.1729, endLat: -34.6037, endLng: -58.3816, arcAlt: 0.1, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 13, startLat: 37.5665, startLng: 126.978, endLat: 1.3521, endLng: 103.8198, arcAlt: 0.2, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 14, startLat: 22.3193, startLng: 114.1694, endLat: 40.7128, endLng: -74.006, arcAlt: 0.5, color: colors[Math.floor(Math.random() * colors.length)] },
  { order: 14, startLat: 51.5072, startLng: -0.1276, endLat: 28.6139, endLng: 77.209, arcAlt: 0.3, color: colors[Math.floor(Math.random() * colors.length)] },
];

export default function InteractiveGlobe() {
  return (
    <div className="relative w-full h-[400px] md:h-[480px]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 47%, #07180F 0%, rgba(7,24,16,0.94) 26%, rgba(7,24,16,0) 60%)",
        }}
      />
      <div className="absolute inset-0">
        <World data={sampleArcs} globeConfig={globeConfig} />
      </div>
    </div>
  );
}
