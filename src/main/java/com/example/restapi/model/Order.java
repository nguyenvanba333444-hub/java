package com.example.restapi.model;

public class Order {

    private int id;
    private int customerId;
    private double totalPrice;
    private String status;

    public Order() {
    }

    public Order(int id, int customerId, double totalPrice, String status) {
        this.id = id;
        this.customerId = customerId;
        this.totalPrice = totalPrice;
        this.status = status;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getCustomerId() {
        return customerId;
    }

    public void setCustomerId(int customerId) {
        this.customerId = customerId;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}