package com.example.restapi.controller;

import com.example.restapi.model.Booking;
import com.example.restapi.model.BookingRequestView;
import com.example.restapi.service.BookingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.example.restapi.model.Room;
import com.example.restapi.model.Tenant;
import com.example.restapi.repository.RoomRepository;
import com.example.restapi.repository.TenantRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService service;
    private final RoomRepository rooms;
    private final TenantRepository tenants;

    public BookingController(BookingService service, RoomRepository rooms, TenantRepository tenants) {
        this.service = service;
        this.rooms = rooms;
        this.tenants = tenants;
    }

    @GetMapping
    public List<Booking> getAllBookings() {
        return service.getAllBookings();
    }

    @GetMapping("/owner/{ownerId}")
    public List<BookingRequestView> getOwnerRequests(@PathVariable int ownerId,
                                                     @AuthenticationPrincipal UserDetails principal) {
        Tenant account = currentAccount(principal);
        if (!isAdmin(account) && account.getId() != ownerId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem yêu cầu thuê này.");
        }
        return service.getRequestsByOwner(ownerId);
    }

    @GetMapping("/lookup")
    public List<BookingRequestView> lookupRequests(@RequestParam(required = false) String phone,
                                                   @AuthenticationPrincipal UserDetails principal) {
        Tenant account = currentAccount(principal);
        String requestedPhone = isAdmin(account) ? phone : account.getPhone();
        if (requestedPhone == null || !isAdmin(account) && phone != null && !phone.equals(account.getPhone())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ được tra cứu yêu cầu bằng số điện thoại của bạn.");
        }
        if (!requestedPhone.matches("[+0-9 .()-]{8,20}")) {
            return List.of();
        }
        return service.getRequestsByPhone(requestedPhone.trim());
    }

    @PutMapping("/{id}/status")
    public Map<String, Object> updateRequestStatus(@PathVariable int id, @RequestBody Map<String, String> body,
                                                   @AuthenticationPrincipal UserDetails principal) {
        Tenant account = currentAccount(principal);
        Booking booking = service.getBookingById(id);
        Room room = booking == null ? null : rooms.findById(booking.getRoomId()).orElse(null);
        if (booking == null || room == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu thuê.");
        }
        if (!isAdmin(account) && room.getOwnerId() != account.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xử lý yêu cầu này.");
        }
        String rawStatus = body == null ? null : body.get("status");
        String status = rawStatus == null ? "" : rawStatus.toUpperCase(java.util.Locale.ROOT);
        if (!List.of("CONFIRMED", "REJECTED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái yêu cầu không hợp lệ.");
        }
        boolean updated = service.updateRequestStatus(id, status);
        if (!updated) throw new ResponseStatusException(HttpStatus.CONFLICT, "Yêu cầu không tồn tại hoặc đã được xử lý.");
        return Map.of("success", updated,
                "message", updated ? "Đã cập nhật yêu cầu thuê." : "Yêu cầu không tồn tại hoặc đã được xử lý.");
    }

    @PutMapping("/{id}/payment")
    public Booking updatePaymentStatus(@PathVariable int id, @RequestBody Map<String, String> body,
                                       @AuthenticationPrincipal UserDetails principal) {
        Tenant account = currentAccount(principal);
        if (!isAdmin(account)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quản trị viên được đối soát thanh toán.");
        String rawStatus = body == null ? null : body.get("paymentStatus");
        String status = rawStatus == null ? "" : rawStatus.toUpperCase(java.util.Locale.ROOT);
        if (!List.of("PAID", "PENDING").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái thanh toán không hợp lệ.");
        }
        if (!service.updatePaymentStatus(id, status)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Thanh toán không tồn tại hoặc không ở trạng thái có thể đối soát.");
        }
        return service.getBookingById(id);
    }

    @GetMapping("/{id}")
    public Booking getBookingById(@PathVariable int id) {
        Booking booking = service.getBookingById(id);
        if (booking == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu thuê.");
        return booking;
    }

    // Người thuê đặt phòng
    @PostMapping
    public Map<String, Object> addBooking(@RequestBody Booking booking,
                                          @AuthenticationPrincipal UserDetails principal) {
        if (booking == null || booking.getRoomId() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã phòng không hợp lệ.");
        }
        Tenant account = currentAccount(principal);
        if (!"USER".equals(account.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản quản trị không thể gửi yêu cầu thuê.");
        }
        booking.setTenantId(account.getId());
        Booking created;
        try {
            created = service.addBooking(booking);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
        if (created == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phòng không tồn tại hoặc hiện không còn trống.");
        }
        return Map.of("success", true, "id", created.getId(), "status", created.getStatus(),
                "paymentMethod", created.getPaymentMethod(), "paymentStatus", created.getPaymentStatus(),
                "depositAmount", created.getDepositAmount(), "paymentCode", created.getPaymentCode(),
                "paymentQrUrl", created.getPaymentQrUrl() == null ? "" : created.getPaymentQrUrl(),
                "message", "Yêu cầu thuê đã được gửi.");
    }

    @GetMapping("/room/{roomId}")
    public List<Booking> getBookingsByRoom(@PathVariable int roomId) {
        return service.getBookingsByRoom(roomId);
    }

    @GetMapping("/tenant/{tenantId}")
    public List<Booking> getBookingsByTenant(@PathVariable int tenantId) {
        return service.getBookingsByTenant(tenantId);
    }

    @PutMapping("/{id}")
    public String updateBooking(@PathVariable int id, @RequestBody Booking booking) {
        if (service.updateBooking(id, booking)) {
            return "Booking updated successfully!";
        }
        return "Booking not found!";
    }

    // Hủy thuê -> phòng trống lại
    @DeleteMapping("/{id}")
    public String deleteBooking(@PathVariable int id) {
        if (service.deleteBooking(id)) {
            return "Booking cancelled, room is available again!";
        }
        return "Booking not found!";
    }

    private Tenant currentAccount(UserDetails principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        return tenants.findByEmailIgnoreCase(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không còn tồn tại."));
    }

    private boolean isAdmin(Tenant account) {
        return "ADMIN".equalsIgnoreCase(account.getRole());
    }
}
