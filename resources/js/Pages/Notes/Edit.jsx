import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Layout from '../../Components/Layout';
import ConfirmModal from '../../Components/ConfirmModal';
import RichTextEditor from '../../Components/Notes/RichTextEditor';
import uploadNoteFile, { formatBytes } from '../../Components/Notes/uploadNoteFile';

export default function NotesEdit({ note, members, defaultMemberId, limits }) {
    const isNew = !note;
    const [title, setTitle] = useState(note?.title ?? '');
    const [memberId, setMemberId] = useState(note?.member_id ?? defaultMemberId ?? '');
    const [attachments, setAttachments] = useState(note?.attachments ?? []);
    const [uploading, setUploading] = useState([]);
    const [errors, setErrors] = useState({});
    const [messages, setMessages] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [leaveTo, setLeaveTo] = useState(null);
    const editorRef = useRef(null);
    const fileInput = useRef(null);
    const skipGuard = useRef(false);

    // After a save the server sends the note back; start clean again.
    useEffect(() => {
        setTitle(note?.title ?? '');
        setMemberId(note?.member_id ?? defaultMemberId ?? '');
        setAttachments(note?.attachments ?? []);
        setDirty(false);
    }, [note?.id, note?.updated_at]);

    // Warn before leaving with unsaved changes.
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        // In-page dialog instead of window.confirm (mobile Chrome can suppress it).
        const removeInertia = router.on('before', (event) => {
            if (skipGuard.current) return;
            const visit = event.detail.visit;
            if (visit.method !== 'get') return;
            event.preventDefault();
            setLeaveTo(visit.url.href);
        });
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            removeInertia();
        };
    }, [dirty]);

    const addMessage = (text) => setMessages((list) => [...list, text]);

    const addAttachments = async (fileList) => {
        const files = Array.from(fileList || []);
        for (const file of files) {
            if (limits?.attachment_bytes && file.size > limits.attachment_bytes) {
                addMessage(`${file.name} is ${formatBytes(file.size)}; attachments can be up to ${formatBytes(limits.attachment_bytes)}.`);
                continue;
            }
            const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
            setUploading((list) => [...list, { key, name: file.name, size: file.size }]);
            try {
                const saved = await uploadNoteFile(file, 'attachment');
                setAttachments((list) => [...list, saved]);
                setDirty(true);
            } catch (e) {
                addMessage(e.message);
            } finally {
                setUploading((list) => list.filter((u) => u.key !== key));
            }
        }
    };

    const removeAttachment = (id) => {
        setAttachments((list) => list.filter((a) => a.id !== id));
        setDirty(true);
    };

    const save = () => {
        if (saving) return;
        if (uploading.length) {
            addMessage('Wait until the uploads finish, then save.');
            return;
        }
        const editor = editorRef.current;
        const empty = !editor || editor.isEmpty;
        const data = {
            title: title.trim() || 'Untitled note',
            body: empty ? '' : JSON.stringify(editor.getJSON()),
            body_text: empty ? '' : editor.getText({ blockSeparator: '\n' }),
            member_id: memberId || null,
            attachment_ids: attachments.map((a) => a.id),
        };
        const options = {
            preserveScroll: true,
            onStart: () => {
                setSaving(true);
                skipGuard.current = true;
            },
            onSuccess: () => setDirty(false),
            onError: (errs) => setErrors(errs),
            onFinish: () => {
                setSaving(false);
                skipGuard.current = false;
            },
        };
        if (isNew) router.post('/notes', data, options);
        else router.put(`/notes/${note.id}`, data, options);
    };

    // Ctrl/Cmd+S saves.
    const saveRef = useRef(save);
    saveRef.current = save;
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveRef.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const doDelete = () => {
        skipGuard.current = true;
        router.delete(`/notes/${note.id}`, { onFinish: () => (skipGuard.current = false) });
    };

    const activeMembers = members.filter((m) => m.is_active || String(m.id) === String(memberId));

    return (
        <Layout>
            <div className="py-4 max-w-4xl mx-auto">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <Link href="/notes" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">← Notes</Link>
                    <div className="flex flex-wrap items-center gap-2">
                        {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
                        {!isNew && (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                Delete
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>

                {messages.length > 0 && (
                    <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-900">
                        <div className="flex justify-between gap-2">
                            <ul className="list-disc pl-5 space-y-0.5">
                                {messages.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                            <button type="button" onClick={() => setMessages([])} className="text-yellow-800 hover:underline self-start">Dismiss</button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow p-4 space-y-4">
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                            placeholder="Title"
                            maxLength={200}
                            aria-label="Title"
                            className="w-full text-xl font-semibold px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor="note-member" className="text-sm text-gray-600">Member</label>
                        <select
                            id="note-member"
                            value={memberId}
                            onChange={(e) => { setMemberId(e.target.value); setDirty(true); }}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white min-w-[14rem]"
                        >
                            <option value="">— None —</option>
                            {activeMembers.map((m) => (
                                <option key={m.id} value={String(m.id)}>{m.name}{m.is_active ? '' : ' (inactive)'}</option>
                            ))}
                        </select>
                        {errors.member_id && <p className="text-xs text-red-600">{errors.member_id}</p>}
                    </div>

                    <RichTextEditor
                        key={note?.id ?? 'new'}
                        content={note?.body}
                        maxImageBytes={limits?.image_bytes}
                        onReady={(ed) => (editorRef.current = ed)}
                        onChange={(ed) => { editorRef.current = ed; setDirty(true); }}
                        onError={addMessage}
                    />
                    {errors.body && <p className="text-xs text-red-600">{errors.body}</p>}

                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); addAttachments(e.dataTransfer.files); }}
                        className={`rounded-lg border-2 border-dashed p-3 ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h2 className="text-sm font-semibold text-gray-700">Attachments ({attachments.length})</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 hidden sm:inline">
                                    Drop files here{limits?.attachment_bytes ? ` · up to ${formatBytes(limits.attachment_bytes)} each` : ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    + Attach files
                                </button>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => { addAttachments(e.target.files); e.target.value = ''; }}
                                />
                            </div>
                        </div>
                        {attachments.length === 0 && uploading.length === 0 && (
                            <p className="text-xs text-gray-400">No attachments.</p>
                        )}
                        <ul className="divide-y divide-gray-100">
                            {attachments.map((a) => (
                                <li key={a.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                                    <a href={a.url} target="_blank" rel="noopener" className="text-blue-700 hover:underline truncate">
                                        📎 {a.name}
                                    </a>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs text-gray-500">{formatBytes(a.size)}</span>
                                        <a href={`${a.url}?download=1`} className="text-xs text-gray-600 hover:underline">Download</a>
                                        <button type="button" onClick={() => removeAttachment(a.id)} className="text-xs text-red-600 hover:underline">
                                            Remove
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {uploading.map((u) => (
                                <li key={u.key} className="flex items-center justify-between gap-2 py-1.5 text-sm text-gray-500">
                                    <span className="truncate">⏳ {u.name}</span>
                                    <span className="text-xs">Uploading… {formatBytes(u.size)}</span>
                                </li>
                            ))}
                        </ul>
                        {attachments.length > 0 && dirty && (
                            <p className="text-xs text-gray-500 mt-1">Changes to attachments are kept when you save.</p>
                        )}
                    </div>

                    {!isNew && (
                        <p className="text-xs text-gray-500">
                            Created {note.created_at}{note.created_by ? ` by ${note.created_by}` : ''}
                            {note.updated_at ? ` · Last saved ${note.updated_at}${note.updated_by ? ` by ${note.updated_by}` : ''}` : ''}
                        </p>
                    )}
                </div>
            </div>

            <ConfirmModal
                open={!!leaveTo}
                title="Leave without saving?"
                danger
                confirmLabel="Leave"
                message="Your changes to this note are not saved."
                onConfirm={() => {
                    const url = leaveTo;
                    setLeaveTo(null);
                    skipGuard.current = true;
                    router.visit(url, { onFinish: () => (skipGuard.current = false) });
                }}
                onCancel={() => setLeaveTo(null)}
            />

            <ConfirmModal
                open={confirmDelete}
                title="Delete note?"
                danger
                confirmLabel="Delete"
                message={<>Delete <span className="font-semibold">"{note?.title}"</span>? You can restore it from Deleted notes.</>}
                onConfirm={() => { setConfirmDelete(false); doDelete(); }}
                onCancel={() => setConfirmDelete(false)}
            />
        </Layout>
    );
}
