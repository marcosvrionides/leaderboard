package com.leaderboard.backend;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchRepository matchRepository;
    private final LeaderboardRepository leaderboardRepository;
    private final PasswordEncoder passwordEncoder;

    public MatchController(MatchRepository matchRepository,
                            LeaderboardRepository leaderboardRepository,
                            PasswordEncoder passwordEncoder) {
        this.matchRepository = matchRepository;
        this.leaderboardRepository = leaderboardRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<Match> getAll() {
        return matchRepository.findAll();
    }

    @GetMapping("/leaderboard/{leaderboardName}")
    public List<Match> getByLeaderboard(@PathVariable String leaderboardName) {
        return matchRepository.findByLeaderboardName(leaderboardName);
    }

    @PostMapping
    public Match create(
            @Valid @RequestBody Match match,
            @RequestHeader("X-Leaderboard-Password") String password) {
        if (match.getLeaderboard() == null || match.getLeaderboard().getName() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A target leaderboard is required");
        }

        String leaderboardName = match.getLeaderboard().getName();
        Leaderboard leaderboard = leaderboardRepository.findById(leaderboardName)
                .orElseThrow(() -> new LeaderboardNotFoundException(leaderboardName));

        if (!passwordEncoder.matches(password, leaderboard.getPassword())) {
            throw new InvalidLeaderboardPasswordException();
        }

        // Attach the managed entity (rather than the transient one deserialized
        // from the request body) so the relationship persists correctly.
        match.setLeaderboard(leaderboard);
        return matchRepository.save(match);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestHeader("X-Leaderboard-Password") String password) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No match found with id: " + id));

        if (!passwordEncoder.matches(password, match.getLeaderboard().getPassword())) {
            throw new InvalidLeaderboardPasswordException();
        }

        matchRepository.delete(match);
        return ResponseEntity.noContent().build();
    }
}
