import { MODE_NAMES, type ModeIndex } from "../engine/Input";

export function bindOverlay(
  onEnter: () => void,
  onListen: () => void,
): {
  setMode: (i: ModeIndex) => void;
  setHudVisible: (v: boolean) => void;
  setListenActive: (v: boolean) => void;
} {
  const veil = document.getElementById("veil");
  const enter = document.getElementById("enter");
  const modeLabel = document.getElementById("mode-label");
  const hud = document.getElementById("hud");
  const listen = document.getElementById("listen");

  enter?.addEventListener("click", () => {
    veil?.classList.add("dismissed");
    onEnter();
  });

  listen?.addEventListener("click", () => {
    onListen();
  });

  return {
    setMode(i) {
      if (modeLabel) modeLabel.textContent = MODE_NAMES[i];
    },
    setHudVisible(v) {
      hud?.classList.toggle("hidden", !v);
    },
    setListenActive(v) {
      listen?.classList.toggle("active", v);
      listen?.setAttribute("aria-pressed", String(v));
    },
  };
}
