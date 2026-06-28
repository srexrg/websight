"use client";

import { useEffect, useRef } from "react";
import { Color, Fog, PerspectiveCamera, Scene, Vector3, Object3D } from "three";
import ThreeGlobe from "three-globe";
import { useThree, Canvas, extend, ThreeElement } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "@/data/globe.json";

extend({ ThreeGlobe });

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElement<typeof ThreeGlobe>;
  }
}

const RING_PROPAGATION_SPEED = 3;
const cameraZ = 300;

type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: {
    lat: number;
    lng: number;
  };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
}

function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(
    shorthandRegex,
    (_m: string, r: string, g: string, b: string) => r + r + g + g + b + b
  );
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function World(props: WorldProps) {
  const { globeConfig, data } = props;
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<Object3D | null>(null);
  const { camera } = useThree();
  const isInitialized = useRef(false);

  const defaultProps = {
    pointSize: 1,
    atmosphereColor: "#ffffff",
    showAtmosphere: true,
    atmosphereAltitude: 0.1,
    polygonColor: "rgba(255,255,255,0.7)",
    globeColor: "#1d072e",
    emissive: "#000000",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    arcTime: 2000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    ...globeConfig,
  };

  useEffect(() => {
    if (!globeRef.current || isInitialized.current) return;
    isInitialized.current = true;

    const arcs = data;
    const points: { lat: number; lng: number; color: string; size: number }[] = [];
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const rgb = hexToRgb(arc.color) ?? { r: 0, g: 0, b: 0 };
      points.push({
        size: defaultProps.pointSize,
        lat: arc.startLat,
        lng: arc.startLng,
        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      });
      points.push({
        size: defaultProps.pointSize,
        lat: arc.endLat,
        lng: arc.endLng,
        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      });
    }

    const filtered = points.filter(
      (v, i, a) =>
        a.findIndex((v2) =>
          ["lat", "lng"].every(
            (k) => v2[k as keyof typeof v2] === v[k as keyof typeof v]
          )
        ) === i
    );

    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);

    globeRef.current
      .arcsData(arcs)
      .arcStartLat((d) => (d as Position).startLat)
      .arcStartLng((d) => (d as Position).startLng)
      .arcEndLat((d) => (d as Position).endLat)
      .arcEndLng((d) => (d as Position).endLng)
      .arcColor((e: object) => (e as Position).color)
      .arcAltitude((e) => (e as Position).arcAlt)
      .arcStroke(() => [0.32, 0.28, 0.3][Math.floor(Math.random() * 3)])
      .arcDashLength(defaultProps.arcLength)
      .arcDashInitialGap((e) => (e as Position).order)
      .arcDashGap(15)
      .arcDashAnimateTime(() => defaultProps.arcTime);

    globeRef.current
      .pointsData(filtered)
      .pointColor((e) => (e as { color: string }).color)
      .pointsMerge(true)
      .pointAltitude(0.0)
      .pointRadius(2);

    globeRef.current
      .ringsData([])
      .ringColor(() => (t: number) => `rgba(14,156,110,${Math.sqrt(1 - t)})`)
      .ringMaxRadius(defaultProps.maxRings)
      .ringPropagationSpeed(RING_PROPAGATION_SPEED)
      .ringRepeatPeriod(
        (defaultProps.arcTime * defaultProps.arcLength) / defaultProps.rings
      );
  }, [
    data,
    defaultProps.arcLength,
    defaultProps.arcTime,
    defaultProps.atmosphereAltitude,
    defaultProps.atmosphereColor,
    defaultProps.maxRings,
    defaultProps.pointSize,
    defaultProps.polygonColor,
    defaultProps.rings,
    defaultProps.showAtmosphere,
  ]);

  useEffect(() => {
    if (!globeRef.current) return;

    const globeMaterial = globeRef.current.globeMaterial();
    // @ts-expect-error three-globe material properties not typed
    globeMaterial.color = new Color(globeConfig.globeColor);
    // @ts-expect-error three-globe material properties not typed
    globeMaterial.emissive = new Color(globeConfig.emissive);
    // @ts-expect-error three-globe material properties not typed
    globeMaterial.emissiveIntensity = globeConfig.emissiveIntensity ?? 0.1;
    // @ts-expect-error three-globe material properties not typed
    globeMaterial.shininess = globeConfig.shininess ?? 0.9;
  }, [globeConfig]);

  useEffect(() => {
    const initCamera = () => {
      const camera3 = camera as PerspectiveCamera;
      camera3.aspect = window.innerWidth / window.innerHeight;
      camera3.updateProjectionMatrix();
    };
    window.addEventListener("resize", initCamera);
    return () => window.removeEventListener("resize", initCamera);
  }, [camera]);

  useEffect(() => {
    if (!globeRef.current || !globeConfig.initialPosition) return;
    const { lat, lng } = globeConfig.initialPosition;
    const coords = globeRef.current.getCoords(lat, lng, 2.5);
    (camera as PerspectiveCamera).position.set(coords.x, coords.y, coords.z);
    (camera as PerspectiveCamera).updateProjectionMatrix();
  }, [camera, globeConfig.initialPosition]);

  return (
    <>
      <threeGlobe ref={globeRef as React.RefObject<ThreeGlobe>} />
      <group ref={groupRef as React.RefObject<Object3D>} />
    </>
  );
}

const fogScene = new Scene();
fogScene.fog = new Fog(0xffffff, 400, 2000);

export function Globe({
  globeConfig,
  data,
}: {
  globeConfig: GlobeConfig;
  data: Position[];
}) {
  return (
    <Canvas
      scene={fogScene}
      camera={new PerspectiveCamera(50, 1, 180, 1800)}
      gl={{ antialias: true, alpha: true }}
    >
      <World globeConfig={globeConfig} data={data} />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight
        color={globeConfig.directionalLeftLight}
        position={new Vector3(-400, 100, 400)}
        intensity={0.8}
      />
      <directionalLight
        color={globeConfig.directionalTopLight}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <pointLight
        color={globeConfig.pointLight}
        position={new Vector3(-200, 500, 200)}
        intensity={8}
      />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotate={globeConfig.autoRotate}
        autoRotateSpeed={globeConfig.autoRotateSpeed ?? 1}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}
