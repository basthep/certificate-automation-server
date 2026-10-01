import { Router } from "express";
import {
  createAutomation,
  getAutomations,
  getAutomation,
  deleteAutomation,
} from "../controllers/automationController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/", createAutomation);
router.get("/", getAutomations);
router.get("/:id", getAutomation);
router.delete("/:id", deleteAutomation);

export default router;