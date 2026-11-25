package com.leaderboard.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * Share links for boards. The frontend is a static single-page app, so chat
 * apps that build link previews (WhatsApp, iMessage, Slack...) can't read its
 * pages. This serves a tiny HTML page with Open Graph tags describing the
 * board and its leader, and sends real visitors straight on to the board.
 */
@RestController
public class ShareController {

    private final LeaderboardRepository leaderboards;
    private final MatchRepository matches;
    private final List<String> allowedOrigins;

    public ShareController(LeaderboardRepository leaderboards, MatchRepository matches,
                           @Value("${app.cors.allowed-origins:http://localhost:3000}") String allowedOrigins) {
        this.leaderboards = leaderboards;
        this.matches = matches;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split("\\s*,\\s*"))
                .map(o -> o.replaceAll("/+$", ""))
                .filter(o -> !o.isBlank())
                .toList();
    }

    /**
     * Where to send visitors: the site the link was made on, if it's one of
     * the configured frontend origins (so this can't be used to redirect
     * people elsewhere), otherwise the first configured origin.
     */
    String frontendOrigin(String from) {
        String requested = from == null ? null : from.replaceAll("/+$", "");
        return allowedOrigins.contains(requested) ? requested : allowedOrigins.get(0);
    }

    private static final MediaType HTML = new MediaType("text", "html", StandardCharsets.UTF_8);

    @GetMapping(value = "/share/{board}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> share(@PathVariable String board, @RequestParam(required = false) String from) {
        String origin = frontendOrigin(from);
        Leaderboard leaderboard = leaderboards.findById(board).orElse(null);
        if (leaderboard == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(HTML)
                    .body(page("Leaderboards", "Track scores and Elo ratings with your friends.", origin + "/", origin));
        }
        BoardSummary summary = BoardSummary.of(leaderboard, matches.findByLeaderboardName(board));
        String target = origin + "/leaderboard/" + UriUtils.encodePathSegment(board, StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(HTML)
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(page(board + " · Leaderboard", describe(summary), target, origin));
    }

    static String describe(BoardSummary s) {
        String season = s.season() > 1 ? "Season " + s.season() + ": " : "";
        if (s.matchCount() == 0) {
            return s.season() > 1
                    ? "Season " + s.season() + " has just started. Join in and get on the board!"
                    : "No games yet. Join in and get on the board!";
        }
        return String.format("%s%s leads with %d Elo · %d %s · %d players", season,
                s.leader(), s.leaderRating(), s.matchCount(), s.matchCount() == 1 ? "match" : "matches",
                s.playerCount());
    }

    // Every interpolated value is HTML-escaped; board names are user input.
    private static String page(String title, String description, String target, String origin) {
        String t = HtmlUtils.htmlEscape(title, "UTF-8");
        String d = HtmlUtils.htmlEscape(description, "UTF-8");
        String u = HtmlUtils.htmlEscape(target, "UTF-8");
        String image = HtmlUtils.htmlEscape(origin + "/og-image.png", "UTF-8");
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="utf-8">
                <title>%1$s</title>
                <meta name="description" content="%2$s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="Leaderboards">
                <meta property="og:title" content="%1$s">
                <meta property="og:description" content="%2$s">
                <meta property="og:url" content="%3$s">
                <meta property="og:image" content="%4$s">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="%1$s">
                <meta name="twitter:description" content="%2$s">
                <meta name="twitter:image" content="%4$s">
                <link rel="canonical" href="%3$s">
                <meta http-equiv="refresh" content="0; url=%3$s">
                </head>
                <body>
                <p><a href="%3$s">Open %1$s</a></p>
                <script>location.replace(document.querySelector('link[rel=canonical]').href);</script>
                </body>
                </html>
                """.formatted(t, d, u, image);
    }
}
