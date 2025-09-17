import express from 'express';
import { getUser, login, logout, register } from '../controllers/authController.js';
import { isVerifyAuth } from '../middlewares/authMiddleware.js';

const router=express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/me',isVerifyAuth,getUser);
router.post('/logout',isVerifyAuth,logout);

export default router;