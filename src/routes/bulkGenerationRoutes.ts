import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { generateBulkCertificates } from "../controllers/bulkGenerationController";

const router = Router();

router.use(authenticate);

router.post(
  "/certificates",
  generateBulkCertificates
);

export default router;