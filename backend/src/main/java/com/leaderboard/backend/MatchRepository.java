package com.leaderboard.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {
    List<Match> findByLeaderboardName(String name);

    /** Every match with its board and players, in one query (for board summaries). */
    @Query("select distinct m from Match m join fetch m.leaderboard left join fetch m.participants")
    List<Match> findAllWithParticipants();
}