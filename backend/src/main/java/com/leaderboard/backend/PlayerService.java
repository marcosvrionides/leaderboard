package com.leaderboard.backend;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Keeps player names consistent within a board, and renames/merges players. */
@Service
public class PlayerService {

    private final MatchParticipantRepository participants;

    public PlayerService(MatchParticipantRepository participants) {
        this.participants = participants;
    }

    /**
     * The spelling to use for each player on a board, keyed by
     * {@link PlayerNames#key}. Where old data has several spellings of the
     * same player, the most used one wins (ties go to the most recent).
     */
    public Map<String, String> canonicalNames(String board) {
        record Usage(int count, long lastPlayed) {
        }
        Map<String, Map<String, Usage>> spellingsByKey = new HashMap<>();
        for (MatchParticipant p : participants.findByBoard(board)) {
            String spelling = PlayerNames.clean(p.getPlayerName());
            long ts = p.getMatch().getTimestamp();
            spellingsByKey
                    .computeIfAbsent(PlayerNames.key(spelling), k -> new HashMap<>())
                    .merge(spelling, new Usage(1, ts),
                            (a, b) -> new Usage(a.count() + b.count(), Math.max(a.lastPlayed(), b.lastPlayed())));
        }
        Map<String, String> canonical = new HashMap<>();
        spellingsByKey.forEach((key, spellings) -> canonical.put(key, spellings.entrySet().stream()
                .max(Comparator.<Map.Entry<String, Usage>>comparingInt(e -> e.getValue().count())
                        .thenComparingLong(e -> e.getValue().lastPlayed()))
                .orElseThrow()
                .getKey()));
        return canonical;
    }

    /**
     * Cleans the names in a new match and matches them to existing players
     * ignoring capitals and spacing, so "marcos " joins "Marcos" rather than
     * becoming a new player. Rejects the same player appearing twice.
     */
    public void applyCanonicalNames(String board, List<MatchParticipant> newParticipants) {
        Map<String, String> canonical = canonicalNames(board);
        Set<String> seen = new HashSet<>();
        for (MatchParticipant p : newParticipants) {
            String cleaned = PlayerNames.clean(p.getPlayerName());
            String key = PlayerNames.key(cleaned);
            if (!seen.add(key)) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "'" + cleaned + "' appears more than once. Each player can only appear once in a match.");
            }
            p.setPlayerName(canonical.getOrDefault(key, cleaned));
        }
    }

    public record RenameResult(String name, boolean merged, int matchesUpdated) {
    }

    /**
     * Renames a player across every match on the board. If the new name
     * belongs to another existing player, the two are merged into one under
     * that player's existing spelling.
     */
    @Transactional
    public RenameResult rename(String board, String from, String to) {
        String fromKey = PlayerNames.key(from);
        String toName = PlayerNames.clean(to);
        String toKey = PlayerNames.key(toName);

        List<MatchParticipant> all = participants.findByBoard(board);
        List<MatchParticipant> source = all.stream()
                .filter(p -> PlayerNames.key(p.getPlayerName()).equals(fromKey))
                .toList();
        if (source.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND,
                    "There's no player called '" + PlayerNames.clean(from) + "' on this leaderboard.");
        }

        boolean merging = !fromKey.equals(toKey);
        List<MatchParticipant> target = merging
                ? all.stream().filter(p -> PlayerNames.key(p.getPlayerName()).equals(toKey)).toList()
                : List.of();

        if (!target.isEmpty()) {
            Set<Long> sourceMatches = source.stream().map(p -> p.getMatch().getId()).collect(Collectors.toSet());
            long shared = target.stream().map(p -> p.getMatch().getId()).filter(sourceMatches::contains).distinct().count();
            if (shared > 0) {
                throw new ApiException(HttpStatus.CONFLICT, String.format(
                        "%s and %s played in the same match %s, so they can't be the same person. "
                                + "Delete %s first if one of the names was a mistake.",
                        PlayerNames.clean(source.get(0).getPlayerName()),
                        PlayerNames.clean(target.get(0).getPlayerName()),
                        shared == 1 ? "once" : shared + " times",
                        shared == 1 ? "that match" : "those matches"));
            }
        }

        // Merging into an existing player keeps their spelling, so choosing
        // "jo" from the list merges into "Jo" without renaming Jo.
        String finalName = target.isEmpty() ? toName : canonicalNames(board).get(toKey);

        List<MatchParticipant> changed = new ArrayList<>(source);
        changed.addAll(target);
        changed.forEach(p -> p.setPlayerName(finalName));
        participants.saveAll(changed);

        int matchesUpdated = (int) changed.stream().map(p -> p.getMatch().getId()).distinct().count();
        return new RenameResult(finalName, !target.isEmpty(), matchesUpdated);
    }
}
