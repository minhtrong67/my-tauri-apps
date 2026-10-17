// Logo: hai cửa sổ trình duyệt xếp chồng, dùng màu của material-theme.json
export const Logo = ({ size = 44 }) => (
  <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#226488" />
        <stop offset="1" stopColor="#00344C" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="230" fill="url(#lg)" />
    <rect x="300" y="236" width="500" height="410" rx="76" fill="#B1A5CC" />
    <rect x="224" y="352" width="500" height="436" rx="76" fill="#C7E7FF" />
    <path d="M224 428a76 76 0 0 1 76-76h348a76 76 0 0 1 76 76v70H224z" fill="#93CDF6" />
    <circle cx="298" cy="425" r="20" fill="#226488" />
    <circle cx="362" cy="425" r="20" fill="#226488" />
    <circle cx="426" cy="425" r="20" fill="#226488" />
  </svg>
);

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const Svg = ({ size = 24, children, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const Sliders = () => (
  <Svg>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);
export const Chevron = () => (
  <Svg>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const TabsIcon = () => (
  <Svg size={18}>
    <rect x="3" y="6" width="18" height="14" rx="3" />
    <path d="M3 10h18M8 6V4.5" />
  </Svg>
);
export const Cross = ({ size = 20 }) => (
  <Svg size={size}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const Search = () => (
  <Svg>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);
export const Refresh = () => (
  <Svg>
    <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />
  </Svg>
);
export const Check = ({ className }) => (
  <Svg size={18} className={className} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const Plus = () => (
  <Svg size={18}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
