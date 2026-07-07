-- Run this AFTER deploying the new backend (so Hibernate's ddl-auto=update
-- has already created the match_participants table).
--
-- NOT SAFE TO RUN TWICE against a DB that's already been migrated -- the
-- INSERT below would duplicate every participant. Only run this once per
-- database (e.g. once locally, once against Railway prod).

-- Clean up junk matches with missing player names (e.g. bad old Firebase
-- import rows) before migrating. Delete any already-inserted participant
-- rows for them first, in case this script is being re-run after a partial
-- failure.
DELETE FROM match_participants
WHERE match_id IN (
    SELECT id FROM matches
    WHERE player1_name IS NULL OR player2_name IS NULL
);

DELETE FROM matches
WHERE player1_name IS NULL OR player2_name IS NULL;

-- Migrate the remaining legitimate matches into the new participants table.
INSERT INTO match_participants (match_id, player_name, games_won)
SELECT id, player1_name, player1_games_won FROM matches
UNION ALL
SELECT id, player2_name, player2_games_won FROM matches;

-- Sanity check: row counts should be exactly double.
-- SELECT (SELECT COUNT(*) FROM matches) * 2 AS expected,
--        (SELECT COUNT(*) FROM match_participants) AS actual;

-- REQUIRED, not just cleanup: the old columns were created NOT NULL, and the
-- new backend never populates them, so new matches can't be saved until
-- these are dropped. Run once you've confirmed the migrated data looks right.
ALTER TABLE matches DROP COLUMN player1_name;
ALTER TABLE matches DROP COLUMN player2_name;
ALTER TABLE matches DROP COLUMN player1_games_won;
ALTER TABLE matches DROP COLUMN player2_games_won;
