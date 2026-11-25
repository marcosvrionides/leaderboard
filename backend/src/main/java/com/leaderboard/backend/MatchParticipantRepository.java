package com.leaderboard.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchParticipantRepository extends JpaRepository<MatchParticipant, Long> {

    @Query("select p from MatchParticipant p join fetch p.match m where m.leaderboard.name = :board")
    List<MatchParticipant> findByBoard(@Param("board") String board);
}
