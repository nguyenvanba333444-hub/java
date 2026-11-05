package com.example.restapi.config;

import com.example.restapi.model.Tenant;
import com.example.restapi.repository.TenantRepository;
import org.springframework.stereotype.Controller;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.ControllerAdvice;

@ControllerAdvice(annotations = Controller.class)
public class CurrentAccountAdvice {
    private final TenantRepository tenants;
    public CurrentAccountAdvice(TenantRepository tenants){this.tenants=tenants;}
    @ModelAttribute("currentAccount")
    public Tenant currentAccount(Authentication authentication){
        if(authentication==null||!authentication.isAuthenticated()||"anonymousUser".equals(authentication.getPrincipal()))return null;
        return tenants.findByEmailIgnoreCase(authentication.getName()).orElse(null);
    }
}
