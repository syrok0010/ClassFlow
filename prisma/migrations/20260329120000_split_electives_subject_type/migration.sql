-- Split legacy ELECTIVE into required and optional elective types.
ALTER TYPE "SubjectType" RENAME TO "SubjectType_old";

CREATE TYPE "SubjectType" AS ENUM (
  'ACADEMIC',
  'ELECTIVE_REQUIRED',
  'ELECTIVE_OPTIONAL',
  'REGIME'
);

ALTER TABLE "Subject"
ALTER COLUMN "type"
DROP DEFAULT;

ALTER TABLE "Subject"
ALTER COLUMN "type"
TYPE "SubjectType"
USING (
  CASE
    WHEN "type"::text = 'ELECTIVE' THEN 'ELECTIVE_OPTIONAL'
    ELSE "type"::text
  END
)::"SubjectType";

ALTER TABLE "Subject"
ALTER COLUMN "type"
SET DEFAULT 'ACADEMIC';

DROP TYPE "SubjectType_old";
