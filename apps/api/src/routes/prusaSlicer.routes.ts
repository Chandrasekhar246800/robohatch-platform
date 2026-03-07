import express from "express";
import { sliceModel } from "../controllers/prusaSlicer.controller";

const router = express.Router();

router.post("/slice", sliceModel);

export default router;
