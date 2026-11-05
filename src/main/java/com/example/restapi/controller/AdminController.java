package com.example.restapi.controller;

import com.example.restapi.model.Booking;
import com.example.restapi.model.Room;
import com.example.restapi.model.Tenant;
import com.example.restapi.service.BookingService;
import com.example.restapi.service.RoomService;
import com.example.restapi.service.TenantService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.stream.IntStream;

@Controller
public class AdminController {
    private static final int PAGE_SIZE = 10;

    private final RoomService rooms;
    private final TenantService tenants;
    private final BookingService bookings;

    public AdminController(RoomService rooms, TenantService tenants, BookingService bookings) {
        this.rooms = rooms;
        this.tenants = tenants;
        this.bookings = bookings;
    }

    @GetMapping("/admin")
    public String dashboard(Model model) {
        addSummary(model);
        Pageable recentPage = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "id"));
        model.addAttribute("recentRooms", rooms.getAllRooms(recentPage).getContent());
        model.addAttribute("recentAccounts", tenants.getAllTenants(recentPage).getContent());
        model.addAttribute("recentBookings", bookings.getAdminBookings(recentPage).getContent());
        return "admin/index";
    }

    @GetMapping("/admin/users")
    public String users(Model model, @RequestParam(defaultValue = "0") int page) {
        Page<Tenant> result = safePage(tenants.getAllTenants(page(page)), page,
                p -> tenants.getAllTenants(page(p)));
        model.addAttribute("accounts", result.getContent());
        addSection(model, "users", "Tài khoản người dùng", "Xem tài khoản đã đăng ký. Mỗi tài khoản có thể vừa đăng tin vừa gửi yêu cầu thuê.", result);
        addSummary(model);
        return "admin/section";
    }

    @GetMapping("/admin/rooms")
    public String roomListings(Model model, @RequestParam(defaultValue = "0") int page) {
        Page<Room> result = safePage(rooms.getAllRooms(page(page)), page,
                p -> rooms.getAllRooms(page(p)));
        model.addAttribute("rooms", result.getContent());
        java.util.Map<Integer, Tenant> roomOwners = new java.util.HashMap<>();
        result.getContent().stream().map(Room::getOwnerId).distinct().forEach(id -> {
            Tenant owner = tenants.getTenantById(id);
            if (owner != null) roomOwners.put(id, owner);
        });
        model.addAttribute("roomOwners", roomOwners);
        addSection(model, "rooms", "Quản lý tin phòng", "Theo dõi toàn bộ tin đăng, trạng thái phòng và thông tin người đăng.", result);
        addSummary(model);
        return "admin/section";
    }

    @GetMapping("/admin/bookings")
    public String bookingRequests(Model model, @RequestParam(defaultValue = "0") int page) {
        Page<Booking> result = safePage(bookings.getAdminBookings(page(page)), page,
                p -> bookings.getAdminBookings(page(p)));
        model.addAttribute("bookings", result.getContent());
        java.util.Map<Integer, Room> bookingRooms = new java.util.HashMap<>();
        result.getContent().stream().map(Booking::getRoomId).distinct().forEach(id -> {
            Room room = rooms.getRoomById(id);
            if (room != null) bookingRooms.put(id, room);
        });
        model.addAttribute("bookingRooms", bookingRooms);
        java.util.Map<Integer, Tenant> bookingUsers = new java.util.HashMap<>();
        result.getContent().stream().map(Booking::getTenantId).distinct().forEach(id -> {
            Tenant user = tenants.getTenantById(id);
            if (user != null) bookingUsers.put(id, user);
        });
        model.addAttribute("bookingUsers", bookingUsers);
        addSection(model, "bookings", "Yêu cầu thuê", "Theo dõi các yêu cầu thuê và trạng thái xử lý.", result);
        addSummary(model);
        return "admin/section";
    }

    @PostMapping("/booking/{id}/payment")
    public String updatePayment(@PathVariable int id, @RequestParam String paymentStatus) {
        String status = paymentStatus == null ? "" : paymentStatus.trim().toUpperCase(java.util.Locale.ROOT);
        return bookings.updatePaymentStatus(id, status)
                ? "redirect:/admin/bookings?paymentUpdated=1"
                : "redirect:/admin/bookings?paymentError=1";
    }

    private Pageable page(int number) {
        return PageRequest.of(Math.max(number, 0), PAGE_SIZE, Sort.by(Sort.Direction.DESC, "id"));
    }

    private <T> Page<T> safePage(Page<T> result, int requested, java.util.function.IntFunction<Page<T>> loader) {
        if (result.getTotalPages() > 0 && requested >= result.getTotalPages()) {
            return loader.apply(result.getTotalPages() - 1);
        }
        return result;
    }

    private void addSection(Model model, String section, String title, String description, Page<?> result) {
        model.addAttribute("section", section);
        model.addAttribute("basePath", "/admin/" + section);
        model.addAttribute("title", title);
        model.addAttribute("description", description);
        model.addAttribute("items", result.getContent());
        model.addAttribute("page", result.getNumber());
        model.addAttribute("totalPages", result.getTotalPages());
        model.addAttribute("totalItems", result.getTotalElements());
        model.addAttribute("startItem", result.isEmpty() ? 0 : result.getNumber() * result.getSize() + 1);
        model.addAttribute("endItem", result.isEmpty() ? 0 : result.getNumber() * result.getSize() + result.getNumberOfElements());
        model.addAttribute("hasPrevious", result.hasPrevious());
        model.addAttribute("hasNext", result.hasNext());
        model.addAttribute("firstPage", 0);
        model.addAttribute("lastPage", Math.max(0, result.getTotalPages() - 1));
        int first = Math.max(0, result.getNumber() - 2);
        int last = Math.min(result.getTotalPages(), result.getNumber() + 3);
        model.addAttribute("pageNumbers", IntStream.range(first, last).boxed().toList());
    }

    private void addSummary(Model model) {
        model.addAttribute("roomCount", rooms.countRooms());
        model.addAttribute("availableCount", rooms.countAvailableRooms());
        model.addAttribute("userCount", tenants.countAll());
        model.addAttribute("bookingCount", bookings.countBookings());
        model.addAttribute("pendingCount", bookings.countByStatus("PENDING"));
    }
}
