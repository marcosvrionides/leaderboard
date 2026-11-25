package com.leaderboard.backend;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Valid
    @Size(min = 2, message = "A match needs at least 2 participants")
    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<MatchParticipant> participants = new ArrayList<>();

    @Size(max = 500, message = "Note must be 500 characters or fewer")
    private String note;

    private long timestamp;

    // The board season this match counts towards; set by the server when the
    // match is saved. Nullable for existing rows, which belong to season 1.
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Integer season;

    @ManyToOne
    @JoinColumn(name = "leaderboardName")
    private Leaderboard leaderboard;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<MatchParticipant> getParticipants() {
        return participants;
    }

    public void setParticipants(List<MatchParticipant> participants) {
        this.participants = participants;
        if (participants != null) {
            for (MatchParticipant p : participants) {
                p.setMatch(this);
            }
        }
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

    public int getSeason() {
        return season == null ? 1 : season;
    }

    public void setSeason(Integer season) {
        this.season = season;
    }

    public Leaderboard getLeaderboard() {
        return leaderboard;
    }

    public void setLeaderboard(Leaderboard leaderboard) {
        this.leaderboard = leaderboard;
    }
}
