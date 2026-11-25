package com.leaderboard.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LeaderboardControllerTests {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private LeaderboardRepository boards;
    private MockMvc mvc;
    private Leaderboard secret;

    private Leaderboard board(String name, boolean unlisted) {
        Leaderboard b = new Leaderboard();
        b.setName(name);
        b.setPassword(encoder.encode("pass1234"));
        b.setUnlisted(unlisted ? true : null);
        return b;
    }

    @BeforeEach
    void setUp() {
        boards = mock(LeaderboardRepository.class);
        MatchRepository matches = mock(MatchRepository.class);
        secret = board("Secret", true);
        when(boards.findAll()).thenReturn(List.of(board("Public", false), secret));
        when(boards.findById("Secret")).thenReturn(Optional.of(secret));
        when(boards.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(matches.findAllWithParticipants()).thenReturn(List.of());
        LeaderboardController controller = new LeaderboardController(
                boards, matches, encoder, new BoardAccess(boards, encoder));
        mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new ApiExceptionHandler()).build();
    }

    @Test
    void unlistedBoardsAreLeftOutOfTheList() throws Exception {
        mvc.perform(get("/api/leaderboards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Public")))
                .andExpect(content().string(not(containsString("password"))));
    }

    @Test
    void unlistedBoardsCanBeIncludedByExactName() throws Exception {
        mvc.perform(get("/api/leaderboards").param("include", "Secret"))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Public", "Secret")))
                .andExpect(jsonPath("$[1].unlisted", is(true)));
        mvc.perform(get("/api/leaderboards").param("include", "secret"))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Public")));
    }

    @Test
    void unlistedBoardsCanStillBeOpenedDirectly() throws Exception {
        mvc.perform(get("/api/leaderboards/Secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unlisted", is(true)))
                .andExpect(jsonPath("$.currentSeason", is(1)));
    }

    @Test
    void changingVisibilityNeedsThePassword() throws Exception {
        mvc.perform(put("/api/leaderboards/Secret/visibility")
                        .header("X-Leaderboard-Password", "wrong")
                        .contentType("application/json").content("{\"unlisted\":false}"))
                .andExpect(status().isForbidden());
        verify(boards, never()).save(any());

        mvc.perform(put("/api/leaderboards/Secret/visibility")
                        .header("X-Leaderboard-Password", "pass1234")
                        .contentType("application/json").content("{\"unlisted\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unlisted", is(false)));
    }
}
