import { Router } from "express";
import { uploadTemplate, getTemplateById } from "../controllers/templateController";
import { authenticate } from "../middleware/authMiddleware";
import { uploadTemplateFile } from "../middleware/uploadMiddleware";

const router = Router();

router.use(authenticate);

router.post(
  "/upload",
  uploadTemplateFile.single("template"),
  uploadTemplate
);

router.get("/:id", getTemplateById);

export default router;