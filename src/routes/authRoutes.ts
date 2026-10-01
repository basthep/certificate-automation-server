import { Router } from "express";
import { register, login } from "../controllers/authController";
import { authenticate, AuthRequest } from "../middleware/authMiddleware";
import prisma from "../lib/prisma";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get user",
    });
  }
});

export default router;