/* Fluent System Icons (Microsoft), exposed under the names the app already uses.
 * Icons use the 16 px glyph at small sizes and the 20 px glyph otherwise (Fluent draws both so they stay crisp). `strokeWidth` is accepted and ignored,
 * so call sites that were written for stroke icons keep working. */
import type { ComponentType, CSSProperties } from "react";
import {
  Add20Regular, Add16Regular, ArrowCounterclockwise20Regular, ArrowCounterclockwise16Regular, ArrowDown20Regular, ArrowDown16Regular, ArrowDownload20Regular, ArrowDownload16Regular, ArrowMove20Regular, ArrowRedo20Regular, ArrowRedo16Regular, ArrowSwap20Regular, ArrowSwap16Regular, ArrowSync20Regular, ArrowSync16Regular, ArrowSyncCircle20Regular, ArrowSyncCircle16Regular, ArrowUndo20Regular, ArrowUndo16Regular, ArrowUp20Regular, ArrowUp16Regular, ArrowUpload20Regular, ArrowUpload16Regular, Blur20Regular, Blur16Regular, Checkmark20Regular, Checkmark16Regular, CheckmarkCircle20Regular, CheckmarkCircle16Regular, ChevronDown20Regular, ChevronDown16Regular, ChevronLeft20Regular, ChevronLeft16Regular, ChevronRight20Regular, ChevronRight16Regular, ChevronUp20Regular, ChevronUp16Regular, ClipboardPaste20Regular, ClipboardPaste16Regular, Clock20Regular, Clock16Regular, Color20Regular, Color16Regular, Copy20Regular, Copy16Regular, CopyAdd20Regular, Cut20Regular, Cut16Regular, DarkTheme20Regular, Delete20Regular, Delete16Regular, Desktop20Regular, Desktop16Regular, Dismiss20Regular, Dismiss16Regular, Document20Regular, Document16Regular, DocumentAdd20Regular, DocumentAdd16Regular, DocumentArrowDown20Regular, DocumentArrowDown16Regular, DocumentError20Regular, DocumentError16Regular, Edit20Regular, Edit16Regular, Eraser20Regular, ErrorCircle20Regular, ErrorCircle16Regular, Eye20Regular, Eye16Regular, Eyedropper20Regular, Eyedropper16Regular, FolderLink20Regular, FolderLink16Regular, FolderOpen20Regular, FolderOpen16Regular, FullScreenMaximize20Regular, FullScreenMaximize16Regular, Heart20Regular, Heart16Regular, History20Regular, History16Regular, Info20Regular, Info16Regular, KeyCommand20Regular, KeyCommand16Regular, LocalLanguage20Regular, LocalLanguage16Regular, Open20Regular, Open16Regular, PaintBrush20Regular, PaintBrush16Regular, PanelBottom20Regular, PanelLeft20Regular, PanelLeft16Regular, PanelTopContract20Regular, Pin20Regular, Pin16Regular, PinOff20Regular, PinOff16Regular, Power20Regular, Print20Regular, Print16Regular, Save20Regular, Save16Regular, SaveMultiple20Regular, SaveMultiple16Regular, Search20Regular, Search16Regular, SelectAllOn20Regular, SelectAllOn16Regular, Settings20Regular, Settings16Regular, Sparkle20Regular, Sparkle16Regular, Square20Regular, Square16Regular, SquareMultiple20Regular, SquareMultiple16Regular, Subtract20Regular, Subtract16Regular, TabDesktop20Regular, TabDesktop16Regular, TextAsterisk20Regular, TextAsterisk16Regular, TextCaseLowercase20Regular, TextCaseLowercase16Regular, TextCaseTitle20Regular, TextCaseTitle16Regular, TextCaseUppercase20Regular, TextCaseUppercase16Regular, TextFont20Regular, TextFont16Regular, TextNumberListLtr20Regular, TextNumberListLtr16Regular, TextProofingTools20Regular, TextWholeWord20Regular, TextWholeWord16Regular, TextWrap20Regular, TextWrap16Regular, Warning20Regular, Warning16Regular, WeatherMoon20Regular, WeatherMoon16Regular, WeatherSunny20Regular, WeatherSunny16Regular, Window20Regular, Window16Regular, ZoomIn20Regular, ZoomIn16Regular, ZoomOut20Regular, ZoomOut16Regular,
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

function icon(Large: Glyph, Small?: Glyph): IconType {
  return function Icon({ size = 20, strokeWidth: _ignored, className, style, ...rest }) {
    void _ignored;
    const G = Small && size <= 17 ? Small : Large;
    return <G className={className} style={{ width: size, height: size, flex: "none", ...style }} {...rest} />;
  };
}

export const AppWindow = icon(Window20Regular, Window16Regular);
export const ArrowDownToLine = icon(ArrowDown20Regular, ArrowDown16Regular);
export const ArrowUp = icon(ArrowUp20Regular, ArrowUp16Regular);
export const Blur = icon(Blur20Regular, Blur16Regular);
export const BoxSelect = icon(SelectAllOn20Regular, SelectAllOn16Regular);
export const Brush = icon(PaintBrush20Regular, PaintBrush16Regular);
export const CaseLower = icon(TextCaseLowercase20Regular, TextCaseLowercase16Regular);
export const CaseSensitive = icon(TextCaseTitle20Regular, TextCaseTitle16Regular);
export const CaseUpper = icon(TextCaseUppercase20Regular, TextCaseUppercase16Regular);
export const Check = icon(Checkmark20Regular, Checkmark16Regular);
export const ChevronDown = icon(ChevronDown20Regular, ChevronDown16Regular);
export const ChevronLeft = icon(ChevronLeft20Regular, ChevronLeft16Regular);
export const ChevronRight = icon(ChevronRight20Regular, ChevronRight16Regular);
export const ChevronUp = icon(ChevronUp20Regular, ChevronUp16Regular);
export const CircleAlert = icon(ErrorCircle20Regular, ErrorCircle16Regular);
export const CircleCheck = icon(CheckmarkCircle20Regular, CheckmarkCircle16Regular);
export const ClipboardPaste = icon(ClipboardPaste20Regular, ClipboardPaste16Regular);
export const Clock = icon(Clock20Regular, Clock16Regular);
export const Command = icon(KeyCommand20Regular, KeyCommand16Regular);
export const Copy = icon(Copy20Regular, Copy16Regular);
export const CopyPlus = icon(CopyAdd20Regular);
export const Download = icon(ArrowDownload20Regular, ArrowDownload16Regular);
export const Eraser = icon(Eraser20Regular);
export const FileDown = icon(DocumentArrowDown20Regular, DocumentArrowDown16Regular);
export const FilePlus2 = icon(DocumentAdd20Regular, DocumentAdd16Regular);
export const FileText = icon(Document20Regular, Document16Regular);
export const FileWarning = icon(DocumentError20Regular, DocumentError16Regular);
export const Focus = icon(Eye20Regular, Eye16Regular);
export const FolderCog = icon(FolderLink20Regular, FolderLink16Regular);
export const FolderOpen = icon(FolderOpen20Regular, FolderOpen16Regular);
export const Github = icon(Open20Regular, Open16Regular);
export const Heart = icon(Heart20Regular, Heart16Regular);
export const History = icon(History20Regular, History16Regular);
export const Info = icon(Info20Regular, Info16Regular);
export const Languages = icon(LocalLanguage20Regular, LocalLanguage16Regular);
export const LayoutPanelTop = icon(TabDesktop20Regular, TabDesktop16Regular);
export const LineNumbers = icon(TextNumberListLtr20Regular, TextNumberListLtr16Regular);
export const Maximize = icon(FullScreenMaximize20Regular, FullScreenMaximize16Regular);
export const Maximize2 = icon(FullScreenMaximize20Regular, FullScreenMaximize16Regular);
export const MaximizeBox = icon(Square20Regular, Square16Regular);
export const Minimize = icon(Subtract20Regular, Subtract16Regular);
export const Monitor = icon(Desktop20Regular, Desktop16Regular);
export const Moon = icon(WeatherMoon20Regular, WeatherMoon16Regular);
export const Move = icon(ArrowMove20Regular);
export const Palette = icon(Color20Regular, Color16Regular);
export const PanelBottom = icon(PanelBottom20Regular);
export const PanelLeft = icon(PanelLeft20Regular, PanelLeft16Regular);
export const PanelTop = icon(PanelTopContract20Regular);
export const PenLine = icon(Edit20Regular, Edit16Regular);
export const Pin = icon(Pin20Regular, Pin16Regular);
export const PinOff = icon(PinOff20Regular, PinOff16Regular);
export const Pipette = icon(Eyedropper20Regular, Eyedropper16Regular);
export const Plus = icon(Add20Regular, Add16Regular);
export const Power = icon(Power20Regular);
export const Printer = icon(Print20Regular, Print16Regular);
export const Redo2 = icon(ArrowRedo20Regular, ArrowRedo16Regular);
export const RefreshCw = icon(ArrowSync20Regular, ArrowSync16Regular);
export const Regex = icon(TextAsterisk20Regular, TextAsterisk16Regular);
export const Replace = icon(ArrowSwap20Regular, ArrowSwap16Regular);
export const ReplaceAll = icon(ArrowSyncCircle20Regular, ArrowSyncCircle16Regular);
export const RestoreBox = icon(SquareMultiple20Regular, SquareMultiple16Regular);
export const RotateCcw = icon(ArrowCounterclockwise20Regular, ArrowCounterclockwise16Regular);
export const Save = icon(Save20Regular, Save16Regular);
export const SaveAll = icon(SaveMultiple20Regular, SaveMultiple16Regular);
export const Scissors = icon(Cut20Regular, Cut16Regular);
export const Search = icon(Search20Regular, Search16Regular);
export const Settings = icon(Settings20Regular, Settings16Regular);
export const Sparkles = icon(Sparkle20Regular, Sparkle16Regular);
export const SpellCheck = icon(TextProofingTools20Regular);
export const Sun = icon(WeatherSunny20Regular, WeatherSunny16Regular);
export const SunMoon = icon(DarkTheme20Regular);
export const Trash2 = icon(Delete20Regular, Delete16Regular);
export const TriangleAlert = icon(Warning20Regular, Warning16Regular);
export const Type = icon(TextFont20Regular, TextFont16Regular);
export const Undo2 = icon(ArrowUndo20Regular, ArrowUndo16Regular);
export const Upload = icon(ArrowUpload20Regular, ArrowUpload16Regular);
export const WholeWord = icon(TextWholeWord20Regular, TextWholeWord16Regular);
export const WrapText = icon(TextWrap20Regular, TextWrap16Regular);
export const X = icon(Dismiss20Regular, Dismiss16Regular);
export const ZoomIn = icon(ZoomIn20Regular, ZoomIn16Regular);
export const ZoomOut = icon(ZoomOut20Regular, ZoomOut16Regular);
