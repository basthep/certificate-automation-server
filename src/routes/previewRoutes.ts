import { Router } from "express";
import { previewCertificate } from "../controllers/previewController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.post("/certificate", previewCertificate);

export default router;