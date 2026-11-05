package com.example.restapi.service;

import com.example.restapi.model.Product;
import com.example.restapi.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<Product> getAllProducts() {
        return repository.getAllProducts();
    }

    public Product getProductById(int id) {
        return repository.getProductById(id);
    }

    public void addProduct(Product product) {
        repository.addProduct(product);
    }

    public boolean updateProduct(int id, Product product) {
        return repository.updateProduct(id, product);
    }

    public boolean deleteProduct(int id) {
        return repository.deleteProduct(id);
    }
}