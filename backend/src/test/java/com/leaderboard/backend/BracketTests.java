package com.leaderboard.backend;

import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class BracketTests {

    private static List<String> players(int n) {
        return java.util.stream.IntStream.rangeClosed(1, n).mapToObj(i -> "P" + i).toList();
    }

    @Test
    void seedOrderKeepsTopSeedsApart() {
        assertArrayEquals(new int[]{1, 2}, Bracket.seedOrder(2));
        assertArrayEquals(new int[]{1, 4, 2, 3}, Bracket.seedOrder(4));
        assertArrayEquals(new int[]{1, 8, 4, 5, 2, 7, 3, 6}, Bracket.seedOrder(8));
        // Every seed appears exactly once.
        int[] sixteen = Bracket.seedOrder(16).clone();
        Arrays.sort(sixteen);
        for (int i = 0; i < 16; i++) {
            assertEquals(i + 1, sixteen[i]);
        }
    }

    @Test
    void sizesAndRoundNames() {
        assertEquals(4, Bracket.size(3));
        assertEquals(8, Bracket.size(5));
        assertEquals(8, Bracket.size(8));
        assertEquals(3, Bracket.rounds(6));
        assertEquals("Final", Bracket.roundName(3, 3));
        assertEquals("Semi-final", Bracket.roundName(2, 3));
        assertEquals("Quarter-final", Bracket.roundName(1, 3));
        assertEquals("Round of 16", Bracket.roundName(1, 4));
    }

    @Test
    void byesGoToTheTopSeedsAndAdvanceThem() {
        List<List<Bracket.Slot>> rounds = Bracket.build(players(5), Map.of());
        List<Bracket.Slot> first = rounds.get(0);

        assertEquals(4, first.size());
        long byes = first.stream().filter(s -> s.state() == Bracket.State.BYE).count();
        assertEquals(3, byes);
        // The only real first-round match is seed 4 v seed 5.
        Bracket.Slot real = first.stream().filter(s -> s.state() == Bracket.State.READY).findFirst().orElseThrow();
        assertEquals(List.of(4, 5), List.of(real.seedA(), real.seedB()));
        // Seeds 2 and 3 meet in round two straight away; seed 1 waits for 4/5.
        List<Bracket.Slot> second = rounds.get(1);
        assertEquals(Bracket.State.WAITING, second.get(0).state());
        assertEquals("P1", second.get(0).a());
        assertEquals(Bracket.State.READY, second.get(1).state());
        assertEquals(List.of("P2", "P3"), List.of(second.get(1).a(), second.get(1).b()));
    }

    @Test
    void resultsAdvanceWinnersToTheChampion() {
        Map<String, Bracket.Result> results = new HashMap<>();
        // 4 players: P1 v P4 (slot 0), P2 v P3 (slot 1).
        results.put(Bracket.key(1, 0), new Bracket.Result("B", 10, 1, 3)); // P4 upsets P1
        results.put(Bracket.key(1, 1), new Bracket.Result("A", 11, 3, 0)); // P2 wins
        List<List<Bracket.Slot>> rounds = Bracket.build(players(4), results);

        Bracket.Slot fin = rounds.get(1).get(0);
        assertEquals(List.of("P4", "P2"), List.of(fin.a(), fin.b()));
        assertEquals(List.of(4, 2), List.of(fin.seedA(), fin.seedB()));
        assertEquals(Bracket.State.READY, fin.state());
        assertNull(Bracket.champion(rounds));

        results.put(Bracket.key(2, 0), new Bracket.Result("A", 12, 3, 2));
        rounds = Bracket.build(players(4), results);
        assertEquals("P4", Bracket.champion(rounds));
        assertEquals(Bracket.State.PLAYED, rounds.get(1).get(0).state());
        assertEquals(12L, rounds.get(1).get(0).matchId());
    }

    @Test
    void everyPlayerAppearsOnceInTheFirstRound() {
        for (int n = 3; n <= 32; n++) {
            List<List<Bracket.Slot>> rounds = Bracket.build(players(n), Map.of());
            List<String> seen = rounds.get(0).stream()
                    .flatMap(s -> java.util.stream.Stream.of(s.a(), s.b()))
                    .filter(java.util.Objects::nonNull)
                    .sorted()
                    .toList();
            assertEquals(players(n).stream().sorted().toList(), seen, "n=" + n);
            // No first-round slot is a bye against nobody.
            assertTrue(rounds.get(0).stream().allMatch(s -> s.a() != null || s.b() != null), "n=" + n);
        }
    }
}
