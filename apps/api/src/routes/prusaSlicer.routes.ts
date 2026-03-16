import express from "express";
import { sliceModel } from "../controllers/prusaSlicer.controller";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/slice", authMiddleware, adminMiddleware, sliceModel);

export default router;
