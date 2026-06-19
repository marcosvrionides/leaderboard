package com.leaderboard.backend;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "leaderboards")
public class Leaderboard {

    @Id
    @NotBlank(message = "Leaderboard name is required")
    @Size(max = 100, message = "Leaderboard name must be 100 characters or fewer")
    private String name;

    // Write-only: accepted on the way in (create requests) but never
    // serialized back out in API responses, so it can't leak via GET /api/leaderboards.
    @NotBlank(message = "Password is required")
    @Size(min = 4, message = "Password must be at least 4 characters")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
