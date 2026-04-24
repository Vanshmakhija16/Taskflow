const { supabaseAdmin } = require('../../config/supabase');
const logger = require('../../config/logger');

function fail(res, msg, status = 400) {
  return res.status(status).json({ error: msg });
}

/* ── Period helper — same as in projects.controller ── */
function periodStart(period) {
  const now = new Date();
  switch (period) {
    case 'week':   { const d = new Date(now); d.setDate(d.getDate() - 7);        return d.toISOString(); }
    case 'month':  { const d = new Date(now); d.setMonth(d.getMonth() - 1);      return d.toISOString(); }
    case '3month': { const d = new Date(now); d.setMonth(d.getMonth() - 3);      return d.toISOString(); }
    case '6month': { const d = new Date(now); d.setMonth(d.getMonth() - 6);      return d.toISOString(); }
    case 'year':   { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d.toISOString(); }
    default:       return null; // 'all' → no date filter
  }
}

/* ── GET /admin/stats?period=week|month|3month|6month|year|all ── */
async function getAdminStats(req, res) {
  try {
    const period = req.query.period || 'all';
    const since  = periodStart(period);

    // Fetch all non-deleted, non-recurring tasks with updated_at for period filtering
    const { data: allTasks, error: taskErr } = await supabaseAdmin
      .from('tasks')
      .select('id, status, due_date, updated_at')
      .eq('is_deleted',   false)
      .eq('is_archived',  false)
      .eq('is_recurring', false);
    if (taskErr) throw taskErr;

    const tasks = allTasks || [];
    const today = new Date().toISOString().split('T')[0];

    // All-time counts
    let total = tasks.length, completed = 0, pending = 0, working = 0, blocked = 0, overdue = 0;
    for (const t of tasks) {
      if (t.status === 'completed') completed++;
      if (t.status === 'pending')   pending++;
      if (t.status === 'working')   working++;
      if (t.status === 'blocked')   blocked++;
      if (t.due_date && t.due_date < today && t.status !== 'completed') overdue++;
    }

    // Period-filtered completed count
    let doneInPeriod = completed; // default 'all' = all-time
    if (since) {
      const sinceDate = new Date(since);
      doneInPeriod = tasks.filter(t =>
        t.status === 'completed' &&
        t.updated_at &&
        new Date(t.updated_at) >= sinceDate
      ).length;
    }

    const completionRate = total > 0 ? Math.round((completed      / total) * 100) : 0;
    const periodRate     = total > 0 ? Math.round((doneInPeriod   / total) * 100) : 0;

    // Users
    const [{ count: totalUsers }, { count: activeUsers }, { count: totalProjects }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    ]);

    res.json({
      period,
      users:    { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
      tasks: {
        total,
        completed,
        done_in_period:  doneInPeriod,
        pending,
        working,
        blocked,
        overdue,
        completion_rate: completionRate,
        period_rate:     periodRate,
      },
      projects: { total: totalProjects },
    });
  } catch (err) {
    logger.error('getAdminStats: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

/* ── GET /admin/users ── */
async function getAdminUsers(req, res) {
  try {
    const { search, role, is_active, page = 1, limit = 50 } = req.query;
    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, is_active, created_at, preferences', { count: 'exact' });

    if (role)      query = query.eq('role', role);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (search)    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const from = (page - 1) * limit;
    query = query.order('created_at', { ascending: false }).range(from, from + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const userIds = (data || []).map(u => u.id);
    let taskCounts = {};
    if (userIds.length > 0) {
      const { data: assigneeRows } = await supabaseAdmin
        .from('task_assignees').select('user_id, task_id').in('user_id', userIds);

      const taskIds = [...new Set((assigneeRows || []).map(r => r.task_id))];
      let taskStatusMap = {};
      if (taskIds.length > 0) {
        const { data: tasks } = await supabaseAdmin
          .from('tasks').select('id, status')
          .in('id', taskIds).eq('is_deleted', false).eq('is_archived', false);
        (tasks || []).forEach(t => { taskStatusMap[t.id] = t.status; });
      }

      for (const uid of userIds) {
        const userTaskIds = (assigneeRows || [])
          .filter(r => r.user_id === uid)
          .map(r => r.task_id)
          .filter(tid => taskStatusMap[tid] !== undefined);
        taskCounts[uid] = {
          total:     userTaskIds.length,
          completed: userTaskIds.filter(tid => taskStatusMap[tid] === 'completed').length,
          pending:   userTaskIds.filter(tid => taskStatusMap[tid] === 'pending').length,
          working:   userTaskIds.filter(tid => taskStatusMap[tid] === 'working').length,
        };
      }
    }

    const enriched = (data || []).map(u => ({
      ...u,
      task_stats: taskCounts[u.id] || { total: 0, completed: 0, pending: 0, working: 0 },
    }));

    res.json({ data: enriched, meta: { total: count, page: +page, limit: +limit } });
  } catch (err) {
    logger.error('getAdminUsers: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

/* ── POST /admin/users ── */
async function createAdminUser(req, res) {
  try {
    const { email, full_name, role = 'employee', password } = req.body;
    if (!email || !full_name) return fail(res, 'Email and full name are required');
    if (!password || password.length < 8) return fail(res, 'Password must be at least 8 characters');

    const { data: existing } = await supabaseAdmin
      .from('profiles').select('id').eq('email', email).maybeSingle();
    if (existing) return fail(res, 'A user with this email already exists', 409);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (authErr) return fail(res, authErr.message);

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: authData.user.id, email, full_name, role }, { onConflict: 'id' })
      .select().single();
    if (profileErr) throw profileErr;

    res.status(201).json({ user: profile, message: 'User created successfully' });
  } catch (err) {
    logger.error('createAdminUser: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

/* ── PATCH /admin/users/:id ── */
async function updateAdminUser(req, res) {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, password } = req.body;
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (role      !== undefined) updates.role      = role;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
    }
    if (password && password.length >= 8) {
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
      if (pwErr) logger.warn('Password update failed: ' + pwErr.message);
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
    res.json({ user: profile, message: 'User updated' });
  } catch (err) {
    logger.error('updateAdminUser: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

/* ── DELETE /admin/users/:id ── */
async function deleteAdminUser(req, res) {
  try {
    const { id } = req.params;
    if (id === req.user.id) return fail(res, 'Cannot delete your own account');
    await supabaseAdmin.from('profiles').update({ is_active: false }).eq('id', id);
    await supabaseAdmin.auth.admin.deleteUser(id);
    res.json({ message: 'User removed' });
  } catch (err) {
    logger.error('deleteAdminUser: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

/* ── GET /admin/tasks ── */
async function getAllTasks(req, res) {
  try {
    const { search, status, priority, project_id, assignee_id, page = 1, limit = 50 } = req.query;

    let taskIds = null;
    if (assignee_id) {
      const { data: rows } = await supabaseAdmin
        .from('task_assignees').select('task_id').eq('user_id', assignee_id);
      taskIds = (rows || []).map(r => r.task_id);
      if (taskIds.length === 0) return res.json({ data: [], meta: { total: 0 } });
    }

    let query = supabaseAdmin
      .from('tasks')
      .select('id, title, description, status, priority, category, due_date, start_date, created_at, updated_at, is_archived, is_deleted, project_id, created_by, assigned_by, board_position', { count: 'exact' })
      .eq('is_deleted', false).eq('is_recurring', false).eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (taskIds)    query = query.in('id', taskIds);
    if (search)     query = query.ilike('title', `%${search}%`);
    if (status)     query = query.eq('status', status);
    if (priority)   query = query.eq('priority', priority);
    if (project_id) query = query.eq('project_id', project_id);

    const from = (page - 1) * limit;
    query = query.range(from, from + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const tIds = (data || []).map(t => t.id);
    const pIds = [...new Set((data || []).map(t => t.project_id).filter(Boolean))];
    const cIds = [...new Set((data || []).map(t => t.created_by).filter(Boolean))];

    const [assigneeRows, projects, creators] = await Promise.all([
      tIds.length > 0 ? supabaseAdmin.from('task_assignees').select('task_id, user_id').in('task_id', tIds).then(r => r.data || []) : [],
      pIds.length > 0 ? supabaseAdmin.from('projects').select('id, name, color').in('id', pIds).then(r => r.data || []) : [],
      cIds.length > 0 ? supabaseAdmin.from('profiles').select('id, full_name, email, avatar_url').in('id', cIds).then(r => r.data || []) : [],
    ]);

    const allUserIds = [...new Set(assigneeRows.map(r => r.user_id))];
    let profileMap = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, email, avatar_url').in('id', allUserIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }

    const assigneeMap = {};
    assigneeRows.forEach(r => {
      if (!assigneeMap[r.task_id]) assigneeMap[r.task_id] = [];
      if (profileMap[r.user_id]) assigneeMap[r.task_id].push(profileMap[r.user_id]);
    });
    const projectMap = {};
    projects.forEach(p => { projectMap[p.id] = p; });
    const creatorMap = {};
    creators.forEach(c => { creatorMap[c.id] = c; });

    const enriched = (data || []).map(t => ({
      ...t,
      assignees: assigneeMap[t.id] || [],
      project:   projectMap[t.project_id] || null,
      creator:   creatorMap[t.created_by] || null,
    }));

    res.json({ data: enriched, meta: { total: count, page: +page, limit: +limit } });
  } catch (err) {
    logger.error('getAllTasks: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

/* ── GET /admin/activity ── */
async function getActivityLog(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const from = (page - 1) * limit;

    const { data: logs, error, count } = await supabaseAdmin
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + Number(limit) - 1);

    if (error) throw error;

    const actorIds = [...new Set((logs || []).map(l => l.actor_id).filter(Boolean))];
    let actorMap = {};
    if (actorIds.length > 0) {
      const { data: actors } = await supabaseAdmin.from('profiles').select('id, full_name, avatar_url, email').in('id', actorIds);
      (actors || []).forEach(a => { actorMap[a.id] = a; });
    }

    res.json({
      data: (logs || []).map(l => ({ ...l, actor: actorMap[l.actor_id] || null })),
      meta: { total: count, page: +page, limit: +limit },
    });
  } catch (err) {
    logger.error('getActivityLog: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAdminStats, getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, getAllTasks, getActivityLog };
