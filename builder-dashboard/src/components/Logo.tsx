'use client';

import { useId } from 'react';

/**
 * BlendedAgents logo — two overlapping lens/petal shapes that form
 * a "blend zone" where they intersect. Clean, geometric, works at
 * any size from 20px favicons to large hero marks.
 *
 * The left shape = builder, right shape = tester.
 * The bright intersection = the blend — where they collaborate.
 *
 * Animation: the two halves slide in from opposite sides and merge.
 */
export function Logo({ size = 28, animate = false }: { size?: number; animate?: boolean }) {
  const reactId = useId();
  const id = `ba-${reactId.replace(/:/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animate ? 'ba-logo-animate' : ''}
      aria-label="BlendedAgents logo"
    >
      <defs>
        {/* Clip to rounded square */}
        <clipPath id={`${id}-clip`}>
          <rect width="40" height="40" rx="10" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="40" height="40" rx="10" fill="currentColor" />

      <g clipPath={`url(#${id}-clip)`}>
        {/* Left petal — builder */}
        <ellipse
          className="ba-left"
          cx="16"
          cy="20"
          rx="11"
          ry="14"
          fill="white"
          opacity="0.25"
        />

        {/* Right petal — tester */}
        <ellipse
          className="ba-right"
          cx="24"
          cy="20"
          rx="11"
          ry="14"
          fill="white"
          opacity="0.25"
        />

        {/* Intersection — the blend zone (brighter where they overlap) */}
        <clipPath id={`${id}-isect`}>
          <ellipse cx="16" cy="20" rx="11" ry="14" />
        </clipPath>
        <ellipse
          className="ba-blend"
          cx="24"
          cy="20"
          rx="11"
          ry="14"
          fill="white"
          opacity="0.45"
          clipPath={`url(#${id}-isect)`}
        />

        {/* Center dot — the focal point of collaboration */}
        <circle
          className="ba-dot"
          cx="20"
          cy="20"
          r="3"
          fill="white"
          opacity="0.95"
        />
      </g>

      <style>{`
        .ba-logo-animate .ba-left {
          animation: ba-slide-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .ba-logo-animate .ba-right {
          animation: ba-slide-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .ba-logo-animate .ba-blend {
          opacity: 0;
          animation: ba-fade 0.4s ease-out 0.35s forwards;
        }
        .ba-logo-animate .ba-dot {
          opacity: 0;
          transform-origin: 20px 20px;
          animation: ba-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s forwards;
        }
        @keyframes ba-slide-left {
          from { transform: translateX(-6px); opacity: 0; }
          to   { transform: translateX(0); opacity: 0.25; }
        }
        @keyframes ba-slide-right {
          from { transform: translateX(6px); opacity: 0; }
          to   { transform: translateX(0); opacity: 0.25; }
        }
        @keyframes ba-fade {
          from { opacity: 0; }
          to   { opacity: 0.45; }
        }
        @keyframes ba-pop {
          0%   { opacity: 0; transform: scale(0); }
          70%  { transform: scale(1.2); }
          100% { opacity: 0.95; transform: scale(1); }
        }
      `}</style>
    </svg>
  );
}
