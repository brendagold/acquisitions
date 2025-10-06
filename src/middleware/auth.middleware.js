import logger from '#config/logger.js';
import { jwttoken } from '#utils/jwt.js';

// Attaches req.user if a valid JWT is present (from cookie `token` or Bearer Authorization header)
export const attachUser = (req, _res, next) => {
  try {
    const cookieToken = req.cookies?.token;
    const token = cookieToken;

    if (token) {
      const payload = jwttoken.verify(token);
      // Expecting payload to contain id, email, role
      req.user = { id: payload.id, email: payload.email, role: payload.role };
    }
  } catch (e) {
    // Do not block request on bad/expired token; just log at debug level
    logger.debug('attachUser: invalid or expired token');
    throw e;
  } finally {
    next();
  }
};

// Require any authenticated user
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ error: 'unauthorized', message: 'Authentication required' });
  }
  next();
};

// Strict auth that verifies JWT from HTTP-only cookie only (no headers)
export const authenticateToken = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res
        .status(401)
        .json({ error: 'Access denied', message: 'Insufficient permissions' });
    }
    const payload = jwttoken.verify(token);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch (e) {
    return res.status(401).json({
      error: 'unauthorized',
      message: `Invalid or expired authentication token : ${e}`,
    });
  }
};

// Require that the authenticated user's role is one of the allowed roles
export const requireRole =
  (roles = []) =>
  (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ error: 'unauthorized', message: 'Authentication required' });
    }
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(500).json({
        error: 'server_error',
        message: 'Authorization misconfigured: roles array is empty',
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Requires role in [${roles.join(', ')}]`,
      });
    }
    next();
  };
