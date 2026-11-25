package com.leaderboard.backend;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Elo ratings replayed from a board's match history. A direct port of
 * frontend/src/elo.js and the ranking in frontend/src/stats.js - keep the
 * two in step (EloTests checks the same numbers as the frontend).
 *
 * Everyone starts at 1000. Each match compares every pair of players (more
 * games won = win, equal = draw); a player's change is K times the average of
 * (actual - expected) over their opponents.
 */
public final class Elo {

    public static final double STARTING_RATING = 1000;
    public static final double K_FACTOR = 32;

    private Elo() {
    }

    public record Standing(String player, double rating, int matchWins, int played) {
        public long roundedRating() {
            return Math.round(rating);
        }
    }

    public static double expectedScore(double rating, double opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
    }

    /** Standings for the given matches, best first: Elo, then match wins, then name. */
    public static List<Standing> standings(List<Match> matches) {
        Map<String, String> spelling = PlayerNames.canonicalSpellings(
                matches.stream().flatMap(m -> m.getParticipants().stream()).toList());
        List<Match> ordered = new ArrayList<>(matches);
        ordered.sort(Comparator.comparingLong(Match::getTimestamp)
                .thenComparing(m -> m.getId() == null ? 0L : m.getId()));

        Map<String, Double> ratings = new HashMap<>();
        Map<String, int[]> counts = new HashMap<>(); // name -> {matchWins, played}

        for (Match match : ordered) {
            List<MatchParticipant> ps = match.getParticipants();
            List<String> names = ps.stream().map(p -> spelling.get(PlayerNames.key(p.getPlayerName()))).toList();
            Map<String, Double> changes = new HashMap<>();

            for (int i = 0; i < ps.size(); i++) {
                double total = 0;
                int opponents = 0;
                for (int j = 0; j < ps.size(); j++) {
                    if (names.get(j).equals(names.get(i))) {
                        continue;
                    }
                    int mine = ps.get(i).getGamesWon();
                    int theirs = ps.get(j).getGamesWon();
                    double actual = mine > theirs ? 1 : mine == theirs ? 0.5 : 0;
                    total += actual - expectedScore(
                            ratings.getOrDefault(names.get(i), STARTING_RATING),
                            ratings.getOrDefault(names.get(j), STARTING_RATING));
                    opponents++;
                }
                if (opponents > 0) {
                    changes.merge(names.get(i), K_FACTOR * total / opponents, Double::sum);
                }
            }
            changes.forEach((name, change) ->
                    ratings.put(name, ratings.getOrDefault(name, STARTING_RATING) + change));

            int top = ps.stream().mapToInt(MatchParticipant::getGamesWon).max().orElse(0);
            long topCount = ps.stream().filter(p -> p.getGamesWon() == top).count();
            for (int i = 0; i < ps.size(); i++) {
                int[] c = counts.computeIfAbsent(names.get(i), k -> new int[2]);
                c[1]++;
                if (topCount == 1 && ps.get(i).getGamesWon() == top) {
                    c[0]++;
                }
            }
        }

        List<Standing> result = new ArrayList<>();
        counts.forEach((name, c) -> result.add(
                new Standing(name, ratings.getOrDefault(name, STARTING_RATING), c[0], c[1])));
        result.sort(Comparator.comparingLong(Standing::roundedRating).reversed()
                .thenComparing(Comparator.comparingInt(Standing::matchWins).reversed())
                .thenComparing(Standing::player));
        return result;
    }
}
