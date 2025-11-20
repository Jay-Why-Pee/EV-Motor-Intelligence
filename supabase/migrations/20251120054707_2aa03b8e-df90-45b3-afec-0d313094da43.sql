-- Change category column to array type to support multiple categories
ALTER TABLE news ALTER COLUMN category TYPE text[] USING ARRAY[category];

-- Update existing records to ensure they're arrays
UPDATE news SET category = ARRAY[category] WHERE category IS NOT NULL;