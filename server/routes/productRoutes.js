import express from "express";
import { authorizeRoles, isVerifyAuth } from "../middlewares/authMiddleware.js";
import { createProduct, fetchAllProducts } from "../controllers/productController.js";

const router=express.Router();

router.post('/admin/create',isVerifyAuth,authorizeRoles('Admin'),createProduct);
router.get('/',fetchAllProducts);

export default router;