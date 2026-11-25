package com.leaderboard.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leaderboards")
public class LeaderboardController {

    private final LeaderboardRepository repository;
    private final MatchRepository matchRepository;
    private final PasswordEncoder passwordEncoder;
    private final BoardAccess boardAccess;
    private final BoardDeletionService boardDeletion;

    public LeaderboardController(LeaderboardRepository repository, MatchRepository matchRepository,
                                 PasswordEncoder passwordEncoder, BoardAccess boardAccess,
                                 BoardDeletionService boardDeletion) {
        this.repository = repository;
        this.matchRepository = matchRepository;
        this.passwordEncoder = passwordEncoder;
        this.boardAccess = boardAccess;
        this.boardDeletion = boardDeletion;
    }

    /**
     * Every listed board with its match count, last game and current leader
     * (no passwords). Unlisted boards are left out unless named in
     * {@code include} - knowing the exact name is the same as having the
     * link, so this lets people see unlisted boards they've favourited.
     */
    @GetMapping
    public List<BoardSummary> getAll(@RequestParam(required = false) List<String> include) {
        Set<String> wanted = include == null ? Set.of() : new HashSet<>(include);
        Map<String, List<Match>> matchesByBoard = matchRepository.findAllWithParticipants().stream()
                .collect(Collectors.groupingBy(m -> m.getLeaderboard().getName()));
        return repository.findAll().stream()
                .filter(board -> !board.isUnlisted() || wanted.contains(board.getName()))
                .map(board -> BoardSummary.of(board, matchesByBoard.getOrDefault(board.getName(), List.of())))
                .toList();
    }

    public record VisibilityRequest(boolean unlisted) {
    }

    /** Lists or unlists a board. */
    @PutMapping("/{name}/visibility")
    public BoardDetails setVisibility(
            @PathVariable String name,
            @RequestHeader("X-Leaderboard-Password") String password,
            @RequestBody VisibilityRequest request) {
        Leaderboard board = boardAccess.requireWithPassword(name, password);
        board.setUnlisted(request.unlisted());
        return BoardDetails.of(repository.save(board));
    }

    @GetMapping("/{name}")
    public BoardDetails get(@PathVariable String name) {
        return BoardDetails.of(boardAccess.require(name));
    }

    /**
     * Ends the current season and starts the next one. Past matches are kept
     * (each remembers its season); ratings for the new season start from 1000.
     */
    @PostMapping("/{name}/seasons")
    public BoardDetails startNewSeason(
            @PathVariable String name,
            @RequestHeader("X-Leaderboard-Password") String password) {
        Leaderboard board = boardAccess.requireWithPassword(name, password);
        int season = board.getCurrentSeason();
        boolean played = matchRepository.findByLeaderboardName(name).stream().anyMatch(m -> m.getSeason() == season);
        if (!played) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Season " + season + " hasn't had any games yet, so there's nothing to finish.");
        }
        board.setCurrentSeason(season + 1);
        board.setCurrentSeasonStartedAt(System.currentTimeMillis());
        return BoardDetails.of(repository.save(board));
    }

    @PostMapping
    public Leaderboard create(@Valid @RequestBody Leaderboard leaderboard) {
        if (repository.existsById(leaderboard.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A leaderboard named '" + leaderboard.getName() + "' already exists");
        }
        leaderboard.setPassword(passwordEncoder.encode(leaderboard.getPassword()));
        return repository.save(leaderboard);
    }

    /** Permanently deletes a board with all of its games (every season) and tournaments. */
    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestHeader("X-Leaderboard-Password") String password) {
        boardDeletion.delete(boardAccess.requireWithPassword(name, password));
        return ResponseEntity.noContent().build();
    }
}
