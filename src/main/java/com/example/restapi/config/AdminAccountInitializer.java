package com.example.restapi.config;

import com.example.restapi.model.Tenant;
import com.example.restapi.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminAccountInitializer implements CommandLineRunner {
    private final TenantRepository tenants;
    private final PasswordEncoder encoder;
    @Value("${app.admin.email:admin@trotot.local}") private String email;
    @Value("${app.admin.password:Admin@12345}") private String password;
    @Value("${app.demo.password:Demo@12345}") private String demoPassword;

    public AdminAccountInitializer(TenantRepository tenants, PasswordEncoder encoder) {
        this.tenants = tenants;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        Tenant admin = tenants.findByEmailIgnoreCase(email).orElseGet(Tenant::new);
        if (admin.getId() == 0) {
            admin.setFullName("Quản trị viên");
            admin.setPhone("0000000000");
            admin.setEmail(email);
        }
        admin.setRole("ADMIN");
        if (admin.getPasswordHash() == null || admin.getPasswordHash().isBlank()) admin.setPasswordHash(encoder.encode(password));
        tenants.save(admin);
        tenants.findAll().stream().filter(account -> !"ADMIN".equalsIgnoreCase(account.getRole()))
                .filter(account -> account.getPasswordHash() == null || account.getPasswordHash().isBlank())
                .forEach(account -> account.setPasswordHash(encoder.encode(demoPassword)));
        tenants.flush();
    }
}
