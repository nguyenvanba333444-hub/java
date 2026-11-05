package com.example.restapi.repository;

import com.example.restapi.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// Repository cho bang room (JPA tu dong tao CRUD)
public interface RoomRepository extends JpaRepository<Room, Integer> {

    // Tìm phòng theo thành phố và khoảng giá
    List<Room> findByCityContainingIgnoreCaseAndPriceBetween(String city, double minPrice, double maxPrice);

    List<Room> findByCityContainingIgnoreCase(String city);
    List<Room> findByPriceBetween(double minPrice, double maxPrice);

    // Lấy các phòng còn trống
    List<Room> findByAvailableTrue();

    // Lấy phòng của một chủ trọ
    List<Room> findByOwnerId(int ownerId);

    Page<Room> findByCityContainingIgnoreCase(String city, Pageable pageable);
    Page<Room> findByCityContainingIgnoreCaseAndPriceBetween(String city, double minPrice, double maxPrice, Pageable pageable);
    Page<Room> findByPriceBetween(double minPrice, double maxPrice, Pageable pageable);
    long countByAvailableTrue();

    @Query(value = "select r from Room r where "
            + "(:city is null or :city = '' or lower(r.city) like lower(concat('%', :city, '%'))) and "
            + "(:district is null or :district = '' or lower(r.district) like lower(concat('%', :district, '%'))) and "
            + "(:minPrice is null or r.price >= :minPrice) and "
            + "(:maxPrice is null or r.price <= :maxPrice) and "
            + "(:available is null or r.available = :available) and "
            + "(:roomType is null or :roomType = '' or "
            + "(:roomType = 'STUDIO' and lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%studio%') or "
            + "(:roomType = 'DUPLEX' and lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%duplex%') or "
            + "(:roomType = 'ONE_BEDROOM' and (lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%1 phòng ngủ%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%1pn%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%một phòng ngủ%')) or "
            + "(:roomType = 'TWO_BEDROOM' and (lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%2 phòng ngủ%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%2pn%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%hai phòng ngủ%'))) ",
            countQuery = "select count(r) from Room r where "
                    + "(:city is null or :city = '' or lower(r.city) like lower(concat('%', :city, '%'))) and "
                    + "(:district is null or :district = '' or lower(r.district) like lower(concat('%', :district, '%'))) and "
                    + "(:minPrice is null or r.price >= :minPrice) and "
                    + "(:maxPrice is null or r.price <= :maxPrice) and "
                    + "(:available is null or r.available = :available) and "
                    + "(:roomType is null or :roomType = '' or "
                    + "(:roomType = 'STUDIO' and lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%studio%') or "
                    + "(:roomType = 'DUPLEX' and lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%duplex%') or "
                    + "(:roomType = 'ONE_BEDROOM' and (lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%1 phòng ngủ%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%1pn%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%một phòng ngủ%')) or "
                    + "(:roomType = 'TWO_BEDROOM' and (lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%2 phòng ngủ%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%2pn%' or lower(concat(r.title, ' ', coalesce(r.description, ''))) like '%hai phòng ngủ%'))) ")
    Page<Room> searchPage(@Param("city") String city, @Param("district") String district,
                          @Param("minPrice") Double minPrice, @Param("maxPrice") Double maxPrice,
                          @Param("available") Boolean available, @Param("roomType") String roomType,
                          Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id = :id")
    java.util.Optional<Room> findByIdForUpdate(@Param("id") int id);
}
