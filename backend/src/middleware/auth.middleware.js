const crypto = require('crypto');

const getSecret = () => process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

const sign = (value) => crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');

const createSessionToken = (user) => {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + (8 * 60 * 60 * 1000) })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

const requireAuth = (req, res, next) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');

  if (!payload || !signature || !getSecret()) {
    return res.status(401).json({ message: 'Tu sesión no es válida. Inicia sesión nuevamente.' });
  }

  const expectedSignature = sign(payload);
  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ message: 'Tu sesión no es válida. Inicia sesión nuevamente.' });
  }

  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!user?.exp || user.exp < Date.now()) {
      return res.status(401).json({ message: 'Tu sesión expiró. Inicia sesión nuevamente.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Tu sesión no es válida. Inicia sesión nuevamente.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
  }
  return next();
};

module.exports = { createSessionToken, requireAuth, requireAdmin };
