package com.leaderboard.backend;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Looks up boards and checks their passwords for actions that change them. */
@Component
public class BoardAccess {

    private final LeaderboardRepository leaderboards;
    private final PasswordEncoder passwordEncoder;

    public BoardAccess(LeaderboardRepository leaderboards, PasswordEncoder passwordEncoder) {
        this.leaderboards = leaderboards;
        this.passwordEncoder = passwordEncoder;
    }

    public Leaderboard require(String name) {
        return leaderboards.findById(name).orElseThrow(() -> new LeaderboardNotFoundException(name));
    }

    public Leaderboard requireWithPassword(String name, String password) {
        Leaderboard leaderboard = require(name);
        if (password == null || !passwordEncoder.matches(password, leaderboard.getPassword())) {
            throw new InvalidLeaderboardPasswordException();
        }
        return leaderboard;
    }
}
