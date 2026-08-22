"use client";

import React, { useState } from "react";
import type { CommentResponse } from "@/types/staff_complaint";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/Icons";

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
    <Card variant="primary" padding="md" className="border-[#D6CFC3] shadow-civic space-y-4">
      <div className="flex items-center justify-between border-b border-[#D6CFC3] pb-3">
        <div className="flex items-center gap-2">
          <LockIcon className="w-4 h-4 text-[#292724]" />
          <div>
            <h3 className="font-serif-civic text-lg font-bold text-[#161616]">
              Internal Staff Notes ({comments.length})
            </h3>
            <p className="font-sans text-xs text-[#5D5A55]">
              Visible to municipal staff only — strictly confidential
            </p>
          </div>
        </div>
      </div>

      {comments.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-3.5 bg-[#EAE4DA]/50 border border-[#D6CFC3] rounded-sm text-xs space-y-1"
            >
              <div className="flex justify-between items-center text-[#5D5A55]">
                <span className="font-semibold text-[#161616]">
                  {c.author_name || "Municipal Officer"}
                </span>
                <span className="text-[11px]">
                  {new Date(c.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="font-sans text-[#161616] leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-sans text-xs text-[#5D5A55] italic">No internal staff notes added yet.</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-[#D6CFC3]">
        <textarea
          rows={3}
          placeholder="Add an internal staff note or case comment (max 1000 chars)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={1000}
          className="w-full p-3 bg-[#FBFAF7] border border-[#D6CFC3] rounded-sm text-xs text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#B7A58A]"
        />
        {error && <div className="font-sans text-xs text-[#9E524D] font-semibold">{error}</div>}
        <div className="flex items-center justify-between">
          <span className="font-sans text-[11px] text-[#5D5A55]">
            {inputText.length}/1000 chars
          </span>
          <Button
            type="submit"
            variant="dark"
            size="sm"
            disabled={submitting || !inputText.trim()}
          >
            {submitting ? "Posting Note..." : "Post Internal Note"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
