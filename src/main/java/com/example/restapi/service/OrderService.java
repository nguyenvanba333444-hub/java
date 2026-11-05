package com.example.restapi.service;

import com.example.restapi.model.Order;
import com.example.restapi.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderService {

    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }

    public List<Order> getAllOrders() {
        return repository.getAllOrders();
    }

    public void addOrder(Order order) {
        repository.addOrder(order);
    }
}