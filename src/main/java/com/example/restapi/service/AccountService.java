package com.example.restapi.service;

import com.example.restapi.model.Tenant;
import com.example.restapi.repository.TenantRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final TenantRepository tenants;
    private final PasswordEncoder passwordEncoder;

    public AccountService(TenantRepository tenants, PasswordEncoder passwordEncoder) {
        this.tenants = tenants;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void register(String fullName, String phone, String email, String password) {
        String cleanEmail = email == null ? "" : email.trim().toLowerCase();
        if (fullName == null || fullName.isBlank() || phone == null || !phone.matches("[+0-9 .()-]{8,20}")
                || !cleanEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
                || password == null || password.length() < 8) {
            throw new IllegalArgumentException("Vui lòng kiểm tra thông tin; mật khẩu cần ít nhất 8 ký tự.");
        }
        if (tenants.existsByEmailIgnoreCase(cleanEmail)) throw new IllegalArgumentException("Email này đã được đăng ký.");
        Tenant tenant = new Tenant();
        tenant.setFullName(fullName.trim());
        tenant.setPhone(phone.trim());
        tenant.setEmail(cleanEmail);
        tenant.setRole("USER");
        tenant.setAccountType("TENANT");
        tenant.setPasswordHash(passwordEncoder.encode(password));
        tenants.save(tenant);
    }
}
