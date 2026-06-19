package com.leaderboard.backend;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordEncodingTests {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @Test
    void hashedPasswordIsNotStoredInPlaintext() {
        String raw = "supersecret";
        String hashed = encoder.encode(raw);

        assertNotEquals(raw, hashed);
    }

    @Test
    void matchesReturnsTrueForCorrectPassword() {
        String raw = "supersecret";
        String hashed = encoder.encode(raw);

        assertTrue(encoder.matches(raw, hashed));
    }

    @Test
    void matchesReturnsFalseForIncorrectPassword() {
        String hashed = encoder.encode("supersecret");

        assertFalse(encoder.matches("wrongpassword", hashed));
    }
}
