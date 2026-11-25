package com.leaderboard.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ShareControllerTests {

    private LeaderboardRepository leaderboards;
    private MatchRepository matches;
    private ShareController controller;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        leaderboards = mock(LeaderboardRepository.class);
        matches = mock(MatchRepository.class);
        controller = new ShareController(leaderboards, matches, "https://scores.example, http://localhost:3000/");
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    private static Leaderboard board(String name) {
        Leaderboard board = new Leaderboard();
        board.setName(name);
        return board;
    }

    @Test
    void laterSeasonsAreNamedInThePreview() {
        Leaderboard board = board("Pool");
        board.setCurrentSeason(2);
        Match old = match("A", 3, "B", 0);
        Match current = match("B", 3, "A", 1);
        current.setSeason(2);
        BoardSummary s = BoardSummary.of(board, List.of(old, current));
        assertEquals("Season 2: B leads with 1016 Elo · 1 match · 2 players", ShareController.describe(s));
    }

    private static Match match(String a, int sa, String b, int sb) {
        Match m = new Match();
        m.setId(1L);
        m.setTimestamp(1);
        MatchParticipant pa = new MatchParticipant();
        pa.setPlayerName(a);
        pa.setGamesWon(sa);
        MatchParticipant pb = new MatchParticipant();
        pb.setPlayerName(b);
        pb.setGamesWon(sb);
        m.setParticipants(List.of(pa, pb));
        return m;
    }

    @Test
    void onlyConfiguredOriginsAreRedirectedTo() {
        assertEquals("http://localhost:3000", controller.frontendOrigin("http://localhost:3000"));
        assertEquals("https://scores.example", controller.frontendOrigin("https://evil.example"));
        assertEquals("https://scores.example", controller.frontendOrigin(null));
    }

    @Test
    void sharePageDescribesTheBoardAndRedirects() throws Exception {
        when(leaderboards.findById("Office Pool")).thenReturn(Optional.of(board("Office Pool")));
        when(matches.findByLeaderboardName("Office Pool")).thenReturn(List.of(match("Priya", 3, "Sam", 1)));

        mvc.perform(get("/share/{board}", "Office Pool").param("from", "http://localhost:3000"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/html;charset=UTF-8"))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:title\" content=\"Office Pool · Leaderboard\">")))
                .andExpect(content().string(containsString("Priya leads with 1016 Elo · 1 match · 2 players")))
                .andExpect(content().string(containsString(
                        "http-equiv=\"refresh\" content=\"0; url=http://localhost:3000/leaderboard/Office%20Pool\"")))
                .andExpect(content().string(containsString("http://localhost:3000/og-image.png")));
    }

    @Test
    void boardNamesAreEscaped() throws Exception {
        String evil = "<script>alert(1)<\\script>\"";
        when(leaderboards.findById(evil)).thenReturn(Optional.of(board(evil)));
        when(matches.findByLeaderboardName(evil)).thenReturn(List.of());

        mvc.perform(get("/share/{board}", evil))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("<script>alert"))))
                .andExpect(content().string(containsString("&lt;script&gt;alert(1)&lt;\\script&gt;&quot;")))
                .andExpect(content().string(containsString("No games yet")));
    }

    @Test
    void unknownBoardGoesToTheHomePage() throws Exception {
        when(leaderboards.findById("Nope")).thenReturn(Optional.empty());

        mvc.perform(get("/share/{board}", "Nope"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("url=https://scores.example/\"")));
    }
}
