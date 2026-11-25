package com.leaderboard.backend;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class EloTests {

    /** Builds a match from alternating name/score pairs. */
    private static Match match(long id, long timestamp, Object... nameScorePairs) {
        Match match = new Match();
        match.setId(id);
        match.setTimestamp(timestamp);
        List<MatchParticipant> ps = new ArrayList<>();
        for (int i = 0; i < nameScorePairs.length; i += 2) {
            MatchParticipant p = new MatchParticipant();
            p.setPlayerName((String) nameScorePairs[i]);
            p.setGamesWon((Integer) nameScorePairs[i + 1]);
            ps.add(p);
        }
        match.setParticipants(ps);
        return match;
    }

    private static Map<String, Double> ratings(List<Elo.Standing> standings) {
        Map<String, Double> map = new LinkedHashMap<>();
        standings.forEach(s -> map.put(s.player(), s.rating()));
        return map;
    }

    @Test
    void matchesTheFrontendExactly() {
        // Same scenario as scratch elo-vector.mjs run against frontend/src/elo.js:
        // out-of-order input, a draw, a 4-player match and a timestamp tie.
        List<Match> matches = List.of(
                match(3, 300, "Cat", 2, "Alice", 2),
                match(1, 100, "Alice", 3, "Bob", 1),
                match(2, 200, "Bob", 3, "Cat", 0),
                match(4, 300, "Alice", 5, "Bob", 3, "Cat", 1, "Dan", 1),
                match(5, 500, "Dan", 3, "Alice", 2));

        Map<String, Double> r = ratings(Elo.standings(matches));

        assertEquals(1011.761634, r.get("Alice"), 1e-6);
        assertEquals(1006.024491, r.get("Bob"), 1e-6);
        assertEquals(975.034063, r.get("Cat"), 1e-6);
        assertEquals(1007.179811, r.get("Dan"), 1e-6);
    }

    @Test
    void evenPlayersMoveHalfOfK() {
        Map<String, Double> r = ratings(Elo.standings(List.of(match(1, 1, "A", 3, "B", 1))));
        assertEquals(1016, r.get("A"), 1e-9);
        assertEquals(984, r.get("B"), 1e-9);
    }

    @Test
    void standingsAreRankedByEloThenWins() {
        List<Elo.Standing> s = Elo.standings(List.of(
                match(1, 1, "A", 3, "B", 1),
                match(2, 2, "C", 2, "D", 2)));
        assertEquals(List.of("A", "C", "D", "B"), s.stream().map(Elo.Standing::player).toList());
        assertEquals(1, s.get(0).matchWins());
        assertEquals(0, s.get(1).matchWins());
    }

    @Test
    void namesDifferingOnlyInCapitalsAreOnePlayer() {
        List<Elo.Standing> s = Elo.standings(List.of(
                match(1, 1, "Sam", 3, "Jo", 1),
                match(2, 2, "sam ", 3, "Jo", 1),
                match(3, 3, "Sam", 3, "Jo", 1)));
        assertEquals(2, s.size());
        assertEquals("Sam", s.get(0).player());
        assertEquals(3, s.get(0).played());
    }

    @Test
    void boardSummaryUsesTheLeader() {
        Leaderboard pool = new Leaderboard();
        pool.setName("Pool");
        BoardSummary summary = BoardSummary.of(pool, List.of(
                match(1, 100, "A", 3, "B", 1),
                match(2, 250, "A", 3, "C", 0)));
        assertEquals(new BoardSummary("Pool", 1, 2, 3, 250L, "A", 1031L, false), summary);

        Leaderboard empty = new Leaderboard();
        empty.setName("Empty");
        assertEquals(new BoardSummary("Empty", 1, 0, 0, null, null, null, false), BoardSummary.of(empty, List.of()));
    }

    @Test
    void boardSummaryOnlyCountsTheCurrentSeason() {
        Leaderboard pool = new Leaderboard();
        pool.setName("Pool");
        pool.setCurrentSeason(2);
        Match old = match(1, 100, "A", 3, "B", 1);
        Match current = match(2, 200, "C", 3, "B", 0);
        current.setSeason(2);

        BoardSummary summary = BoardSummary.of(pool, List.of(old, current));
        assertEquals(new BoardSummary("Pool", 2, 1, 2, 200L, "C", 1016L, false), summary);

        Match newSeasonOnly = match(3, 300, "A", 1, "B", 1);
        pool.setCurrentSeason(3);
        assertEquals(new BoardSummary("Pool", 3, 0, 0, 300L, null, null, false),
                BoardSummary.of(pool, List.of(old, current, newSeasonOnly)));
    }
}
