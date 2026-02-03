import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

router.get("/db-test", async (_, res) => {
  const users = await prisma.user.findMany();
  res.json({ success: true, users });
});

export default router;
