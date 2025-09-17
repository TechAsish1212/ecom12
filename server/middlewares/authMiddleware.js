import jwt from "jsonwebtoken";
import { catchAsyncError } from "./catchAsyncError.js";
import ErrorHandler from "./errorMiddleware.js";
import database from "../database/db.js";

// check if user is logged in
export const isVerifyAuth = catchAsyncError(async (req, res, next) => {
    const { token } = req.cookies;
    if (!token) {
        return next(new ErrorHandler("Login to Access this resource", 401));
    }

    // const decoded=jwt.verify(token,process.env.JWT_SECRET_KEY);
    // or
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (err) {
        return next(new ErrorHandler("Invalid or expired token", 401));
    }

    const user = await database.query(
        "SELECT * FROM users WHERE id =$1 LIMIT 1",
        [decoded.id]
    )

    if (user.rows.length === 0) {
        return next(new ErrorHandler("User not found", 404));
    }

    req.user = user.rows[0];
    next();
})


// [Role:- Admin or user]
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorHandler(
                    `Role:${req.user.role} is not allowed to access this resource`, 403
                )
            )
        }
        next();
    }
}
