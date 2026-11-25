package com.leaderboard.backend;

import java.util.Locale;

/**
 * Player names are free text, so the same person can be typed as "Marcos",
 * "marcos" or "Marcos ". These helpers define when two names mean the same
 * player: ignoring capitals and extra spaces.
 */
public final class PlayerNames {

    private PlayerNames() {
    }

    /** Trims and collapses runs of whitespace into single spaces. */
    public static String clean(String name) {
        return name == null ? null : name.trim().replaceAll("\\s+", " ");
    }

    /** The identity of a player: cleaned and lower-cased. */
    public static String key(String name) {
        String cleaned = clean(name);
        return cleaned == null ? null : cleaned.toLowerCase(Locale.ROOT);
    }
}
