import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { MulterError } from "multer";
import type { Response } from "express";

// NestJS 10 does not map Multer 2's new field nesting/index errors to HTTP 400.
@Catch(MulterError)
export class UploadExceptionFilter implements ExceptionFilter {
  catch(_exception: MulterError, host: ArgumentsHost) {
    host.switchToHttp().getResponse<Response>().status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Invalid multipart upload"
    });
  }
}
