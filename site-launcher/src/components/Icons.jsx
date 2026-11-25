// Logo: cửa sổ trình duyệt kèm mũi tên "mở", màu theo bảng màu Fluent
export const Logo = ({ size = 40 }) => (
  <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id="slg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3AA0F3" />
        <stop offset="1" stopColor="#0B5CAD" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="232" fill="url(#slg)" />
    <rect x="190" y="250" width="644" height="524" rx="72" fill="#fff" />
    <path d="M190 322a72 72 0 0 1 72-72h500a72 72 0 0 1 72 72v70H190z" fill="#CFE4FA" />
    <circle cx="262" cy="321" r="22" fill="#0F6CBD" />
    <circle cx="334" cy="321" r="22" fill="#0F6CBD" />
    <circle cx="406" cy="321" r="22" fill="#0F6CBD" />
    <rect x="238" y="440" width="164" height="110" rx="22" fill="#DCEBFA" />
    <rect x="420" y="440" width="164" height="110" rx="22" fill="#DCEBFA" />
    <rect x="602" y="440" width="164" height="110" rx="22" fill="#DCEBFA" />
    <rect x="238" y="590" width="528" height="40" rx="20" fill="#DCEBFA" />
    <circle cx="768" cy="740" r="150" fill="#003E73" stroke="#fff" strokeWidth="20" />
    <path d="M715 795 821 689M744 689H821V766" fill="none" stroke="#fff" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
const Svg = ({ size = 20, children, ...rest }) => (
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
export const Chevron = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
export const WindowIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3 9.5h18" />
  </Svg>
);
export const Globe = ({ size = 20 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
  </Svg>
);
export const Cross = ({ size = 16 }) => (
  <Svg size={size} strokeWidth={1.6}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const Search = ({ size = 16 }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
);
export const Refresh = () => (
  <Svg>
    <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />
  </Svg>
);
export const Check = ({ className, size = 14 }) => (
  <Svg size={size} className={className} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const Plus = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const Info = ({ size = 18 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.1" strokeWidth="2" />
  </Svg>
);
