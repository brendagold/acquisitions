import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '#services/auth.service.js';

const userSelect = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.created_at,
  updatedAt: users.updated_at,
};

export const getAllUsers = async () => {
  try {
    return await db.select(userSelect).from(users);
  } catch (e) {
    logger.error('Error getting users', e);
    throw e;
  }
};

export const getUserById = async (id) => {
  try {
    const [user] = await db
      .select(userSelect)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user || null;
  } catch (e) {
    logger.error('Error getting user by id', e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    // Ensure user exists
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      throw new Error('User not found');
    }

    const toUpdate = {};

    if (typeof updates.name !== 'undefined') toUpdate.name = updates.name;
    if (typeof updates.email !== 'undefined') toUpdate.email = updates.email;
    if (typeof updates.role !== 'undefined') toUpdate.role = updates.role;
    if (typeof updates.password !== 'undefined') {
      toUpdate.password = await hashPassword(updates.password);
    }

    // If nothing to update, just return the current user (without password)
    if (Object.keys(toUpdate).length === 0) {
      const [unchanged] = await db
        .select(userSelect)
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return unchanged;
    }

    const [updated] = await db
      .update(users)
      .set(toUpdate)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.created_at,
        updatedAt: users.updated_at,
      });

    return updated;
  } catch (e) {
    logger.error('Error updating user', e);
    throw e;
  }
};

export const deleteUser = async (id) => {
  try {
    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!deleted) {
      throw new Error('User not found');
    }

    return deleted;
  } catch (e) {
    logger.error('Error deleting user', e);
    throw e;
  }
};
