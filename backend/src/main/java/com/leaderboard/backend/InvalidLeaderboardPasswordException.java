package com.leaderboard.backend;

/**
 * Thrown when a request supplies a missing or incorrect password
 * for a password-protected leaderboard.
 */
public class InvalidLeaderboardPasswordException extends RuntimeException {
    public InvalidLeaderboardPasswordException() {
        super("Missing or incorrect leaderboard password");
    }
}
