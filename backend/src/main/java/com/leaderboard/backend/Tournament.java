package com.leaderboard.backend;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/** A knockout tournament on a board. The bracket itself is derived; see {@link Bracket}. */
@Entity
@Table(name = "tournaments")
public class Tournament {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "leaderboard_name")
    private Leaderboard leaderboard;

    @Column(nullable = false, length = 60)
    private String name;

    private long createdAt;

    /** The board season the tournament's games count towards. */
    private int season;

    /** "elo" or "random": how the players were seeded. */
    @Column(length = 10)
    private String seeding;

    /** Players in seed order (index 0 is the top seed). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "tournament_players", joinColumns = @JoinColumn(name = "tournament_id"))
    @OrderColumn(name = "seed_index")
    @Column(name = "player_name", nullable = false)
    private List<String> players = new ArrayList<>();

    @OneToMany(mappedBy = "tournament", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TournamentResult> results = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Leaderboard getLeaderboard() {
        return leaderboard;
    }

    public void setLeaderboard(Leaderboard leaderboard) {
        this.leaderboard = leaderboard;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(long createdAt) {
        this.createdAt = createdAt;
    }

    public int getSeason() {
        return season;
    }

    public void setSeason(int season) {
        this.season = season;
    }

    public String getSeeding() {
        return seeding;
    }

    public void setSeeding(String seeding) {
        this.seeding = seeding;
    }

    public List<String> getPlayers() {
        return players;
    }

    public void setPlayers(List<String> players) {
        this.players = players;
    }

    public List<TournamentResult> getResults() {
        return results;
    }

    public void setResults(List<TournamentResult> results) {
        this.results = results;
    }
}
