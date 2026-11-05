package com.example.restapi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RoomImageStorageService {
    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/gif", ".gif"
    );

    private final Path uploadDirectory;

    public RoomImageStorageService(@Value("${app.upload-dir:uploads/rooms}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile image) {
        if (image == null || image.isEmpty()) return null;
        String extension = EXTENSIONS.get(image.getContentType());
        if (extension == null) {
            throw new IllegalArgumentException("Chỉ chọn ảnh JPG, PNG hoặc GIF.");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("Ảnh không được lớn hơn 5 MB.");
        }
        try {
            try (var input = image.getInputStream()) {
                if (ImageIO.read(input) == null) {
                    throw new IllegalArgumentException("Tệp đã chọn không phải ảnh hợp lệ.");
                }
            }
            Files.createDirectories(uploadDirectory);
            String filename = UUID.randomUUID() + extension;
            image.transferTo(uploadDirectory.resolve(filename));
            return "/uploads/rooms/" + filename;
        } catch (IOException exception) {
            throw new UncheckedIOException("Không thể lưu ảnh phòng.", exception);
        }
    }

    public List<String> storeAll(List<MultipartFile> images, int minimumCount) {
        List<MultipartFile> selected = images == null ? List.of()
                : images.stream().filter(image -> image != null && !image.isEmpty()).toList();
        if (selected.size() < minimumCount) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất " + minimumCount + " ảnh cho tin phòng.");
        }
        List<String> stored = new ArrayList<>();
        try {
            for (MultipartFile image : selected) stored.add(store(image));
            return List.copyOf(stored);
        } catch (RuntimeException exception) {
            stored.forEach(this::delete);
            throw exception;
        }
    }

    public void deleteAll(List<String> imageUrls) {
        if (imageUrls != null) imageUrls.forEach(this::delete);
    }

    public void delete(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/uploads/rooms/")) return;
        Path imagePath = uploadDirectory.resolve(imageUrl.substring("/uploads/rooms/".length())).normalize();
        if (!imagePath.startsWith(uploadDirectory)) return;
        try {
            Files.deleteIfExists(imagePath);
        } catch (IOException exception) {
            throw new UncheckedIOException("Không thể xóa ảnh phòng cũ.", exception);
        }
    }

    public String resourceLocation() {
        String location = uploadDirectory.toUri().toString();
        return location.endsWith("/") ? location : location + "/";
    }
}
