package com.leaderboard.backend;

import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

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

    /**
     * The spelling to show for each player (keyed by {@link #key}) among
     * these participants: the most used spelling, ties going to the most
     * recent match. Mirrors normaliseMatches in frontend/src/stats.js.
     */
    public static Map<String, String> canonicalSpellings(Collection<MatchParticipant> participants) {
        record Usage(int count, long lastPlayed) {
        }
        Map<String, Map<String, Usage>> byKey = new HashMap<>();
        for (MatchParticipant p : participants) {
            String spelling = clean(p.getPlayerName());
            byKey.computeIfAbsent(key(spelling), k -> new HashMap<>())
                    .merge(spelling, new Usage(1, p.getMatch().getTimestamp()),
                            (a, b) -> new Usage(a.count() + b.count(), Math.max(a.lastPlayed(), b.lastPlayed())));
        }
        Map<String, String> canonical = new HashMap<>();
        byKey.forEach((k, spellings) -> canonical.put(k, spellings.entrySet().stream()
                .max(Comparator.<Map.Entry<String, Usage>>comparingInt(e -> e.getValue().count())
                        .thenComparingLong(e -> e.getValue().lastPlayed()))
                .orElseThrow()
                .getKey()));
        return canonical;
    }
}
