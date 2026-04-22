const { supabaseAdmin } = require('../../config/supabase');

const getProjects = async (req, res, next) => {
  try {
    let query = supabaseAdmin
      .from('projects')
      .select('*, owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url), project_members(user_id)', { count: 'exact' })
      .eq('is_archived', false);

    const { data, error, count } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const filtered = req.user.role === 'admin'
      ? data
      : data.filter(p =>
          p.owner_id === req.user.id ||
          (p.project_members || []).some(m => m.user_id === req.user.id)
        );

    res.json({ data: filtered, meta: { total: req.user.role === 'admin' ? count : filtered.length } });
  } catch (err) { next(err); }
};

const getProject = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*, owner:profiles!projects_owner_id_fkey(id, full_name, avatar_url), project_members(user_id, profile:profiles(id, full_name, avatar_url, role))')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Project not found' });
    res.json(data);
  } catch (err) { next(err); }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({ name, description, color: color || '#de6875', owner_id: req.user.id })
      .select().single();
    if (error) throw error;

    await supabaseAdmin.from('project_members').insert({ project_id: data.id, user_id: req.user.id });
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const updateProject = async (req, res, next) => {
  try {
    const { name, description, color, is_archived } = req.body;
    const updates = {};
    if (name        !== undefined) updates.name        = name;
    if (description !== undefined) updates.description = description;
    if (color       !== undefined) updates.color       = color;
    if (is_archived !== undefined) updates.is_archived = is_archived;

    const { data, error } = await supabaseAdmin.from('projects').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const deleteProject = async (req, res, next) => {
  try {
    await supabaseAdmin.from('projects').update({ is_archived: true }).eq('id', req.params.id);
    res.json({ message: 'Project archived' });
  } catch (err) { next(err); }
};

const addMember = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const { error } = await supabaseAdmin.from('project_members').insert({ project_id: req.params.id, user_id });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: 'Member added' });
  } catch (err) { next(err); }
};

const removeMember = async (req, res, next) => {
  try {
    await supabaseAdmin.from('project_members').delete().eq('project_id', req.params.id).eq('user_id', req.params.user_id);
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};

// ── Dashboard stats — scoped to tasks assigned to the current user ──────────
const getDashboardStats = async (req, res, next) => {
  try {
    const uid     = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let tasks = [];

    if (isAdmin) {
      // Admin sees all non-recurring tasks
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('id, status, priority, due_date')
        .eq('is_deleted',   false)
        .eq('is_archived',  false)
        .eq('is_recurring', false);
      if (error) throw error;
      tasks = data || [];
    } else {
      // Regular user — get task IDs via task_assignees join table
      const { data: assigneeRows, error: aErr } = await supabaseAdmin
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', uid);
      if (aErr) throw aErr;

      const taskIds = (assigneeRows || []).map(r => r.task_id).filter(Boolean);

      if (taskIds.length === 0) {
        return res.json({
          total_tasks: 0, done: 0, in_progress: 0,
          pending: 0, blocked: 0, overdue: 0,
          by_status:   { pending: 0, working: 0, completed: 0, blocked: 0 },
          by_priority: { low: 0, medium: 0, high: 0 },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('id, status, priority, due_date')
        .in('id', taskIds)
        .eq('is_deleted',   false)
        .eq('is_archived',  false)
        .eq('is_recurring', false);
      if (error) throw error;
      tasks = data || [];
    }

    const stats = {
      total: tasks.length,
      by_status:   { pending: 0, working: 0, completed: 0, blocked: 0 },
      by_priority: { low: 0, medium: 0, high: 0 },
      overdue: 0,
    };

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (const t of tasks) {
      if (stats.by_status[t.status] !== undefined)   stats.by_status[t.status]++;
      if (stats.by_priority[t.priority] !== undefined) stats.by_priority[t.priority]++;
      // Only overdue if due date has FULLY passed (not just today)
      if (t.due_date && new Date(t.due_date) < today && t.status !== 'completed') {
        stats.overdue++;
      }
    }

    res.json({
      total_tasks: stats.total,
      done:        stats.by_status.completed,
      in_progress: stats.by_status.working,
      pending:     stats.by_status.pending,
      blocked:     stats.by_status.blocked,
      overdue:     stats.overdue,
      by_status:   stats.by_status,
      by_priority: stats.by_priority,
    });
  } catch (err) { next(err); }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember, getDashboardStats };
