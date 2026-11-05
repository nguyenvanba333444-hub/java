package com.example.restapi.controller;

import com.example.restapi.model.Tenant;
import com.example.restapi.service.TenantService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService service;

    public TenantController(TenantService service) {
        this.service = service;
    }

    @GetMapping
    public List<Tenant> getAllTenants() {
        return service.getAllTenants();
    }

    // Lọc tài khoản USER theo loại: TENANT (người thuê) hoặc OWNER (chủ trọ)
    @GetMapping({"/type/{accountType}", "/role/{accountType}"})
    public List<Tenant> getTenantsByType(@PathVariable String accountType) {
        return service.getTenantsByType(accountType);
    }

    @GetMapping("/{id}")
    public Tenant getTenantById(@PathVariable int id) {
        return service.getTenantById(id);
    }

    @PostMapping
    public Tenant addTenant(@RequestBody Tenant tenant) {
        return service.addTenant(tenant);
    }

    @PutMapping("/{id}")
    public String updateTenant(@PathVariable int id, @RequestBody Tenant tenant) {
        if (service.updateTenant(id, tenant)) {
            return "Tenant updated successfully!";
        }
        return "Tenant not found!";
    }

    @DeleteMapping("/{id}")
    public String deleteTenant(@PathVariable int id) {
        if (service.deleteTenant(id)) {
            return "Tenant deleted successfully!";
        }
        return "Tenant not found!";
    }
}
