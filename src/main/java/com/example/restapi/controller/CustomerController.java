package com.example.restapi.controller;

import com.example.restapi.model.Customer;
import com.example.restapi.service.CustomerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService service;

    public CustomerController(CustomerService service) {
        this.service = service;
    }

    @GetMapping
    public List<Customer> getAllCustomers() {
        return service.getAllCustomers();
    }

    @PostMapping
    public String addCustomer(@RequestBody Customer customer) {
        service.addCustomer(customer);
        return "Customer added successfully!";
    }
}
