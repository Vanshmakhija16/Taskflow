const { supabaseAdmin, supabasePublic } = require('../../config/supabase');
const logger = require('../../config/logger');

function authError(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

async function buildUserResponse(userId, email, sessionData) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('id', userId)
    .single();

  return {
    user:          profile || { id: userId, email, role: 'employee' },
    access_token:  sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  };
}

// ── Signup (email + password) ─────────────────────────────────────────────────
async function signup(req, res) {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return authError(res, 'Email and password are required');
    if (password.length < 8) return authError(res, 'Password must be at least 8 characters');

    // Pre-check: is there already a profile row with this email? The DB trigger
    // hard-fails the auth.users insert on email UNIQUE conflict ("Database error
    // creating new user") — detect it up front and give a clear error.
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return authError(res, 'An account with this email already exists', 409);
    }

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '' },
    });
    if (signUpError) {
      logger.error('signup createUser: ' + signUpError.message);
      return authError(res, signUpError.message);
    }

    // Profile created by DB trigger; upsert as safety net (in case trigger is missing)
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(
      { id: authData.user.id, email, full_name: full_name || '', role: 'employee' },
      { onConflict: 'id' }
    );
    if (profileErr) logger.warn('signup profile upsert: ' + profileErr.message);

    const { data: sessionData, error: signInError } =
      await supabasePublic.auth.signInWithPassword({ email, password });
    if (signInError) return authError(res, signInError.message);

    const payload = await buildUserResponse(authData.user.id, email, sessionData);
    return res.status(201).json({ message: 'Account created successfully', ...payload });
  } catch (err) {
    logger.error('signup: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Email + password login ────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return authError(res, 'Email and password are required');

    const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password });
    if (error) return authError(res, error.message, 401);

    const payload = await buildUserResponse(data.user.id, email, data);
    return res.json(payload);
  } catch (err) {
    logger.error('login: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Send OTP / Magic Link ─────────────────────────────────────────────────────
async function sendOtp(req, res) {
  try {
    const { email, type = 'magiclink' } = req.body;
    // type: 'magiclink' | 'otp'
    if (!email) return authError(res, 'Email is required');

    const { error } = await supabasePublic.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${process.env.CLIENT_URL}/auth/callback`,
        // 'magiclink' sends a clickable link; 'otp' sends a 6-digit code
        ...(type === 'otp' ? { data: { otp_type: 'otp' } } : {}),
      },
    });
    if (error) return authError(res, error.message);

    return res.json({ message: 'OTP / magic link sent to ' + email });
  } catch (err) {
    logger.error('sendOtp: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Verify OTP (6-digit code) ─────────────────────────────────────────────────
async function verifyOtp(req, res) {
  try {
    const { email, token } = req.body;
    if (!email || !token) return authError(res, 'email and token are required');

    const { data, error } = await supabasePublic.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) return authError(res, error.message, 401);

    // Ensure profile exists (new user via OTP)
    await supabaseAdmin.from('profiles').upsert(
      { id: data.user.id, email, full_name: data.user.user_metadata?.full_name || '', role: 'employee' },
      { onConflict: 'id' }
    );

    const payload = await buildUserResponse(data.user.id, email, data);
    return res.json(payload);
  } catch (err) {
    logger.error('verifyOtp: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────
async function refresh(req, res) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return authError(res, 'refresh_token required');

    const { data, error } = await supabasePublic.auth.refreshSession({ refresh_token });
    if (error) return authError(res, error.message, 401);

    return res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    logger.error('refresh: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function logout(req, res) {
  try {
    await supabasePublic.auth.signOut();
    return res.json({ message: 'Logged out' });
  } catch (err) {
    logger.error('logout: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Forgot password ───────────────────────────────────────────────────────────
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return authError(res, 'Email required');

    await supabasePublic.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL}/reset-password`,
    });

    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('forgotPassword: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Get current user ──────────────────────────────────────────────────────────
async function getMe(req, res) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) return authError(res, 'User not found', 404);
    return res.json({ user: profile });
  } catch (err) {
    logger.error('getMe: ' + err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup, login, sendOtp, verifyOtp, refresh, logout, forgotPassword, getMe };
