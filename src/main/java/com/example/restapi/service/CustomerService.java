package com.example.restapi.service;

import com.example.restapi.model.Customer;
import com.example.restapi.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository repository;

    public CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    public List<Customer> getAllCustomers() {
        return repository.getAllCustomers();
    }

    public void addCustomer(Customer customer) {
        repository.addCustomer(customer);
    }
}
