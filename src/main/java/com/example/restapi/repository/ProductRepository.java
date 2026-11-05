package com.example.restapi.repository;

import com.example.restapi.model.Product;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class ProductRepository {

    private List<Product> products = new ArrayList<>();

    public List<Product> getAllProducts() {
        return products;
    }

    public Product getProductById(int id) {
        for (Product product : products) {
            if (product.getId() == id) {
                return product;
            }
        }
        return null;
    }

    public void addProduct(Product product) {
        products.add(product);
    }

    public boolean updateProduct(int id, Product product) {
        for (int i = 0; i < products.size(); i++) {
            if (products.get(i).getId() == id) {
                product.setId(id);
                products.set(i, product);
                return true;
            }
        }
        return false;
    }

    public boolean deleteProduct(int id) {
        return products.removeIf(product -> product.getId() == id);
    }
}