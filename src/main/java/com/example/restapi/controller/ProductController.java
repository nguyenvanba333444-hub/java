package com.example.restapi.controller;

import com.example.restapi.model.Product;
import com.example.restapi.service.ProductService;
import org.springframework.hateoas.EntityModel;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.linkTo;
import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.methodOn;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    public List<Product> getAllProducts() {
        return service.getAllProducts();
    }

    @GetMapping("/{id}")
    public EntityModel<Product> getProductById(@PathVariable int id) {
        Product product = service.getProductById(id);

        EntityModel<Product> model = EntityModel.of(product);

        model.add(linkTo(methodOn(ProductController.class)
                .getProductById(id)).withSelfRel());

        model.add(linkTo(methodOn(ProductController.class)
                .getAllProducts()).withRel("products"));

        return model;
    }

    @PostMapping
    public String addProduct(@RequestBody Product product) {
        service.addProduct(product);
        return "Product added successfully!";
    }

    @PutMapping("/{id}")
    public String updateProduct(
            @PathVariable int id,
            @RequestBody Product product) {

        if (service.updateProduct(id, product)) {
            return "Product updated successfully!";
        }

        return "Product not found!";
    }

    @DeleteMapping("/{id}")
    public String deleteProduct(@PathVariable int id) {

        if (service.deleteProduct(id)) {
            return "Product deleted successfully!";
        }

        return "Product not found!";
    }
}
