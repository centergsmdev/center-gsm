"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "formatBlock";

export function RichTextEditor({
  id,
  value,
  onChange,
  ariaLabel,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const run = (command: Command, argument?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
      <div
        className="flex flex-wrap gap-1 border-b border-zinc-100 bg-zinc-50 p-2"
        role="toolbar"
        aria-label={`${ariaLabel} biçimlendirme araçları`}
      >
        <EditorButton label="Kalın" onClick={() => run("bold")}>
          <Bold />
        </EditorButton>
        <EditorButton label="İtalik" onClick={() => run("italic")}>
          <Italic />
        </EditorButton>
        <EditorButton label="Altı çizili" onClick={() => run("underline")}>
          <Underline />
        </EditorButton>
        <EditorButton label="Başlık" onClick={() => run("formatBlock", "h3")}>
          <Heading2 />
        </EditorButton>
        <EditorButton
          label="Madde işaretli liste"
          onClick={() => run("insertUnorderedList")}
        >
          <List />
        </EditorButton>
        <EditorButton
          label="Numaralı liste"
          onClick={() => run("insertOrderedList")}
        >
          <ListOrdered />
        </EditorButton>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className={cn(
          "min-h-40 px-4 py-3 text-sm leading-7 text-zinc-800 outline-none",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-red-500 [&_blockquote]:pl-4",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
        )}
      />
    </div>
  );
}

function EditorButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactElement<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-lg text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
