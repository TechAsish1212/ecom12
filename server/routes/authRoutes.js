import express from 'express';
import { forgetPassword, getUser, login, logout, register, resetPassword, updatePassword, updateProfile, verifyOtp } from '../controllers/authController.js';
import { isVerifyAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', isVerifyAuth, getUser);
router.post('/logout', isVerifyAuth, logout);
router.post('/password/forgot', forgetPassword);
router.put('/password/reset/:token', resetPassword);
router.put('/password/update', isVerifyAuth, updatePassword);
router.put('/me/update', isVerifyAuth, updateProfile);
router.post("/verify-otp", verifyOtp);




export default router;