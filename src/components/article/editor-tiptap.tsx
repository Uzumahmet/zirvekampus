'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link2,
  Unlink,
  Image as ImageIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { useEffect } from 'react';

interface EditorTipTapProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function EditorTipTap({ value, onChange, placeholder = 'İçeriğinizi buraya yazın...' }: EditorTipTapProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-erciyes-red hover:underline cursor-pointer font-medium transition-colors',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-2xl max-w-full my-6 border border-border shadow-md mx-auto block',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-5 py-4 bg-secondary/15 rounded-b-2xl border border-t-0 border-border text-sm leading-relaxed text-foreground font-reading',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync value from outside if it changes (e.g. when loaded during edit mode)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      if (!editor.isFocused) {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Bağlantı Adresi (URL) girin:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Ensure protocol is added if missing
    let formattedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      formattedUrl = `https://${url}`;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
  };

  const addImage = () => {
    const url = window.prompt('Görsel Adresi (URL) girin:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="w-full flex flex-col tiptap-editor">
      {/* TOOLBAR */}
      <div className="bg-secondary/40 border border-border rounded-t-2xl p-1.5 flex flex-wrap gap-0.5 items-center sticky top-[64px] z-30 backdrop-blur-md">
        {/* Kalın */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('bold')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Kalın (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        {/* İtalik */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('italic')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="İtalik (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        {/* Altı Çizili */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('underline')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Altı Çizili (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        {/* Üstü Çizili */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('strike')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Üstü Çizili"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Heading 2 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Büyük Başlık (H2)"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Alt Başlık (H3)"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Sırasız Liste */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Sırasız Liste"
        >
          <List className="w-4 h-4" />
        </button>

        {/* Sıralı Liste */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Sıralı Liste"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Kod Bloğu */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Kod Bloğu"
        >
          <Code className="w-4 h-4" />
        </button>

        {/* Blok Alıntı */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Alıntı (Blockquote)"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Link Ekle */}
        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded-lg transition-colors ${
            editor.isActive('link')
              ? 'bg-erciyes-red/10 text-erciyes-red'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
          title="Bağlantı Ekle"
        >
          <Link2 className="w-4 h-4" />
        </button>

        {/* Link Kaldır */}
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Bağlantıyı Kaldır"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}

        {/* Görsel Ekle */}
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          title="Görsel Ekle (URL ile)"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1 ml-auto" />

        {/* Geri Al */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-30"
          title="Geri Al"
        >
          <Undo className="w-4 h-4" />
        </button>

        {/* İleri Al */}
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-30"
          title="Yeniden Yap"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* WRITING AREA */}
      <EditorContent editor={editor} />
    </div>
  );
}
