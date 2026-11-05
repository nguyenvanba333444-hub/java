package com.example.restapi.repository;

import com.example.restapi.model.Tenant;
import com.example.restapi.model.AccountType;
import com.example.restapi.model.AccountRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TenantRepository extends JpaRepository<Tenant, Integer> {

    List<Tenant> findByAccountType(AccountType accountType);
    List<Tenant> findByRole(AccountRole role);
    Page<Tenant> findByAccountType(AccountType accountType, Pageable pageable);
    Page<Tenant> findAllByOrderByIdDesc(Pageable pageable);
    long countByAccountType(AccountType accountType);
    List<Tenant> findByPhone(String phone);
    java.util.Optional<Tenant> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
