import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/env.js";

export const signUp = async (req, res, next) => {
  // เปิด Transaction ของ MongoDB เพื่อให้บันทึกหลายขั้นตอนสำเร็จหรือยกเลิกพร้อมกัน เช่น ทำการสร้าง User และ Profile พร้อมกัน แล้วตอนท้ายมีขั้นตอนใดขั้นตอนหนึ่งผิดพลาด ก็ให้ยกเลิกทั้งหมดจะไม่บันทึกขั้นตอนใดเลย
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const error = new Error("User already exists");
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token,
        user: newUser,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const error = new Error("Invalid password");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      success: true,
      message: "User signed in successfully",
      data: {
        token,
        userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const signOut = async (req, res, next) => {};
