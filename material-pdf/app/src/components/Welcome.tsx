import { Combine, FileText, FolderOpen, ImagePlus, MousePointerClick, Palette, X } from "lucide-react";
import { openPicker, openRecent } from "../lib/actions";
import { useStore, useT } from "../lib/store";
import { Button, IconButton } from "./ui";
import { Logo } from "./Logo";
import { Shape, type ShapeKind } from "./Shape";

export function Welcome() {
  const t = useT();
  const { recent, removeRecent, clearRecent, openDialog } = useStore();
  const tiles: { icon: JSX.Element; title: string; sub: string; shape: ShapeKind; tone: "primary" | "secondary" | "tertiary"; run: () => void }[] = [
    { icon: <Combine size={26} />, title: t("merge"), sub: t("tileMerge"), shape: "flower", tone: "primary", run: () => openDialog("merge") },
    { icon: <ImagePlus size={26} />, title: t("imagesToPdf"), sub: t("tileImages"), shape: "clover", tone: "secondary", run: () => openDialog("images") },
    { icon: <Palette size={26} />, title: t("settings"), sub: t("tileTheme"), shape: "cookie", tone: "tertiary", run: () => openDialog("settings") },
  ];
  return (
    <main className="welcome">
      <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      <section className="hero">
        <Logo size={96} />
        <h1>{t("welcomeTitle")}</h1>
        <p>{t("welcomeSub")}</p>
        <Button variant="filled" icon={<FolderOpen size={22} />} onClick={openPicker} className="big">{t("openPdf")}</Button>
        <div className="drop-hint"><MousePointerClick size={16} /> {t("dropHere")}</div>
      </section>
      <section className="tiles">
        {tiles.map((x, i) => (
          <button key={i} className="tile ripple" style={{ animationDelay: `${i * 70}ms` }} onClick={x.run}>
            <Shape kind={x.shape} tone={x.tone} size={64}>{x.icon}</Shape>
            <b>{x.title}</b><small>{x.sub}</small>
          </button>
        ))}
      </section>
      <section className="recent">
        <div className="recent-head"><h2>{t("recent")}</h2>{recent.length > 0 && <Button variant="text" onClick={clearRecent}>{t("clearRecent")}</Button>}</div>
        {recent.length === 0 ? <div className="recent-empty">{t("noRecent")}</div> : (
          <ul>
            {recent.map((r, i) => (
              <li key={r.path} style={{ animationDelay: `${i * 40}ms` }}>
                <button className="recent-card ripple" onClick={() => openRecent(r.path)} data-tip={r.name}>
                  <Shape kind="cookie" size={48} tone="secondary"><FileText size={22} /></Shape>
                  <span className="rc-text"><b>{r.name}</b><small>{r.path}</small></span>
                </button>
                <IconButton size="sm" icon={<X size={16} />} label={t("removeFromList")} onClick={() => removeRecent(r.path)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
