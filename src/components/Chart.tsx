import React from 'react';
import type { StatHistoryEntry } from '../types';

interface ChartProps {
  history: StatHistoryEntry[];
  className?: string;
}

export const Chart: React.FC<ChartProps> = ({ history, className = '' }) => {
  // SVG Dimensions
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  // Calculate drawing dimensions
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Safe checks for empty history
  const data = history.length > 0 ? history : [
    { date: 'None', xpGained: 0, accuracy: 75, reactionTime: 240 }
  ];

  const pointsCount = data.length;
  
  // Calculate coordinates helper
  // Accuracy: 0 to 100%
  const getAccCoords = (val: number, index: number) => {
    const x = padding.left + (index / (pointsCount - 1 || 1)) * chartWidth;
    // Map 50% - 100% to fill height nicely
    const minVal = 50;
    const maxVal = 100;
    const ratio = (val - minVal) / (maxVal - minVal);
    const y = padding.top + chartHeight - Math.max(0, Math.min(1, ratio)) * chartHeight;
    return { x, y };
  };

  // Reaction Time: 150ms to 350ms (Lower is better)
  const getRtCoords = (val: number, index: number) => {
    const x = padding.left + (index / (pointsCount - 1 || 1)) * chartWidth;
    // Map 150ms to 350ms
    const minVal = 150;
    const maxVal = 350;
    const ratio = (val - minVal) / (maxVal - minVal);
    // Invert because lower reaction time is better (so high on the chart)
    const y = padding.top + Math.max(0, Math.min(1, ratio)) * chartHeight;
    return { x, y };
  };

  // Generate SVG path for Accuracy (Cyan Line)
  let accLinePath = '';
  let accAreaPath = '';
  if (pointsCount > 0) {
    const firstPoint = getAccCoords(data[0].accuracy, 0);
    accLinePath = `M ${firstPoint.x} ${firstPoint.y}`;
    accAreaPath = `M ${firstPoint.x} ${padding.top + chartHeight} L ${firstPoint.x} ${firstPoint.y}`;

    for (let i = 1; i < pointsCount; i++) {
      const pt = getAccCoords(data[i].accuracy, i);
      accLinePath += ` L ${pt.x} ${pt.y}`;
      accAreaPath += ` L ${pt.x} ${pt.y}`;
    }
    const lastPoint = getAccCoords(data[pointsCount - 1].accuracy, pointsCount - 1);
    accAreaPath += ` L ${lastPoint.x} ${padding.top + chartHeight} Z`;
  }

  // Generate SVG path for Reaction Time (Purple Line)
  let rtLinePath = '';
  let rtAreaPath = '';
  if (pointsCount > 0) {
    const firstPoint = getRtCoords(data[0].reactionTime, 0);
    rtLinePath = `M ${firstPoint.x} ${firstPoint.y}`;
    rtAreaPath = `M ${firstPoint.x} ${padding.top + chartHeight} L ${firstPoint.x} ${firstPoint.y}`;

    for (let i = 1; i < pointsCount; i++) {
      const pt = getRtCoords(data[i].reactionTime, i);
      rtLinePath += ` L ${pt.x} ${pt.y}`;
      rtAreaPath += ` L ${pt.x} ${pt.y}`;
    }
    const lastPoint = getRtCoords(data[pointsCount - 1].reactionTime, pointsCount - 1);
    rtAreaPath += ` L ${lastPoint.x} ${padding.top + chartHeight} Z`;
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="acc-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="rt-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
          
          <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="purple-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding.top + ratio * chartHeight;
          return (
            <line
              key={index}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#1f1f2e"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Chart bounds */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#2d2d3d"
          strokeWidth="1.5"
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="#2d2d3d"
          strokeWidth="1.5"
        />

        {/* Y Axis Labels (Left: Accuracy) */}
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fill="#6b7280" fontSize="10" fontWeight="600">100%</text>
        <text x={padding.left - 8} y={padding.top + chartHeight / 2 + 4} textAnchor="end" fill="#6b7280" fontSize="10" fontWeight="600">75%</text>
        <text x={padding.left - 8} y={padding.top + chartHeight + 4} textAnchor="end" fill="#6b7280" fontSize="10" fontWeight="600">50%</text>

        {/* Y Axis Labels (Right: Reaction Time) */}
        <text x={width - padding.right + 8} y={padding.top + 4} textAnchor="start" fill="#6b7280" fontSize="10" fontWeight="600">150ms</text>
        <text x={width - padding.right + 8} y={padding.top + chartHeight / 2 + 4} textAnchor="start" fill="#6b7280" fontSize="10" fontWeight="600">250ms</text>
        <text x={width - padding.right + 8} y={padding.top + chartHeight + 4} textAnchor="start" fill="#6b7280" fontSize="10" fontWeight="600">350ms</text>

        {/* X Axis Labels (Dates) */}
        {data.map((entry, index) => {
          const coords = getAccCoords(entry.accuracy, index);
          return (
            <text
              key={index}
              x={coords.x}
              y={padding.top + chartHeight + 18}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="9"
              fontWeight="500"
              fontFamily="sans-serif"
            >
              {entry.date}
            </text>
          );
        })}

        {/* Accuracy Area & Line */}
        {accAreaPath && <path d={accAreaPath} fill="url(#acc-gradient)" />}
        {accLinePath && (
          <path
            d={accLinePath}
            stroke="#00f0ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#cyan-glow)"
          />
        )}

        {/* Reaction Time Area & Line */}
        {rtAreaPath && <path d={rtAreaPath} fill="url(#rt-gradient)" />}
        {rtLinePath && (
          <path
            d={rtLinePath}
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#purple-glow)"
          />
        )}

        {/* Data points (dots) */}
        {data.map((entry, index) => {
          const accPt = getAccCoords(entry.accuracy, index);
          const rtPt = getRtCoords(entry.reactionTime, index);
          return (
            <g key={index}>
              {/* Accuracy Dot */}
              <circle
                cx={accPt.x}
                cy={accPt.y}
                r="4"
                fill="#09090b"
                stroke="#00f0ff"
                strokeWidth="2.5"
              />
              {/* Reaction Time Dot */}
              <circle
                cx={rtPt.x}
                cy={rtPt.y}
                r="4"
                fill="#09090b"
                stroke="#8b5cf6"
                strokeWidth="2.5"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
