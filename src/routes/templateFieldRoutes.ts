import { Router } from "express";
import {
  createTemplateField,
  getTemplateFields,
  updateTemplateField,
  deleteTemplateField,
} from "../controllers/templateFieldController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/", createTemplateField);

router.get("/template/:templateId",getTemplateFields);

router.put("/:id", updateTemplateField);

router.delete("/:id", deleteTemplateField);

export default router;