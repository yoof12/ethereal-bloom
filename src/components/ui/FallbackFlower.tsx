import styles from "./fallback.module.css";

interface Ring {
  count: number;
  length: number;
  width: number;
  gradient: string;
  opacity: number;
  offset: number;
}

const RINGS: Ring[] = [
  { count: 9, length: 218, width: 66, gradient: "outer", opacity: 0.72, offset: 0 },
  { count: 11, length: 182, width: 57, gradient: "mid", opacity: 0.82, offset: 15 },
  { count: 13, length: 142, width: 46, gradient: "inner", opacity: 0.9, offset: 28 },
  { count: 10, length: 98, width: 34, gradient: "heart", opacity: 0.96, offset: 42 },
];

function petalPath(length: number, width: number) {
  const waist = length * 0.34;
  return `M 0 0 C ${width} ${-waist}, ${width * 0.86} ${-length * 0.72}, 0 ${-length} C ${-width * 0.86} ${-length * 0.72}, ${-width} ${-waist}, 0 0 Z`;
}

export function FallbackFlower() {
  return (
    <div className={styles.stage}>
      <div className={styles.halo} aria-hidden="true" />

      <svg
        className={styles.flower}
        viewBox="0 0 720 760"
        role="img"
        aria-label="A luminous violet flower with a golden centre"
      >
        <defs>
          <radialGradient id="bloom-outer" cx="50%" cy="78%" r="80%">
            <stop offset="0%" stopColor="#3c1d86" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#6b4bd6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#bcd4ff" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="bloom-mid" cx="50%" cy="82%" r="85%">
            <stop offset="0%" stopColor="#402085" stopOpacity="0.92" />
            <stop offset="55%" stopColor="#8a5ae8" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#e3c3ff" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="bloom-inner" cx="50%" cy="85%" r="85%">
            <stop offset="0%" stopColor="#4c2088" stopOpacity="0.94" />
            <stop offset="55%" stopColor="#ad66e4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffc8ee" stopOpacity="0.85" />
          </radialGradient>
          <radialGradient id="bloom-heart" cx="50%" cy="88%" r="90%">
            <stop offset="0%" stopColor="#6b2b80" stopOpacity="0.96" />
            <stop offset="55%" stopColor="#d279c9" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#ffe2c0" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="bloom-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6de" />
            <stop offset="28%" stopColor="#ffd28a" />
            <stop offset="62%" stopColor="#ff9f45" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff7a2e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bloom-core-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffcb85" stopOpacity="0.42" />
            <stop offset="45%" stopColor="#ff9548" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ff7a2e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bloom-stem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3e8a72" />
            <stop offset="55%" stopColor="#1d4b44" />
            <stop offset="100%" stopColor="#071b19" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform="translate(360 412)">
          <path
            d="M -5 40 C -12 170, -26 280, -14 360"
            fill="none"
            stroke="url(#bloom-stem)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M -10 250 C -70 232, -108 200, -126 168 C -82 172, -38 200, -10 250 Z"
            fill="#1d5c46"
            opacity="0.6"
          />
          <path
            d="M -6 300 C 40 286, 74 258, 92 228 C 52 236, 18 260, -6 300 Z"
            fill="#174b3a"
            opacity="0.5"
          />

          <g className={styles.petals}>
            {RINGS.map((ring) => (
              <g key={ring.gradient} opacity={ring.opacity}>
                {Array.from({ length: ring.count }, (_, index) => {
                  const angle =
                    (index / ring.count) * 360 + ring.offset + (index % 2) * 3.5;
                  const scale = 0.94 + ((index * 7) % 5) * 0.02;
                  return (
                    <path
                      key={index}
                      d={petalPath(ring.length, ring.width)}
                      fill={`url(#bloom-${ring.gradient})`}
                      transform={`rotate(${angle}) scale(${scale})`}
                      stroke="rgba(255, 214, 240, 0.16)"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            ))}

            <circle r="88" fill="url(#bloom-core-halo)" />
            <circle r="52" fill="url(#bloom-core)" />

            <g className={styles.stamens} stroke="#ffd79b" strokeWidth="1.6">
              {Array.from({ length: 26 }, (_, index) => {
                const angle = (index / 26) * Math.PI * 2;
                const length = 34 + (index % 4) * 6;
                return (
                  <line
                    key={index}
                    x1={Math.cos(angle) * 12}
                    y1={Math.sin(angle) * 12}
                    x2={Math.cos(angle) * length}
                    y2={Math.sin(angle) * length}
                    opacity={0.55}
                  />
                );
              })}
            </g>
            <circle r="10" fill="#fff3d2" />
          </g>
        </g>
      </svg>

      <span className={styles.note}>Static preview · WebGL unavailable</span>
    </div>
  );
}
