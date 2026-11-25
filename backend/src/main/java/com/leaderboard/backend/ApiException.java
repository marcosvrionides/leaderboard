package com.leaderboard.backend;

import org.springframework.http.HttpStatus;

/**
 * An error with a message that's safe to show to users. Rendered by
 * {@link ApiExceptionHandler} as {@code {"error": message}} with the given status.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
