"use client";

import { useState } from "react";

interface Props {
  onType: (text: string) => void;
  onKey:  (key:  string) => void;
  onClose: () => void;
}

const SPECIAL_KEYS = [
  "enter", "backspace", "space", "tab", "esc",
  "up", "down", "left", "right",
  "ctrl+c", "ctrl+v", "ctrl+x", "ctrl+z", "ctrl+a",
  "win", "alt+tab", "delete", "home", "end", "pageup", "pagedown",
  "f1", "f2", "f3", "f4", "f5", "f11", "f12"
];

export function KeyboardPanel({ onType, onKey, onClose }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    if (text) {
      onType(text);
      setText("");
    } else {
      onKey("enter");
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t-[0.5px] border-border-tertiary bg-background-primary p-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      <div className="flex gap-2">
        <input
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-background-primary border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-primary outline-none focus:shadow-ring transition-shadow"
          placeholder="Digite e pressione Enter para enviar"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          className="bg-background-info border-[0.5px] border-border-info rounded-md px-4 py-2 text-[13px] text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
          onClick={submit}
        >
          Enviar
        </button>
        <button
          className="bg-transparent border-[0.5px] border-border-secondary rounded-md px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary active:scale-[0.98] transition-transform flex items-center justify-center"
          onClick={onClose}
          aria-label="Fechar teclado"
        >
          <i className="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SPECIAL_KEYS.map((k) => (
          <button
            key={k}
            className="bg-transparent border-[0.5px] border-border-secondary rounded-md px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-wide text-text-secondary hover:text-text-primary hover:bg-background-secondary active:scale-[0.98] transition-transform"
            onClick={() => onKey(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
