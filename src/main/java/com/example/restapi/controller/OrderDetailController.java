package com.example.restapi.controller;

import com.example.restapi.model.OrderDetail;
import com.example.restapi.service.OrderDetailService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/order-details")
public class OrderDetailController {

    private final OrderDetailService service;

    public OrderDetailController(OrderDetailService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderDetail> getAllOrderDetails() {
        return service.getAllOrderDetails();
    }

    @PostMapping
    public String addOrderDetail(@RequestBody OrderDetail orderDetail) {
        service.addOrderDetail(orderDetail);
        return "Order detail added successfully!";
    }
}