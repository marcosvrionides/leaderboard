package com.leaderboard.backend;

/** A single board's settings, as the board page needs them (no password). */
public record BoardDetails(String name, int currentSeason, Long currentSeasonStartedAt, boolean unlisted) {

    public static BoardDetails of(Leaderboard board) {
        return new BoardDetails(board.getName(), board.getCurrentSeason(), board.getCurrentSeasonStartedAt(),
                board.isUnlisted());
    }
}
