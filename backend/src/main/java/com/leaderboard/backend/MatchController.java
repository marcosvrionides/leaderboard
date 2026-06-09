package com.leaderboard.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final MatchRepository repository;

    public MatchController(MatchRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Match> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Match create(@RequestBody Match match) {
        return repository.save(match);
    }

    @GetMapping("/leaderboard/{leaderboardName}")
    public List<Match> getByLeaderboard(@PathVariable String leaderboardName) {
        return repository.findByLeaderboardName(leaderboardName);
    }

    @DeleteMapping("/all")
    public void deleteAll() {
        repository.deleteAll();
    }
}