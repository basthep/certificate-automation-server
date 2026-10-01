import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  getCertificates,
  retryCertificateEmail,
} from "../controllers/certificateController";

const router = Router();

router.use(authenticate);

router.get("/", getCertificates);

router.post(
  "/:id/retry",
  retryCertificateEmail
);

export default router;