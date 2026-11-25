package com.leaderboard.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {

    List<Tournament> findByLeaderboardNameOrderByCreatedAtDesc(String board);

    Optional<Tournament> findByIdAndLeaderboardName(Long id, String board);

    @Query("select r from TournamentResult r where r.match.id = :matchId")
    Optional<TournamentResult> findResultByMatchId(@Param("matchId") Long matchId);
}
