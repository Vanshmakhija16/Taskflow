const { supabaseAdmin } = require('../../config/supabase');

async function loadTaskWithAssignees(id) {
  const { data } = await supabaseAdmin
    .from('tasks')
    .select('id, created_by, assigned_by, status, task_assignees(user_id)')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();
  return data || null;
}

function isAdmin(user) {
  return user?.role === 'admin';
}

function isAssignee(task, userId) {
  return (task?.task_assignees || []).some(a => a.user_id === userId);
}

function canEdit(task, user) {
  if (!task || !user) return false;
  if (isAdmin(user)) return true;
  return task.created_by === user.id || task.assigned_by === user.id;
}

function canChangeStatus(task, user) {
  if (!task || !user) return false;
  return canEdit(task, user) || isAssignee(task, user.id);
}

function canDelete(task, user) {
  if (!task || !user) return false;
  return isAdmin(user) || task.created_by === user.id;
}

module.exports = {
  loadTaskWithAssignees,
  isAdmin,
  isAssignee,
  canEdit,
  canChangeStatus,
  canDelete,
};
