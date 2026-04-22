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

async function enrichTasks(tasks) {
  if (!tasks || tasks.length === 0) return [];

  const taskIds    = tasks.map(t => t.id).filter(Boolean);
  const projectIds = [...new Set(tasks.map(t => t.project_id).filter(Boolean))];

  const assigneeMap = {};
  if (taskIds.length > 0) {
    const { data: assigneeRows, error: aErr } = await supabaseAdmin
      .from('task_assignees')
      .select('task_id, user_id')
      .in('task_id', taskIds);

    if (aErr) logger.warn('enrichTasks assignees: ' + aErr.message);

    const assigneeUserIds = [...new Set((assigneeRows || []).map(r => r.user_id).filter(Boolean))];
    const profileMap = {};
    if (assigneeUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', assigneeUserIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }
    for (const row of (assigneeRows || [])) {
      if (!assigneeMap[row.task_id]) assigneeMap[row.task_id] = [];
      if (profileMap[row.user_id]) assigneeMap[row.task_id].push(profileMap[row.user_id]);
    }
  }

  const creatorIds = [...new Set(tasks.map(t => t.created_by).filter(Boolean))];
  const creatorMap = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabaseAdmin
      .from('profiles').select('id, full_name, email, avatar_url').in('id', creatorIds);
    (creators || []).forEach(p => { creatorMap[p.id] = p; });
  }

  const projectMap = {};
  if (projectIds.length > 0) {
    const { data: projects } = await supabaseAdmin
      .from('projects').select('id, name, color').in('id', projectIds);
    (projects || []).forEach(p => { projectMap[p.id] = p; });
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
      task_trainer_details: [],
      task_locations: [],
    };
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /tasks/recurring
   Shows ONLY tasks assigned to the target user (via task_assignees).
   Creator-only tasks are NOT shown — recurring tasks should be assigned
   to the people who need to complete them daily.
───────────────────────────────────────────────────────────────────────────── */
async function getRecurring(req, res) {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) return fail(res, 'Unauthorized', 401);

    const targetUserId = req.query.user_id || currentUserId;
    const today        = todayStr();

    logger.info(`getRecurring: target=${targetUserId}, date=${today}`);

    // 1. Get task IDs where targetUser is an assignee in task_assignees
    const { data: assigneeRows, error: assigneeErr } = await supabaseAdmin
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', targetUserId);

    if (assigneeErr) {
      logger.error('getRecurring task_assignees: ' + assigneeErr.message);
      return fail(res, assigneeErr.message);
    }

    const assignedTaskIds = (assigneeRows || []).map(r => r.task_id).filter(Boolean);

    // 2. Also get tasks the user CREATED AND has no assignee 
    //    (self-assigned recurring tasks where creator = worker)
    const { data: createdTasks, error: createdErr } = await supabaseAdmin
      .from('tasks')
      .select(TASK_SELECT)
      .eq('is_recurring', true)
      .eq('is_deleted',   false)
      .eq('is_archived',  false)
      .eq('created_by',   targetUserId);

    if (createdErr) {
      logger.error('getRecurring createdTasks: ' + createdErr.message);
      return fail(res, createdErr.message);
    }

    // Self-created tasks with no assignees assigned = show them
    // (task where creator created it but didn't assign it to anyone)
    const createdTaskIds = (createdTasks || []).map(t => t.id);

    // Find which created tasks have NO entries in task_assignees at all
    let unassignedCreatedIds = [];
    if (createdTaskIds.length > 0) {
      const { data: existingAssignees } = await supabaseAdmin
        .from('task_assignees')
        .select('task_id')
        .in('task_id', createdTaskIds);

      const idsWithAssignees = new Set((existingAssignees || []).map(r => r.task_id));
      // Include created task if: it has NO assignees, OR current user is in its assignees
      unassignedCreatedIds = createdTaskIds.filter(id =>
        !idsWithAssignees.has(id)  // no assignees at all → creator does it themselves
      );
    }

    // 3. Union: assignedTaskIds + unassignedCreatedIds (deduped)
    const allTaskIds = [...new Set([...assignedTaskIds, ...unassignedCreatedIds])];

    if (allTaskIds.length === 0) {
      logger.info(`getRecurring: no tasks for user ${targetUserId}`);
      return res.json([]);
    }

    // 4. Fetch the actual task rows
    const { data: tasks, error: tasksErr } = await supabaseAdmin
      .from('tasks')
      .select(TASK_SELECT)
      .eq('is_recurring', true)
      .eq('is_deleted',   false)
      .eq('is_archived',  false)
      .in('id', allTaskIds)
      .order('created_at', { ascending: false });

    if (tasksErr) {
      logger.error('getRecurring tasks fetch: ' + tasksErr.message);
      return fail(res, tasksErr.message);
    }

    logger.info(`getRecurring: ${(tasks || []).length} tasks for user ${targetUserId}`);

    if (!tasks || tasks.length === 0) return res.json([]);

    // 5. Fetch today's completions scoped to this user
    const taskIds = tasks.map(t => t.id);
    const completionsMap = {};

    const { data: completions, error: cErr } = await supabaseAdmin
      .from('recurring_task_completions')
      .select('task_id, completed_by, completed_at')
      .in('task_id', taskIds)
      .eq('completion_date', today)
      .eq('completed_by',    targetUserId);

    if (cErr) logger.warn('getRecurring completions fetch: ' + cErr.message);

    (completions || []).forEach(c => {
      completionsMap[c.task_id] = c;
    });

    // 6. Enrich + attach completion state
    const enriched = await enrichTasks(tasks);
    const result = enriched.map(t => ({
      ...t,
      completed_today:    !!completionsMap[t.id],
      completed_by_today: completionsMap[t.id]?.completed_by || null,
      completed_at_today: completionsMap[t.id]?.completed_at || null,
    }));

    return res.json(result);
  } catch (err) {
    logger.error('getRecurring exception: ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   POST /tasks/:id/complete-today
   Inserts a completion record for today. Uses INSERT with ignoreDuplicates
   instead of upsert to avoid the 3-column unique constraint dependency
   (handles both old and new DB schemas gracefully).
───────────────────────────────────────────────────────────────────────────── */
async function completeTodayRecurring(req, res) {
  try {
    const { id }  = req.params;
    const userId  = req.user?.id;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 400);
    if (!userId)                   return fail(res, 'Unauthorized', 401);

    const today = todayStr();

    // Verify task exists and is recurring
    const { data: task, error: taskErr } = await supabaseAdmin
      .from('tasks')
      .select('id, is_recurring, is_deleted')
      .eq('id', id)
      .single();

    if (taskErr || !task)   return fail(res, 'Task not found', 404);
    if (task.is_deleted)    return fail(res, 'Task has been deleted', 410);
    if (!task.is_recurring) return fail(res, 'Task is not recurring', 400);

    // Check if already completed today by this user
    const { data: existing } = await supabaseAdmin
      .from('recurring_task_completions')
      .select('id')
      .eq('task_id',         id)
      .eq('completion_date', today)
      .eq('completed_by',    userId)
      .maybeSingle();

    if (existing) {
      // Already done — idempotent success
      return res.json({ success: true, message: 'Already marked complete for today', date: today });
    }

    // Insert new completion record
    const { error } = await supabaseAdmin
      .from('recurring_task_completions')
      .insert({
        task_id:         id,
        completion_date: today,
        completed_by:    userId,
        completed_at:    new Date().toISOString(),
      });

    if (error) {
      // Handle unique constraint violation gracefully (race condition)
      if (error.code === '23505') {
        return res.json({ success: true, message: 'Already marked complete for today', date: today });
      }
      logger.error('completeTodayRecurring insert: ' + error.message);
      return fail(res, error.message);
    }

    return res.json({ success: true, message: 'Marked complete for today', date: today });
  } catch (err) {
    logger.error('completeTodayRecurring exception: ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /tasks/:id/complete-today
   Removes today's completion record for the current user.
───────────────────────────────────────────────────────────────────────────── */
async function uncompleteTodayRecurring(req, res) {
  try {
    const { id }  = req.params;
    const userId  = req.user?.id;
    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 400);
    if (!userId)                   return fail(res, 'Unauthorized', 401);

    const today = todayStr();

    const { error } = await supabaseAdmin
      .from('recurring_task_completions')
      .delete()
      .eq('task_id',         id)
      .eq('completion_date', today)
      .eq('completed_by',    userId);

    if (error) {
      logger.error('uncompleteTodayRecurring: ' + error.message);
      return fail(res, error.message);
    }

    return res.json({ success: true, message: 'Unmarked for today', date: today });
  } catch (err) {
    logger.error('uncompleteTodayRecurring exception: ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /tasks/:id/recurring-history
───────────────────────────────────────────────────────────────────────────── */
async function getRecurringHistory(req, res) {
  try {
    const { id }  = req.params;
    const userId  = req.user?.id;
    const limit   = Math.min(parseInt(req.query.limit) || 30, 90);

    if (!id || id === 'undefined') return fail(res, 'Invalid task id', 400);
    if (!userId)                   return fail(res, 'Unauthorized', 401);

    const { data, error } = await supabaseAdmin
      .from('recurring_task_completions')
      .select('completion_date, completed_at')
      .eq('task_id',      id)
      .eq('completed_by', userId)
      .order('completion_date', { ascending: false })
      .limit(limit);

    if (error) return fail(res, error.message);
    return res.json(data || []);
  } catch (err) {
    logger.error('getRecurringHistory exception: ' + err.message);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getRecurring,
  completeTodayRecurring,
  uncompleteTodayRecurring,
  getRecurringHistory,
};
