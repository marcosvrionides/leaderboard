package com.leaderboard.backend;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Single-elimination bracket, derived entirely from the seeded player list
 * and the results recorded so far (nothing else is stored).
 *
 * The bracket size is the next power of two; the spare places are byes,
 * which go to the top seeds. Seeds are placed in the standard order (1 v 8,
 * 4 v 5, 2 v 7, 3 v 6 for eight) so the top two can only meet in the final.
 */
public final class Bracket {

    private Bracket() {
    }

    /** A recorded result: which side won, and the match it was played as. */
    public record Result(String winnerSide, long matchId, int scoreA, int scoreB) {
    }

    public enum State { WAITING, READY, PLAYED, BYE }

    /**
     * One match in the bracket. Rounds and slots are 1- and 0-based:
     * round 1 is the first round, slot 0 is the top match of each round.
     */
    public record Slot(int round, int slot, String a, String b, Integer seedA, Integer seedB,
                       String winner, State state, Long matchId, Integer scoreA, Integer scoreB) {
    }

    public static int size(int players) {
        int size = 2;
        while (size < players) {
            size *= 2;
        }
        return size;
    }

    public static int rounds(int players) {
        return Integer.numberOfTrailingZeros(size(players));
    }

    /** Seed numbers in bracket order, e.g. [1, 4, 2, 3] for a bracket of four. */
    static int[] seedOrder(int size) {
        int[] order = {1, 2};
        while (order.length < size) {
            int n = order.length * 2;
            int[] next = new int[n];
            for (int i = 0; i < order.length; i++) {
                next[2 * i] = order[i];
                next[2 * i + 1] = n + 1 - order[i];
            }
            order = next;
        }
        return order;
    }

    public static String key(int round, int slot) {
        return round + ":" + slot;
    }

    /** All rounds of the bracket, first round first. */
    public static List<List<Slot>> build(List<String> seededPlayers, Map<String, Result> results) {
        int n = seededPlayers.size();
        int size = size(n);
        int[] order = seedOrder(size);
        List<List<Slot>> rounds = new ArrayList<>();

        List<Slot> first = new ArrayList<>();
        for (int i = 0; i < size / 2; i++) {
            int seedA = order[2 * i];
            int seedB = order[2 * i + 1];
            String a = seedA <= n ? seededPlayers.get(seedA - 1) : null;
            String b = seedB <= n ? seededPlayers.get(seedB - 1) : null;
            first.add(slot(1, i, a, b, a == null ? null : seedA, b == null ? null : seedB, results, true));
        }
        rounds.add(first);

        for (int r = 2; r <= Integer.numberOfTrailingZeros(size); r++) {
            List<Slot> previous = rounds.get(r - 2);
            List<Slot> round = new ArrayList<>();
            for (int i = 0; i < previous.size() / 2; i++) {
                Slot top = previous.get(2 * i);
                Slot bottom = previous.get(2 * i + 1);
                round.add(slot(r, i, top.winner(), bottom.winner(), seedOf(top), seedOf(bottom), results, false));
            }
            rounds.add(round);
        }
        return rounds;
    }

    private static Integer seedOf(Slot s) {
        if (s.winner() == null) {
            return null;
        }
        return s.winner().equals(s.a()) ? s.seedA() : s.seedB();
    }

    private static Slot slot(int round, int index, String a, String b, Integer seedA, Integer seedB,
                             Map<String, Result> results, boolean firstRound) {
        if (firstRound && (a == null || b == null)) {
            return new Slot(round, index, a, b, seedA, seedB, a == null ? b : a, State.BYE, null, null, null);
        }
        if (a == null || b == null) {
            return new Slot(round, index, a, b, seedA, seedB, null, State.WAITING, null, null, null);
        }
        Result r = results.get(key(round, index));
        if (r == null) {
            return new Slot(round, index, a, b, seedA, seedB, null, State.READY, null, null, null);
        }
        String winner = "A".equals(r.winnerSide()) ? a : b;
        return new Slot(round, index, a, b, seedA, seedB, winner, State.PLAYED, r.matchId(), r.scoreA(), r.scoreB());
    }

    /** The winner of the final, or null while the tournament is in progress. */
    public static String champion(List<List<Slot>> rounds) {
        return rounds.get(rounds.size() - 1).get(0).winner();
    }

    /** "Final", "Semi-final", "Quarter-final", then "Round of 16", "Round of 32". */
    public static String roundName(int round, int totalRounds) {
        int fromEnd = totalRounds - round;
        return switch (fromEnd) {
            case 0 -> "Final";
            case 1 -> "Semi-final";
            case 2 -> "Quarter-final";
            default -> "Round of " + (1 << (fromEnd + 1));
        };
    }
}
