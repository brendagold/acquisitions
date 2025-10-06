import { fetchAllUsers, getUserById, updateUser, deleteUser } from '#controllers/users.controller.js';
import express from 'express';

const router = express.Router();

router.get('/', fetchAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
