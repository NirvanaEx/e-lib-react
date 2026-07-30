exports.up = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.raw(`
      CREATE TEMP TABLE category_merge_map ON COMMIT DROP AS
      WITH ranked AS (
        SELECT
          c.id,
          FIRST_VALUE(c.id) OVER (
            PARTITION BY lower(regexp_replace(btrim(ct.title), '\\s+', ' ', 'g'))
            ORDER BY c.id
          ) AS canonical_id
        FROM categories c
        JOIN categories_translations ct
          ON ct.category_id = c.id
         AND ct.lang = 'ru'
      )
      SELECT id AS duplicate_id, canonical_id
      FROM ranked
      WHERE id <> canonical_id
    `);

    await trx.raw(`
      UPDATE file_items fi
      SET category_id = map.canonical_id
      FROM category_merge_map map
      WHERE fi.category_id = map.duplicate_id
    `);

    if (await trx.schema.hasTable("file_requests")) {
      await trx.raw(`
        UPDATE file_requests fr
        SET category_id = map.canonical_id
        FROM category_merge_map map
        WHERE fr.category_id = map.duplicate_id
      `);
    }

    await trx.raw(`
      UPDATE categories child
      SET parent_id = map.canonical_id
      FROM category_merge_map map
      WHERE child.parent_id = map.duplicate_id
        AND child.id <> map.canonical_id
    `);

    await trx.raw(`
      INSERT INTO categories_translations (category_id, lang, title)
      SELECT map.canonical_id, translation.lang, translation.title
      FROM category_merge_map map
      JOIN categories_translations translation
        ON translation.category_id = map.duplicate_id
      ON CONFLICT (category_id, lang) DO NOTHING
    `);

    await trx.raw(`
      DELETE FROM categories_translations translation
      USING category_merge_map map
      WHERE translation.category_id = map.duplicate_id
    `);

    await trx.raw(`
      DELETE FROM categories category
      USING category_merge_map map
      WHERE category.id = map.duplicate_id
    `);

    await trx.schema.alterTable("categories", (table) => {
      table.dropColumn("section_id");
    });

    await trx.raw(`
      CREATE UNIQUE INDEX categories_translations_global_title_unique
      ON categories_translations (
        lang,
        lower(regexp_replace(btrim(title), '\\s+', ' ', 'g'))
      )
    `);
  });
};

exports.down = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.raw("DROP INDEX IF EXISTS categories_translations_global_title_unique");
    await trx.schema.alterTable("categories", (table) => {
      table
        .integer("section_id")
        .nullable()
        .references("id")
        .inTable("sections")
        .onDelete("SET NULL");
    });
  });
};
