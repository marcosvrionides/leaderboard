package com.leaderboard.backend;

import jakarta.persistence.*;

@Entity
@Table(name = "leaderboards")
public class Leaderboard {

    @Id
    private String name;

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