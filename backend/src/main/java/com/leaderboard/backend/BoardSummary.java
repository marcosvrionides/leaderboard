package com.leaderboard.backend;

import java.util.List;

/**
 * What the home page shows for each board. {@code leader} and
 * {@code leaderRating} are null when no games have been played.
 */
public record BoardSummary(
        String name,
        int matchCount,
        int playerCount,
        Long lastPlayed,
        String leader,
        Long leaderRating) {

    public static BoardSummary of(String name, List<Match> matches) {
        if (matches.isEmpty()) {
            return new BoardSummary(name, 0, 0, null, null, null);
        }
        List<Elo.Standing> standings = Elo.standings(matches);
        Elo.Standing top = standings.get(0);
        long lastPlayed = matches.stream().mapToLong(Match::getTimestamp).max().orElseThrow();
        return new BoardSummary(name, matches.size(), standings.size(), lastPlayed,
                top.player(), top.roundedRating());
    }
}
