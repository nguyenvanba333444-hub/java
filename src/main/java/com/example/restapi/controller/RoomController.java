package com.example.restapi.controller;

import com.example.restapi.model.Room;
import com.example.restapi.model.Tenant;
import com.example.restapi.repository.TenantRepository;
import com.example.restapi.service.RoomService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_IMAGES = 8;
    private static final List<String> ROOM_TYPES = List.of("STUDIO", "DUPLEX", "ONE_BEDROOM", "TWO_BEDROOM");

    private final RoomService service;
    private final TenantRepository tenants;

    public RoomController(RoomService service, TenantRepository tenants) {
        this.service = service;
        this.tenants = tenants;
    }

    @GetMapping
    public List<Room> getRooms(@RequestParam(required = false) String city,
                               @RequestParam(required = false) Double minPrice,
                               @RequestParam(required = false) Double maxPrice,
                               @RequestParam(required = false) String district,
                               @RequestParam(required = false) String roomType) {
        validatePriceRange(minPrice, maxPrice);
        String type = normalizeRoomType(roomType);
        return filter(service.searchRooms(city, minPrice == null ? 0 : minPrice,
                maxPrice == null ? Double.MAX_VALUE : maxPrice), district, type);
    }

    @GetMapping("/search")
    public List<Room> searchRooms(@RequestParam(required = false) String city,
                                  @RequestParam(required = false) Double minPrice,
                                  @RequestParam(required = false) Double maxPrice,
                                  @RequestParam(required = false) String district,
                                  @RequestParam(required = false) String roomType) {
        return getRooms(city, minPrice, maxPrice, district, roomType);
    }

    @GetMapping("/page")
    public Page<Room> getRoomsPage(@RequestParam(required = false) String city,
                                   @RequestParam(required = false) String district,
                                   @RequestParam(required = false) Double minPrice,
                                   @RequestParam(required = false) Double maxPrice,
                                   @RequestParam(required = false) Boolean available,
                                   @RequestParam(required = false) String roomType,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "10") int size) {
        validatePriceRange(minPrice, maxPrice);
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "page phải từ 0 trở lên và size phải từ 1 đến " + MAX_PAGE_SIZE + ".");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return service.searchPage(city, district, minPrice, maxPrice, available,
                normalizeRoomType(roomType), pageable);
    }

    @GetMapping("/owner/{ownerId}")
    public List<Room> getRoomsByOwner(@PathVariable int ownerId,
                                      @AuthenticationPrincipal UserDetails principal) {
        Tenant account = currentAccount(principal);
        if (!isAdmin(account) && account.getId() != ownerId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem tin của tài khoản khác.");
        }
        return service.getRoomsByOwner(ownerId);
    }

    @GetMapping("/{id}")
    public Room getRoomById(@PathVariable int id) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        Room room = service.getRoomById(id);
        if (room == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        return room;
    }

    @PostMapping
    public ResponseEntity<Room> addRoom(@RequestBody Room room,
                                        @AuthenticationPrincipal UserDetails principal) {
        Tenant account = currentAccount(principal);
        validateRoom(room);
        if (!isAdmin(account)) {
            room.setOwnerId(account.getId());
        } else if (room.getOwnerId() < 1) {
            room.setOwnerId(account.getId());
        } else if (!tenants.existsById(room.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chủ phòng không tồn tại.");
        }
        Room created = service.addRoom(room);
        return ResponseEntity.created(URI.create("/api/rooms/" + created.getId())).body(created);
    }

    @PutMapping("/{id}")
    public Room updateRoom(@PathVariable int id, @RequestBody Room room,
                           @AuthenticationPrincipal UserDetails principal) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        Tenant account = currentAccount(principal);
        Room existing = service.getRoomById(id);
        if (existing == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        if (!isAdmin(account) && existing.getOwnerId() != account.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa tin này.");
        }
        validateRoom(room);
        room.setId(id);
        if (!isAdmin(account)) {
            room.setOwnerId(existing.getOwnerId());
        } else if (room.getOwnerId() < 1) {
            room.setOwnerId(existing.getOwnerId());
        } else if (!tenants.existsById(room.getOwnerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chủ phòng không tồn tại.");
        }
        if (!service.updateRoom(id, room)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        return service.getRoomById(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoom(@PathVariable int id,
                                           @AuthenticationPrincipal UserDetails principal) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        Tenant account = currentAccount(principal);
        Room existing = service.getRoomById(id);
        if (existing == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        if (!isAdmin(account) && existing.getOwnerId() != account.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa tin này.");
        }
        if (!service.deleteRoom(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng.");
        return ResponseEntity.noContent().build();
    }

    private Tenant currentAccount(UserDetails principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập.");
        return tenants.findByEmailIgnoreCase(principal.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không còn tồn tại."));
    }

    private boolean isAdmin(Tenant account) {
        return "ADMIN".equalsIgnoreCase(account.getRole());
    }

    private void validateRoom(Room room) {
        if (room == null || blank(room.getTitle()) || room.getTitle().length() > 255
                || blank(room.getAddress()) || room.getAddress().length() > 255
                || blank(room.getCity()) || room.getCity().length() > 120
                || room.getDistrict() != null && room.getDistrict().length() > 120
                || !Double.isFinite(room.getPrice()) || room.getPrice() <= 0 || room.getPrice() > 1_000_000_000
                || !Double.isFinite(room.getArea()) || room.getArea() <= 0 || room.getArea() > 100_000
                || room.getDescription() != null && room.getDescription().length() > 5000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin phòng chưa hợp lệ.");
        }
        List<String> images = room.getImageUrls().stream().filter(url -> url != null && !url.isBlank())
                .map(String::trim).distinct().toList();
        if (images.size() > MAX_IMAGES || images.stream().anyMatch(url -> !isSafeImageUrl(url))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tối đa 8 ảnh; URL ảnh phải là HTTP(S) hoặc đường dẫn /uploads/rooms/.");
        }
        room.setImageUrls(images);
        if (!images.isEmpty()) room.setImageUrl(images.get(0));
    }

    private boolean isSafeImageUrl(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return lower.startsWith("https://") || lower.startsWith("http://")
                || lower.startsWith("/uploads/rooms/");
    }

    private void validatePriceRange(Double minPrice, Double maxPrice) {
        if (minPrice != null && (!Double.isFinite(minPrice) || minPrice < 0)
                || maxPrice != null && (!Double.isFinite(maxPrice) || maxPrice < 0)
                || minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Khoảng giá không hợp lệ; minPrice phải không lớn hơn maxPrice.");
        }
    }

    private String normalizeRoomType(String roomType) {
        if (roomType == null || roomType.isBlank()) return null;
        String normalized = roomType.trim().toUpperCase(Locale.ROOT);
        if (!ROOM_TYPES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại phòng không hợp lệ.");
        }
        return normalized;
    }

    private List<Room> filter(List<Room> rooms, String district, String roomType) {
        return rooms.stream()
                .filter(room -> district == null || district.isBlank() || room.getDistrict() != null
                        && room.getDistrict().toLowerCase(Locale.ROOT).contains(district.trim().toLowerCase(Locale.ROOT)))
                .filter(room -> roomType == null || matchesRoomType(room, roomType))
                .sorted((left, right) -> Integer.compare(right.getId(), left.getId()))
                .toList();
    }

    private boolean matchesRoomType(Room room, String type) {
        String text = ((room.getTitle() == null ? "" : room.getTitle()) + " "
                + (room.getDescription() == null ? "" : room.getDescription())).toLowerCase(Locale.ROOT);
        return switch (type) {
            case "STUDIO" -> text.contains("studio");
            case "DUPLEX" -> text.contains("duplex");
            case "ONE_BEDROOM" -> text.contains("1 phòng ngủ") || text.contains("1pn") || text.contains("một phòng ngủ");
            case "TWO_BEDROOM" -> text.contains("2 phòng ngủ") || text.contains("2pn") || text.contains("hai phòng ngủ");
            default -> true;
        };
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
