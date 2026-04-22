const { supabaseAdmin } = require('../../config/supabase');

const getNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', req.user.id);
    } else {
      await supabaseAdmin.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', req.user.id);
    }
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markRead };
