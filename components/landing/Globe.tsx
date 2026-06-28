interface DotConfig {
  top: string;
  left: string;
  delay: string;
}

interface GlobeProps {
  size?: number;
  dots?: DotConfig[];
}

const DEFAULT_DOTS: DotConfig[] = [
  { top: '28%', left: '32%', delay: '0s' },
  { top: '22%', left: '54%', delay: '.4s' },
  { top: '38%', left: '70%', delay: '.9s' },
  { top: '56%', left: '44%', delay: '.2s' },
  { top: '33%', left: '82%', delay: '.7s' },
  { top: '48%', left: '24%', delay: '1.2s' },
  { top: '62%', left: '60%', delay: '.6s' },
];

export default function Globe({ size = 320, dots = DEFAULT_DOTS }: GlobeProps) {
  // Unique gradient ID per instance (supports multiple Globes on the same page)
  const gradId = `globeSphere_${size}`;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <radialGradient id={gradId} cx="38%" cy="30%" r="80%">
            <stop offset="0" stopColor="#F0FBF6" />
            <stop offset="58%" stopColor="#E4F6ED" />
            <stop offset="100%" stopColor="#CDEBDC" />
          </radialGradient>
        </defs>

        {/* Sphere body */}
        <circle cx="50" cy="50" r="46" fill={`url(#${gradId})`} stroke="#B6E3CB" strokeWidth="0.7" />

        {/* Latitude ellipses (horizontal graticules) */}
        <ellipse cx="50" cy="50" rx="46" ry="11" fill="none" stroke="#AADCC2" strokeWidth="0.4" />
        <ellipse cx="50" cy="50" rx="46" ry="24" fill="none" stroke="#B8E4D0" strokeWidth="0.4" />
        <ellipse cx="50" cy="50" rx="46" ry="37" fill="none" stroke="#C2E9D6" strokeWidth="0.35" />

        {/* Longitude ellipses (vertical graticules) */}
        <ellipse cx="50" cy="50" rx="11" ry="46" fill="none" stroke="#AADCC2" strokeWidth="0.4" />
        <ellipse cx="50" cy="50" rx="24" ry="46" fill="none" stroke="#B8E4D0" strokeWidth="0.4" />
        <ellipse cx="50" cy="50" rx="37" ry="46" fill="none" stroke="#C2E9D6" strokeWidth="0.35" />

        {/* Equator line */}
        <line x1="4" y1="50" x2="96" y2="50" stroke="#AADCC2" strokeWidth="0.4" />
      </svg>

      {/* Pulsing marker dots */}
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: dot.top,
            left: dot.left,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Halo ring - uses wsPulse keyframe from globals.css */}
          <div
            className="bg-brand"
            style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              opacity: 0.5,
              animation: 'wsPulse 2.6s ease-out infinite',
              animationDelay: dot.delay,
            }}
          />
          {/* Solid core dot */}
          <div
            className="bg-brand"
            style={{
              position: 'relative',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              boxShadow: '0 0 0 2.5px #fff',
            }}
          />
        </div>
      ))}
    </div>
  );
}
