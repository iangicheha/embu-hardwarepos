import { Router, Request, Response } from "express";
import prisma from "../../database/prisma";

const router = Router();

// Public route (no auth) — same as static /uploads used to be, since these
// URLs get embedded directly in <img> tags across the app.
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const image = await prisma.image.findUnique({
    where: { id: id as string }
  });

  if (!image) {
    return res.status(404).json({ success: false, message: "Image not found" });
  }

  res.setHeader("Content-Type", image.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(image.data);
});

export default router;