"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, AlertCircle, MessageSquare, Send } from "lucide-react"
import { approveDesign, rejectDesign, requestChanges, addCommentToDesign } from "@/lib/api-client"

interface Comment {
  id: string;
  userId: string;
  userName: string;
  commentText: string;
  commentType: "general" | "revision_request" | "approval_note";
  elementRef?: string;
  createdAt: string;
  resolved?: boolean;
}

interface ApprovalWorkflowProps {
  designId: string;
  designName: string;
  lifecycleStatus: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "IN_PRODUCTION";
  comments?: Comment[];
  canReview?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

export function ApprovalWorkflow({
  designId,
  designName,
  lifecycleStatus,
  comments = [],
  canReview = false,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestedChanges, setRequestedChanges] = useState<string[]>([]);
  const [newChange, setNewChange] = useState("");

  const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    IN_REVIEW: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    IN_PRODUCTION: "bg-purple-100 text-purple-800",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    APPROVED: <CheckCircle2 className="h-4 w-4" />,
    REJECTED: <XCircle className="h-4 w-4" />,
    IN_REVIEW: <AlertCircle className="h-4 w-4" />,
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      await addCommentToDesign(designId, {
        commentText: newComment,
        commentType: "general",
      });
      setNewComment("");
      onStatusChange?.("comment_added");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const result = await approveDesign(designId);
      onStatusChange?.(result.data.lifecycleStatus);
    } catch (error) {
      console.error("Failed to approve:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;

    setIsLoading(true);
    try {
      const result = await rejectDesign(designId, rejectionReason);
      onStatusChange?.(result.data.lifecycleStatus);
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (requestedChanges.length === 0) return;

    setIsLoading(true);
    try {
      await requestChanges(designId, requestedChanges);
      setRequestedChanges([]);
      onStatusChange?.("changes_requested");
    } catch (error) {
      console.error("Failed to request changes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{designName}</CardTitle>
              <CardDescription>Design Review Status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {statusIcons[lifecycleStatus]}
              <Badge className={statusColors[lifecycleStatus]}>
                {lifecycleStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Comments Section */}
      {comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.commentType === "revision_request"
                    ? "border-yellow-200 bg-yellow-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{comment.userName}</p>
                    <p className="text-sm text-slate-600 mt-1">{comment.commentText}</p>
                  </div>
                  {comment.commentType === "revision_request" && (
                    <Badge variant="outline" className="ml-2">
                      Revision Needed
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Comment Section */}
      {canReview && lifecycleStatus === "IN_REVIEW" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Review Comment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Enter your review comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleAddComment}
              disabled={isLoading || !newComment.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Review Actions */}
      {canReview && lifecycleStatus === "IN_REVIEW" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => setShowRejectModal(true)}
                disabled={isLoading}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleRequestChanges}
                disabled={isLoading || requestedChanges.length === 0}
                variant="outline"
              >
                Request Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Changes Section */}
      {canReview && lifecycleStatus === "IN_REVIEW" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Requested Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requestedChanges.map((change, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                <span className="text-sm">{change}</span>
                <button
                  onClick={() =>
                    setRequestedChanges(requestedChanges.filter((_, i) => i !== idx))
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a change request..."
                value={newChange}
                onChange={(e) => setNewChange(e.target.value)}
                className="flex-1 px-2 py-1 border rounded text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newChange.trim()) {
                    setRequestedChanges([...requestedChanges, newChange]);
                    setNewChange("");
                  }
                }}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Reject Design</CardTitle>
            <CardDescription>Please provide a reason for rejection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={isLoading || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Confirm Rejection
              </Button>
              <Button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
