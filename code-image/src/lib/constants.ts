export interface CodeTheme {
  id: string; name: string; dark: boolean;
  bg: string; fg: string; bar: string; gutter: string;
  comment: string; keyword: string; string: string; number: string;
  fn: string; type: string; variable: string; attr: string; tag: string; builtin: string; punct: string;
}

// id, name, dark, bg, fg, bar, comment, keyword, string, number, fn, type, variable, attr, tag, builtin, punct
const rows: [string, string, boolean, ...string[]][] = [
  ["dracula", "Dracula", true, "#282a36", "#f8f8f2", "#21222c", "#6272a4", "#ff79c6", "#f1fa8c", "#bd93f9", "#50fa7b", "#8be9fd", "#f8f8f2", "#50fa7b", "#ff79c6", "#8be9fd", "#f8f8f2"],
  ["tokyo-night", "Tokyo Night", true, "#1a1b26", "#c0caf5", "#16161e", "#565f89", "#bb9af7", "#9ece6a", "#ff9e64", "#7aa2f7", "#2ac3de", "#c0caf5", "#73daca", "#f7768e", "#7dcfff", "#89ddff"],
  ["one-dark", "One Dark", true, "#282c34", "#abb2bf", "#21252b", "#5c6370", "#c678dd", "#98c379", "#d19a66", "#61afef", "#e5c07b", "#e06c75", "#d19a66", "#e06c75", "#56b6c2", "#abb2bf"],
  ["nord", "Nord", true, "#2e3440", "#d8dee9", "#272c36", "#616e88", "#81a1c1", "#a3be8c", "#b48ead", "#88c0d0", "#8fbcbb", "#d8dee9", "#8fbcbb", "#81a1c1", "#81a1c1", "#eceff4"],
  ["catppuccin-mocha", "Catppuccin Mocha", true, "#1e1e2e", "#cdd6f4", "#181825", "#6c7086", "#cba6f7", "#a6e3a1", "#fab387", "#89b4fa", "#f9e2af", "#f5e0dc", "#f9e2af", "#f38ba8", "#89dceb", "#9399b2"],
  ["catppuccin-latte", "Catppuccin Latte", false, "#eff1f5", "#4c4f69", "#e6e9ef", "#9ca0b0", "#8839ef", "#40a02b", "#fe640b", "#1e66f5", "#df8e1d", "#dc8a78", "#df8e1d", "#d20f39", "#04a5e5", "#7c7f93"],
  ["monokai", "Monokai", true, "#272822", "#f8f8f2", "#1e1f1c", "#75715e", "#f92672", "#e6db74", "#ae81ff", "#a6e22e", "#66d9ef", "#f8f8f2", "#a6e22e", "#f92672", "#66d9ef", "#f8f8f2"],
  ["github-dark", "GitHub Dark", true, "#0d1117", "#c9d1d9", "#161b22", "#8b949e", "#ff7b72", "#a5d6ff", "#79c0ff", "#d2a8ff", "#ffa657", "#ffa657", "#79c0ff", "#7ee787", "#79c0ff", "#c9d1d9"],
  ["github-light", "GitHub Light", false, "#ffffff", "#24292f", "#f6f8fa", "#6e7781", "#cf222e", "#0a3069", "#0550ae", "#8250df", "#953800", "#953800", "#0550ae", "#116329", "#0550ae", "#24292f"],
  ["solarized-dark", "Solarized Dark", true, "#002b36", "#839496", "#00212b", "#586e75", "#859900", "#2aa198", "#d33682", "#268bd2", "#b58900", "#cb4b16", "#b58900", "#268bd2", "#cb4b16", "#93a1a1"],
  ["gruvbox", "Gruvbox Dark", true, "#282828", "#ebdbb2", "#1d2021", "#928374", "#fb4934", "#b8bb26", "#d3869b", "#fabd2f", "#fabd2f", "#83a598", "#b8bb26", "#fb4934", "#fe8019", "#a89984"],
  ["night-owl", "Night Owl", true, "#011627", "#d6deeb", "#010e1a", "#637777", "#c792ea", "#ecc48d", "#f78c6c", "#82aaff", "#ffcb8b", "#addb67", "#addb67", "#7fdbca", "#82aaff", "#7fdbca"],
  ["palenight", "Material Palenight", true, "#292d3e", "#a6accd", "#232635", "#676e95", "#c792ea", "#c3e88d", "#f78c6c", "#82aaff", "#ffcb6b", "#f07178", "#ffcb6b", "#f07178", "#89ddff", "#89ddff"],
  ["rose-pine", "Rosé Pine", true, "#191724", "#e0def4", "#1f1d2e", "#6e6a86", "#31748f", "#f6c177", "#ebbcba", "#ebbcba", "#9ccfd8", "#e0def4", "#c4a7e7", "#eb6f92", "#eb6f92", "#908caa"],
];

export const CODE_THEMES: CodeTheme[] = rows.map((r) => {
  const [id, name, dark, bg, fg, bar, comment, keyword, string, number, fn, type, variable, attr, tag, builtin, punct] = r as [string, string, boolean, ...string[]];
  const gutter = comment;
  return { id, name, dark, bg, fg, bar, gutter, comment, keyword, string, number, fn, type, variable, attr, tag, builtin, punct };
});

export const GRADIENTS: { name: string; g1: string; g2: string; angle: number }[] = [
  { name: "Indigo", g1: "#4776e6", g2: "#8e54e9", angle: 135 },
  { name: "Ocean", g1: "#2193b0", g2: "#6dd5ed", angle: 135 },
  { name: "Sunset", g1: "#ff512f", g2: "#dd2476", angle: 135 },
  { name: "Aurora", g1: "#00c9ff", g2: "#92fe9d", angle: 135 },
  { name: "Violet", g1: "#7f00ff", g2: "#e100ff", angle: 135 },
  { name: "Candy", g1: "#f093fb", g2: "#f5576c", angle: 135 },
  { name: "Mint", g1: "#11998e", g2: "#38ef7d", angle: 135 },
  { name: "Fire", g1: "#f12711", g2: "#f5af19", angle: 135 },
  { name: "Peach", g1: "#ffecd2", g2: "#fcb69f", angle: 135 },
  { name: "Slate", g1: "#cfd9df", g2: "#e2ebf0", angle: 135 },
  { name: "Midnight", g1: "#232526", g2: "#414345", angle: 135 },
  { name: "Deep Sea", g1: "#0f2027", g2: "#2c5364", angle: 135 },
];

export const RATIOS: { id: string; label: string; w: number; h: number }[] = [
  { id: "auto", label: "Auto", w: 0, h: 0 },
  { id: "16:9", label: "16:9", w: 1280, h: 720 },
  { id: "4:3", label: "4:3", w: 1200, h: 900 },
  { id: "1:1", label: "1:1", w: 1000, h: 1000 },
  { id: "3:2", label: "3:2", w: 1200, h: 800 },
  { id: "2:1", label: "2:1", w: 1200, h: 600 },
  { id: "21:9", label: "21:9", w: 1400, h: 600 },
  { id: "4:5", label: "4:5", w: 1000, h: 1250 },
  { id: "9:16", label: "9:16", w: 720, h: 1280 },
];

export const FONTS: { id: string; label: string; family: string }[] = [
  { id: "jetbrains-mono", label: "JetBrains Mono", family: '"JetBrains Mono"' },
  { id: "fira-code", label: "Fira Code", family: '"Fira Code"' },
  { id: "source-code-pro", label: "Source Code Pro", family: '"Source Code Pro"' },
  { id: "cascadia-code", label: "Cascadia Code", family: '"Cascadia Code"' },
  { id: "roboto-mono", label: "Roboto Mono", family: '"Roboto Mono"' },
  { id: "ibm-plex-mono", label: "IBM Plex Mono", family: '"IBM Plex Mono"' },
  { id: "ubuntu-mono", label: "Ubuntu Mono", family: '"Ubuntu Mono"' },
  { id: "space-mono", label: "Space Mono", family: '"Space Mono"' },
  { id: "inconsolata", label: "Inconsolata", family: "Inconsolata" },
  { id: "dm-mono", label: "DM Mono", family: '"DM Mono"' },
];

export const MONO_FALLBACK = 'ui-monospace, "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace';

export const M3_SEEDS = [
  "#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5", "#2196F3",
  "#03A9F4", "#00BCD4", "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
  "#FFEB3B", "#FFC107", "#FF9800", "#FF5722", "#795548", "#607D8B",
];

export interface Lang_ { id: string; name: string; exts: string[] }
export const LANGUAGES: Lang_[] = [
  { id: "javascript", name: "JavaScript", exts: ["js", "jsx", "mjs", "cjs"] },
  { id: "typescript", name: "TypeScript", exts: ["ts", "tsx"] },
  { id: "python", name: "Python", exts: ["py"] },
  { id: "xml", name: "HTML / XML", exts: ["html", "htm", "xml", "svg", "vue"] },
  { id: "css", name: "CSS", exts: ["css"] },
  { id: "scss", name: "SCSS", exts: ["scss"] },
  { id: "sql", name: "SQL", exts: ["sql"] },
  { id: "json", name: "JSON", exts: ["json"] },
  { id: "bash", name: "Bash / Shell", exts: ["sh", "bash", "zsh"] },
  { id: "powershell", name: "PowerShell", exts: ["ps1"] },
  { id: "java", name: "Java", exts: ["java"] },
  { id: "kotlin", name: "Kotlin", exts: ["kt", "kts"] },
  { id: "swift", name: "Swift", exts: ["swift"] },
  { id: "c", name: "C", exts: ["c", "h"] },
  { id: "cpp", name: "C++", exts: ["cpp", "cc", "hpp"] },
  { id: "csharp", name: "C#", exts: ["cs"] },
  { id: "go", name: "Go", exts: ["go"] },
  { id: "rust", name: "Rust", exts: ["rs"] },
  { id: "php", name: "PHP", exts: ["php"] },
  { id: "ruby", name: "Ruby", exts: ["rb"] },
  { id: "dart", name: "Dart", exts: ["dart"] },
  { id: "yaml", name: "YAML", exts: ["yml", "yaml"] },
  { id: "ini", name: "TOML / INI", exts: ["toml", "ini"] },
  { id: "markdown", name: "Markdown", exts: ["md", "markdown"] },
  { id: "dockerfile", name: "Dockerfile", exts: ["dockerfile"] },
  { id: "graphql", name: "GraphQL", exts: ["graphql", "gql"] },
  { id: "plaintext", name: "Plain text", exts: ["txt", "log"] },
];
