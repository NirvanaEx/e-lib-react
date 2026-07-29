// The "open to everyone" switch first shipped attached to "department_closed"
// as access_type "department_open". It belongs to "restricted" instead, so the
// value is renamed. Department attachments are unaffected; the per-user list
// was already empty for these rows.
exports.up = async function (knex) {
  await knex("file_items").where({ access_type: "department_open" }).update({ access_type: "restricted_open" });
  await knex("file_requests").where({ access_type: "department_open" }).update({ access_type: "restricted_open" });
};

exports.down = async function (knex) {
  await knex("file_items").where({ access_type: "restricted_open" }).update({ access_type: "department_open" });
  await knex("file_requests").where({ access_type: "restricted_open" }).update({ access_type: "department_open" });
};
