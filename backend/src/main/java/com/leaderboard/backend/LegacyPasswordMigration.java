package com.leaderboard.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * One-time, idempotent migration that upgrades any leaderboard passwords
 * still stored as plaintext (from before passwords were hashed) into
 * BCrypt hashes. Runs automatically on every startup but only touches
 * rows that aren't already a valid BCrypt hash, so it's safe to leave
 * in place permanently.
 */
@Component
public class LegacyPasswordMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyPasswordMigration.class);

    // BCrypt hashes always start with one of these prefixes.
    private static final String[] BCRYPT_PREFIXES = {"$2a$", "$2b$", "$2y$"};

    private final LeaderboardRepository repository;
    private final PasswordEncoder passwordEncoder;

    public LegacyPasswordMigration(LeaderboardRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        List<Leaderboard> leaderboards = repository.findAll();
        int migrated = 0;

        for (Leaderboard leaderboard : leaderboards) {
            String password = leaderboard.getPassword();
            if (password == null || isAlreadyHashed(password)) {
                continue;
            }
            leaderboard.setPassword(passwordEncoder.encode(password));
            repository.save(leaderboard);
            migrated++;
        }

        if (migrated > 0) {
            log.info("Migrated {} leaderboard(s) from plaintext to hashed passwords.", migrated);
        }
    }

    private boolean isAlreadyHashed(String password) {
        for (String prefix : BCRYPT_PREFIXES) {
            if (password.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
