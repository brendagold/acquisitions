import logger from '#config/logger.js';
import { getAllUsers, getUserById as getUserByIdService, updateUser as updateUserService, deleteUser as deleteUserService } from '#services/users.service.js';
import { userIdSchema, updateUserSchema } from '#validations/users.validation.js';

export const fetchAllUsers = async (req, res, next) => {
  try {
    logger.info('Getting users ...');
    const allUsers = await getAllUsers();

    res.json({
      message: 'Successfully retrieved users',
      users: allUsers,
      count: allUsers.length,
    });
  } catch (e) {
    logger.error(e);
    next(e);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const parsed = userIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const { id } = parsed.data;

    // Authorization: non-admins can only access their own profile
    const authUser = req.user;
    const isAdmin = authUser?.role === 'admin';
    const isSelf = Number(authUser?.id) === Number(id);
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'forbidden', message: 'You can only access your own profile' });
    }

    const user = await getUserByIdService(id);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    logger.info(`Retrieved user ${id}`);
    return res.status(200).json({ message: 'Successfully retrieved user', user });
  } catch (e) {
    logger.error(e);
    next(e);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    // Validate path param
    const parsedParams = userIdSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedParams.error.format() });
    }
    const { id } = parsedParams.data;

    // Validate body
    const parsedBody = updateUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedBody.error.format() });
    }
    const updates = parsedBody.data;

    // Authorization: require auth
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    }

    const isAdmin = authUser.role === 'admin';
    const isSelf = Number(authUser.id) === Number(id);

    // Only self or admin can update
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'forbidden', message: 'You can only update your own account' });
    }

    // Only admin can change role
    if (!isAdmin && typeof updates.role !== 'undefined') {
      return res.status(403).json({ error: 'forbidden', message: 'Only admins can change roles' });
    }

    const updated = await updateUserService(id, updates);

    logger.info(`Updated user ${id}${isAdmin ? ' (by admin)' : ''}`);
    return res.status(200).json({ message: 'User updated successfully', user: updated });
  } catch (e) {
    logger.error('Update user error', e);
    // Unique constraint handling (email)
    if (e && (e.code === '23505' || /unique|duplicate/i.test(String(e.message)))) {
      return res.status(409).json({ error: 'conflict', message: 'Email already exists' });
    }
    if (String(e.message).includes('User not found')) {
      return res.status(404).json({ error: 'not_found', message: 'User not found' });
    }
    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const parsedParams = userIdSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsedParams.error.format() });
    }
    const { id } = parsedParams.data;

    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    }

    const isAdmin = authUser.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'forbidden', message: 'Only admins can delete users' });
    }

    await deleteUserService(id);

    logger.info(`Deleted user ${id} (by admin)`);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (e) {
    logger.error('Delete user error', e);
    if (String(e.message).includes('User not found')) {
      return res.status(404).json({ error: 'not_found', message: 'User not found' });
    }
    next(e);
  }
};
