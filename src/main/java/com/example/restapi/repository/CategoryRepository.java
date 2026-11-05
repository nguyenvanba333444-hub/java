package com.example.restapi.repository;

import com.example.restapi.model.Category;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class CategoryRepository {

    private List<Category> categories = new ArrayList<>();

    public List<Category> getAllCategories() {
        return categories;
    }

    public void addCategory(Category category) {
        categories.add(category);
    }
}
