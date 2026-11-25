package com.leaderboard.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

class PlayerServiceTests {

    private final List<MatchParticipant> stored = new ArrayList<>();
    private MatchParticipantRepository repository;
    private TournamentRepository tournaments;
    private PlayerService service;
    private long nextMatchId = 1;

    @BeforeEach
    void setUp() {
        repository = mock(MatchParticipantRepository.class);
        when(repository.findByBoard("Pool")).thenReturn(stored);
        tournaments = mock(TournamentRepository.class);
        service = new PlayerService(repository, tournaments);
    }

    /** Adds a stored match with the given player names. */
    private void storedMatch(long timestamp, String... names) {
        Match match = new Match();
        match.setId(nextMatchId++);
        match.setTimestamp(timestamp);
        for (String name : names) {
            MatchParticipant p = new MatchParticipant();
            p.setPlayerName(name);
            p.setMatch(match);
            stored.add(p);
        }
    }

    private static MatchParticipant newParticipant(String name) {
        MatchParticipant p = new MatchParticipant();
        p.setPlayerName(name);
        return p;
    }

    @Test
    void cleanAndKeyIgnoreCapitalsAndSpacing() {
        assertEquals("Marcos V", PlayerNames.clean("  Marcos   V "));
        assertEquals(PlayerNames.key("marcos v"), PlayerNames.key(" Marcos  V"));
    }

    @Test
    void canonicalSpellingIsTheMostUsedOne() {
        storedMatch(1, "Marcos", "Sam");
        storedMatch(2, "Marcos", "sam");
        storedMatch(3, "marcos", "Sam");

        Map<String, String> canonical = service.canonicalNames("Pool");

        assertEquals("Marcos", canonical.get("marcos"));
        assertEquals("Sam", canonical.get("sam"));
    }

    @Test
    void canonicalSpellingTieGoesToTheMostRecent() {
        storedMatch(1, "jo", "Sam");
        storedMatch(2, "Jo", "Sam");

        assertEquals("Jo", service.canonicalNames("Pool").get("jo"));
    }

    @Test
    void newMatchNamesJoinExistingPlayers() {
        storedMatch(1, "Marcos", "Priya");
        List<MatchParticipant> incoming = List.of(newParticipant(" marcos "), newParticipant("New  Person"));

        service.applyCanonicalNames("Pool", incoming);

        assertEquals("Marcos", incoming.get(0).getPlayerName());
        assertEquals("New Person", incoming.get(1).getPlayerName());
    }

    @Test
    void samePlayerTwiceInOneMatchIsRejected() {
        List<MatchParticipant> incoming = List.of(newParticipant("Sam"), newParticipant("SAM "));

        ApiException ex = assertThrows(ApiException.class, () -> service.applyCanonicalNames("Pool", incoming));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void renameChangesEveryMatchForThatPlayer() {
        storedMatch(1, "Marc", "Sam");
        storedMatch(2, "marc", "Jo");

        PlayerService.RenameResult result = service.rename("Pool", "Marc", "Marcos");

        assertEquals(new PlayerService.RenameResult("Marcos", false, 2), result);
        assertEquals(2, stored.stream().filter(p -> p.getPlayerName().equals("Marcos")).count());
        verify(repository).saveAll(anyList());
    }

    @Test
    void renamingToAnExistingPlayerMergesThem() {
        storedMatch(1, "Marc", "Sam");
        storedMatch(2, "Marcos", "Jo");

        // Typed in lower case, but merging keeps the existing player's spelling.
        PlayerService.RenameResult result = service.rename("Pool", "marc", "marcos");

        assertTrue(result.merged());
        assertEquals("Marcos", result.name());
        assertEquals(2, result.matchesUpdated());
        assertEquals(2, stored.stream().filter(p -> p.getPlayerName().equals("Marcos")).count());
    }

    @Test
    void fixingCapitalsIsARenameNotAMerge() {
        storedMatch(1, "marcos", "Sam");
        storedMatch(2, "Marcos", "Jo");

        PlayerService.RenameResult result = service.rename("Pool", "Marcos", "Marcos");

        assertFalse(result.merged());
        assertEquals(2, stored.stream().filter(p -> p.getPlayerName().equals("Marcos")).count());
    }

    @Test
    void playersWhoPlayedEachOtherCantBeMerged() {
        storedMatch(1, "Marc", "Marcos");

        ApiException ex = assertThrows(ApiException.class, () -> service.rename("Pool", "Marc", "Marcos"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("once"), ex.getMessage());
        verify(repository, never()).saveAll(anyList());
    }

    @Test
    void renamingAnUnknownPlayerIsNotFound() {
        storedMatch(1, "Marcos", "Sam");

        ApiException ex = assertThrows(ApiException.class, () -> service.rename("Pool", "Nobody", "X"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    void renamesFollowIntoTournamentBrackets() {
        storedMatch(1, "Marc", "Sam");
        Tournament cup = new Tournament();
        cup.setName("Cup");
        cup.setPlayers(new java.util.ArrayList<>(List.of("Sam", "marc", "Jo")));
        when(tournaments.findByLeaderboardNameOrderByCreatedAtDesc("Pool")).thenReturn(List.of(cup));

        service.rename("Pool", "Marc", "Marcos");

        assertEquals(List.of("Sam", "Marcos", "Jo"), cup.getPlayers());
        verify(tournaments).save(cup);
    }

    @Test
    void playersInTheSameTournamentCantBeMerged() {
        storedMatch(1, "Marc", "Sam");
        storedMatch(2, "Marcos", "Jo");
        Tournament cup = new Tournament();
        cup.setName("Cup");
        cup.setPlayers(new java.util.ArrayList<>(List.of("Marc", "Marcos", "Jo")));
        when(tournaments.findByLeaderboardNameOrderByCreatedAtDesc("Pool")).thenReturn(List.of(cup));

        ApiException ex = assertThrows(ApiException.class, () -> service.rename("Pool", "Marc", "Marcos"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertTrue(ex.getMessage().contains("Cup"), ex.getMessage());
        verify(repository, never()).saveAll(anyList());
    }
}
