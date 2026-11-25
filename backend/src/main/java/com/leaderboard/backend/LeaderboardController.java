package com.leaderboard.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/leaderboards")
public class LeaderboardController {

    private final LeaderboardRepository repository;
    private final MatchRepository matchRepository;
    private final PasswordEncoder passwordEncoder;
    private final BoardAccess boardAccess;

    public LeaderboardController(LeaderboardRepository repository, MatchRepository matchRepository,
                                 PasswordEncoder passwordEncoder, BoardAccess boardAccess) {
        this.repository = repository;
        this.matchRepository = matchRepository;
        this.passwordEncoder = passwordEncoder;
        this.boardAccess = boardAccess;
    }

    /** Every board with its match count, last game and current leader (no passwords). */
    @GetMapping
    public List<BoardSummary> getAll() {
        Map<String, List<Match>> matchesByBoard = matchRepository.findAllWithParticipants().stream()
                .collect(Collectors.groupingBy(m -> m.getLeaderboard().getName()));
        return repository.findAll().stream()
                .map(board -> BoardSummary.of(board, matchesByBoard.getOrDefault(board.getName(), List.of())))
                .toList();
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

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> delete(
            @PathVariable String name,
            @RequestHeader("X-Leaderboard-Password") String password) {
        Leaderboard leaderboard = repository.findById(name)
                .orElseThrow(() -> new LeaderboardNotFoundException(name));

        if (!passwordEncoder.matches(password, leaderboard.getPassword())) {
            throw new InvalidLeaderboardPasswordException();
        }

        repository.delete(leaderboard);
        return ResponseEntity.noContent().build();
    }
}
