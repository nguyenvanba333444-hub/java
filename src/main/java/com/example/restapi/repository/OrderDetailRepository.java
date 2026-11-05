package com.example.restapi.repository;

import com.example.restapi.model.OrderDetail;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class OrderDetailRepository {

    private List<OrderDetail> orderDetails = new ArrayList<>();

    public List<OrderDetail> getAllOrderDetails() {
        return orderDetails;
    }

    public void addOrderDetail(OrderDetail orderDetail) {
        orderDetails.add(orderDetail);
    }
}