package com.example.restapi.repository;

import com.example.restapi.model.Order;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class OrderRepository {

    private List<Order> orders = new ArrayList<>();

    public List<Order> getAllOrders() {
        return orders;
    }

    public void addOrder(Order order) {
        orders.add(order);
    }
}