import logger from '#config/logger.js';
import { jwttoken } from '#utils/jwt.js';

// Attaches req.user if a valid JWT is present (from cookie `token` or Bearer Authorization header)
export const attachUser = (req, _res, next) => {
  try {
    const cookieToken = req.cookies?.token;
    let token = cookieToken;

    // Optional: also allow Bearer token for non-cookie clients
    if (!token) {
      const auth = req.get('Authorization');
      if (auth && auth.startsWith('Bearer ')) {
        token = auth.slice(7);
      }
    }

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

// Optional guard if you want route-level enforcement
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }
  next();
};
