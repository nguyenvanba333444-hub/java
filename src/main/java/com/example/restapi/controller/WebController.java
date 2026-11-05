package com.example.restapi.controller;

import com.example.restapi.model.Room;
import com.example.restapi.model.Tenant;
import com.example.restapi.repository.RoomRepository;
import com.example.restapi.service.RoomService;
import com.example.restapi.service.BookingService;
import com.example.restapi.repository.TenantRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Controller
public class WebController {
    private final RoomService rooms;
    private final TenantRepository tenants;
    private final RoomRepository roomRepository;
    private final BookingService bookings;
    public WebController(RoomService rooms, TenantRepository tenants, RoomRepository roomRepository, BookingService bookings) {
        this.rooms = rooms;
        this.tenants = tenants;
        this.roomRepository = roomRepository;
        this.bookings = bookings;
    }

    @GetMapping("/")
    public String home(Model model, @RequestParam(required = false) String city,
                       @RequestParam(required = false) Double minPrice, @RequestParam(required = false) Double maxPrice,
                       @RequestParam(defaultValue = "0") int page) {
        model.addAttribute("city", city == null ? "" : city);
        model.addAttribute("minPrice", minPrice);
        model.addAttribute("maxPrice", maxPrice);
        model.addAttribute("page", Math.max(page, 0));
        return "index";
    }

    @GetMapping("/room/{id}")
    public String roomDetail(@PathVariable int id, Model model) {
        Room room = rooms.getRoomById(id);
        model.addAttribute("room", room);
        model.addAttribute("bankTransferEnabled", bookings.isBankTransferEnabled());
        model.addAttribute("owner", room == null ? null : tenants.findById(room.getOwnerId()).orElse(null));
        if (room != null) {
            String mapQuery = room.getAddress() + ", " + room.getDistrict() + ", " + room.getCity();
            String encodedMapQuery = URLEncoder.encode(mapQuery, StandardCharsets.UTF_8);
            model.addAttribute("mapLink", "https://www.google.com/maps/search/?api=1&query=" + encodedMapQuery);
            model.addAttribute("mapEmbedUrl", "https://maps.google.com/maps?q=" + encodedMapQuery + "&output=embed");
            var relatedRooms = roomRepository.findAll().stream()
                    .filter(other -> other.getId() != room.getId())
                    .sorted((left, right) -> {
                        boolean leftSameCity = left.getCity() != null && left.getCity().equalsIgnoreCase(room.getCity());
                        boolean rightSameCity = right.getCity() != null && right.getCity().equalsIgnoreCase(room.getCity());
                        int cityOrder = Boolean.compare(rightSameCity, leftSameCity);
                        return cityOrder != 0 ? cityOrder : Integer.compare(right.getId(), left.getId());
                    })
                    .limit(8).toList();
            model.addAttribute("relatedRooms", relatedRooms);
        }
        return "room/detail";
    }
}
