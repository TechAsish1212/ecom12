import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt from 'bcrypt';
import { sendToken } from "../utils/jwtToken.js";

const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;



export const register = catchAsyncError(async (req, res, next) => {
    //  get user details from frontend
    const { name, email, password } = req.body;

    //  validation - not empty
    if ([name, email, password].some((i) => !i || i?.trim() === "")) {
        return next(new ErrorHandler("Provide all the required field", 400));
    }

    //  email format validation
    if (!emailReg.test(email)) {
        return next(new ErrorHandler("Provide a valid email", 400));
    }

    // password format validation
    if (!passwordReg.test(password)) {
        return next(new ErrorHandler("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character", 400));
    }

    //  check if user already exists or not (email)
    const existUser = await database.query(
        `SELECT * FROM users WHERE email = $1`, [email]
    );

    if (existUser.rows.length > 0) {
        return next(new ErrorHandler("User already exists", 400))
    }

    //  hashing the password
    const hashPassword = await bcrypt.hash(password, 10);

    //  create user object  -  create empty in db
    const user = await database.query(
        'INSERT INTO users (name,email,password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, hashPassword]
    )
    sendToken(user.rows[0], 201, "User register successfully", res);
})


