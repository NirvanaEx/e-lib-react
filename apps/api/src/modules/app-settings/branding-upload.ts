import { BadRequestException } from "@nestjs/common";
import { diskStorage } from "multer";
import fs from "fs";
import path from "path";

const rawUploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadDir = path.isAbsolute(rawUploadDir) ? rawUploadDir : path.resolve(process.cwd(), rawUploadDir);
const brandingDir = path.join(uploadDir, "branding");
if (!fs.existsSync(brandingDir)) {
  fs.mkdirSync(brandingDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export const brandingUploadOptions = {
  storage: diskStorage({
    destination: brandingDir,
    filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new BadRequestException("Only PNG, JPG, WEBP or GIF images are allowed"), false);
    }
    cb(null, true);
  }
};
