const { supabaseAdmin } = require('../../config/supabase');

// ─── List all users (admin only) ──────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { role, is_active, search, page = 1, limit = 20 } = req.query;
    let query = supabaseAdmin.from('profiles').select('id, full_name, avatar_url, role, is_active, created_at', { count: 'exact' });

    if (role)      query = query.eq('role', role);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (search)    query = query.ilike('full_name', `%${search}%`);

    const from = (page - 1) * limit;
    query = query.order('created_at', { ascending: false }).range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, meta: { total: count, page: +page, limit: +limit } });
  } catch (err) { next(err); }
};

// ─── Get single user ──────────────────────────────────────────────────────────
const getUser = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) { next(err); }
};

// ─── Update user (admin) ──────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active, avatar_url } = req.body;
    const updates = {};
    if (full_name  !== undefined) updates.full_name  = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (role       !== undefined) {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can change roles' });
      updates.role = role;
    }
    if (is_active !== undefined) {
      if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can deactivate users' });
      updates.is_active = is_active;
    }

    const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

// ─── Update own profile ───────────────────────────────────────────────────────
const updateMe = async (req, res, next) => {
  try {
    const { full_name, avatar_url, preferences } = req.body;
    const updates = {};
    if (full_name   !== undefined) updates.full_name   = full_name;
    if (avatar_url  !== undefined) updates.avatar_url  = avatar_url;
    if (preferences !== undefined) updates.preferences = preferences;

    const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

// ─── Delete user (admin, soft delete via deactivate) ─────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

    // Soft delete: deactivate profile
    await supabaseAdmin.from('profiles').update({ is_active: false }).eq('id', id);
    // Revoke Supabase auth
    await supabaseAdmin.auth.admin.deleteUser(id);

    res.json({ message: 'User deactivated and removed' });
  } catch (err) { next(err); }
};

module.exports = { getUsers, getUser, updateUser, updateMe, deleteUser };
