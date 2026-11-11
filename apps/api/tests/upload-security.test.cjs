const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { setTimeout: delay } = require("node:timers/promises");
const { Controller, Module, Post, Req, UseInterceptors } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { FileInterceptor } = require("@nestjs/platform-express");
const { diskStorage } = require("multer");
const { uploadLimits } = require("../dist/common/upload-limits");
const { UploadExceptionFilter } = require("../dist/common/upload-exception.filter");

test("Nest upload parser rejects hostile multipart data and cleans disk files", { timeout: 15000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "elib-upload-test-"));
  let app;
  try {
    class UploadController {
      upload(req) {
        return { lang: req.body.lang, size: req.file?.size };
      }
    }
    Controller("upload")(UploadController);
    const descriptor = Object.getOwnPropertyDescriptor(UploadController.prototype, "upload");
    Post()(UploadController.prototype, "upload", descriptor);
    Req()(UploadController.prototype, "upload", 0);
    UseInterceptors(FileInterceptor("file", {
      storage: diskStorage({ destination: directory }),
      limits: uploadLimits(8)
    }))(UploadController.prototype, "upload", descriptor);
    class TestModule {}
    Module({ controllers: [UploadController] })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.useGlobalFilters(new UploadExceptionFilter());
    await app.listen(0, "127.0.0.1");
    const url = `${await app.getUrl()}/upload`;
    const send = (form) => fetch(url, { method: "POST", body: form, signal: AbortSignal.timeout(3000) });
    const file = (form, content = "12345678") => form.append("file", new Blob([content]), "test.pdf");
    const emptyDirectory = async () => {
      assert.deepEqual(await fs.readdir(directory), []);
    };

    await t.test("normal single-file upload at the size limit keeps metadata", async () => {
      const form = new FormData();
      form.append("lang", "ru");
      file(form);
      const response = await send(form);
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), { lang: "ru", size: 8 });
      const files = await fs.readdir(directory);
      assert.equal(files.length, 1);
      assert.equal(await fs.readFile(path.join(directory, files[0]), "utf8"), "12345678");
      await fs.unlink(path.join(directory, files[0]));
    });
    await t.test("oversized file returns 413 and is removed", async () => {
      const form = new FormData();
      file(form, "123456789");
      assert.equal((await send(form)).status, 413);
      await emptyDirectory();
    });
    await t.test("second file is rejected and both disk files are removed", async () => {
      const form = new FormData();
      file(form);
      file(form);
      assert.equal((await send(form)).status, 400);
      await emptyDirectory();
    });
    for (const name of ["items[4294967294]", "a[b][c]", "a".repeat(101)]) {
      await t.test(`hostile field name (${name.slice(0, 30)}) returns 400`, async () => {
        const form = new FormData();
        file(form);
        form.append(name, "x");
        assert.equal((await send(form)).status, 400);
        await emptyDirectory();
      });
    }
    await t.test("too many metadata fields are rejected", async () => {
      const form = new FormData();
      for (let i = 0; i < 5; i++) form.append(`field${i}`, "x");
      assert.equal((await send(form)).status, 400);
      await emptyDirectory();
    });
    await t.test("oversized metadata is rejected", async () => {
      const form = new FormData();
      form.append("lang", "x".repeat(64 * 1024 + 1));
      assert.equal((await send(form)).status, 400);
      await emptyDirectory();
    });
    await t.test("aborted upload removes its partial disk file and server stays responsive", async () => {
      const request = http.request(url, {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=abort-test" }
      });
      // A socket reset is expected when we abort our own request.
      request.on("error", () => {});
      try {
        request.write('--abort-test\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n1234');
        const createdDeadline = Date.now() + 2000;
        while ((await fs.readdir(directory)).length === 0 && Date.now() < createdDeadline) await delay(20);
        assert.equal((await fs.readdir(directory)).length, 1);
      } finally {
        request.destroy();
      }
      const cleanupDeadline = Date.now() + 2000;
      while ((await fs.readdir(directory)).length !== 0 && Date.now() < cleanupDeadline) await delay(20);
      await emptyDirectory();
      const form = new FormData();
      form.append("lang", "ru");
      assert.equal((await send(form)).status, 201);
    });
  } finally {
    if (app) await app.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
