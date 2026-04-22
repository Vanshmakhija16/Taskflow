const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

/**
 * authenticate
 * Verifies the Bearer JWT from the Authorization header.
 * Attaches req.user = { id, email, role } on success.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch role from profiles table
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .single();

    // Safety net: create profile if DB trigger didn't fire (prevents FK violations
    // on inserts that reference profiles.id, e.g. tasks.created_by)
    if (!profile) {
      const { data: created } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id:        user.id,
            email:     user.email,
            full_name: user.user_metadata?.full_name || '',
            role:      'employee',
          },
          { onConflict: 'id' }
        )
        .select('id, email, full_name, role')
        .single();
      profile = created;
    }

    req.user = {
      id:           user.id,
      email:        user.email,
      full_name:    profile?.full_name || '',
      role:         profile?.role || 'employee',
      access_token: token,
    };

    next();
  } catch (err) {
    logger.error('authenticate error: ' + err.message);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * requireRole(...roles)
 * Usage: requireRole('admin') or requireRole('admin', 'manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/**
 * requireMinRole
 * Role hierarchy: member < manager < admin
 */
const ROLE_LEVELS = { employee: 1, manager: 2, admin: 3 };

function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const minLevel  = ROLE_LEVELS[minRole]       || 99;
    if (userLevel < minLevel) {
      return res.status(403).json({ error: `Requires at least ${minRole} role` });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requireMinRole };
