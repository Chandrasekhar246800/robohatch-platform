import { Router } from 'express';
import prusaRoutes from "./prusaSlicer.routes";

const router = Router();

// PrusaSlicer integration
router.use("/prusa", prusaRoutes);

// Add your routes here

export default router;
