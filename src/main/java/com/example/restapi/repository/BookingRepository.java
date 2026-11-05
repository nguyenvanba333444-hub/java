package com.example.restapi.repository;

import com.example.restapi.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    java.util.Optional<Booking> findByIdForUpdate(@Param("id") int id);

    Page<Booking> findAllByOrderByIdDesc(Pageable pageable);
    long countByStatusIgnoreCase(String status);

    // Lấy các booking của một phòng
    List<Booking> findByRoomId(int roomId);

    // Lấy các booking của một người thuê
    List<Booking> findByTenantId(int tenantId);

    @Query("select b from Booking b, Room r where b.roomId = r.id and r.ownerId = :ownerId order by b.id desc")
    List<Booking> findByOwnerId(@Param("ownerId") int ownerId);
}
