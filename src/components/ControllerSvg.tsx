import React from 'react';
import type { ControllerType } from '../types';
import { useApp } from '../context/AppContext';

interface ControllerSvgProps {
  type: ControllerType;
  activePart?: 'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null;
  className?: string;
  heatmapMode?: 'none' | 'mistakes' | 'speed' | 'practice';
  pressedButtons?: Record<string, boolean>;
  leftStickCoords?: { x: number; y: number };
  rightStickCoords?: { x: number; y: number };
  triggerValues?: { lt: number; rt: number };
}

export const ControllerSvg: React.FC<ControllerSvgProps> = React.memo(({
  type,
  activePart = null,
  className = '',
  heatmapMode = 'none',
  pressedButtons = {},
  leftStickCoords = { x: 0, y: 0 },
  rightStickCoords = { x: 0, y: 0 },
  triggerValues = { lt: 0, rt: 0 },
}) => {
  const { profile, stats } = useApp();
  const selectedSkin = profile.selectedSkin || 'standard';

  // Base brand colors
  const getBrandColor = () => {
    if (selectedSkin === 'carbon') return '#ff3b30';
    if (selectedSkin === 'gold') return '#fbbf24';
    if (selectedSkin === 'cyberpunk') return '#00f0ff';
    
    switch (type) {
      case 'xbox': return '#10b981';
      case 'playstation': return '#3b82f6';
      case 'switch': return '#ef4444';
      default: return '#8b5cf6';
    }
  };

  const brandColor = getBrandColor();

  // Helper function to color code heatmap buttons
  const getHeatmapColor = (btn: string, defaultColor: string) => {
    if (heatmapMode === 'none') return defaultColor;

    if (heatmapMode === 'mistakes') {
      const misses = stats.buttonMistakes?.[btn] || 0;
      if (misses === 0) return '#1f2937';
      if (misses < 3) return '#b91c1c';
      return '#ef4444';
    }

    if (heatmapMode === 'speed') {
      const speed = stats.buttonReactionTimes?.[btn] || 0;
      if (speed === 0) return '#1f2937';
      if (speed <= 210) return '#059669';
      if (speed <= 260) return '#d97706';
      return '#dc2626';
    }

    if (heatmapMode === 'practice') {
      const count = stats.buttonPracticeCounts?.[btn] || 0;
      if (count === 0) return '#1f2937';
      if (count < 5) return '#6d28d9';
      if (count < 15) return '#8b5cf6';
      return '#00f0ff';
    }

    return defaultColor;
  };

  // Helper function for active button highlights
  const getButtonFill = (btn: string, defaultColor: string) => {
    if (heatmapMode !== 'none') {
      return getHeatmapColor(btn, defaultColor);
    }
    const isPressed = pressedButtons[btn] || false;
    
    if (selectedSkin === 'standard') {
      if (btn === 'A') return isPressed ? '#10b981' : '#047857';
      if (btn === 'B') return isPressed ? '#ef4444' : '#b91c1c';
      if (btn === 'X') return isPressed ? '#3b82f6' : '#1d4ed8';
      if (btn === 'Y') return isPressed ? '#eab308' : '#a16207';
    }

    if (isPressed) {
      return brandColor;
    }
    return defaultColor;
  };

  const getButtonFillGeneral = (btn: string, defaultColor: string) => {
    if (heatmapMode !== 'none') {
      return getHeatmapColor(btn, defaultColor);
    }
    const isPressed = pressedButtons[btn] || false;
    if (isPressed) {
      return brandColor;
    }
    return defaultColor;
  };

  // Evaluate D-Pad colors
  const isDpadUpActive = pressedButtons.DpadUp || activePart === 'dpad';
  const isDpadDownActive = pressedButtons.DpadDown || activePart === 'dpad';
  const isDpadLeftActive = pressedButtons.DpadLeft || activePart === 'dpad';
  const isDpadRightActive = pressedButtons.DpadRight || activePart === 'dpad';

  // Layout switching
  const isDefaultLayout = type === 'xbox' || type === 'switch';
  const lsCenterX = isDefaultLayout ? 266 : 397;
  const lsCenterY = isDefaultLayout ? 288 : 459;
  const dpadCX = isDefaultLayout ? 397 : 266;
  const dpadCY = isDefaultLayout ? 459 : 288;

  // Stick offsets
  const lsIsActive = leftStickCoords.x !== 0 || leftStickCoords.y !== 0;
  const rsIsActive = rightStickCoords.x !== 0 || rightStickCoords.y !== 0;
  const lsOffX = lsIsActive ? leftStickCoords.x * 21 : (activePart === 'left-stick' ? -14 : 0);
  const lsOffY = lsIsActive ? leftStickCoords.y * 21 : (activePart === 'left-stick' ? -21 : 0);
  const rsOffX = rsIsActive ? rightStickCoords.x * 21 : (activePart === 'right-stick' ? 21 : 0);
  const rsOffY = rsIsActive ? rightStickCoords.y * 21 : (activePart === 'right-stick' ? 11 : 0);

  return (
    <svg
      viewBox="0 0 1068 830"
      className={`w-full h-auto select-none drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="glow-brand" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-neon" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        {/* Carbon texture pattern */}
        <pattern id="carbon-texture" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#131317" />
          <polygon points="0,0 4,0 0,4" fill="#1c1c22" />
          <polygon points="4,4 8,4 4,8" fill="#1c1c22" />
          <polygon points="4,4 4,0 8,0" fill="#18181e" />
          <polygon points="0,4 0,8 4,8" fill="#18181e" />
        </pattern>

        {/* Skins Body Gradients */}
        {selectedSkin === 'standard' && (
          <linearGradient id="controller-body" x1="534" y1="50" x2="534" y2="750" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1c1c22" />
            <stop offset="0.5" stopColor="#121215" />
            <stop offset="1" stopColor="#08080a" />
          </linearGradient>
        )}

        {selectedSkin === 'carbon' && (
          <linearGradient id="controller-body" x1="534" y1="50" x2="534" y2="750" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0d0d0f" />
            <stop offset="0.5" stopColor="#15151b" />
            <stop offset="1" stopColor="#050507" />
          </linearGradient>
        )}

        {selectedSkin === 'gold' && (
          <linearGradient id="controller-body" x1="534" y1="50" x2="534" y2="750" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="0.5" stopColor="#d97706" />
            <stop offset="1" stopColor="#78350f" />
          </linearGradient>
        )}

        {selectedSkin === 'cyberpunk' && (
          <linearGradient id="controller-body" x1="534" y1="50" x2="534" y2="750" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff007f" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#00f0ff" />
          </linearGradient>
        )}
      </defs>

      {/* Controller Outer Shell Outline (Glowing Edge) */}
      <path
        d="M898.499 173.5C908.539 181.574 917.999 194.5 923.499 210.5C976.472 335.242 1059.71 530.705 1062.06 669.545C1063.3 738.195 1034.12 806.547 954.834 822.353C940.181 825.344 884.859 776.216 851.153 729.395C799.59 658.523 780.836 619.733 688.902 616.871L382.216 617.341C311.087 618.793 286.181 643.998 252.219 696.629C209.67 755.625 158.876 814.792 112.823 822.951C49.9397 809.879 9.05662 759.256 8.5867 674.329C7.60414 574.194 57 429.5 88 348.5C107.518 297.5 125.942 253.976 143.5 211C149.628 196 158 186 166.5 176"
        stroke={brandColor}
        strokeWidth="2"
        strokeOpacity="0.4"
        filter="url(#glow-brand)"
      />

      {/* Main Body */}
      <path
        d="M898.499 173.5C908.539 181.574 917.999 194.5 923.499 210.5C976.472 335.242 1059.71 530.705 1062.06 669.545C1063.3 738.195 1034.12 806.547 954.834 822.353C940.181 825.344 884.859 776.216 851.153 729.395C799.59 658.523 780.836 619.733 688.902 616.871L382.216 617.341C311.087 618.793 286.181 643.998 252.219 696.629C209.67 755.625 158.876 814.792 112.823 822.951C49.9397 809.879 9.05662 759.256 8.5867 674.329C7.60414 574.194 57 429.5 88 348.5C107.518 297.5 125.942 253.976 143.5 211C149.628 196 158 186 166.5 176"
        fill="url(#controller-body)"
        stroke={selectedSkin === 'cyberpunk' ? '#00f0ff' : '#2d2d37'}
        strokeWidth="3.5"
      />

      <path
        d="M952.656 821.498C930.869 777.924 867.472 716.023 812.15 655.447C772.762 611.83 752.086 603.243 690.74 603.243H383.113C325.74 603.243 303.91 611.83 263.027 656.13C210.311 713.845 149.862 770.491 112.738 822.737"
        stroke="#2d2d39"
        strokeWidth="3"
        strokeMiterlimit="10"
      />

      {/* Carbon fiber overlay if selected */}
      {selectedSkin === 'carbon' && (
        <path
          d="M898.499 173.5C908.539 181.574 917.999 194.5 923.499 210.5C976.472 335.242 1059.71 530.705 1062.06 669.545C1063.3 738.195 1034.12 806.547 954.834 822.353C940.181 825.344 884.859 776.216 851.153 729.395C799.59 658.523 780.836 619.733 688.902 616.871L382.216 617.341C311.087 618.793 286.181 643.998 252.219 696.629C209.67 755.625 158.876 814.792 112.823 822.951C49.9397 809.879 9.05662 759.256 8.5867 674.329C7.60414 574.194 57 429.5 88 348.5C107.518 297.5 125.942 253.976 143.5 211C149.628 196 158 186 166.5 176"
          fill="url(#carbon-texture)"
          opacity="0.3"
          pointerEvents="none"
        />
      )}

      {/* Decorative center circle */}
      <circle cx="397.5" cy="459.5" r="82.5" fill="#0f0f13" stroke="#2e2e38" strokeWidth="4" />

      {/* Top seam */}
      <path d="M372.5 114L481.5 112L697 114" stroke="#2d2d39" strokeWidth="4" />

      {/* LT Trigger */}
      <g>
        <path
          d="M283.638 82.3742L236.395 95.0328C235.667 95.2279 234.346 94.7617 233.772 93.0322C231.468 86.0869 227.056 71.8687 225.001 59.1377C224.647 56.9489 224.142 54.5628 223.643 52.1331C223.14 49.6825 222.636 47.1571 222.259 44.5991C221.501 39.4618 221.284 34.3664 222.534 29.7676C223.762 25.2468 226.433 21.1053 231.687 17.8419C237.006 14.538 245.07 12.0775 257.143 11.2151C258.14 11.144 259.763 11.4995 261.358 12.3452C262.95 13.1893 264.157 14.3314 264.661 15.5082C270.649 29.4788 277.052 52.6857 284.326 76.8567L284.344 76.9175L284.366 76.9764C284.905 78.4282 285.022 79.8474 284.8 80.8699C284.587 81.8461 284.15 82.237 283.638 82.3742Z"
          fill={triggerValues.lt > 0 ? brandColor : getButtonFillGeneral('LT', activePart === 'triggers' ? brandColor : '#1f1f26')}
          fillOpacity={triggerValues.lt > 0 ? 0.3 + triggerValues.lt * 0.7 : 1}
          stroke={activePart === 'triggers' || triggerValues.lt > 0 ? brandColor : '#3f3f4f'}
          strokeWidth="2"
        />
      </g>

      {/* RT Trigger */}
      <g>
        <path
          d="M783.517 81.8176L830.76 94.4762C831.488 94.6713 832.809 94.205 833.383 92.4755C835.687 85.5303 840.098 71.312 842.154 58.5811C842.508 56.3922 843.012 54.0061 843.511 51.5765C844.015 49.1259 844.519 46.6004 844.896 44.0425C845.654 38.9052 845.871 33.8098 844.621 29.211C843.393 24.6902 840.722 20.5486 835.468 17.2853C830.149 13.9813 822.085 11.5208 810.012 10.6585C809.015 10.5873 807.392 10.9429 805.797 11.7886C804.204 12.6326 802.998 13.7748 802.493 14.9515C796.506 28.9222 790.103 52.1291 782.829 76.3001L782.811 76.3609L782.789 76.4197C782.25 77.8715 782.133 79.2908 782.355 80.3132C782.568 81.2895 783.005 81.6804 783.517 81.8176Z"
          fill={triggerValues.rt > 0 ? brandColor : getButtonFillGeneral('RT', activePart === 'triggers' ? brandColor : '#1f1f26')}
          fillOpacity={triggerValues.rt > 0 ? 0.3 + triggerValues.rt * 0.7 : 1}
          stroke={activePart === 'triggers' || triggerValues.rt > 0 ? brandColor : '#3f3f4f'}
          strokeWidth="2"
        />
      </g>

      {/* LB Bumper */}
      <path
        d="M173.5 156.5C169.866 164.574 167.5 172.667 166.5 176C186 154 272.5 118 332 116L372 114C366 110.333 354.821 101.457 353 99.9999C350.5 97.9999 343.5 92 338 90.5C234 85.5 178 146.5 173.5 156.5Z"
        fill={getButtonFillGeneral('LB', activePart === 'triggers' ? brandColor : '#2b2b35')}
        stroke={pressedButtons.LB ? brandColor : '#3f3f50'}
        strokeWidth="1.5"
      />

      {/* RB Bumper */}
      <path
        d="M726 92.5C724.176 93.4121 706.333 106.5 697 114C741.5 115 818 120.5 899.5 174L892.5 153.5C870.5 111.5 774.122 90 748.5 90C741 90 729 91 726 92.5Z"
        fill={getButtonFillGeneral('RB', activePart === 'triggers' ? brandColor : '#2b2b35')}
        stroke={pressedButtons.RB ? brandColor : '#3f3f50'}
        strokeWidth="1.5"
      />

      {/* Left Analog Stick */}
      <g transform={`translate(${lsCenterX}, ${lsCenterY})`}>
        <circle cx="0" cy="0" r="78" fill={getHeatmapColor('LeftStick', '#0f0f13')} stroke="#2d2d38" strokeWidth="3" />
        <circle cx="0" cy="0" r="63.5" fill="#1a1a20" stroke="#3c3c4e" strokeWidth="1" />
        <g transform={`translate(${lsOffX}, ${lsOffY})`}>
          <circle
            cx="0"
            cy="0"
            r="38"
            fill={getButtonFillGeneral('L3', '#262630')}
            stroke={activePart === 'left-stick' || pressedButtons.L3 ? brandColor : '#4b5563'}
            strokeWidth="3.5"
          />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#555" strokeWidth="2.5" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#555" strokeWidth="2.5" />
        </g>
      </g>

      {/* Right Analog Stick */}
      <g transform="translate(670.5, 446.5)">
        <circle cx="0" cy="0" r="77.5" fill={getHeatmapColor('RightStick', '#0f0f13')} stroke="#2d2d38" strokeWidth="3" />
        <circle cx="0" cy="0" r="64.5" fill="#1a1a20" stroke="#3c3c4e" strokeWidth="1" />
        <g transform={`translate(${rsOffX}, ${rsOffY})`}>
          <circle
            cx="0"
            cy="0"
            r="38"
            fill={getButtonFillGeneral('R3', '#262630')}
            stroke={activePart === 'right-stick' || pressedButtons.R3 ? brandColor : '#4b5563'}
            strokeWidth="3.5"
          />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#555" strokeWidth="2.5" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#555" strokeWidth="2.5" />
        </g>
      </g>

      {/* View/Back Button */}
      <g>
        <path
          d="M435 290.619C435 273.623 447.991 265.22 459.928 265.22C478.432 265.22 485 279.868 485 288.741C485 304.562 474.645 315.22 461.031 315.22C445.499 315.22 435 302.825 435 290.619Z"
          fill={getButtonFillGeneral('Back', '#1f1f2e')}
          stroke={pressedButtons.Back ? brandColor : '#4b5563'}
          strokeWidth="2"
        />
        <rect x="457" y="289" width="14" height="11" rx="1" fill="none" stroke={pressedButtons.Back ? brandColor : '#a1a1aa'} strokeWidth="2" pointerEvents="none" />
      </g>

      {/* Start/Menu Button */}
      <g>
        <path
          d="M585 290.153C585 272.064 596.885 265.22 612.207 265.22C630.204 265.22 635 281.753 635 289.131C635 305.709 622.903 315.22 611.952 315.22C596.163 315.22 585 303.62 585 290.153Z"
          fill={getButtonFillGeneral('Start', '#1f1f2e')}
          stroke={pressedButtons.Start ? brandColor : '#4b5563'}
          strokeWidth="2"
        />
        <line x1="598" y1="283" x2="622" y2="283" stroke={pressedButtons.Start ? brandColor : '#a1a1aa'} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
        <line x1="598" y1="290" x2="622" y2="290" stroke={pressedButtons.Start ? brandColor : '#a1a1aa'} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
        <line x1="598" y1="297" x2="622" y2="297" stroke={pressedButtons.Start ? brandColor : '#a1a1aa'} strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
      </g>

      {/* Share Button */}
      <path
        d="M546.577 329.588H522.184C513.085 329.588 505.651 335.526 505.651 346.932C505.651 354.365 510.735 363.507 521.543 363.507H547.432C554.139 363.507 562.042 358.894 562.042 346.676C562.042 338.73 556.403 329.588 546.577 329.588Z"
        fill="#1f1f2e"
        stroke="#4b5563"
        strokeWidth="2"
      />
      <line x1="533.5" y1="338.625" x2="533.5" y2="349.125" stroke="#a1a1aa" strokeWidth="3" strokeLinecap="round" />
      <polyline points="541.208,343 533.5,338.625 525.792,343" stroke="#a1a1aa" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Guide/Xbox Logo Button */}
      <g>
        <circle cx="533" cy="184" r="42" fill="#181822" stroke={pressedButtons.Guide ? brandColor : '#4b5563'} strokeWidth="2.5" filter={pressedButtons.Guide ? 'url(#glow-brand)' : 'none'} />
        <circle cx="533" cy="184" r="36" fill="url(#controller-body)" stroke="#3f3f4e" strokeWidth="1.5" />
        <g>
          <path
            d="M551.801 146.434C545.936 143.492 539.611 142 533 142C526.48 142 520.232 143.453 514.429 146.319C513.828 146.616 513.461 147.241 513.495 147.911C513.529 148.581 513.958 149.167 514.587 149.402C520.97 151.78 526.917 154.976 532.263 158.899C532.559 159.118 532.908 159.226 533.257 159.226C533.607 159.226 533.956 159.118 534.252 158.899C539.519 155.033 545.369 151.874 551.64 149.508C552.265 149.273 552.691 148.689 552.726 148.023C552.761 147.356 552.397 146.733 551.801 146.434ZM533.257 155.472C529.005 152.458 524.406 149.878 519.534 147.768C528.201 144.536 538.104 144.574 546.741 147.873C541.96 149.961 537.441 152.507 533.257 155.472Z"
            fill={pressedButtons.Guide ? brandColor : '#52525b'}
          />
          <path
            d="M559.35 151.293C558.799 150.849 558.029 150.798 557.423 151.165C553.339 153.642 547.022 157.695 540.127 162.935C539.739 163.229 539.498 163.677 539.466 164.165C539.435 164.651 539.616 165.127 539.962 165.468C542.397 167.876 544.685 170.499 546.761 173.265C556.341 186.039 560.099 196.04 561.441 202.909C556.593 191.847 547.513 180.59 534.349 169.342C533.72 168.804 532.794 168.804 532.166 169.342C518.983 180.606 509.899 191.875 505.055 202.947C506.395 196.02 510.174 186.039 519.754 173.265C521.83 170.499 524.117 167.874 526.553 165.468C526.9 165.127 527.08 164.65 527.049 164.165C527.017 163.677 526.776 163.229 526.388 162.935C519.37 157.604 512.948 153.495 508.796 150.987C508.195 150.622 507.431 150.673 506.882 151.108C496.789 159.132 491 171.121 491 184C491 194.239 494.726 204.102 501.492 211.771C501.683 211.988 501.921 212.147 502.181 212.241C502.252 212.51 502.39 212.761 502.588 212.968C510.596 221.373 521.397 226 533 226C544.667 226 555.907 221.085 563.835 212.517C564.062 212.272 564.207 211.97 564.259 211.65C564.568 211.56 564.85 211.381 565.068 211.125C571.472 203.559 575 193.927 575 184C575 171.236 569.296 159.315 559.35 151.293ZM501.218 205.979C496.772 199.552 494.362 191.898 494.362 184C494.362 172.541 499.343 161.848 508.071 154.48C511.817 156.776 517.068 160.179 522.825 164.462C520.78 166.596 518.848 168.871 517.065 171.249C505.394 186.811 501.969 198.607 501.218 205.979ZM533 222.638C522.634 222.638 512.963 218.623 505.666 211.31C508.979 198.822 518.255 185.888 533.257 172.838C548.091 185.741 557.328 198.536 560.737 210.9C553.484 218.37 543.428 222.638 533 222.638ZM549.45 171.248C547.666 168.871 545.734 166.596 543.689 164.462C549.325 160.271 554.468 156.927 558.145 154.663C566.736 162.026 571.638 172.651 571.638 184C571.638 191.614 569.383 199.038 565.22 205.33C564.34 198.035 560.831 186.423 549.45 171.248Z"
            fill={pressedButtons.Guide ? brandColor : '#52525b'}
          />
        </g>
      </g>

      {/* Face Buttons */}
      {/* Y Button */}
      <g>
        <circle cx="804" cy="221" r="35" fill={getButtonFill('Y', '#22222a')} stroke={pressedButtons.Y ? brandColor : '#4b5563'} strokeWidth="1.5" />
        <path d="M786.475 200.507H793.225L804.503 222.508L816.977 200.507H823.001L806.938 228.488V250.019H801.342V228.488L786.475 200.507Z" fill={pressedButtons.Y ? '#fff' : '#a1a1aa'} pointerEvents="none" />
      </g>
      
      {/* B Button */}
      <g>
        <circle cx="875" cy="293" r="35" fill={getButtonFill('B', '#22222a')} stroke={pressedButtons.B ? brandColor : '#4b5563'} strokeWidth="1.5" />
        <path d="M861.808 272.086H875.222C884.706 272.086 888.935 277.17 888.935 283.065C888.935 287.807 886.287 291.267 882.1 292.976C887.483 293.916 891.028 298.06 891.028 303.955C891.028 311.303 885.646 315.746 877.273 315.746H861.808V272.086ZM867.191 276.315V290.883H872.616C879.879 290.883 883.339 287.807 883.339 282.937C883.339 278.75 880.263 276.315 874.24 276.315H867.191ZM867.191 294.898V311.046H876.205C882.228 311.046 885.304 308.227 885.304 302.972C885.304 297.675 880.519 294.898 872.872 294.898H867.191Z" fill={pressedButtons.B ? '#fff' : '#a1a1aa'} pointerEvents="none" />
      </g>

      {/* A Button */}
      <g>
        <circle cx="804" cy="362" r="35" fill={getButtonFill('A', '#22222a')} stroke={pressedButtons.A ? brandColor : '#4b5563'} strokeWidth="1.5" />
        <path d="M805.044 337L822.858 382.24H815.809L811 369H794.5L788.639 382.24H783L801.754 337H805.044ZM803 347L795.5 365.409H811L803 347Z" fill={pressedButtons.A ? '#fff' : '#a1a1aa'} pointerEvents="none" />
      </g>

      {/* X Button */}
      <g>
        <circle cx="733" cy="289" r="35" fill={getButtonFill('X', '#22222a')} stroke={pressedButtons.X ? brandColor : '#4b5563'} strokeWidth="1.5" />
        <path d="M716 268H722.08L732.634 286.2L743.149 268H749L735.884 290.235L748.121 310H742.041L732.213 293.241L722.156 310H716.115L728.963 289.535L716 268Z" fill={pressedButtons.X ? '#fff' : '#a1a1aa'} pointerEvents="none" />
      </g>

      {/* D-PAD */}
      <g>
        <rect x={dpadCX - 24} y={dpadCY - 68} width="48" height="48" rx="4"
          fill={isDpadUpActive ? getButtonFillGeneral('DpadUp', brandColor) : '#181822'}
          stroke={isDpadUpActive ? brandColor : '#4b5563'}
          strokeWidth="2"
        />
        <rect x={dpadCX - 24} y={dpadCY + 20} width="48" height="48" rx="4"
          fill={isDpadDownActive ? getButtonFillGeneral('DpadDown', brandColor) : '#181822'}
          stroke={isDpadDownActive ? brandColor : '#4b5563'}
          strokeWidth="2"
        />
        <rect x={dpadCX - 68} y={dpadCY - 24} width="48" height="48" rx="4"
          fill={isDpadLeftActive ? getButtonFillGeneral('DpadLeft', brandColor) : '#181822'}
          stroke={isDpadLeftActive ? brandColor : '#4b5563'}
          strokeWidth="2"
        />
        <rect x={dpadCX + 20} y={dpadCY - 24} width="48" height="48" rx="4"
          fill={isDpadRightActive ? getButtonFillGeneral('DpadRight', brandColor) : '#181822'}
          stroke={isDpadRightActive ? brandColor : '#4b5563'}
          strokeWidth="2"
        />
        <rect x={dpadCX - 24} y={dpadCY - 24} width="48" height="48" fill="#24242d" stroke="#2d2d38" strokeWidth="1" pointerEvents="none" />
        <polygon points={`${dpadCX},${dpadCY - 22} ${dpadCX - 4},${dpadCY - 16} ${dpadCX + 4},${dpadCY - 16}`} fill="#6b7280" pointerEvents="none" />
        <polygon points={`${dpadCX},${dpadCY + 22} ${dpadCX - 4},${dpadCY + 16} ${dpadCX + 4},${dpadCY + 16}`} fill="#6b7280" pointerEvents="none" />
        <polygon points={`${dpadCX - 22},${dpadCY} ${dpadCX - 16},${dpadCY - 4} ${dpadCX - 16},${dpadCY + 4}`} fill="#6b7280" pointerEvents="none" />
        <polygon points={`${dpadCX + 22},${dpadCY} ${dpadCX + 16},${dpadCY - 4} ${dpadCX + 16},${dpadCY + 4}`} fill="#6b7280" pointerEvents="none" />
      </g>
    </svg>
  );
});
