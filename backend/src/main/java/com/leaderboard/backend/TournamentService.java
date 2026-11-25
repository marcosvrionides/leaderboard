package com.leaderboard.backend;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TournamentService {

    public static final int MIN_PLAYERS = 3;
    public static final int MAX_PLAYERS = 32;

    private final TournamentRepository tournaments;
    private final MatchRepository matches;
    private final MatchParticipantRepository participants;
    private final SecureRandom random = new SecureRandom();

    public TournamentService(TournamentRepository tournaments, MatchRepository matches,
                             MatchParticipantRepository participants) {
        this.tournaments = tournaments;
        this.matches = matches;
        this.participants = participants;
    }

    // ── Views returned by the API ─────────────────────────────────────────

    public record SlotView(int round, int slot, String a, String b, Integer seedA, Integer seedB,
                           String winner, String state, Long matchId, Integer scoreA, Integer scoreB,
                           boolean canUndo) {
    }

    public record RoundView(int round, String name, List<SlotView> slots) {
    }

    public record TournamentView(long id, String name, long createdAt, int season, String seeding,
                                 List<String> players, List<RoundView> rounds, String champion) {
    }

    public record TournamentSummary(long id, String name, long createdAt, int season, int playerCount,
                                    String champion, int played, int total) {
    }

    public record CreateRequest(String name, List<String> players, String seeding) {
    }

    // ── Queries ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TournamentSummary> list(String board) {
        return tournaments.findByLeaderboardNameOrderByCreatedAtDesc(board).stream().map(t -> {
            List<List<Bracket.Slot>> rounds = bracket(t);
            int total = 0;
            int played = 0;
            for (List<Bracket.Slot> round : rounds) {
                for (Bracket.Slot s : round) {
                    if (s.state() != Bracket.State.BYE) {
                        total++;
                        if (s.state() == Bracket.State.PLAYED) {
                            played++;
                        }
                    }
                }
            }
            return new TournamentSummary(t.getId(), t.getName(), t.getCreatedAt(), t.getSeason(),
                    t.getPlayers().size(), Bracket.champion(rounds), played, total);
        }).toList();
    }

    @Transactional(readOnly = true)
    public TournamentView get(String board, long id) {
        return view(require(board, id));
    }

    // ── Changes ──────────────────────────────────────────────────────────

    @Transactional
    public TournamentView create(Leaderboard board, CreateRequest request) {
        String name = PlayerNames.clean(request.name());
        if (name == null || name.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Give the tournament a name.");
        }
        if (name.length() > 60) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tournament names must be 60 characters or fewer.");
        }
        List<String> requested = request.players() == null ? List.of() : request.players();
        if (requested.size() < MIN_PLAYERS || requested.size() > MAX_PLAYERS) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A tournament needs between " + MIN_PLAYERS + " and " + MAX_PLAYERS + " players.");
        }

        // Use existing players' spellings, and reject duplicates.
        Map<String, String> canonical = PlayerNames.canonicalSpellings(participants.findByBoard(board.getName()));
        Set<String> seen = new HashSet<>();
        List<String> players = new ArrayList<>();
        for (String raw : requested) {
            String cleaned = PlayerNames.clean(raw);
            if (cleaned == null || cleaned.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Player names can't be blank.");
            }
            if (cleaned.length() > 50) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Player names must be 50 characters or fewer.");
            }
            String key = PlayerNames.key(cleaned);
            if (!seen.add(key)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "'" + cleaned + "' is in the list twice.");
            }
            players.add(canonical.getOrDefault(key, cleaned));
        }

        String seeding = "random".equals(request.seeding()) ? "random" : "elo";
        if (seeding.equals("random")) {
            Collections.shuffle(players, random);
        } else {
            players = seedByElo(board, players);
        }

        Tournament t = new Tournament();
        t.setLeaderboard(board);
        t.setName(name);
        t.setCreatedAt(System.currentTimeMillis());
        t.setSeason(board.getCurrentSeason());
        t.setSeeding(seeding);
        t.setPlayers(players);
        return view(tournaments.save(t));
    }

    /** Best current-season Elo first; players without games this season after them, alphabetically. */
    private List<String> seedByElo(Leaderboard board, List<String> players) {
        int season = board.getCurrentSeason();
        List<Match> seasonMatches = matches.findByLeaderboardName(board.getName()).stream()
                .filter(m -> m.getSeason() == season).toList();
        Map<String, Integer> rank = new HashMap<>();
        List<Elo.Standing> standings = Elo.standings(seasonMatches);
        for (int i = 0; i < standings.size(); i++) {
            rank.put(PlayerNames.key(standings.get(i).player()), i);
        }
        List<String> seeded = new ArrayList<>(players);
        seeded.sort((x, y) -> {
            int rx = rank.getOrDefault(PlayerNames.key(x), Integer.MAX_VALUE);
            int ry = rank.getOrDefault(PlayerNames.key(y), Integer.MAX_VALUE);
            return rx != ry ? Integer.compare(rx, ry) : x.compareToIgnoreCase(y);
        });
        return seeded;
    }

    /**
     * Records a bracket match: saves it as a normal match on the board
     * (current season, so it counts towards Elo) and advances the winner.
     */
    @Transactional
    public TournamentView record(Leaderboard board, long id, int round, int slot, int scoreA, int scoreB) {
        Tournament t = require(board.getName(), id);
        Bracket.Slot s = findSlot(bracket(t), round, slot);
        if (s.state() == Bracket.State.PLAYED) {
            throw new ApiException(HttpStatus.CONFLICT, "That match already has a result.");
        }
        if (s.state() != Bracket.State.READY) {
            throw new ApiException(HttpStatus.CONFLICT, "Both players for that match aren't known yet.");
        }
        if (scoreA < 0 || scoreB < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Scores can't be negative.");
        }
        if (scoreA == scoreB) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "It's a knockout, so someone has to win: scores can't be level.");
        }

        Match match = new Match();
        match.setLeaderboard(board);
        match.setSeason(board.getCurrentSeason());
        match.setTimestamp(System.currentTimeMillis());
        int totalRounds = Bracket.rounds(t.getPlayers().size());
        match.setNote(t.getName() + " · " + Bracket.roundName(round, totalRounds));
        match.setParticipants(new ArrayList<>(List.of(participant(s.a(), scoreA), participant(s.b(), scoreB))));
        Match saved = matches.save(match);

        TournamentResult result = new TournamentResult();
        result.setTournament(t);
        result.setRound(round);
        result.setSlot(slot);
        result.setWinnerSide(scoreA > scoreB ? "A" : "B");
        result.setScoreA(scoreA);
        result.setScoreB(scoreB);
        result.setMatch(saved);
        t.getResults().add(result);
        return view(tournaments.save(t));
    }

    private static MatchParticipant participant(String name, int score) {
        MatchParticipant p = new MatchParticipant();
        p.setPlayerName(name);
        p.setGamesWon(score);
        return p;
    }

    /**
     * Called before a match is deleted. If it was a tournament game, its
     * result is removed too - unless the winner has already played their
     * next round, in which case the deletion is refused.
     */
    @Transactional
    public void beforeMatchDelete(Match match) {
        tournaments.findResultByMatchId(match.getId()).ifPresent(result -> {
            Tournament t = result.getTournament();
            if (!canUndo(t, result.getRound(), result.getSlot())) {
                throw new ApiException(HttpStatus.CONFLICT, "This game is part of the " + t.getName()
                        + " tournament and the winner has already played the next round. "
                        + "Undo the later round first.");
            }
            t.getResults().remove(result);
            tournaments.saveAndFlush(t);
        });
    }

    /** Deletes a tournament. Its games stay in the match history (they were real games). */
    @Transactional
    public void delete(String board, long id) {
        tournaments.delete(require(board, id));
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Tournament require(String board, long id) {
        return tournaments.findByIdAndLeaderboardName(id, board)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That tournament doesn't exist."));
    }

    private static Map<String, Bracket.Result> results(Tournament t) {
        Map<String, Bracket.Result> map = new HashMap<>();
        for (TournamentResult r : t.getResults()) {
            map.put(Bracket.key(r.getRound(), r.getSlot()),
                    new Bracket.Result(r.getWinnerSide(), r.getMatch().getId(), r.getScoreA(), r.getScoreB()));
        }
        return map;
    }

    private static List<List<Bracket.Slot>> bracket(Tournament t) {
        return Bracket.build(t.getPlayers(), results(t));
    }

    private static Bracket.Slot findSlot(List<List<Bracket.Slot>> rounds, int round, int slot) {
        if (round < 1 || round > rounds.size() || slot < 0 || slot >= rounds.get(round - 1).size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "That match isn't in this bracket.");
        }
        return rounds.get(round - 1).get(slot);
    }

    /** A result can be undone while the next-round match it feeds hasn't been played. */
    private static boolean canUndo(Tournament t, int round, int slot) {
        int totalRounds = Bracket.rounds(t.getPlayers().size());
        if (round == totalRounds) {
            return true;
        }
        String next = Bracket.key(round + 1, slot / 2);
        return t.getResults().stream().noneMatch(r -> Bracket.key(r.getRound(), r.getSlot()).equals(next));
    }

    private TournamentView view(Tournament t) {
        List<List<Bracket.Slot>> rounds = bracket(t);
        List<RoundView> views = new ArrayList<>();
        for (int r = 0; r < rounds.size(); r++) {
            List<SlotView> slots = new ArrayList<>();
            for (Bracket.Slot s : rounds.get(r)) {
                slots.add(new SlotView(s.round(), s.slot(), s.a(), s.b(), s.seedA(), s.seedB(), s.winner(),
                        s.state().name().toLowerCase(), s.matchId(), s.scoreA(), s.scoreB(),
                        s.state() == Bracket.State.PLAYED && canUndo(t, s.round(), s.slot())));
            }
            views.add(new RoundView(r + 1, Bracket.roundName(r + 1, rounds.size()), slots));
        }
        return new TournamentView(t.getId(), t.getName(), t.getCreatedAt(), t.getSeason(), t.getSeeding(),
                t.getPlayers(), views, Bracket.champion(rounds));
    }
}
