package com.example.restapi.controller;

import com.example.restapi.model.Order;
import com.example.restapi.service.OrderService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<Order> getAllOrders() {
        return service.getAllOrders();
    }

    @PostMapping
    public String addOrder(@RequestBody Order order) {
        service.addOrder(order);
        return "Order added successfully!";
    }
}