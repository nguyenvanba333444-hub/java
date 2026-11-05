package com.example.restapi.repository;

import com.example.restapi.model.Customer;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class CustomerRepository {

    private List<Customer> customers = new ArrayList<>();

    public List<Customer> getAllCustomers() {
        return customers;
    }

    public void addCustomer(Customer customer) {
        customers.add(customer);
    }
}
