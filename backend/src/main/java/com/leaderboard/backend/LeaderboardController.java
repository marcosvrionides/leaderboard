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

    public LeaderboardController(LeaderboardRepository repository, MatchRepository matchRepository,
                                 PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.matchRepository = matchRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Every board with its match count, last game and current leader (no passwords). */
    @GetMapping
    public List<BoardSummary> getAll() {
        Map<String, List<Match>> matchesByBoard = matchRepository.findAllWithParticipants().stream()
                .collect(Collectors.groupingBy(m -> m.getLeaderboard().getName()));
        return repository.findAll().stream()
                .map(board -> BoardSummary.of(board.getName(), matchesByBoard.getOrDefault(board.getName(), List.of())))
                .toList();
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
