package com.leaderboard.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboards/{board}/tournaments")
public class TournamentController {

    private final BoardAccess boardAccess;
    private final TournamentService service;

    public TournamentController(BoardAccess boardAccess, TournamentService service) {
        this.boardAccess = boardAccess;
        this.service = service;
    }

    @GetMapping
    public List<TournamentService.TournamentSummary> list(@PathVariable String board) {
        boardAccess.require(board);
        return service.list(board);
    }

    @GetMapping("/{id}")
    public TournamentService.TournamentView get(@PathVariable String board, @PathVariable long id) {
        return service.get(board, id);
    }

    @PostMapping
    public TournamentService.TournamentView create(
            @PathVariable String board,
            @RequestHeader("X-Leaderboard-Password") String password,
            @RequestBody TournamentService.CreateRequest request) {
        return service.create(boardAccess.requireWithPassword(board, password), request);
    }

    public record ResultRequest(int scoreA, int scoreB) {
    }

    /** Records the result of one bracket match (round from 1, slot from 0). */
    @PostMapping("/{id}/rounds/{round}/slots/{slot}")
    public TournamentService.TournamentView record(
            @PathVariable String board,
            @PathVariable long id,
            @PathVariable int round,
            @PathVariable int slot,
            @RequestHeader("X-Leaderboard-Password") String password,
            @RequestBody ResultRequest request) {
        return service.record(boardAccess.requireWithPassword(board, password), id, round, slot,
                request.scoreA(), request.scoreB());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String board,
            @PathVariable long id,
            @RequestHeader("X-Leaderboard-Password") String password) {
        boardAccess.requireWithPassword(board, password);
        service.delete(board, id);
        return ResponseEntity.noContent().build();
    }
}
