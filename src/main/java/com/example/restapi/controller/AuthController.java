package com.example.restapi.controller;

import com.example.restapi.service.AccountService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AuthController {
    private final AccountService accounts;
    public AuthController(AccountService accounts) { this.accounts = accounts; }

    @GetMapping("/login")
    public String login() { return "auth/login"; }

    @GetMapping("/register")
    public String register() { return "auth/register"; }

    @PostMapping("/register")
    public String register(@RequestParam String fullName, @RequestParam String phone,
                           @RequestParam String email, @RequestParam String password, Model model) {
        try {
            accounts.register(fullName, phone, email, password);
            return "redirect:/login?registered=1";
        } catch (IllegalArgumentException exception) {
            model.addAttribute("error", exception.getMessage());
            model.addAttribute("fullName", fullName);
            model.addAttribute("phone", phone);
            model.addAttribute("email", email);
            return "auth/register";
        }
    }

    @GetMapping("/access-denied")
    public String accessDenied() { return "auth/access-denied"; }
}
