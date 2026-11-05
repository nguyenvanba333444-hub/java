package com.example.restapi.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.ManyToOne;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "room")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String title;          // tên phòng / tiêu đề tin đăng
    private String address;        // địa chỉ
    private String district;       // quận/huyện
    private String city;           // thành phố
    private double price;          // giá thuê theo tháng
    private double area;           // diện tích (m2)
    @Column(columnDefinition = "TEXT")
    private String description;    // mô tả
    private String imageUrl;       // ảnh đại diện tin đăng
    @ElementCollection
    @CollectionTable(name = "room_images", joinColumns = @JoinColumn(name = "room_id"),
            foreignKey = @ForeignKey(name = "fk_room_images_room"))
    @Column(name = "image_url", nullable = false, length = 500)
    @OrderColumn(name = "image_order")
    private List<String> imageUrls = new ArrayList<>();
    private boolean available;     // còn trống hay đã cho thuê
    @Column(name = "owner_id", nullable = false)
    private int ownerId;           // id tài khoản đăng tin

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_room_owner"))
    @JsonIgnore
    private Tenant owner;

    public Room() {
    }

    public Room(int id, String title, String address, String district, String city,
                double price, double area, String description, boolean available, int ownerId) {
        this.id = id;
        this.title = title;
        this.address = address;
        this.district = district;
        this.city = city;
        this.price = price;
        this.area = area;
        this.description = description;
        this.available = available;
        this.ownerId = ownerId;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public double getArea() { return area; }
    public void setArea(double area) { this.area = area; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public List<String> getImageUrls() {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return imageUrl == null || imageUrl.isBlank() ? List.of() : List.of(imageUrl);
        }
        return imageUrls;
    }
    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = imageUrls == null ? new ArrayList<>() : new ArrayList<>(imageUrls);
        if (!this.imageUrls.isEmpty()) this.imageUrl = this.imageUrls.get(0);
    }

    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }

    public int getOwnerId() { return ownerId; }
    public void setOwnerId(int ownerId) { this.ownerId = ownerId; }
}
