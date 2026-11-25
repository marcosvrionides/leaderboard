package com.leaderboard.backend;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes a board and everything on it, in one transaction so it can't be
 * left half-deleted. Order matters for the foreign keys: tournament results
 * point at matches, and matches point at the board.
 */
@Service
public class BoardDeletionService {

    private final LeaderboardRepository leaderboards;
    private final MatchRepository matches;
    private final TournamentRepository tournaments;

    public BoardDeletionService(LeaderboardRepository leaderboards, MatchRepository matches,
                                TournamentRepository tournaments) {
        this.leaderboards = leaderboards;
        this.matches = matches;
        this.tournaments = tournaments;
    }

    @Transactional
    public void delete(Leaderboard board) {
        // Tournaments take their bracket results and player lists with them.
        tournaments.deleteAll(tournaments.findByLeaderboardNameOrderByCreatedAtDesc(board.getName()));
        tournaments.flush();
        // Matches take their participants with them.
        matches.deleteAll(matches.findByLeaderboardName(board.getName()));
        matches.flush();
        leaderboards.delete(board);
    }
}
