const { supabaseAdmin } = require('../../config/supabase');

const getComments = async (req, res, next) => {
  try {
    const { task_id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('task_id', task_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const addComment = async (req, res, next) => {
  try {
    const { task_id, content, parent_id } = req.body;
    if (!task_id) return res.status(400).json({ error: 'task_id is required' });
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({ task_id, author_id: req.user.id, body: content, parent_id: parent_id || null })
      .select('*, author:profiles(id, full_name, avatar_url)')
      .single();
    if (error) throw error;

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      actor_id: req.user.id, action: 'comment_added', entity_type: 'task', entity_id: task_id, metadata: { comment_id: data.id },
    });

    res.status(201).json(data);
  } catch (err) { next(err); }
};

const deleteComment = async (req, res, next) => {
  try {
    const { comment_id } = req.params;
    const { data: comment } = await supabaseAdmin.from('comments').select('author_id').eq('id', comment_id).single();
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await supabaseAdmin.from('comments').update({ is_deleted: true }).eq('id', comment_id);
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
};

module.exports = { getComments, addComment, deleteComment };
