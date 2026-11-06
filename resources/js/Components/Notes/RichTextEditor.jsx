import { useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { Placeholder } from '@tiptap/extensions';
import uploadNoteFile, { formatBytes } from './uploadNoteFile';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function ToolbarButton({ onClick, active, disabled, title, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active ? 'true' : 'false'}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`min-w-[2rem] h-8 px-2 text-sm rounded transition-colors disabled:opacity-40 ${
                active ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <span className="w-px h-6 bg-gray-200 mx-1" aria-hidden="true" />;
}

// Rich-text field for notes. Pasted or dropped images are uploaded to the server
// right away and shown from there (never stored inside the text).
export default function RichTextEditor({ content, onReady, onChange, onError, maxImageBytes, placeholder }) {
    const [uploading, setUploading] = useState(0);
    const [linkDraft, setLinkDraft] = useState(null); // null = link form closed
    const imageInput = useRef(null);
    // Keep the latest callbacks for the extensions, which are created only once.
    const handlers = useRef({});
    handlers.current = { onReady, onChange, onError, maxImageBytes };

    const uploadImages = async (editor, files, pos) => {
        for (const file of files) {
            if (!IMAGE_TYPES.includes(file.type)) {
                handlers.current.onError?.(`${file.name}: only JPG, PNG, GIF and WebP images can be pasted.`);
                continue;
            }
            const max = handlers.current.maxImageBytes;
            if (max && file.size > max) {
                handlers.current.onError?.(`${file.name} is ${formatBytes(file.size)}; images can be up to ${formatBytes(max)}.`);
                continue;
            }
            setUploading((n) => n + 1);
            try {
                const saved = await uploadNoteFile(file, 'image');
                const node = { type: 'image', attrs: { src: saved.url, alt: saved.name } };
                const chain = editor.chain().focus();
                (pos != null ? chain.insertContentAt(pos, node) : chain.insertContent(node)).run();
            } catch (e) {
                handlers.current.onError?.(e.message);
            } finally {
                setUploading((n) => n - 1);
            }
        }
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
            }),
            Image.configure({ allowBase64: false }),
            Placeholder.configure({ placeholder: placeholder || 'Write here… Paste or drop images.' }),
            FileHandler.configure({
                allowedMimeTypes: IMAGE_TYPES,
                onPaste: (ed, files) => uploadImages(ed, files, null),
                onDrop: (ed, files, pos) => uploadImages(ed, files, pos),
            }),
        ],
        content: content || '',
        editorProps: {
            attributes: { class: 'note-content min-h-[16rem] px-4 py-3 focus:outline-none' },
        },
        onCreate: ({ editor: ed }) => handlers.current.onReady?.(ed),
        onUpdate: ({ editor: ed }) => handlers.current.onChange?.(ed),
    });

    const state = useEditorState({
        editor,
        selector: ({ editor: ed }) => {
            if (!ed) return {};
            return {
                bold: ed.isActive('bold'),
                italic: ed.isActive('italic'),
                underline: ed.isActive('underline'),
                strike: ed.isActive('strike'),
                h2: ed.isActive('heading', { level: 2 }),
                h3: ed.isActive('heading', { level: 3 }),
                bullet: ed.isActive('bulletList'),
                ordered: ed.isActive('orderedList'),
                quote: ed.isActive('blockquote'),
                code: ed.isActive('codeBlock'),
                link: ed.isActive('link'),
                canUndo: ed.can().undo(),
                canRedo: ed.can().redo(),
            };
        },
    }) || {};

    if (!editor) return null;

    const run = (fn) => () => fn(editor.chain().focus()).run();

    // Small in-page link form (window.prompt is unreliable on mobile Chrome).
    const openLinkForm = () => setLinkDraft(editor.getAttributes('link').href || '');
    const applyLink = (e) => {
        e.preventDefault();
        const url = (linkDraft || '').trim();
        const chain = editor.chain().focus().extendMarkRange('link');
        (url ? chain.setLink({ href: url }) : chain.unsetLink()).run();
        setLinkDraft(null);
    };

    const pickImages = (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length) uploadImages(editor, files, null);
    };

    return (
        <div className="border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400">
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t-lg sticky top-0 z-10">
                <ToolbarButton title="Bold (Ctrl+B)" active={state.bold} onClick={run((c) => c.toggleBold())}><b>B</b></ToolbarButton>
                <ToolbarButton title="Italic (Ctrl+I)" active={state.italic} onClick={run((c) => c.toggleItalic())}><i>I</i></ToolbarButton>
                <ToolbarButton title="Underline (Ctrl+U)" active={state.underline} onClick={run((c) => c.toggleUnderline())}><u>U</u></ToolbarButton>
                <ToolbarButton title="Strikethrough" active={state.strike} onClick={run((c) => c.toggleStrike())}><s>S</s></ToolbarButton>
                <Divider />
                <ToolbarButton title="Heading" active={state.h2} onClick={run((c) => c.toggleHeading({ level: 2 }))}>H2</ToolbarButton>
                <ToolbarButton title="Subheading" active={state.h3} onClick={run((c) => c.toggleHeading({ level: 3 }))}>H3</ToolbarButton>
                <Divider />
                <ToolbarButton title="Bulleted list" active={state.bullet} onClick={run((c) => c.toggleBulletList())}>• List</ToolbarButton>
                <ToolbarButton title="Numbered list" active={state.ordered} onClick={run((c) => c.toggleOrderedList())}>1. List</ToolbarButton>
                <ToolbarButton title="Quote" active={state.quote} onClick={run((c) => c.toggleBlockquote())}>❝</ToolbarButton>
                <ToolbarButton title="Code block" active={state.code} onClick={run((c) => c.toggleCodeBlock())}>{'</>'}</ToolbarButton>
                <Divider />
                <ToolbarButton title="Link" active={state.link} onClick={openLinkForm}>🔗</ToolbarButton>
                <ToolbarButton title="Insert image" onClick={() => imageInput.current?.click()}>🖼</ToolbarButton>
                <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} multiple className="hidden" onChange={pickImages} />
                <Divider />
                <ToolbarButton title="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={run((c) => c.undo())}>↶</ToolbarButton>
                <ToolbarButton title="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={run((c) => c.redo())}>↷</ToolbarButton>
                {uploading > 0 && (
                    <span className="ml-auto text-xs text-blue-700">Uploading image{uploading > 1 ? 's' : ''}…</span>
                )}
            </div>
            {linkDraft !== null && (
                <form onSubmit={applyLink} className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-blue-50">
                    <label htmlFor="note-link" className="text-xs text-gray-700">Link</label>
                    <input
                        id="note-link"
                        type="text"
                        autoFocus
                        value={linkDraft}
                        onChange={(e) => setLinkDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setLinkDraft(null)}
                        placeholder="https://… (empty removes the link)"
                        className="flex-1 min-w-[12rem] px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <button type="submit" className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                    <button type="button" onClick={() => setLinkDraft(null)} className="px-2 py-1 text-sm text-gray-600 hover:underline">Cancel</button>
                </form>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
