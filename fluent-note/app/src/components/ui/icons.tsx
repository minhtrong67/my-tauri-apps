/* Fluent System Icons (Microsoft), exposed under the names the app already uses.
 * Every icon is the 20 px "Regular" glyph, scaled to the requested size. `strokeWidth` is accepted and ignored,
 * so call sites that were written for stroke icons keep working. */
import type { ComponentType, CSSProperties } from "react";
import {
  Add20Regular, TextNumberListLtr20Regular, Blur20Regular, ArrowCounterclockwise20Regular, ArrowDown20Regular, ArrowMove20Regular, ArrowRedo20Regular, ArrowSwap20Regular, ArrowSync20Regular, ArrowSyncCircle20Regular, ArrowUndo20Regular, ArrowUp20Regular, Checkmark20Regular, CheckmarkCircle20Regular, ChevronDown20Regular, ChevronLeft20Regular, ChevronRight20Regular, ChevronUp20Regular, ClipboardPaste20Regular, Clock20Regular, Color20Regular, Copy20Regular, CopyAdd20Regular, Cut20Regular, DarkTheme20Regular, Delete20Regular, Desktop20Regular, Dismiss20Regular, Document20Regular, DocumentAdd20Regular, DocumentArrowDown20Regular, DocumentError20Regular, Edit20Regular, Eraser20Regular, ErrorCircle20Regular, Eye20Regular, Eyedropper20Regular, FolderLink20Regular, FolderOpen20Regular, FullScreenMaximize20Regular, Heart20Regular, History20Regular, Info20Regular, KeyCommand20Regular, LocalLanguage20Regular, Open20Regular, PaintBrush20Regular, PanelBottom20Regular, PanelLeft20Regular, PanelTopContract20Regular, Power20Regular, Print20Regular, Save20Regular, SaveMultiple20Regular, Search20Regular, SelectAllOn20Regular, Settings20Regular, Sparkle20Regular, TabDesktop20Regular, TextAsterisk20Regular, TextCaseLowercase20Regular, TextCaseTitle20Regular, TextCaseUppercase20Regular, TextFont20Regular, TextProofingTools20Regular, TextWholeWord20Regular, TextWrap20Regular, Warning20Regular, WeatherMoon20Regular, WeatherSunny20Regular, Window20Regular, ZoomIn20Regular, ZoomOut20Regular,
} from "@fluentui/react-icons";

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
}
export type IconType = ComponentType<IconProps>;

type Glyph = ComponentType<{ className?: string; style?: CSSProperties; "aria-hidden"?: boolean | "true" | "false" }>;

function icon(Glyph: Glyph): IconType {
  return function Icon({ size = 20, strokeWidth: _ignored, className, style, ...rest }) {
    void _ignored;
    return <Glyph className={className} style={{ width: size, height: size, flex: "none", ...style }} {...rest} />;
  };
}

export const AppWindow = icon(Window20Regular);
export const ArrowDownToLine = icon(ArrowDown20Regular);
export const ArrowUp = icon(ArrowUp20Regular);
export const BoxSelect = icon(SelectAllOn20Regular);
export const Brush = icon(PaintBrush20Regular);
export const CaseLower = icon(TextCaseLowercase20Regular);
export const CaseSensitive = icon(TextCaseTitle20Regular);
export const CaseUpper = icon(TextCaseUppercase20Regular);
export const Check = icon(Checkmark20Regular);
export const ChevronDown = icon(ChevronDown20Regular);
export const ChevronLeft = icon(ChevronLeft20Regular);
export const ChevronRight = icon(ChevronRight20Regular);
export const ChevronUp = icon(ChevronUp20Regular);
export const CircleAlert = icon(ErrorCircle20Regular);
export const CircleCheck = icon(CheckmarkCircle20Regular);
export const ClipboardPaste = icon(ClipboardPaste20Regular);
export const Clock = icon(Clock20Regular);
export const Command = icon(KeyCommand20Regular);
export const Copy = icon(Copy20Regular);
export const CopyPlus = icon(CopyAdd20Regular);
export const Eraser = icon(Eraser20Regular);
export const FileDown = icon(DocumentArrowDown20Regular);
export const FilePlus2 = icon(DocumentAdd20Regular);
export const FileText = icon(Document20Regular);
export const FileWarning = icon(DocumentError20Regular);
export const Focus = icon(Eye20Regular);
export const FolderCog = icon(FolderLink20Regular);
export const FolderOpen = icon(FolderOpen20Regular);
export const Github = icon(Open20Regular);
export const Heart = icon(Heart20Regular);
export const History = icon(History20Regular);
export const Info = icon(Info20Regular);
export const Languages = icon(LocalLanguage20Regular);
export const LayoutPanelTop = icon(TabDesktop20Regular);
export const Maximize = icon(FullScreenMaximize20Regular);
export const Maximize2 = icon(FullScreenMaximize20Regular);
export const Monitor = icon(Desktop20Regular);
export const Moon = icon(WeatherMoon20Regular);
export const Move = icon(ArrowMove20Regular);
export const Palette = icon(Color20Regular);
export const PanelBottom = icon(PanelBottom20Regular);
export const PanelLeft = icon(PanelLeft20Regular);
export const PanelTop = icon(PanelTopContract20Regular);
export const PenLine = icon(Edit20Regular);
export const Pipette = icon(Eyedropper20Regular);
export const Plus = icon(Add20Regular);
export const Power = icon(Power20Regular);
export const Printer = icon(Print20Regular);
export const Redo2 = icon(ArrowRedo20Regular);
export const RefreshCw = icon(ArrowSync20Regular);
export const Regex = icon(TextAsterisk20Regular);
export const Replace = icon(ArrowSwap20Regular);
export const ReplaceAll = icon(ArrowSyncCircle20Regular);
export const RotateCcw = icon(ArrowCounterclockwise20Regular);
export const Save = icon(Save20Regular);
export const SaveAll = icon(SaveMultiple20Regular);
export const Scissors = icon(Cut20Regular);
export const Search = icon(Search20Regular);
export const Settings = icon(Settings20Regular);
export const Sparkles = icon(Sparkle20Regular);
export const SpellCheck = icon(TextProofingTools20Regular);
export const Sun = icon(WeatherSunny20Regular);
export const SunMoon = icon(DarkTheme20Regular);
export const Trash2 = icon(Delete20Regular);
export const TriangleAlert = icon(Warning20Regular);
export const Type = icon(TextFont20Regular);
export const Undo2 = icon(ArrowUndo20Regular);
export const WholeWord = icon(TextWholeWord20Regular);
export const WrapText = icon(TextWrap20Regular);
export const X = icon(Dismiss20Regular);
export const ZoomIn = icon(ZoomIn20Regular);
export const ZoomOut = icon(ZoomOut20Regular);
export const LineNumbers = icon(TextNumberListLtr20Regular);
export const Blur = icon(Blur20Regular);
