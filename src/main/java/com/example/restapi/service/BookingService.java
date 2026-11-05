package com.example.restapi.service;

import com.example.restapi.model.Booking;
import com.example.restapi.model.Room;
import com.example.restapi.repository.BookingRepository;
import com.example.restapi.repository.RoomRepository;
import com.example.restapi.repository.TenantRepository;
import com.example.restapi.model.Tenant;
import com.example.restapi.model.BookingRequestView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    @Value("${app.payment.bank-id:}") private String paymentBankId;
    @Value("${app.payment.account-no:}") private String paymentAccountNo;
    @Value("${app.payment.account-name:}") private String paymentAccountName;
    @Value("${app.payment.deposit-rate:1}") private double depositRate;

    public BookingService(BookingRepository bookingRepository, RoomRepository roomRepository, TenantRepository tenantRepository) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.tenantRepository = tenantRepository;
    }

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public Page<Booking> getAdminBookings(Pageable pageable) {
        return bookingRepository.findAllByOrderByIdDesc(pageable);
    }

    public long countBookings() {
        return bookingRepository.count();
    }

    public long countByStatus(String status) {
        return bookingRepository.countByStatusIgnoreCase(status);
    }

    public Booking getBookingById(int id) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking != null) addPaymentDisplay(booking);
        return booking;
    }

    public List<Booking> getBookingsByRoom(int roomId) {
        return bookingRepository.findByRoomId(roomId);
    }

    public List<Booking> getBookingsByTenant(int tenantId) {
        return bookingRepository.findByTenantId(tenantId);
    }

    public List<BookingRequestView> getRequestsByOwner(int ownerId) {
        return bookingRepository.findByOwnerId(ownerId).stream().map(booking -> {
            Room room = roomRepository.findById(booking.getRoomId()).orElse(null);
            Tenant tenant = tenantRepository.findById(booking.getTenantId()).orElse(null);
            addPaymentDisplay(booking);
            return new BookingRequestView(booking.getId(), booking.getRoomId(),
                    room == null ? "Phòng đã xóa" : room.getTitle(),
                    tenant == null ? "Người thuê" : tenant.getFullName(),
                    tenant == null ? "" : tenant.getPhone(), booking.getStartDate(),
                    booking.getEndDate(), booking.getStatus(), booking.getDepositAmount(),
                    booking.getPaymentMethod(), booking.getPaymentStatus(), booking.getPaymentCode(), booking.getPaymentQrUrl());
        }).toList();
    }

    public List<BookingRequestView> getRequestsByTenant(int tenantId) {
        return bookingRepository.findByTenantId(tenantId).stream().map(booking -> {
            Room room = roomRepository.findById(booking.getRoomId()).orElse(null);
            Tenant owner = room == null ? null : tenantRepository.findById(room.getOwnerId()).orElse(null);
            addPaymentDisplay(booking);
            return new BookingRequestView(booking.getId(), booking.getRoomId(),
                    room == null ? "Phòng đã xóa" : room.getTitle(),
                    owner == null ? "Chủ trọ" : owner.getFullName(), owner == null ? "" : owner.getPhone(),
                    booking.getStartDate(), booking.getEndDate(), booking.getStatus(), booking.getDepositAmount(),
                    booking.getPaymentMethod(), booking.getPaymentStatus(), booking.getPaymentCode(), booking.getPaymentQrUrl());
        }).toList();
    }

    @Transactional
    public boolean updateRequestStatus(int bookingId, String status) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || !"PENDING".equalsIgnoreCase(booking.getStatus())) {
            return false;
        }
        Room room = roomRepository.findByIdForUpdate(booking.getRoomId()).orElse(null);
        if (room == null) {
            return false;
        }
        if ("CONFIRMED".equals(status)) {
            booking.setStatus("CONFIRMED");
            room.setAvailable(false);
        } else if ("REJECTED".equals(status)) {
            booking.setStatus("REJECTED");
            room.setAvailable(true);
        } else {
            return false;
        }
        roomRepository.save(room);
        bookingRepository.save(booking);
        return true;
    }

    @Transactional
    public boolean updatePaymentStatus(int bookingId, String paymentStatus) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || paymentStatus == null || !"BANK_TRANSFER".equals(booking.getPaymentMethod())
                || !List.of("PAID", "PENDING").contains(paymentStatus)
                || "REJECTED".equalsIgnoreCase(booking.getStatus())) return false;
        if ("PAID".equals(paymentStatus) && !"PENDING".equals(booking.getPaymentStatus())) return false;
        booking.setPaymentStatus(paymentStatus);
        bookingRepository.save(booking);
        return true;
    }

    public List<BookingRequestView> getRequestsByPhone(String phone) {
        return tenantRepository.findByPhone(phone).stream()
                .flatMap(tenant -> bookingRepository.findByTenantId(tenant.getId()).stream())
                .map(booking -> {
                    Room room = roomRepository.findById(booking.getRoomId()).orElse(null);
                    Tenant owner = room == null ? null : tenantRepository.findById(room.getOwnerId()).orElse(null);
                    addPaymentDisplay(booking);
                    return new BookingRequestView(booking.getId(), booking.getRoomId(),
                            room == null ? "Phòng đã xóa" : room.getTitle(),
                            owner == null ? "Chủ trọ" : owner.getFullName(),
                            owner == null ? "" : owner.getPhone(), booking.getStartDate(),
                            booking.getEndDate(), booking.getStatus(), booking.getDepositAmount(),
                            booking.getPaymentMethod(), booking.getPaymentStatus(), booking.getPaymentCode(), booking.getPaymentQrUrl());
                }).toList();
    }

    // Đặt/thuê phòng: chỉ cho đặt nếu phòng còn trống
    @Transactional
    public Booking addBooking(Booking booking) {
        validateDateRange(booking);
        Room room = roomRepository.findByIdForUpdate(booking.getRoomId()).orElse(null);
        if (room == null || !room.isAvailable() || room.getOwnerId() == booking.getTenantId()) {
            return null;
        }
        booking.setStatus("PENDING");
        preparePayment(booking, room);
        room.setAvailable(false);
        roomRepository.save(room);
        return saveWithPaymentCode(booking);
    }

    @Transactional
    public Booking addBooking(Booking booking, String tenantName, String tenantPhone) {
        validateDateRange(booking);
        Room room = roomRepository.findByIdForUpdate(booking.getRoomId()).orElse(null);
        if (room == null || !room.isAvailable() || room.getOwnerId() == booking.getTenantId()) {
            return null;
        }
        Tenant tenant = new Tenant();
        tenant.setFullName(tenantName.trim());
        tenant.setPhone(tenantPhone.trim());
        tenant.setEmail(tenantPhone.trim() + "@booking.local");
        tenant.setRole("USER");
        tenant.setAccountType("TENANT");
        tenant = tenantRepository.save(tenant);
        booking.setTenantId(tenant.getId());
        booking.setStatus("PENDING");
        preparePayment(booking, room);
        room.setAvailable(false);
        roomRepository.save(room);
        return saveWithPaymentCode(booking);
    }

    @Transactional
    public Booking addBooking(Booking booking, Tenant tenant) {
        validateDateRange(booking);
        Room room = roomRepository.findByIdForUpdate(booking.getRoomId()).orElse(null);
        if (room == null || !room.isAvailable() || room.getOwnerId() == tenant.getId()) return null;
        booking.setTenantId(tenant.getId());
        booking.setStatus("PENDING");
        preparePayment(booking, room);
        room.setAvailable(false);
        roomRepository.save(room);
        return saveWithPaymentCode(booking);
    }

    public boolean isBankTransferEnabled() {
        return paymentBankId != null && !paymentBankId.isBlank()
                && paymentAccountNo != null && !paymentAccountNo.isBlank()
                && paymentAccountName != null && !paymentAccountName.isBlank();
    }

    private void preparePayment(Booking booking, Room room) {
        String method = booking.getPaymentMethod() == null ? "CASH" : booking.getPaymentMethod().trim().toUpperCase(java.util.Locale.ROOT);
        if (!List.of("CASH", "BANK_TRANSFER").contains(method)) {
            throw new IllegalArgumentException("Phương thức thanh toán không hợp lệ.");
        }
        if ("BANK_TRANSFER".equals(method) && !isBankTransferEnabled()) {
            throw new IllegalArgumentException("Chủ dự án chưa cấu hình tài khoản nhận chuyển khoản.");
        }
        if (!Double.isFinite(depositRate) || depositRate <= 0) {
            throw new IllegalStateException("Tỷ lệ tiền cọc chưa được cấu hình hợp lệ.");
        }
        booking.setPaymentMethod(method);
        booking.setDepositAmount(Math.round(room.getPrice() * depositRate));
        booking.setPaymentStatus("BANK_TRANSFER".equals(method) ? "PENDING" : "NOT_CONFIGURED");
    }

    private Booking saveWithPaymentCode(Booking booking) {
        Booking saved = bookingRepository.save(booking);
        saved.setPaymentCode("TROTOT" + saved.getId());
        saved = bookingRepository.save(saved);
        addPaymentDisplay(saved);
        return saved;
    }

    private void addPaymentDisplay(Booking booking) {
        if (!"BANK_TRANSFER".equals(booking.getPaymentMethod()) || !isBankTransferEnabled()
                || booking.getPaymentCode() == null) return;
        try {
            String accountName = java.net.URLEncoder.encode(paymentAccountName, java.nio.charset.StandardCharsets.UTF_8);
            String addInfo = java.net.URLEncoder.encode(booking.getPaymentCode(), java.nio.charset.StandardCharsets.UTF_8);
            booking.setPaymentQrUrl("https://img.vietqr.io/image/" + paymentBankId + "-" + paymentAccountNo
                    + "-compact2.png?amount=" + booking.getDepositAmount() + "&addInfo=" + addInfo
                    + "&accountName=" + accountName);
        } catch (RuntimeException exception) {
            booking.setPaymentQrUrl(null);
        }
    }

    private void validateDateRange(Booking booking) {
        try {
            java.time.LocalDate start = java.time.LocalDate.parse(booking.getStartDate());
            java.time.LocalDate end = java.time.LocalDate.parse(booking.getEndDate());
            if (start.isBefore(java.time.LocalDate.now()) || end.isBefore(start)) {
                throw new IllegalArgumentException("Khoảng ngày thuê không hợp lệ.");
            }
        } catch (java.time.DateTimeException | NullPointerException exception) {
            throw new IllegalArgumentException("Ngày thuê phải có định dạng yyyy-MM-dd.");
        }
    }

    public boolean updateBooking(int id, Booking booking) {
        if (bookingRepository.existsById(id)) {
            booking.setId(id);
            bookingRepository.save(booking);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean deleteBooking(int id) {
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking != null) {
            Room room = roomRepository.findById(booking.getRoomId()).orElse(null);
            if (room != null && !"REJECTED".equalsIgnoreCase(booking.getStatus())) {
                room.setAvailable(true); // hủy thuê -> phòng trống lại
                roomRepository.save(room);
            }
            bookingRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
