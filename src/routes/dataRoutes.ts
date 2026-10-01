import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { getDataFile,processData } from "../controllers/dataController";
import { uploadDataFile } from "../middleware/dataUploadMiddleware";

const router = Router();

router.use(authenticate);

router.get("/:id", getDataFile);
router.post("/upload",uploadDataFile.single("data"),processData);

export default router;