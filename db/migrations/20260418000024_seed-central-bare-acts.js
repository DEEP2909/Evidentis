/* eslint-disable camelcase */
/**
 * Seed core central bare acts metadata for India research workflows.
 * Full section text can still be fetched or refreshed separately.
 */

exports.shorthands = undefined;

const acts = [
  { title: "Indian Contract Act, 1872", shortTitle: "Indian Contract Act", category: "Contract & Commercial", year: 1872 },
  { title: "Arbitration and Conciliation Act, 1996", shortTitle: "Arbitration and Conciliation Act", category: "Dispute Resolution", year: 1996 },
  { title: "Companies Act, 2013", shortTitle: "Companies Act", category: "Corporate", year: 2013 },
  { title: "Transfer of Property Act, 1882", shortTitle: "Transfer of Property Act", category: "Property", year: 1882 },
  { title: "Negotiable Instruments Act, 1881", shortTitle: "Negotiable Instruments Act", category: "Banking & Finance", year: 1881 },
  { title: "Information Technology Act, 2000", shortTitle: "Information Technology Act", category: "Technology & Data", year: 2000 },
  { title: "Digital Personal Data Protection Act, 2023", shortTitle: "DPDP Act, 2023", category: "Technology & Data", year: 2023 },
  { title: "Central Goods and Services Tax Act, 2017", shortTitle: "CGST Act, 2017", category: "Taxation", year: 2017 },
  { title: "Real Estate (Regulation and Development) Act, 2016", shortTitle: "RERA Act, 2016", category: "Property", year: 2016 },
  { title: "Consumer Protection Act, 2019", shortTitle: "Consumer Protection Act", category: "Consumer", year: 2019 },
  { title: "Code of Civil Procedure, 1908", shortTitle: "CPC, 1908", category: "Procedure", year: 1908 },
  { title: "Indian Evidence Act, 1872", shortTitle: "Evidence Act", category: "Procedure", year: 1872 },
  { title: "Limitation Act, 1963", shortTitle: "Limitation Act", category: "Procedure", year: 1963 },
  { title: "Specific Relief Act, 1963", shortTitle: "Specific Relief Act", category: "Contract & Commercial", year: 1963 },
  { title: "Trade Marks Act, 1999", shortTitle: "Trade Marks Act", category: "Intellectual Property", year: 1999 },
  { title: "Copyright Act, 1957", shortTitle: "Copyright Act", category: "Intellectual Property", year: 1957 },
  { title: "Patents Act, 1970", shortTitle: "Patents Act", category: "Intellectual Property", year: 1970 },
  { title: "Code on Wages, 2019", shortTitle: "Code on Wages", category: "Labour", year: 2019 },
  { title: "Industrial Relations Code, 2020", shortTitle: "Industrial Relations Code", category: "Labour", year: 2020 },
  { title: "Insolvency and Bankruptcy Code, 2016", shortTitle: "IBC, 2016", category: "Corporate", year: 2016 },
  { title: "Prevention of Money Laundering Act, 2002", shortTitle: "PMLA, 2002", category: "Financial Crimes", year: 2002 },
  { title: "Foreign Exchange Management Act, 1999", shortTitle: "FEMA, 1999", category: "Banking & Finance", year: 1999 },
  { title: "Securities and Exchange Board of India Act, 1992", shortTitle: "SEBI Act, 1992", category: "Banking & Finance", year: 1992 },
  { title: "Indian Stamp Act, 1899", shortTitle: "Indian Stamp Act", category: "Property", year: 1899 },
  { title: "Bharatiya Nyaya Sanhita, 2023", shortTitle: "BNS, 2023", category: "Criminal", year: 2023 },
];

function escapeLiteral(value) {
  return value.replace(/'/g, "''");
}

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE bare_acts
      ADD COLUMN IF NOT EXISTS category text,
      ADD COLUMN IF NOT EXISTS is_central boolean NOT NULL DEFAULT false;
  `);

  for (const act of acts) {
    const title = escapeLiteral(act.title);
    const shortTitle = escapeLiteral(act.shortTitle);
    const category = escapeLiteral(act.category);

    pgm.sql(`
      INSERT INTO bare_acts (
        title,
        short_title,
        year,
        act_number,
        jurisdiction,
        language,
        category,
        is_central,
        is_active
      )
      SELECT
        '${title}',
        '${shortTitle}',
        ${act.year},
        NULL,
        'india',
        'en',
        '${category}',
        true,
        true
      WHERE NOT EXISTS (
        SELECT 1
        FROM bare_acts
        WHERE lower(title) = lower('${title}')
           OR lower(short_title) = lower('${shortTitle}')
      );
    `);
  }
};

exports.down = (pgm) => {
  const titles = acts.map((act) => `'${escapeLiteral(act.title)}'`).join(", ");
  pgm.sql(`
    DELETE FROM bare_acts
    WHERE is_central = true
      AND title IN (${titles});
  `);
};
