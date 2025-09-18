import ErrorHandler from "../middlewares/errorMiddleware.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import database from "../database/db.js";
import bcrypt from 'bcrypt';
import { sendToken } from "../utils/jwtToken.js";
import { generateResetPasswordToken } from "../utils/generateResetPasswordToken.js";
import { generateEmailTemplate } from "../utils/generateForgotPasswordEmailTemplate.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import {v2 as cloudinary} from 'cloudinary'
import { url } from "inspector";
import e from "express";

const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;



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
        return next(new ErrorHandler("Password must be between 8 and 20 characters long and include uppercase, lowercase, number, and special character", 400));
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


export const login = catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new ErrorHandler("Email or password is required", 400));
    }

    const existedUser = await database.query(
        `SELECT * FROM users WHERE email = $1`, [email]
    );

    if (existedUser.rows.length === 0) {
        return next(new ErrorHandler("user email is Invalid", 401));
    }

    const isPasswordMatch = await bcrypt.compare(password, existedUser.rows[0].password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("password is Invalid", 401));
    }

    sendToken(existedUser.rows[0], 200, "User Login successfully", res);
})

export const getUser = catchAsyncError(async (req, res, next) => {
    const { user } = req; //or const user = req.user;
    res.status(200).json({
        success: true,
        user,
    })
})

export const logout = catchAsyncError(async (req, res, next) => {
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).
        json({
            success: true,
            message: "User logout successfully"
        })
})

export const forgetPassword = catchAsyncError(async (req, res, next) => {
    const { email } = req.body;
    const { frontendUrl } = req.query;

    let userResult = await database.query(
        `SELECT * FROM  users WHERE email =$1`, [email]
    )
    if (userResult.rows.length === 0) {
        return next(new ErrorHandler("User not found with this email"));
    }

    const user = userResult.rows[0];
    const { resetToken, hashedToken, resetPasswordExpires } = generateResetPasswordToken();

    await database.query(`UPDATE users SET reset_password_token =$1, reset_password_expire =to_timestamp($2) WHERE email= $3`, [hashedToken, resetPasswordExpires / 1000, email]);

    const resetPasswordUrl = `${frontendUrl}/password/reset/${resetToken}`;
    const message = generateEmailTemplate(resetPasswordUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: "Ecommerce Password Recovery",
            message,
        })
        res.status(200).json({ success: true, message: `Email sent to ${user.email} successfully` });
    } catch (error) {
        await database.query(
            `UPDATE users SET reset_password_token =NULL,reset_password_expire=NULL WHERE email =$1`, [email]
        )
        return next(new ErrorHandler("Email could not be sent", 500));
    }
})

export const resetPassword = catchAsyncError(async (req, res, next) => {
    const { token } = req.params;

    //  Hash the token and check user
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    const userResult = await database.query(
        `SELECT * FROM users WHERE reset_password_token=$1 AND reset_password_expire > NOW()`,
        [resetPasswordToken]
    );

    if (userResult.rows.length === 0) {
        return next(new ErrorHandler("Expired or invalid reset token", 400));
    }

    const { password, confirmPassword } = req.body;

    // Validate password
    if (password !== confirmPassword) {
        return next(new ErrorHandler("Passwords do not match", 400));
    }

    // Strong password check (same as register)
    const passwordReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    if (!passwordReg.test(password)) {
        return next(
            new ErrorHandler(
                "Password must be 8–20 characters long and include uppercase, lowercase, number, and special character",
                400
            )
        );
    }

    //  Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Update user
    const updatedUser = await database.query(
        `UPDATE users 
         SET password=$1, reset_password_token=NULL, reset_password_expire=NULL 
         WHERE id=$2 
         RETURNING *`,
        [hashedPassword, userResult.rows[0].id]
    );

    // 5. Send response with new token
    sendToken(updatedUser.rows[0], 200, "Password reset successfully", res);
});

export const updatePassword = catchAsyncError(async (req, res, next) => {
    // taking from the user
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Check if all fields are provided
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new ErrorHandler("All fields are required", 400));
    }

    // Compare current password with the hashed password in the database
    const isPasswordMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isPasswordMatch) {
        return next(new ErrorHandler("Current password is Incorrect", 401));
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmNewPassword) {
        return next(new ErrorHandler("Password are not matching", 400));
    }

    // Validate password strength
    const passwordReg = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;
    if (!passwordReg.test(newPassword)) {
        return next(
            new ErrorHandler(
                "Password must be 8–20 characters long and include uppercase, lowercase, number, and special character",
                400
            )
        );
    }

    //  Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await database.query(
        "UPDATE users SET password =$1 WHERE id =$2", [hashedPassword, req.user.id]
    )

    // Send success response
    res.status(200).json({
        success: true,
        message: "Password updated successfully"
    })
})

export const updateProfile = catchAsyncError(async(req,res,next)=>{
    const {name,email}=req.body;

    if(!name || !email){
        return next(new ErrorHandler("Provides all fields",400));
    }

    if(name.trim().length===0 || email.trim().length===0){
        return next(new ErrorHandler("Name and Email can not be empty",400));
    }

    let avatarData={};
    if(req.files && req.files.avatar){
        const {avatar}=req.files;
        if(req.user?.avatar?.public_id){
            await cloudinary.uploader.destroy(req.user.avatar.public_id);
        }

        const newProfileImage=await cloudinary.uploader.upload(avatar.tempFilePath,{
            folder:"Ecom-Avatar",
            width:150,
            crop:"scale",   
        })
        avatarData={
            public_id:newProfileImage.public_id,
            url:newProfileImage.secure_url
        }
    }

    let user;
    if(Object.keys(avatarData).length===0){
        user=await database.query(
            'UPDATE users SET name =$1 ,email =$2 WHERE id =$3 RETURNING *',[name,email,req.user.id]
        )
    }
    else{
        user=await database.query(
            'UPDATE users SET name =$1 ,email =$2,avatar=$3 WHERE id =$4 RETURNING *',[name,email,avatarData,req.user.id]
        )
    }
    res.status(200).json({
        success:true,
        message:"Profile updated successfully",
        user:user.rows[0]
    })
})