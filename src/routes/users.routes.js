import {
  fetchAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '#controllers/users.controller.js';
import express from 'express';
import { authenticateToken, requireRole } from '#middleware/auth.middleware.js';

const router = express.Router();

// List all users: admin only
router.get('/', authenticateToken, requireRole(['admin']), fetchAllUsers);

// Get user by ID: any authenticated user
router.get('/:id', authenticateToken, getUserById);

// Update user: controller enforces self-or-admin; only authentication required here
router.put('/:id', authenticateToken, updateUser);

// Delete user: admin only
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteUser);

export default router;
