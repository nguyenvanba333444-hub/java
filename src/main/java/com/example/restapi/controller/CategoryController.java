package com.example.restapi.controller;

import com.example.restapi.model.Category;
import com.example.restapi.service.CategoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService service;

    public CategoryController(CategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<Category> getAllCategories() {
        return service.getAllCategories();
    }

    @PostMapping
    public String addCategory(@RequestBody Category category) {
        service.addCategory(category);
        return "Category added successfully!";
    }
}
