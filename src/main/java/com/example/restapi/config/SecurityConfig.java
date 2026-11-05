package com.example.restapi.config;

import com.example.restapi.repository.TenantRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    UserDetailsService userDetailsService(TenantRepository tenants) {
        return email -> tenants.findByEmailIgnoreCase(email.trim())
                .map(account -> User.withUsername(account.getEmail())
                        .password(account.getPasswordHash())
                        .roles(account.getAuthorizationRole())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản."));
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/register", "/error", "/css/**", "/js/**", "/images/**", "/uploads/**", "/favicon.ico").permitAll()
                .requestMatchers("/room/new", "/room/*/edit", "/room/*/delete").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/room/*").permitAll()
                .requestMatchers("/admin", "/admin/**").hasRole("ADMIN")
                .requestMatchers("/manage/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/my-requests").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/room/*/book").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/booking/*/status").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/booking/*/payment").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/rooms").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/rooms/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/rooms/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/rooms/owner/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/rooms/**").permitAll()
                .requestMatchers("/api/rooms").permitAll()
                .requestMatchers("/api/tenants/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/bookings").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/bookings/lookup").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/bookings/owner/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/bookings/*/status").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/bookings/*/payment").hasRole("ADMIN")
                .requestMatchers("/api/bookings/**").hasRole("ADMIN")
                // Các endpoint REST mẫu còn lại không thuộc luồng thuê phòng; không cho tài khoản USER truy cập dữ liệu nội bộ.
                .requestMatchers("/api/tenants/**", "/api/customers/**", "/api/orders/**", "/api/order-details/**",
                        "/api/products/**", "/api/categories/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .formLogin(form -> form.loginPage("/login").usernameParameter("email")
                    .successHandler((request, response, authentication) -> {
                        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                        boolean owner = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OWNER"));
                        response.sendRedirect(admin ? "/admin" : owner ? "/manage" : "/");
                    }).permitAll())
            .logout(logout -> logout.logoutSuccessUrl("/?logout=1").permitAll())
            .exceptionHandling(errors -> errors.accessDeniedPage("/access-denied"));
        return http.build();
    }
}
