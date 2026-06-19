package com.leaderboard.backend;

public class LeaderboardNotFoundException extends RuntimeException {
    public LeaderboardNotFoundException(String name) {
        super("No leaderboard found with name: " + name);
    }
}
