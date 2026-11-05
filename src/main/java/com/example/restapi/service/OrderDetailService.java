package com.example.restapi.service;

import com.example.restapi.model.OrderDetail;
import com.example.restapi.repository.OrderDetailRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderDetailService {

    private final OrderDetailRepository repository;

    public OrderDetailService(OrderDetailRepository repository) {
        this.repository = repository;
    }

    public List<OrderDetail> getAllOrderDetails() {
        return repository.getAllOrderDetails();
    }

    public void addOrderDetail(OrderDetail orderDetail) {
        repository.addOrderDetail(orderDetail);
    }
}
