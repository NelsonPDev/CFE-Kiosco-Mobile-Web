const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { createSessionToken } = require('../middleware/auth.middleware');
const { normalizeDepartments } = require('../utils/departments');

const parseStoredPassword = (user) => user?.password_hash || user?.password || user?.pass || user?.contrasena || null;

const passwordMatches = async (inputPassword, storedPassword) => {
  if (!storedPassword) return false;

  if (storedPassword === inputPassword) return true;

  try {
    return await bcrypt.compare(inputPassword, storedPassword);
  } catch (error) {
    return false;
  }
};

const findUserInSupabase = async (rpe) => {
  if (!supabase) return null;

  const tableCandidates = [
    { table: 'web_admins', role: 'admin', loginColumns: ['username', 'rpe'] },
    { table: 'jefes', role: 'jefe', loginColumns: ['rpe'] },
  ];

  for (const candidate of tableCandidates) {
    for (const column of candidate.loginColumns) {
      const { data, error } = await supabase
        .from(candidate.table)
        .select('*')
        .eq(column, rpe)
        .limit(1);

      if (!error && data?.length) {
        const user = data[0];
        return { ...user, role: user.role || user.rol || candidate.role };
      }
    }
  }

  return null;
};

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
  }

  const normalizedUsername = String(username).trim();
  try {
    if (!supabase) {
      return res.status(503).json({ message: 'Sin conexión a Supabase.' });
    }

    const user = await findUserInSupabase(normalizedUsername);

    if (!user) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    const storedPassword = parseStoredPassword(user);
    const passwordMatchesResult = storedPassword ? await passwordMatches(password, storedPassword) : false;

    if (!passwordMatchesResult) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    const departments = normalizeDepartments(user.departamento || user.area || user.departamentos || user.departamento_id);
    const normalizedUser = {
      id: user.id,
      username: user.username || user.rpe || user.user_name || user.nombre || user.email,
      role: user.role || user.rol || user.role_name || 'jefe',
      nombre: user.nombre || user.name || user.username || user.rpe,
      departamento: departments[0] || null,
      departamentos: departments,
    };

    return res.json({ user: normalizedUser, token: createSessionToken(normalizedUser) });
  } catch (error) {
    console.error('Error al autenticar usuario:', error.message);
    return res.status(500).json({ message: 'No fue posible iniciar sesión.' });
  }
};

module.exports = { login };
