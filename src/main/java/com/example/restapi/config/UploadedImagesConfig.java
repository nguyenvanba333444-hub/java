package com.example.restapi.config;

import com.example.restapi.service.RoomImageStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadedImagesConfig implements WebMvcConfigurer {
    private final RoomImageStorageService images;

    public UploadedImagesConfig(RoomImageStorageService images) {
        this.images = images;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/rooms/**")
                .addResourceLocations(images.resourceLocation());
    }
}
