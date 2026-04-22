const { supabaseAdmin } = require('../../config/supabase');
const logger = require('../../config/logger');

function fail(res, msg, status = 400) {
  return res.status(status).json({ error: msg });
}

const TASK_SELECT = `
  id, title, description, status, priority, category,
  due_date, start_date, created_at, updated_at,
  is_archived, is_deleted, is_recurring, recurrence_type,
  project_id, created_by, assigned_by, board_position
`.trim();

/* ─────────────────────────────────────────────────────────────────────────────
   enrichTasks — resolves assignees, project, trainer details
───────────────────────────────────────────────────────────────────────────── */
async function enrichTasks(tasks) {
  if (!tasks || tasks.length === 0) return [];

  const taskIds    = tasks.map(t => t.id).filter(Boolean);
  const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))];

  // Assignees via task_assignees
  const assigneeMap = {};
  if (taskIds.length > 0) {
    const { data: assigneeRows } = await supabaseAdmin
      .from('task_assignees').select('task_id, user_id').in('task_id', taskIds);

    const assigneeUserIds = [...new Set((assigneeRows || []).map(r => r.user_id).filter(Boolean))];
    const profileMap = {};
    if (assigneeUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles').select('id, full_name, email, avatar_url').in('id', assigneeUserIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    for (const row of (assigneeRows || [])) {
      if (!assigneeMap[row.task_id]) assigneeMap[row.task_id] = [];
      if (profileMap[row.user_id]) assigneeMap[row.task_id].push(profileMap[row.user_id]);
    }
  }

  // Creators
  const creatorIds = [...new Set(tasks.map(t => t.created_by).filter(Boolean))];
  const creatorMap = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabaseAdmin
      .from('profiles').select('id, full_name, email, avatar_url').in('id', creatorIds);
    (creators || []).forEach(p => { creatorMap[p.id] = p; });
  }

  // Projects
  const projectMap = {};
  if (projectIds.length > 0) {
    const { data: projects } = await supabaseAdmin
      .from('projects').select('id, name, color').in('id', projectIds);
    (projects || []).forEach(p => { projectMap[p.id] = p; });
  }

  // Trainer details & locations
  const trainerTaskIds = tasks.filter(t => t.category === 'trainer').map(t => t.id);
  const trainerDetailsMap = {};
  const locationsMap = {};
  if (trainerTaskIds.length > 0) {
    const { data: trainerDetails } = await supabaseAdmin
      .from('task_trainer_details').select('*').in('task_id', trainerTaskIds);
    (trainerDetails || []).forEach(td => { trainerDetailsMap[td.task_id] = td; });

    const { data: locations } = await supabaseAdmin
      .from('task_locations').select('*').in('task_id', trainerTaskIds)
      .order('position', { ascending: true });
    (locations || []).forEach(loc => {
      if (!locationsMap[loc.task_id]) locationsMap[loc.task_id] = [];
      locationsMap[loc.task_id].push(loc);
    });
  }

  return tasks.map(t => {
    const assignees       = assigneeMap[t.id] || [];
    const primaryAssignee = assignees[0] || null;
    return {
      ...t,
      assignees,
      assignee:     primaryAssignee,
      reporter:     t.created_by ? creatorMap[t.created_by] || null : null,
      project:      t.project_id ? projectMap[t.project_id] || null : null,
      assignee_id:  primaryAssignee?.id ?? null,
      assignee_ids: assignees.map(a => a.id),
      reporter_id:  t.created_by ?? null,
      archived:     t.is_archived ?? false,
      task_assignees:       assignees.map(a => ({ user_id: a.id, user: a })),
      task_trainer_details: trainerDetailsMap[t.id] ? [trainerDetailsMap[t.id]] : [],
      task_locations:       locationsMap[t.id] || [],
    };
  });
}

async function syncAssignees(taskId, assigneeIds, assignedBy) {
  const validIds = (assigneeIds || []).filter(Boolean);
  await supabaseAdmin.from('task_assignees').delete().eq('task_id', taskId);
  if (validIds.length === 0) return;
  await supabaseAdmin.from('task_assignees').insert(
    validIds.map(userId => ({ task_id: taskId, user_id: userId, assigned_by: assignedBy || null }))
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   getTaskIdsForUser — returns task IDs where user is assigned
───────────────────────────────────────────────────────────────────────────── */
async function getTaskIdsForUser(userId) {
  const { data: assigneeRows } = await supabaseAdmin
    .from('task_assignees').select('task_id').eq('user_id', userId);
  const ids = (assigneeRows || []).map(r => r.task_id).filter(Boolean);
  return [...new Set(ids)];
}

async function syncTrainerData(taskId, trainerDetails, locations) {
  if (trainerDetails) {
    const { company_name, domain, notes } = trainerDetails;
    const { data: existing } = await supabaseAdmin
      .from('task_trainer_details').select('id').eq('task_id', taskId).single();
    if (existing) {
      await supabaseAdmin.from('task_trainer_details')
        .update({ company_name, domain: domain || null, notes: notes || null }).eq('task_id', taskId);
    } else {
      await supabaseAdmin.from('task_trainer_details')
        .insert({ task_id: taskId, company_name, domain: domain || null, notes: notes || null });
    }
  }
  if (Array.isArray(locations)) {
    await supabaseAdmin.from('task_locations').delete().eq('task_id', taskId);
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      await supabaseAdmin.from('task_locations').insert({
        task_id: taskId, location_name: loc.location_name,
        trainers_required: Number(loc.trainers_required) || 1,
        trainers_sent:     Number(loc.trainers_sent)     || 0,
        trainers_approved: Number(loc.trainers_approved) || 0,
        position: i,
      });
    }
  }
}

/* ── GET /tasks ── */
async function getTasks(req, res) {
  try {
    const {
      search, status, priority, project_id, assignee_id,
      sort_by = 'created_at', sort_dir = 'desc',
      limit = 200, offset = 0,
    } = req.query;

    let allowedTaskIds = null;
    if (assignee_id) {
      const ids = await getTaskIdsForUser(assignee_id);
      if (ids.length === 0) return res.json([]);
      allowedTaskIds = ids;
    }

    let query = supabaseAdmin
      .from('tasks').select(TASK_SELECT)
      .eq('is_deleted',  false)
      .eq('is_archived', false)
      .eq('is_recurring', false)
      .order(sort_by, { ascending: sort_dir === 'asc' })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (allowedTaskIds) query = query.in('id', allowedTaskIds);
    if (search)         query = query.ilike('title', `%${search}%`);
    if (status)         query = query.eq('status', status);
    if (priority)       query = query.eq('priority', priority);
    if (project_id)     query = query.eq('project_id', project_id);

    const { data, error } = await query;
    if (error) return fail(res, error.message);
    return res.json(await enrichTasks(data || []));
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── GET /tasks/my ── */
async function getMyTasks(req, res) {
  try {
    const taskIds = await getTaskIdsForUser(req.user.id);
    if (taskIds.length === 0) return res.json([]);

    const { data, error } = await supabaseAdmin
      .from('tasks').select(TASK_SELECT)
      .in('id', taskIds)
      .eq('is_deleted',  false)
      .eq('is_archived', false)
      .eq('is_recurring', false)
      .order('created_at', { ascending: false });

    if (error) return fail(res, error.message);
    return res.json(await enrichTasks(data || []));
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── GET /tasks/assigned-by-me ── */
async function getAssignedByMe(req, res) {
  try {
    const uid = req.user.id;

    // Tasks this user assigned to others (they appear in task_assignees with assigned_by = uid)
    const { data: taRows } = await supabaseAdmin
      .from('task_assignees').select('task_id, user_id')
      .eq('assigned_by', uid)
      .neq('user_id', uid);

    if (!taRows || taRows.length === 0) return res.json({ data: [], by_user: {}, meta: { total: 0 } });

    const taskIds = [...new Set(taRows.map(r => r.task_id))];
    const { data, error } = await supabaseAdmin
      .from('tasks').select(TASK_SELECT)
      .in('id', taskIds)
      .eq('is_deleted', false)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) return fail(res, error.message);
    const enriched = await enrichTasks(data || []);

    // Build by_user map
    const byUser = {};
    for (const row of taRows) {
      const task = enriched.find(t => t.id === row.task_id);
      if (!task) continue;
      const assignee = task.assignees?.find(a => a.id === row.user_id);
      if (!assignee) continue;
      if (!byUser[row.user_id]) byUser[row.user_id] = { user: assignee, tasks: [] };
      if (!byUser[row.user_id].tasks.find(t => t.id === task.id)) {
        byUser[row.user_id].tasks.push(task);
      }
    }

    return res.json({ data: enriched, by_user: byUser, meta: { total: enriched.length } });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── GET /tasks/user/:userId ── */
async function getUserTasks(req, res) {
  try {
    const { userId } = req.params;
    const taskIds = await getTaskIdsForUser(userId);
    if (taskIds.length === 0) return res.json({ data: [], meta: { total: 0 } });

    const { data, error } = await supabaseAdmin
      .from('tasks').select(TASK_SELECT)
      .in('id', taskIds)
      .eq('is_deleted',  false)
      .eq('is_archived', false)
      .eq('is_recurring', false)
      .order('created_at', { ascending: false });

    if (error) return fail(res, error.message);
    const enriched = await enrichTasks(data || []);
    return res.json({ data: enriched, meta: { total: enriched.length } });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── GET /tasks/calendar — supports optional user_id param ── */
async function getCalendar(req, res) {
  try {
    const { date_from, date_to, user_id } = req.query;

    // Determine whose tasks to show: requested user_id or current user
    const uid = user_id || req.user.id;
    const taskIds = await getTaskIdsForUser(uid);
    if (taskIds.length === 0) return res.json([]);

    let query = supabaseAdmin
      .from('tasks').select(TASK_SELECT)
      .in('id', taskIds)
      .eq('is_deleted',  false)
      .eq('is_archived', false)
      .eq('is_recurring', false)
      .order('due_date', { ascending: true });

    if (date_from && date_to) {
      // Tasks that overlap the date range
      query = query
        .lte('start_date', date_to)
        .or(`due_date.gte.${date_from},due_date.is.null`);
    }

    const { data, error } = await query;
    if (error) return fail(res, error.message);
    return res.json(await enrichTasks(data || []));
  } catch (err) {
    logger.error('getCalendar exception: ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ── GET /tasks/:id ── */
async function getTask(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 400);
    const { data, error } = await supabaseAdmin
      .from('tasks').select(TASK_SELECT)
      .eq('id', id).eq('is_deleted', false).single();
    if (error || !data) return fail(res, 'Task not found', 404);
    const [enriched] = await enrichTasks([data]);
    return res.json(enriched);
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

async function getTaskActivity(req, res) { return res.json([]); }

/* ── POST /tasks ── */
async function createTask(req, res) {
  try {
    const {
      title, description, status = 'pending', priority = 'medium', category = 'general',
      project_id, assignee_id, assignee_ids, due_date, start_date,
      is_recurring = false, recurrence_type,
      trainer_details, locations,
    } = req.body;

    if (!title?.trim()) return fail(res, 'Title is required');

    let resolvedAssigneeIds = [];
    if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
      resolvedAssigneeIds = assignee_ids.filter(Boolean);
    } else if (assignee_id) {
      resolvedAssigneeIds = [assignee_id];
    }

    const payload = {
      title:           title.trim(),
      description:     description || null,
      status, priority, category,
      created_by:      req.user.id,
      assigned_by:     resolvedAssigneeIds.length > 0 ? req.user.id : null,
      project_id:      project_id  || null,
      due_date:        due_date    || null,
      start_date:      start_date  || null,
      is_recurring,
      recurrence_type: is_recurring ? (recurrence_type || 'daily') : null,
      is_archived:     false,
      is_deleted:      false,
    };

    const { data, error } = await supabaseAdmin
      .from('tasks').insert(payload).select(TASK_SELECT).single();
    if (error) return fail(res, error.message);

    // Always add the creator as an assignee so the task appears on their board/calendar
    const finalAssignees = [...new Set([req.user.id, ...resolvedAssigneeIds])];
    await syncAssignees(data.id, finalAssignees, req.user.id);

    if (category === 'trainer') {
      await syncTrainerData(data.id, trainer_details, locations);
    }

    const [enriched] = await enrichTasks([data]);
    return res.status(201).json(enriched);
  } catch (err) {
    logger.error('createTask exception: ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ── PATCH /tasks/:id ── */
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 422);

    const updates = {};
    const scalars = ['title','description','status','priority','category',
                     'project_id','due_date','start_date','is_recurring',
                     'recurrence_type','board_position'];
    for (const key of scalars) {
      if (key in req.body) updates[key] = req.body[key] ?? null;
    }

    let newAssigneeIds = null;
    if (Array.isArray(req.body.assignee_ids)) {
      newAssigneeIds      = req.body.assignee_ids.filter(Boolean);
      updates.assigned_by = req.user.id;
    } else if ('assignee_id' in req.body) {
      newAssigneeIds      = req.body.assignee_id ? [req.body.assignee_id] : [];
      updates.assigned_by = req.user.id;
    }

    if ('title' in updates) {
      updates.title = updates.title?.trim() || null;
      if (!updates.title) return fail(res, 'Title cannot be empty');
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('tasks').update(updates).eq('id', id).select(TASK_SELECT).single();
    if (error) return fail(res, error.message);

    if (newAssigneeIds !== null) await syncAssignees(id, newAssigneeIds, req.user.id);

    const category = updates.category || data.category;
    if (category === 'trainer' && (req.body.trainer_details || req.body.locations)) {
      await syncTrainerData(id, req.body.trainer_details, req.body.locations);
    }

    const [enriched] = await enrichTasks([data]);
    return res.json(enriched);
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── PATCH /tasks/:id/status ── */
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 422);
    const { status, board_position } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (status         != null) updates.status         = status;
    if (board_position != null) updates.board_position = board_position;
    const { data, error } = await supabaseAdmin
      .from('tasks').update(updates).eq('id', id).select(TASK_SELECT).single();
    if (error) return fail(res, error.message);
    const [enriched] = await enrichTasks([data]);
    return res.json(enriched);
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── DELETE /tasks/:id ── */
async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 422);
    await supabaseAdmin.from('tasks')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: req.user.id })
      .eq('id', id);
    return res.json({ message: 'Task deleted' });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── PATCH /tasks/:id/archive ── */
async function archiveTask(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 422);
    const { data, error } = await supabaseAdmin.from('tasks')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id).select(TASK_SELECT).single();
    if (error) return fail(res, error.message);
    const [enriched] = await enrichTasks([data]);
    return res.json(enriched);
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── PATCH /tasks/:id/reopen ── */
async function reopenTask(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 422);
    const { data, error } = await supabaseAdmin.from('tasks')
      .update({ status: 'pending', is_archived: false, updated_at: new Date().toISOString() })
      .eq('id', id).select(TASK_SELECT).single();
    if (error) return fail(res, error.message);
    const [enriched] = await enrichTasks([data]);
    return res.json(enriched);
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

/* ── POST /tasks/bulk ── */
async function bulkUpdate(req, res) {
  try {
    const { task_ids, action, payload = {} } = req.body;
    if (!Array.isArray(task_ids) || task_ids.length === 0) return fail(res, 'task_ids required');
    if (action === 'delete') {
      await supabaseAdmin.from('tasks')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: req.user.id })
        .in('id', task_ids);
      return res.json({ message: 'Tasks deleted', count: task_ids.length });
    }
    if (action === 'update_status' && payload.status) {
      const { data, error } = await supabaseAdmin.from('tasks')
        .update({ status: payload.status, updated_at: new Date().toISOString() })
        .in('id', task_ids).select(TASK_SELECT);
      if (error) return fail(res, error.message);
      return res.json(await enrichTasks(data || []));
    }
    return fail(res, 'Unknown action');
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

async function assignToLocation(req, res) {
  try { return res.json({ message: 'Assigned' }); }
  catch (err) { return res.status(500).json({ error: err.message }); }
}

async function updateLocationCounts(req, res) {
  try {
    const { locationId } = req.params;
    const { trainers_sent, trainers_approved } = req.body;
    const updates = {};
    if (trainers_sent     != null) updates.trainers_sent     = Number(trainers_sent);
    if (trainers_approved != null) updates.trainers_approved = Number(trainers_approved);
    const { error } = await supabaseAdmin.from('task_locations').update(updates).eq('id', locationId);
    if (error) return fail(res, error.message);
    return res.json({ message: 'Updated', ...updates });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}

module.exports = {
  getTasks, getMyTasks, getAssignedByMe, getUserTasks,
  getCalendar, getTask, getTaskActivity,
  createTask, updateTask, updateStatus,
  deleteTask, archiveTask, reopenTask,
  bulkUpdate, assignToLocation, updateLocationCounts,
};
