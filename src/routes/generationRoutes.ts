import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { generateCertificate } from "../controllers/generationController";

const router = Router();

router.use(authenticate);

router.post("/certificate", generateCertificate);

export default router;