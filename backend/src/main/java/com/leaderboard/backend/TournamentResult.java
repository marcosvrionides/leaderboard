package com.leaderboard.backend;

import jakarta.persistence.*;

/**
 * The result of one bracket match. The game itself is an ordinary
 * {@link Match} (so it counts towards Elo and shows in the history); this
 * links it to its place in the bracket.
 */
@Entity
@Table(name = "tournament_results",
        uniqueConstraints = @UniqueConstraint(columnNames = {"tournament_id", "round_number", "slot_number"}))
public class TournamentResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tournament_id")
    private Tournament tournament;

    @Column(name = "round_number", nullable = false)
    private int round;

    @Column(name = "slot_number", nullable = false)
    private int slot;

    /** "A" (the upper player in the bracket) or "B". Stored as a side, not a name, so renames just work. */
    @Column(name = "winner_side", nullable = false, length = 1)
    private String winnerSide;

    @Column(name = "score_a", nullable = false)
    private int scoreA;

    @Column(name = "score_b", nullable = false)
    private int scoreB;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id")
    private Match match;

    public Long getId() {
        return id;
    }

    public Tournament getTournament() {
        return tournament;
    }

    public void setTournament(Tournament tournament) {
        this.tournament = tournament;
    }

    public int getRound() {
        return round;
    }

    public void setRound(int round) {
        this.round = round;
    }

    public int getSlot() {
        return slot;
    }

    public void setSlot(int slot) {
        this.slot = slot;
    }

    public String getWinnerSide() {
        return winnerSide;
    }

    public void setWinnerSide(String winnerSide) {
        this.winnerSide = winnerSide;
    }

    public int getScoreA() {
        return scoreA;
    }

    public void setScoreA(int scoreA) {
        this.scoreA = scoreA;
    }

    public int getScoreB() {
        return scoreB;
    }

    public void setScoreB(int scoreB) {
        this.scoreB = scoreB;
    }

    public Match getMatch() {
        return match;
    }

    public void setMatch(Match match) {
        this.match = match;
    }
}
