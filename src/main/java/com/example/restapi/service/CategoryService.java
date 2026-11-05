package com.example.restapi.service;

import com.example.restapi.model.Category;
import com.example.restapi.repository.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    public List<Category> getAllCategories() {
        return repository.getAllCategories();
    }

    public void addCategory(Category category) {
        repository.addCategory(category);
    }
}
