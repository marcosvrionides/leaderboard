package com.leaderboard.backend;

import java.util.List;

/**
 * What the home page shows for each board. Counts and the leader are for the
 * current season; {@code lastPlayed} is the most recent game in any season.
 * {@code leader} and {@code leaderRating} are null when the current season
 * has no games yet.
 */
public record BoardSummary(
        String name,
        int season,
        int matchCount,
        int playerCount,
        Long lastPlayed,
        String leader,
        Long leaderRating,
        boolean unlisted) {

    public static BoardSummary of(Leaderboard board, List<Match> allMatches) {
        int season = board.getCurrentSeason();
        List<Match> current = allMatches.stream().filter(m -> m.getSeason() == season).toList();
        Long lastPlayed = allMatches.stream().map(Match::getTimestamp).max(Long::compare).orElse(null);
        if (current.isEmpty()) {
            return new BoardSummary(board.getName(), season, 0, 0, lastPlayed, null, null, board.isUnlisted());
        }
        List<Elo.Standing> standings = Elo.standings(current);
        Elo.Standing top = standings.get(0);
        return new BoardSummary(board.getName(), season, current.size(), standings.size(), lastPlayed,
                top.player(), top.roundedRating(), board.isUnlisted());
    }
}
