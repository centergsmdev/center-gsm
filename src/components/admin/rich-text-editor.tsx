"use client";

import { useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Braces,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MessageSquareQuote,
  Pilcrow,
  Table2,
  UnderlineIcon,
  Video,
  Globe2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { downloadRemoteImage } from "@/lib/admin/remote-images";

const Vimeo = Node.create({
  name: "vimeo",
  group: "block",
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'iframe[data-provider="vimeo"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(HTMLAttributes, {
        "data-provider": "vimeo",
        title: "Vimeo video",
        allow: "autoplay; fullscreen; picture-in-picture",
        allowfullscreen: "true",
      }),
    ];
  },
});

type DialogMode = "link" | "video" | "image" | null;
const MAX_CONTENT_IMAGE_SIZE = 4 * 1024 * 1024;

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
  const imageInput = useRef<HTMLInputElement>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
      Youtube.configure({ nocookie: true, allowFullscreen: true }),
      Vimeo,
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        class:
          "min-h-64 px-4 py-4 text-sm leading-7 text-zinc-800 outline-none",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML())
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError("");
    if (file.size > MAX_CONTENT_IMAGE_SIZE) {
      setError("Dosya boyutu 4 MB sınırını aştı.");
      setUploading(false);
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    const body = new FormData();
    body.set("file", file);
    try {
      const response = await fetch("/api/admin/product-content-images", {
        method: "POST",
        body,
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          response.status === 413
            ? "Dosya boyutu yükleme sınırını aştı."
            : "Sunucu geçerli bir yükleme yanıtı döndürmedi.",
        );
      }
      const result = (await response.json()) as {
        url?: string;
        width?: number;
        height?: number;
        error?: string;
      };
      if (!response.ok || !result.url)
        throw new Error(result.error ?? "Görsel yüklenemedi.");
      editor
        ?.chain()
        .focus()
        .setImage({
          src: result.url,
          alt: file.name.replace(/\.[^.]+$/, ""),
        })
        .run();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Görsel yüklenemedi.",
      );
    } finally {
      setUploading(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const insertUrl = () => {
    if (!editor || !url.trim()) return;
    if (dialogMode === "link") {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.trim() })
        .run();
    } else {
      const video = parseVideoUrl(url.trim());
      if (!video) {
        setError(
          "Yalnızca geçerli YouTube veya Vimeo bağlantısı ekleyebilirsiniz.",
        );
        return;
      }
      if (video.provider === "youtube")
        editor.commands.setYoutubeVideo({ src: video.src });
      else
        editor.commands.insertContent({
          type: "vimeo",
          attrs: { src: video.src },
        });
    }
    setDialogMode(null);
    setUrl("");
    setError("");
  };

  const insertImageUrl = async () => {
    if (!url.trim()) return;
    setUploading(true);
    setError("");
    const result = await downloadRemoteImage(url, "content");
    if (!result.data) {
      setUploading(false);
      setError(result.error);
      return;
    }
    setDialogMode(null);
    setUrl("");
    await uploadImage(result.data);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
      <div
        className="flex flex-wrap gap-1 border-b border-zinc-100 bg-zinc-50 p-2"
        role="toolbar"
        aria-label={`${ariaLabel} biçimlendirme araçları`}
      >
        <EditorButton
          label="Kalın"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </EditorButton>
        <EditorButton
          label="İtalik"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </EditorButton>
        <EditorButton
          label="Altı çizili"
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </EditorButton>
        <EditorButton
          label="Başlık"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 />
        </EditorButton>
        <EditorButton
          label="Paragraf"
          active={editor?.isActive("paragraph")}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          <Pilcrow />
        </EditorButton>
        <EditorButton
          label="Madde işaretli liste"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </EditorButton>
        <EditorButton
          label="Numaralı liste"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </EditorButton>
        <EditorButton
          label="Alıntı"
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <MessageSquareQuote />
        </EditorButton>
        <EditorButton
          label="Kod bloğu"
          active={editor?.isActive("codeBlock")}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Braces />
        </EditorButton>
        <EditorButton
          label="Bağlantı ekle"
          active={editor?.isActive("link")}
          onClick={() => {
            setDialogMode("link");
            setUrl(editor?.getAttributes("link").href ?? "");
          }}
        >
          <Link2 />
        </EditorButton>
        <EditorButton
          label="Tablo ekle"
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <Table2 />
        </EditorButton>
        <EditorButton
          label="Görsel ekle"
          disabled={uploading}
          onClick={() => imageInput.current?.click()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        </EditorButton>
        <EditorButton
          label="Görsel adresinden ekle"
          disabled={uploading}
          onClick={() => {
            setDialogMode("image");
            setUrl("");
          }}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Globe2 />}
        </EditorButton>
        <EditorButton
          label="Video ekle"
          onClick={() => {
            setDialogMode("video");
            setUrl("");
          }}
        >
          <Video />
        </EditorButton>
        <input
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
        />
      </div>
      {dialogMode ? (
        <div className="flex flex-col gap-2 border-b border-zinc-100 bg-white p-3 sm:flex-row">
          <label className="sr-only" htmlFor={`${id}-${dialogMode}-url`}>
            {dialogMode === "link"
              ? "Bağlantı adresi"
              : dialogMode === "image"
                ? "Görsel adresi"
                : "Video adresi"}
          </label>
          <input
            id={`${id}-${dialogMode}-url`}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (dialogMode === "image") void insertImageUrl();
                else insertUrl();
              }
            }}
            autoFocus
            placeholder={
              dialogMode === "link"
                ? "https://…"
                : dialogMode === "image"
                  ? "https://ornek.com/urun-aciklama-gorseli.jpg"
                  : "YouTube veya Vimeo bağlantısı"
            }
            className="min-h-10 flex-1 rounded-lg border border-zinc-200 px-3 text-base outline-none focus:border-red-500 sm:text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (dialogMode === "image") void insertImageUrl();
                else insertUrl();
              }}
              disabled={uploading}
              className="min-h-10 rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white"
            >
              Ekle
            </button>
            <button
              type="button"
              onClick={() => {
                setDialogMode(null);
                setUrl("");
              }}
              className="min-h-10 rounded-lg border border-zinc-200 px-4 text-xs font-bold"
            >
              İptal
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}
      <EditorContent
        editor={editor}
        className={cn("rich-product-content", "[&_.ProseMirror]:min-h-64")}
      />
    </div>
  );
}

function parseVideoUrl(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be")
      return {
        provider: "youtube" as const,
        src: `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`,
      };
    if (["youtube.com", "m.youtube.com"].includes(host)) {
      const id =
        parsed.searchParams.get("v") ??
        parsed.pathname.split("/").filter(Boolean).pop();
      return id
        ? {
            provider: "youtube" as const,
            src: `https://www.youtube-nocookie.com/embed/${id}`,
          }
        : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id
        ? {
            provider: "vimeo" as const,
            src: `https://player.vimeo.com/video/${id}`,
          }
        : null;
    }
  } catch {
    return null;
  }
  return null;
}

function EditorButton({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-zinc-600 transition hover:bg-white hover:text-zinc-950 hover:shadow-sm disabled:opacity-50 [&_svg]:size-4",
        active && "bg-white text-red-600 shadow-sm",
      )}
      aria-label={label}
      title={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
