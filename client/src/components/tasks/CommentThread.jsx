import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatDistanceToNow } from 'date-fns';
import { useComments, useAddComment, useDeleteComment } from '../../api/comments';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function CommentThread({ taskId }) {
  const { user } = useAuthStore();
  const { data: comments = [], isLoading } = useComments(taskId);
  const addComment    = useAddComment();
  const deleteComment  = useDeleteComment();
  const [replyTo, setReplyTo] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async ({ content }) => {
    if (!taskId || !content?.trim()) return;
    await addComment.mutateAsync({ taskId, content, parentId: replyTo || undefined });
    reset();
    setReplyTo(null);
  };

  if (isLoading) return <div className="flex justify-center py-4"><Spinner /></div>;

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Comments ({comments.length})
      </h3>

      {topLevel.map(comment => (
        <div key={comment.id} className="space-y-3">
          <CommentItem
            comment={comment}
            currentUserId={user?.id}
            onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            onDelete={() => deleteComment.mutate({ commentId: comment.id, taskId })}
            isReplying={replyTo === comment.id}
          />

          {/* Replies */}
          {replies(comment.id).map(reply => (
            <div key={reply.id} className="ml-10">
              <CommentItem
                comment={reply}
                currentUserId={user?.id}
                onDelete={() => deleteComment.mutate({ commentId: reply.id, taskId })}
              />
            </div>
          ))}

          {/* Reply form */}
          {replyTo === comment.id && (
            <div className="ml-10">
              <CommentForm
                register={register}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                isLoading={addComment.isPending}
                placeholder="Write a reply..."
                onCancel={() => { setReplyTo(null); reset(); }}
              />
            </div>
          )}
        </div>
      ))}

      {/* New comment */}
      {!replyTo && (
        <CommentForm
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          isLoading={addComment.isPending}
          placeholder="Add a comment..."
        />
      )}
    </div>
  );
}

function CommentItem({ comment, currentUserId, onReply, onDelete, isReplying }) {
  return (
    <div className="flex gap-3 group">
      <Avatar user={comment.author} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {comment.author?.full_name || comment.author?.email}
          </span>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">
          {comment.body || comment.content}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {onReply && (
            <button
              onClick={onReply}
              className={`text-xs font-medium transition-colors ${isReplying ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600'}`}
            >
              Reply
            </button>
          )}
          {comment.author_id === currentUserId && (
            <button
              onClick={onDelete}
              className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentForm({ register, handleSubmit, onSubmit, isLoading, placeholder, onCancel }) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
      <div className="flex-1">
        <textarea
          placeholder={placeholder}
          rows={2}
          className="input w-full resize-none text-sm"
          {...register('content', { required: true })}
        />
        <div className="flex justify-end gap-2 mt-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="submit" size="sm" loading={isLoading}>Post</Button>
        </div>
      </div>
    </form>
  );
}
