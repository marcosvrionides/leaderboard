package com.leaderboard.backend;

import jakarta.persistence.*;

@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String player1Name;
    private String player2Name;
    private int player1GamesWon;
    private int player2GamesWon;
    private String note;
    private long timestamp;

    @ManyToOne
    @JoinColumn(name = "leaderboardName")
    private Leaderboard leaderboard;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPlayer1Name() {
        return player1Name;
    }

    public void setPlayer1Name(String player1Name) {
        this.player1Name = player1Name;
    }

    public String getPlayer2Name() {
        return player2Name;
    }

    public void setPlayer2Name(String player2Name) {
        this.player2Name = player2Name;
    }

    public int getPlayer1GamesWon() {
        return player1GamesWon;
    }

    public void setPlayer1GamesWon(int player1GamesWon) {
        this.player1GamesWon = player1GamesWon;
    }

    public int getPlayer2GamesWon() {
        return player2GamesWon;
    }

    public void setPlayer2GamesWon(int player2GamesWon) {
        this.player2GamesWon = player2GamesWon;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public Leaderboard getLeaderboard() {
        return leaderboard;
    }

    public void setLeaderboard(Leaderboard leaderboard) {
        this.leaderboard = leaderboard;
    }
}