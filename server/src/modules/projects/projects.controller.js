const { supabaseAdmin } = require('../../config/supabase');

/* ── Period helper ────────────────────────────────────────────────────────────
   Returns an ISO string for the start of the given period.
   Used to filter completed tasks by when they were last updated.
───────────────────────────────────────────────────────────────────────────── */
function periodStart(period) {
  const now = new Date();
  switch (period) {
    case 'week':    { const d = new Date(now); d.setDate(d.getDate() - 7);   return d.toISOString(); }
    case 'month':   { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d.toISOString(); }
    case '3month':  { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d.toISOString(); }
    case '6month':  { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d.toISOString(); }
    case 'year':    { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString(); }
    default:        return null; // 'all' or unknown → no date filter
  }
}

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

/* ── Dashboard stats — scoped to tasks assigned to the current user ──────────
   Supports ?period=week|month|3month|6month|year|all
   - All counts (total, pending, working, blocked, overdue) are always ALL-TIME
   - 'done' and 'done_in_period' are the period-filtered completed count
───────────────────────────────────────────────────────────────────────────── */
const getDashboardStats = async (req, res, next) => {
  try {
    const uid     = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const period  = req.query.period || 'all'; // week|month|3month|6month|year|all

    // ── Fetch ALL assigned tasks (for totals, pending, working, blocked, overdue) ──
    let allTasks = [];

    if (isAdmin) {
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('id, status, priority, due_date, updated_at')
        .eq('is_deleted',   false)
        .eq('is_archived',  false)
        .eq('is_recurring', false);
      if (error) throw error;
      allTasks = data || [];
    } else {
      const { data: assigneeRows, error: aErr } = await supabaseAdmin
        .from('task_assignees').select('task_id').eq('user_id', uid);
      if (aErr) throw aErr;

      const taskIds = (assigneeRows || []).map(r => r.task_id).filter(Boolean);
      if (taskIds.length === 0) {
        return res.json(emptyStats(period));
      }

      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('id, status, priority, due_date, updated_at')
        .in('id', taskIds)
        .eq('is_deleted',   false)
        .eq('is_archived',  false)
        .eq('is_recurring', false);
      if (error) throw error;
      allTasks = data || [];
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // All-time counts
    let totalTasks = allTasks.length;
    let pending = 0, working = 0, blocked = 0, completedAllTime = 0, overdue = 0;

    for (const t of allTasks) {
      if (t.status === 'pending')   pending++;
      if (t.status === 'working')   working++;
      if (t.status === 'blocked')   blocked++;
      if (t.status === 'completed') completedAllTime++;
      if (t.due_date && new Date(t.due_date) < today && t.status !== 'completed') overdue++;
    }

    // Period-filtered: tasks completed within the selected period
    const since = periodStart(period);
    let doneInPeriod = completedAllTime; // default: 'all' = same as all-time

    if (since) {
      const sinceDate = new Date(since);
      doneInPeriod = allTasks.filter(t =>
        t.status === 'completed' &&
        t.updated_at &&
        new Date(t.updated_at) >= sinceDate
      ).length;
    }

    const completionRate = totalTasks > 0 ? Math.round((completedAllTime / totalTasks) * 100) : 0;
    const periodRate     = totalTasks > 0 ? Math.round((doneInPeriod    / totalTasks) * 100) : 0;

    res.json({
      period,
      total_tasks:       totalTasks,
      done:              completedAllTime,   // all-time completed
      done_in_period:    doneInPeriod,       // completed within selected period
      in_progress:       working,
      pending,
      blocked,
      overdue,
      completion_rate:   completionRate,     // all-time %
      period_rate:       periodRate,         // % completed in period
      by_status:   { pending, working, completed: completedAllTime, blocked },
      by_priority: countByPriority(allTasks),
    });
  } catch (err) { next(err); }
};

function emptyStats(period = 'all') {
  return {
    period, total_tasks: 0, done: 0, done_in_period: 0,
    in_progress: 0, pending: 0, blocked: 0, overdue: 0,
    completion_rate: 0, period_rate: 0,
    by_status:   { pending: 0, working: 0, completed: 0, blocked: 0 },
    by_priority: { low: 0, medium: 0, high: 0 },
  };
}

function countByPriority(tasks) {
  const counts = { low: 0, medium: 0, high: 0 };
  for (const t of tasks) {
    if (counts[t.priority] !== undefined) counts[t.priority]++;
  }
  return counts;
}

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember, getDashboardStats };
