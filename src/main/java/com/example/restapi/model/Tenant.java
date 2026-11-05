package com.example.restapi.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String fullName;
    private String phone;
    @Column(name = "email", nullable = false, unique = true, length = 190)
    private String email;
    @Enumerated(EnumType.STRING)
    @Column(name = "role", columnDefinition = "ENUM('ADMIN','USER')", nullable = false)
    private AccountRole role = AccountRole.USER;
    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", columnDefinition = "ENUM('TENANT','OWNER')")
    private AccountType accountType;
    @JsonIgnore
    @Column(name = "password_hash")
    private String passwordHash;

    public Tenant() {
    }

    public Tenant(int id, String fullName, String phone, String email, String role) {
        this.id = id;
        this.fullName = fullName;
        this.phone = phone;
        this.email = email;
        setRole(role);
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role == null ? null : role.name(); }
    public void setRole(String role) {
        this.role = role == null ? null : AccountRole.valueOf(role.trim().toUpperCase());
    }
    public String getAccountType() { return accountType == null ? null : accountType.name(); }
    public void setAccountType(String accountType) {
        this.accountType = accountType == null || accountType.isBlank()
                ? null : AccountType.valueOf(accountType.trim().toUpperCase());
    }
    public String getAuthorizationRole() {
        return role == null ? AccountRole.USER.name() : role.name();
    }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
}
