const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const knex = require("knex");
const { ConfigService } = require("@nestjs/config");
const { UsersService } = require("../dist/modules/users/users.service");
const { PositionsService } = require("../dist/modules/positions/positions.service");
const { SectionsService } = require("../dist/modules/sections/sections.service");
const { CategoriesService } = require("../dist/modules/categories/categories.service");
const { DepartmentsService } = require("../dist/modules/departments/departments.service");
const { SessionsService } = require("../dist/modules/sessions/sessions.service");
const { AuditService } = require("../dist/modules/audit/audit.service");
const { FilesService } = require("../dist/modules/files/files.service");
const { FileRequestsService } = require("../dist/modules/files/file-requests.service");
const { StatsService } = require("../dist/modules/stats/stats.service");

// Run against a disposable PostgreSQL database. Each run uses its own schema.
test("sorting precedes pagination", { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
  const schema = `sorting_test_${process.pid}_${Date.now()}`;
  const admin = knex({ client: "pg", connection: process.env.TEST_DATABASE_URL });
  let db;
  try {
    await admin.raw("create schema ??", [schema]);
    db = knex({ client: "pg", connection: process.env.TEST_DATABASE_URL, searchPath: [schema] });
    await db.migrate.latest({ directory: path.resolve(__dirname, "../migrations"), schemaName: schema });
    const config = new ConfigService({ DEFAULT_DATA_LANG: "ru" });
    const source = { db };
    const audit = new AuditService(source);
    const users = new UsersService(source, audit, config);
    const positions = new PositionsService(source, audit);
    const sections = new SectionsService(source, config, audit);
    const categories = new CategoriesService(source, config, audit);
    const departments = new DepartmentsService(source, audit, config);
    const sessions = new SessionsService(source);
    const files = new FilesService(source, config, audit, {}, {});
    const requests = new FileRequestsService(source, config, audit);
    const stats = new StatsService(source, config);
    const date = "2026-01-01T00:00:00Z";
    const dates = [3, 6, 1, 3, 2, 4].map(day => `2026-01-0${day}T00:00:00Z`);
    await db("roles").insert([{ id: 101, name: "z-role" }, { id: 102, name: "a-role" }]);
    await db("departments").insert([
      { id: 1, name: "Z-root", parent_id: null }, { id: 2, name: "A-root", parent_id: null }
    ]);
    await db("departments").insert([
      { id: 3, name: "A-child", parent_id: 1 }, { id: 4, name: "Z-child", parent_id: 2 }
    ]);
    await db("positions").insert([{ id: 1, name: "Zulu" }, { id: 2, name: "Alpha" }, { id: 3, name: "Beta" }]);
    const logins = ["zeta", "alpha", "beta", "delta", "gamma", "epsilon"];
    await db("users").insert(logins.map((login, index) => ({
      id: index + 1, login, surname: login, name: "Test", password_hash: "unused",
      role_id: index % 2 ? 102 : 101, department_id: index === 5 ? null : index % 2 ? 4 : 3,
      position_id: index < 3 ? 1 : index === 3 ? 2 : null,
      must_change_password: index % 2 === 0, deleted_at: index === 4 ? date : null,
      created_at: dates[index], updated_at: date
    })));
    for (let id = 1; id <= 6; id++) {
      await db("sections").insert({ id, created_at: date, updated_at: date });
      await db("sections_translations").insert([
        { section_id: id, lang: "ru", title: logins[id - 1] },
        { section_id: id, lang: "en", title: logins[6 - id] }
      ]);
      await db("categories").insert({ id, parent_id: id > 2 ? 1 : null });
      await db("categories_translations").insert([
        { category_id: id, lang: "ru", title: logins[id - 1] },
        { category_id: id, lang: "en", title: logins[6 - id] }
      ]);
      await db("file_items").insert({ id, section_id: id < 4 ? 1 : 2, category_id: id, access_type: "public", created_by: id });
      await db("file_translations").insert({ file_item_id: id, lang: "ru", title: logins[id - 1] });
      await db("file_requests").insert({ id, created_by: id, section_id: id, category_id: id,
        access_type: id % 2 ? "public" : "restricted_open", status: id > 4 ? "approved" : "pending",
        request_type: id % 2 ? "new" : "update", created_at: date, updated_at: date });
      await db("file_request_translations").insert([
        { file_request_id: id, lang: "ru", title: logins[id - 1] },
        { file_request_id: id, lang: "en", title: logins[6 - id] }
      ]);
      await db("sessions").insert({ id, user_id: id, ip: `10.0.0.${7 - id}`, created_at: date });
      await db("audit_logs").insert({ id, actor_user_id: id, entity_id: 7 - id, entity_type: "USER", action: "USER_UPDATED", created_at: date });
      await db("downloads").insert({ id, user_id: id, file_item_id: id, lang: id % 2 ? "ru" : "en", created_at: date });
      await db("file_views").insert({ id, user_id: id, file_item_id: id, lang: "ru", created_at: date });
    }
    await db("file_versions").insert({ id: 1, file_item_id: 1, version_number: 1, deleted_at: date });
    await db("file_version_assets").insert({ id: 1, file_version_id: 1, lang: "ru", original_name: "a.pdf", mime: "application/pdf", size: 1, path: "unused" });
    await db("file_items").whereIn("id", [1, 3, 5, 6]).update({ deleted_at: date });

    // Compare every page to a separately sorted complete result. Page size two
    // puts tied values and records with multiple translations on boundaries.
    async function checkPages(list, fields, filters = {}, identity = (r) => r.id) {
      for (const [sortBy, value] of Object.entries(fields)) {
        for (const sortDir of ["asc", "desc"]) {
          const all = await list({ page: 1, pageSize: 100, ...filters, sortBy, sortDir });
          const rows = [];
          for (let page = 1; page <= Math.ceil(all.meta.total / 2); page++) {
            const result = await list({ page, pageSize: 2, ...filters, sortBy, sortDir });
            assert.equal(result.meta.total, all.meta.total);
            assert.equal(result.data.length, Math.min(2, all.meta.total - (page - 1) * 2));
            rows.push(...result.data);
          }
          assert.deepEqual(rows.map(identity), all.data.map(identity), `${sortBy}/${sortDir}: page boundaries`);
          assert.equal(new Set(rows.map(identity)).size, all.meta.total);
          for (let i = 1; i < rows.length; i++) {
            const a = value(rows[i - 1]), b = value(rows[i]);
            if (b == null) continue;
            assert.notEqual(a, null, `${sortBy}: nulls last`);
            const comparison = a < b ? -1 : a > b ? 1 : 0;
            assert.ok(sortDir === "asc" ? comparison <= 0 : comparison >= 0, `${sortBy}/${sortDir}: ${a} vs ${b}`);
          }
        }
      }
    }
    const lower = (s) => s == null ? null : s.toLowerCase();
    const time = (s) => s == null ? null : new Date(s).getTime();

    await t.test("users: all headers, search, equal values, reset and invalid sort key", async () => {
      const fields = { login: r => lower(r.login), role: r => r.role,
        department: r => r.department_id == null ? null : r.department_id === 3 ? "z-root / a-child" : "a-root / z-child",
        status: r => Boolean(r.deleted_at), created_at: r => time(r.created_at), connectionStatus: r => !r.must_change_password };
      await checkPages(p => users.list(p), fields);
      await checkPages(p => users.list(p), { login: fields.login }, { q: "ta" });
      assert.deepEqual((await users.list({ page: 1, pageSize: 2, sortBy: "login", sortDir: "asc" })).data.map(r => r.login), ["alpha", "beta"]);
      const reset = await users.list({ page: 1, pageSize: 2 });
      for (const sortBy of ["__proto__", "constructor", "login; drop table users"]) {
        assert.deepEqual((await users.list({ page: 1, pageSize: 2, sortBy })).data, reset.data);
      }
    });
    await t.test("positions: global name and user count order", () => checkPages(p => positions.list(p), { name: r => lower(r.name), dataCount: r => r.dataCount }));
    await t.test("sections: translation selection, intact pages and file counts", async () => {
      for (const lang of ["ru", "en", "uz"]) {
        await checkPages(p => sections.list(p, lang), { title: r => r.title, filesCount: r => r.filesCount,
          langs: r => [...r.availableLangs].sort().join(","), createdAt: r => time(r.createdAt), updatedAt: r => time(r.updatedAt) });
        const result = await sections.list({ page: 1, pageSize: 2, q: "alpha" }, lang);
        assert.equal(result.data.length, 2);
        result.data.forEach(r => assert.equal(r.availableLangs.length, 2));
      }
    });
    await t.test("requests: all headers, translations and pending/history filters", async () => {
      const sectionNames = { 1: "zeta", 2: "alpha", 3: "beta", 4: "delta", 5: "gamma", 6: "epsilon" };
      const fields = { title: r => r.title, type: r => r.requestType, login: r => r.createdBy.login,
        user: r => lower(r.createdBy.fullName), department: r => lower(r.createdBy.department),
        section: r => sectionNames[r.sectionId], category: r => r.categoryId > 2 ? `zeta / ${sectionNames[r.categoryId]}` : sectionNames[r.categoryId],
        access: r => r.accessType, status: r => r.status, createdAt: r => time(r.createdAt), resolvedAt: r => time(r.resolvedAt || r.updatedAt || r.createdAt) };
      await checkPages(p => requests.listAdminRequests(p, "ru"), fields);
      for (const scope of ["pending", "history"]) await checkPages(p => requests.listAdminRequests(p, "ru"), fields, { scope });
      const found = await requests.listAdminRequests({ page: 1, pageSize: 2, q: "alpha", sortBy: "title", sortDir: "asc" }, "en");
      assert.equal(found.data.length, 2);
      found.data.forEach(r => assert.equal(r.availableLangs.length, 2));
    });
    await t.test("sessions, audit, trash and activity", async () => {
      await checkPages(p => sessions.list(p), { login: r => r.login, ip: r => r.ip, created_at: r => time(r.created_at), last_activity: r => time(r.last_activity) });
      await checkPages(p => audit.list(p), { entity_id: r => r.entity_id, created_at: r => time(r.created_at) });
      await checkPages(p => files.listTrash(p, "ru"), { title: r => r.title, type: r => r.type, deletedAt: r => time(r.deletedAt) }, {}, r => `${r.type}-${r.id}`);
      await checkPages(p => stats.activity(p, "ru"), { user: r => r.user.login, file: r => r.file.title,
        createdAt: r => time(r.createdAt), action: r => r.action, department: r => lower(r.user.department),
        versionNumber: r => r.versionNumber, lang: r => r.lang, ip: r => r.ip });
    });
    await t.test("trees: full hierarchy and entity-based category pagination", async () => {
      const tree = await categories.list({ tree: true, page: 1, pageSize: 2 }, "en");
      assert.equal(tree.data.length, 6);
      assert.equal(tree.data.filter(r => r.parentId === 1).length, 4);
      await checkPages(p => categories.list(p, "ru"), { id: r => r.id });
      const departmentTree = await departments.list({ tree: true, page: 1, pageSize: 2 });
      assert.equal(departmentTree.data.length, 4);
    });
  } finally {
    if (db) await db.destroy();
    await admin.raw("drop schema if exists ?? cascade", [schema]);
    await admin.destroy();
  }
});
