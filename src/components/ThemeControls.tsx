import type { CSSProperties } from "react";
import { ACCENT_OPTIONS, useTheme } from "../theme/Theme";

export default function ThemeControls() {
  const { theme, accent, toggle, setAccent } = useTheme();
  return <div className="theme-controls" aria-label="外观设置">
    <button className="theme-mode" onClick={toggle} aria-label="切换明暗主题" title="切换明暗主题">{theme === "dark" ? "☾" : "☀"}</button>
    <span className="control-divider" />
    <div className="accent-swatches" aria-label="选择色调">
      {ACCENT_OPTIONS.map((option) => <button key={option.name} className={`accent-swatch ${accent === option.name ? "is-active" : ""}`} style={{ "--swatch": option.color } as CSSProperties} onClick={() => setAccent(option.name)} aria-label={`使用${option.label}色调`} aria-pressed={accent === option.name} title={option.label} />)}
    </div>
  </div>;
}
