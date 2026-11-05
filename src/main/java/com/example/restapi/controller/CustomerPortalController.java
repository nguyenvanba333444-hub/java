package com.example.restapi.controller;

import com.example.restapi.model.Booking;
import com.example.restapi.model.Tenant;
import com.example.restapi.repository.TenantRepository;
import com.example.restapi.service.BookingService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Controller
public class CustomerPortalController {
    private final TenantRepository tenants;
    private final BookingService bookings;
    public CustomerPortalController(TenantRepository tenants, BookingService bookings) { this.tenants = tenants; this.bookings = bookings; }

    @PostMapping("/room/{id}/book")
    public String book(@PathVariable int id, @RequestParam String startDate, @RequestParam String endDate,
                       @RequestParam(defaultValue = "CASH") String paymentMethod,
                       @AuthenticationPrincipal UserDetails principal) {
        Tenant customer = tenants.findByEmailIgnoreCase(principal.getUsername()).orElseThrow();
        try {
            LocalDate start = LocalDate.parse(startDate), end = LocalDate.parse(endDate);
            if (start.isBefore(LocalDate.now()) || end.isBefore(start)) return "redirect:/room/" + id + "?error=dates";
            Booking booking = new Booking(); booking.setRoomId(id); booking.setStartDate(startDate); booking.setEndDate(endDate);
            booking.setPaymentMethod(paymentMethod);
            try {
                return bookings.addBooking(booking, customer) == null
                        ? "redirect:/room/" + id + "?error=1" : "redirect:/room/" + id + "?success=1";
            } catch (IllegalArgumentException exception) {
                return "redirect:/room/" + id + "?error=payment";
            }
        } catch (RuntimeException ex) { return "redirect:/room/" + id + "?error=dates"; }
    }

    @GetMapping("/my-requests")
    public String myRequests(Model model, @AuthenticationPrincipal UserDetails principal) {
        Tenant customer = tenants.findByEmailIgnoreCase(principal.getUsername()).orElseThrow();
        model.addAttribute("phone", customer.getPhone());
        model.addAttribute("requests", bookings.getRequestsByTenant(customer.getId()));
        return "my-requests";
    }
}
