import { Router } from "express";
import {
  createMapping,
  getMappings,
} from "../controllers/mappingController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/", createMapping);

router.get(
  "/template/:templateId",
  getMappings
);

export default router;