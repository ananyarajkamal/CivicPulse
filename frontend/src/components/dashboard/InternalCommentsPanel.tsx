"use client";

import { useState } from "react";
import type { CommentResponse } from "@/types/staff_complaint";

export default function InternalCommentsPanel({
  comments,
  onAddComment,
}: {
  comments: CommentResponse[];
  onAddComment: (text: string) => Promise<void>;
}) {
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await onAddComment(inputText.trim());
      setInputText("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to submit comment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            💬 Internal Staff Comments ({comments.length})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly internal commentary — never exposed on public citizen tracker
          </p>
        </div>
      </div>

      {comments.length > 0 ? (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div className="flex justify-between items-center text-slate-500 mb-1">
                <span className="font-semibold text-slate-800">
                  {c.author_name || "Municipal Officer"}
                </span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-slate-900">{c.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No internal comments added yet.</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-slate-100">
        <textarea
          rows={2}
          placeholder="Add an internal staff note or comment (max 1000 chars)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={1000}
          className="w-full p-3 border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !inputText.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Post Internal Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
