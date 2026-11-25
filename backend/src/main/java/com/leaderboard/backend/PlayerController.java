package com.leaderboard.backend;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/leaderboards/{board}/players")
public class PlayerController {

    private final BoardAccess boardAccess;
    private final PlayerService playerService;

    public PlayerController(BoardAccess boardAccess, PlayerService playerService) {
        this.boardAccess = boardAccess;
        this.playerService = playerService;
    }

    public record RenameRequest(
            @NotBlank(message = "Choose a player to rename") String from,
            @NotBlank(message = "Enter the new name")
            @Size(max = 50, message = "Player names must be 50 characters or fewer") String to) {
    }

    /** Renames a player on this board, merging them into another player if the new name is taken. */
    @PostMapping("/rename")
    public PlayerService.RenameResult rename(
            @PathVariable String board,
            @RequestHeader("X-Leaderboard-Password") String password,
            @Valid @RequestBody RenameRequest request) {
        boardAccess.requireWithPassword(board, password);
        return playerService.rename(board, request.from(), request.to());
    }
}
