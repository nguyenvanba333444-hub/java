package com.example.restapi.service;

import com.example.restapi.model.Room;
import com.example.restapi.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomService {

    private final RoomRepository repository;

    public RoomService(RoomRepository repository) {
        this.repository = repository;
    }

    public List<Room> getAllRooms() {
        return repository.findAll();
    }

    public Room getRoomById(int id) {
        return repository.findById(id).orElse(null);
    }

    public List<Room> searchRooms(String city, double minPrice, double maxPrice) {
        if (city != null && !city.isBlank()) {
            if (minPrice <= 0 && maxPrice >= 999999999) {
                return repository.findByCityContainingIgnoreCase(city.trim());
            }
            return repository.findByCityContainingIgnoreCaseAndPriceBetween(city.trim(), minPrice, maxPrice);
        }
        if (minPrice <= 0 && maxPrice >= 999999999) {
            return repository.findAll();
        }
        return repository.findByPriceBetween(minPrice, maxPrice);
    }

    public Page<Room> searchRooms(String city, double minPrice, double maxPrice, Pageable pageable) {
        boolean hasCity = city != null && !city.isBlank();
        boolean hasPriceFilter = minPrice > 0 || maxPrice < 999999999;
        if (hasCity && hasPriceFilter) {
            return repository.findByCityContainingIgnoreCaseAndPriceBetween(city.trim(), minPrice, maxPrice, pageable);
        }
        if (hasCity) return repository.findByCityContainingIgnoreCase(city.trim(), pageable);
        if (hasPriceFilter) return repository.findByPriceBetween(minPrice, maxPrice, pageable);
        return repository.findAll(pageable);
    }

    public Page<Room> getAllRooms(Pageable pageable) {
        return repository.findAll(pageable);
    }

    public long countRooms() {
        return repository.count();
    }

    public long countAvailableRooms() {
        return repository.countByAvailableTrue();
    }

    public List<Room> getRoomsByOwner(int ownerId) {
        return repository.findByOwnerId(ownerId);
    }

    public Page<Room> searchPage(String city, String district, Double minPrice, Double maxPrice,
                                 Boolean available, String roomType, Pageable pageable) {
        return repository.searchPage(city, district, minPrice, maxPrice, available, roomType, pageable);
    }

    @Transactional
    public Room addRoom(Room room) {
        room.setId(0);
        return repository.save(room);
    }

    @Transactional
    public boolean updateRoom(int id, Room room) {
        Room existing = repository.findByIdForUpdate(id).orElse(null);
        if (existing == null) return false;
        room.setId(id);
        repository.save(room);
        return true;
    }

    @Transactional
    public boolean deleteRoom(int id) {
        Room existing = repository.findByIdForUpdate(id).orElse(null);
        if (existing == null) return false;
        repository.delete(existing);
        return true;
    }
}
