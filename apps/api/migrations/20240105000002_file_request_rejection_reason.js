exports.up = async function (knex) {
  await knex.schema.table("file_requests", (table) => {
    table.text("rejection_reason");
  });
};

exports.down = async function (knex) {
  await knex.schema.table("file_requests", (table) => {
    table.dropColumn("rejection_reason");
  });
};
