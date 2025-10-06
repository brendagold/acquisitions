// import aj from '#config/arcject.js';
// import logger from '#config/logger.js';
// import {slidingWindow} from '@arcjet/node';

// const securityMiddleware = async (req, res, next) => {
//   try {
//     const role = req.user?.role || 'guest';

//     let limit;
//     let message;

//     switch(role) {
//       case 'admin':
//         limit=20;
//         message = 'Admin request limit exceeded (20 per minute). Slow down.';
//         break;
//       case 'user':
//         limit=10;
//         message = 'User request limit exceeded (20 per minute). Slow down.';
//         break;
//       case 'guest':
//         limit=5;
//         message = 'Guest request limit exceeded (20 per minute). Slow down.';
//         break;
//     }

//     const client = aj.withRule(slidingWindow({mode: 'LIVE', interval: '1m', max: limit, name: `${role}-rate-limit`}));

//     const decision = await client.protect(req);

//     if(decision.isDenied() && decision.reason.isBot()) {
//       logger.warn('Bot request blocked', {ip: req.ip, userAgent: req.get('User-Agent'), path: req.path});

//       return res.status(403).json({ error: 'forbidden', message: 'Automated requests are not allowed'});
//     }
//     if(decision.isDenied() && decision.reason.isShield()) {
//       logger.warn('Shield Blocked request', {ip: req.ip, userAgent: req.get('User-Agent'), path: req.path, method: req.method});

//       return res.status(403).json({ error: 'forbidden', message: 'Request blocked by security policy'});
//     }
//     if(decision.isDenied() && decision.reason.isRateLimit()) {
//       logger.warn('Rate limit exceeded', {ip: req.ip, userAgent: req.get('User-Agent'), path: req.path});

//       return res.status(403).json({ error: 'forbidden', message: 'Too many requests'});
//     }

//     next();
//   } catch (e) {
//     console.error('Arcject middleware error:', e);
//     res.status(500).json({error: 'Internal server error', message: 'something went wrong with secuity middleware'});
//   }
// };

// export default securityMiddleware;

import aj from '#config/arcject.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';

    // Per-role limits
    const limits = {
      admin: { max: 20, msg: 'Admin request limit exceeded (20/min).' },
      user: { max: 10, msg: 'User request limit exceeded (10/min).' },
      guest: { max: 5, msg: 'Guest request limit exceeded (5/min).' },
    };
    const { max, msg } = limits[role];

    // IMPORTANT: interval must be a number (seconds)
    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: 60, // 60 seconds
        max,
        // You can customize how clients are tracked:
        // characteristics: ['ip.src'], // default is IP
      })
    );

    // TIP: pass an identifier if you want per-user rates instead of per-IP:
    // const decision = await client.protect(req, { userId: req.user?.id ?? undefined });
    const decision = await client.protect(req);

    // Debug: log all rule results to understand what denied
    for (const result of decision.results) {
      logger.debug('Arcjet rule result', {
        id: result.id,
        action: result.action,
        reason: result.reason?.type,
      });
    }

    if (decision.isDenied()) {
      if (decision.reason?.isBot()) {
        logger.warn('Bot request blocked', {
          ip: req.ip,
          ua: req.get('User-Agent'),
          path: req.path,
        });
        return res.status(403).json({
          error: 'forbidden',
          message: 'Automated requests are not allowed',
        });
      }
      if (decision.reason?.isShield()) {
        logger.warn('Shield blocked request', {
          ip: req.ip,
          ua: req.get('User-Agent'),
          path: req.path,
          method: req.method,
        });
        return res.status(403).json({
          error: 'forbidden',
          message: 'Request blocked by security policy',
        });
      }
      if (decision.reason?.isRateLimit()) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          ua: req.get('User-Agent'),
          path: req.path,
          role,
          limit: max,
        });
        return res
          .status(429)
          .json({ error: 'too_many_requests', message: msg });
      }

      // Fallback deny
      logger.warn('Request denied', {
        reason: decision.reason?.type || 'unknown',
      });
      return res.status(403).json({ error: 'forbidden' });
    }

    next();
  } catch (e) {
    logger.error('Arcjet middleware error', { err: e, stack: e.stack });
    res
      .status(500)
      .json({ error: 'internal_error', message: 'Security middleware error' });
  }
};

export default securityMiddleware;
