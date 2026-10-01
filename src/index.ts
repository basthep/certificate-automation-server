import express from "express";
import cors from "cors";
import prisma from "./lib/prisma";
import authRoutes from "./routes/authRoutes";
import automationRoutes from "./routes/automationRoutes";
import templateRoutes from "./routes/templateRoutes";
import templateFieldRoutes from "./routes/templateFieldRoutes";
import dataRoutes from "./routes/dataRoutes";
import mappingRoutes from "./routes/mappingRoutes";
import previewRoutes from "./routes/previewRoutes";
import generationRoutes from "./routes/generationRoutes";
import bulkGenerationRoutes from "./routes/bulkGenerationRoutes";
import certificateRoutes from "./routes/certificateRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/template-fields", templateFieldRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/mappings", mappingRoutes);
app.use("/api/preview", previewRoutes);
app.use("/api/generate", generationRoutes);
app.use("/api/generate-bulk", bulkGenerationRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/dashboard",dashboardRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "Certificate Automation API is running",
  });
});

app.get("/api/test-db", async (_req, res) => {
  try {
    const users = await prisma.user.count();

    res.json({
      connected: true,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      connected: false,
      message: "Database connection failed",
    });
  }
});

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});