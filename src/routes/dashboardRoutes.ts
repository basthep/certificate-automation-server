import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  getDashboardStats,
} from "../controllers/dashboardController";

const router = Router();

router.use(authenticate);

router.get("/", getDashboardStats);

export default router;