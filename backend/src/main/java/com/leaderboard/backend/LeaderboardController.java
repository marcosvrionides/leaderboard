package com.leaderboard.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/leaderboards")
public class LeaderboardController {

    private final LeaderboardRepository repository;

    public LeaderboardController(LeaderboardRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Leaderboard> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Leaderboard create(@RequestBody Leaderboard leaderboard) {
        return repository.save(leaderboard);
    }

    @DeleteMapping("/all")
    public void deleteAll() {
        repository.deleteAll();
    }
}