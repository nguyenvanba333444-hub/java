package com.example.restapi.service;

import com.example.restapi.model.Tenant;
import com.example.restapi.model.AccountType;
import com.example.restapi.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Service
public class TenantService {

    private final TenantRepository repository;

    public TenantService(TenantRepository repository) {
        this.repository = repository;
    }

    public List<Tenant> getAllTenants() {
        return repository.findAll();
    }

    public Page<Tenant> getAllTenants(Pageable pageable) {
        return repository.findAllByOrderByIdDesc(pageable);
    }

    public long countAll() {
        return repository.count();
    }

    public Tenant getTenantById(int id) {
        return repository.findById(id).orElse(null);
    }

    public List<Tenant> getTenantsByType(String accountType) {
        return repository.findByAccountType(AccountType.valueOf(accountType.trim().toUpperCase()));
    }

    public Page<Tenant> getTenantsByType(String accountType, Pageable pageable) {
        return repository.findByAccountType(AccountType.valueOf(accountType.trim().toUpperCase()), pageable);
    }

    public long countByType(String accountType) {
        return repository.countByAccountType(AccountType.valueOf(accountType.trim().toUpperCase()));
    }

    public Tenant addTenant(Tenant tenant) {
        return repository.save(tenant);
    }

    public boolean updateTenant(int id, Tenant tenant) {
        if (repository.existsById(id)) {
            tenant.setId(id);
            repository.save(tenant);
            return true;
        }
        return false;
    }

    public boolean deleteTenant(int id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }
}
